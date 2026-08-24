/**
 * Cross-highlight ("reading mode"): while navigating, the active cell's whole
 * row and column carry a translucent band so wide sheets stay readable
 * (issue #112). The bands are float-DOM layers anchored to ranges — the same
 * mechanism the page-break preview and formula-audit traces use — so they
 * scroll and zoom with the grid. Off by default; the View tab toggles it and
 * the choice persists in localStorage.
 */
import type { UniverRuntime } from './univer-state'

interface Disposable {
  dispose(): void
}

/// Float-DOM layers are not free: cap the walked extent so a million-row
/// sheet cannot freeze the grid (the page-break preview draws the line at
/// the same numbers). Beyond the cap the bands simply stop short.
export const CROSS_HIGHLIGHT_MAX_ROWS = 20_000
export const CROSS_HIGHLIGHT_MAX_COLUMNS = 2_000

/** One translucent band anchored over the grid. */
export interface CrossHighlightLayer {
  readonly key: 'row' | 'column'
  readonly startRow: number
  readonly startColumn: number
  readonly rowCount: number
  readonly columnCount: number
}

/// The row and column bands covering an active cell, clamped to the walked
/// extent. Empty when the cell sits outside the extent (freshly inserted
/// rows before metadata catches up, for example).
export function crossHighlightLayers(
  activeRow: number,
  activeColumn: number,
  extentRows: number,
  extentColumns: number,
): CrossHighlightLayer[] {
  // Zero/negative extents mean the sheet metadata is not ready yet.
  if (!(extentRows > 0) || !(extentColumns > 0)) return []
  const rows = Math.min(Math.max(Math.floor(extentRows), 1), CROSS_HIGHLIGHT_MAX_ROWS)
  const columns = Math.min(Math.max(Math.floor(extentColumns), 1), CROSS_HIGHLIGHT_MAX_COLUMNS)
  if (!Number.isFinite(activeRow) || !Number.isFinite(activeColumn)) return []
  if (activeRow < 0 || activeColumn < 0 || activeRow >= rows || activeColumn >= columns) return []
  return [
    { key: 'row', startRow: activeRow, startColumn: 0, rowCount: 1, columnCount: columns },
    { key: 'column', startRow: 0, startColumn: activeColumn, rowCount: rows, columnCount: 1 },
  ]
}

const STORAGE_KEY = 'ai-sheets-cross-highlight'

/**
 * Per-axis maximum of two extent sources (either may be missing): the
 * file-backed sheet extent and the grid's loaded extent. Null only when
 * neither source knows anything.
 */
export function mergeExtents(
  primary: { rows: number; columns: number } | null | undefined,
  secondary: { rows: number; columns: number } | null | undefined,
): { rows: number; columns: number } | null {
  if (!primary && !secondary) return null
  return {
    rows: Math.max(primary?.rows ?? 0, secondary?.rows ?? 0),
    columns: Math.max(primary?.columns ?? 0, secondary?.columns ?? 0),
  }
}

/** The persisted View-tab toggle; defaults to off (also headless-safe). */
export function loadCrossHighlightPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // No localStorage (tests, blocked storage): the safe default is off.
    return false
  }
}

export function storeCrossHighlightPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // Preference stays session-only when storage is unavailable.
  }
}

export interface CrossHighlightOptions {
  /// Sheet data extent in screen coordinates; under lazy streaming
  /// getLastRow/getLastColumn only see what already streamed in, so the app
  /// supplies the file-backed numbers (null falls back to the loaded ones).
  extents: () => { rows: number; columns: number } | null
}

export interface CrossHighlightHandle {
  setVisible(visible: boolean): void
  dispose(): void
}

/** Milliseconds of selection settle time before reinstalling the bands. */
const SETTLE_MS = 60

/**
 * Subscribes to selection/sheet changes once and keeps two float-DOM bands
 * tracking the active cell whenever the feature is enabled. Reinstalling a
 * band means disposing and re-adding it (float anchors are static), which
 * is why moves are debounced and skipped when the cell did not change.
 */
