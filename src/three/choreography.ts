export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export const blend = (a: number, b: number, t: number) => a + (b - a) * t
export type StageRect = { left: number; top: number; width: number; height: number }

/** A Hermite path matches document velocity at departure and the stationary
 * sticky frame at arrival, without an acceleration jump at either end. */
export function stageHandoff(hero: StageRect, destination: StageRect, scroll: number, start: number, end: number) {
  const t = clamp((scroll - start) / Math.max(1, end - start))
  const eased = smooth(0, 1, t)
  if (scroll <= start) return { rect: { ...hero, top: hero.top - scroll }, progress: 0 }
  if (scroll >= end) return { rect: destination, progress: 1 }
  const tangent = t - 6 * t ** 3 + 8 * t ** 4 - 3 * t ** 5
  return { progress: eased, rect: {
    left: blend(hero.left, destination.left, eased),
    top: blend(hero.top - start, destination.top, eased) - (end - start) * tangent,
    width: blend(hero.width, destination.width, eased),
    height: blend(hero.height, destination.height, eased),
  } }
}

/** A small lateral orbit with a fixed lens and distance throughout the scroll. */
export function cinematicCamera(progress: number, compact: boolean) {
  const p = clamp(progress)
  const amplitude = compact ? 0.4 : 1
  const turn = p * Math.PI * 2
  const breathing = Math.sin(p * Math.PI)
  return { x: Math.cos(turn + 0.3) * 0.3 * amplitude, y: 0.2 + breathing * 0.06,
    z: 6.9,
    lookX: -Math.sin(turn) * 0.025 * amplitude, lookY: 0.035 + breathing * 0.02, fov: 35 }
}

/** Elevated three-quarter establishing shot, curved pan, exact hero landing.
 * A quintic clock brings camera velocity to zero at both ends of the take. */
export function openingCamera(progress: number, compact: boolean) {
  if (progress <= 0) return { x: 0, y: 0.15, z: 6.7, lookX: 0, lookY: 0, fov: 35 }
  const clock = 1 - clamp(progress)
  const t = smooth(0.02, 0.7, clock), s = 1 - t, dock = smooth(0.79, 1, clock)
  const bezier = (a: number, b: number, c: number, d: number) => s ** 3 * a + 3 * s * s * t * b + 3 * s * t * t * c + t ** 3 * d
  return { x: blend(bezier(-1.9, -1.9, 1.55, 0.6), 0, dock) * (compact ? 0.6 : 1),
    y: blend(bezier(0.95, 1.05, 0.42, 0.28), 0.15, dock), z: 6.7,
    lookX: bezier(-0.08, 0.07, 0.03, 0) * (1 - dock), lookY: blend(bezier(0.22, 0.2, 0.04, 0.04), 0, dock), fov: 35 }
}

/** The React tile follows a short arc beside the sculpture. Its visibility
 * follows the same Systems weight, so it never remains over another chapter. */
export function reactCompanionPose(progress: number, compact: boolean, opening: number) {
  const p = clamp(progress)
  const arc = smooth(0, 0.43, p)
  const travel = compact ? 0.85 : 1
  return { x: (1.42 - arc * 0.24) * travel, y: 1.23 + Math.sin(arc * Math.PI) * 0.12,
    z: 0.38 - arc * 0.3, rx: -0.06 + arc * 0.06, ry: -0.12 + arc * 0.4 - clamp(opening) * 0.3,
    rz: 0.05 - arc * 0.1, scale: compact ? 0.8 : 0.92 }
}

/** A reversible scroll score. No wall-clock time determines a chapter's pose. */
export function chapterPose(progress: number, intro: boolean, compact: boolean) {
  const p = clamp(progress)
  const arrive = intro ? 1 : smooth(0.04, 0.36, p)
  const leave = smooth(intro ? 0.14 : 0.64, intro ? 0.9 : 1, p)
  const travel = compact ? 0.45 : 1
  return {
    x: ((1 - arrive) * 0.55 - leave * 0.48) * travel,
    y: (-(1 - arrive) * 0.42 + leave * 0.3) * travel,
    z: 0,
    rx: (1 - arrive) * 0.16 + leave * 0.1,
    ry: -(1 - arrive) * 0.7 + leave * 0.85,
    rz: ((1 - arrive) * -0.065 + leave * 0.045) * travel,
    scale: 1,
    // A camera cut becomes a dimensional crossfade, in both scroll directions.
    mix: smooth(intro ? 0.2 : 0.73, intro ? 0.68 : 0.98, p),
    cameraZ: 6.7,
  }
}

export function journeyPose(progress: number, index: number, compact: boolean) {
  const p = clamp(progress)
  const first = smooth(0.23, 0.43, p)
  const second = smooth(0.57, 0.79, p)
  const travel = compact ? 0.45 : 1
  const weights = [1 - first, first * (1 - second), second]
  if (index === 0) return { weight: weights[0], x: -first * 0.45 * travel, y: first * 0.06, z: 0, rx: 0.02, ry: -0.35 + smooth(0, 0.47, p) * 0.7, rz: first * 0.015, scale: 1.08 }
  if (index === 1) return { weight: weights[1], x: ((1 - first) * 0.45 - second * 0.45) * travel, y: -(1 - first) * 0.1 + second * 0.06, z: 0, rx: 0.03, ry: 0.4 - smooth(0.2, 0.8, p) * 0.75, rz: -(1 - first) * 0.02, scale: 1.05 }
  return { weight: weights[2], x: (1 - second) * 0.45 * travel, y: -(1 - second) * 0.1, z: 0, rx: 0.05 * (1 - second), ry: -0.4 + smooth(0.55, 1, p) * 0.7, rz: -(1 - second) * 0.02, scale: 1.08 }
}
