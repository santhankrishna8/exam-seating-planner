// Hall tickets are used as Firestore document IDs, so lookups are exact-match and
// the id must be legal. Normalize on every write and read so "21wh1a0501" matches
// "21WH1A0501", and strip characters Firestore ids reject (/ . \ [ ] and friends)
// plus the leading/trailing underscores of reserved "__name__" ids.
export function normalizeHallTicket(value: string): string {
  return (value ?? '')
    .toUpperCase()
    .replace(/[\s/\\.\[\]#$*`]+/g, '')
    .replace(/^_+|_+$/g, '');
}
