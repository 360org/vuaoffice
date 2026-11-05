import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CAPTURE_ACCELERATORS } from '../shared/capture-args'
import type { CaptureOutcome, ScreenshotsApi } from '../shared/channels'
import { normalizeRect } from '../shared/geometry'
import { commit, createHistory, redo, undo, type History } from '../shared/history'
import { fill, screenshotsStrings } from '../shared/i18n'
import {
  DEFAULT_COLOR,
  DEFAULT_STROKE,
  PALETTE,
  STROKES,
  type CaptureMode,
  type Point,
  type Rect,
  type Shape,
  type Tool,
} from '../shared/types'
import { ICONS } from './icons'
import { canvasToPng, compose, drawShape, loadImage, pngUrl } from './render'
import './screenshots.css'

/** what undo/redo walks over: the base image (crop replaces it) plus the shapes on top */
interface Doc {
  src: string | null
  shapes: Shape[]
}

type EditorTool = Tool | 'crop'

const TOOLS: Array<{ id: EditorTool; key: string; label: keyof ReturnType<typeof screenshotsStrings> }> = [
  { id: 'arrow', key: 'a', label: 'toolArrow' },
  { id: 'rect', key: 'r', label: 'toolRect' },
  { id: 'ellipse', key: 'o', label: 'toolEllipse' },
  { id: 'line', key: 'l', label: 'toolLine' },
  { id: 'pen', key: 'p', label: 'toolPen' },
  { id: 'marker', key: 'h', label: 'toolMarker' },
  { id: 'text', key: 't', label: 'toolText' },
  { id: 'step', key: 'n', label: 'toolStep' },
  { id: 'blur', key: 'b', label: 'toolBlur' },
  { id: 'crop', key: 'c', label: 'toolCrop' },
]

const IS_MAC = navigator.platform.toLowerCase().includes('mac')
const MAX_IMAGE_BYTES = 100 * 1024 * 1024

function shortcutLabel(accel: string): string {
  if (!IS_MAC) return accel.replace('CommandOrControl', 'Ctrl')
  return accel
    .replace('CommandOrControl+', '⌘')
    .replace('Alt+', '⌥')
    .replace('Shift+', '⇧')
    .replace(/⌘⌥⇧/, '⌥⇧⌘')
}

