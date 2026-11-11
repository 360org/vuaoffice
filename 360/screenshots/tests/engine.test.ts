import { describe, it, expect } from 'vitest'
import {
  normalizeRect,
  clampRect,
  arrowHead,
  taperedArrowPolygon,
  cropHitTest,
  dragCrop,
  stepZoom,
  pixelate,
  shapeBoundingBox,
  shapeHandles,
  hitTestShapeHandle,
  hitTestShape,
  moveShape,
  resizeShapeHandle,
} from '../src/shared/geometry'
import type { Shape, Rect } from '../src/shared/types'
import {
  createHistory,
  commit,
  undo,
  redo,
} from '../src/shared/history'
import {
  screencaptureArgs,
  CAPTURE_ACCELERATORS,
  isEditorShortcut,
} from '../src/shared/capture-args'
import {
  screenshotsStrings,
  fill,
} from '../src/shared/i18n'
import {
  PALETTE,
  STROKES,
  DEFAULT_COLOR,
  DEFAULT_STROKE,
} from '../src/shared/types'

describe('VuaOffice Screenshots (360/screenshots)', () => {
  describe('Geometry & Vector math', () => {
    it('normalizeRect converts reversed drag points to positive-dimension rect', () => {
      const r = normalizeRect({ x: 100, y: 150 }, { x: 30, y: 50 })
      expect(r).toEqual({ x: 30, y: 50, width: 70, height: 100 })
    })

    it('clampRect confines rect inside canvas boundary and returns null if out of bounds', () => {
      const r1 = clampRect({ x: -10, y: 5, width: 50, height: 40 }, 100, 100)
      expect(r1).toEqual({ x: 0, y: 5, width: 40, height: 40 })

      const r2 = clampRect({ x: 200, y: 200, width: 50, height: 50 }, 100, 100)
      expect(r2).toBeNull()
    })

    it('arrowHead calculates two symmetrical barbs at target point', () => {
      const [l, r] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 15)
      expect(l.x).toBeLessThan(100)
      expect(r.x).toBeLessThan(100)
      expect(l.y).toBeCloseTo(-r.y, 4)
    })

    it('taperedArrowPolygon generates 7 points with expanding shaft', () => {
      const pts = taperedArrowPolygon({ x: 0, y: 0 }, { x: 200, y: 0 }, 4)
      expect(pts).toHaveLength(7)
      // Tip is at target
      expect(pts[0]).toEqual({ x: 200, y: 0 })
      // Tail width (pts[3] to pts[4])
      const tailWidth = Math.abs(pts[3].y - pts[4].y)
      // Neck width (pts[2] to pts[5])
      const neckWidth = Math.abs(pts[2].y - pts[5].y)
      // Head barbs width (pts[1] to pts[6])
      const headWidth = Math.abs(pts[1].y - pts[6].y)

      // "Đầu to đuôi nhỏ": Tail width < Neck width < Head barbs width
      expect(tailWidth).toBeLessThan(neckWidth)
      expect(neckWidth).toBeLessThan(headWidth)
    })

    it('pixelate averages color blocks destructively in RGBA buffer', () => {
      // 4x4 image buffer with distinct pixel colors
      const data = new Uint8ClampedArray(4 * 4 * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 100 // R
        data[i + 1] = 150 // G
        data[i + 2] = 200 // B
        data[i + 3] = 255 // A
      }
      // Mutate one pixel inside block
      data[0] = 0
      pixelate(data, 4, { x: 0, y: 0, width: 2, height: 2 }, 2)
      // Block average should be applied to all 4 pixels of the 2x2 block
      const avgR = (0 + 100 + 100 + 100) / 4
      expect(data[0]).toBe(avgR)
      expect(data[4]).toBe(avgR)
    })
  })

  describe('History (Undo / Redo)', () => {
    it('tracks snapshots, performs undo, redo and discards future on commit', () => {
      let h = createHistory('initial')
      expect(h.present).toBe('initial')
      expect(undo(h)).toBe(h) // no past

      h = commit(h, 'step1')
      h = commit(h, 'step2')
      expect(h.present).toBe('step2')

      h = undo(h)
      expect(h.present).toBe('step1')

      h = undo(h)
      expect(h.present).toBe('initial')

      h = redo(h)
      expect(h.present).toBe('step1')

      // Committing new state clears redo future
      h = commit(h, 'step1-alt')
      expect(h.present).toBe('step1-alt')
      expect(redo(h)).toBe(h)
    })
  })

  describe('Capture arguments & shortcuts', () => {
    it('generates correct screencapture arguments on macOS', () => {
      expect(screencaptureArgs('area', '/tmp/out.png')).toEqual(['-i', '-s', '-x', '/tmp/out.png'])
      expect(screencaptureArgs('window', '/tmp/out.png')).toEqual(['-i', '-w', '-x', '/tmp/out.png'])
      expect(screencaptureArgs('fullscreen', '/tmp/out.png')).toEqual(['-m', '-x', '/tmp/out.png'])
    })

    it('defines distinct global hotkeys avoiding macOS native shortcuts', () => {
      expect(CAPTURE_ACCELERATORS.area).toBe('CommandOrControl+Alt+Shift+1')
      expect(CAPTURE_ACCELERATORS.window).toBe('CommandOrControl+Alt+Shift+2')
      expect(CAPTURE_ACCELERATORS.fullscreen).toBe('CommandOrControl+Alt+Shift+3')
    })
  })

  describe('i18n & Palette defaults', () => {
    it('provides Vietnamese and English strings with template replacement', () => {
      const vi = screenshotsStrings('vi')
      expect(vi.title).toBe('Chụp màn hình')
      expect(fill('Lưu tại {path}', { path: '/tmp/test.png' })).toBe('Lưu tại /tmp/test.png')

      const en = screenshotsStrings('en')
      expect(en.title).toBe('Screenshots')
    })

    it('exports standard 8-color palette and 3 stroke widths', () => {
      expect(PALETTE).toHaveLength(8)
      expect(STROKES).toHaveLength(3)
      expect(DEFAULT_COLOR).toBe(PALETTE[0])
      expect(DEFAULT_STROKE).toBe(STROKES[1])
    })
  })
})

