import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IRange } from '@univerjs/core'
import { FindModel, type IFindMatch } from '@univerjs/find-replace'
import { Subject } from 'rxjs'

import {
  buildLazyCellTest,
  collectJournalMatches,
  coveredByWindow,
  extraComparator,
  installLazyFindBridge,
  mergeFindMatches,
  planLazyFind,
  scalarToText,
  type LazyCellMatch,
} from '../src/renderer/lazy-find'
import { ensureLazyRangeLoaded, readSheetRangeMapped } from '../src/renderer/univer-sync'
import type { LazyWorkbookState } from '../src/renderer/univer-state'

vi.mock('../src/renderer/univer-sync', () => ({
  readSheetRangeMapped: vi.fn(),
  ensureLazyRangeLoaded: vi.fn().mockResolvedValue(true),
}))

vi.mock('../src/renderer/i18n/locale', () => ({
  t: (key: string, params?: Record<string, string>) =>
    `${key}${params ? ` ${JSON.stringify(params)}` : ''}`,
}))

const mockRead = vi.mocked(readSheetRangeMapped)
const mockEnsure = vi.mocked(ensureLazyRangeLoaded)

describe('planLazyFind', () => {
  it('is inactive without a streamed workbook', () => {
    expect(planLazyFind(null)).toBe('inactive')
  })

  it('is inactive once preloading completed', () => {
    expect(planLazyFind(state({ preloadComplete: true }))).toBe('inactive')
  })

  it('extends the search while rows are still streaming', () => {
    expect(planLazyFind(state({ preloadComplete: false }))).toBe('extend')
  })
})

describe('scalarToText', () => {
  it('stringifies like Univer does', () => {
    expect(scalarToText(120)).toBe('120')
    expect(scalarToText(true)).toBe('1')
    expect(scalarToText(false)).toBe('0')
    expect(scalarToText('txt')).toBe('txt')
    expect(scalarToText(null)).toBeNull()
    expect(scalarToText(undefined)).toBeNull()
  })
})

describe('buildLazyCellTest', () => {
  it('matches substrings case-insensitively by default', () => {
    const test = buildLazyCellTest(query({ findString: 'Total' }))
    expect(test?.({ value: 'grand TOTAL', formula: undefined })).toBe(true)
    expect(test?.({ value: 'other', formula: undefined })).toBe(false)
  })

  it('honors case sensitivity', () => {
    const test = buildLazyCellTest(query({ findString: 'Total', caseSensitive: true }))
    expect(test?.({ value: 'grand total', formula: undefined })).toBe(false)
    expect(test?.({ value: 'grand Total', formula: undefined })).toBe(true)
  })

  it('trims spaces (not line breaks) for whole-cell matches', () => {
    const test = buildLazyCellTest(query({ findString: 'total', matchesTheWholeCell: true }))
    expect(test?.({ value: '  total  ', formula: undefined })).toBe(true)
    // Line breaks are kept, mirroring Univer's trimLeadingTrailingWhitespace.
    expect(test?.({ value: 'total\n', formula: undefined })).toBe(false)
    expect(test?.({ value: 'grand total', formula: undefined })).toBe(false)
  })

  it('looks at formulas only when searching formulas', () => {
    const formulaQuery = query({ findString: 'a2*2', findBy: 'formula' })
    expect(formulaQuery.findBy).toBe('formula')
    const test = buildLazyCellTest(formulaQuery)
    expect(test?.({ value: '240', formula: '=A2*2' })).toBe(true)
    expect(test?.({ value: '240', formula: undefined })).toBe(false)
    const valueTest = buildLazyCellTest(query({ findString: '240', findBy: 'value' }))
    expect(valueTest?.({ value: '240', formula: '=A2*2' })).toBe(true)
  })

  it('rejects an empty needle', () => {
    expect(buildLazyCellTest(query({ findString: '' }))).toBeNull()
  })
})

