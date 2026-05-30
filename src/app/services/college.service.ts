import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { College } from '../models/college.model';

@Injectable({ providedIn: 'root' })
export class CollegeService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  async getMyCollege(): Promise<College | null> {
    const uid = this.auth.currentUid;
    if (!uid) return null;
    const snap = await getDoc(doc(this.firestore, 'colleges', uid));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return {
      id: snap.id,
      name: d['name'],
      code: d['code'],
      createdAt: d['createdAt']?.toDate() ?? new Date()
    };
  }
}
