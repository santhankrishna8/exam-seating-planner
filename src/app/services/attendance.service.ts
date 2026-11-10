import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, getDoc, getDocs, updateDoc, writeBatch,
  query, where, Timestamp, serverTimestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Attendance } from '../models/attendance.model';
import { Exam } from '../models/exam.model';

/** 20 random bytes as hex — unguessable, so the id itself is the access key. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private map(id: string, d: any): Attendance {
    return {
      id,
      ownerUid: d['ownerUid'] ?? '',
      examId: d['examId'] ?? '',
      examName: d['examName'] ?? 'Exam',
      roomId: d['roomId'] ?? '',
      roomName: d['roomName'] ?? '',
      collegeName: d['collegeName'] ?? '',
      date: d['date'] instanceof Timestamp ? d['date'].toDate() : (d['date'] ? new Date(d['date']) : null),
      startTime: d['startTime'] ?? '',
      endTime: d['endTime'] ?? '',
      invigilators: d['invigilators'] ?? [],
      absentHallTickets: d['absentHallTickets'] ?? [],
      submitted: d['submitted'] ?? false
    };
  }

  /** Admin: every sheet of one exam. */
  async forExam(examId: string): Promise<Attendance[]> {
    const uid = this.auth.currentUid;
    if (!uid) return [];
    const snap = await getDocs(query(
      collection(this.firestore, 'attendance'),
      where('ownerUid', '==', uid), where('examId', '==', examId)
    ));
    return snap.docs.map(d => this.map(d.id, d.data()));
  }

  /** Anyone holding the link. */
  async get(token: string): Promise<Attendance | null> {
    const snap = await getDoc(doc(this.firestore, 'attendance', token));
    return snap.exists() ? this.map(snap.id, snap.data()) : null;
  }

  async submit(token: string, absentHallTickets: string[]): Promise<void> {
    await updateDoc(doc(this.firestore, 'attendance', token), {
      absentHallTickets, submitted: true, submittedAt: serverTimestamp()
    });
  }

  /**
   * Makes the sheets match the exam: one per hall that has students. Existing
   * sheets keep their link and any marks already submitted, so changing an
   * invigilator or the exam time never wipes attendance.
   */
  async sync(
    exam: Exam, roomIds: string[], roomNames: Map<string, string>,
    teacherNames: Map<string, string>, collegeName: string
  ): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated.');
    const existing = await this.forExam(exam.id);
    const byRoom = new Map(existing.map(a => [a.roomId, a]));
    const batch = writeBatch(this.firestore);
    const want = new Set(roomIds);

    for (const a of existing) if (!want.has(a.roomId)) batch.delete(doc(this.firestore, 'attendance', a.id));

    for (const roomId of roomIds) {
      const token = byRoom.get(roomId)?.id ?? newToken();
      const names = (exam.invigilators?.[roomId] ?? []).map(id => teacherNames.get(id)).filter((n): n is string => !!n);
      const fields = {
        ownerUid: uid, examId: exam.id, examName: exam.name,
        roomId, roomName: roomNames.get(roomId) ?? '', collegeName,
        date: exam.date, startTime: exam.startTime ?? '', endTime: exam.endTime ?? '',
        invigilators: names
      };
      const ref = doc(this.firestore, 'attendance', token);
      if (byRoom.has(roomId)) batch.update(ref, fields);
      else batch.set(ref, { ...fields, absentHallTickets: [], submitted: false, createdAt: serverTimestamp() });
    }
    await batch.commit();
  }

  async clear(examId: string): Promise<void> {
    const sheets = await this.forExam(examId);
    if (!sheets.length) return;
    const batch = writeBatch(this.firestore);
    for (const a of sheets) batch.delete(doc(this.firestore, 'attendance', a.id));
    await batch.commit();
  }

  /** Link an invigilator opens on their phone. */
  linkFor(a: Attendance): string {
    return `${location.origin}/duty/${a.id}`;
  }
}
