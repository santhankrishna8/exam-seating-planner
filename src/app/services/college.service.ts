import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { College } from '../models/college.model';

@Injectable({ providedIn: 'root' })
export class CollegeService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  /**
   * Cached per uid, because the route guards ask on every admin navigation.
   * Keying by uid is the whole invalidation story: a different account is a
   * different key, and a college document is written once at registration.
   */
  private cache = new Map<string, College | null>();

  async getMyCollege(): Promise<College | null> {
    const uid = this.auth.currentUid;
    if (!uid) return null;
    if (this.cache.has(uid)) return this.cache.get(uid)!;

    const snap = await getDoc(doc(this.firestore, 'colleges', uid));
    const d = snap.data() as any;
    const college: College | null = snap.exists()
      ? { id: snap.id, name: d['name'], code: d['code'], createdAt: d['createdAt']?.toDate() ?? new Date() }
      : null;

    this.cache.set(uid, college);
    return college;
  }
}