describe('Crop frame handles', () => {
  const r = { x: 100, y: 100, width: 200, height: 100 }

  it('cropHitTest finds corners, edges, inside and outside', () => {
    expect(cropHitTest(r, { x: 102, y: 98 }, 8)).toBe('nw')
    expect(cropHitTest(r, { x: 300, y: 200 }, 8)).toBe('se')
    expect(cropHitTest(r, { x: 200, y: 100 }, 8)).toBe('n')
    expect(cropHitTest(r, { x: 296, y: 150 }, 8)).toBe('e')
    expect(cropHitTest(r, { x: 200, y: 150 }, 8)).toBe('move')
    expect(cropHitTest(r, { x: 20, y: 20 }, 8)).toBeNull()
  })

  it('dragCrop resizes from a corner and an edge', () => {
    expect(dragCrop(r, 'se', 50, 20, 1000, 1000)).toEqual({ x: 100, y: 100, width: 250, height: 120 })
    expect(dragCrop(r, 'w', 30, 999, 1000, 1000)).toEqual({ x: 130, y: 100, width: 170, height: 100 })
  })

  it('dragCrop moves the frame but keeps it inside the image', () => {
    expect(dragCrop(r, 'move', -500, 10, 400, 400)).toEqual({ x: 0, y: 110, width: 200, height: 100 })
    expect(dragCrop(r, 'move', 500, 500, 400, 400)).toEqual({ x: 200, y: 300, width: 200, height: 100 })
  })

  it('dragCrop clamps to the image and flips cleanly past the opposite edge', () => {
    expect(dragCrop(r, 'nw', -500, -500, 1000, 1000)).toEqual({ x: 0, y: 0, width: 300, height: 200 })
    expect(dragCrop(r, 'e', -300, 0, 1000, 1000)).toEqual({ x: 0, y: 100, width: 100, height: 100 })
  })
})

describe('Keyboard shortcuts', () => {
  const key = (k: string, mods: Partial<{ meta: boolean; control: boolean; alt: boolean }> = {}, type = 'keyDown') =>
    ({ type, key: k, meta: false, control: false, alt: false, ...mods })

  it('isEditorShortcut keeps editor ⌘ keys from the shell menu', () => {
    for (const k of ['z', 'Z', 'y', 'c', 's', 'o', '0', '=', '+', '-']) expect(isEditorShortcut(key(k, { meta: true }))).toBe(true)
    expect(isEditorShortcut(key('s', { control: true }))).toBe(true)
  })

  it('isEditorShortcut leaves app keys, ⌥ combos, plain keys and keyUp to the menu', () => {
    for (const k of ['w', 'n', 'q', 'v', ',']) expect(isEditorShortcut(key(k, { meta: true }))).toBe(false)
    expect(isEditorShortcut(key('=', { meta: true, alt: true }))).toBe(false)
    expect(isEditorShortcut(key('a'))).toBe(false)
    expect(isEditorShortcut(key('z', { meta: true }, 'keyUp'))).toBe(false)
  })

  it('stepZoom walks the zoom steps and clamps at both ends', () => {
    expect(stepZoom(1, 1)).toBe(1.5)
    expect(stepZoom(1, -1)).toBe(0.75)
    expect(stepZoom(0.62, 1)).toBe(0.75)
    expect(stepZoom(0.62, -1)).toBe(0.5)
    expect(stepZoom(4, 1)).toBe(4)
    expect(stepZoom(0.25, -1)).toBe(0.25)
  })
})

