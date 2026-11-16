import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  CAPTURE_ACCELERATORS,
  DEFAULT_SCREENSHOT_HOTKEYS,
  keyEventToAccelerator,
  type ScreenshotHotkeysSettings,
} from '../shared/capture-args'
import type { CaptureOutcome, ScreenshotsApi } from '../shared/channels'
import {
  cropHitTest,
  dragCrop,
  hitTestShape,
  hitTestShapeHandle,
  moveShape,
  normalizeRect,
  resizeShapeHandle,
  shapeBoundingBox,
  shapeHandles,
  stepZoom,
  type CropHandle,
  type ShapeHandleId,
} from '../shared/geometry'
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
import { canvasToPng, compose, drawShape, ensureImagesLoaded, loadImage, pngUrl } from './render'
import { ScreenshotsAiPanel, GensparkMark } from './ai/ScreenshotsAiPanel'
import type { ScreenshotsAiDeps, ScreenshotsSnapshot } from './ai/screenshots-skill'
import './screenshots.css'

/** what undo/redo walks over: the base image (crop replaces it) plus the shapes on top */
interface Doc {
  src: string | null
  shapes: Shape[]
}

type EditorTool = Tool | 'crop'

/** screen pixels around a crop corner/edge that still grab it */
const CROP_GRAB_PX = 10
const CROP_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
const CROP_CURSORS: Record<CropHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  move: 'move',
}

const TOOLS: Array<{ id: EditorTool; key: string; label: keyof ReturnType<typeof screenshotsStrings> }> = [
  { id: 'select', key: 'v', label: 'toolSelect' },
  { id: 'arrow', key: 'a', label: 'toolArrow' },
  { id: 'rect', key: 'r', label: 'toolRect' },
  { id: 'ellipse', key: 'o', label: 'toolEllipse' },
  { id: 'line', key: 'l', label: 'toolLine' },
  { id: 'pen', key: 'p', label: 'toolPen' },
  { id: 'marker', key: 'h', label: 'toolMarker' },
  { id: 'text', key: 't', label: 'toolText' },
  { id: 'step', key: 'n', label: 'toolStep' },
  { id: 'blur', key: 'b', label: 'toolBlur' },
  { id: 'image', key: 'i', label: 'toolImage' },
  { id: 'crop', key: 'c', label: 'toolCrop' },
]

const IS_MAC = navigator.platform.toLowerCase().includes('mac')

/** Tooltip spelling of a ⌘/Ctrl shortcut on this platform. */
const kbd = (key: string, shift = false) => (IS_MAC ? `${shift ? '⇧' : ''}⌘${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`)
const hotkeyLabel = (accel: string) =>
  IS_MAC ? accel.replace('CommandOrControl+Alt+Shift+', '⌥⇧⌘') : accel.replace('CommandOrControl', 'Ctrl')
const MAX_IMAGE_BYTES = 100 * 1024 * 1024

function shortcutLabel(accel: string): string {
  if (!accel) return ''
  if (!IS_MAC) return accel.replace('CommandOrControl', 'Ctrl')
  return accel
    .replace('CommandOrControl+', '⌘')
    .replace('Alt+', '⌥')
    .replace('Shift+', '⇧')
    .replace(/⌘⌥⇧/, '⌥⇧⌘')
}

let shapeUid = 0
const genId = () => 's_' + Date.now().toString(36) + '_' + (++shapeUid)

export function isEditableTarget(target: EventTarget | null): boolean {
  let curr = target as (Partial<HTMLElement> & { parentNode?: unknown }) | null
  while (curr && typeof curr === 'object') {
    if (typeof curr.tagName === 'string') {
      const tag = curr.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    }
    if (curr.isContentEditable || curr.contentEditable === 'true' || curr.contentEditable === '') {
      return true
    }
    if (typeof curr.getAttribute === 'function') {
      const ce = curr.getAttribute('contenteditable')
      if (ce !== null && ce !== 'false') return true
    }
    curr = (curr.parentElement ?? curr.parentNode) as typeof curr
  }
  return false
}

