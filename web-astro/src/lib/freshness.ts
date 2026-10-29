/**
 * How old the shipped census is. The map is a snapshot: the credit strip says when it was
 * generated, but a date alone does not tell a visitor whether they are looking at this
 * week or last spring. Anything past `STALE_AFTER_DAYS` is flagged.
 *
 * Pure so it can be tested without a clock.
 */
export const STALE_AFTER_DAYS = 14;

export interface Freshness {
  /** whole days between generation and now; null when the timestamp is unreadable */
  days: number | null;
  stale: boolean;
}

const MS_PER_DAY = 86_400_000;

export function freshness(generatedAt: string, now: Date = new Date()): Freshness {
  const then = new Date(generatedAt);
  if (Number.isNaN(then.getTime())) return { days: null, stale: false };
  const days = Math.floor((now.getTime() - then.getTime()) / MS_PER_DAY);
  // a timestamp in the future (clock skew, a bad build) is not "stale"
  return { days, stale: days > STALE_AFTER_DAYS };
}
