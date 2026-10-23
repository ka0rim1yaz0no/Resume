import { blend, clamp, type StageRect } from './choreography'

export type ContentStage = 'film' | 'project' | 'experience' | 'skills'
export type Dock = { rect: StageRect; arrive: number; leave: number }
export type ContentDocks = Record<ContentStage, Dock>
export type ContentRoute = { from: ContentStage; to: ContentStage; mix: number; amount: number; viewport: StageRect }
const ease = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10)

export function dockVisibility(rect: StageRect, header: number) {
  return 1 - ease(clamp((header - rect.top) / Math.max(1, rect.height * 0.2)))
}

/** One reversible rail carries the existing scene through the actual résumé.
 * Endpoint rectangles follow native sticky/document layout, including resize. */
export function contentRoute(scroll: number, docks: ContentDocks, header: number, height: number): ContentRoute {
  const stages: ContentStage[] = ['film', 'project', 'experience', 'skills']
  if (scroll <= docks.film.leave) return { from: 'film', to: 'film', mix: 0, amount: 0, viewport: docks.film.rect }
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i], to = stages[i + 1]
    const start = docks[from].leave
    const end = Math.max(start + 1, docks[to].arrive)
    if (scroll < end) {
      const t = clamp((scroll - start) / (end - start))
      const mix = ease(t)
      const a = docks[from].rect, b = docks[to].rect
      const w = blend(a.width, b.width, mix), h = blend(a.height, b.height, mix)
      const rawTop = blend(a.top, b.top, mix)
      // Keep the middle of a long handoff in frame, without altering the
      // position or velocity where it meets either real DOM destination.
      const safeTop = clamp(rawTop, header + 16, Math.max(header + 16, height - h - 16))
      const top = blend(rawTop, safeTop, Math.sin(t * Math.PI) ** 2)
      return { from, to, mix, amount: i === 0 ? mix : 1, viewport: { left: blend(a.left, b.left, mix), top, width: w, height: h } }
    }
    if (scroll <= docks[to].leave || to === 'skills') return { from: to, to, mix: 0, amount: 1, viewport: docks[to].rect }
  }
  return { from: 'skills', to: 'skills', mix: 0, amount: 1, viewport: docks.skills.rect }
}

const subjects = { film: 2, project: 1, experience: 2, skills: 3 }
export function contentPose(route: ContentRoute, index: number, compact: boolean) {
  const stage = route.to
  const base = (key: ContentStage) => ({ x: 0, y: 0, z: 0, rx: key === 'skills' ? 0.04 : 0.015, ry: key === 'project' ? 0.14 : key === 'skills' ? 0.1 : 0.12, rz: key === 'skills' ? -0.04 : 0, scale: key === 'skills' ? 1.02 : key === 'experience' ? compact ? 1.3 : 1.28 : compact ? 1.2 : 1.05 })
  const pose = base(stage)
  if (route.from === route.to || route.from === 'film') return { ...pose, weight: index === subjects[stage] ? 1 : 0 }
  const q = route.mix, travel = compact ? 0.45 : 1
  if (index === subjects[route.from]) {
    const outgoing = base(route.from)
    return { ...outgoing, weight: 1 - q, x: -q * 0.42 * travel, y: q * 0.08, z: -q * 0.55, ry: outgoing.ry + q * 0.32, scale: outgoing.scale - q * 0.08 }
  }
  return { ...pose, weight: index === subjects[stage] ? q : 0, x: (1 - q) * 0.42 * travel, y: -(1 - q) * 0.08, z: -(1 - q) * 0.55, ry: pose.ry - (1 - q) * 0.32, scale: pose.scale - (1 - q) * 0.08 }
}

export function contentCamera(route: ContentRoute, compact: boolean) {
  const arc = route.from === route.to ? 0 : Math.sin(route.mix * Math.PI)
  const side = (stage: ContentStage) => stage === 'skills' ? -0.18 : 0.24
  return { x: blend(side(route.from), side(route.to), route.mix) * (compact ? 0.4 : 1), y: 0.18 + arc * 0.05, z: 6.9 + arc * 0.45, lookX: 0, lookY: 0, fov: 35 }
}
