import { normalizeHallTicket } from './hall-ticket';

describe('normalizeHallTicket', () => {
  it('upper-cases and strips whitespace so lookups are case-insensitive', () => {
    expect(normalizeHallTicket(' 21wh1a0501 ')).toBe('21WH1A0501');
    expect(normalizeHallTicket('21 WH1A 0501')).toBe('21WH1A0501');
  });

  it('removes characters that are illegal in a Firestore document id', () => {
    // These previously reached doc() untouched and threw from inside a batch.
    expect(normalizeHallTicket('21/WH1A/0501')).toBe('21WH1A0501');
    expect(normalizeHallTicket('21.WH1A.0501')).toBe('21WH1A0501');
    expect(normalizeHallTicket('21\\WH1A[0501]')).toBe('21WH1A0501');
  });

  it('never produces a Firestore-reserved id', () => {
    expect(normalizeHallTicket('__name__')).toBe('NAME');
  });

  it('is idempotent — writes and reads normalise to the same key', () => {
    const once = normalizeHallTicket('21/wh1a/0501');
    expect(normalizeHallTicket(once)).toBe(once);
  });

  it('handles empty and nullish input', () => {
    expect(normalizeHallTicket('')).toBe('');
    expect(normalizeHallTicket(undefined as unknown as string)).toBe('');
  });
});
