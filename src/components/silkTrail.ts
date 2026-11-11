type Point = { x: number; y: number }
export type TrailSample = Point & { time: number }
type TrailPoint = Point & { distance: number }

const maxLength = 92
const lifetime = 154
export const trailRadius = maxLength + 8

export function traceTrail(samples: TrailSample[], head: TrailSample) {
  const cutoff = head.time - lifetime
  samples.push(head)
  while (samples.length > 2 && samples[1].time <= cutoff) samples.shift()

  const points: TrailPoint[] = [{ x: 0, y: 0, distance: 0 }]
  let length = 0
  for (let i = samples.length - 2; i >= 0 && length < maxLength; i--) {
    const from = samples[i + 1]
    const to = samples[i]
    const dx = to.x - from.x
    const dy = to.y - from.y
    const segment = Math.hypot(dx, dy)
    if (segment === 0) continue

    // Interpolate the final point so the tail retracts between samples.
    const fraction = Math.min(1, (maxLength - length) / segment, (from.time - cutoff) / (from.time - to.time))
    length += segment * fraction
    points.push({ x: from.x - head.x + dx * fraction, y: from.y - head.y + dy * fraction, distance: length })
  }

  return { points, length }
}

const coordinates = ({ x, y }: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`

function curveThrough(points: Point[], start: 'M' | 'L' = 'M') {
  let path = `${start}${coordinates(points[0])}`
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]
    const next = points[i + 1]
    const middle = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
    path += `Q${coordinates(point)} ${coordinates(middle)}`
  }
  return `${path}L${coordinates(points[points.length - 1])}`
}

export function ribbonPaths(points: TrailPoint[], length: number) {
  const left: Point[] = []
  const right: Point[] = []
  const width = Math.min(1, length / 28)
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const before = points[i - 1] ?? point
    const after = points[i + 1] ?? point
    const dx = after.x - before.x
    const dy = after.y - before.y
    const tangent = Math.hypot(dx, dy) || 1
    const progress = point.distance / length
    const halfWidth = width * (1 - progress) * (1.35 + 5.2 * progress)
    const offsetX = -dy * halfWidth / tangent
    const offsetY = dx * halfWidth / tangent
    left.push({ x: point.x + offsetX, y: point.y + offsetY })
    right.push({ x: point.x - offsetX, y: point.y - offsetY })
  }
  return {
    ribbon: `${curveThrough(left)}${curveThrough(right.reverse(), 'L')}Z`,
    glint: curveThrough(points),
  }
}
