/** Follow short wheel/touch changes without delaying navigation or history jumps.
 * Exponential response is identical at 30, 60 and 120 Hz. */
export function followScroll(previous: number | null, target: number, delta: number, height: number, enabled: boolean) {
  if (previous === null || !enabled || Math.abs(target - previous) > height * 1.25) return target
  const next = previous + (target - previous) * (1 - Math.exp(-14 * Math.min(delta, 0.1)))
  return Math.abs(next - target) < 0.1 ? target : next
}
