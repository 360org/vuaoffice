/**
 * Full-sheet Find coverage for streamed (lazy) workbooks.
 *
 * Univer's Find dialog searches the in-memory cell matrix, but a streamed
 * workbook only holds rows that were already scrolled into view, so matches
 * in never-visited rows are invisible and users conclude the data does not
 * exist (issue #113). This module wraps the built-in sheets find provider:
 * the inner model keeps handling everything inside the loaded window, while
 * the wrapper extends the session with out-of-window matches paged from the
 * underlying file via readSheetRangeMapped (journal edits included) — the
 * same approach the AI-side find takes. Focusing an out-of-window match
 * activates its sheet, starts loading its range, scrolls to it, and selects
 * it, so the grid shows real data instead of an empty jump.
 */
import type { IRange } from '@univerjs/core'
import {
  FindBy,
  FindModel,
  IFindReplaceService,
  type IFindMatch,
  type IFindMoveParams,
  type IFindQuery,
  type IFindReplaceProvider,
  type IReplaceAllResult,
} from '@univerjs/find-replace'
import { Subject, type Subscription } from 'rxjs'
import { FILE_READ_BATCH_CELLS, MAX_SCAN_CELLS } from './ai/workbook-search'
import { t } from './i18n/locale'
import { netAxisDelta } from './view-transform'
import type { LazyWorkbookState, UniverRuntime } from './univer-state'
import { ensureLazyRangeLoaded, readSheetRangeMapped } from './univer-sync'

/** Same match shape the built-in sheets provider produces (ISheetCellMatch). */
export interface LazyCellMatch extends IFindMatch {
  isFormula: boolean
  replaceable?: boolean
  /// Extra bookkeeping the wrapper needs to focus/replace the hit; ignored
  /// by Univer's composite model.
  range: { subUnitId: string; range: IRange }
  matchedText?: string | null
}

export interface LazyCellTexts {
  /** Display/computed value stringified like Univer's extractPureValue. */
  value: string | null
  formula: string | undefined
}

type LazyCellTest = (cell: LazyCellTexts) => boolean

/** Whether a find session needs the file-backed extension for this workbook. */
export function planLazyFind(state: LazyWorkbookState | null): 'inactive' | 'extend' {
  if (!state || state.flags.preloadComplete) return 'inactive'
  return 'extend'
}

/// Stringifies a scalar like Univer's extractPureValue: numbers become their
/// decimal text, booleans become "1"/"0".
export function scalarToText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return `${value}`
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value)
}

/// Mirrors Univer's matchCellData/hitCell semantics for file-backed cells:
/// substring vs whole-cell (spaces trimmed, line breaks kept), case
/// sensitivity, and formula-vs-value look-in.
export function buildLazyCellTest(query: IFindQuery): LazyCellTest | null {
  const needleRaw = query.findString
  if (!needleRaw) return null
  const caseSensitive = query.caseSensitive === true
  // The built-in model lowercases the needle once up front (its parsed
  // query); do the same here so both models agree on what a hit is.
  const needle = caseSensitive ? needleRaw : needleRaw.toLowerCase()
  const matches = (text: string | null | undefined): boolean => {
    if (text === null || text === undefined) return false
    const haystack = caseSensitive ? text : text.toLowerCase()
    if (query.matchesTheWholeCell) {
      const trimmed = haystack.replace(/^ +/g, '').replace(/ +$/g, '')
      return trimmed === needle
    }
    return haystack.includes(needle)
  }
  return ({ value, formula }) => {
    if (formula && query.findBy === FindBy.FORMULA) return matches(formula)
    return matches(value)
  }
}

function insideRange(range: IRange | undefined, row: number, column: number): boolean {
  if (!range) return false
  return (
    row >= range.startRow &&
    row <= range.endRow &&
    column >= range.startColumn &&
    column <= range.endColumn
  )
}

