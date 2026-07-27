import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Room, roomColumns, benchCountOf } from '../models/room.model';
import { Observable, from, map } from 'rxjs';

export type RoomDraft = Omit<Room, 'id' | 'benchCount' | 'totalCapacity'>;

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
      map(snap => snap.docs
        .map(d => this.mapRoom(d.id, d.data() as any))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))
    );
  }

  /** Reads both current column-shaped documents and legacy row-shaped ones. */
  private mapRoom(id: string, data: any): Room {
    const columnLayout = roomColumns(data);
    const seatsPerBench = Math.max(1, Number(data['seatsPerBench']) || 2);
    const benchCount = benchCountOf(columnLayout);
    return {
      id,
      name: data['name'] ?? '',
      floor: data['floor'] ?? '',
      columnLayout,
      benchCount,
      seatsPerBench,
      totalCapacity: benchCount * seatsPerBench,
      isActive: data['isActive'] ?? true
    };
  }

  async addRoom(room: RoomDraft): Promise<void> {
    await addDoc(this.roomsCol(), this.toDoc(room, { createdAt: serverTimestamp() }));
  }

  /** Full-document write — the room form always submits a complete layout. */
  async updateRoom(id: string, room: RoomDraft): Promise<void> {
    const uid = this.auth.currentUid!;
    await updateDoc(doc(this.firestore, `colleges/${uid}/rooms`, id), this.toDoc(room));
  }

  private toDoc(room: RoomDraft, extra: Record<string, unknown> = {}) {
    const columnLayout = room.columnLayout.filter(n => n > 0);
    const benchCount = benchCountOf(columnLayout);
    return {
      name: room.name,
      floor: room.floor ?? '',
      columnLayout,
      benchCount,
      seatsPerBench: room.seatsPerBench,
      totalCapacity: benchCount * room.seatsPerBench,
      isActive: room.isActive ?? true,
      // Legacy fields are cleared so a migrated room never reads back row-shaped.
      rowLayout: null,
      rowsCount: null,
      benchesPerRow: null,
      ...extra
    };
  }

  async deleteRoom(id: string): Promise<void> {
    const uid = this.auth.currentUid!;
    await deleteDoc(doc(this.firestore, `colleges/${uid}/rooms`, id));
  }
}