describe('Vector Object Model & Re-arrangement', () => {
  const arrow: Shape = {
    id: 'a1',
    tool: 'arrow',
    color: '#0077cd',
    width: 3,
    from: { x: 50, y: 50 },
    to: { x: 150, y: 100 },
  }
  const rect: Shape = {
    id: 'r1',
    tool: 'rect',
    color: '#e02424',
    width: 2,
    rect: { x: 200, y: 200, width: 100, height: 60 },
  }
  const imageShape: Shape = {
    id: 'img1',
    tool: 'image',
    src: 'data:image/png;base64,...',
    rect: { x: 400, y: 400, width: 80, height: 80 },
  }
  const ellipse: Shape = {
    id: 'e1',
    tool: 'ellipse',
    color: '#00ce2c',
    width: 3,
    rect: { x: 300, y: 100, width: 80, height: 40 },
  }

  describe('shapeBoundingBox', () => {
    it('computes normalized bounding boxes for all shape types', () => {
      expect(shapeBoundingBox(arrow)).toEqual({ x: 50, y: 50, width: 100, height: 50 })
      expect(shapeBoundingBox(rect)).toEqual({ x: 200, y: 200, width: 100, height: 60 })
      expect(shapeBoundingBox(imageShape)).toEqual({ x: 400, y: 400, width: 80, height: 80 })
      expect(shapeBoundingBox(ellipse)).toEqual({ x: 300, y: 100, width: 80, height: 40 })
    })
  })

  describe('shapeHandles & hit testing handles', () => {
    it('provides 2 endpoints for arrow and 8 handles for box shapes', () => {
      const aHandles = shapeHandles(arrow)
      expect(aHandles).toHaveLength(2)
      expect(aHandles.map((h) => h.id)).toEqual(['from', 'to'])

      const rHandles = shapeHandles(rect)
      expect(rHandles).toHaveLength(8)
      expect(rHandles.map((h) => h.id)).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
    })

    it('hitTestShapeHandle detects handles within grab tolerance', () => {
      expect(hitTestShapeHandle(arrow, { x: 51, y: 50 }, 6)).toBe('from')
      expect(hitTestShapeHandle(arrow, { x: 149, y: 101 }, 6)).toBe('to')
      expect(hitTestShapeHandle(arrow, { x: 100, y: 75 }, 6)).toBeNull()

      expect(hitTestShapeHandle(rect, { x: 201, y: 200 }, 6)).toBe('nw')
      expect(hitTestShapeHandle(rect, { x: 300, y: 260 }, 6)).toBe('se')
      expect(hitTestShapeHandle(rect, { x: 250, y: 200 }, 6)).toBe('n')
    })
  })

  describe('hitTestShape (selection and hollow border support)', () => {
    it('detects hits on arrows along the shaft and barb polygon', () => {
      expect(hitTestShape(arrow, { x: 100, y: 75 }, 5)).toBe(true)
      expect(hitTestShape(arrow, { x: 150, y: 100 }, 5)).toBe(true)
      expect(hitTestShape(arrow, { x: 10, y: 10 }, 5)).toBe(false)
    })

    it('supports hollow border hit testing so inner elements are not blocked', () => {
      // Point on the border of rect
      expect(hitTestShape(rect, { x: 200, y: 230 }, 5, true)).toBe(true)
      // Point in the deep center of hollow rect: false when hollowBorderOnly is true, true when false
      expect(hitTestShape(rect, { x: 250, y: 230 }, 5, true)).toBe(false)
      expect(hitTestShape(rect, { x: 250, y: 230 }, 5, false)).toBe(true)
    })

    it('detects hits inside image and blur shapes completely', () => {
      expect(hitTestShape(imageShape, { x: 440, y: 440 }, 5)).toBe(true)
      expect(hitTestShape(imageShape, { x: 300, y: 300 }, 5)).toBe(false)
    })
  })

  describe('moveShape (dragging / nudging)', () => {
    it('translates arrow endpoints by (dx, dy)', () => {
      const moved = moveShape(arrow, 20, -10)
      if (moved.tool === 'arrow') {
        expect(moved.from).toEqual({ x: 70, y: 40 })
        expect(moved.to).toEqual({ x: 170, y: 90 })
      }
    })

    it('translates box shape rects by (dx, dy)', () => {
      const moved = moveShape(rect, 15, 25)
      if (moved.tool === 'rect') {
        expect(moved.rect).toEqual({ x: 215, y: 225, width: 100, height: 60 })
      }
    })
  })

  describe('resizeShapeHandle (interactive transform)', () => {
    it('resizes arrow endpoints to pointer position', () => {
      const reshaped = resizeShapeHandle(arrow, 'to', { x: 180, y: 120 })
      if (reshaped.tool === 'arrow') {
        expect(reshaped.from).toEqual({ x: 50, y: 50 })
        expect(reshaped.to).toEqual({ x: 180, y: 120 })
      }
    })

    it('resizes rect via corner and edge handles with normalization', () => {
      // Dragging 'se' corner extends width and height
      const resizedCorner = resizeShapeHandle(rect, 'se', { x: 350, y: 300 })
      if (resizedCorner.tool === 'rect') {
        expect(resizedCorner.rect).toEqual({ x: 200, y: 200, width: 150, height: 100 })
      }

      // Dragging 'w' edge moves left edge, adjusting width
      const resizedEdge = resizeShapeHandle(rect, 'w', { x: 180, y: 230 })
      if (resizedEdge.tool === 'rect') {
        expect(resizedEdge.rect).toEqual({ x: 180, y: 200, width: 120, height: 60 })
      }

      // Dragging past opposite edge flips cleanly without negative dimensions
      const flipped = resizeShapeHandle(rect, 'nw', { x: 350, y: 300 })
      if (flipped.tool === 'rect') {
        expect(flipped.rect.width).toBeGreaterThan(0)
        expect(flipped.rect.height).toBeGreaterThan(0)
        expect(flipped.rect).toEqual({ x: 300, y: 260, width: 50, height: 40 })
      }
    })
  })

  describe('AI Assistant Screenshots Skill', () => {
    it('executes auto_redact_sensitive tool adding blur shapes for sensitive fields', async () => {
      const { createScreenshotsSkill } = await import('../src/renderer/ai/screenshots-skill')
      const added: Shape[] = []
      const skill = createScreenshotsSkill({
        getImageDimensions: () => ({ width: 1920, height: 1080 }),
        getCurrentShapes: () => [],
        addShapes: (shapes) => added.push(...shapes),
        cropImage: () => {},
        clearShapes: () => {},
      })

      const result = await skill.executeTool({
        id: 'call-1',
        name: 'auto_redact_sensitive',
        input: {
          targets: [
            { x: 100, y: 150, width: 200, height: 30, label: 'email' },
            { x: 100, y: 220, width: 140, height: 28, label: 'phone' },
          ],
        },
      })

      expect(result.mutated).toBe(true)
      expect(result.summary).toContain('2')
      expect(added).toHaveLength(2)
      expect(added[0].tool).toBe('blur')
      if (added[0].tool === 'blur') {
        expect(added[0].rect).toEqual({ x: 100, y: 150, width: 200, height: 30 })
      }
    })

    it('executes annotate_screenshot tool adding arrows and step badges', async () => {
      const { createScreenshotsSkill } = await import('../src/renderer/ai/screenshots-skill')
      const added: Shape[] = []
      const skill = createScreenshotsSkill({
        getImageDimensions: () => ({ width: 1920, height: 1080 }),
        getCurrentShapes: () => [],
        addShapes: (shapes) => added.push(...shapes),
        cropImage: () => {},
        clearShapes: () => {},
      })

      const result = await skill.executeTool({
        id: 'call-2',
        name: 'annotate_screenshot',
        input: {
          annotations: [
            {
              type: 'arrow',
              color: '#e03131',
              width: 4,
              from: { x: 50, y: 50 },
              to: { x: 150, y: 150 },
            },
            {
              type: 'step',
              color: '#0077cd',
              x: 150,
              y: 150,
              stepNumber: 1,
            },
          ],
        },
      })

      expect(result.mutated).toBe(true)
      expect(added).toHaveLength(2)
      expect(added[0].tool).toBe('arrow')
      expect(added[1].tool).toBe('step')
    })

    it('executes crop_screenshot and OCR extraction tools', async () => {
      const { createScreenshotsSkill } = await import('../src/renderer/ai/screenshots-skill')
      let croppedRect: Rect | null = null
      const skill = createScreenshotsSkill({
        getImageDimensions: () => ({ width: 1920, height: 1080 }),
        getCurrentShapes: () => [],
        addShapes: () => {},
        cropImage: (r) => {
          croppedRect = r
        },
        clearShapes: () => {},
      })

      const cropRes = await skill.executeTool({
        id: 'call-3',
        name: 'crop_screenshot',
        input: { x: 50, y: 50, width: 640, height: 480 },
      })
      expect(cropRes.mutated).toBe(true)
      expect(croppedRect).toEqual({ x: 50, y: 50, width: 640, height: 480 })

      const ocrRes = await skill.executeTool({
        id: 'call-4',
        name: 'extract_text_ocr',
        input: { extractedText: 'Xin chào VuaOffice' },
      })
      expect(ocrRes.output).toBe('Xin chào VuaOffice')
      expect(ocrRes.mutated).toBe(false)
    })
  })
})

