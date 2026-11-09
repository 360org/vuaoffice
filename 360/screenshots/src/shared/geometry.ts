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
 * 7 polygon vertices of a Yandex.Disk-style tapered arrow ("đầu to đuôi nhỏ").
 * The shaft expands from `tailWidth` at `from` to `neckWidth` at the neck,
 * where `headWidth` barbs flare out and converge at `to`.
 */
export function taperedArrowPolygon(from: Point, to: Point, width: number): Point[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return [from, to]

  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux

  const headLen = Math.min(len * 0.55, Math.max(16, width * 4.5))
  const headWidth = Math.max(12, width * 3.8)
  const neckWidth = Math.max(3.5, width * 1.6)
  const tailWidth = Math.max(1.5, width * 0.45)
  const shaftLen = Math.max(0, len - headLen)

  const neckX = from.x + ux * shaftLen
  const neckY = from.y + uy * shaftLen

  // Aerodynamic recessed barb base
  const barbIndent = headLen * 0.15
  const barbX = neckX - ux * barbIndent
  const barbY = neckY - uy * barbIndent

  return [
    { x: to.x, y: to.y }, // 1. tip
    { x: barbX + nx * headWidth, y: barbY + ny * headWidth }, // 2. right barb
    { x: neckX + nx * (neckWidth / 2), y: neckY + ny * (neckWidth / 2) }, // 3. right neck
    { x: from.x + nx * (tailWidth / 2), y: from.y + ny * (tailWidth / 2) }, // 4. right tail
    { x: from.x - nx * (tailWidth / 2), y: from.y - ny * (tailWidth / 2) }, // 5. left tail
    { x: neckX - nx * (neckWidth / 2), y: neckY - ny * (neckWidth / 2) }, // 6. left neck
    { x: barbX - nx * headWidth, y: barbY - ny * headWidth }, // 7. left barb
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

/** What a pointer grabs on the crop frame: a corner, an edge, or the inside (move). */
export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

/** Handle under `p`, within `tol` image pixels of a corner/edge; null outside the frame. */
export function cropHitTest(r: Rect, p: Point, tol: number): CropHandle | null {
  const x1 = r.x + r.width
  const y1 = r.y + r.height
  const inX = p.x >= r.x - tol && p.x <= x1 + tol
  const inY = p.y >= r.y - tol && p.y <= y1 + tol
  if (!inX || !inY) return null
  const w = Math.abs(p.x - r.x) <= tol
  const e = Math.abs(p.x - x1) <= tol
  const n = Math.abs(p.y - r.y) <= tol
  const s = Math.abs(p.y - y1) <= tol
  if (n && w) return 'nw'
  if (n && e) return 'ne'
  if (s && w) return 'sw'
  if (s && e) return 'se'
  if (n) return 'n'
  if (s) return 's'
  if (w) return 'w'
  if (e) return 'e'
  return 'move'
}

/** `start` dragged by (dx, dy) through `handle`, kept inside a w×h image. */
export function dragCrop(start: Rect, handle: CropHandle, dx: number, dy: number, w: number, h: number): Rect {
  if (handle === 'move') {
    return {
      x: Math.min(Math.max(0, start.x + dx), w - start.width),
      y: Math.min(Math.max(0, start.y + dy), h - start.height),
      width: start.width,
      height: start.height,
    }
  }
  let x0 = start.x
  let y0 = start.y
  let x1 = start.x + start.width
  let y1 = start.y + start.height
  if (handle.includes('w')) x0 += dx
  if (handle.includes('e')) x1 += dx
  if (handle.includes('n')) y0 += dy
  if (handle.includes('s')) y1 += dy
  const clampX = (v: number) => Math.min(Math.max(0, v), w)
  const clampY = (v: number) => Math.min(Math.max(0, v), h)
  return normalizeRect({ x: clampX(x0), y: clampY(y0) }, { x: clampX(x1), y: clampY(y1) })
}

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const

/** Next zoom step above (dir 1) or below (dir -1) `current`, clamped to the step range. */
export function stepZoom(current: number, dir: 1 | -1): number {
  if (dir === 1) return ZOOM_STEPS.find((z) => z > current + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01) ?? ZOOM_STEPS[0]
}