/** True when the loaded window covers the coordinate — the inner model owns it. */
export function coveredByWindow(
  state: LazyWorkbookState,
  sheetId: string,
  row: number,
  column: number,
): boolean {
  return insideRange(state.loadedRanges.get(sheetId), row, column)
}

function matchKey(match: LazyCellMatch): string {
  return `${match.range.subUnitId}|${match.range.range.startRow}|${match.range.range.startColumn}`
}

/** Dedupes inner-model matches against the extension's; inner entries win. */
export function mergeFindMatches(primary: IFindMatch[], extra: LazyCellMatch[]): IFindMatch[] {
  if (extra.length === 0) return primary
  const seen = new Set(primary.map((match) => matchKey(match as LazyCellMatch)))
  const merged = [...primary]
  for (const match of extra) {
    const key = matchKey(match)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(match)
  }
  return merged
}

interface ScanCell {
  readonly row: number
  readonly column: number
  readonly value: string | number | boolean | null
  readonly formula: string | undefined
}

/** Journal edits of one sheet that sit outside the loaded window. */
export function collectJournalMatches(
  state: LazyWorkbookState,
  sheetId: string,
  test: LazyCellTest,
): ScanCell[] {
  const found: ScanCell[] = []
  const journal = state.editJournal.cells.get(sheetId)
  for (const entry of journal?.values() ?? []) {
    if (!entry.hasValue) continue
    if (coveredByWindow(state, sheetId, entry.row, entry.column)) continue
    if (!test({ value: scalarToText(entry.value), formula: entry.formula })) continue
    found.push({ row: entry.row, column: entry.column, value: entry.value, formula: entry.formula })
  }
  return found
}

/** Coordinates whose file cell is shadowed by a journal edit this session. */
export function journalShadowKeys(state: LazyWorkbookState, sheetId: string): Set<string> {
  const shadowed = new Set<string>()
  const journal = state.editJournal.cells.get(sheetId)
  for (const entry of journal?.values() ?? []) shadowed.add(`${entry.row}:${entry.column}`)
  return shadowed
}

/** Row-major/column-major ordering across sheets, following the query direction. */
export function extraComparator(
  sheetOrder: ReadonlyMap<string, number>,
  columnDirection: boolean,
): (a: ScanCell & { sheetId: string }, b: ScanCell & { sheetId: string }) => number {
  return (a, b) => {
    const sheetDelta = (sheetOrder.get(a.sheetId) ?? 0) - (sheetOrder.get(b.sheetId) ?? 0)
    if (sheetDelta !== 0) return sheetDelta
    return columnDirection
      ? a.column - b.column || a.row - b.row
      : a.row - b.row || a.column - b.column
  }
}

function makeCellMatch(
  unitId: string,
  sheetId: string,
  cell: ScanCell,
  findByFormula: boolean,
): LazyCellMatch {
  const isFormula = Boolean(cell.formula)
  return {
    provider: 'sheets-find-replace-provider',
    unitId,
    isFormula,
    // Formula hits are only replaced when searching formulas (mirrors the
    // built-in model); plain cells behave exactly like in-memory ones.
    replaceable: isFormula ? findByFormula : cell.value !== null && cell.value !== undefined,
    matchedText: (findByFormula && isFormula ? cell.formula : scalarToText(cell.value)) ?? null,
    range: {
      subUnitId: sheetId,
      range: {
        startRow: cell.row,
        endRow: cell.row,
        startColumn: cell.column,
        endColumn: cell.column,
      },
    },
  }
}

export interface LazyFindBridgeDeps {
  runtime: UniverRuntime
  lazyWorkbookRef: { current: LazyWorkbookState | null }
  setMessage: (message: string) => void
}

interface InnerFindModel extends FindModel {
  readonly unitId: string
  focusSelection(): void
}

/**
 * Replaces the registered sheets find provider with a wrapper while the app
 * lives. Non-streamed workbooks flow straight through; streamed ones get the
 * extended model. Nothing is restored on dispose: the whole runtime dies
 * with the component that installed the bridge.
 */
