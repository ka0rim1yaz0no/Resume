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

/** A continuous orbit and dolly; pull back slightly as each subject enters. */
export function cinematicCamera(progress: number, compact: boolean) {
  const p = clamp(progress)
  const amplitude = compact ? 0.4 : 1
  const turn = p * Math.PI * 2
  const breathing = Math.sin(p * Math.PI)
  const pullback = Math.exp(-(((p - 0.33) / 0.095) ** 2)) + Math.exp(-(((p - 0.68) / 0.1) ** 2))
  const closeup = Math.exp(-(((p - 0.1) / 0.16) ** 2)) + Math.exp(-(((p - 0.5) / 0.16) ** 2)) + Math.exp(-(((p - 0.92) / 0.16) ** 2))
  return { x: Math.cos(turn + 0.3) * 0.56 * amplitude, y: 0.2 + breathing * 0.18,
    z: 6.9 - closeup * 0.4 + pullback * 0.55,
    lookX: -Math.sin(turn) * 0.045 * amplitude, lookY: 0.035 + breathing * 0.035, fov: 35 + breathing * 0.55 }
}

/** Elevated three-quarter establishing shot, curved dolly, exact hero landing.
 * A quintic clock brings camera velocity to zero at both ends of the take. */
export function openingCamera(progress: number, compact: boolean) {
  const t = smooth(0, 1, 1 - clamp(progress)), s = 1 - t
  const bezier = (a: number, b: number, c: number, d: number) => s ** 3 * a + 3 * s * s * t * b + 3 * s * t * t * c + t ** 3 * d
  return { x: bezier(-1.75, -1.2, 0.6, 0) * (compact ? 0.6 : 1),
    y: bezier(0.95, 1.2, 0.32, 0.15), z: bezier(7.6, 7.3, 6.45, 6.7),
    lookX: bezier(-0.08, 0.07, 0.03, 0), lookY: bezier(0.22, 0.2, 0.04, 0), fov: blend(32.5, 35, t) }
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
    z: -(1 - arrive) * 0.7 - leave * 0.25,
    rx: (1 - arrive) * 0.16 + leave * 0.1,
    ry: -(1 - arrive) * 0.7 + leave * 0.85,
    rz: ((1 - arrive) * -0.065 + leave * 0.045) * travel,
    scale: 0.83 + arrive * 0.17 - leave * 0.08,
    // A camera cut becomes a dimensional crossfade, in both scroll directions.
    mix: smooth(intro ? 0.2 : 0.73, intro ? 0.68 : 0.98, p),
    cameraZ: 7.1 - arrive * 0.4 + leave * 0.45,
  }
}

export function journeyPose(progress: number, index: number, compact: boolean) {
  const p = clamp(progress)
  const first = smooth(0.23, 0.43, p)
  const second = smooth(0.57, 0.79, p)
  const travel = compact ? 0.45 : 1
  const weights = [1 - first, first * (1 - second), second]
  if (index === 0) return { weight: weights[0], x: -first * 0.65 * travel, y: first * 0.1, z: -first * 0.65, rx: 0.02, ry: -0.45 + smooth(0, 0.47, p) * 1.05, rz: first * 0.025, scale: 1.08 - first * 0.14 }
  if (index === 1) return { weight: weights[1], x: ((1 - first) * 0.7 - second * 0.65) * travel, y: -(1 - first) * 0.16 + second * 0.1, z: -(1 - first) * 0.9 - second * 0.65, rx: 0.03, ry: 0.65 - smooth(0.2, 0.8, p) * 1.1, rz: -(1 - first) * 0.035, scale: 0.9 + first * 0.15 - second * 0.14 }
  return { weight: weights[2], x: (1 - second) * 0.7 * travel, y: -(1 - second) * 0.16, z: -(1 - second) * 0.9, rx: 0.08 * (1 - second), ry: -0.65 + smooth(0.55, 1, p) * 0.95, rz: -(1 - second) * 0.035, scale: 0.9 + second * 0.18 }
}
