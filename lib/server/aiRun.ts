// Shared by every AI scan route.
// - A time budget: the host stops a function at 60 s (routes export maxDuration = 60), so model
//   fallbacks share ~52 s instead of each waiting its full timeout and the scan dying half way.
// - Today's date in India, so "due Friday" or "15 Nov" become the right dates.

export const AI_ROUTE_BUDGET_MS = 52_000;

export function aiBudget(totalMs = AI_ROUTE_BUDGET_MS) {
  const start = Date.now();
  return {
    left: () => totalMs - (Date.now() - start),
    /** Time for the next model try (at most `perTryMs`), or 0 when too little is left to be worth it */
    slot(perTryMs: number) {
      const left = totalMs - (Date.now() - start) - 1500;
      return left < 6000 ? 0 : Math.min(perTryMs, left);
    },
  };
}

export const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms} ms`)), ms))]);

/** "Tuesday, 10 November 2026" and "2026-11-10", in India time */
export function istToday() {
  const now = new Date();
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const label = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  return { iso, label };
}
