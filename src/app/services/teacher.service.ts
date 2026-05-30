import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Teacher } from '../models/teacher.model';
import { Observable, from, map } from 'rxjs';

export interface InvigilatorAllotment {
  allotment: Record<string, string[]>; // roomId -> teacherIds
  assignedCount: number;
  shortBy: number;                      // teachers still needed (0 = fully staffed)
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private teachersCol() {
    return collection(this.firestore, `colleges/${this.auth.currentUid!}/teachers`);
  }

  getTeachers(): Observable<Teacher[]> {
    return from(getDocs(this.teachersCol())).pipe(
      map(snap => snap.docs
        .map(d => this.mapTeacher(d.id, d.data() as any))
        .sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  private mapTeacher(id: string, d: any): Teacher {
    return {
      id,
      name: d['name'] ?? '',
      department: d['department'] ?? '',
      email: d['email'] ?? '',
      phone: d['phone'] ?? '',
      isActive: d['isActive'] ?? true
    };
  }

  async addTeacher(t: Omit<Teacher, 'id'>): Promise<void> {
    await addDoc(this.teachersCol(), {
      name: t.name, department: t.department ?? '', email: t.email ?? '',
      phone: t.phone ?? '', isActive: t.isActive ?? true, createdAt: serverTimestamp()
    });
  }

  async updateTeacher(id: string, t: Partial<Teacher>): Promise<void> {
    const uid = this.auth.currentUid!;
    await updateDoc(doc(this.firestore, `colleges/${uid}/teachers`, id), { ...t } as any);
  }

  async deleteTeacher(id: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await deleteDoc(doc(this.firestore, `colleges/${uid}/teachers`, id));
  }

  /**
   * Distributes invigilators across the exam's rooms with three goals:
   *  1. No double-booking — teachers busy at an overlapping exam are excluded.
   *  2. Equal load — teachers with the fewest total duties are picked first.
   *  3. Department-aware — teachers of the exam's own department are used last,
   *     and a room with multiple invigilators gets distinct departments where
   *     possible.
   * Returns the per-room map plus how many more teachers are needed (shortBy).
   */
  allot(opts: {
    roomIds: string[];
    teachersPerRoom: number;
    teachers: Teacher[];                 // candidate pool (active)
    busyTeacherIds: Set<string>;
    examDepartment?: string;             // avoid invigilators of this dept
    dutyCounts?: Map<string, number>;    // existing duty load per teacher
  }): InvigilatorAllotment {
    const perRoom = Math.max(1, opts.teachersPerRoom || 1);
    const ownDept = (opts.examDepartment ?? '').trim().toUpperCase();
    const load = opts.dutyCounts ?? new Map<string, number>();
    const deptOf = (t: Teacher) => (t.department ?? '').trim().toUpperCase();

    const available = opts.teachers.filter(t => t.isActive && !opts.busyTeacherIds.has(t.id));

    // Preferred = not the exam's own department; own-dept teachers are a fallback.
    const rank = (a: Teacher, b: Teacher) =>
      (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || Math.random() - 0.5;
    const preferred = available.filter(t => !ownDept || deptOf(t) !== ownDept).sort(rank);
    const fallback = available.filter(t => ownDept && deptOf(t) === ownDept).sort(rank);
    const candidates = [...preferred, ...fallback];

    const allotment: Record<string, string[]> = {};
    for (const rid of opts.roomIds) allotment[rid] = [];

    const used = new Set<string>();      // teachers already placed
    let assigned = 0;

    for (const rid of opts.roomIds) {
      const roomDepts = new Set<string>();
      for (let slot = 0; slot < perRoom; slot++) {
        // Prefer a candidate whose department isn't already in this room.
        let pick = candidates.find(t => !used.has(t.id) && !roomDepts.has(deptOf(t)));
        if (!pick) pick = candidates.find(t => !used.has(t.id)); // relax diversity
        if (!pick) break;                // pool exhausted
        used.add(pick.id);
        roomDepts.add(deptOf(pick));
        allotment[rid].push(pick.id);
        load.set(pick.id, (load.get(pick.id) ?? 0) + 1); // keep load fair across rooms
        assigned++;
      }
    }

    const need = opts.roomIds.length * perRoom;
    return { allotment, assignedCount: assigned, shortBy: Math.max(0, need - available.length) };
  }
}