describe('mergeFindMatches', () => {
  const inner = match('s1', 5, 1)
  const extraSame = match('s1', 5, 1)
  const extraFar = match('s1', 900, 0)

  it('keeps inner entries and appends unseen extras', () => {
    const merged = mergeFindMatches([inner], [extraSame, extraFar])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toBe(inner)
    expect(merged[1]).toBe(extraFar)
  })

  it('returns primary untouched without extras', () => {
    const merged = mergeFindMatches([inner], [])
    expect(merged).toEqual([inner])
  })
})

describe('coveredByWindow', () => {
  it('checks the sheet loaded range', () => {
    const lazyState = state({})
    expect(coveredByWindow(lazyState, 's1', 5, 5)).toBe(true)
    expect(coveredByWindow(lazyState, 's1', 50, 0)).toBe(false)
    expect(coveredByWindow(lazyState, 'ghost', 0, 0)).toBe(false)
  })
})

describe('collectJournalMatches', () => {
  it('skips loaded-window edits and cleared cells', () => {
    const lazyState = state({
      journalCells: new Map([
        [
          's1',
          new Map([
            ['0', { row: 5, column: 0, value: 'inside hit', hasValue: true }],
            ['1', { row: 900, column: 0, value: 'outside hit', hasValue: true }],
            ['2', { row: 901, column: 0, value: null, hasValue: false }],
          ]),
        ],
      ]),
    })
    const found = collectJournalMatches(
      lazyState,
      's1',
      buildLazyCellTest(query({ findString: 'hit' }))!,
    )
    expect(found.map((cell) => cell.value)).toEqual(['outside hit'])
  })

  it('tests formulas of journaled cells', () => {
    const lazyState = state({
      journalCells: new Map([
        [
          's1',
          new Map([
            ['0', { row: 20, column: 2, value: null, formula: '=Sum(A1:A9)', hasValue: true }],
          ]),
        ],
      ]),
    })
    const found = collectJournalMatches(
      lazyState,
      's1',
      buildLazyCellTest(query({ findString: 'sum(', findBy: 'formula' }))!,
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.formula).toBe('=Sum(A1:A9)')
  })
})

describe('extraComparator', () => {
  const order = new Map([
    ['s1', 0],
    ['s2', 1],
  ])
  const cell = (sheetId: string, row: number, column: number) => ({
    sheetId,
    row,
    column,
    value: null,
    formula: undefined,
  })

  it('orders row-major across sheets', () => {
    const compare = extraComparator(order, false)
    expect(compare(cell('s1', 1, 9), cell('s2', 0, 0))).toBeLessThan(0)
    expect(compare(cell('s1', 2, 0), cell('s1', 1, 5))).toBeGreaterThan(0)
    expect(compare(cell('s1', 1, 2), cell('s1', 1, 2))).toBe(0)
  })

  it('orders column-major when requested', () => {
    const compare = extraComparator(order, true)
    expect(compare(cell('s1', 9, 1), cell('s1', 0, 2))).toBeLessThan(0)
  })
})

type FakeOverrides = {
  preloadComplete?: boolean
  journalCells?: LazyWorkbookState['editJournal']['cells']
}

function state(overrides: FakeOverrides): LazyWorkbookState {
  return {
    file: {
      sessionId: 'session-1',
      sheets: [{ id: 's1', name: 'Sheet1', rowCount: 1000, columnCount: 8 }],
    },
    generation: 1,
    loadedRanges: new Map<string, IRange>([
      ['s1', { startRow: 0, endRow: 9, startColumn: 0, endColumn: 9 }],
    ]),
    loadingKeys: new Map(),
    retryTimers: new Map(),
    appliedMerges: new Map(),
    appliedRowKeys: new Map(),
    sheetProtections: new Map(),
    sheetPageBreaks: new Map(),
    sheetProtectedRanges: new Map(),
    uninstalledDefinedNames: new Set(),
    appliedCfSheets: new Set(),
    appliedFilterSheets: new Set(),
    appliedDvSheets: new Set(),
    decorationsPendingSheets: new Set(),
    hyperlinkTargets: new Map(),
    frozenStripKeys: new Map(),
    filterOrigins: new Map(),
    showFormulaSheets: new Set(),
    formulaMode: false,
    editJournal: {
      cells: overrides.journalCells ?? new Map(),
      structuralOps: new Map(),
    },
    flags: { preloadComplete: overrides.preloadComplete ?? false },
    closure: { status: 'idle', pinned: new Map() },
    formulaText: new Map(),
    cachedFormulaValues: new Map(),
    pivotDefinitions: new Map(),
    outline: new Map(),
    recalc: {
      timer: null,
      generation: 0,
      failures: 0,
      formulaCells: new Map(),
      overlay: new Map(),
    },
  } as unknown as LazyWorkbookState
}

