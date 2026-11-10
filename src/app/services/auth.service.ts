import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, user, User
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  readonly currentUser$: Observable<User | null> = user(this.auth);

  get currentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  async register(email: string, password: string, collegeName: string, collegeCode: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await setDoc(doc(this.firestore, 'colleges', cred.user.uid), {
      name: collegeName,
      code: collegeCode.toUpperCase(),
      createdAt: serverTimestamp()
    });
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
