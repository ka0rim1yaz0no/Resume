import { blend, cinematicCamera, clamp, journeyPose, type StageRect } from './choreography'

export type ContentStage = 'film' | 'project' | 'experience' | 'skills' | 'education'
export type Dock = { rect: StageRect; arrive: number; leave: number }
export type ContentDocks = Record<ContentStage, Dock>
export type ContentRoute = { from: ContentStage; to: ContentStage; mix: number; amount: number; viewport: StageRect }
const ease = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10)
const between = (start: number, end: number, value: number) => ease(clamp((value - start) / (end - start)))
const stages: ContentStage[] = ['film', 'project', 'experience', 'skills']

/** Exchange subjects through a gentle dust dissolve during the lateral handoff. */
export function contentTransitionMix(mix: number) {
  const t = clamp((mix - 0.16) / 0.68)
  return t * t * (3 - 2 * t)
}

export function contentDust(mix: number) {
  const cut = contentTransitionMix(mix)
  const exchange = cut > 0 && cut < 1 ? Math.sin(cut * Math.PI) ** 2 : 0
  const release = between(0, 0.13, mix) * (1 - between(0.17, 0.43, mix))
  const settle = between(0.52, 0.88, mix) * (1 - between(0.95, 1, mix))
  return {
    cut,
    flux: exchange + (1 - exchange) * (release * 0.34 + settle * 0.48),
    dissolve: exchange * 0.24 + (1 - exchange) * settle * 0.03,
  }
}

export function contentLock(route: ContentRoute, stage: ContentStage) {
  if (route.from === route.to) return route.to === stage ? 1 : 0
  return route.from === stage || route.to === stage ? dockProgress(route.mix, route.from === stage) : 0
}

export const dockProgress = (mix: number, leaving: boolean) => leaving ? 1 - between(0.02, 0.35, mix) : between(0.66, 0.985, mix)
export const dockWeight = (mix: number, leaving: boolean) => leaving ? 1 - between(0.1, 0.48, mix) : between(0.52, 0.81, mix)
export const dockSlide = (mix: number, leaving: boolean) => leaving ? -between(0.025, 0.5, mix) : 1 - between(0.5, 0.99, mix)

export function contentWeight(from: ContentStage, to: ContentStage, mix: number, stage: ContentStage) {
  if (from === to) return to === stage ? 1 : 0
  return from === stage || to === stage ? dockWeight(mix, from === stage) : 0
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

/** Fade out at the cut between native viewports, so the dust never covers
 * the reading area between sections. */
export function contentVisibility(route: ContentRoute, header: number) {
  if (route.from === route.to) return route.from === 'skills' || route.from === 'education' ? dockVisibility(route.viewport, header) : 1
  return between(0, 0.12, Math.abs(route.mix - 0.5))
}

/** A reversible rail connects the work sections and ends at skills.
 * Education uses its own native window, keeping About free of carried models. */
export function contentRoute(scroll: number, docks: ContentDocks, header: number, height: number): ContentRoute {
  if (scroll <= docks.film.leave) return { from: 'film', to: 'film', mix: 0, amount: 0, viewport: docks.film.rect }
  // The carried story ends at Technical capabilities. Follow the native skills
  // window out of view, then render education only in its own native window.
  // Never interpolate a floating viewport across the About reading column.
  if (scroll > docks.skills.leave) {
    const skillsOnScreen = docks.skills.rect.top + docks.skills.rect.height > header
    const stage = skillsOnScreen && scroll < docks.education.arrive ? 'skills' : 'education'
    return { from: stage, to: stage, mix: 0, amount: 1, viewport: docks[stage].rect }
  }
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i], to = stages[i + 1]
    const start = docks[from].leave
    const minimum = Math.max(1, Math.min(height * 0.24, 220, docks[to].leave - start))
    const end = Math.max(start + minimum, docks[to].arrive)
    if (scroll < end) {
      // Long sections add a quiet interval between release and arrival. Both
      // moves use the same reversible score and the real viewer dimensions.
      const span = Math.min((end - start) / 2, height * 0.27, 236)
      const release = between(start, start + span, scroll)
      const arrive = between(end - span, end, scroll)
      const mix = (release + arrive) / 2
      return { from, to, mix, amount: 1, viewport: docks[mix < 0.5 ? from : to].rect }
    }
    if (scroll <= docks[to].leave) return { from: to, to, mix: 0, amount: 1, viewport: docks[to].rect }
  }
  return { from: 'education', to: 'education', mix: 0, amount: 1, viewport: docks.education.rect }
}

const subjects = { film: 2, project: 1, experience: 4, skills: 3, education: 5 }
export function contentPose(route: ContentRoute, index: number, compact: boolean, filmProgress = 1) {
  const leaving = route.from !== route.to && index === subjects[route.from]
  const stage = leaving ? route.from : route.to
  const film = stage === 'film' ? journeyPose(filmProgress, subjects.film, compact) : null
  const pose = film ? { ...film, scale: film.scale * (compact ? 0.8 : 1) } : {
    x: 0, y: 0, z: 0, rx: stage === 'skills' ? 0.04 : 0.015,
    ry: stage === 'project' ? 0.14 : stage === 'skills' ? 0.1 : 0.12,
    rz: stage === 'skills' ? -0.04 : 0,
    scale: stage === 'skills' ? 0.90 : stage === 'experience' ? 1.22 : stage === 'education' ? 1.7 : compact ? 1.10 : 0.99,
  }
  if (route.from === route.to) return { ...pose, weight: index === subjects[stage] ? 1 : 0 }
  const travel = compact ? 0.52 : 1
  const direction = route.to === 'experience' ? -1 : 1
  const wideSubject = stage === 'project' || stage === 'skills'
  const offset = dockSlide(route.mix, leaving)
  return {
    ...pose,
    weight: index === subjects[stage] ? contentWeight(route.from, route.to, route.mix, stage) : 0,
    x: pose.x + direction * offset * (wideSubject ? 0.4 : 0.58) * travel,
    y: pose.y - offset * (wideSubject ? 0.06 : 0.12) * travel,
    ry: pose.ry - direction * offset * (wideSubject ? 0.13 : 0.28),
    rz: pose.rz + direction * offset * (wideSubject ? 0.025 : 0.05) * travel,
  }
}

export function contentCamera(route: ContentRoute, compact: boolean, filmProgress = 1) {
  const dock = (stage: ContentStage) => stage === 'film' ? cinematicCamera(filmProgress, compact) : {
    x: (stage === 'skills' ? -0.18 : stage === 'experience' ? 0.05 : 0.24) * (compact ? 0.4 : 1), y: 0.18, lookX: 0, lookY: 0,
  }
  const a = dock(route.from), b = dock(route.to)
  const angle = between(0.36, 0.64, route.mix)
  return { x: blend(a.x, b.x, angle), y: blend(a.y, b.y, angle), z: 6.9,
    lookX: blend(a.lookX, b.lookX, angle), lookY: blend(a.lookY, b.lookY, angle), fov: 35 }
}
