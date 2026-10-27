import { blend, clamp, type StageRect } from './choreography'

export type ContentStage = 'film' | 'project' | 'experience' | 'skills' | 'education'
export type Dock = { rect: StageRect; arrive: number; leave: number }
export type ContentDocks = Record<ContentStage, Dock>
export type ContentRoute = { from: ContentStage; to: ContentStage; mix: number; amount: number; viewport: StageRect; flight?: number }
const ease = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10)

/** Keep the outgoing object intact during the push-in, then exchange subjects
 * at the middle of the travelling shot, before docking the incoming model. */
export function contentTransitionMix(mix: number) {
  const t = clamp((mix - 0.28) / 0.44)
  return t * t * (3 - 2 * t)
}

export function dockVisibility(rect: StageRect, header: number) {
  return 1 - ease(clamp((header - rect.top) / Math.max(1, rect.height * 0.2)))
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
      let w = blend(a.width, b.width, mix), h = blend(a.height, b.height, mix)
      const flight = width ? Math.sin(t * Math.PI) ** 2 : 0
      const available = Math.max(1, height - header - 32)
      // A real expansion of the render window makes the zoom visible even
      // when the safety camera must retreat to keep the complete model in shot.
      if (width) {
        w = blend(w, Math.min(width - 24, Math.max(w, width < 650 ? width - 24 : width * 0.9)), flight)
        h = blend(h, Math.min(available, Math.max(h, available * 0.94)), flight)
      }
      const rawTop = blend(a.top, b.top, mix)
      // Keep the middle of a long handoff in frame, without altering the
      // position or velocity where it meets either real DOM destination.
      const safeTop = clamp(rawTop, header + 16, Math.max(header + 16, height - h - 16))
      const top = blend(rawTop, safeTop, Math.sin(t * Math.PI) ** 2)
      const left = blend(blend(a.left, b.left, mix), width ? (width - w) / 2 : 0, flight)
      return { from, to, mix, flight, amount: i === 0 ? contentTransitionMix(mix) : 1, viewport: { left, top, width: w, height: h } }
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
  const push = Math.sin(q * Math.PI) ** 2
  if (index === subjects[route.from]) {
    const outgoing = base(route.from)
    return { ...outgoing, weight: 1 - cut, x: outgoing.x - q * 0.16 * travel, y: q * 0.04, z: push * 0.45, ry: outgoing.ry + q * 0.2, scale: outgoing.scale * (1 + push * 0.16) }
  }
  return { ...pose, weight: index === subjects[stage] ? cut : 0, x: pose.x + (1 - q) * 0.16 * travel, y: -(1 - q) * 0.04, z: push * 0.45, ry: pose.ry - (1 - q) * 0.2, scale: pose.scale * (1 + push * 0.16) }
}

export function contentCamera(route: ContentRoute, compact: boolean) {
  const arc = route.from === route.to ? 0 : Math.sin(route.mix * Math.PI) ** 2
  const side = (stage: ContentStage) => stage === 'skills' ? -0.18 : 0.24
  // Push through the match cut rather than pulling away from it. The render
  // window expands with the shot, and full-bounds fitting remains the final guard.
  return { x: (blend(side(route.from), side(route.to), route.mix) + arc * 0.42) * (compact ? 0.4 : 1), y: 0.18 + arc * 0.12, z: 6.35 - arc * 0.85, lookX: 0, lookY: 0, fov: 34 - arc * 1.5 }
}
