import { Injectable } from '@angular/core';
import { Room, roomRowLayout } from '../models/room.model';
import { Student } from '../models/student.model';
import { ShuffleMode } from '../models/exam.model';

export interface SeatingOptions {
  mode: ShuffleMode;
  spacing?: boolean; // leave alternate seat empty per bench
}

@Injectable({ providedIn: 'root' })
export class SeatingService {

  /** Effective usable seats on a bench given the spacing rule. */
  private seatsPerBenchEff(seatsPerBench: number, spacing: boolean): number {
    return spacing ? Math.ceil(seatsPerBench / 2) : seatsPerBench;
  }

  /** Total seats a room set can hold under the given spacing rule. */
  capacityOf(rooms: Room[], spacing = false): number {
    return rooms.reduce((sum, r) => sum + r.benchCount * this.seatsPerBenchEff(r.seatsPerBench, spacing), 0);
  }

  assignSeats(students: Student[], rooms: Room[], options: SeatingOptions | ShuffleMode): Student[] {
    // Back-compat: a bare ShuffleMode string still works.
    const opts: SeatingOptions = typeof options === 'string' ? { mode: options } : options;
    const spacing = !!opts.spacing;
    const seatStep = spacing ? 2 : 1;

    const totalCapacity = this.capacityOf(rooms, spacing);
    if (students.length > totalCapacity) {
      throw new Error(`Not enough capacity. Need ${students.length} seats but only ${totalCapacity} available${spacing ? ' (with spacing on)' : ''}.`);
    }

    const ordered = this.orderStudents(students, opts.mode);

    let idx = 0;
    const assigned: Student[] = [];

    // Column-major fill: down the entire left column of benches (row 1 → last),
    // then the next column. Within a bench, seats fill left→right (skipping one
    // when spacing is on, so neighbours aren't shoulder-to-shoulder).
    outer:
    for (const room of rooms) {
      const layout = roomRowLayout(room);           // benches in each row (uneven-aware)
      const maxCols = layout.length ? Math.max(...layout) : 0;
      const prefix: number[] = [];                  // bench-number offset where each row begins
      let acc = 0;
      for (let r = 0; r < layout.length; r++) { prefix[r] = acc; acc += layout[r]; }

      for (let c = 0; c < maxCols; c++) {
        for (let r = 0; r < layout.length; r++) {
          if (c >= layout[r]) continue;             // this row is shorter than column c
          const bench = prefix[r] + c + 1;
          for (let seat = 1; seat <= room.seatsPerBench; seat += seatStep) {
            if (idx >= ordered.length) break outer;
            assigned.push({ ...ordered[idx], assignedRoom: room.id, assignedBench: bench, assignedSeat: seat, isSeated: true });
            idx++;
          }
        }
      }
    }

    const unseated = ordered.slice(idx).map(s => ({ ...s, isSeated: false }));
    return [...assigned, ...unseated];
  }

  private orderStudents(students: Student[], mode: ShuffleMode): Student[] {
    if (mode === 'random') return this.shuffle(students);
    if (mode === 'department') return this.interleaveByDepartment(students);
    return [...students]; // sequential
  }

  /**
   * Round-robin across department buckets so consecutive students (hence
   * bench-mates, since fill is column-major) belong to different departments.
   * Falls back gracefully when most students share one department.
   */
  private interleaveByDepartment(students: Student[]): Student[] {
    const buckets = new Map<string, Student[]>();
    for (const s of students) {
      const key = (s.department || '—').trim().toUpperCase() || '—';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }
    // Largest departments first keeps the spread even to the end.
    const lists = [...buckets.values()].sort((a, b) => b.length - a.length);
    const result: Student[] = [];
    while (result.length < students.length) {
      let progressed = false;
      for (const list of lists) {
        const next = list.shift();
        if (next) { result.push(next); progressed = true; }
      }
      if (!progressed) break;
    }
    return result;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