export function installCrossHighlight(
  runtime: UniverRuntime,
  options: CrossHighlightOptions,
): CrossHighlightHandle {
  let visible = false
  let layers: Disposable[] = []
  let installedKey = ''
  let prefix = 0
  let settleTimer: ReturnType<typeof setTimeout> | null = null

  const clearLayers = (): void => {
    for (const layer of layers) {
      try {
        layer.dispose()
      } catch {
        // The float layer already died with a closed workbook or sheet.
      }
    }
    layers = []
    installedKey = ''
  }

  const apply = (): void => {
    settleTimer = null
    if (!visible) return
    let position: { sheetId: string; row: number; column: number } | null = null
    try {
      const workbook = runtime.univerAPI.getActiveWorkbook()
      const worksheet = workbook?.getActiveSheet()
      const range = workbook?.getActiveRange()
      if (workbook && worksheet && range) {
        position = {
          sheetId: worksheet.getSheetId(),
          row: range.getRow(),
          column: range.getColumn(),
        }
      }
    } catch {
      position = null
    }
    if (!position) {
      clearLayers()
      return
    }
    const key = `${position.sheetId}:${position.row}:${position.column}`
    if (key === installedKey) return
    clearLayers()
    const loaded = (() => {
      try {
        const worksheet = runtime.univerAPI.getActiveWorkbook()?.getActiveSheet()
        if (!worksheet) return null
        return { rows: worksheet.getLastRow() + 1, columns: worksheet.getLastColumn() + 1 }
      } catch {
        return null
      }
    })()
    // Mirror page-break preview: the bands must reach past the data extent,
    // so take the max of what the app reports (file-backed, journal-shifted)
    // and whatever has already streamed into the grid.
    const extent = mergeExtents(options.extents(), loaded)
    const bands = crossHighlightLayers(
      position.row,
      position.column,
      extent?.rows ?? 1,
      extent?.columns ?? 1,
    )
    if (bands.length === 0) return
    prefix += 1
    const worksheet = (() => {
      try {
        return runtime.univerAPI.getActiveWorkbook()?.getSheetBySheetId(position!.sheetId) ?? null
      } catch {
        return null
      }
    })()
    if (!worksheet) return
    for (const band of bands) {
      const componentKey = `sheets-crosshair-${prefix}-${band.key}`
      try {
        layers.push(
          runtime.univerAPI.registerComponent(componentKey, () => (
            <div className={`sheets-crosshair-band crosshair-${band.key}`} />
          )),
        )
        const floating = worksheet.addFloatDomToRange(
          worksheet.getRange(band.startRow, band.startColumn, band.rowCount, band.columnCount),
          { componentKey, allowTransform: false, eventPassThrough: true },
          {},
          componentKey,
        )
        if (floating) layers.push(floating)
      } catch {
        // Closed workbook mid-install; drop whatever landed.
        clearLayers()
        return
      }
    }
    installedKey = key
  }

  const schedule = (): void => {
    if (!visible) return
    if (settleTimer !== null) clearTimeout(settleTimer)
    settleTimer = setTimeout(apply, SETTLE_MS)
  }

  const disposables: Disposable[] = []
  disposables.push(runtime.univerAPI.addEvent(runtime.univerAPI.Event.SelectionChanged, schedule))
  disposables.push(runtime.univerAPI.addEvent(runtime.univerAPI.Event.ActiveSheetChanged, schedule))

  return {
    setVisible(next: boolean): void {
      visible = next
      if (!next) {
        if (settleTimer !== null) clearTimeout(settleTimer)
        settleTimer = null
        clearLayers()
        return
      }
      apply()
    },
    dispose(): void {
      if (settleTimer !== null) clearTimeout(settleTimer)
      settleTimer = null
      clearLayers()
      for (const disposable of disposables) disposable.dispose()
    },
  }
}
