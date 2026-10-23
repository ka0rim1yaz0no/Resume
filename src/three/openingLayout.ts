import { blend, type StageRect } from './choreography'

// The poster, orbit, and WebGL viewport share this exact frame. Its aspect
// matches the locally rendered poster, so loading cannot change its scale.
export function openingFrame(width: number, height: number, header: number): StageRect {
  if (width <= 650) {
    const top = header + 40
    const textTop = height * 0.84 - 102
    const available = Math.max(100, textTop - top - 30)
    const w = Math.min(width - 40, available * 960 / 760)
    const h = w * 760 / 960
    return { left: (width - w) / 2, top: top + Math.max(0, available - h) / 2, width: w, height: h }
  }
  const available = Math.max(180, height - header - 120)
  const w = Math.min(width * 0.49, Math.min(height * 0.62, available, 620) * 960 / 760)
  const h = w * 760 / 960
  return { left: width * 0.68 - w / 2, top: header + (available - h) / 2, width: w, height: h }
}

export function openingViewport(hero: StageRect, frame: StageRect, progress: number): StageRect {
  return { left: blend(hero.left, frame.left, progress), top: blend(hero.top, frame.top, progress), width: blend(hero.width, frame.width, progress), height: blend(hero.height, frame.height, progress) }
}
