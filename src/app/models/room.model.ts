/**
 * A hall is modelled the way it is actually laid out: as COLUMNS of benches
 * running from the front of the room to the back. Real halls are irregular —
 * the column beside the door is short, the one along the wall is long — so the
 * per-column bench count is the primitive, not a rows × benches rectangle.
 *
 *        col 1   col 2   col 3   col 4
 *  front  [B1]    [B7]    [B12]   [B18]
 *         [B2]    [B8]    [B13]   [B19]
 *         [B3]    [B9]    [B14]   [B20]
 *         [B4]    [B10]   [B15]
 *         [B5]    [B11]   [B16]
 *  back   [B6]            [B17]
 *
 * Benches are numbered column-major, which is also the order seats are filled,
 * so an invigilator reading "B14" walks down column 3 and counts to the third
 * bench without any arithmetic.
 */
export interface Room {
  id: string;
  name: string;
  floor: string;
  /** Benches in each column, front → back. Length = number of columns. */
  columnLayout: number[];
  benchCount: number;      // sum(columnLayout)
  seatsPerBench: number;
  totalCapacity: number;   // benchCount * seatsPerBench
  isActive: boolean;
}

/** Anything that carries a layout, including legacy row-shaped documents. */
export interface LegacyRoomShape {
  columnLayout?: number[] | null;
  rowLayout?: number[] | null;
  rowsCount?: number | null;
  benchesPerRow?: number | null;
}

const clean = (arr: unknown): number[] =>
  Array.isArray(arr)
    ? arr.map(n => Math.max(0, Math.trunc(Number(n) || 0))).filter(n => n > 0)
    : [];

/**
 * Resolve a room's per-column bench counts, migrating older documents.
 *
 * Legacy rooms stored benches per ROW. A row-shaped hall transposes cleanly:
 * column `c` contains one bench for every row long enough to reach it.
 */
export function roomColumns(room: LegacyRoomShape): number[] {
  const cols = clean(room.columnLayout);
  if (cols.length) return cols;

  const rows = clean(room.rowLayout);
  if (rows.length) {
    const width = Math.max(...rows);
    return Array.from({ length: width }, (_, c) => rows.filter(r => r > c).length);
  }

  const rowsCount = Math.max(0, Math.trunc(Number(room.rowsCount) || 0));
  const perRow = Math.max(0, Math.trunc(Number(room.benchesPerRow) || 0));
  if (rowsCount && perRow) return Array.from({ length: perRow }, () => rowsCount);

  return [];
}

export const benchCountOf = (columns: number[]): number => columns.reduce((a, b) => a + b, 0);

/** Bench number of the `row`-th bench (0-based) in column `col` (0-based). */
export function benchNumberAt(columns: number[], col: number, row: number): number {
  let n = 0;
  for (let c = 0; c < col; c++) n += columns[c];
  return n + row + 1;
}

/** Bench numbers laid out for rendering: `grid[col][row]`, column-major. */
export function benchGrid(columns: number[]): number[][] {
  let n = 0;
  return columns.map(len => Array.from({ length: len }, () => ++n));
}

/** Usable seats on one bench once the anti-malpractice gap rule is applied. */
export const seatsPerBenchEffective = (seatsPerBench: number, spacing: boolean): number =>
  spacing ? Math.ceil(Math.max(0, seatsPerBench) / 2) : Math.max(0, seatsPerBench);

export const roomCapacity = (columns: number[], seatsPerBench: number, spacing = false): number =>
  benchCountOf(columns) * seatsPerBenchEffective(seatsPerBench, spacing);

/** "2" → "2nd Floor"; already-worded values pass through unchanged. */
export function formatFloor(floor: string): string {
  if (!floor) return '—';
  const lower = floor.toLowerCase();
  if (lower.includes('floor') || lower.includes('ground')) return floor;
  const n = parseInt(floor, 10);
  if (isNaN(n)) return floor;
  if (n === 0) return 'Ground Floor';
  const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${s} Floor`;
}

/** Human summary, e.g. "4 columns · 6,6,5,4 · 2 per bench". */
export function layoutSummary(columns: number[], seatsPerBench: number): string {
  if (!columns.length) return 'No layout set';
  const even = columns.every(c => c === columns[0]);
  const shape = even
    ? `${columns.length} columns × ${columns[0]} benches`
    : `${columns.length} columns · ${columns.join(', ')}`;
  return `${shape} · ${seatsPerBench} per bench`;
}
