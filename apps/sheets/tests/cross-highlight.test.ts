import { describe, expect, it, vi } from 'vitest'

import {
  CROSS_HIGHLIGHT_MAX_COLUMNS,
  CROSS_HIGHLIGHT_MAX_ROWS,
  crossHighlightLayers,
  loadCrossHighlightPreference,
  mergeExtents,
} from '../src/renderer/cross-highlight'

describe('crossHighlightLayers', () => {
  it('returns one full row and one full column band', () => {
    expect(crossHighlightLayers(4, 2, 100, 26)).toEqual([
      { key: 'row', startRow: 4, startColumn: 0, rowCount: 1, columnCount: 26 },
      { key: 'column', startRow: 0, startColumn: 2, rowCount: 100, columnCount: 1 },
    ])
  })

  it('clamps the walked extent to the float-DOM caps', () => {
    const bands = crossHighlightLayers(5, 5, 10_000_000, 500_000)
    expect(bands[0]?.columnCount).toBe(CROSS_HIGHLIGHT_MAX_COLUMNS)
    expect(bands[1]?.rowCount).toBe(CROSS_HIGHLIGHT_MAX_ROWS)
  })

  it('stays empty outside the extent or on invalid input', () => {
    expect(crossHighlightLayers(-1, 0, 10, 10)).toEqual([])
    expect(crossHighlightLayers(0, -1, 10, 10)).toEqual([])
    expect(crossHighlightLayers(10, 0, 10, 10)).toEqual([])
    expect(crossHighlightLayers(Number.NaN, 0, 10, 10)).toEqual([])
    expect(crossHighlightLayers(0, 0, 0, 0)).toEqual([])
  })
})

describe('mergeExtents', () => {
  it('takes the per-axis maximum so bands reach past the data extent', () => {
    expect(mergeExtents({ rows: 100, columns: 26 }, { rows: 150, columns: 20 })).toEqual({
      rows: 150,
      columns: 26,
    })
  })

  it('falls back to whichever source exists', () => {
    expect(mergeExtents(null, { rows: 12, columns: 5 })).toEqual({ rows: 12, columns: 5 })
    expect(mergeExtents({ rows: 40, columns: 9 }, null)).toEqual({ rows: 40, columns: 9 })
    expect(mergeExtents(undefined, undefined)).toBeNull()
  })
})

describe('loadCrossHighlightPreference', () => {
  it('reads the stored flag', () => {
    const store = new Map<string, string>([['ai-sheets-cross-highlight', '1']])
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key) ?? null } })
    expect(loadCrossHighlightPreference()).toBe(true)
    store.set('ai-sheets-cross-highlight', '0')
    expect(loadCrossHighlightPreference()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('defaults to off without a localStorage', () => {
    // No window at all (node test env): must not throw.
    expect(loadCrossHighlightPreference()).toBe(false)
  })
})