export function installLazyFindBridge(deps: LazyFindBridgeDeps): { dispose(): void } {
  const service = deps.runtime.univer.__getInjector().get(IFindReplaceService)
  const providers = service.getProviders()
  let generation = 0
  const wrapper: IFindReplaceProvider = {
    async find(query: IFindQuery) {
      generation += 1
      const liveGeneration = generation
      // Adopt whichever built-in providers exist now — the sheets controller
      // registers one per workbook, while this wrapper survives across
      // workbooks for the lifetime of the renderer.
      const models: FindModel[] = []
      for (const builtin of [...providers]) {
        if (builtin === wrapper) continue
        models.push(...(await builtin.find(query)))
      }
      const state = deps.lazyWorkbookRef.current
      if (!state || planLazyFind(state) !== 'extend' || models.length === 0) return models
      return models.map(
        (model) =>
          new LazyExtendedFindModel(
            model as InnerFindModel,
            state,
            query,
            deps,
            () => generation === liveGeneration,
          ),
      )
    },
    terminate() {
      generation += 1
      for (const builtin of [...providers]) {
        if (builtin !== wrapper) builtin.terminate()
      }
    },
  }
  const registration = service.registerFindReplaceProvider(wrapper)
  return {
    dispose() {
      generation += 1
      registration.dispose()
    },
  }
}

/**
 * A FindModel combining the built-in in-window session with out-of-window
 * hits paged from the underlying file. The inner model keeps navigating and
 * highlighting everything it can see; this wrapper only steps in when the
 * inner session runs out, and hands focus back once the jumped-to region is
 * materialized in the grid (the inner model re-runs on mutations and takes
 * over navigation there).
 */
export class LazyExtendedFindModel extends FindModel {
  readonly unitId: string

  readonly matchesUpdate$ = new Subject<IFindMatch[]>()
  readonly activelyChangingMatch$ = new Subject<LazyCellMatch>()

  private readonly state: LazyWorkbookState
  private readonly query: IFindQuery
  private readonly deps: LazyFindBridgeDeps
  private readonly isLiveGeneration: () => boolean

  private alive = true
  private truncated = false
  private extras: LazyCellMatch[] = []
  private lastFocusedExtra: LazyCellMatch | null = null
  private readonly forwardSub: Subscription

  constructor(
    private readonly inner: InnerFindModel,
    state: LazyWorkbookState,
    query: IFindQuery,
    deps: LazyFindBridgeDeps,
    isLiveGeneration: () => boolean,
  ) {
    super()
    this.state = state
    this.query = query
    this.deps = deps
    this.isLiveGeneration = isLiveGeneration
    this.unitId = inner.unitId
    // The inner model refreshes itself when grid mutations stream regions in
    // or evict them; forward those moments so the dialog count stays right.
    this.forwardSub = inner.matchesUpdate$.subscribe(() => this.emitMerged())
    void this.runScan()
  }

  override dispose(): void {
    this.alive = false
    this.forwardSub.unsubscribe()
    this.matchesUpdate$.complete()
    this.activelyChangingMatch$.complete()
    super.dispose()
  }

  getMatches(): IFindMatch[] {
    return mergeFindMatches(this.innerMatches(), this.currentExtras())
  }

  moveToNextMatch(params?: IFindMoveParams): LazyCellMatch | null {
    const candidate = this.innerNeighbor('next', params)
    if (candidate) {
      if (!params?.noFocus) this.safeInnerFocus()
      return candidate as LazyCellMatch
    }
    const target = this.neighborExtra('next', params)
    if (!target) return null
    if (!params?.noFocus) this.focusExtra(target)
    return target
  }

  moveToPreviousMatch(params?: IFindMoveParams): LazyCellMatch | null {
    const candidate = this.innerNeighbor('previous', params)
    if (candidate) {
      if (!params?.noFocus) this.safeInnerFocus()
      return candidate as LazyCellMatch
    }
    const target = this.neighborExtra('previous', params)
    if (!target) return null
    if (!params?.noFocus) this.focusExtra(target)
    return target
  }

