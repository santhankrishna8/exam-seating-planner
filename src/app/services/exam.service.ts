import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionGroup, query, where, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, serverTimestamp, writeBatch, Timestamp, WriteBatch
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Exam, ExamStatus } from '../models/exam.model';
import { Student, PublicSeat } from '../models/student.model';
import { Observable, from, map, firstValueFrom } from 'rxjs';
import { CollegeService } from './college.service';
import { RoomService } from './room.service';
import { AttendanceService } from './attendance.service';
import { normalizeHallTicket } from '../utils/hall-ticket';

export interface PublicExamMeta {
  examName: string;
  collegeName: string;
  subjectCode: string;
  date: Date | null;
  startTime: string;
  endTime: string;
}

export interface SearchHit extends PublicExamMeta {
  examId: string;
  seat: PublicSeat;
}

export interface RoomConflict {
  roomId: string;
  roomName: string;
  examName: string;
  date: Date;
  time: string;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// Times are zero-padded "HH:MM" 24h strings, so lexical compare == chronological.
// Missing times fall back to a full-day window so they conservatively conflict.
function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const a1 = s1 || '00:00', b1 = e1 || '23:59';
  const a2 = s2 || '00:00', b2 = e2 || '23:59';
  return a1 < b2 && a2 < b1;
}

