export interface Room {
  id: string;
  name: string;
  floor: string;
  rowsCount: number;
  benchesPerRow: number;
  benchCount: number;      // = rowsCount * benchesPerRow
  seatsPerBench: number;
  totalCapacity: number;   // = benchCount * seatsPerBench
  isActive: boolean;
}