function query(overrides: Record<string, unknown> = {}): ReturnType<typeof buildQuery> {
  return buildQuery(overrides)
}

function buildQuery(overrides: Record<string, unknown>) {
  return {
    findString: 'needle',
    caseSensitive: false,
    findBy: 'value',
    findDirection: 'row',
    findScope: 'subunit',
    matchesTheWholeCell: false,
    replaceRevealed: false,
    ...overrides,
  } as Parameters<typeof buildLazyCellTest>[0]
}

function match(sheetId: string, row: number, column: number): LazyCellMatch {
  return {
    provider: 'sheets-find-replace-provider',
    unitId: 'workbook-1',
    isFormula: false,
    range: {
      subUnitId: sheetId,
      range: { startRow: row, endRow: row, startColumn: column, endColumn: column },
    },
  }
}

class FakeInnerModel extends FindModel {
  readonly unitId = 'workbook-1'
  readonly matchesUpdate$ = new Subject<IFindMatch[]>()
  readonly activelyChangingMatch$ = new Subject<LazyCellMatch>()

  constructor(private readonly matches: IFindMatch[]) {
    super()
  }

  getMatches(): IFindMatch[] {
    return this.matches
  }

  moveToNextMatch(): IFindMatch | null {
    return this.matches[0] ?? null
  }

  moveToPreviousMatch(): IFindMatch | null {
    return this.matches[this.matches.length - 1] ?? null
  }

  replace(_replaceString: string): Promise<boolean> {
    return Promise.resolve(false)
  }

  async replaceAll(): Promise<{ success: number; failure: number }> {
    return { success: this.matches.length, failure: 0 }
  }

  focusSelection(): void {}
}

function facade(lazyState: LazyWorkbookState | null) {
  const setValues = vi.fn()
  const worksheet = {
    getSheetId: () => 's1',
    getSheetName: () => 'Sheet1',
    scrollToCell: vi.fn(),
    getRange: vi.fn(() => ({ activate: vi.fn(), setValues })),
  }
  const workbook = {
    getId: () => 'workbook-1',
    getSheets: () => [worksheet],
    getActiveSheet: () => worksheet,
    getSheetBySheetId: (sheetId: string) => (sheetId === 's1' ? worksheet : null),
    getActiveRange: () => ({ getRow: () => 0, getColumn: () => 0 }),
    setActiveSheet: vi.fn(),
  }
  const providers = new Set<unknown>()
  const registrations: { provider: unknown; dispose: () => void }[] = []
  const service = {
    getProviders: () => providers,
    registerFindReplaceProvider: (provider: unknown) => {
      const registration = {
        provider,
        dispose: () => {
          providers.delete(registration.provider)
        },
      }
      providers.add(provider)
      registrations.push(registration)
      return registration
    },
  }
  const runtime = {
    univerAPI: { getActiveWorkbook: () => workbook },
    univer: { __getInjector: () => ({ get: () => service }) },
  }
  return {
    runtime: runtime as unknown as Parameters<typeof installLazyFindBridge>[0]['runtime'],
    lazyWorkbookRef: { current: lazyState },
    setMessage: vi.fn(),
    worksheet,
    workbook,
    setValues,
    providers,
    service,
    registrations,
  }
}

async function settle(model: { getMatches(): unknown[] }): Promise<void> {
  await vi.waitFor(() => {
    expect(mockRead).toHaveBeenCalled()
    expect(model.getMatches().length).toBeGreaterThan(0)
  })
}

type MappedResult = Awaited<ReturnType<typeof readSheetRangeMapped>>

