/**
 * Single source of truth for the product identity.
 * Renaming the product is a one-line change here.
 */
export const BRAND = {
  name: 'Invigil',
  /** Used under the wordmark and in page titles. */
  descriptor: 'Examination Control System',
  /** Short line for the public/student-facing surface. */
  publicTagline: 'Find your exam hall, bench and seat.',
  /** Stamped on printed slips and registers. */
  stamp: 'INVIGIL · EXAMINATION CONTROL SYSTEM',
} as const;
