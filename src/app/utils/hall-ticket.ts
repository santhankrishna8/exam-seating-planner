// Hall tickets are used as Firestore document IDs, so lookups are exact-match.
// Normalize on every write and read so "21wh1a0501" matches "21WH1A0501".
export function normalizeHallTicket(value: string): string {
  return (value ?? '').toUpperCase().replace(/\s+/g, '').trim();
}