export function ScreenshotsEditor({ api, lang }: { api: ScreenshotsApi; lang: string }) {
  const s = useMemo(() => screenshotsStrings(lang), [lang])
  const [history, setHistory] = useState<History<Doc>>(() => createHistory({ src: null, shapes: [] }))
  const doc = history.present
  const [base, setBase] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<EditorTool>('arrow')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [stroke, setStroke] = useState<number>(DEFAULT_STROKE)
  const [draft, setDraftState] = useState<Shape | null>(null)
  /** the in-progress shape, read synchronously on pointerup: a fast drag can
   *  release before React re-renders with the last pointermove */
  const draftRef = useRef<Shape | null>(null)
  const setDraft = (next: Shape | null | ((d: Shape | null) => Shape | null)) => {
    draftRef.current = typeof next === 'function' ? next(draftRef.current) : next
    setDraftState(draftRef.current)
  }
  const [cropRect, setCropRect] = useState<Rect | null>(null)
  const [textAt, setTextAt] = useState<Point | null>(null)
  const [textValue, setTextValue] = useState('')
  const [fit, setFit] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragFrom = useRef<Point | null>(null)
  /** the doc last written to disk or the clipboard — "dirty" means the present differs */
  const savedDoc = useRef<Doc>(history.present)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600)
  }, [])

  // ── base image follows the current doc (undo across a crop restores the old image) ──
  useEffect(() => {
    if (!doc.src) {
      setBase(null)
      return
    }
    let live = true
    loadImage(doc.src).then(
      (img) => live && setBase(img),
      () => live && flash(s.imageUnreadable),
    )
    return () => {
      live = false
    }
  }, [doc.src, flash, s.imageUnreadable])

  // ── repaint whenever the doc, the image or the in-progress shape changes ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !base) return
    if (canvas.width !== base.naturalWidth) canvas.width = base.naturalWidth
    if (canvas.height !== base.naturalHeight) canvas.height = base.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(base, 0, 0)
    for (const shape of doc.shapes) drawShape(ctx, shape)
    if (draft) drawShape(ctx, draft)
  }, [base, doc.shapes, draft])

  // ── dirty flag mirrors to main, which guards tab close and quit ──
  const dirty = doc.shapes.length > 0 && history.present !== savedDoc.current
  useEffect(() => api.setDirty(dirty), [api, dirty])

  const loadPng = useCallback(
    (png: Uint8Array, needsCrop = false) => {
      if (png.byteLength > MAX_IMAGE_BYTES) {
        flash(s.imageTooLarge)
        return
      }
      const next: Doc = { src: pngUrl(png), shapes: [] }
      savedDoc.current = next
      // a new capture (hotkey, paste, open) must not wipe unsaved annotations:
      // it is one more undo step, ⌘Z brings the previous image + shapes back
      setHistory((h) => (h.present.src ? commit(h, next) : createHistory(next)))
      setDraft(null)
      setTextAt(null)
      setCropRect(null)
      setFit(true)
      setTool(needsCrop ? 'crop' : 'arrow')
      if (needsCrop) flash(s.cropHint)
    },
    [flash, s.cropHint, s.imageTooLarge],
  )

  const applyOutcome = useCallback(
    (out: CaptureOutcome | null) => {
      if (!out) return
      setPermissionDenied(out.permission === 'denied')
      if (out.error) flash(fill(s.captureFailed, { error: out.error }))
      if (out.png) loadPng(out.png, out.needsCrop)
    },
    [flash, loadPng, s.captureFailed],
  )

  // ── images captured by the global hotkey while the tab was elsewhere ──
  useEffect(() => {
    const pull = () => void api.takePending().then(applyOutcome)
    pull()
    return api.onImageReady(pull)
  }, [api, applyOutcome])

  const capture = async (mode: CaptureMode) => {
    if (busy) return
    setBusy(true)
    try {
      applyOutcome(await api.capture(mode))
    } finally {
      setBusy(false)
    }
  }

  const openImage = async () => {
    const png = await api.openImage()
    if (png) loadPng(png)
  }

  const apply = (next: Doc) => setHistory((h) => commit(h, next))

  const exportPng = async (): Promise<Uint8Array | null> => {
    if (!base) return null
    commitText()
    return canvasToPng(compose(base, history.present.shapes))
  }

  const copy = async () => {
    const png = await exportPng()
    if (!png) return
    if (await api.copy(png)) {
      savedDoc.current = history.present
      api.setDirty(false)
      flash(s.copied)
    } else flash(s.copyFailed)
  }

  const save = async (): Promise<boolean> => {
    const png = await exportPng()
    if (!png) return false
    const path = await api.save(png)
    if (!path) return false
    savedDoc.current = history.present
    api.setDirty(false)
    flash(fill(s.savedTo, { path }))
    return true
  }

  // close prompt → "Save…": the latest save closure must answer, so re-subscribe each render
  useEffect(() => api.onSaveRequest(save))

  // ── pointer → image coordinates (the canvas may be scaled to fit) ──
  const toImage = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) * e.currentTarget.width) / r.width,
      y: ((e.clientY - r.top) * e.currentTarget.height) / r.height,
    }
  }

  const nextStep = () => doc.shapes.filter((x) => x.tool === 'step').length + 1

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!base || e.button !== 0) return
    const p = toImage(e)
    if (tool === 'text') {
      commitText()
      setTextAt(p)
      setTextValue('')
      return
    }
    if (tool === 'step') {
      apply({ ...doc, shapes: [...doc.shapes, { tool: 'step', color, width: stroke, at: p, n: nextStep() }] })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    dragFrom.current = p
    if (tool === 'crop') setCropRect({ x: p.x, y: p.y, width: 0, height: 0 })
    else if (tool === 'pen' || tool === 'marker') setDraft({ tool, color, width: stroke, points: [p] })
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const from = dragFrom.current
    if (!from) return
    const p = toImage(e)
    if (tool === 'crop') {
      setCropRect(normalizeRect(from, p))
      return
    }
    setDraft((d) => {
      switch (tool) {
        case 'arrow':
        case 'line':
          return { tool, color, width: stroke, from, to: p }
        case 'rect':
        case 'ellipse':
        case 'blur':
          return { tool, color, width: stroke, rect: normalizeRect(from, p) }
        case 'pen':
        case 'marker':
          return d && 'points' in d ? { ...d, points: [...d.points, p] } : d
        default:
          return d
      }
    })
  }

  const onPointerUp = () => {
    if (!dragFrom.current) return
    dragFrom.current = null
    if (tool === 'crop') return
    const done = draftRef.current
    if (done && !isDegenerate(done)) apply({ ...doc, shapes: [...doc.shapes, done] })
    setDraft(null)
  }

  function commitText() {
    if (textAt && textValue.trim()) {
      const size = 14 + stroke * 4
      apply({
        ...history.present,
        shapes: [...history.present.shapes, { tool: 'text', color, width: stroke, at: textAt, text: textValue, size }],
      })
    }
    setTextAt(null)
    setTextValue('')
  }

  const applyCrop = async () => {
    if (!base || !cropRect || cropRect.width < 2 || cropRect.height < 2) return
    const full = compose(base, doc.shapes)
    const out = document.createElement('canvas')
    out.width = Math.round(cropRect.width)
    out.height = Math.round(cropRect.height)
    out.getContext('2d')!.drawImage(full, -Math.round(cropRect.x), -Math.round(cropRect.y))
    // the crop bakes the annotations into the new base, one undo step back restores both
    apply({ src: pngUrl(await canvasToPng(out)), shapes: [] })
    setCropRect(null)
    setTool('arrow')
  }

  const cancelCrop = () => {
    setCropRect(null)
    setTool('arrow')
  }

  // ── keyboard & paste ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const mod = IS_MAC ? e.metaKey : e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') {
        e.preventDefault()
        setHistory((h) => (e.shiftKey ? redo(h) : undo(h)))
      } else if (mod && k === 'y') {
        e.preventDefault()
        setHistory(redo)
      } else if (mod && k === 'c' && base) {
        e.preventDefault()
        void copy()
      } else if (mod && k === 's' && base) {
        e.preventDefault()
        void save()
      } else if (!mod && !e.altKey) {
        if (k === 'enter' && tool === 'crop') void applyCrop()
        else if (k === 'escape') {
          if (tool === 'crop') cancelCrop()
          setDraft(null)
          dragFrom.current = null
        } else {
          const hit = TOOLS.find((t) => t.key === k)
          if (hit) setTool(hit.id)
          const digit = Number(k)
          if (digit >= 1 && digit <= PALETTE.length) setColor(PALETTE[digit - 1])
        }
      }
    }
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      void file.arrayBuffer().then((buf) => loadPng(new Uint8Array(buf)))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  })

  const canvasScale = base && canvasRef.current ? canvasRef.current.getBoundingClientRect().width / base.naturalWidth : 1

  return (
    <div className="ss-root">
      <div className="ss-toolbar" role="toolbar">
        <div className="ss-group">
          <Btn icon="area" label={s.captureArea} onClick={() => void capture('area')} disabled={busy} primary />
          <Btn icon="window" label={s.captureWindow} onClick={() => void capture('window')} disabled={busy} />
          <Btn icon="fullscreen" label={s.captureFullscreen} onClick={() => void capture('fullscreen')} disabled={busy} />
          <Btn icon="open" label={s.openImage} onClick={() => void openImage()} />
        </div>
        <div className="ss-group" aria-label="tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`ss-icon-btn${tool === t.id ? ' active' : ''}`}
              title={`${s[t.label]} (${t.key.toUpperCase()})`}
              aria-label={s[t.label]}
              aria-pressed={tool === t.id}
              disabled={!base}
              onClick={() => {
                commitText()
                setTool(t.id)
              }}
            >
              {ICONS[t.id]}
            </button>
          ))}
        </div>
        <div className="ss-group" aria-label={s.color}>
          {PALETTE.map((c, i) => (
            <button
              key={c}
              className={`ss-swatch${color === c ? ' active' : ''}`}
              style={{ background: c }}
              title={`${s.color} ${i + 1}`}
              aria-label={`${s.color} ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
            />
          ))}
          <span className="ss-sep" />
          {STROKES.map((w) => (
            <button
              key={w}
              className={`ss-icon-btn${stroke === w ? ' active' : ''}`}
              title={`${s.stroke} ${w}px`}
              aria-label={`${s.stroke} ${w}px`}
              aria-pressed={stroke === w}
              onClick={() => setStroke(w)}
            >
              <span className="ss-stroke" style={{ height: w }} />
            </button>
          ))}
        </div>
        <div className="ss-group ss-end">
          <Btn icon="undo" label={s.undo} onClick={() => setHistory(undo)} disabled={history.past.length === 0} iconOnly />
          <Btn icon="redo" label={s.redo} onClick={() => setHistory(redo)} disabled={history.future.length === 0} iconOnly />
          <button className="ss-text-btn" onClick={() => setFit((f) => !f)} disabled={!base}>
            {fit ? s.zoomActual : s.zoomFit}
          </button>
          <Btn icon="copy" label={s.copy} onClick={() => void copy()} disabled={!base} />
          <Btn icon="save" label={s.save} onClick={() => void save()} disabled={!base} primary />
        </div>
      </div>

      {tool === 'crop' && base && (
        <div className="ss-cropbar">
          <span>{s.cropHint}</span>
          <button className="ss-text-btn primary" onClick={() => void applyCrop()} disabled={!cropRect || cropRect.width < 2}>
            {s.applyCrop}
          </button>
          <button className="ss-text-btn" onClick={cancelCrop}>
            {s.cancel}
          </button>
        </div>
      )}

      {permissionDenied && (
        <div className="ss-banner" role="alert">
          <span>{s.permissionHint}</span>
          <button className="ss-text-btn" onClick={() => void api.openPermissionSettings()}>
            {s.permissionOpen}
          </button>
        </div>
      )}

      <div className={`ss-stage${fit ? ' fit' : ''}`}>
        {base ? (
          <div className="ss-canvas-wrap">
            <canvas
              ref={canvasRef}
              className={`ss-canvas tool-${tool}`}
              onPointerDown={onPointerDown}
              // the canvas is not focusable: without this the mousedown that follows
              // pointerdown blurs the text box the same click just opened
              onMouseDown={(e) => e.preventDefault()}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {tool === 'crop' && cropRect && cropRect.width > 0 && (
              <div
                className="ss-crop"
                style={{
                  left: cropRect.x * canvasScale,
                  top: cropRect.y * canvasScale,
                  width: cropRect.width * canvasScale,
                  height: cropRect.height * canvasScale,
                }}
              />
            )}
            {textAt && (
              <input
                className="ss-text-input"
                autoFocus
                value={textValue}
                placeholder={s.textPlaceholder}
                style={{
                  left: textAt.x * canvasScale,
                  top: textAt.y * canvasScale,
                  color,
                  fontSize: Math.max(12, (14 + stroke * 4) * canvasScale),
                }}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText()
                  else if (e.key === 'Escape') {
                    setTextAt(null)
                    setTextValue('')
                  }
                }}
                onBlur={commitText}
              />
            )}
          </div>
        ) : (
          <div className="ss-empty">
            <div className="ss-empty-icon">{ICONS.area}</div>
            <h2>{s.emptyTitle}</h2>
            <p>
              {fill(s.emptyHint, {
                paste: IS_MAC ? '⌘V' : 'Ctrl+V',
                area: shortcutLabel(CAPTURE_ACCELERATORS.area),
              })}
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div className="ss-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function isDegenerate(shape: Shape): boolean {
  if ('rect' in shape) return shape.rect.width < 3 || shape.rect.height < 3
  if ('from' in shape) return Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) < 3
  return false
}

function Btn(props: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  iconOnly?: boolean
}) {
  return (
    <button
      className={`ss-btn${props.primary ? ' primary' : ''}${props.iconOnly ? ' icon-only' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      aria-label={props.label}
    >
      {ICONS[props.icon]}
      {!props.iconOnly && <span>{props.label}</span>}
    </button>
  )
}
