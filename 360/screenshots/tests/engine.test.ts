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
} from '../src/shared/geometry'
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

    it('taperedArrowPolygon generates 7 points with expanding shaft matching Yandex.Disk', () => {
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

describe('Crop frame (Yandex.Disk style handles)', () => {
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

describe('Keyboard shortcuts (Yandex.Disk parity)', () => {
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