  async replace(replaceString: string): Promise<boolean> {
    try {
      if (await this.inner.replace(replaceString)) return true
    } catch {
      /* no inner current match — fall through to the extension's */
    }
    const extra = this.lastFocusedExtra
    if (!extra || extra.replaceable !== true) return false
    return this.writeExtraReplacement(extra, replaceString)
  }

  async replaceAll(replaceString: string): Promise<IReplaceAllResult> {
    let success = 0
    let failure = 0
    try {
      const result = await this.inner.replaceAll(replaceString)
      success += result.success
      failure += result.failure
    } catch {
      /* the inner session may already be gone; still report the extension's */
    }
    for (const extra of this.currentExtras()) {
      if (extra.replaceable !== true) {
        failure += 1
        continue
      }
      if (await this.writeExtraReplacement(extra, replaceString)) success += 1
      else failure += 1
    }
    return { success, failure }
  }

  focusSelection(): void {
    if (this.lastFocusedExtra) {
      this.focusExtra(this.lastFocusedExtra)
      return
    }
    this.safeInnerFocus()
  }

  private safeInnerFocus(): void {
    try {
      this.inner.focusSelection()
    } catch {
      /* closed workbook */
    }
  }

  private innerNeighbor(
    direction: 'next' | 'previous',
    params?: IFindMoveParams,
  ): IFindMatch | null {
    try {
      return direction === 'next'
        ? this.inner.moveToNextMatch({ ...params, noFocus: true })
        : this.inner.moveToPreviousMatch({ ...params, noFocus: true })
    } catch {
      return null
    }
  }

  private innerMatches(): IFindMatch[] {
    try {
      return this.inner.getMatches()
    } catch {
      return []
    }
  }

  /** Extras that are still outside the (evolving) loaded window. */
  private currentExtras(): LazyCellMatch[] {
    return this.extras.filter(
      (match) =>
        !coveredByWindow(
          this.state,
          match.range.subUnitId,
          match.range.range.startRow,
          match.range.range.startColumn,
        ),
    )
  }

  /**
   * Steps into the extension's territory: the first out-of-window hit after
   * (or before) the current selection, looping like the built-in model.
   */
  private neighborExtra(
    direction: 'next' | 'previous',
    params?: IFindMoveParams,
  ): LazyCellMatch | null {
    const candidates = this.currentExtras()
    if (candidates.length === 0) return null
    const order = this.sheetOrderIndex()
    const positionOf = (match: LazyCellMatch): [number, number, number] => {
      const bounds = match.range.range
      return [
        order.get(match.range.subUnitId) ?? Number.MAX_SAFE_INTEGER,
        direction === 'next' ? bounds.startRow : -bounds.startRow,
        direction === 'next' ? bounds.startColumn : -bounds.startColumn,
      ]
    }
    const reference = this.referencePosition(order)
    if (!reference) {
      return direction === 'next' ? candidates[0]! : candidates[candidates.length - 1]!
    }
    const referencePosition_: [number, number, number] =
      direction === 'next'
        ? [reference.sheetIndex, reference.row, reference.column]
        : [reference.sheetIndex, -reference.row, -reference.column]
    const ordered = [...candidates].sort((a, b) => compareTriples(positionOf(a), positionOf(b)))
    const neighbor =
      ordered.find((match) => compareTriples(positionOf(match), referencePosition_) > 0) ?? null
    if (neighbor) return neighbor
    if (params?.loop === false) return null
    return direction === 'next' ? ordered[0]! : ordered[ordered.length - 1]!
  }

  private sheetOrderIndex(): Map<string, number> {
    try {
      const sheets = this.deps.runtime.univerAPI.getActiveWorkbook()?.getSheets() ?? []
      return new Map(sheets.map((sheet, index) => [sheet.getSheetId(), index] as const))
    } catch {
      return new Map()
    }
  }