function mapped(
  cells: {
    row: number
    column: number
    value: string | number | boolean | null
    formula?: string
  }[],
): MappedResult {
  return {
    raw: { indexingComplete: true },
    indexedThroughScreen: 999,
    fileEndRow: 999,
    screen: { cells, rows: [], merges: [], hyperlinks: [] },
  } as unknown as MappedResult
}

describe('installLazyFindBridge', () => {
  beforeEach(() => {
    mockRead.mockReset()
    mockEnsure.mockReset()
    mockEnsure.mockResolvedValue(true)
  })

  it('passes through when no streamed workbook is open', async () => {
    const harness = facade(null)
    const inner = new FakeInnerModel([match('s1', 1, 1)])
    const builtin = { find: vi.fn().mockResolvedValue([inner]), terminate: vi.fn() }
    harness.providers.add(builtin)
    const bridge = installLazyFindBridge(harness)

    const models = await harnessLookup(harness)(query())
    expect(models).toHaveLength(1)
    expect(models[0]).toBe(inner)
    bridge.dispose()
    // The wrapper left, the built-in stayed registered.
    expect([...harness.providers]).toContain(builtin)
  })

  it('extends the session with out-of-window hits and focuses them', async () => {
    const harness = facade(state({}))
    const inner = new FakeInnerModel([])
    const builtin = { find: vi.fn().mockResolvedValue([inner]), terminate: vi.fn() }
    harness.providers.add(builtin)
    const bridge = installLazyFindBridge(harness)

    mockRead.mockResolvedValue(
      mapped([
        { row: 500, column: 3, value: 'deep needle' },
        { row: 5, column: 3, value: 'window needle' },
      ]),
    )

    const models = await harnessLookup(harness)(query())
    expect(models).toHaveLength(1)
    const model = models[0]!
    await settle(model)

    const matches = model.getMatches()
    // The in-window file hit belongs to the (empty) inner list; only the deep one is added.
    expect(matches).toHaveLength(1)
    expect((matches[0] as LazyCellMatch).range.range.startRow).toBe(500)

    const focused = model.moveToNextMatch()
    expect(focused).not.toBeNull()
    expect(harness.worksheet.scrollToCell).toHaveBeenCalledWith(500, 3)
    expect(mockEnsure).toHaveBeenCalled()
    bridge.dispose()
  })

  it('dedupes hits the inner model also reports', async () => {
    const harness = facade(state({}))
    const inner = new FakeInnerModel([match('s1', 500, 3)])
    const builtin = { find: vi.fn().mockResolvedValue([inner]), terminate: vi.fn() }
    harness.providers.add(builtin)
    const bridge = installLazyFindBridge(harness)

    mockRead.mockResolvedValue(mapped([{ row: 500, column: 3, value: 'same needle' }]))

    const models = await harnessLookup(harness)(query())
    const model = models[0]!
    await settle(model)
    expect(model.getMatches()).toHaveLength(1)
    bridge.dispose()
  })

  it('reports truncated scans through the status message', async () => {
    const harness = facade(state({}))
    const inner = new FakeInnerModel([])
    const builtin = { find: vi.fn().mockResolvedValue([inner]), terminate: vi.fn() }
    harness.providers.add(builtin)
    const bridge = installLazyFindBridge(harness)

    mockRead.mockRejectedValue(new Error('sidecar gone'))

    const models = await harnessLookup(harness)(query())
    const model = models[0]!
    await vi.waitFor(() => expect(harness.setMessage).toHaveBeenCalled())
    expect(model.getMatches()).toHaveLength(0)
    bridge.dispose()
  })
})

/** Runs a find through the provider the bridge registered (last registration). */
function harnessLookup(harness: ReturnType<typeof facade>): (q: unknown) => Promise<FindModel[]> {
  const registration = harness.registrations[harness.registrations.length - 1]!
  const wrapper = registration.provider as { find: (q: unknown) => Promise<FindModel[]> }
  expect(typeof wrapper.find).toBe('function')
  return (q) => wrapper.find(q)
}
