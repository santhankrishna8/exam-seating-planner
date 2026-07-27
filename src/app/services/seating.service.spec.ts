import { SeatingService } from './seating.service';
import { Room, roomColumns, benchGrid, roomCapacity } from '../models/room.model';
import { Student } from '../models/student.model';

const room = (over: Partial<Room> = {}): Room => {
  const columnLayout = over.columnLayout ?? [3, 2];
  const seatsPerBench = over.seatsPerBench ?? 2;
  const benchCount = columnLayout.reduce((a, b) => a + b, 0);
  return {
    id: 'r1', name: 'Hall A', floor: 'Ground Floor',
    columnLayout, benchCount, seatsPerBench,
    totalCapacity: benchCount * seatsPerBench, isActive: true, ...over
  };
};

const students = (n: number, dept?: (i: number) => string): Student[] =>
  Array.from({ length: n }, (_, i) => ({
    hallTicketNo: `HT${String(i + 1).padStart(3, '0')}`,
    name: `Student ${i + 1}`,
    department: dept?.(i),
    isSeated: false
  }));

describe('room layout', () => {
  it('numbers benches column-major, front to back', () => {
    // col 1 has 3 benches, col 2 has 2 → 1,2,3 then 4,5
    expect(benchGrid([3, 2])).toEqual([[1, 2, 3], [4, 5]]);
  });

  it('migrates a legacy uniform room (rows × benchesPerRow) to columns', () => {
    // 5 rows of 6 benches = 6 columns, each 5 benches deep
    expect(roomColumns({ rowsCount: 5, benchesPerRow: 6 })).toEqual([5, 5, 5, 5, 5, 5]);
  });

  it('transposes a legacy uneven row layout into columns', () => {
    // Rows of 6,6,5,4 benches → 6 columns; column c is as deep as the number
    // of rows long enough to reach it: 4,4,4,4 then 3 (only the 5s and 6s) then 2.
    expect(roomColumns({ rowLayout: [6, 6, 5, 4] })).toEqual([4, 4, 4, 4, 3, 2]);
  });

  it('halves usable seats per bench when the gap rule is on', () => {
    expect(roomCapacity([3, 2], 2, false)).toBe(10);
    expect(roomCapacity([3, 2], 2, true)).toBe(5);
    expect(roomCapacity([3, 2], 3, true)).toBe(10); // ceil(3/2) = 2 per bench
  });
});

describe('SeatingService', () => {
  const svc = new SeatingService();

  it('fills down each column before moving to the next', () => {
    const seated = svc.assignSeats(students(10), [room()], 'sequential');
    const at = (n: number) => seated.find(s => s.hallTicketNo === `HT${String(n).padStart(3, '0')}`)!;

    expect([at(1).assignedBench, at(1).assignedSeat]).toEqual([1, 1]);
    expect([at(2).assignedBench, at(2).assignedSeat]).toEqual([1, 2]);
    expect([at(3).assignedBench, at(3).assignedSeat]).toEqual([2, 1]);
    // bench 4 is the first bench of the SECOND column
    expect([at(7).assignedBench, at(7).assignedSeat]).toEqual([4, 1]);
    expect(seated.every(s => s.isSeated)).toBe(true);
  });

  it('spans halls whose columns are different depths', () => {
    // Two rooms with different column depths — the irregular case.
    const rooms = [room({ id: 'a', columnLayout: [3, 2] }), room({ id: 'b', columnLayout: [2, 2, 1] })];
    const seated = svc.assignSeats(students(20), rooms, 'sequential');
    expect(seated.filter(s => s.isSeated).length).toBe(20);
    expect(new Set(seated.filter(s => s.assignedRoom === 'a').map(s => s.assignedBench)).size).toBe(5);
  });

  it('skips alternate seats when the gap rule is on', () => {
    const seated = svc.assignSeats(students(5), [room({ seatsPerBench: 3 })], { mode: 'sequential', spacing: true });
    expect(seated.filter(s => s.isSeated).map(s => s.assignedSeat)).toEqual([1, 3, 1, 3, 1]);
  });

  it('refuses to allot when the halls cannot hold the roster', () => {
    expect(() => svc.assignSeats(students(11), [room()], 'sequential')).toThrow(/Not enough capacity/);
  });

  it('splits bench-mates across departments', () => {
    const roster = students(8, i => (i < 4 ? 'CSE' : 'ECE'));
    const seated = svc.assignSeats(roster, [room({ columnLayout: [4] })], { mode: 'department' });
    for (let bench = 1; bench <= 4; bench++) {
      const mates = seated.filter(s => s.assignedBench === bench).map(s => s.department);
      expect(new Set(mates).size).toBe(mates.length);
    }
  });
});
