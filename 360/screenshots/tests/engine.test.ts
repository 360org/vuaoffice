import { describe, it, expect } from 'vitest'
import {
  normalizeRect,
  clampRect,
  arrowHead,
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
