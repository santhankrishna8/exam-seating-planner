import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, serverTimestamp, writeBatch, Timestamp, WriteBatch
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Exam, ExamStatus } from '../models/exam.model';
import { Student, PublicSeat } from '../models/student.model';
import { Observable, from, map, firstValueFrom } from 'rxjs';
import { CollegeService } from './college.service';
import { RoomService } from './room.service';
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
      status: d['status'] ?? 'draft',
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
   * Finds rooms that another non-archived exam has already booked at an
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
      if (other.id === examId || other.status === 'archived') continue;
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
      if (other.id === examId || other.status === 'archived') continue;
      if (!sameDay(other.date, date)) continue;
      if (!timesOverlap(startTime, endTime, other.startTime, other.endTime)) continue;
      for (const ids of Object.values(other.invigilators ?? {})) {
        for (const id of ids) busy.add(id);
      }
    }
    return busy;
  }

  /** Total invigilation duties already assigned per teacher across non-archived exams. */
  async getDutyCounts(excludeExamId?: string): Promise<Map<string, number>> {
    const allExams = await firstValueFrom(this.getExams());
    const counts = new Map<string, number>();
    for (const e of allExams) {
      if (e.id === excludeExamId || e.status === 'archived') continue;
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
        isSeated: false,
        absent: false
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
        isSeated: !!s.isSeated,
        absent: s.absent ?? false
      });
    });
  }

  /** Persist present/absent flags for seated students (chunked batches). */
  async saveAttendance(examId: string, updates: { hallTicketNo: string; absent: boolean }[]): Promise<void> {
    const uid = this.auth.currentUid!;
    const CHUNK = 490;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const batch = writeBatch(this.firestore);
      for (const u of updates.slice(i, i + CHUNK)) {
        batch.update(doc(this.firestore, `colleges/${uid}/exams/${examId}/students`, u.hallTicketNo), { absent: u.absent });
      }
      await batch.commit();
    }
  }

  async publishExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated. Please log in again.');

    const exam = await this.getExam(examId);
    if (!exam) throw new Error('Exam not found.');

    const allStudents = await this.getStudents(examId);
    const students = allStudents.filter(s => s.isSeated && s.assignedRoom);
    if (students.length === 0) {
      throw new Error('Nothing to publish — allot seating for this exam first.');
    }

    // Re-check against already-published exams so two live exams never share a
    // hall at an overlapping time, even if drafts were generated independently.
    const usedRooms = [...new Set(students.map(s => s.assignedRoom!))];
    const conflicts = await this.getRoomConflicts(
      examId, usedRooms.length ? usedRooms : exam.selectedRooms,
      exam.date, exam.startTime, exam.endTime, true
    );
    if (conflicts.length) {
      const names = [...new Set(conflicts.map(c => c.roomName))].join(', ');
      throw new Error(`Can't publish — ${names} already booked by "${conflicts[0].examName}" at ${conflicts[0].time}.`);
    }

    // College info is optional metadata — fetch it but don't fail if missing
    const college = await this.collegeService.getMyCollege().catch(() => null);

    // Build room name lookup
    const roomNames: Record<string, { name: string; floor: string; seatsPerBench: number }> = {};
    const roomsSnap = await getDocs(collection(this.firestore, `colleges/${uid}/rooms`));
    roomsSnap.docs.forEach(d => {
      roomNames[d.id] = {
        name: d.data()['name'] ?? '',
        floor: d.data()['floor'] ?? '',
        seatsPerBench: d.data()['seatsPerBench'] ?? 2
      };
    });

    // Write public exam metadata
    const metaBatch = writeBatch(this.firestore);
    metaBatch.set(doc(this.firestore, 'publicExams', examId), {
      ownerUid: uid,
      collegeName: college?.name ?? '',
      collegeCode: college?.code ?? '',
      examName: exam.name,
      subjectCode: exam.subjectCode ?? '',
      date: exam.date,
      startTime: exam.startTime ?? '',
      endTime: exam.endTime ?? '',
      status: 'published'
    });
    await metaBatch.commit();

    // Re-publishing must not leave seats from an earlier allotment behind.
    const previous = await getDocs(collection(this.firestore, `publicExams/${examId}/seats`));
    const keep = new Set(students.map(s => s.hallTicketNo));
    await this.inBatches(previous.docs.filter(d => !keep.has(d.id)), (batch, d) => batch.delete(d.ref));

    await this.inBatches(students, (batch, s) => {
      const room = roomNames[s.assignedRoom!];
      batch.set(doc(this.firestore, `publicExams/${examId}/seats`, s.hallTicketNo), {
        name: s.name,
        roomId: s.assignedRoom ?? '',
        roomName: room?.name ?? '',
        benchNumber: s.assignedBench ?? 0,
        seatNumber: s.assignedSeat ?? 0,
        seatsPerBench: room?.seatsPerBench ?? 2,
        floor: room?.floor ?? ''
      });
    });

    // Mark exam as published in the college's own collection
    await updateDoc(doc(this.firestore, `colleges/${uid}/exams`, examId), { status: 'published' as ExamStatus });
  }

  /** Permanently removes an exam and everything published for it. */
  async deleteExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated. Please log in again.');

    const deleteCollectionDocs = async (path: string) => {
      const snap = await getDocs(collection(this.firestore, path));
      for (let i = 0; i < snap.docs.length; i += 490) {
        const batch = writeBatch(this.firestore);
        for (const d of snap.docs.slice(i, i + 490)) batch.delete(d.ref);
        await batch.commit();
      }
    };

    // Public copy first (students may have it bookmarked), then private data.
    await deleteCollectionDocs(`publicExams/${examId}/seats`);
    await deleteDoc(doc(this.firestore, 'publicExams', examId)).catch(() => {});
    await deleteCollectionDocs(`colleges/${uid}/exams/${examId}/students`);
    await deleteDoc(doc(this.firestore, `colleges/${uid}/exams`, examId));
  }

  async archiveExam(examId: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await updateDoc(doc(this.firestore, `colleges/${uid}/exams`, examId), { status: 'archived' as ExamStatus });
    // Hide from the public lookup too. The meta doc exists because archive is
    // only offered for published exams; ignore if it was never published.
    await updateDoc(doc(this.firestore, 'publicExams', examId), { status: 'archived' }).catch(() => {});
  }

  /** Published seat documents are read in three places — map them in one. */
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

  async getPublicSeat(examId: string, hallTicketNo: string): Promise<PublicSeat | null> {
    const key = normalizeHallTicket(hallTicketNo);
    const snap = await getDoc(doc(this.firestore, `publicExams/${examId}/seats`, key));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return this.mapSeat(snap.id, d);
  }

  async searchByHallTicket(hallTicketNo: string): Promise<SearchHit[]> {
    const results: SearchHit[] = [];
    const key = normalizeHallTicket(hallTicketNo);
    if (!key) return results;
    const examsSnap = await getDocs(collection(this.firestore, 'publicExams'));
    for (const examDoc of examsSnap.docs) {
      const ed = examDoc.data() as any;
      if (ed['status'] && ed['status'] !== 'published') continue; // skip archived
      const seatSnap = await getDoc(doc(this.firestore, `publicExams/${examDoc.id}/seats`, key));
      if (seatSnap.exists()) {
        const d = seatSnap.data() as any;
        results.push({
          examId: examDoc.id,
          examName: ed['examName'] ?? 'Exam',
          collegeName: ed['collegeName'] ?? '',
          subjectCode: ed['subjectCode'] ?? '',
          date: ed['date'] instanceof Timestamp ? ed['date'].toDate() : (ed['date'] ? new Date(ed['date']) : null),
          startTime: ed['startTime'] ?? '',
          endTime: ed['endTime'] ?? '',
          seat: this.mapSeat(seatSnap.id, d)
        });
      }
    }
    return results;
  }

  async getPublicExamMeta(examId: string): Promise<PublicExamMeta | null> {
    const snap = await getDoc(doc(this.firestore, 'publicExams', examId));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    if (d['status'] && d['status'] !== 'published') return null;
    return {
      examName: d['examName'] ?? 'Exam',
      collegeName: d['collegeName'] ?? '',
      subjectCode: d['subjectCode'] ?? '',
      date: d['date'] instanceof Timestamp ? d['date'].toDate() : (d['date'] ? new Date(d['date']) : null),
      startTime: d['startTime'] ?? '',
      endTime: d['endTime'] ?? ''
    };
  }

  async getPublicExamSeats(examId: string): Promise<PublicSeat[]> {
    const meta = await getDoc(doc(this.firestore, 'publicExams', examId));
    if (!meta.exists() || (meta.data()['status'] && meta.data()['status'] !== 'published')) return [];
    const snap = await getDocs(collection(this.firestore, `publicExams/${examId}/seats`));
    return snap.docs.map(d => {
      const data = d.data() as any;
      return this.mapSeat(d.id, data);
    });
  }
}