export function ScreenshotsEditor({ api, lang }: { api: ScreenshotsApi; lang: string }) {
  const s = useMemo(() => screenshotsStrings(lang), [lang])
  const [history, setHistory] = useState<History<Doc>>(() => createHistory({ src: null, shapes: [] }))
  const doc = history.present
  const [base, setBase] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<EditorTool>('arrow')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [stroke, setStroke] = useState<number>(DEFAULT_STROKE)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [liveEdit, setLiveEdit] = useState<{ id: string; shape: Shape } | null>(null)
  const liveEditRef = useRef<{ id: string; shape: Shape } | null>(null)
  const shapeDrag = useRef<{ shapeId: string; handle: ShapeHandleId; from: Point; startShape: Shape } | null>(null)
  const [hoverCursor, setHoverCursor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editingTextId = useRef<string | null>(null)

  const [draft, setDraftState] = useState<Shape | null>(null)
  /** the in-progress shape, read synchronously on pointerup: a fast drag can
   *  release before React re-renders with the last pointermove */
  const draftRef = useRef<Shape | null>(null)
  const setDraft = (next: Shape | null | ((d: Shape | null) => Shape | null)) => {
    draftRef.current = typeof next === 'function' ? next(draftRef.current) : next
    setDraftState(draftRef.current)
  }
  const [cropRect, setCropRect] = useState<Rect | null>(null)
  /** the crop frame being dragged: which handle, the frame and pointer at grab time */
  const cropDrag = useRef<{ handle: CropHandle; start: Rect; from: Point } | null>(null)
  const [cropCursor, setCropCursor] = useState('crosshair')
  const [textAt, setTextAt] = useState<Point | null>(null)
  const [textValue, setTextValue] = useState('')
  /** null = fit the window; otherwise CSS pixels per image pixel */
  const [zoom, setZoom] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<ScreenshotHotkeysSettings>(DEFAULT_SCREENSHOT_HOTKEYS)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragFrom = useRef<Point | null>(null)
  /** the doc last written to disk or the clipboard — "dirty" means the present differs */
  const savedDoc = useRef<Doc>(history.present)

  useEffect(() => {
    let alive = true
    api.getHotkeysSettings?.().then((h) => {
      if (alive && h) setHotkeys(h)
    })
    const unsub = api.onHotkeysSettingsChanged?.((h) => {
      if (alive && h) setHotkeys(h)
    })
    return () => {
      alive = false
      unsub?.()
    }
  }, [api])

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

  // ── repaint whenever the doc, the image, live shape edit or draft changes ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !base) return
    if (canvas.width !== base.naturalWidth) canvas.width = base.naturalWidth
    if (canvas.height !== base.naturalHeight) canvas.height = base.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(base, 0, 0)
    const shapesToDraw = liveEdit
      ? doc.shapes.map((shape) => (shape.id === liveEdit.id ? liveEdit.shape : shape))
      : doc.shapes
    for (const shape of shapesToDraw) {
      if (editingTextId.current && shape.id === editingTextId.current) continue
      drawShape(ctx, shape)
    }
    if (draft) drawShape(ctx, draft)
  }, [base, doc.shapes, draft, liveEdit])

  // ── dirty flag mirrors to main, which guards tab close and quit ──
  const dirty = doc.shapes.length > 0 && history.present !== savedDoc.current
  useEffect(() => api.setDirty(dirty), [api, dirty])

  const apply = useCallback((next: Doc) => setHistory((h) => commit(h, next)), [])

  const loadPng = useCallback(
    (png: Uint8Array, needsCrop = false) => {
      if (png.byteLength > MAX_IMAGE_BYTES) {
        flash(s.imageTooLarge)
        return
      }
      const next: Doc = { src: pngUrl(png), shapes: [] }
      savedDoc.current = next
      setHistory((h) => (h.present.src ? commit(h, next) : createHistory(next)))
      setSelectedId(null)
      setLiveEdit(null)
      setDraft(null)
      setTextAt(null)
      setCropRect(null)
      setZoom(null)
      setTool(needsCrop ? 'crop' : 'arrow')
      if (needsCrop) flash(s.cropHint)
    },
    [flash, s.cropHint, s.imageTooLarge],
  )

  const insertImageBytes = useCallback(
    async (png: Uint8Array) => {
      if (!base) {
        loadPng(png)
        return
      }
      if (png.byteLength > MAX_IMAGE_BYTES) {
        flash(s.imageTooLarge)
        return
      }
      const url = pngUrl(png)
      let img: HTMLImageElement
      try {
        img = await loadImage(url)
      } catch {
        flash(s.imageUnreadable)
        return
      }
      const maxW = Math.round(base.naturalWidth * 0.6)
      const maxH = Math.round(base.naturalHeight * 0.6)
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
      const w = Math.max(30, Math.round(img.naturalWidth * scale))
      const h = Math.max(30, Math.round(img.naturalHeight * scale))
      const x = Math.max(0, Math.round((base.naturalWidth - w) / 2))
      const y = Math.max(0, Math.round((base.naturalHeight - h) / 2))
      const newShape: Shape = {
        id: genId(),
        tool: 'image',
        src: url,
        rect: { x, y, width: w, height: h },
      }
      apply({ ...doc, shapes: [...doc.shapes, newShape] })
      setSelectedId(newShape.id ?? null)
      setTool('select')
    },
    [apply, base, doc, flash, loadPng, s.imageTooLarge, s.imageUnreadable],
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

  const exportPng = async (): Promise<Uint8Array | null> => {
    if (!base) return null
    commitText()
    await ensureImagesLoaded(history.present.shapes)
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

  useEffect(() => api.onSaveRequest(save))

  // ── pointer → image coordinates (the canvas may be scaled to fit) ──
  const toImage = (e: ReactPointerEvent<HTMLElement>): Point => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    }
  }

  const nextStep = () => doc.shapes.filter((x) => x.tool === 'step').length + 1

  // ── Selection management & re-arrangement ──
  const activeShape = useMemo(() => {
    if (!selectedId) return null
    if (liveEdit && liveEdit.id === selectedId) return liveEdit.shape
    return doc.shapes.find((shape) => shape.id === selectedId) ?? null
  }, [selectedId, liveEdit, doc.shapes])

  const activeBbox = useMemo(() => (activeShape ? shapeBoundingBox(activeShape) : null), [activeShape])
  const activeHandles = useMemo(() => (activeShape ? shapeHandles(activeShape) : []), [activeShape])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    apply({ ...doc, shapes: doc.shapes.filter((shape) => shape.id !== selectedId) })
    setSelectedId(null)
    setLiveEdit(null)
    liveEditRef.current = null
  }, [apply, doc, selectedId])

  const bringForward = useCallback(() => {
    if (!selectedId) return
    const idx = doc.shapes.findIndex((shape) => shape.id === selectedId)
    if (idx >= 0 && idx < doc.shapes.length - 1) {
      const next = [...doc.shapes]
      const [item] = next.splice(idx, 1)
      next.splice(idx + 1, 0, item)
      apply({ ...doc, shapes: next })
    }
  }, [apply, doc, selectedId])

  const sendBackward = useCallback(() => {
    if (!selectedId) return
    const idx = doc.shapes.findIndex((shape) => shape.id === selectedId)
    if (idx > 0) {
      const next = [...doc.shapes]
      const [item] = next.splice(idx, 1)
      next.splice(idx - 1, 0, item)
      apply({ ...doc, shapes: next })
    }
  }, [apply, doc, selectedId])

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedId) return
      const updated = doc.shapes.map((shape) => (shape.id === selectedId ? moveShape(shape, dx, dy) : shape))
      apply({ ...doc, shapes: updated })
    },
    [apply, doc, selectedId],
  )

  const onColorChange = (c: string) => {
    setColor(c)
    if (selectedId) {
      const updated = doc.shapes.map((shape) =>
        shape.id === selectedId && shape.tool !== 'image' ? { ...shape, color: c } : shape,
      )
      apply({ ...doc, shapes: updated })
    }
  }

  const onStrokeChange = (w: number) => {
    setStroke(w)
    if (selectedId) {
      const updated = doc.shapes.map((shape) => (shape.id === selectedId ? { ...shape, width: w } : shape))
      apply({ ...doc, shapes: updated })
    }
  }

  const pickImageFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  // ── pointer interactions ──
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!base || e.button !== 0) return
    const p = toImage(e)
    if (tool === 'text') {
      commitText()
      setTextAt(p)
      setTextValue('')
      return
    }
    if (tool === 'crop') {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragFrom.current = p
      const grabbed = (e.target as HTMLElement).dataset.handle as CropHandle | undefined
      const hit = grabbed ?? (cropRect ? cropHitTest(cropRect, p, CROP_GRAB_PX / canvasScale) : null)
      const isFull = !!cropRect && !!base && cropRect.width >= base.naturalWidth && cropRect.height >= base.naturalHeight
      cropDrag.current = hit && cropRect && !(hit === 'move' && isFull)
        ? { handle: hit, start: cropRect, from: p }
        : { handle: 'se', start: { x: p.x, y: p.y, width: 0, height: 0 }, from: p }
      return
    }

    // 1. Check if grabbed a handle on the currently selected shape
    const currentSel = selectedId ? doc.shapes.find((shape) => shape.id === selectedId) : null
    if (currentSel) {
      const grabbedHandle = (e.target as HTMLElement).dataset.handle as ShapeHandleId | undefined
      const handleHit = grabbedHandle ?? hitTestShapeHandle(currentSel, p, 12 / canvasScale)
      if (handleHit) {
        e.currentTarget.setPointerCapture(e.pointerId)
        const effectiveHandle = handleHit === 'mid' ? 'body' : handleHit
        shapeDrag.current = {
          shapeId: currentSel.id!,
          handle: effectiveHandle,
          from: p,
          startShape: { ...currentSel },
        }
        return
      }
    }

    // 2. Clicking any existing shape selects and moves it immediately
    // Works across all interactive tools (except freehand pen/marker where clicking draws strokes)
    if (tool !== 'pen' && tool !== 'marker' && tool !== 'step') {
      // First check if clicking on currentSel body
      if (currentSel && currentSel.tool !== 'image' && hitTestShape(currentSel, p, 12 / canvasScale, true)) {
        e.currentTarget.setPointerCapture(e.pointerId)
        shapeDrag.current = {
          shapeId: currentSel.id!,
          handle: 'body',
          from: p,
          startShape: { ...currentSel },
        }
        return
      }

      // Then check if clicking on any other shape (top-to-bottom in z-order)
      let hitShape = [...doc.shapes].reverse().find((shape) => hitTestShape(shape, p, 12 / canvasScale, true))
      if (!hitShape) {
        hitShape = [...doc.shapes].reverse().find((shape) => hitTestShape(shape, p, 12 / canvasScale, false))
      }
      if (hitShape) {
        e.currentTarget.setPointerCapture(e.pointerId)
        setSelectedId(hitShape.id!)
        shapeDrag.current = {
          shapeId: hitShape.id!,
          handle: 'body',
          from: p,
          startShape: { ...hitShape },
        }
        return
      }
    }

    if (tool === 'step') {
      const newStep: Shape = {
        id: genId(),
        tool: 'step',
        color,
        width: stroke,
        at: p,
        n: nextStep(),
      }
      apply({ ...doc, shapes: [...doc.shapes, newStep] })
      setSelectedId(newStep.id ?? null)
      return
    }

    setSelectedId(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    dragFrom.current = p
    if (tool === 'pen' || tool === 'marker') {
      setDraft({ id: genId(), tool, color, width: stroke, points: [p] })
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = toImage(e)
    if (tool === 'crop' && base) {
      const d = cropDrag.current
      if (d) {
        setCropRect(dragCrop(d.start, d.handle, p.x - d.from.x, p.y - d.from.y, base.naturalWidth, base.naturalHeight))
      } else {
        const hit = cropRect ? cropHitTest(cropRect, p, CROP_GRAB_PX / canvasScale) : null
        const isFull = !!cropRect && cropRect.width >= base.naturalWidth && cropRect.height >= base.naturalHeight
        setCropCursor(hit && !(hit === 'move' && isFull) ? CROP_CURSORS[hit] : 'crosshair')
      }
      return
    }

    // Dragging an existing shape or its handles
    if (shapeDrag.current) {
      const { shapeId, handle, from, startShape } = shapeDrag.current
      const dx = p.x - from.x
      const dy = p.y - from.y
      let updated: Shape
      if (handle === 'body') {
        updated = moveShape(startShape, dx, dy)
      } else {
        updated = resizeShapeHandle(startShape, handle, p)
      }
      liveEditRef.current = { id: shapeId, shape: updated }
      setLiveEdit({ id: shapeId, shape: updated })
      return
    }

    // Drafting a new shape
    const from = dragFrom.current
    if (from) {
      setDraft((d) => {
        switch (tool) {
          case 'arrow':
          case 'line':
            return { id: d?.id ?? genId(), tool, color, width: stroke, from, to: p }
          case 'rect':
          case 'ellipse':
          case 'blur':
            return { id: d?.id ?? genId(), tool, color, width: stroke, rect: normalizeRect(from, p) }
          case 'pen':
          case 'marker':
            return d && 'points' in d ? { ...d, points: [...d.points, p] } : d
          default:
            return d
        }
      })
      return
    }

    // Hover cursor calculation when idle
    if (base && !dragFrom.current && !shapeDrag.current) {
      const currentSel = selectedId ? doc.shapes.find((shape) => shape.id === selectedId) : null
      if (currentSel) {
        const h = hitTestShapeHandle(currentSel, p, 12 / canvasScale)
        if (h) {
          const handles = shapeHandles(currentSel)
          const found = handles.find((item) => item.id === h)
          setHoverCursor(found ? found.cursor : 'pointer')
          return
        }
        if (currentSel.tool !== 'image' && hitTestShape(currentSel, p, 12 / canvasScale, true)) {
          setHoverCursor('move')
          return
        }
      }
      if (tool !== 'crop' && tool !== 'pen' && tool !== 'marker') {
        const hit = [...doc.shapes].reverse().find((shape) => hitTestShape(shape, p, 12 / canvasScale, false))
        if (hit) {
          setHoverCursor('move')
          return
        }
      }
      setHoverCursor(null)
    }
  }

  const onPointerUp = () => {
    if (shapeDrag.current) {
      if (liveEditRef.current) {
        const finalEdit = liveEditRef.current
        apply({
          ...doc,
          shapes: doc.shapes.map((shape) => (shape.id === finalEdit.id ? finalEdit.shape : shape)),
        })
        setLiveEdit(null)
        liveEditRef.current = null
      }
      shapeDrag.current = null
      return
    }
    if (!dragFrom.current) return
    dragFrom.current = null
    if (tool === 'crop') {
      cropDrag.current = null
      setCropRect((r) => (r && r.width >= 2 && r.height >= 2 ? r : fullFrame()))
      return
    }
    const done = draftRef.current
    if (done && !isDegenerate(done)) {
      const withId: Shape = { ...done, id: done.id ?? genId() }
      apply({ ...doc, shapes: [...doc.shapes, withId] })
      setSelectedId(withId.id ?? null)
    }
    setDraft(null)
  }

  function commitText() {
    if (textAt && textValue.trim()) {
      const size = 14 + stroke * 4
      if (editingTextId.current) {
        const targetId = editingTextId.current
        apply({
          ...history.present,
          shapes: history.present.shapes.map((shape) =>
            shape.id === targetId ? { ...shape, text: textValue, at: textAt, size, color } : shape,
          ),
        })
        editingTextId.current = null
      } else {
        const newText: Shape = {
          id: genId(),
          tool: 'text',
          color,
          width: stroke,
          at: textAt,
          text: textValue,
          size,
        }
        apply({
          ...history.present,
          shapes: [...history.present.shapes, newText],
        })
        setSelectedId(newText.id ?? null)
      }
    } else if (editingTextId.current) {
      apply({
        ...history.present,
        shapes: history.present.shapes.filter((shape) => shape.id !== editingTextId.current),
      })
      editingTextId.current = null
    }
    setTextAt(null)
    setTextValue('')
  }

  const onDoubleClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!base) return
    const p = toImage(e)
    const hit = [...doc.shapes].reverse().find((shape) => shape.tool === 'text' && hitTestShape(shape, p, 8 / canvasScale))
    if (hit && hit.tool === 'text') {
      commitText()
      editingTextId.current = hit.id!
      setTextAt(hit.at)
      setTextValue(hit.text)
      setColor(hit.color)
      setSelectedId(hit.id!)
    }
  }

  const applyCrop = async () => {
    if (!base || !cropRect || cropRect.width < 2 || cropRect.height < 2) return
    await ensureImagesLoaded(doc.shapes)
    const full = compose(base, doc.shapes)
    const out = document.createElement('canvas')
    out.width = Math.round(cropRect.width)
    out.height = Math.round(cropRect.height)
    out.getContext('2d')!.drawImage(full, -Math.round(cropRect.x), -Math.round(cropRect.y))
    apply({ src: pngUrl(await canvasToPng(out)), shapes: [] })
    setSelectedId(null)
    setCropRect(null)
    setTool('arrow')
  }

  const fullFrame = (): Rect | null => (base ? { x: 0, y: 0, width: base.naturalWidth, height: base.naturalHeight } : null)

  useEffect(() => {
    if (tool === 'crop' && base && !cropRect) setCropRect({ x: 0, y: 0, width: base.naturalWidth, height: base.naturalHeight })
  }, [tool, base, cropRect])

  const cancelCrop = () => {
    cropDrag.current = null
    setCropRect(null)
    setTool('arrow')
  }

  // ── keyboard & paste ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = IS_MAC ? e.metaKey : e.ctrlKey
      const k = e.key.toLowerCase()

      const accel = keyEventToAccelerator({
        key: e.key,
        code: e.code,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      })
      const isAiShortcut =
        (mod && k === 'j') ||
        (Boolean(hotkeys.aiAssistant) &&
          accel !== null &&
          accel.toLowerCase() === hotkeys.aiAssistant.toLowerCase())

      // Guard: when typing in any editable target (e.g. AI panel textarea, input, contenteditable)
      // or during IME composition (Vietnamese Telex/VNI), do NOT execute canvas shortcuts.
      if (isEditableTarget(e.target) || e.isComposing) {
        if (isAiShortcut) {
          e.preventDefault()
          setAiOpen((v) => !v)
        }
        return
      }

      if (selectedId && tool !== 'crop') {
        if (k === 'backspace' || k === 'delete') {
          e.preventDefault()
          deleteSelected()
          return
        }
        if (k === ']' || (mod && k === ']')) {
          e.preventDefault()
          bringForward()
          return
        }
        if (k === '[' || (mod && k === '[')) {
          e.preventDefault()
          sendBackward()
          return
        }
        if (e.key.startsWith('Arrow')) {
          e.preventDefault()
          const d = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
          const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
          nudgeSelected(dx, dy)
          return
        }
      }

      if (mod && !e.altKey && (k === '=' || k === '+' || k === '-' || k === '0') && base) {
        e.preventDefault()
        const next = k === '0' ? 1 : stepZoom(canvasScale, k === '-' ? -1 : 1)
        setZoom(next)
        flash(`${Math.round(next * 100)}%`)
      } else if (mod && k === 'o') {
        e.preventDefault()
        void openImage()
      } else if (tool === 'crop' && cropRect && base && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const d = e.shiftKey ? 4 : 1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        setCropRect(dragCrop(cropRect, 'move', dx, dy, base.naturalWidth, base.naturalHeight))
      } else if (mod && k === 'z') {
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
      } else if (isAiShortcut) {
        e.preventDefault()
        setAiOpen((v) => !v)
      } else if (!mod && !e.altKey) {
        if (k === 'enter' && tool === 'crop') void applyCrop()
        else if (k === 'escape') {
          if (tool === 'crop') cancelCrop()
          setSelectedId(null)
          setDraft(null)
          dragFrom.current = null
        } else {
          const hit = TOOLS.find((t) => t.key === k)
          if (hit) {
            if (hit.id === 'image') pickImageFile()
            else setTool(hit.id)
          }
          const digit = Number(k)
          if (digit >= 1 && digit <= PALETTE.length) onColorChange(PALETTE[digit - 1])
        }
      }
    }
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      void file.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf)
        if (!base) loadPng(bytes)
        else void insertImageBytes(bytes)
      })
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  })

  const aiDeps: ScreenshotsAiDeps = useMemo(
    () => ({
      getImageDimensions: () => ({
        width: base?.naturalWidth ?? 0,
        height: base?.naturalHeight ?? 0,
      }),
      getCurrentShapes: () => history.present.shapes,
      addShapes: (shapes: Shape[]) => {
        setHistory((h) => commit(h, { ...h.present, shapes: [...h.present.shapes, ...shapes] }))
      },
      cropImage: (rect: Rect) => {
        if (!base) return
        void (async () => {
          await ensureImagesLoaded(history.present.shapes)
          const full = compose(base, history.present.shapes)
          const out = document.createElement('canvas')
          out.width = Math.max(10, Math.round(rect.width))
          out.height = Math.max(10, Math.round(rect.height))
          out.getContext('2d')!.drawImage(full, -Math.round(rect.x), -Math.round(rect.y))
          const url = pngUrl(await canvasToPng(out))
          setHistory((h) => commit(h, { src: url, shapes: [] }))
          setSelectedId(null)
          setCropRect(null)
        })()
      },
      clearShapes: (toolType?: string) => {
        setHistory((h) => {
          const nextShapes =
            !toolType || toolType === 'all'
              ? []
              : h.present.shapes.filter((sh) => sh.tool !== toolType)
          return commit(h, { ...h.present, shapes: nextShapes })
        })
        setSelectedId(null)
      },
      getSnapshot: () => ({
        src: history.present.src,
        shapes: [...history.present.shapes],
      }),
      restoreSnapshot: (snapshot: ScreenshotsSnapshot) => {
        setHistory((h) => commit(h, { src: snapshot.src, shapes: [...snapshot.shapes] }))
        setSelectedId(null)
        setCropRect(null)
      },
    }),
    [base, history.present.shapes, history.present.src],
  )

  const getCanvasBase64 = useCallback(() => {
    const c = canvasRef.current
    if (!c || !base) return null
    try {
      return c.toDataURL('image/png')
    } catch {
      return null
    }
  }, [base])

  const canvasScale =
    zoom ?? (base && canvasRef.current ? canvasRef.current.getBoundingClientRect().width / base.naturalWidth : 1)

  let activeCursor = 'crosshair'
  if (tool === 'crop') activeCursor = cropCursor
  else if (tool === 'text') activeCursor = 'text'
  else if (hoverCursor) activeCursor = hoverCursor
  else if (tool === 'select') activeCursor = 'default'

  return (
    <div className="ss-root">
      <div className="ss-toolbar" role="toolbar">
        <div className="ss-group">
          <Btn icon="area" label={s.captureArea} shortcut={shortcutLabel(hotkeys.area)} onClick={() => void capture('area')} disabled={busy} primary />
          <Btn icon="window" label={s.captureWindow} shortcut={shortcutLabel(hotkeys.window)} onClick={() => void capture('window')} disabled={busy} />
          <Btn icon="fullscreen" label={s.captureFullscreen} shortcut={shortcutLabel(hotkeys.fullscreen)} onClick={() => void capture('fullscreen')} disabled={busy} />
          <Btn icon="open" label={s.openImage} shortcut={kbd('O')} onClick={() => void openImage()} />
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
                if (t.id === 'image') pickImageFile()
                else setTool(t.id)
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
              onClick={() => onColorChange(c)}
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
              onClick={() => onStrokeChange(w)}
            >
              <span className="ss-stroke" style={{ height: w }} />
            </button>
          ))}
        </div>

        {selectedId && (
          <div className="ss-group" aria-label="arrange">
            <span className="ss-sep" />
            <button
              className="ss-icon-btn"
              title={`${s.bringForward} (])`}
              aria-label={s.bringForward}
              onClick={bringForward}
            >
              {ICONS.bringForward}
            </button>
            <button
              className="ss-icon-btn"
              title={`${s.sendBackward} ([)`}
              aria-label={s.sendBackward}
              onClick={sendBackward}
            >
              {ICONS.sendBackward}
            </button>
            <button
              className="ss-icon-btn"
              title={`${s.deleteShape} (⌫)`}
              aria-label={s.deleteShape}
              onClick={deleteSelected}
            >
              {ICONS.delete}
            </button>
          </div>
        )}

        <div className="ss-group ss-end">
          <Btn icon="undo" label={s.undo} shortcut={kbd('Z')} onClick={() => setHistory(undo)} disabled={history.past.length === 0} iconOnly />
          <Btn icon="redo" label={s.redo} shortcut={kbd('Z', true)} onClick={() => setHistory(redo)} disabled={history.future.length === 0} iconOnly />
          <button
            className="ss-text-btn"
            onClick={() => setZoom((z) => (z === null ? 1 : null))}
            disabled={!base}
            title={`${kbd('0')} · ${kbd('+')} · ${kbd('−')}`}
          >
            {zoom === null ? s.zoomActual : s.zoomFit}
          </button>
          <Btn icon="copy" label={s.copy} shortcut={kbd('C')} onClick={() => void copy()} disabled={!base} />
          <Btn icon="save" label={s.save} shortcut={kbd('S')} onClick={() => void save()} disabled={!base} primary />
          <span className="ss-sep" />
          <button
            type="button"
            className={`ss-btn ss-btn-vuaai${aiOpen ? ' active' : ''}`}
            onClick={() => setAiOpen((v) => !v)}
            disabled={!base}
            title={`VuaAI Pro (${kbd('J')})`}
            aria-label="VuaAI Pro"
          >
            <GensparkMark size={18} />
            <span>VuaAI Pro</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const buf = await file.arrayBuffer()
          await insertImageBytes(new Uint8Array(buf))
        }}
      />

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
          <button className="ss-text-btn primary" onClick={() => void api.relaunchApp()}>
            {s.permissionRelaunch}
          </button>
        </div>
      )}

      <div className="ss-workspace">
        <div className={`ss-stage${zoom === null ? ' fit' : ''}`}>
        {base ? (
          <div
            className="ss-canvas-wrap"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            <canvas
              ref={canvasRef}
              className={`ss-canvas tool-${tool}`}
              style={{
                ...(zoom !== null && base ? { width: base.naturalWidth * zoom } : {}),
                cursor: activeCursor,
              }}
              onMouseDown={(e) => e.preventDefault()}
            />

            {/* Selection bounding box & handles */}
            {activeShape && activeBbox && tool !== 'crop' && (
              <div
                className="ss-selection-layer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {/* Bounding box is only drawn for 2D container shapes, strictly excluded for arrow/line/pen/marker/step */}
                {['rect', 'ellipse', 'blur', 'image', 'text'].includes(activeShape.tool) && (
                  <div
                    className="ss-selection-box"
                    style={{
                      left: activeBbox.x * canvasScale,
                      top: activeBbox.y * canvasScale,
                      width: activeBbox.width * canvasScale,
                      height: activeBbox.height * canvasScale,
                    }}
                  />
                )}
                {activeHandles.map((h) => (
                  <span
                    key={h.id}
                    data-handle={h.id}
                    className="ss-selection-handle"
                    style={{
                      left: h.point.x * canvasScale,
                      top: h.point.y * canvasScale,
                      cursor: h.cursor,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                ))}
              </div>
            )}

            {tool === 'crop' && cropRect && cropRect.width > 0 && (
              <div
                className="ss-crop"
                style={{
                  left: cropRect.x * canvasScale,
                  top: cropRect.y * canvasScale,
                  width: cropRect.width * canvasScale,
                  height: cropRect.height * canvasScale,
                }}
              >
                {CROP_HANDLES.map((h) => (
                  <span key={h} data-handle={h} className={`ss-crop-handle h-${h}`} onMouseDown={(e) => e.preventDefault()} />
                ))}
              </div>
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
                    editingTextId.current = null
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
                area: shortcutLabel(hotkeys.area),
              })}
            </p>
          </div>
        )}
        </div>
        <ScreenshotsAiPanel
          isOpen={aiOpen && !!base}
          onClose={() => setAiOpen(false)}
          deps={aiDeps}
          getCanvasBase64={getCanvasBase64}
          lang={lang}
        />
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
  if ('points' in shape) return shape.points.length === 0
  return false
}

function Btn(props: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  active?: boolean
  iconOnly?: boolean
  shortcut?: string
}) {
  return (
    <button
      className={`ss-btn${props.primary ? ' primary' : ''}${props.active ? ' active' : ''}${props.iconOnly ? ' icon-only' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.shortcut ? `${props.label} (${props.shortcut})` : props.label}
      aria-label={props.label}
      aria-keyshortcuts={props.shortcut}
    >
      {ICONS[props.icon]}
      {!props.iconOnly && <span>{props.label}</span>}
    </button>
  )
}
