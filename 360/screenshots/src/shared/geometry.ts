import type { Point, Rect } from './types'

/** Rect spanned by two drag corners, in any drag direction. */
export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

/** Integer rect clamped inside a w×h image; null when nothing of it remains. */
export function clampRect(r: Rect, w: number, h: number): Rect | null {
  const x0 = Math.max(0, Math.floor(r.x))
  const y0 = Math.max(0, Math.floor(r.y))
  const x1 = Math.min(w, Math.ceil(r.x + r.width))
  const y1 = Math.min(h, Math.ceil(r.y + r.height))
  if (x1 - x0 < 1 || y1 - y0 < 1) return null
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

/** The two barb ends of an arrowhead at `to`, pointing away from `from`. */
export function arrowHead(from: Point, to: Point, size: number): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const spread = Math.PI / 7
  return [
    { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) },
    { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) },
  ]
}

/**
 * Pixelate a region of RGBA pixels in place (blocks of `block`×`block` take
 * their average color) — irreversible, unlike a gaussian blur, so redacted
 * text cannot be recovered from the exported image.
 */
export function pixelate(
  data: Uint8ClampedArray,
  width: number,
  r: Rect,
  block: number,
): void {
  for (let by = r.y; by < r.y + r.height; by += block) {
    for (let bx = r.x; bx < r.x + r.width; bx += block) {
      const yEnd = Math.min(by + block, r.y + r.height)
      const xEnd = Math.min(bx + block, r.x + r.width)
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      let n = 0
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = (y * width + x) * 4
          red += data[i]
          green += data[i + 1]
          blue += data[i + 2]
          alpha += data[i + 3]
          n++
        }
      }
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = (y * width + x) * 4
          data[i] = red / n
          data[i + 1] = green / n
          data[i + 2] = blue / n
          data[i + 3] = alpha / n
        }
      }
    }
  }
}
