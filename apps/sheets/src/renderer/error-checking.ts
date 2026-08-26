/**
 * Error checking on streamed workbooks: the ribbon command pages the whole
 * underlying file (session journal edits included) instead of only the rows
 * already loaded into Univer's grid — the same approach Ctrl+F takes since
 * #113 — then jumps to the first error after the active cell, loading its
 * range so the grid shows real data instead of scrolling to a blank region.
 */
import type { IRange } from '@univerjs/core'
import { ERROR_VALUE_RE, FILE_READ_BATCH_CELLS, MAX_SCAN_CELLS } from './ai/workbook-search'
import { formatAddress } from '../domain/cell-address'
import { t } from './i18n/locale'
import { netAxisDelta } from './view-transform'
import type { LazyWorkbookState, UniverRuntime } from './univer-state'
import { ensureLazyRangeLoaded, readSheetRangeMapped } from './univer-sync'

export interface SheetError {
  readonly sheetId: string
  readonly row: number
  readonly column: number
  readonly value: string
}

export interface StreamedErrorScan {
  readonly errors: SheetError[]
  readonly truncated: boolean
}

/**
 * First error after the active position in sheet/row/column order, wrapping
 * to the first one — so repeated clicks cycle through all of them.
 */
export function pickNextError(
  errors: readonly SheetError[],
  sheetOrder: ReadonlyMap<string, number>,
  activeSheetId: string,
  activeRow: number,
  activeColumn: number,
): SheetError | null {
  if (errors.length === 0) return null
  const rank = (error: SheetError): [number, number, number] => [
    sheetOrder.get(error.sheetId) ?? Number.MAX_SAFE_INTEGER,
    error.row,
    error.column,
  ]
  const activeRank: [number, number, number] = [
    sheetOrder.get(activeSheetId) ?? Number.MAX_SAFE_INTEGER,
    activeRow,
    activeColumn,
  ]
  const compare = (a: [number, number, number], b: [number, number, number]): number =>
    a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  const ordered = [...errors].sort((a, b) => compare(rank(a), rank(b)))
  return ordered.find((error) => compare(rank(error), activeRank) > 0) ?? ordered[0]!
}

/** Pages every sheet of the underlying file collecting #REF!-style errors. */
export async function scanStreamedWorkbookErrors(
  state: LazyWorkbookState,
): Promise<StreamedErrorScan> {
  const errors: SheetError[] = []
  let truncated = false
  for (const meta of state.file.sheets) {
    const sheetId = meta.id
    // Journal edits first — they shadow file cells at the same coordinates,
    // so an edit that clears or overwrites an error cell hides the file hit.
    const shadowed = new Set<string>()
    const journal = state.editJournal.cells.get(sheetId)
    for (const entry of journal?.values() ?? []) {
      shadowed.add(`${entry.row}:${entry.column}`)
      if (!entry.hasValue) continue
      if (typeof entry.value === 'string' && ERROR_VALUE_RE.test(entry.value)) {
        errors.push({ sheetId, row: entry.row, column: entry.column, value: entry.value })
      }
    }
    // Sheets added this session live entirely in the journal.
    if (meta.rowCount <= 0 || meta.columnCount <= 0) continue
    const ops = state.editJournal.structuralOps.get(sheetId) ?? []
    const screenRows = Math.max(meta.rowCount + netAxisDelta(ops, 'row'), 0)
    const screenColumns = Math.max(meta.columnCount + netAxisDelta(ops, 'column'), 0)
    if (screenRows <= 0 || screenColumns <= 0) continue
    const batchRows = Math.max(1, Math.floor(FILE_READ_BATCH_CELLS / screenColumns))
    for (let startRow = 0; startRow < screenRows; startRow += batchRows) {
      if (truncated) break
      if (errors.length >= MAX_SCAN_CELLS) {
        truncated = true
        break
      }
      const endRow = Math.min(startRow + batchRows - 1, screenRows - 1)
      let mapped
      try {
        mapped = await readSheetRangeMapped(
          state,
          sheetId,
          { startRow, endRow, startColumn: 0, endColumn: screenColumns - 1 },
          meta,
        )
      } catch {
        truncated = true
        break
      }
      if (!mapped) continue
      if (
        !mapped.raw.indexingComplete &&
        (mapped.indexedThroughScreen === null || mapped.indexedThroughScreen < endRow)
      ) {
        truncated = true
      }
      for (const cell of mapped.screen.cells) {
        if (shadowed.has(`${cell.row}:${cell.column}`)) continue
        if (typeof cell.value === 'string' && ERROR_VALUE_RE.test(cell.value)) {
          errors.push({
            sheetId,
            row: cell.row,
            column: cell.column,
            value: cell.value,
          })
        }
      }
    }
    if (truncated) break
  }
  return { errors, truncated }
}