@Injectable({ providedIn: 'root' })
export class ExamService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private collegeService = inject(CollegeService);
  private roomService = inject(RoomService);
  private attendance = inject(AttendanceService);

  private examsCol() {
    return collection(this.firestore, `colleges/${this.auth.currentUid!}/exams`);
  }

  getExams(): Observable<Exam[]> {
    return from(getDocs(this.examsCol())).pipe(
      map(snap => snap.docs.map(d => this.mapExam({ id: d.id, ...d.data() })))
    );
  }

  async getExam(id: string): Promise<Exam | null> {
    const snap = await getDoc(doc(this.firestore, `colleges/${this.auth.currentUid!}/exams`, id));
    if (!snap.exists()) return null;
    return this.mapExam({ id: snap.id, ...snap.data() });
  }

  private mapExam(d: any): Exam {
    return {
      id: d['id'],
      name: d['name'],
      subjectCode: d['subjectCode'],
      department: d['department'] ?? '',
      date: d['date'] instanceof Timestamp ? d['date'].toDate() : new Date(d['date']),
      startTime: d['startTime'],
      endTime: d['endTime'],
      status: d['status'] === 'published' ? 'published' : 'draft',
      shuffleMode: d['shuffleMode'] ?? 'sequential',
      spacing: d['spacing'] ?? false,
      selectedRooms: d['selectedRooms'] ?? [],
      teachersPerRoom: d['teachersPerRoom'] ?? 1,
      invigilators: d['invigilators'] ?? {},
      createdAt: d['createdAt'] instanceof Timestamp ? d['createdAt'].toDate() : new Date()
    };
  }

  async createExam(exam: Omit<Exam, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(this.examsCol(), { ...exam, createdAt: serverTimestamp(), status: 'draft' });
    return ref.id;
  }

  async updateExam(id: string, data: Partial<Exam>): Promise<void> {
    await updateDoc(doc(this.firestore, `colleges/${this.auth.currentUid!}/exams`, id), data as any);
  }

  /**
   * Finds rooms that another exam has already booked at an
   * overlapping date + time. Used to block double-allotment of a hall.
   * `roomIds` is the resolved set this exam intends to use.
   */
  async getRoomConflicts(
    examId: string,
    roomIds: string[],
    date: Date,
    startTime: string,
    endTime: string,
    onlyPublished = false
  ): Promise<RoomConflict[]> {
    const allExams = await firstValueFrom(this.getExams());
    const allRooms = await firstValueFrom(this.roomService.getRooms());
    const allRoomIds = allRooms.map(r => r.id);
    const nameOf = new Map(allRooms.map(r => [r.id, r.name]));
    const want = new Set(roomIds.length ? roomIds : allRoomIds);

    const conflicts: RoomConflict[] = [];
    const seen = new Set<string>();

    for (const other of allExams) {
      if (other.id === examId) continue;
      if (onlyPublished && other.status !== 'published') continue;
      if (!sameDay(other.date, date)) continue;
      if (!timesOverlap(startTime, endTime, other.startTime, other.endTime)) continue;

      // An exam with no explicit room selection occupies every room.
      const otherRooms = other.selectedRooms.length ? other.selectedRooms : allRoomIds;
      for (const rid of otherRooms) {
        if (want.has(rid) && !seen.has(rid)) {
          seen.add(rid);
          conflicts.push({
            roomId: rid,
            roomName: nameOf.get(rid) ?? rid,
            examName: other.name,
            date: other.date,
            time: `${other.startTime || '—'}–${other.endTime || '—'}`
          });
        }
      }
    }
    return conflicts;
  }

  /** Teacher ids already on invigilation duty at an overlapping exam time. */
  async getBusyTeachers(examId: string, date: Date, startTime: string, endTime: string): Promise<Set<string>> {
    const allExams = await firstValueFrom(this.getExams());
    const busy = new Set<string>();
    for (const other of allExams) {
      if (other.id === examId) continue;
      if (!sameDay(other.date, date)) continue;
      if (!timesOverlap(startTime, endTime, other.startTime, other.endTime)) continue;
      for (const ids of Object.values(other.invigilators ?? {})) {
        for (const id of ids) busy.add(id);
      }
    }
    return busy;
  }

  /** Total invigilation duties already assigned per teacher across exams. */
  async getDutyCounts(excludeExamId?: string): Promise<Map<string, number>> {
    const allExams = await firstValueFrom(this.getExams());
    const counts = new Map<string, number>();
    for (const e of allExams) {
      if (e.id === excludeExamId) continue;
      for (const ids of Object.values(e.invigilators ?? {})) {
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }

  async saveInvigilators(examId: string, invigilators: Record<string, string[]>, teachersPerRoom: number): Promise<void> {
    const uid = this.auth.currentUid!;
    await updateDoc(doc(this.firestore, `colleges/${uid}/exams`, examId), { invigilators, teachersPerRoom });
  }

  async getStudents(examId: string): Promise<Student[]> {
    const uid = this.auth.currentUid!;
    const snap = await getDocs(collection(this.firestore, `colleges/${uid}/exams/${examId}/students`));
    return snap.docs.map(d => ({ hallTicketNo: d.id, ...d.data() } as Student));
  }

  /** Commit `writes` in Firestore-batch-sized chunks (limit is 500 per batch). */
  private async inBatches<T>(items: T[], write: (batch: WriteBatch, item: T) => void): Promise<void> {
    const CHUNK = 450;
    for (let i = 0; i < items.length; i += CHUNK) {
      const batch = writeBatch(this.firestore);
      for (const item of items.slice(i, i + CHUNK)) write(batch, item);
      await batch.commit();
    }
  }

  private studentsCol(examId: string) {
    return collection(this.firestore, `colleges/${this.auth.currentUid!}/exams/${examId}/students`);
  }

  /**
   * Replaces the roster. Uploading a second file must not leave students from
   * the first one behind — those orphans would still count as seated and would
   * be published with a stale seat.
   */
  async saveStudents(examId: string, students: Student[]): Promise<void> {
    const uid = this.auth.currentUid!;
    const existing = await getDocs(this.studentsCol(examId));
    const incoming = new Set(students.map(s => s.hallTicketNo));
    const stale = existing.docs.filter(d => !incoming.has(d.id));

    await this.inBatches(stale, (batch, d) => batch.delete(d.ref));
    await this.inBatches(students, (batch, s) => {
      const ref = doc(this.firestore, `colleges/${uid}/exams/${examId}/students`, s.hallTicketNo);
      batch.set(ref, {
        name: s.name,
        department: s.department ?? '',
        section: s.section ?? '',
        isSeated: false
      });
    });
  }

  /**
   * Persists an allotment. Students the halls could not seat are written back
   * as unseated with no room, so a short-capacity run is visible rather than
   * silently marking everyone seated.
   */
  async saveAssignedStudents(examId: string, students: Student[]): Promise<void> {
    const uid = this.auth.currentUid!;
    await this.inBatches(students, (batch, s) => {
      const ref = doc(this.firestore, `colleges/${uid}/exams/${examId}/students`, s.hallTicketNo);
      batch.set(ref, {
        name: s.name,
        department: s.department ?? '',
        section: s.section ?? '',
        assignedRoom: s.isSeated ? (s.assignedRoom ?? '') : '',
        assignedBench: s.isSeated ? (s.assignedBench ?? 0) : 0,
        assignedSeat: s.isSeated ? (s.assignedSeat ?? 0) : 0,
        isSeated: !!s.isSeated
      });
    });
  }

  /**
   * Publishes (or re-publishes) the seating. Order matters: the public record
   * goes up as "pending" first (the seat rules need its owner), seats follow,
   * and only then does it flip to "published" — so students never see a
   * half-written exam.
   */
  async publishExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated. Please log in again.');

    const exam = await this.getExam(examId);
    if (!exam) throw new Error('Exam not found.');

    const students = (await this.getStudents(examId)).filter(s => s.isSeated && s.assignedRoom);
    if (students.length === 0) {
      throw new Error('Nothing to publish — run the seating first.');
    }

    const usedRooms = [...new Set(students.map(s => s.assignedRoom!))];
    const conflicts = await this.getRoomConflicts(examId, usedRooms, exam.date, exam.startTime, exam.endTime, true);
    if (conflicts.length) {
      const names = [...new Set(conflicts.map(c => c.roomName))].join(', ');
      throw new Error(`Can't publish — ${names} already booked by "${conflicts[0].examName}" at ${conflicts[0].time}.`);
    }

    const college = await this.collegeService.getMyCollege().catch(() => null);
    const rooms = await firstValueFrom(this.roomService.getRooms());
    const roomInfo = new Map(rooms.map(r => [r.id, r]));

    const metaRef = doc(this.firestore, 'publicExams', examId);
    const wasPublished = exam.status === 'published';
    try {
      const meta = {
        ownerUid: uid,
        collegeName: college?.name ?? '',
        collegeCode: college?.code ?? '',
        examName: exam.name,
        subjectCode: exam.subjectCode ?? '',
        date: exam.date,
        startTime: exam.startTime ?? '',
        endTime: exam.endTime ?? ''
      };
      await writeBatch(this.firestore).set(metaRef, { ...meta, status: exam.status === 'published' ? 'published' : 'pending' }).commit();

      const previous = await getDocs(collection(this.firestore, `publicExams/${examId}/seats`));
      const keep = new Set(students.map(s => s.hallTicketNo));
      await this.inBatches(previous.docs.filter(d => !keep.has(d.id)), (batch, d) => batch.delete(d.ref));
      await this.inBatches(students, (batch, s) => {
        const room = roomInfo.get(s.assignedRoom!);
        batch.set(doc(this.firestore, `publicExams/${examId}/seats`, s.hallTicketNo), {
          hallTicketNo: s.hallTicketNo,
          name: s.name,
          roomId: s.assignedRoom ?? '',
          roomName: room?.name ?? '',
          benchNumber: s.assignedBench ?? 0,
          seatNumber: s.assignedSeat ?? 0,
          seatsPerBench: room?.seatsPerBench ?? 2,
          floor: room?.floor ?? ''
        });
      });

      await updateDoc(metaRef, { status: 'published' });
      await updateDoc(doc(this.firestore, `colleges/${uid}/exams`, examId), { status: 'published' as ExamStatus });
      await this.syncAttendance({ ...exam, status: 'published' }, usedRooms);
    } catch (e) {
      // Never leave a half-published exam: withdraw a first publish, or put an
      // existing one back to live so students keep their seats.
      if (wasPublished) await updateDoc(metaRef, { status: 'published' }).catch(() => {});
      else await this.unpublishExam(examId).catch(() => {});
      throw e;
    }
  }

  /** Keeps the invigilators' attendance links in step with the exam. */
  async syncAttendance(exam: Exam, roomIds?: string[]): Promise<void> {
    const uid = this.auth.currentUid!;
    let ids = roomIds;
    if (!ids) {
      const seated = (await this.getStudents(exam.id)).filter(s => s.isSeated && s.assignedRoom);
      ids = [...new Set(seated.map(s => s.assignedRoom!))];
    }
    const [rooms, teachersSnap, college] = await Promise.all([
      firstValueFrom(this.roomService.getRooms()),
      getDocs(collection(this.firestore, `colleges/${uid}/teachers`)),
      this.collegeService.getMyCollege().catch(() => null)
    ]);
    await this.attendance.sync(
      exam, ids,
      new Map(rooms.map(r => [r.id, r.name])),
      new Map(teachersSnap.docs.map(d => [d.id, (d.data()['name'] as string) ?? ''])),
      college?.name ?? ''
    );
  }

  private async deleteCollectionDocs(path: string) {
    const snap = await getDocs(collection(this.firestore, path));
    await this.inBatches(snap.docs, (batch, d) => batch.delete(d.ref));
  }

  /** Withdraws the exam from students and invigilators; the draft is kept. */
  async unpublishExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await this.deleteCollectionDocs(`publicExams/${examId}/seats`);
    await deleteDoc(doc(this.firestore, 'publicExams', examId)).catch(() => {});
    await this.attendance.clear(examId).catch(() => {});
    await updateDoc(doc(this.firestore, `colleges/${uid}/exams`, examId), { status: 'draft' as ExamStatus });
  }

  /** Permanently removes an exam and everything published for it. */
  async deleteExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated. Please log in again.');
    await this.deleteCollectionDocs(`publicExams/${examId}/seats`);
    await deleteDoc(doc(this.firestore, 'publicExams', examId)).catch(() => {});
    await this.attendance.clear(examId).catch(() => {});
    await this.deleteCollectionDocs(`colleges/${uid}/exams/${examId}/students`);
    await deleteDoc(doc(this.firestore, `colleges/${uid}/exams`, examId));
  }

  /** Drops a removed teacher from every exam roster so no duty points at nobody. */
  async removeTeacherFromExams(teacherId: string): Promise<void> {
    const exams = await firstValueFrom(this.getExams());
    for (const e of exams) {
      const inv = e.invigilators ?? {};
      if (!Object.values(inv).some(ids => ids.includes(teacherId))) continue;
      const next: Record<string, string[]> = {};
      for (const [rid, ids] of Object.entries(inv)) next[rid] = ids.filter(i => i !== teacherId);
      await this.saveInvigilators(e.id, next, e.teachersPerRoom);
      if (e.status === 'published') await this.syncAttendance({ ...e, invigilators: next }).catch(() => {});
    }
  }

  /** Exams (draft or published) that use a hall. */
  async examsUsingRoom(roomId: string): Promise<Exam[]> {
    const exams = await firstValueFrom(this.getExams());
    return exams.filter(e => e.selectedRooms.includes(roomId));
  }

  private mapSeat(hallTicketNo: string, d: any): PublicSeat {
    return {
      hallTicketNo,
      name: d['name'] ?? '',
      roomId: d['roomId'] ?? '',
      roomName: d['roomName'] ?? '',
      benchNumber: d['benchNumber'] ?? 0,
      seatNumber: d['seatNumber'] ?? 0,
      seatsPerBench: d['seatsPerBench'] ?? 2,
      floor: d['floor'] ?? ''
    };
  }

  private toDate(v: any): Date | null {
    return v instanceof Timestamp ? v.toDate() : (v ? new Date(v) : null);
  }

  async getPublicSeat(examId: string, hallTicketNo: string): Promise<PublicSeat | null> {
    const key = normalizeHallTicket(hallTicketNo);
    const snap = await getDoc(doc(this.firestore, `publicExams/${examId}/seats`, key));
    return snap.exists() ? this.mapSeat(snap.id, snap.data()) : null;
  }

  /**
   * One indexed query across every published exam, then one read per hit for
   * the exam details. Exams that finished before yesterday are left out.
   */
  async searchByHallTicket(hallTicketNo: string): Promise<SearchHit[]> {
    const key = normalizeHallTicket(hallTicketNo);
    if (!key) return [];
    const seats = await getDocs(query(collectionGroup(this.firestore, 'seats'), where('hallTicketNo', '==', key)));
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 1);

    const hits = await Promise.all(seats.docs.map(async seatDoc => {
      const examRef = seatDoc.ref.parent.parent;
      if (!examRef) return null;
      const ed = (await getDoc(examRef)).data() as any;
      if (!ed || ed['status'] !== 'published') return null;
      const date = this.toDate(ed['date']);
      if (date && date < cutoff) return null;
      return {
        examId: examRef.id,
        examName: ed['examName'] ?? 'Exam',
        collegeName: ed['collegeName'] ?? '',
        subjectCode: ed['subjectCode'] ?? '',
        date,
        startTime: ed['startTime'] ?? '',
        endTime: ed['endTime'] ?? '',
        seat: this.mapSeat(key, seatDoc.data())
      } as SearchHit;
    }));
    return hits.filter((h): h is SearchHit => h !== null).sort((a, b) => +(a.date ?? 0) - +(b.date ?? 0));
  }

  async getPublicExamMeta(examId: string): Promise<PublicExamMeta | null> {
    const snap = await getDoc(doc(this.firestore, 'publicExams', examId));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    if (d['status'] !== 'published') return null;
    return {
      examName: d['examName'] ?? 'Exam',
      collegeName: d['collegeName'] ?? '',
      subjectCode: d['subjectCode'] ?? '',
      date: this.toDate(d['date']),
      startTime: d['startTime'] ?? '',
      endTime: d['endTime'] ?? ''
    };
  }

  async getPublicExamSeats(examId: string): Promise<PublicSeat[]> {
    const meta = await getDoc(doc(this.firestore, 'publicExams', examId));
    if (!meta.exists() || meta.data()['status'] !== 'published') return [];
    const snap = await getDocs(collection(this.firestore, `publicExams/${examId}/seats`));
    return snap.docs.map(d => this.mapSeat(d.id, d.data()));
  }
}