  private referencePosition(
    order: ReadonlyMap<string, number>,
  ): { sheetIndex: number; row: number; column: number } | null {
    try {
      const workbook = this.deps.runtime.univerAPI.getActiveWorkbook()
      const range = workbook?.getActiveRange()
      const activeSheet = workbook?.getActiveSheet()
      if (!workbook || !range || !activeSheet) return null
      return {
        sheetIndex: order.get(activeSheet.getSheetId()) ?? Number.MAX_SAFE_INTEGER,
        row: range.getRow(),
        column: range.getColumn(),
      }
    } catch {
      return this.lastFocusedExtra
        ? {
            sheetIndex: order.get(this.lastFocusedExtra.range.subUnitId) ?? Number.MAX_SAFE_INTEGER,
            row: this.lastFocusedExtra.range.range.startRow,
            column: this.lastFocusedExtra.range.range.startColumn,
          }
        : null
    }
  }

  /** Activate the sheet, load the region, scroll to it, and select the cell. */
  private focusExtra(match: LazyCellMatch): void {
    this.lastFocusedExtra = match
    try {
      const workbook = this.deps.runtime.univerAPI.getActiveWorkbook()
      if (!workbook) return
      const worksheet = workbook.getSheetBySheetId(match.range.subUnitId)
      if (!worksheet) return
      if (worksheet.getSheetId() !== workbook.getActiveSheet()?.getSheetId()) {
        workbook.setActiveSheet(worksheet)
      }
      const bounds = match.range.range
      // Best-effort streaming: the scroll below also triggers the regular
      // viewport load; this makes sure the exact hit lands even when the
      // visible window math picks a different anchor.
      void ensureLazyRangeLoaded(
        this.deps.runtime,
        this.deps.lazyWorkbookRef,
        worksheet,
        {
          startRow: bounds.startRow,
          endRow: bounds.endRow,
          startColumn: bounds.startColumn,
          endColumn: bounds.endColumn,
        },
        this.deps.setMessage,
      )
      worksheet.scrollToCell(bounds.startRow, bounds.startColumn)
      worksheet.getRange(bounds.startRow, bounds.startColumn, 1, 1).activate()
      this.emitMerged()
      this.activelyChangingMatch$.next(match)
    } catch {
      /* closed workbook mid-jump */
    }
  }

  /** Writes the replacement straight onto the cell; the journal carries it. */
  private async writeExtraReplacement(
    match: LazyCellMatch,
    replaceString: string,
  ): Promise<boolean> {
    try {
      const workbook = this.deps.runtime.univerAPI.getActiveWorkbook()
      const worksheet = workbook?.getSheetBySheetId(match.range.subUnitId)
      if (!worksheet) return false
      const bounds = match.range.range
      const target = worksheet.getRange(bounds.startRow, bounds.startColumn, 1, 1)
      if (match.isFormula) {
        target.setValues([
          [{ f: replaceAllOccurrences(match.matchedText ?? '', this.query, replaceString) }],
        ])
      } else {
        target.setValues([
          [{ v: replaceAllOccurrences(match.matchedText ?? '', this.query, replaceString) }],
        ])
      }
      return true
    } catch {
      return false
    }
  }

  private emitMerged(): void {
    if (!this.alive) return
    this.matchesUpdate$.next(this.getMatches())
  }

