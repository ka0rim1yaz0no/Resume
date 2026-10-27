import { blend, clamp, type StageRect } from './choreography'

export type ContentStage = 'film' | 'project' | 'experience' | 'skills' | 'education'
export type Dock = { rect: StageRect; arrive: number; leave: number }
export type ContentDocks = Record<ContentStage, Dock>
export type ContentRoute = { from: ContentStage; to: ContentStage; mix: number; amount: number; viewport: StageRect }
const ease = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10)

/** Exchange subjects through a gentle dust dissolve during the lateral handoff. */
export function contentTransitionMix(mix: number) {
  const t = clamp((mix - 0.28) / 0.44)
  return t * t * (3 - 2 * t)
}

export function dockVisibility(rect: StageRect, header: number) {
  return 1 - ease(clamp((header - rect.top) / Math.max(1, rect.height * 0.2)))
}

/** Fade a carried object before a partly off-screen window cuts through it.
 * Framing and the lens stay fixed; only opacity responds to the visible area. */
export function viewportVisibility(rect: StageRect, header: number, height: number) {
  const available = Math.min(rect.height, Math.max(0, height - header))
  if (available <= 0) return 0
  const visible = Math.max(0, Math.min(height, rect.top + rect.height) - Math.max(header, rect.top))
  return ease(clamp((visible / available - 0.55) / 0.4))
}

/** Long reading passages belong to the text. Fade as the real source leaves,
 * and return only when the next viewer enters the screen. */
export function contentVisibility(route: ContentRoute, docks: ContentDocks, header: number, height: number) {
  if (route.from === route.to || docks[route.to].arrive - docks[route.from].leave <= height * 1.15) return 1
  const from = docks[route.from].rect, to = docks[route.to].rect
  const edge = Math.min(180, height * 0.24)
  const leaving = clamp((from.top + from.height - header) / edge)
  const entering = clamp((height - to.top) / edge)
  return ease(Math.max(leaving, entering))
}

/** One reversible rail carries the existing scene through the actual résumé.
 * Endpoint rectangles follow native sticky/document layout, including resize. */
export function contentRoute(scroll: number, docks: ContentDocks, header: number, height: number, width?: number): ContentRoute {
  const stages: ContentStage[] = ['film', 'project', 'experience', 'skills', 'education']
  if (scroll <= docks.film.leave) return { from: 'film', to: 'film', mix: 0, amount: 0, viewport: docks.film.rect }
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i], to = stages[i + 1]
    const start = docks[from].leave
    const end = Math.max(start + 1, docks[to].arrive)
    if (scroll < end) {
      const t = clamp((scroll - start) / (end - start))
      const mix = ease(t)
      const a = docks[from].rect, b = docks[to].rect
      // Follow the real section windows without inflating the middle of the shot.
      const w = blend(a.width, b.width, mix), h = blend(a.height, b.height, mix)
      const rawTop = blend(a.top, b.top, mix)
      // Keep the middle of a long handoff in frame, without altering the
      // position or velocity where it meets either real DOM destination.
      const safeTop = clamp(rawTop, header + 16, Math.max(header + 16, height - h - 16))
      const top = blend(rawTop, safeTop, Math.sin(t * Math.PI) ** 2)
      const rawLeft = blend(a.left, b.left, mix)
      const left = width ? clamp(rawLeft, 0, Math.max(0, width - w)) : rawLeft
      return { from, to, mix, amount: i === 0 ? contentTransitionMix(mix) : 1, viewport: { left, top, width: w, height: h } }
    }
    if (scroll <= docks[to].leave || to === 'education') return { from: to, to, mix: 0, amount: 1, viewport: docks[to].rect }
  }
  return { from: 'education', to: 'education', mix: 0, amount: 1, viewport: docks.education.rect }
}

const subjects = { film: 2, project: 1, experience: 4, skills: 3, education: 5 }
export function contentPose(route: ContentRoute, index: number, compact: boolean) {
  const stage = route.to
  const base = (key: ContentStage) => ({ x: 0, y: 0, z: 0, rx: key === 'skills' ? 0.04 : 0.015, ry: key === 'project' ? 0.14 : key === 'skills' ? 0.1 : 0.12, rz: key === 'skills' ? -0.04 : 0, scale: key === 'skills' ? 1.02 : key === 'experience' ? 1.22 : key === 'education' ? 1.7 : compact ? 1.2 : 1.05 })
  const pose = base(stage)
  if (route.from === route.to || route.from === 'film') return { ...pose, weight: index === subjects[stage] ? 1 : 0 }
  const q = route.mix, cut = contentTransitionMix(q), travel = compact ? 0.45 : 1
  if (index === subjects[route.from]) {
    const outgoing = base(route.from)
    return { ...outgoing, weight: 1 - cut, x: outgoing.x - q * 0.16 * travel, y: q * 0.04, ry: outgoing.ry + q * 0.12 }
  }
  return { ...pose, weight: index === subjects[stage] ? cut : 0, x: pose.x + (1 - q) * 0.16 * travel, y: -(1 - q) * 0.04, ry: pose.ry - (1 - q) * 0.12 }
}

export function contentCamera(route: ContentRoute, compact: boolean) {
  const side = (stage: ContentStage) => stage === 'skills' ? -0.18 : 0.24
  // A fixed lens and distance keep the scroll calm; only the lateral aim changes.
  return { x: blend(side(route.from), side(route.to), route.mix) * (compact ? 0.4 : 1), y: 0.18, z: 6.9, lookX: 0, lookY: 0, fov: 35 }
}
