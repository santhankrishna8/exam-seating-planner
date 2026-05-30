import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, Timestamp, serverTimestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Duty } from '../models/duty.model';
import { Exam } from '../models/exam.model';
import { Teacher } from '../models/teacher.model';

@Injectable({ providedIn: 'root' })
export class DutyService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private map(id: string, d: any): Duty {
    return {
      id,
      ownerUid: d['ownerUid'] ?? '',
      examId: d['examId'] ?? '',
      examName: d['examName'] ?? 'Exam',
      roomId: d['roomId'] ?? '',
      roomName: d['roomName'] ?? '',
      teacherId: d['teacherId'] ?? '',
      teacherEmail: d['teacherEmail'] ?? '',
      teacherName: d['teacherName'] ?? '',
      collegeName: d['collegeName'] ?? '',
      date: d['date'] instanceof Timestamp ? d['date'].toDate() : (d['date'] ? new Date(d['date']) : null),
      startTime: d['startTime'] ?? '',
      endTime: d['endTime'] ?? '',
      absentHallTickets: d['absentHallTickets'] ?? [],
      submitted: d['submitted'] ?? false
    };
  }

  /** Rewrite all duty docs for an exam from its current invigilator allotment. */
  async publishDuties(exam: Exam, teachersById: Map<string, Teacher>, roomNames: Map<string, string>, collegeName: string): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) throw new Error('Not authenticated.');

    await this.clearDuties(exam.id); // remove stale rows first

    const entries = Object.entries(exam.invigilators ?? {});
    for (const [roomId, teacherIds] of entries) {
      for (const tid of teacherIds) {
        const t = teachersById.get(tid);
        const email = (t?.email ?? '').trim().toLowerCase();
        if (!email) continue; // a teacher with no email can't have a portal login
        const id = `${exam.id}__${roomId}__${tid}`;
        await setDoc(doc(this.firestore, 'duties', id), {
          ownerUid: uid,
          examId: exam.id,
          examName: exam.name,
          roomId,
          roomName: roomNames.get(roomId) ?? '',
          teacherId: tid,
          teacherEmail: email,
          teacherName: t?.name ?? '',
          collegeName,
          date: exam.date,
          startTime: exam.startTime ?? '',
          endTime: exam.endTime ?? '',
          absentHallTickets: [],
          submitted: false,
          createdAt: serverTimestamp()
        });
      }
    }
  }

  async clearDuties(examId: string): Promise<void> {
    const snap = await getDocs(query(collection(this.firestore, 'duties'), where('examId', '==', examId)));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }

  /** Admin: read all duties for an exam (to reconcile submitted attendance). */
  async getDutiesForExam(examId: string): Promise<Duty[]> {
    const snap = await getDocs(query(collection(this.firestore, 'duties'), where('examId', '==', examId)));
    return snap.docs.map(d => this.map(d.id, d.data()));
  }

  /** Teacher: my duties (matched by the signed-in email). */
  async getMyDuties(): Promise<Duty[]> {
    const email = (this.auth.currentEmail ?? '').trim().toLowerCase();
    if (!email) return [];
    const snap = await getDocs(query(collection(this.firestore, 'duties'), where('teacherEmail', '==', email)));
    return snap.docs
      .map(d => this.map(d.id, d.data()))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
  }

  /** Teacher: submit absentees for one duty. */
  async submitAttendance(dutyId: string, absentHallTickets: string[]): Promise<void> {
    await updateDoc(doc(this.firestore, 'duties', dutyId), {
      absentHallTickets, submitted: true, submittedAt: serverTimestamp()
    });
  }
}
