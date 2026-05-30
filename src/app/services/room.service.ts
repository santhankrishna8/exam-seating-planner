import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Room } from '../models/room.model';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private roomsCol() {
    const uid = this.auth.currentUid!;
    return collection(this.firestore, `colleges/${uid}/rooms`);
  }

  getRooms(): Observable<Room[]> {
    return from(getDocs(this.roomsCol())).pipe(
      map(snap => snap.docs.map(d => this.mapRoom(d.id, d.data() as any)))
    );
  }

  private mapRoom(id: string, data: any): Room {
    const rowsCount = data['rowsCount'] ?? 1;
    const benchesPerRow = data['benchesPerRow'] ?? data['benchCount'] ?? 30;
    const benchCount = data['benchCount'] ?? rowsCount * benchesPerRow;
    const seatsPerBench = data['seatsPerBench'] ?? 2;
    return {
      id,
      name: data['name'],
      floor: data['floor'] ?? '',
      rowsCount,
      benchesPerRow,
      benchCount,
      seatsPerBench,
      totalCapacity: benchCount * seatsPerBench,
      isActive: data['isActive'] ?? true
    };
  }

  async addRoom(room: Omit<Room, 'id' | 'totalCapacity'>): Promise<void> {
    const benchCount = room.rowsCount * room.benchesPerRow;
    await addDoc(this.roomsCol(), {
      name: room.name,
      floor: room.floor,
      rowsCount: room.rowsCount,
      benchesPerRow: room.benchesPerRow,
      benchCount,
      seatsPerBench: room.seatsPerBench,
      totalCapacity: benchCount * room.seatsPerBench,
      isActive: room.isActive,
      createdAt: serverTimestamp()
    });
  }

  async updateRoom(id: string, room: Partial<Room>): Promise<void> {
    const uid = this.auth.currentUid!;
    const updates: any = { ...room };
    const rows = room.rowsCount;
    const bpr = room.benchesPerRow;
    if (rows !== undefined || bpr !== undefined) {
      const r = rows ?? 1;
      const b = bpr ?? 1;
      updates['benchCount'] = r * b;
      updates['totalCapacity'] = r * b * (room.seatsPerBench ?? 2);
    }
    await updateDoc(doc(this.firestore, `colleges/${uid}/rooms`, id), updates);
  }

  async deleteRoom(id: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await deleteDoc(doc(this.firestore, `colleges/${uid}/rooms`, id));
  }
}