  /** Pages the underlying file for out-of-window hits, emitting as it goes. */
  private async runScan(): Promise<void> {
    const workbook = this.deps.runtime.univerAPI.getActiveWorkbook()
    if (!workbook) return
    const test = buildLazyCellTest(this.query)
    if (!test) return
    const unitId = this.unitId
    const sheets = workbook.getSheets()
    const targets =
      this.query.findScope === 'unit'
        ? sheets
        : sheets.filter((sheet) => sheet.getSheetId() === workbook.getActiveSheet()?.getSheetId())
    const sheetOrder = new Map(sheets.map((sheet, index) => [sheet.getSheetId(), index] as const))
    const comparator = extraComparator(sheetOrder, this.query.findDirection === 'column')
    const collected: (ScanCell & { sheetId: string })[] = []

    for (const worksheet of targets) {
      const sheetId = worksheet.getSheetId()
      // Session edits first — they shadow file cells at the same coordinates.
      for (const cell of collectJournalMatches(this.state, sheetId, test)) {
        collected.push({ ...cell, sheetId })
      }
      const meta = this.state.file.sheets.find((candidate) => candidate.id === sheetId)
      // Sheets added this session live entirely in the journal.
      if (!meta || meta.rowCount <= 0 || meta.columnCount <= 0) {
        this.refreshExtras(collected, comparator, unitId)
        this.emitMerged()
        continue
      }
      const ops = this.state.editJournal.structuralOps.get(sheetId) ?? []
      const screenRows = Math.max(meta.rowCount + netAxisDelta(ops, 'row'), 0)
      const screenColumns = Math.max(meta.columnCount + netAxisDelta(ops, 'column'), 0)
      if (screenRows <= 0 || screenColumns <= 0) continue
      const shadowed = journalShadowKeys(this.state, sheetId)
      const batchRows = Math.max(1, Math.floor(FILE_READ_BATCH_CELLS / screenColumns))
      for (let startRow = 0; startRow < screenRows; startRow += batchRows) {
        if (!this.alive || !this.isLiveGeneration()) return
        if (this.truncated) break
        if (collected.length >= MAX_SCAN_CELLS) {
          this.truncated = true
          break
        }
        const endRow = Math.min(startRow + batchRows - 1, screenRows - 1)
        let mapped
        try {
          mapped = await readSheetRangeMapped(
            this.state,
            sheetId,
            { startRow, endRow, startColumn: 0, endColumn: screenColumns - 1 },
            meta,
          )
        } catch {
          this.truncated = true
          break
        }
        if (!mapped) continue
        if (
          !mapped.raw.indexingComplete &&
          (mapped.indexedThroughScreen === null || mapped.indexedThroughScreen < endRow)
        ) {
          this.truncated = true
        }
        for (const cell of mapped.screen.cells) {
          if (shadowed.has(`${cell.row}:${cell.column}`)) continue
          if (coveredByWindow(this.state, sheetId, cell.row, cell.column)) continue
          if (!test({ value: scalarToText(cell.value), formula: cell.formula })) continue
          collected.push({
            row: cell.row,
            column: cell.column,
            value: cell.value,
            formula: cell.formula,
            sheetId,
          })
        }
        this.refreshExtras(collected, comparator, unitId)
        this.emitMerged()
      }
      if (this.truncated) break
    }

    this.refreshExtras(collected, comparator, unitId)
    if (this.truncated && this.alive && this.isLiveGeneration()) {
      this.deps.setMessage(t('appFindScanTruncated', { cells: MAX_SCAN_CELLS.toLocaleString() }))
    }
    this.emitMerged()
  }

  private refreshExtras(
    collected: (ScanCell & { sheetId: string })[],
    comparator: (a: ScanCell & { sheetId: string }, b: ScanCell & { sheetId: string }) => number,
    unitId: string,
  ): void {
    const findByFormula = this.query.findBy === FindBy.FORMULA
    this.extras = [...collected]
      .sort(comparator)
      .map((cell) => makeCellMatch(unitId, cell.sheetId, cell, findByFormula))
  }
}

/// Substring replacement honoring the query's case sensitivity, replacing
/// every occurrence like Excel's Replace All.
function replaceAllOccurrences(text: string, query: IFindQuery, replaceString: string): string {
  const needle = query.caseSensitive === true ? query.findString : query.findString.toLowerCase()
  if (!needle) return text
  const haystack = query.caseSensitive === true ? text : text.toLowerCase()
  let result = ''
  let cursor = 0
  for (;;) {
    const index = haystack.indexOf(needle, cursor)
    if (index < 0) {
      result += text.slice(cursor)
      break
    }
    result += text.slice(cursor, index) + replaceString
    cursor = index + needle.length
  }
  return result
}

function compareTriples(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}
