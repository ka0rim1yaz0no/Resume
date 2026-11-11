import { clamp } from './choreography'
import { openingContacts } from './sculptureAssembly'

const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

const lastContact = openingContacts[openingContacts.length - 1]

export function openingWave(opening: number) {
  const time = 1 - opening
  const rise = smooth(0.015, 0.23, time)
  const fade = 1 - smooth(lastContact + 0.015, 1, time)
  const contact = smooth(lastContact - 0.1, lastContact, time) * (1 - smooth(lastContact, lastContact + 0.13, time))
  return rise * fade * (0.84 + contact * 0.16)
}

export function openingDust(opening: number) {
  const time = 1 - opening
  return smooth(0.06, 0.28, time) * (1 - smooth(lastContact + 0.01, 0.91, time)) * 0.74
}

export const transferEnergy = (progress: number) => progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) ** 2 : 0

// The light sheets and the dust follow the same curve in viewport coordinates.
export const ribbonHeight = /* glsl */ `
  float ribbonHeight(float x, float phase, float band) {
    return 0.43 + (x - 0.5) * 0.37 + (band - 1.0) * 0.078
      + sin(x * 6.2 - phase + band * 1.72) * 0.17
      + sin(x * 11.8 + phase * 0.57 + band * 1.28) * 0.067;
  }
`
