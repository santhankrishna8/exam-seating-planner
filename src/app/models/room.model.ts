export interface Room {
  id: string;
  name: string;
  floor: string;
  rowsCount: number;
  benchesPerRow: number;   // uniform layout: benches in every row
  rowLayout?: number[];    // optional uneven layout: benches per each row (overrides benchesPerRow)
  benchCount: number;      // uniform: rowsCount*benchesPerRow · uneven: sum(rowLayout)
  seatsPerBench: number;
  totalCapacity: number;   // = benchCount * seatsPerBench
  isActive: boolean;
}

/** Resolve a room's per-row bench counts (handles both uniform and uneven layouts). */
export function roomRowLayout(room: Pick<Room, 'rowsCount' | 'benchesPerRow' | 'rowLayout'>): number[] {
  if (room.rowLayout && room.rowLayout.length) return room.rowLayout;
  return Array.from({ length: room.rowsCount || 1 }, () => room.benchesPerRow || 0);
}
