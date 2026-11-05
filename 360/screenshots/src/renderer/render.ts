import { arrowHead, clampRect, pixelate } from '../shared/geometry'
import type { Shape } from '../shared/types'

/**
 * Paint one annotation onto the composed canvas. Called in list order, so a
 * pixelate region also hides the annotations drawn before it — the export is
 * exactly what the user sees.
 */
export function drawShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  ctx.save()
  ctx.strokeStyle = s.color
  ctx.fillStyle = s.color
  ctx.lineWidth = s.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (s.tool) {
    case 'arrow': {
      const head = Math.max(12, s.width * 4)
      const [l, r] = arrowHead(s.from, s.to, head)
      ctx.beginPath()
      ctx.moveTo(s.from.x, s.from.y)
      // stop the shaft at the head's base so a thick line does not poke through the tip
      ctx.lineTo((l.x + r.x) / 2, (l.y + r.y) / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s.to.x, s.to.y)
      ctx.lineTo(l.x, l.y)
      ctx.lineTo(r.x, r.y)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'line':
      ctx.beginPath()
      ctx.moveTo(s.from.x, s.from.y)
      ctx.lineTo(s.to.x, s.to.y)
      ctx.stroke()
      break
    case 'rect':
      ctx.strokeRect(s.rect.x, s.rect.y, s.rect.width, s.rect.height)
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(
        s.rect.x + s.rect.width / 2,
        s.rect.y + s.rect.height / 2,
        s.rect.width / 2,
        s.rect.height / 2,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      break
    case 'pen':
    case 'marker':
      if (s.tool === 'marker') {
        ctx.globalAlpha = 0.4
        ctx.lineWidth = s.width * 4
        ctx.lineCap = 'square'
      }
      ctx.beginPath()
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      // a single click still leaves a dot
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.01, s.points[0].y)
      ctx.stroke()
      break
    case 'text': {
      ctx.font = `600 ${s.size}px -apple-system, "Segoe UI", Roboto, sans-serif`
      ctx.textBaseline = 'top'
      // a contrasting outline keeps the text readable on any background
      ctx.lineWidth = Math.max(2, s.size / 8)
      ctx.strokeStyle = isLight(s.color) ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)'
      ctx.strokeText(s.text, s.at.x, s.at.y)
      ctx.fillText(s.text, s.at.x, s.at.y)
      break
    }
    case 'step': {
      const r = 10 + s.width * 2
      ctx.beginPath()
      ctx.arc(s.at.x, s.at.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      ctx.fillStyle = isLight(s.color) ? '#1a1a1a' : '#ffffff'
      ctx.font = `700 ${Math.round(r * 1.1)}px -apple-system, "Segoe UI", Roboto, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(s.n), s.at.x, s.at.y + 1)
      break
    }
    case 'blur': {
      const r = clampRect(s.rect, ctx.canvas.width, ctx.canvas.height)
      if (r) {
        const img = ctx.getImageData(r.x, r.y, r.width, r.height)
        pixelate(img.data, r.width, { x: 0, y: 0, width: r.width, height: r.height }, blockSize(r))
        ctx.putImageData(img, r.x, r.y)
      }
      break
    }
  }
  ctx.restore()
}

/** pixel block grows with the region, so a large redaction is as unreadable as a small one */
function blockSize(r: { width: number; height: number }): number {
  return Math.max(12, Math.round(Math.min(r.width, r.height) / 4))
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return lum > 186
}

/** Base image + every shape, at the image's native resolution. */
export function compose(base: HTMLImageElement, shapes: readonly Shape[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = base.naturalWidth
  canvas.height = base.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(base, 0, 0)
  for (const s of shapes) drawShape(ctx, s)
  return canvas
}

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('PNG encode failed')
  return new Uint8Array(await blob.arrayBuffer())
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

export function pngUrl(png: Uint8Array): string {
  return URL.createObjectURL(new Blob([png as BlobPart], { type: 'image/png' }))
}
