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
    const layout: number[] | undefined = Array.isArray(data['rowLayout']) && data['rowLayout'].length
      ? data['rowLayout'].map((n: any) => Number(n) || 0)
      : undefined;
    const rowsCount = layout ? layout.length : (data['rowsCount'] ?? 1);
    const benchesPerRow = layout ? Math.max(...layout) : (data['benchesPerRow'] ?? data['benchCount'] ?? 30);
    const benchCount = layout ? layout.reduce((a, b) => a + b, 0) : (data['benchCount'] ?? rowsCount * benchesPerRow);
    const seatsPerBench = data['seatsPerBench'] ?? 2;
    return {
      id,
      name: data['name'],
      floor: data['floor'] ?? '',
      rowsCount,
      benchesPerRow,
      rowLayout: layout,
      benchCount,
      seatsPerBench,
      totalCapacity: benchCount * seatsPerBench,
      isActive: data['isActive'] ?? true
    };
  }

  // Sum of an optional uneven layout, else uniform rows×perRow.
  private benchCountFor(room: { rowsCount: number; benchesPerRow: number; rowLayout?: number[] }): number {
    if (room.rowLayout && room.rowLayout.length) return room.rowLayout.reduce((a, b) => a + b, 0);
    return room.rowsCount * room.benchesPerRow;
  }

  async addRoom(room: Omit<Room, 'id' | 'totalCapacity'>): Promise<void> {
    const benchCount = this.benchCountFor(room);
    await addDoc(this.roomsCol(), {
      name: room.name,
      floor: room.floor,
      rowsCount: room.rowsCount,
      benchesPerRow: room.benchesPerRow,
      rowLayout: room.rowLayout ?? null,
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
    if ('rowLayout' in room) updates['rowLayout'] = room.rowLayout ?? null;
    if (room.rowsCount !== undefined || room.benchesPerRow !== undefined || 'rowLayout' in room) {
      const benchCount = this.benchCountFor({
        rowsCount: room.rowsCount ?? 1,
        benchesPerRow: room.benchesPerRow ?? 1,
        rowLayout: room.rowLayout ?? undefined
      });
      updates['benchCount'] = benchCount;
      updates['totalCapacity'] = benchCount * (room.seatsPerBench ?? 2);
    }
    await updateDoc(doc(this.firestore, `colleges/${uid}/rooms`, id), updates);
  }

  async deleteRoom(id: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await deleteDoc(doc(this.firestore, `colleges/${uid}/rooms`, id));
  }
}
