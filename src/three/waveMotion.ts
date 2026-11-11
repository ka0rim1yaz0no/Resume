import { blend, clamp, type StageRect } from './choreography'
import { openingContacts, openingDockStart } from './sculptureAssembly'

const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

const lastContact = openingContacts[openingContacts.length - 1]
const openingLandingGlow = 0.56
export const silkRest = 0.29

export function openingWave(opening: number) {
  const time = 1 - clamp(opening)
  const rise = smooth(0.008, 0.205, time)
  const contact = smooth(lastContact - 0.1, lastContact, time) * (1 - smooth(lastContact, lastContact + 0.13, time))
  return blend(0.11 + rise * (0.98 + contact * 0.16), openingLandingGlow, smooth(openingDockStart, 1, time))
}

export function openingSilkHandoff(opening: number) {
  return smooth(openingDockStart, 0.935, 1 - opening)
}

export function landingWave(energy: number, seconds: number) {
  return blend(clamp(energy, silkRest, openingLandingGlow), silkRest, smooth(0.48, 2.2, seconds))
}

export function heroScrollWave(glow: number, departure: number, progress: number) {
  const leaving = blend(glow, openingLandingGlow, departure)
  const traveling = blend(leaving, 0.64, smooth(0, 0.42, progress))
  return blend(traveling, silkRest, smooth(0.6, 1, progress))
}

export function openingDust(opening: number) {
  const time = 1 - opening
  return smooth(0.06, 0.28, time) * (1 - smooth(lastContact + 0.01, 0.88, time)) * 0.47
}

export const transferEnergy = (progress: number) => progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) ** 2 : 0

// A single clock survives the opening, landing and section cuts. Large scroll
// jumps add only a small gust, so anchor navigation cannot jerk the folds.
export function advanceSilkPhase(phase: number, delta: number, scrollTravel: number) {
  const step = clamp(delta, 0, 0.05)
  return phase + step * 0.92 + clamp(scrollTravel * 0.0027, -step * 1.35, step * 1.55)
}

export function silkCrossfade(mix: number) {
  const arrive = smooth(0.17, 0.83, mix)
  const level = silkRest + transferEnergy(mix) * 0.46
  return [level * (1 - arrive), silkRest * arrive + 0.65 * silkArrival(mix)] as const
}

export function silkArrival(progress: number) {
  return smooth(0.48, 0.7, progress) * (1 - smooth(0.86, 1, progress))
}

export function silkVisibility(rect: StageRect, header: number, height: number) {
  const available = Math.min(rect.height, height - header)
  if (rect.width <= 0 || available <= 0) return 0
  const visible = Math.min(height, rect.top + rect.height) - Math.max(header, rect.top)
  return smooth(0.12, 0.84, visible / available)
}

// The silk and the dust use the same moving crest in viewer coordinates.
export const silkHeight = /* glsl */ `
  float silkHeight(float x, float phase, float band, float aspect) {
    float span = mix(0.59, 1.0, smoothstep(0.38, 1.36, aspect));
    float flow = sin(x * 6.1 - phase + band * 1.22);
    float swell = sin(x * 3.75 + phase * 0.45 - band * 1.54);
    float ripple = sin(x * 11.0 - phase * 1.21 + band * 0.92);
    return 0.45 + (band - 1.0) * 0.104
      + span * ((x - 0.5) * 0.34 + flow * 0.18 + swell * 0.091 + ripple * 0.035);
  }
`
