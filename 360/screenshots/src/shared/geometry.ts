import type { Point, Rect, Shape } from './types'

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
 * 7 polygon vertices of a tapered arrow ("đầu to đuôi nhỏ").
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

/** Shortest distance from a point to a finite line segment ab. */
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.hypot(p.x - projX, p.y - projY)
}

/** Ray-casting test: whether p lies inside a simple polygon. */
export function pointInPolygon(p: Point, vs: Point[]): boolean {
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x
    const yi = vs[i].y
    const xj = vs[j].x
    const yj = vs[j].y
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
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

/* ─────────────────────────────────────────────────────────────
   Interactive Shape Selection, Handle Manipulation & Hit Testing
   ───────────────────────────────────────────────────────────── */

export type ShapeHandleId =
  | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  | 'from' | 'mid' | 'to'
  | 'body'

export interface ShapeHandleInfo {
  id: ShapeHandleId
  point: Point
  cursor: string
}

/** Outer bounding box of any shape in canvas pixels. */
export function shapeBoundingBox(s: Shape): Rect {
  switch (s.tool) {
    case 'arrow':
    case 'line':
      return normalizeRect(s.from, s.to)
    case 'rect':
    case 'ellipse':
    case 'blur':
    case 'image':
      return s.rect
    case 'text':
      return {
        x: s.at.x,
        y: s.at.y,
        width: Math.max(40, s.text.length * s.size * 0.62),
        height: s.size * 1.3,
      }
    case 'step': {
      const r = 10 + s.width * 2
      return { x: s.at.x - r, y: s.at.y - r, width: r * 2, height: r * 2 }
    }
    case 'pen':
    case 'marker': {
      if (s.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
      let minX = s.points[0].x
      let maxX = s.points[0].x
      let minY = s.points[0].y
      let maxY = s.points[0].y
      for (const p of s.points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
      return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
    }
  }
}

/** Handles for interactive reshaping (3 points for arrow/line; 8 points for boxes). */
export function shapeHandles(s: Shape): ShapeHandleInfo[] {
  if (s.tool === 'arrow' || s.tool === 'line') {
    const mid = {
      x: (s.from.x + s.to.x) / 2,
      y: (s.from.y + s.to.y) / 2,
    }
    return [
      { id: 'from', point: s.from, cursor: 'crosshair' },
      { id: 'mid', point: mid, cursor: 'move' },
      { id: 'to', point: s.to, cursor: 'crosshair' },
    ]
  }
  const bb = shapeBoundingBox(s)
  const x0 = bb.x
  const y0 = bb.y
  const x1 = bb.x + bb.width
  const y1 = bb.y + bb.height
  const xm = bb.x + bb.width / 2
  const ym = bb.y + bb.height / 2
  return [
    { id: 'nw', point: { x: x0, y: y0 }, cursor: 'nwse-resize' },
    { id: 'n', point: { x: xm, y: y0 }, cursor: 'ns-resize' },
    { id: 'ne', point: { x: x1, y: y0 }, cursor: 'nesw-resize' },
    { id: 'e', point: { x: x1, y: ym }, cursor: 'ew-resize' },
    { id: 'se', point: { x: x1, y: y1 }, cursor: 'nwse-resize' },
    { id: 's', point: { x: xm, y: y1 }, cursor: 'ns-resize' },
    { id: 'sw', point: { x: x0, y: y1 }, cursor: 'nesw-resize' },
    { id: 'w', point: { x: x0, y: ym }, cursor: 'ew-resize' },
  ]
}

/** Check if point p grabs one of the shape's handles within tol. */
export function hitTestShapeHandle(s: Shape, p: Point, tol: number): ShapeHandleId | null {
  const handles = shapeHandles(s)
  for (const h of handles) {
    if (Math.hypot(p.x - h.point.x, p.y - h.point.y) <= tol) {
      return h.id
    }
  }
  return null
}

/**
 * Check if point p hits the shape.
 * When `hollowBorderOnly` is true, hollow shapes (rect, ellipse) only hit on their stroke border,
 * allowing users to draw or select smaller objects inside a surrounding frame.
 */
export function hitTestShape(s: Shape, p: Point, tol: number, hollowBorderOnly = false): boolean {
  switch (s.tool) {
    case 'arrow': {
      const strokeTol = Math.max(tol, (s.width ?? 2) * 3, 12)
      if (pointToSegmentDistance(p, s.from, s.to) <= strokeTol) return true
      const poly = taperedArrowPolygon(s.from, s.to, s.width ?? 2)
      return pointInPolygon(p, poly)
    }
    case 'line':
      return pointToSegmentDistance(p, s.from, s.to) <= Math.max(tol, (s.width ?? 2) * 2.5, 12)
    case 'rect': {
      const r = s.rect
      const bt = Math.max(tol, (s.width ?? 2) + 4)
      const inOuter = p.x >= r.x - bt && p.x <= r.x + r.width + bt && p.y >= r.y - bt && p.y <= r.y + r.height + bt
      if (!inOuter) return false
      if (!hollowBorderOnly) return true
      const inInner = p.x > r.x + bt && p.x < r.x + r.width - bt && p.y > r.y + bt && p.y < r.y + r.height - bt
      return !inInner
    }
    case 'ellipse': {
      const r = s.rect
      const cx = r.x + r.width / 2
      const cy = r.y + r.height / 2
      const bt = Math.max(tol, (s.width ?? 2) + 4)
      const rxOut = Math.max(1, r.width / 2 + bt)
      const ryOut = Math.max(1, r.height / 2 + bt)
      const dOut = ((p.x - cx) / rxOut) ** 2 + ((p.y - cy) / ryOut) ** 2
      if (dOut > 1.05) return false
      if (!hollowBorderOnly) return true
      const rxIn = r.width / 2 - bt
      const ryIn = r.height / 2 - bt
      if (rxIn <= 1 || ryIn <= 1) return true
      const dIn = ((p.x - cx) / rxIn) ** 2 + ((p.y - cy) / ryIn) ** 2
      return dIn >= 0.95
    }
    case 'blur':
    case 'image': {
      const r = s.rect
      return p.x >= r.x - tol && p.x <= r.x + r.width + tol && p.y >= r.y - tol && p.y <= r.y + r.height + tol
    }
    case 'text': {
      const bb = shapeBoundingBox(s)
      return p.x >= bb.x - tol && p.x <= bb.x + bb.width + tol && p.y >= bb.y - tol && p.y <= bb.y + bb.height + tol
    }
    case 'step': {
      const radius = 10 + (s.width ?? 2) * 2
      return Math.hypot(p.x - s.at.x, p.y - s.at.y) <= radius + tol
    }
    case 'pen':
    case 'marker': {
      const w = Math.max(tol, (s.tool === 'marker' ? s.width * 4 : s.width) + tol)
      for (let i = 0; i < s.points.length - 1; i++) {
        if (pointToSegmentDistance(p, s.points[i], s.points[i + 1]) <= w) return true
      }
      if (s.points.length === 1 && Math.hypot(p.x - s.points[0].x, p.y - s.points[0].y) <= w) return true
      return false
    }
  }
}

/** Translate a shape by (dx, dy). */
export function moveShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.tool) {
    case 'arrow':
    case 'line':
      return {
        ...s,
        from: { x: s.from.x + dx, y: s.from.y + dy },
        to: { x: s.to.x + dx, y: s.to.y + dy },
      }
    case 'rect':
    case 'ellipse':
    case 'blur':
    case 'image':
      return {
        ...s,
        rect: { ...s.rect, x: s.rect.x + dx, y: s.rect.y + dy },
      }
    case 'text':
    case 'step':
      return {
        ...s,
        at: { x: s.at.x + dx, y: s.at.y + dy },
      }
    case 'pen':
    case 'marker':
      return {
        ...s,
        points: s.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
      }
  }
}

/** Resize or reshape a shape by moving a specific handle to point p. */
export function resizeShapeHandle(s: Shape, handle: ShapeHandleId, p: Point): Shape {
  if (s.tool === 'arrow' || s.tool === 'line') {
    if (handle === 'to') return { ...s, to: p }
    if (handle === 'from') return { ...s, from: p }
    if (handle === 'mid') {
      const currentMid = { x: (s.from.x + s.to.x) / 2, y: (s.from.y + s.to.y) / 2 }
      const dx = p.x - currentMid.x
      const dy = p.y - currentMid.y
      return {
        ...s,
        from: { x: s.from.x + dx, y: s.from.y + dy },
        to: { x: s.to.x + dx, y: s.to.y + dy },
      }
    }
    return s
  }
  if (s.tool === 'rect' || s.tool === 'ellipse' || s.tool === 'blur' || s.tool === 'image') {
    const r = s.rect
    let x0 = r.x
    let y0 = r.y
    let x1 = r.x + r.width
    let y1 = r.y + r.height
    if (handle.includes('w')) x0 = p.x
    if (handle.includes('e')) x1 = p.x
    if (handle.includes('n')) y0 = p.y
    if (handle.includes('s')) y1 = p.y
    return { ...s, rect: normalizeRect({ x: x0, y: y0 }, { x: x1, y: y1 }) }
  }
  if (s.tool === 'text') {
    const bb = shapeBoundingBox(s)
    let y0 = bb.y
    let y1 = bb.y + bb.height
    if (handle.includes('n')) y0 = p.y
    if (handle.includes('s')) y1 = p.y
    const newHeight = Math.abs(y1 - y0)
    const newSize = Math.max(10, Math.min(72, Math.round(newHeight / 1.3)))
    const x0 = handle.includes('w') ? p.x : s.at.x
    const newY = handle.includes('n') ? p.y : s.at.y
    return { ...s, at: { x: x0, y: newY }, size: newSize }
  }
  if (s.tool === 'step') {
    const dist = Math.hypot(p.x - s.at.x, p.y - s.at.y)
    const newWidth = Math.max(2, Math.min(16, Math.round((dist - 10) / 2)))
    return { ...s, width: newWidth }
  }
  return s
}