export interface StreamedErrorCheckDeps {
  runtime: UniverRuntime
  lazyWorkbookRef: { current: LazyWorkbookState | null }
  setMessage: (message: string) => void
  refreshSelectionEcho: () => void
}

/// One scan at a time: double-clicking the button must not stack scans or
/// jump twice. Single renderer, single workbook — a module flag is enough.
const scanInFlight = { current: false }

/** Full-file check-and-jump for streamed workbooks; fire-and-forget safe. */
export async function runStreamedErrorCheck(deps: StreamedErrorCheckDeps): Promise<void> {
  const state = deps.lazyWorkbookRef.current
  if (!state || scanInFlight.current) return
  scanInFlight.current = true
  try {
    deps.setMessage(t('appCheckingErrors'))
    const scan = await scanStreamedWorkbookErrors(state)
    const workbook = deps.runtime.univerAPI.getActiveWorkbook()
    if (!workbook) return
    if (scan.errors.length === 0) {
      deps.setMessage(
        scan.truncated
          ? t('appFindScanTruncated', { cells: MAX_SCAN_CELLS.toLocaleString() })
          : t('appNoErrorsFound'),
      )
      return
    }
    const sheets = workbook.getSheets()
    const order = new Map(sheets.map((sheet, index) => [sheet.getSheetId(), index] as const))
    const activeSheet = workbook.getActiveSheet()
    let activeRow = -1
    let activeColumn = -1
    try {
      const range = workbook.getActiveRange()
      if (range) {
        activeRow = range.getRow()
        activeColumn = range.getColumn()
      }
    } catch {
      /* no selection yet — start from the top */
    }
    const next = pickNextError(
      scan.errors,
      order,
      activeSheet?.getSheetId() ?? '',
      activeRow,
      activeColumn,
    )
    if (!next) return
    const target = workbook.getSheetBySheetId(next.sheetId)
    if (!target) return
    if (target.getSheetId() !== activeSheet?.getSheetId()) workbook.setActiveSheet(target)
    // Best-effort streaming: the scroll below also triggers the regular
    // viewport load; this makes sure the exact hit lands even when the
    // visible-window math picks a different anchor.
    const bounds: IRange = {
      startRow: next.row,
      endRow: next.row,
      startColumn: next.column,
      endColumn: next.column,
    }
    await ensureLazyRangeLoaded(deps.runtime, deps.lazyWorkbookRef, target, bounds, deps.setMessage)
    target.getRange(next.row, next.column, 1, 1).activate()
    // Programmatic selection emits no SelectionChanged; refresh the echo.
    deps.refreshSelectionEcho()
    void deps.runtime.univerAPI.executeCommand('sheet.command.scroll-to-cell', { range: bounds })
    deps.setMessage(
      t('appErrorsFound', {
        count: scan.errors.length,
        cell: formatAddress(next.row, next.column),
        value: next.value,
      }),
    )
  } finally {
    scanInFlight.current = false
  }
}
