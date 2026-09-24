import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, ReactElement } from 'react'
import logoLockup from './assets/vuaoffice-logo.svg'
import iconDocx from './assets/file-docx.svg'
import iconXlsx from './assets/file-xlsx.svg'
import iconPptx from './assets/file-pptx.svg'
import iconPdf from './assets/file-pdf.svg'
import iconMd from './assets/file-md.svg'
import iconHtml from './assets/file-html.svg'
import type {
  AccountStatus,
  CloudProjectKind,
  CloudProjectsSnapshot,
  FolderEntry,
  FolderListing,
  FolderRoot,
  HomeApi,
  MoveConflictPolicy,
  RecentEntry,
  FileSearchHit,
  FileSearchPage,
  FileSearchRerank,
} from '../../shared/home-api'
import type { IntegrationsApi } from '../../shared/integrations-api'
import { markText } from '../../shared/text-marks'
import { useDismissablePopover } from '@genoffice/ui'
import { fileCountKey, visiblePageCount } from './counts'
import { useI18n } from './locale'
import type { I18n, StringKey } from './locale'
import { AiSettingsModal } from './AiSettingsModal'
import { AboutModal } from './AboutModal'
import { DiagnosticReportModal } from './DiagnosticReportModal'
import { SettingsModal } from './SettingsModal'
import type { SettingsTarget } from './SettingsModal'
import { skillUpdateDue } from './IntegrationsPane'

declare global {
  interface Window {
    aiOffice: HomeApi
    aiOfficeIntegrations?: IntegrationsApi
  }
}

/** page size of the home list; scrolling to the bottom auto-loads the next page */
const PAGE_SIZE = 50

const FILE_ICONS: Record<string, string> = {
  docx: iconDocx,
  xlsx: iconXlsx,
  xlsm: iconXlsx,
  pptx: iconPptx,
  pdf: iconPdf,
  md: iconMd,
  markdown: iconMd,
  html: iconHtml,
  htm: iconHtml,
}

/* Formats the open-local card advertises. Too long for the card at any window
   width, so it ellipsizes and a hover ScreenTip carries the full list. Keep in
   sync with the main-process open-dialog filter (OPEN_DIALOG_EXTENSIONS). */
const OPEN_LOCAL_EXTENSIONS = '.docx / .xlsx / .xlsm / .xls / .csv / .pptx / .pdf / .md / .html'

/** drag payload of home file/folder rows (JSON array of absolute paths) */
const DRAG_PATHS_MIME = 'application/x-genoffice-paths'
/** hovering a collapsed folder this long while dragging expands it */
const DRAG_EXPAND_DELAY_MS = 600
/** expanded folders survive a home reload; the selection is per session */
const TREE_STATE_KEY = 'home.folderTree'

function FileBadge({ ext, size }: { ext: string; size: number }) {
  if (ext === 'eml') {
    return (
      <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden="true">
        <rect width="240" height="240" rx="48" fill="#0078D4" />
        <path
          d="M52 76L120 128L188 76"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="52" y="76" width="136" height="88" rx="8" stroke="#ffffff" strokeWidth="14" fill="none" />
      </svg>
    )
  }
  const icon = FILE_ICONS[ext]
  if (icon) {
    return <img src={icon} width={size} height={size} alt="" aria-hidden="true" />
  }
  const label = ext ? ext[0].toUpperCase() : '?'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7.5" fill="#98a2b3" />
      <text
        x="16"
        y="16.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={17}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
    </svg>
  )
}

function FolderIcon({ size = 16, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3.1c.44 0 .85.19 1.13.52L8.4 4.4H13A1.5 1.5 0 0 1 14.5 5.9v5.6A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5V4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={open ? 'currentColor' : 'none'}
        fillOpacity={open ? 0.12 : 0}
      />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.12s' }}
    >
      <path
        d="M4.5 2.5l4 3.5-4 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function MoreDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3.2" cy="8" r="1.35" fill="currentColor" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
      <circle cx="12.8" cy="8" r="1.35" fill="currentColor" />
    </svg>
  )
}

function formatModified(mtimeMs: number, i18n: I18n): string {
  const date = new Date(mtimeMs)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (days <= 0) {
    return `${i18n.t('today')} · ${date.toLocaleTimeString(i18n.dateLocale, { hour: '2-digit', minute: '2-digit' })}`
  }
  if (days === 1) return i18n.t('yesterday')
  return date.toLocaleDateString(i18n.dateLocale, { month: 'short', day: 'numeric' })
}

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function splitPath(path: string): string[] {
  return path.split(/[\\/]/).filter(Boolean)
}

function parentDir(path: string): string {
  const parts = splitPath(path)
  const dir = parts[parts.length - 2] ?? ''
  // ponytail: alias legacy GenOffice folder name on UI only; upgrade path: migrate disk directory if requested
  return /^genoffice$/i.test(dir) ? 'VuaOffice' : dir
}

function dirOf(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (cut < 0) return path
  // keep the separator on a filesystem root ("/" or "C:\") instead of an empty or bare-drive string
  const dir = path.slice(0, cut)
  return dir === '' || /^[A-Za-z]:$/.test(dir) ? path.slice(0, cut + 1) : dir
}

function isUnder(root: string, path: string): boolean {
  if (path === root) return true
  // a root that already ends with a separator ("/" or "C:\") must not get a second one
  if (/[\\/]$/.test(root)) return path.startsWith(root)
  return path.startsWith(root + '/') || path.startsWith(root + '\\')
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function baseName(entry: RecentEntry): string {
  return entry.ext ? entry.name.slice(0, -(entry.ext.length + 1)) : entry.name
}

/** the root that holds `path`; the deepest one when roots nest */
function rootOf(path: string, roots: readonly FolderRoot[]): FolderRoot | null {
  let best: FolderRoot | null = null
  for (const root of roots) {
    if (isUnder(root.path, path) && (!best || root.path.length > best.path.length)) best = root
  }
  return best
}

/** "Clients / Contracts" for a file under a root; the parent folder name elsewhere */
function locationLabel(path: string, roots: readonly FolderRoot[]): string {
  const dir = dirOf(path)
  const root = rootOf(dir, roots)
  if (root) {
    if (dir === root.path) return root.name
    return splitPath(dir.slice(root.path.length)).join(' / ')
  }
  return parentDir(path)
}

/** the folders between root and `dir` (inclusive) */
function crumbsOf(root: FolderRoot, dir: string): Array<{ path: string; name: string }> {
  const crumbs = [{ path: root.path, name: root.name }]
  if (dir === root.path) return crumbs
  const sep = dir.includes('\\') && !dir.includes('/') ? '\\' : '/'
  let acc = root.path
  for (const part of splitPath(dir.slice(root.path.length))) {
    acc = `${acc}${sep}${part}`
    crumbs.push({ path: acc, name: part })
  }
  return crumbs
}

const FILTERS: { key: string; label: StringKey }[] = [
  { key: 'all', label: 'filterAll' },
  { key: 'docx', label: 'filterDocs' },
  { key: 'xlsx', label: 'filterSheets' },
  { key: 'pptx', label: 'filterSlides' },
  { key: 'pdf', label: 'filterPdf' },
  { key: 'md', label: 'filterMd' },
  { key: 'html', label: 'filterHtml' },
]

/** sidebar filter keys that stand for a family of extensions (mirrors recent-files.ts) */
const FILTER_FAMILY: Record<string, readonly string[]> = {
  docx: ['docx', 'doc'],
  xlsx: ['xlsx', 'xlsm', 'xls', 'csv'],
  pptx: ['pptx', 'ppt'],
  md: ['md', 'markdown'],
  html: ['html', 'htm'],
}

function matchesFilter(entry: RecentEntry, filter: string): boolean {
  if (filter === 'all') return true
  return (FILTER_FAMILY[filter] ?? [filter]).includes(entry.ext)
}

/** wrap every matched fragment of a name or folder label in the shared search-hit mark */
function highlightText(text: string, needles: readonly string[]): ReactElement[] | string {
  const marks = markText(text, needles)
  if (!marks.some((m) => m.hit)) return text
  return marks.map((m, i) =>
    m.hit ? (
      <mark key={i} className="search-hit">
        {m.text}
      </mark>
    ) : (
      <span key={i}>{m.text}</span>
    ),
  )
}

/** Check glyph marking the selected sort option; invisible on the others so labels stay aligned */
function SortCheck({ visible }: { visible: boolean }): ReactElement {
  return (
    <svg
      className="cloud-sort-check"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={visible ? undefined : { visibility: 'hidden' }}
    >
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Folder tree state (shared by the sidebar and the move picker) ──

interface TreeState {
  expanded: string[]
  /** the root the layout was saved for; a layout for another root is not applied */
  root: string | null
}

function readTreeState(): TreeState {
  try {
    const raw = JSON.parse(localStorage.getItem(TREE_STATE_KEY) ?? 'null') as TreeState | null
    if (raw && Array.isArray(raw.expanded)) {
      return {
        expanded: raw.expanded.filter((p): p is string => typeof p === 'string'),
        root: typeof raw.root === 'string' ? raw.root : null,
      }
    }
  } catch {
    // corrupt or absent: start collapsed
  }
  return { expanded: [], root: null }
}

function writeTreeState(state: TreeState): void {
  try {
    localStorage.setItem(TREE_STATE_KEY, JSON.stringify(state))
  } catch {
    // quota / private mode: the tree just forgets its layout
  }
}

/**
 * Lazily loaded folder listings keyed by directory. Listing a folder that is
 * already cached is a no-op; `invalidate` drops entries so the next render
 * refetches them (the main process reports changed directories via watch).
 */
function useFolderListings() {
  const [listings, setListings] = useState<ReadonlyMap<string, FolderListing>>(new Map())
  // dir → whether a reload was requested while its request was in flight (the
  // in-flight answer may predate the change, so it is fetched once more)
  const inflight = useRef(new Map<string, boolean>())

  const load = useCallback((dir: string, force = false) => {
    if (inflight.current.has(dir)) {
      if (force) inflight.current.set(dir, true)
      return
    }
    inflight.current.set(dir, false)
    void window.aiOffice
      .listFolder(dir)
      .then((listing) => {
        setListings((prev) => {
          const next = new Map(prev)
          next.set(dir, listing)
          return next
        })
      })
      .finally(() => {
        const again = inflight.current.get(dir)
        inflight.current.delete(dir)
        if (again) load(dir, true)
      })
  }, [])

  const invalidate = useCallback(
    (dirs: readonly string[]) => {
      setListings((prev) => {
        let changed = false
        const next = new Map(prev)
        for (const dir of dirs) {
          if (next.delete(dir)) changed = true
        }
        return changed ? next : prev
      })
      for (const dir of dirs) load(dir, true)
    },
    [load],
  )

  const reset = useCallback(() => setListings(new Map()), [])

  /** shown or currently loading: the folders a watch event should refresh */
  const tracked = useCallback(
    (dir: string) => listings.has(dir) || inflight.current.has(dir),
    [listings],
  )

  return { listings, load, invalidate, reset, tracked }
}

// ── Move-to-folder picker ────────────────────────────────

interface FolderPickerProps {
  roots: readonly FolderRoot[]
  /** folders the moved items already live in (greyed, not selectable) */
  currentDirs: ReadonlySet<string>
  /** folders being moved: they and their descendants cannot be targets */
  movingDirs: readonly string[]
  count: number
  onCancel: () => void
  onPick: (dir: string) => void
}

interface ProjectPanelProps {
  projects: ProjectSummaryEntry[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onRefresh: () => void
}

function ProjectPanel({ projects, selectedId, onSelect, onRefresh }: ProjectPanelProps) {
  const { t } = useI18n()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  // open menu id + fixed-position anchor (viewport coords), so the popup can
  // escape the scrollable project list without the list losing overflow-y
  const [projMenu, setProjMenu] = useState<{ id: string; top: number; right: number } | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  // wrap (… button + popup) of the row whose menu is open — the dismissal guard root
  const projMenuWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (creating && newInputRef.current) newInputRef.current.focus()
  }, [creating])

  // unified dismissal: outside press, window blur, chrome press (tab strip / window drag)
  useDismissablePopover(projMenu !== null, () => setProjMenu(null), {
    inside: () => [projMenuWrapRef.current],
  })

  // also close on any scroll (the fixed-position popup would otherwise detach
  // from its row while the list scrolls)
  useEffect(() => {
    if (!projMenu) return
    const close = () => setProjMenu(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [projMenu])

  const commitCreate = async () => {
    const name = newName.trim()
    setCreating(false)
    setNewName('')
    if (!name) return
    try {
      await window.aiOfficeProject?.createProject(name)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
      return
    }
    onRefresh()
  }

  const commitRename = async () => {
    if (!renaming) return
    const name = renaming.value.trim()
    const id = renaming.id
    setRenaming(null)
    if (!name) return
    try {
      await window.aiOfficeProject?.renameProject(id, name)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
      return
    }
    onRefresh()
  }

  // in-app confirm dialog (same style as the delete-files modal), not window.confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const doDelete = (id: string) => {
    setProjMenu(null)
    setConfirmDeleteId(id)
  }

  const confirmDeleteNow = async () => {
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    if (!id) return
    try {
      await window.aiOfficeProject?.deleteProject(id)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
      return
    }
    if (selectedId === id) onSelect(null)
    onRefresh()
  }

  useEffect(() => {
    if (!confirmDeleteId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDeleteId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmDeleteId])

  return (
    <div className="proj-panel">
      <div className="proj-panel-head">
        <span className="proj-panel-title">{t('projects')}</span>
        <button
          className="proj-add-btn"
          title={t('newProject')}
          onClick={() => setCreating(true)}
          aria-label={t('newProject')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {creating && (
        <div className="proj-new-row">
          <input
            ref={newInputRef}
            className="proj-rename-input"
            placeholder={t('projectName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => void commitCreate()}
            onKeyDown={(e) => {
              // IME (e.g. pinyin): Enter/Escape during composition only affects
              // the composition, it must not commit or cancel the field
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter') void commitCreate()
              if (e.key === 'Escape') {
                setCreating(false)
                setNewName('')
              }
            }}
          />
        </div>
      )}

      <ul className="proj-list">
        {projects.map((proj) => {
          const isActive = selectedId === proj.id
          const isRenaming = renaming?.id === proj.id
          return (
            <li key={proj.id} className={`proj-item${isActive ? ' active' : ''}`}>
              <div
                className="proj-item-main"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(isActive ? null : proj.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect(isActive ? null : proj.id)
                }}
              >
                <span className="proj-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3.1c.44 0 .85.19 1.13.52L8.4 4.4H13A1.5 1.5 0 0 1 14.5 5.9v5.6A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5V4z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {isRenaming ? (
                  <input
                    className="proj-rename-input inline"
                    value={renaming.value}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setRenaming({ id: proj.id, value: e.target.value })}
                    onBlur={() => void commitRename()}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') void commitRename()
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                  />
                ) : (
                  <span className="proj-item-name">
                    {proj.isDefault ? t('defaultProject') : proj.name}
                  </span>
                )}
                <span className="proj-item-meta">
                  <span className="proj-item-count">{proj.fileCount}</span>
                </span>
              </div>

              {!proj.isDefault && (
                <div
                  className="proj-menu-wrap"
                  ref={projMenu?.id === proj.id ? projMenuWrapRef : undefined}
                >
                  <button
                    className="proj-more-btn"
                    aria-label={t('projMoreActions', { name: proj.name })}
                    aria-expanded={projMenu?.id === proj.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (projMenu?.id === proj.id) {
                        setProjMenu(null)
                        return
                      }
                      const rect = e.currentTarget.getBoundingClientRect()
                      setProjMenu({
                        id: proj.id,
                        top: rect.bottom + 4,
                        right: window.innerWidth - rect.right,
                      })
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="3.2" cy="8" r="1.35" fill="currentColor" />
                      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
                      <circle cx="12.8" cy="8" r="1.35" fill="currentColor" />
                    </svg>
                  </button>
                  {projMenu?.id === proj.id && (
                    <div
                      className="proj-menu"
                      role="menu"
                      style={{ top: projMenu.top, right: projMenu.right }}
                    >
                      <button
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation()
                          setProjMenu(null)
                          setRenaming({ id: proj.id, value: proj.name })
                        }}
                      >
                        {t('rename')}
                      </button>
                      <div className="row-menu-divider" />
                      <button
                        role="menuitem"
                        className="danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          doDelete(proj.id)
                        }}
                      >
                        {t('deleteProject')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {confirmDeleteId &&
        (() => {
          // locale string is "title?\nbody" — split it across the dialog
          const [confirmTitle, ...confirmBody] = t('deleteProjectConfirm').split('\n')
          return (
            <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label={confirmTitle}
                onClick={(event) => event.stopPropagation()}
              >
                <h3>{confirmTitle}</h3>
                <p>{confirmBody.join('\n')}</p>
                <div className="modal-buttons">
                  <button
                    className="btn btn-secondary"
                    autoFocus
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    {t('cancel')}
                  </button>
                  <button className="btn btn-danger" onClick={() => void confirmDeleteNow()}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}

// ── Account entry (bottom-left) ──────────────────────────
// Currently the 360 CORP (gsk) login entry; to be upgraded to a signup/account system later.
// Language switching also lives in this popup menu.


function FolderPicker({
  roots,
  currentDirs,
  movingDirs,
  count,
  onCancel,
  onPick,
}: FolderPickerProps) {
  const { t } = useI18n()
  const { listings, load } = useFolderListings()
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(roots.map((r) => r.path)),
  )
  const [picked, setPicked] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creatingIn, setCreatingIn] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    for (const dir of expanded) load(dir)
  }, [expanded, load])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const disabledDir = (dir: string) =>
    currentDirs.has(dir) ||
    movingDirs.some((m) => isUnder(m, dir)) ||
    rootOf(dir, roots)?.usable === false

  // Enter or blur commits, Escape cancels; the blur an unmount may fire reads
  // the edit from a ref mirrored during render, so a finished edit is a no-op
  const creatingRef = useRef<{ parent: string; name: string } | null>(null)
  creatingRef.current = creatingIn ? { parent: creatingIn, name: newName } : null
  const commitCreate = async () => {
    const pending = creatingRef.current
    creatingRef.current = null
    setCreatingIn(null)
    setNewName('')
    const parent = pending?.parent
    const name = pending?.name.trim()
    if (!parent || !name) return
    const result = await window.aiOffice.createFolder(parent, name)
    if (!result.ok) {
      window.alert(result.error ?? t('renameFailed'))
      return
    }
    load(parent, true)
    setExpanded((prev) => new Set([...prev, parent]))
    if (result.path) setPicked(result.path)
  }

  // name search flattens the tree to every loaded folder whose name matches;
  // folders not yet expanded are loaded on the fly one level at a time
  const needle = query.trim().toLowerCase()
  const renderNode = (entry: { path: string; name: string }, depth: number): ReactElement => {
    const listing = listings.get(entry.path)
    const isOpen = expanded.has(entry.path)
    const children = listing?.folders ?? []
    const disabled = disabledDir(entry.path)
    const isCurrent = currentDirs.has(entry.path)
    return (
      <li key={entry.path}>
        <div
          className={`picker-row${picked === entry.path ? ' active' : ''}${disabled ? ' disabled' : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          role="treeitem"
          aria-selected={picked === entry.path}
          aria-expanded={children.length > 0 ? isOpen : undefined}
          onClick={() => {
            if (!disabled) setPicked(entry.path)
          }}
          onDoubleClick={() => {
            if (!disabled) onPick(entry.path)
          }}

        >
          <button
            className="tree-chevron"
            tabIndex={-1}
            aria-hidden="true"
            style={{ visibility: listing && children.length === 0 ? 'hidden' : undefined }}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => {
                const next = new Set(prev)
                if (next.has(entry.path)) next.delete(entry.path)
                else next.add(entry.path)
                return next
              })
            }}
          >
            <Chevron open={isOpen} />
          </button>
          <FolderIcon open={isOpen} />
          <span className="picker-name">{entry.name}</span>
          {isCurrent && <span className="picker-current">{t('currentFolder')}</span>}
        </div>
        {isOpen && (
          <ul role="group">
            {children.map((child) => renderNode(child, depth + 1))}
            {creatingIn === entry.path && (
              <li>
                <div className="picker-row" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
                  <span className="tree-chevron" aria-hidden="true" />
                  <FolderIcon />
                  <input
                    className="folder-rename-input inline"
                    autoFocus
                    placeholder={t('untitledFolder')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => void commitCreate()}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') void commitCreate()
                      if (e.key === 'Escape') {
                        setCreatingIn(null)
                        setNewName('')
                      }
                    }}
                  />
                </div>
              </li>
            )}
          </ul>
        )}
      </li>
    )
  }

  const renderSearch = (): ReactElement => {
    const hits: Array<{ path: string; name: string; rel: string }> = []
    for (const listing of listings.values()) {
      for (const f of listing.folders) {
        if (f.name.toLowerCase().includes(needle)) {
          hits.push({ path: f.path, name: f.name, rel: locationLabel(f.path + '/x', roots) })
        }
        if (!listings.has(f.path)) load(f.path)
      }
    }
    hits.sort((a, b) => a.name.localeCompare(b.name))
    if (hits.length === 0) return <p className="picker-empty">{t('noMatchingFolders')}</p>
    return (
      <ul role="tree">
        {hits.map((h) => {
          const disabled = disabledDir(h.path)
          return (
            <li key={h.path}>
              <div
                className={`picker-row${picked === h.path ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                role="treeitem"
                aria-selected={picked === h.path}
                onClick={() => {
                  if (!disabled) setPicked(h.path)
                }}
                onDoubleClick={() => {
                  if (!disabled) onPick(h.path)
                }}
              >
                <span className="tree-chevron" aria-hidden="true" />
                <FolderIcon />
                <span className="picker-name">{h.name}</span>
                <span className="picker-rel">{h.rel}</span>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('moveToFolderTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('moveToFolderTitle')}</h3>
        <input
          className="picker-search"
          type="search"
          placeholder={t('searchFolders')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="picker-tree">
          {needle ? (
            renderSearch()
          ) : (
            <ul role="tree">{roots.map((root) => renderNode(root, 0))}</ul>
          )}
        </div>
        <div className="modal-buttons picker-buttons">
          <button
            className="btn btn-secondary picker-new"
            onClick={() => {
              const parent = picked ?? roots.find((r) => r.usable)?.path
              if (!parent) return
              setExpanded((prev) => new Set([...prev, parent]))
              setCreatingIn(parent)
              setNewName('')
            }}
          >
            {t('newFolder')}
          </button>
          <span className="picker-spacer" />
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button
            className="btn btn-primary"
            disabled={!picked || disabledDir(picked)}
            onClick={() => {
              if (picked) onPick(picked)
            }}
          >
            {t('moveCount', { n: count })}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Same-name conflict prompt ───────────────────────────

interface ConflictPromptProps {
  names: string[]
  onChoose: (policy: MoveConflictPolicy) => void
}

function ConflictPrompt({ names, onChoose }: ConflictPromptProps) {
  const { t } = useI18n()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChoose('skip')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onChoose])
  return (
    <div className="modal-overlay" onClick={() => onChoose('skip')}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('conflictTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('conflictTitle')}</h3>
        <p>
          {names.length === 1
            ? t('conflictBodyOne', { name: names[0] })
            : t('conflictBodyMany', { n: names.length })}
        </p>
        {names.length > 1 && (
          <ul className="modal-file-list">
            {names.slice(0, 6).map((n) => (
              <li key={n}>{n}</li>
            ))}
            {names.length > 6 && <li>{t('deleteMoreCount', { n: names.length })}</li>}
          </ul>
        )}
        <div className="modal-buttons">
          <button className="btn btn-secondary" autoFocus onClick={() => onChoose('skip')}>
            {t('cancel')}
          </button>
          <button className="btn btn-secondary" onClick={() => onChoose('keepBoth')}>
            {t('conflictKeepBoth')}
          </button>
          <button className="btn btn-danger" onClick={() => onChoose('replace')}>
            {t('conflictReplace')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Account entry (bottom-left) ──────────────────────────
// Currently the 360 CORP (gsk) login entry; to be upgraded to a signup/account system later.
// Language switching also lives in this popup menu.

const LOGIN_POLL_MS = 2500
/** fallback deadline when the CLI does not report expires_in (device codes live ~300s) */
const LOGIN_MAX_WAIT_MS = 300_000

// sorted by ISO 639 language code — native-script labels have no natural
// shared alphabet, so the code is the ordering key
const LANG_OPTIONS = [
  { value: 'ar', label: 'العربية' },
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'he', label: 'עברית' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'th', label: 'ไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'zh', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
] as const

const CHANNEL_OPTIONS = [
  { value: 'stable', labelKey: 'channelStable' },
  { value: 'beta', labelKey: 'channelBeta' },
] as const

const THEME_OPTIONS = [
  { value: 'light' as const, labelKey: 'themeLight' as const },
  { value: 'dark' as const, labelKey: 'themeDark' as const },
  { value: 'system' as const, labelKey: 'themeSystem' as const },
] as const

type ThemeValue = (typeof THEME_OPTIONS)[number]['value']

function AccountEntry({
  onStatusChange,
  onOpenAiSettings,
  onOpenAbout,
  onFileSearchSettingsChange,
  openRequest,
}: {
  onStatusChange?: (status: AccountStatus | null) => void
  onOpenAiSettings?: () => void
  onOpenAbout?: () => void
  onFileSearchSettingsChange?: () => void
  openRequest?: SettingsTarget | null
}) {
  const { lang, setLang, t } = useI18n()
  const [status, setStatus] = useState<AccountStatus | null>(null)

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])
  const [waiting, setWaiting] = useState(false)
  // incremented on login retry, resetting the polling timer
  const [loginNonce, setLoginNonce] = useState(0)
  const [loginError, setLoginError] = useState<
    'timeout' | 'launch' | 'network' | 'expired' | 'failed' | null
  >(null)
  // auth URL reported by the login CLI — rescue entry when the browser did not open
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const loginDeadline = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langFly, setLangFly] = useState<{ left: number; bottom: number } | null>(null)
  const langRowRef = useRef<HTMLDivElement>(null)
  const langCloseTimer = useRef<number | null>(null)
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable')
  const [chanFly, setChanFly] = useState<{ left: number; bottom: number } | null>(null)
  const chanRowRef = useRef<HTMLDivElement>(null)
  const chanCloseTimer = useRef<number | null>(null)
  const [theme, setThemeState] = useState<ThemeValue>('system')
  const [themeFly, setThemeFly] = useState<{ left: number; bottom: number } | null>(null)
  const themeRowRef = useRef<HTMLDivElement>(null)
  const themeCloseTimer = useRef<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [skillUpdate, setSkillUpdate] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  // query login state + app version once on mount
  useEffect(() => {
    let alive = true
    void window.aiOffice.accountStatus?.().then((s) => {
      if (alive) setStatus(s)
    })
    void window.aiOffice.getAppVersion?.().then((v) => {
      if (alive && v) setAppVersion(v)
    })
    void window.aiOffice.getTheme?.().then((th) => {
      if (alive) setThemeState(th)
    })
    return () => {
      alive = false
    }
  }, [])

  // the skill state is a few file reads; re-probe after the modal closes so an
  // update done inside it clears the dot
  useEffect(() => {
    if (settingsOpen) return
    let alive = true
    void window.aiOfficeIntegrations?.status().then((st) => {
      if (alive) setSkillUpdate(skillUpdateDue(st))
    })
    return () => {
      alive = false
    }
  }, [settingsOpen])

  // login progress pushed from main (gsk login CLI output)
  useEffect(() => {
    const off = window.aiOffice.onAccountLogin?.((ev) => {
      if (ev.phase === 'url') {
        if (ev.url) setAuthUrl(ev.url)
        if (ev.expiresInSec) loginDeadline.current = Date.now() + ev.expiresInSec * 1000
      } else if (ev.phase === 'success') {
        void window.aiOffice.accountStatus().then((s) => {
          if (s.loggedIn) {
            setStatus(s)
            setWaiting(false)
            setAuthUrl(null)
          }
        })
      } else if (ev.phase === 'error') {
        setWaiting(false)
        setAuthUrl(null)
        setLoginError(
          ev.error === 'network' ? 'network' : ev.error === 'expired' ? 'expired' : 'failed',
        )
      }
    })
    return off
  }, [])

  // config-file polling stays as the fallback success path (works even if progress events are lost)
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => {
      void window.aiOffice.accountStatus().then((s) => {
        if (s.loggedIn) {
          setStatus(s)
          setWaiting(false)
          setAuthUrl(null)
        } else if (Date.now() > loginDeadline.current) {
          setWaiting(false)
          setAuthUrl(null)
          setLoginError('timeout')
        }
      })
    }, LOGIN_POLL_MS)
    return () => clearInterval(timer)
  }, [waiting, loginNonce])

  // close the menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target?.closest?.('.account-entry')) {
        setMenuOpen(false)
        setLangFly(null)
        setChanFly(null)
        setThemeFly(null)
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [menuOpen])

  const loggedIn = status?.loggedIn ?? false
  const email = status?.email ?? ''
  const displayName = status?.name || (email ? email.split('@')[0] : '')
  const initial = status?.name
    ? status.name.trim()[0].toUpperCase()
    : email
      ? email[0].toUpperCase()
      : loggedIn
        ? 'V'
        : '?'
  const errorText = loginError
    ? {
        timeout: t('loginTimeout'),
        launch: t('loginLaunchFailed'),
        network: t('loginNetworkError'),
        expired: t('loginExpired'),
        failed: t('loginFailed'),
      }[loginError]
    : null

  const closeMenu = () => {
    setMenuOpen(false)
    setLangFly(null)
    setChanFly(null)
    setThemeFly(null)
  }

  const cancelLangFlyClose = () => {
    if (langCloseTimer.current !== null) {
      window.clearTimeout(langCloseTimer.current)
      langCloseTimer.current = null
    }
  }

  const openLangFly = () => {
    cancelLangFlyClose()
    const rect = langRowRef.current?.getBoundingClientRect()
    if (rect) setLangFly({ left: rect.right - 2, bottom: window.innerHeight - rect.bottom })
  }

  const scheduleLangFlyClose = () => {
    cancelLangFlyClose()
    langCloseTimer.current = window.setTimeout(() => setLangFly(null), 200)
  }

  // the fixed-position flyout would detach from its row on scroll — close it
  // (same rule as the project row menu); also drop any pending close timer
  useEffect(() => {
    if (!langFly) return
    const close = (event: Event) => {
      // the flyout scrolls its own options (max-height + overflow-y) — only
      // outside scrolls detach it from its row
      const target = event.target as Element | null
      if (target instanceof Element && target.closest('.lang-flyout')) return
      setLangFly(null)
    }
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('scroll', close, true)
      cancelLangFlyClose()
    }
  }, [langFly])

  const cancelChanFlyClose = () => {
    if (chanCloseTimer.current !== null) {
      window.clearTimeout(chanCloseTimer.current)
      chanCloseTimer.current = null
    }
  }

  const openChanFly = () => {
    cancelChanFlyClose()
    const rect = chanRowRef.current?.getBoundingClientRect()
    if (rect) setChanFly({ left: rect.right - 2, bottom: window.innerHeight - rect.bottom })
  }

  const scheduleChanFlyClose = () => {
    cancelChanFlyClose()
    chanCloseTimer.current = window.setTimeout(() => setChanFly(null), 200)
  }

  // same scroll-close rule as the language flyout: the fixed-position flyout
  // would otherwise detach from its row when the sidebar scrolls
  useEffect(() => {
    if (!chanFly) return
    const close = (event: Event) => {
      const target = event.target as Element | null
      if (target instanceof Element && target.closest('.lang-flyout')) return
      setChanFly(null)
    }
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('scroll', close, true)
      cancelChanFlyClose()
    }
  }, [chanFly])

  const cancelThemeFlyClose = () => {
    if (themeCloseTimer.current !== null) {
      window.clearTimeout(themeCloseTimer.current)
      themeCloseTimer.current = null
    }
  }

  const openThemeFly = () => {
    cancelThemeFlyClose()
    const rect = themeRowRef.current?.getBoundingClientRect()
    if (rect) setThemeFly({ left: rect.right - 2, bottom: window.innerHeight - rect.bottom })
  }

  const scheduleThemeFlyClose = () => {
    cancelThemeFlyClose()
    themeCloseTimer.current = window.setTimeout(() => setThemeFly(null), 200)
  }

  useEffect(() => {
    if (!themeFly) return
    const close = (event: Event) => {
      const target = event.target as Element | null
      if (target instanceof Element && target.closest('.lang-flyout')) return
      setThemeFly(null)
    }
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('scroll', close, true)
      cancelThemeFlyClose()
    }
  }, [themeFly])

  const startLogin = () => {
    // clicking again while waiting = relaunch the login (main kills the stale CLI, so the new device code is the live one)
    setLoginError(null)
    setWaiting(true)
    setAuthUrl(null)
    setUrlCopied(false)
    loginDeadline.current = Date.now() + LOGIN_MAX_WAIT_MS
    setLoginNonce((n) => n + 1)
    closeMenu()
    void window.aiOffice.accountLogin().then((launched) => {
      if (!launched) {
        setWaiting(false)
        setLoginError('launch')
      }
    })
  }

  const openLoginUrl = () => void window.aiOffice.openLoginUrl?.()

  const copyLoginUrl = () => {
    if (!authUrl) return
    void navigator.clipboard.writeText(authUrl).then(() => {
      setUrlCopied(true)
      window.setTimeout(() => setUrlCopied(false), 2000)
    })
  }

  const handleClick = () => {
    setMenuOpen((v) => {
      if (!v) void window.aiOffice.getUpdateChannel().then(setChannel)
      return !v
    })
    setLangFly(null)
    setChanFly(null)
    setThemeFly(null)
  }

  return (
    <div className="account-entry">
      {menuOpen && (
        <div className="account-menu" role="menu">
          {loggedIn ? (
            <div className="account-menu-info">
              {status?.name && (
                <div className="account-menu-name" title={status.name}>
                  {status.name}
                </div>
              )}
              <span className="account-menu-email" title={email}>
                {email || t('loggedIn')}
              </span>
            </div>
          ) : (
            <>
              <button
                className="account-menu-item"
                role="menuitem"
                onClick={startLogin}
                title={waiting ? t('waitingLogin') : undefined}
              >
                {waiting ? t('waitingShort') : t('loginGenspark')}
              </button>
              {waiting && authUrl && (
                <>
                  <button
                    className="account-menu-item login-rescue"
                    role="menuitem"
                    onClick={openLoginUrl}
                  >
                    {t('loginOpenManually')}
                  </button>
                  <button
                    className="account-menu-item login-rescue"
                    role="menuitem"
                    onClick={copyLoginUrl}
                  >
                    {urlCopied ? t('loginCopied') : t('loginCopyUrl')}
                  </button>
                </>
              )}
            </>
          )}
          <div className="account-menu-divider" />
          <div
            className="lang-row-wrap"
            ref={langRowRef}
            onMouseEnter={openLangFly}
            onMouseLeave={scheduleLangFlyClose}
          >
            <button
              className="account-menu-item lang-row"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={!!langFly}
              onClick={openLangFly}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.2" />
                <ellipse cx="8" cy="8" rx="2.8" ry="6.3" stroke="currentColor" strokeWidth="1.1" />
                <path d="M2 5.9h12M2 10.1h12" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              <span className="lang-row-label">{t('language')}</span>
              <span className="lang-row-current">
                {LANG_OPTIONS.find((opt) => opt.value === lang)?.label}
              </span>
              <svg
                className="lang-row-chevron"
                width="11"
                height="11"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M4.5 2.5l4 3.5-4 3.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
            {langFly && (
              <div
                className="lang-flyout"
                role="menu"
                style={{ left: langFly.left, bottom: langFly.bottom }}
              >
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="menuitemradio"
                    aria-checked={lang === opt.value}
                    className={`lang-menu-item${lang === opt.value ? ' active' : ''}`}
                    onClick={() => {
                      closeMenu()
                      if (lang !== opt.value) setLang(opt.value)
                    }}
                  >
                    {opt.label}
                    {lang === opt.value && (
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M2.5 6.2l2.4 2.4 4.6-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="lang-row-wrap"
            ref={themeRowRef}
            onMouseEnter={openThemeFly}
            onMouseLeave={scheduleThemeFlyClose}
          >
            <button
              className="account-menu-item lang-row"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={!!themeFly}
              onClick={openThemeFly}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="lang-row-label">{t('theme')}</span>
              <span className="lang-row-current">
                {t(THEME_OPTIONS.find((opt) => opt.value === theme)?.labelKey ?? 'themeSystem')}
              </span>
              <svg
                className="lang-row-chevron"
                width="11"
                height="11"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M4.5 2.5l4 3.5-4 3.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
            {themeFly && (
              <div
                className="lang-flyout"
                role="menu"
                style={{ left: themeFly.left, bottom: themeFly.bottom }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="menuitemradio"
                    aria-checked={theme === opt.value}
                    className={`lang-menu-item${theme === opt.value ? ' active' : ''}`}
                    onClick={() => {
                      closeMenu()
                      if (theme !== opt.value) {
                        setThemeState(opt.value)
                        void window.aiOffice.setTheme(opt.value)
                        // apply theme attribute to DOM immediately
                        if (opt.value === 'light' || opt.value === 'dark') {
                          document.documentElement.setAttribute('data-theme', opt.value)
                        } else {
                          document.documentElement.removeAttribute('data-theme')
                        }
                      }
                    }}
                  >
                    {t(opt.labelKey)}
                    {theme === opt.value && (
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M2.5 6.2l2.4 2.4 4.6-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="lang-row-wrap"
            ref={chanRowRef}
            onMouseEnter={openChanFly}
            onMouseLeave={scheduleChanFlyClose}
          >
            <button
              className="account-menu-item lang-row"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={!!chanFly}
              onClick={openChanFly}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 3v6.5a3 3 0 0 0 3 3h5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle cx="4" cy="3" r="1.6" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M9.8 10l2.4 2.5-2.4 2.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="lang-row-label">{t('updateChannel')}</span>
              <span className="lang-row-current">
                {t(channel === 'beta' ? 'channelBeta' : 'channelStable')}
              </span>
              <svg
                className="lang-row-chevron"
                width="11"
                height="11"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M4.5 2.5l4 3.5-4 3.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
            {chanFly && (
              <div
                className="lang-flyout"
                role="menu"
                style={{ left: chanFly.left, bottom: chanFly.bottom }}
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    role="menuitemradio"
                    aria-checked={channel === opt.value}
                    className={`lang-menu-item${channel === opt.value ? ' active' : ''}`}
                    onClick={() => {
                      closeMenu()
                      if (channel !== opt.value) {
                        setChannel(opt.value)
                        void window.aiOffice.setUpdateChannel(opt.value)
                      }
                    }}
                  >
                    {t(opt.labelKey)}
                    {channel === opt.value && (
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M2.5 6.2l2.4 2.4 4.6-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="account-menu-divider" />
          {loggedIn && (
            <button
              className="account-menu-item lang-row"
              role="menuitem"
              onClick={() => {
                closeMenu()
                onOpenAiSettings?.()
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6.5 1.5h3l.4 1.6a5.5 5.5 0 0 1 1.3.8l1.6-.6 1.5 2.6-1.2 1.1a5.7 5.7 0 0 1 0 1.6l1.2 1.1-1.5 2.6-1.6-.6a5.5 5.5 0 0 1-1.3.8l-.4 1.6h-3l-.4-1.6a5.5 5.5 0 0 1-1.3-.8l-1.6.6-1.5-2.6 1.2-1.1a5.7 5.7 0 0 1 0-1.6l-1.2-1.1 1.5-2.6 1.6.6a5.5 5.5 0 0 1 1.3-.8l.4-1.6z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="lang-row-label">{t('settings')}</span>
            </button>
          )}
          <button
            className="account-menu-item lang-row"
            role="menuitem"
            onClick={() => {
              closeMenu()
              void window.aiOffice.checkForUpdates?.()
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 2.5a5.5 5.5 0 1 0 5.2 7.3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M13.5 2.5v3.5h-3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.2 6A5.5 5.5 0 0 0 3.8 4.2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="lang-row-label">{t('checkForUpdates')}</span>
          </button>
          {appVersion && (
            <button
              className="account-menu-item lang-row"
              role="menuitem"
              onClick={() => {
                closeMenu()
                onOpenAbout?.()
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M8 7.4v3.4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="5.1" r="0.8" fill="currentColor" />
              </svg>
              <span className="version-row-label">{t('versionLabel')}</span>
              <span className="version-row-value">{appVersion}</span>
            </button>
          )}
          {loggedIn && (
            <button
              className="account-menu-item danger"
              role="menuitem"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true)
                void window.aiOffice.accountLogout().then(() => {
                  setLoggingOut(false)
                  closeMenu()
                  setStatus({ loggedIn: false })
                })
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6.2 2H3.7A1.7 1.7 0 0 0 2 3.7v8.6A1.7 1.7 0 0 0 3.7 14h2.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.7 4.9 13.8 8l-3.1 3.1M13.4 8H6.4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{loggingOut ? t('loggingOut') : t('logout')}</span>
            </button>
          )}
        </div>

      )}
      {!menuOpen && waiting && authUrl && (
        <div className="login-hint" role="status">
          <button className="login-hint-open" onClick={openLoginUrl}>
            {t('loginOpenShort')}
          </button>
          <button
            className={`login-hint-copy${urlCopied ? ' copied' : ''}`}
            onClick={copyLoginUrl}
            // static tip: screentips are suppressed from pointerdown until the pointer
            // leaves the control, so a swapped-in "copied" tip would never show — the
            // check-mark icon is the visible feedback
            data-tip={t('loginCopyUrl')}
            aria-label={urlCopied ? t('loginCopied') : t('loginCopyUrl')}
          >
            {urlCopied ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m3.5 8.5 3 3 6-7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect
                  x="5.5"
                  y="5.5"
                  width="7"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M3.5 10.5V5a1.5 1.5 0 0 1 1.5-1.5h5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      )}
      <button
        className="account-btn"
        onClick={handleClick}
        aria-expanded={menuOpen}
        title={
          loggedIn
            ? (status?.name ? `${status.name} (${email})` : email || t('loggedInGenspark'))
            : waiting
              ? t('waitingLogin')
              : (errorText ?? t('loginGenspark'))
        }
        aria-label={loggedIn ? t('account') : t('login')}
      >
        <span
          className={`account-avatar${loggedIn ? ' logged-in' : ''}${waiting ? ' waiting' : ''}`}
        >
          {waiting ? (
            <svg
              className="account-spinner"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="26"
                strokeDashoffset="18"
                strokeLinecap="round"
              />
            </svg>
          ) : status?.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt=""
              className="account-avatar-img"
              onError={(e) => {
                // Fallback to text initial if avatar fails to load
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            initial
          )}
          {skillUpdate && (
            <span className="account-badge" role="img" aria-label={t('intgUpdateDue')} />
          )}
        </span>
        <span className="account-text">
          {loggedIn ? (
            <>
              <span className="account-name" title={displayName}>
                {displayName || t('loggedIn')}
              </span>
              <span className="account-sub" title={email}>
                {email || '360 CORP'}
              </span>
            </>
          ) : (
            <>
              <span className="account-name">{waiting ? t('waitingShort') : t('login')}</span>
              <span className={`account-sub${!waiting && errorText ? ' error' : ''}`}>
                {!waiting && errorText ? errorText : t('accountGenspark')}
              </span>
            </>
          )}
        </span>
      </button>
    </div>
  )
}

// ── Cloud (360 CORP web) projects view ──────────────────

/** kind filter segments; labels shared with the recents type filter */
const CLOUD_FILTERS = [
  { key: 'all', label: 'filterAll' },
  { key: 'docs', label: 'filterDocs' },
  { key: 'sheets', label: 'filterSheets' },
  { key: 'slides', label: 'filterSlides' },
] as const satisfies readonly { key: 'all' | CloudProjectKind; label: StringKey }[]

/** module kind → file icon extension */
const CLOUD_KIND_EXT: Record<string, string> = { docs: 'docx', sheets: 'xlsx', slides: 'pptx' }

/** rows revealed per "load more" step; purely client-side over the local snapshot */
const CLOUD_REVEAL_STEP = 100

function CloudProjectsView() {
  const i18n = useI18n()
  const { t } = i18n
  const [snapshot, setSnapshot] = useState<CloudProjectsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [loginWaiting, setLoginWaiting] = useState(false)
  const [kind, setKind] = useState<'all' | CloudProjectKind>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [revealed, setRevealed] = useState(CLOUD_REVEAL_STEP)
  const sortRef = useRef<HTMLDivElement>(null)

  // the local store paints instantly; a background sync replaces it when done.
  // a failed sync keeps whatever is shown; with nothing shown the
  // !snapshot && !loading branch below renders the retry state
  const startSync = () => {
    setSyncing(true)
    void window.aiOffice.cloudProjectsSync?.().then((synced) => {
      setSyncing(false)
      setLoading(false)
      if (synced) setSnapshot(synced)
    })
  }
  const startSyncRef = useRef(startSync)
  startSyncRef.current = startSync

  useEffect(() => {
    let cancelled = false
    void window.aiOffice.cloudProjectsCached?.().then((stored) => {
      if (cancelled || !stored) return
      setSnapshot((prev) => prev ?? stored)
      setLoading(false)
    })
    startSyncRef.current()
    return () => {
      cancelled = true
    }
  }, [])

  // the sign-in button reuses the account login flow; sync once it lands
  useEffect(() => {
    const off = window.aiOffice.onAccountLogin?.((ev) => {
      if (ev.phase === 'success') {
        setLoginWaiting(false)
        startSyncRef.current()
      } else if (ev.phase === 'error') {
        setLoginWaiting(false)
      }
    })
    return off
  }, [])

  // unified dismissal: outside press, window blur, chrome press (tab strip / window drag)
  useDismissablePopover(sortMenuOpen, () => setSortMenuOpen(false), {
    inside: () => [sortRef.current],
  })

  const startLogin = () => {
    setLoginWaiting(true)
    void window.aiOffice.accountLogin?.().then((ok) => {
      if (!ok) setLoginWaiting(false)
    })
  }

  const changeKind = (k: 'all' | CloudProjectKind) => {
    if (k === kind) return
    setKind(k)
    setRevealed(CLOUD_REVEAL_STEP)
  }

  const openProject = (projectUrl: string) => {
    void window.aiOffice.openCloudProject?.(projectUrl)
  }

  // filter / search / sort are all local over the snapshot — no requests
  const q = query.trim().toLowerCase()
  let list = snapshot?.projects.filter((proj) => kind === 'all' || proj.kind === kind) ?? []
  if (q) list = list.filter((proj) => proj.title.toLowerCase().includes(q))
  if (sort === 'oldest') list = [...list].reverse()
  const visible = list.slice(0, revealed)

  const renderRows = () => {
    const items: ReactElement[] = []
    for (const proj of visible) {
      items.push(
        <li key={proj.projectId}>
          <button
            className="cloud-row"
            data-tip={t('cloudOpenInBrowser')}
            data-tip-anchor=".cloud-row-external"
            data-tip-place="right"
            onClick={() => openProject(proj.projectUrl)}
          >
            <FileBadge ext={CLOUD_KIND_EXT[proj.kind] ?? ''} size={24} />
            <span className="cloud-row-main">
              <span className="cloud-row-title">{proj.title || t('untitled')}</span>
              <svg
                className="cloud-row-external"
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6.5 3.5H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12V9.5M9.5 2.5h4v4M13 3l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="cloud-row-time">
              {proj.ctimeMs ? formatModified(proj.ctimeMs, i18n) : ''}
            </span>
          </button>
        </li>,
      )
    }
    return items
  }

  const renderBody = () => {
    if (snapshot && !snapshot.available) {
      return (
        <p className="empty proj-empty">
          <span className="empty-hint">{t('cloudLoginHint')}</span>
          <button className="btn btn-secondary" disabled={loginWaiting} onClick={startLogin}>
            {loginWaiting ? t('waitingShort') : t('login')}
          </button>
        </p>
      )
    }
    if (!snapshot) {
      if (loading || syncing) {
        return (
          <div className="load-more" aria-hidden="true">
            <span className="load-more-spinner" />
          </div>
        )
      }
      return (
        <p className="empty proj-empty">
          <span className="empty-hint">{t('cloudError')}</span>
          <button className="btn btn-secondary" onClick={() => startSync()}>
            {t('cloudRetry')}
          </button>
        </p>
      )
    }
    if (list.length === 0) {
      return (
        <p className="empty proj-empty">
          <span className="empty-hint">
            {t(q ? 'cloudNoResults' : kind === 'all' ? 'cloudEmpty' : 'emptyFiltered')}
          </span>
        </p>
      )
    }
    return (
      <div className="cloud-scroll">
        <div className="cloud-table">
          <div className="cloud-columns">
            <span className="col-name">{t('colName')}</span>
            <div className="cloud-col-sort" ref={sortRef}>
              <button
                className="cloud-col-sort-btn"
                aria-haspopup="menu"
                aria-expanded={sortMenuOpen}
                onClick={() => setSortMenuOpen((o) => !o)}
              >
                {t('colModified')}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  style={sort === 'oldest' ? { transform: 'rotate(180deg)' } : undefined}
                >
                  <path
                    d="M8 3v10M4.5 9.5L8 13l3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {sortMenuOpen && (
                <div className="cloud-sort-menu" role="menu">
                  {(['recent', 'oldest'] as const).map((key) => (
                    <button
                      key={key}
                      className={sort === key ? 'active' : ''}
                      role="menuitemradio"
                      aria-checked={sort === key}
                      onClick={() => {
                        setSort(key)
                        setSortMenuOpen(false)
                        setRevealed(CLOUD_REVEAL_STEP)
                      }}
                    >
                      <SortCheck visible={sort === key} />
                      {t(key === 'recent' ? 'cloudSortRecent' : 'cloudSortOldest')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ul className="cloud-list">{renderRows()}</ul>
        </div>
        {list.length > revealed && (
          <div className="load-more">
            <button
              className="btn btn-secondary"
              onClick={() => setRevealed((n) => n + CLOUD_REVEAL_STEP)}
            >
              {t('cloudLoadMore')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="content">
      <section className="cloud-projects" aria-label={t('navCloud')}>
        <header className="cloud-hero">
          <div className="cloud-hero-top">
            <h1 className="cloud-title">{t('navCloud')}</h1>
          </div>
          <p className="cloud-subtitle">{t('cloudSubtitle')}</p>
          {snapshot?.available && (
            <div className="cloud-controls">
              <div className="cloud-seg" role="tablist" aria-label={t('filterAria')}>
                {CLOUD_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={kind === f.key ? 'active' : ''}
                    role="tab"
                    aria-selected={kind === f.key}
                    onClick={() => changeKind(f.key)}
                  >
                    {t(f.label)}
                  </button>
                ))}
              </div>
              <button
                className={`cloud-refresh-btn${syncing ? ' syncing' : ''}`}
                data-tip={t('cloudRefresh')}
                aria-label={t('cloudRefresh')}
                disabled={syncing}
                onClick={() => startSync()}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96M13.6 2.4v3.2h-3.2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="cloud-search">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M10.5 10.5L14 14"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  value={query}
                  placeholder={t('cloudSearchPlaceholder', { n: snapshot.projects.length })}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setRevealed(CLOUD_REVEAL_STEP)
                  }}
                />
              </div>
            </div>
          )}
        </header>
        {renderBody()}
      </section>
    </main>
  )
}

// ── Main component ──────────────────────────────────────

export function Home() {
  const i18n = useI18n()
  const { t, lang } = i18n
  // ── Paged list state (rows loaded for the current view + filter) ──
  const [entries, setEntries] = useState<RecentEntry[]>([])
  /** total count under the current view + filter (not just the loaded rows) */
  const [listTotal, setListTotal] = useState(0)
  /** sidebar Recent / Starred counts under the active type filter */
  const [navCounts, setNavCounts] = useState({ recent: 0, starred: 0 })
  const [loadingMore, setLoadingMore] = useState(false)
  const [view, setView] = useState<'recent' | 'starred'>('recent')
  // 360 CORP web projects take over the content area (like a selected project)
  const [cloudMode, setCloudMode] = useState(false)
  const [filter, setFilter] = useState('all')
  // ── File search (names + indexed content); active while the box has text ──
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPage, setSearchPage] = useState<FileSearchPage | null>(null)
  const [rerank, setRerank] = useState<{ key: string; result: FileSearchRerank } | null>(null)
  // bumped when the Jev settings change so the current results are judged again (or the order dropped)
  const [rerankSettingsTick, setRerankSettingsTick] = useState(0)
  const [settingsRequest, setSettingsRequest] = useState<SettingsTarget | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // IME composition: wait for the committed text instead of searching each keystroke
  const composingRef = useRef(false)
  const searchSeq = useRef(0)
  const searchActive = searchQuery.trim().length > 0
  // modified-column sort (WPS-style header popover), shared by the global and folder tables
  const [fileSort, setFileSort] = useState<'recent' | 'oldest'>('recent')
  const [fileSortMenuOpen, setFileSortMenuOpen] = useState(false)
  const fileSortRef = useRef<HTMLDivElement>(null)
  const [rowMenu, setRowMenu] = useState<string | null>(null)
  // actions cell (… button + menu) of the row whose menu is open — the dismissal guard root
  const rowMenuWrapRef = useRef<HTMLSpanElement>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [renaming, setRenaming] = useState<{ path: string; value: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showDiagnosticReport, setShowDiagnosticReport] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [isDevMode, setIsDevMode] = useState(false)

  useEffect(() => {
    void window.aiOffice.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v)
    })
    void window.aiOffice.getDeveloperMode?.().then((dev) => {
      if (dev !== undefined) setIsDevMode(!!dev)
    })
    void window.aiOffice.getAiSettings?.().then((s) => {
      if (s?.developerMode !== undefined) setIsDevMode(!!s.developerMode)
    })
    const unsubDev = window.aiOffice.onDeveloperModeChanged?.((dev) => {
      setIsDevMode(dev)
    })
    const unsubDiag = window.aiOffice.onOpenDiagnosticReport?.(() => {
      setShowDiagnosticReport(true)
    })
    return () => {
      unsubDiag?.()
      unsubDev?.()
    }
  }, [])
  // name in the greeting; omitted when logged out
  const [accountName, setAccountName] = useState('')
  // 360 CORP Projects is web-account data, so its nav entry only shows when logged in
  const [loggedIn, setLoggedIn] = useState(false)
  // single source of account state: AccountEntry reports every change (initial
  // load, login, logout), keeping the greeting name and the nav entry in sync
  const handleAccountStatus = useCallback((s: AccountStatus | null) => {
    const on = s?.loggedIn ?? false
    setLoggedIn(on)
    if (!on) setCloudMode(false)
    if (on) {
      if (s?.name) {
        setAccountName(s.name)
      } else {
        const rawEmail = (s?.email ?? '').split('@')[0]
        setAccountName(rawEmail ? rawEmail[0].toUpperCase() + rawEmail.slice(1) : '')
      }
    } else {
      setAccountName('')
    }
  }, [])

  // ── Folder tree state ──
  // the default save folder first, then the folders the user added; `root` is the default one
  const [roots, setRoots] = useState<FolderRoot[]>([])
  const root = roots[0] ?? null
  const canMove = roots.some((r) => r.usable)
  const editableAt = (path: string) => rootOf(path, roots)?.usable !== false
  const [panelDrop, setPanelDrop] = useState(false)
  const [treeState] = useState(readTreeState)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(treeState.expanded))
  // a root without a saved layout of its own is opened once when first seen
  const seededRoot = useRef<string | null>(null)
  const {
    listings,
    load: loadFolder,
    invalidate: invalidateFolders,
    reset: resetFolders,
    tracked: trackedFolder,
  } = useFolderListings()
  // open folder menu: path + fixed-position anchor (viewport coords), so the
  // popup can escape the scrollable tree without the tree losing overflow-y
  const [folderMenu, setFolderMenu] = useState<{
    path: string
    where: 'tree' | 'table'
    top: number
    right: number
  } | null>(null)
  const menuOpenAt = (where: 'tree' | 'table', path: string) =>
    folderMenu?.where === where && folderMenu.path === path
  const folderMenuWrapRef = useRef<HTMLDivElement>(null)
  const [folderRenaming, setFolderRenaming] = useState<{
    path: string
    where: 'tree' | 'table'
    value: string
  } | null>(null)
  // inline "new folder" input in the tree, under this parent
  const [creating, setCreating] = useState<{ parent: string } | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  // move-to-folder picker for these paths; then the conflict prompt for the ones that collided
  const [movePicker, setMovePicker] = useState<string[] | null>(null)
  const [conflict, setConflict] = useState<{ paths: string[]; targetDir: string } | null>(null)
  // folder row currently hovered by a drag (sidebar or table)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const dragExpandTimer = useRef<number | null>(null)

  const loadRoot = useCallback(() => {
    void window.aiOffice.folderRoots().then((next) => {
      setRoots((prev) => {
        if (prev[0] && prev[0].path !== next[0]?.path) {
          // the default save folder changed in settings: the old tree is meaningless
          resetFolders()
          setSelectedFolder(null)
          setExpanded(new Set(next.map((r) => r.path)))
        } else if (prev.length > 0) {
          // a folder just added opens so its contents show right away
          const known = new Set(prev.map((r) => r.path))
          const added = next.filter((r) => !known.has(r.path)).map((r) => r.path)
          if (added.length > 0) setExpanded((e) => new Set([...e, ...added]))
        }
        return next
      })
    })
  }, [resetFolders])

  useEffect(loadRoot, [loadRoot])

  useEffect(() => {
    if (root?.usable) writeTreeState({ expanded: [...expanded], root: root.path })
  }, [expanded, root])

  useEffect(() => {
    if (!root?.usable) return
    if (seededRoot.current !== root.path) {
      seededRoot.current = root.path
      if (treeState.root !== root.path) {
        // a layout saved for another root is not ours: start from the root rows
        setExpanded(new Set(roots.map((r) => r.path)))
        return
      }
    }
    for (const dir of expanded) loadFolder(dir)
  }, [root, roots, expanded, loadFolder, treeState])

  useEffect(() => {
    if (selectedFolder) loadFolder(selectedFolder)
  }, [selectedFolder, loadFolder])

  // a remembered selection that no longer exists (deleted in Finder) falls back to the root
  useEffect(() => {
    if (!selectedFolder || roots.length === 0) return
    const owner = rootOf(selectedFolder, roots)
    if (!owner?.readable) {
      setSelectedFolder(null)
      return
    }
    if (listings.get(selectedFolder)?.missing) {
      setSelectedFolder(selectedFolder === owner.path ? null : dirOf(selectedFolder))
    }
  }, [roots, selectedFolder, listings])

  useEffect(() => {
    return window.aiOffice.onFolderChanged((dirs) => {
      invalidateFolders(dirs.filter(trackedFolder))
    })
  }, [invalidateFolders, trackedFolder])

  // ── Paged loading ──
  // stale responses are dropped via a request sequence number (when views/filters switch quickly)
  const requestSeq = useRef(0)
  const entriesLen = useRef(0)
  entriesLen.current = entries.length

  /** reload the list; keepCount keeps the loaded row count (refresh), otherwise back to page one */
  const reload = (keepCount: boolean) => {
    const seq = ++requestSeq.current
    const ext = filter === 'all' ? undefined : filter
    const limit = keepCount ? Math.max(entriesLen.current, PAGE_SIZE) : PAGE_SIZE
    const primary = view === 'recent' ? window.aiOffice.recents : window.aiOffice.starred
    const secondary = view === 'recent' ? window.aiOffice.starred : window.aiOffice.recents
    void primary({ offset: 0, limit, ext }).then((page) => {
      if (seq !== requestSeq.current) return
      setEntries(page.entries)
      setListTotal(page.total)
      setNavCounts((prev) =>
        view === 'recent'
          ? { ...prev, recent: visiblePageCount(page) }
          : { ...prev, starred: visiblePageCount(page) },
      )
    })
    // The other view fetches only its count under the same active filter.
    void secondary({ offset: 0, limit: 0, ext }).then((page) => {
      if (seq !== requestSeq.current) return
      setNavCounts((prev) =>
        view === 'recent'
          ? { ...prev, starred: visiblePageCount(page) }
          : { ...prev, recent: visiblePageCount(page) },
      )
    })
  }
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  /** everything on screen re-pulls: the paged list, the root and every loaded folder */
  const refresh = () => {
    reloadRef.current(true)
    loadRoot()
    invalidateFolders([...listings.keys()])
  }
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    reloadRef.current(false)
  }, [view, filter])

  const q = searchQuery.trim()
  useEffect(() => {
    if (!q) {
      searchSeq.current++
      setSearchPage(null)
      return
    }
    let timer = 0
    const run = () => {
      if (composingRef.current) {
        timer = window.setTimeout(run, 150)
        return
      }
      const seq = ++searchSeq.current
      const ext = filter === 'all' ? undefined : filter
      void window.aiOffice.searchFiles({ q, ext, limit: 100 }).then((page) => {
        if (seq !== searchSeq.current) return
        setSearchPage(page)
        // results grow while the background index catches up
        if (page.index.pending > 0 || page.index.scanning) timer = window.setTimeout(run, 1500)
      })
    }
    timer = window.setTimeout(run, 150)
    return () => window.clearTimeout(timer)
  }, [q, filter])

  // Jev judges the top local hits once they settle; the main process answers null when reranking is off.
  // The key changes only with the query, filter or candidate set, so index polls do not restart the timer.
  const rerankKey =
    q && searchPage && searchPage.hits.length >= 2
      ? [q, filter, ...searchPage.hits.slice(0, 20).map((h) => h.path)].join('\n')
      : ''
  useEffect(() => {
    if (!rerankKey) return
    const key = rerankKey
    const paths = key.split('\n').slice(2)
    const timer = window.setTimeout(() => {
      void window.aiOffice.rerankSearch({ q, paths }).then((result) => {
        if (result) setRerank({ key, result })
        else setRerank((cur) => (cur && cur.key === key ? null : cur))
      })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [q, filter, rerankKey, rerankSettingsTick])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      if (event.key !== 'f' && event.key !== 'p') return
      const input = searchInputRef.current
      if (!input) return
      event.preventDefault()
      input.focus()
      input.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onFocus = () => refreshRef.current()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const hasMore = entries.length < listTotal

  // unified dismissal: outside press, window blur, chrome press (tab strip / window drag)
  useDismissablePopover(fileSortMenuOpen, () => setFileSortMenuOpen(false), {
    inside: () => [fileSortRef.current],
  })

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const seq = requestSeq.current
    const ext = filter === 'all' ? undefined : filter
    const api = view === 'recent' ? window.aiOffice.recents : window.aiOffice.starred
    void api({ offset: entriesLen.current, limit: PAGE_SIZE, ext }).then((page) => {
      setLoadingMore(false)
      if (seq !== requestSeq.current) return
      setEntries((prev) => [...prev, ...page.entries])
      setListTotal(page.total)
    })
  }
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  // oldest-first over a partially loaded list would miss the tail pages —
  // keep pulling until the list is complete (backend caps recents at 100)
  useEffect(() => {
    if (fileSort === 'oldest' && hasMore) loadMoreRef.current()
  }, [fileSort, hasMore, entries.length])

  // Load the next page once the bottom sentinel enters the viewport (240px early);
  // depending on entries.length rebuilds the observer after each page — observe fires an immediate
  // callback, so while the sentinel stays in view we keep loading until full or exhausted
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) loadMoreRef.current()
      },
      { rootMargin: '240px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, entries.length])

  // unified dismissal: outside press, window blur, chrome press (tab strip / window drag)
  useDismissablePopover(rowMenu !== null, () => setRowMenu(null), {
    inside: () => [rowMenuWrapRef.current],
  })
  useDismissablePopover(folderMenu !== null, () => setFolderMenu(null), {
    inside: () => [folderMenuWrapRef.current],
  })
  // the fixed-position folder menu would detach from its row while the tree scrolls
  useEffect(() => {
    if (
      rowMenu === null &&
      folderMenu === null &&
      confirmDelete === null &&
      confirmMissing === null &&
      confirmDeleteFolder === null
    )
      return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRowMenu(null)
        setFolderMenu(null)
        setConfirmDelete(null)
        setConfirmMissing(null)
        setConfirmDeleteFolder(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rowMenu, confirmDelete])

  // ── Project files state ────────────────────────────────

  const [projectFileEntries, setProjectFileEntries] = useState<RecentEntry[]>([])
  const [moveFileMenu, setMoveFileMenu] = useState<string | null>(null)
  // submenu opens rightward by default; flips left when the window edge is too close
  const [moveMenuFlip, setMoveMenuFlip] = useState(false)
  // hover-open/close delays: avoid flashing the submenu while the pointer passes
  // through, and keep it open while crossing the 4px gap into it
  const moveMenuTimers = useRef<{ open: number | null; close: number | null }>({
    open: null,
    close: null,
  })
  // wrap (trigger + submenu) of the row whose move submenu is open — the dismissal guard root
  const moveMenuWrapRef = useRef<HTMLDivElement>(null)

  const openMoveMenu = (path: string) => {
    setMoveMenuFlip(false)
    setMoveFileMenu(path)
  }

  // ref runs pre-paint, so measuring the real width (long project names exceed
  // the min-width) and flipping never flashes; once flipped the check no longer hits
  const measureSubmenu = (el: HTMLDivElement | null) => {
    if (el && el.getBoundingClientRect().right > document.documentElement.clientWidth - 8) {
      setMoveMenuFlip(true)
    }
  }

  const clearMoveMenuTimer = (kind: 'open' | 'close') => {
    const timers = moveMenuTimers.current
    if (timers[kind] !== null) {
      window.clearTimeout(timers[kind])
      timers[kind] = null
    }
  }
  const [bulkMoveMenu, setBulkMoveMenu] = useState(false)
  // selection-bar wrap (trigger + menu) of the bulk move menu — the dismissal guard root
  const bulkMoveWrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!projectMode || !selectedProjectId) {
      setProjectFileEntries([])
      return
    }
    let active = true
    const api = window.aiOfficeProject!
    void api.listFiles(selectedProjectId).then(async (paths) => {
      const stats = await window.aiOffice.statPaths(paths)
      if (!active) return
      setProjectFileEntries(stats.sort((a, b) => b.mtimeMs - a.mtimeMs))
    })
    return () => {
      active = false
    }
  }, [projectMode, selectedProjectId, projectTick])

  // the submenu lives inside the row menu: when that closes, drop the stale
  // submenu state and any pending hover timers so it doesn't reopen expanded
  useEffect(() => {
    if (rowMenu === null) {
      clearMoveMenuTimer('open')
      clearMoveMenuTimer('close')
      setMoveFileMenu(null)
    }
  }, [rowMenu])

  // move-file submenu: unified dismissal (outside press, window blur, chrome press)
  useDismissablePopover(moveFileMenu !== null, () => setMoveFileMenu(null), {
    inside: () => [moveMenuWrapRef.current],
  })

  // bulk move-to-project menu in the selection bar: unified dismissal, plus Escape
  useDismissablePopover(bulkMoveMenu, () => setBulkMoveMenu(false), {
    inside: () => [bulkMoveWrapRef.current],
  })
  useEffect(() => {
    if (!bulkMoveMenu) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBulkMoveMenu(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bulkMoveMenu])


  // WPS-style sortable "modified" column header, shared by both file tables
  const renderModifiedHeader = () => (
    <div className="cloud-col-sort" ref={fileSortRef}>
      <button
        className="cloud-col-sort-btn"
        aria-haspopup="menu"
        aria-expanded={fileSortMenuOpen}
        onClick={() => setFileSortMenuOpen((o) => !o)}
      >
        {t('colModified')}
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={fileSort === 'oldest' ? { transform: 'rotate(180deg)' } : undefined}
        >
          <path
            d="M8 3v10M4.5 9.5L8 13l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {fileSortMenuOpen && (
        <div className="cloud-sort-menu" role="menu">
          {(['recent', 'oldest'] as const).map((key) => (
            <button
              key={key}
              className={fileSort === key ? 'active' : ''}
              role="menuitemradio"
              aria-checked={fileSort === key}
              onClick={() => {
                setFileSort(key)
                setFileSortMenuOpen(false)
              }}
            >
              <SortCheck visible={fileSort === key} />
              {t(key === 'recent' ? 'cloudSortRecent' : 'cloudSortOldest')}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ── Plain view (no folder selected): filtering runs in the main process; entries is the visible list ──
  const selectedPaths = entries.filter((e) => selected.has(e.path)).map((e) => e.path)
  const allSelected = entries.length > 0 && selectedPaths.length === entries.length

  // folder view: files of the selected folder under the type filter; shares the same `selected` set
  const folderListing = selectedFolder ? listings.get(selectedFolder) : undefined
  const folderFiles = (folderListing?.files ?? []).filter((e) => matchesFilter(e, filter))
  const folderSubfolders = folderListing?.folders ?? []
  const folderSelectedPaths = folderFiles.filter((e) => selected.has(e.path)).map((e) => e.path)
  const folderAllSelected =
    folderFiles.length > 0 && folderSelectedPaths.length === folderFiles.length

  const changeView = (next: 'recent' | 'starred') => {
    setView(next)
    setSelectedFolder(null)
    setCloudMode(false)
    setSelected(new Set())
    setRowMenu(null)
  }

  const changeFilter = (key: string) => {
    setFilter(key)
    setSelected(new Set())
    setRowMenu(null)
  }

  const selectFolder = (dir: string) => {
    setSelectedFolder(dir)
    setCloudMode(false)
    setSelected(new Set())
    setRowMenu(null)
    setFolderMenu(null)
  }

  const toggleExpanded = (dir: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }

  const expandTo = (dir: string) => {
    const owner = rootOf(dir, roots)
    if (!owner) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const crumb of crumbsOf(owner, dir)) next.add(crumb.path)
      return next
    })
  }

  const toggleSelect = (path: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.path)))
  }

  const toggleSelectAllFolder = () => {
    setSelected(folderAllSelected ? new Set() : new Set(folderFiles.map((e) => e.path)))
  }

  const toggleStar = (path: string) => {
    void window.aiOffice.toggleStar(path).then(refresh)
  }

  const removeRecent = (paths: string[]) => {
    setRowMenu(null)
    setSelected(new Set())
    void window.aiOffice.removeRecent(paths).then(refresh)
  }

  const deleteFiles = (paths: string[]) => {
    setRowMenu(null)
    setConfirmDelete(paths)
  }

  const confirmDeleteNow = () => {
    const paths = confirmDelete ?? []
    setConfirmDelete(null)
    setSelected(new Set())
    void window.aiOffice.deleteFiles(paths).then(refresh)
  }

  const duplicateFile = (path: string) => {
    setRowMenu(null)
    void window.aiOffice.duplicateFile(path).then(refresh)
  }

  const startRename = (entry: RecentEntry) => {
    setRowMenu(null)
    setRenaming({ path: entry.path, value: baseName(entry) })
  }

  const commitRename = (entry: RecentEntry) => {
    const value = renaming?.value.trim() ?? ''
    setRenaming(null)
    if (!value || value === baseName(entry)) return
    const newName = entry.ext ? `${value}.${entry.ext}` : value
    void window.aiOffice.renameFile(entry.path, newName).then((result) => {
      if (!result.ok) window.alert(result.error ?? t('renameFailed'))
      refresh()
    })
  }

  // ── Folder actions ──

  const startCreateFolder = (parent: string) => {
    setFolderMenu(null)
    expandTo(parent)
    setCreating({ parent })
    setNewFolderName('')
  }

  // inline inputs commit on Enter or blur and cancel on Escape; the blur an
  // unmount may fire reads the edit from refs mirrored during render, so a
  // finished or cancelled edit is a no-op (see FolderPicker.commitCreate)
  const creatingFolderRef = useRef<{ parent: string; name: string } | null>(null)
  creatingFolderRef.current = creating ? { parent: creating.parent, name: newFolderName } : null
  const folderRenamingRef = useRef(folderRenaming)
  folderRenamingRef.current = folderRenaming

  const commitCreateFolder = async () => {
    const pending = creatingFolderRef.current
    creatingFolderRef.current = null
    const name = pending?.name.trim()
    setCreating(null)
    setNewFolderName('')
    if (!pending || !name) return
    const result = await window.aiOffice.createFolder(pending.parent, name)
    if (!result.ok) {
      window.alert(result.error ?? t('renameFailed'))
      return
    }
    invalidateFolders([pending.parent])
  }

  const startRenameFolder = (entry: { path: string; name: string }, where: 'tree' | 'table') => {
    setFolderMenu(null)
    setRowMenu(null)
    setFolderRenaming({ path: entry.path, where, value: entry.name })
  }

  const commitRenameFolder = async () => {
    const pending = folderRenamingRef.current
    folderRenamingRef.current = null
    setFolderRenaming(null)
    if (!pending) return
    const value = pending.value.trim()
    if (!value || value === fileName(pending.path)) return
    const result = await window.aiOffice.renameFolder(pending.path, value)
    if (!result.ok) {
      window.alert(result.error ?? t('renameFailed'))
      return
    }
    if (result.path) {
      const renamed = result.path
      // selection / expansion follow the renamed folder (and anything inside it)
      const rebase = (p: string) =>
        p === pending.path || isUnder(pending.path, p) ? renamed + p.slice(pending.path.length) : p
      setExpanded((prev) => new Set([...prev].map(rebase)))
      if (selectedFolder) setSelectedFolder(rebase(selectedFolder))
    }
    refresh()
  }

  const moveFileTo = async (filePath: string, targetProjectId: string) => {
    setMoveFileMenu(null)
    setRowMenu(null)
    await window.aiOfficeProject?.moveFile(filePath, targetProjectId)

    refresh()
  }

  const confirmDeleteFolderNow = async () => {
    const dir = confirmDeleteFolder
    setConfirmDeleteFolder(null)
    if (!dir) return
    await window.aiOffice.deleteFolder(dir)
    if (selectedFolder && (selectedFolder === dir || isUnder(dir, selectedFolder))) {
      setSelectedFolder(dirOf(dir))
    }
    refresh()
  }

  const startMove = (paths: string[]) => {
    setRowMenu(null)
    setFolderMenu(null)
    if (paths.length > 0) setMovePicker(paths)
  }

  const doMove = async (paths: string[], targetDir: string, policy: MoveConflictPolicy) => {
    setMovePicker(null)
    setConflict(null)
    setSelected(new Set())
    const result = await window.aiOffice.movePaths(paths, targetDir, policy)
    if (result.moved.length > 0 && selectedFolder) {
      // a moved folder that held the selection drags the selection along
      for (const { from, to } of result.moved) {
        if (selectedFolder === from || isUnder(from, selectedFolder)) {
          setSelectedFolder(to + selectedFolder.slice(from.length))
        }
      }
    }
    refresh()
    if (result.failed.length > 0) window.alert(result.failed[0].error)
    if (result.conflicts.length > 0) setConflict({ paths: result.conflicts, targetDir })
  }

  // ── Drag & drop (rows → folder rows) ──

  const dragPathsFor = (path: string, context: 'global' | 'folder'): string[] => {
    const pool = context === 'folder' ? folderSelectedPaths : selectedPaths
    return pool.includes(path) ? pool : [path]
  }

  const onRowDragStart = (event: ReactDragEvent, paths: string[]) => {
    event.dataTransfer.setData(DRAG_PATHS_MIME, JSON.stringify(paths))
    event.dataTransfer.effectAllowed = 'move'
    setRowMenu(null)
  }

  const readDragPaths = (event: ReactDragEvent): string[] => {
    try {
      const raw = JSON.parse(event.dataTransfer.getData(DRAG_PATHS_MIME)) as unknown
      return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : []
    } catch {
      return []
    }
  }

  const moveSelectedToProject = async (targetProjectId: string) => {
    const paths = [...selected]
    if (paths.length === 0) return
    // drop moved rows immediately (same as moveFileTo) so they cannot be
    // re-selected or re-moved while the sequential IPC loop is in flight
    const moved = new Set(paths)
    setProjectFileEntries((prev) => prev.filter((e) => !moved.has(e.path)))
    for (const path of paths) {
      await window.aiOfficeProject?.moveFile(path, targetProjectId)
    }
    refresh()
  }

  const clearDragExpand = () => {
    if (dragExpandTimer.current !== null) {
      window.clearTimeout(dragExpandTimer.current)
      dragExpandTimer.current = null
    }
  }

  const folderDropProps = (dir: string, { autoExpand }: { autoExpand: boolean }) => ({
    onDragOver: (event: ReactDragEvent) => {
      if (rootOf(dir, roots)?.usable === false) return
      if (!event.dataTransfer.types.includes(DRAG_PATHS_MIME)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (dropTarget !== dir) {
        setDropTarget(dir)
        clearDragExpand()
        if (autoExpand && !expanded.has(dir)) {
          dragExpandTimer.current = window.setTimeout(() => {
            setExpanded((prev) => new Set([...prev, dir]))
          }, DRAG_EXPAND_DELAY_MS)
        }
      }
    },
    onDragLeave: (event: ReactDragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      if (dropTarget === dir) setDropTarget(null)
      clearDragExpand()
    },
    onDrop: (event: ReactDragEvent) => {
      event.preventDefault()
      setDropTarget(null)
      clearDragExpand()
      const paths = readDragPaths(event).filter((p) => p !== dir && !isUnder(p, dir))
      if (paths.length > 0) void doMove(paths, dir, 'ask')
    },
  })

  // ── New file (lands in the selected folder) ──
  const newFileOpts =
    selectedFolder && root && selectedFolder !== root.path && rootOf(selectedFolder, roots)?.usable
      ? { dir: selectedFolder }
      : undefined

  const handleNewMail = () => {
    if (!isDevMode) return
    void window.aiOffice.newMail()
  }

  const NEW_ITEMS = [
    {
      ext: 'docx',
      title: t('newDoc'),
      sub: '.docx',
      action: () => window.aiOffice.newDoc(newFileOpts),
    },
    {
      ext: 'xlsx',
      title: t('newSheet'),
      sub: '.xlsx',
      action: () => window.aiOffice.newSheet(newFileOpts),
    },
    {
      ext: 'pptx',
      title: t('newSlide'),
      sub: '.pptx',
      action: () => window.aiOffice.newSlide(newFileOpts),
    },
    {
      ext: 'md',
      title: t('newMarkdown'),
      sub: '.md',
      action: () => window.aiOffice.newMarkdown(newFileOpts),
    },
    {
      ext: 'html',
      title: t('newHtml'),
      sub: '.html',
      action: () => window.aiOffice.newHtml(newFileOpts),
    },
    {
      ext: 'pdf',
      title: t('newPdf'),
      sub: '.pdf',
      action: () => window.aiOffice.newPdf(newFileOpts),
    },
    {
      ext: 'eml',
      title: t('newMail'),
      sub: isDevMode ? '.pst' : 'Coming Soon',
      action: handleNewMail,
      badge: isDevMode ? 'AI' : 'Soon',
      disabled: !isDevMode,
    },
  ]

  function renderQuickCards() {
    return (
      <div className="quick-cards">
        {NEW_ITEMS.map((item) => (
          <button
            key={item.ext}
            className={`quick-card${item.disabled ? ' is-disabled' : ''}`}
            onClick={() => void item.action()}
            title={item.disabled ? 'Available in Developer Mode' : undefined}
          >
            <FileBadge ext={item.ext} size={30} />
            <span className="quick-text">
              <span className="quick-title-row">
                <span className="quick-title">{item.title}</span>
                <span className={item.badge === 'Soon' ? 'soon-chip' : 'ai-chip'}>{item.badge}</span>
              </span>
              <span className="quick-sub">{item.sub}</span>
            </span>
          </button>
        ))}
        <button
          className="quick-card"
          onClick={() => void window.aiOffice.browse()}
          data-tip={OPEN_LOCAL_EXTENSIONS}
        >
          <span className="quick-folder">
            <FolderIcon size={18} />
          </span>
          <span className="quick-text">
            <span className="quick-title-row">
              <span className="quick-title">{t('openLocal')}</span>
            </span>
            <span className="quick-sub">{OPEN_LOCAL_EXTENSIONS}</span>
          </span>
        </button>
      </div>
    )
  }

  // ── Sidebar folder tree ──

  const addFolderRoot = () => {
    void window.aiOffice.addFolderRoot().then((added) => {
      if (added) loadRoot()
    })
  }

  /** the folder leaves the list only; whatever it held on disk stays where it is */
  const removeFolderRoot = (path: string) => {
    setFolderMenu(null)
    if (selectedFolder && isUnder(path, selectedFolder)) setSelectedFolder(null)
    setExpanded((prev) => new Set([...prev].filter((dir) => !isUnder(path, dir))))
    void window.aiOffice.removeFolderRoot(path).then(loadRoot)
  }

  // folders dragged in from the OS join the tree in place; documents open as they do anywhere else
  const panelDropProps = {
    onDragOver: (event: ReactDragEvent) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'link'
      if (!panelDrop) setPanelDrop(true)
    },
    onDragLeave: (event: ReactDragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      setPanelDrop(false)
    },
    onDrop: (event: ReactDragEvent) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      setPanelDrop(false)
      const paths = Array.from(event.dataTransfer.files)
        .map((file) => window.aiOffice.pathForFile(file))
        .filter(Boolean)
      if (paths.length === 0) return
      void window.aiOffice.dropFolderRoots(paths).then((added) => {
        if (added.length > 0) loadRoot()
      })
    },
  }

  const renderFolderMenu = (entry: { path: string; name: string }, rootEntry?: FolderRoot) => (
    <div
      className="folder-menu-wrap"
      ref={menuOpenAt('tree', entry.path) ? folderMenuWrapRef : undefined}
    >
      <button
        className="folder-more-btn"
        aria-label={t('folderMoreActions', { name: entry.name })}
        aria-expanded={menuOpenAt('tree', entry.path)}
        onClick={(e) => {
          e.stopPropagation()
          if (menuOpenAt('tree', entry.path)) {
            setFolderMenu(null)
            return
          }
          const rect = e.currentTarget.getBoundingClientRect()
          setFolderMenu({
            path: entry.path,
            where: 'tree',
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
          })
        }}
      >
        <MoreDots />
      </button>
      {folderMenu && menuOpenAt('tree', entry.path) && (
        <div
          className="folder-menu"
          role="menu"
          style={{ top: folderMenu.top, right: folderMenu.right }}
        >
          {editableAt(entry.path) && (
            <button role="menuitem" onClick={() => startCreateFolder(entry.path)}>
              {t('newSubfolder')}
            </button>
          )}
          {!rootEntry && editableAt(entry.path) && (
            <button role="menuitem" onClick={() => startRenameFolder(entry, 'tree')}>
              {t('rename')}
            </button>
          )}
          {!rootEntry && editableAt(entry.path) && (
            <button role="menuitem" onClick={() => startMove([entry.path])}>
              {t('moveToFolder')}
            </button>
          )}
          {(rootEntry?.readable ?? true) && (
            <button
              role="menuitem"
              onClick={() => {
                setFolderMenu(null)
                void window.aiOffice.revealPath(entry.path)
              }}
            >
              {t('revealInFolder')}
            </button>
          )}
          {!rootEntry && editableAt(entry.path) && (
            <>
              <div className="row-menu-divider" />
              <button
                role="menuitem"
                className="danger"
                onClick={() => {
                  setFolderMenu(null)
                  setConfirmDeleteFolder(entry.path)
                }}
              >
                {t('deleteFolder')}
              </button>
            </>
          )}
          {rootEntry?.removable && (
            <>
              <div className="row-menu-divider" />
              <button role="menuitem" onClick={() => removeFolderRoot(entry.path)}>
                {t('removeFolderRoot')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )

  const renderNewFolderInput = (depth: number) => (
    <li className="tree-item">
      <div className="tree-row" style={{ paddingLeft: 8 + depth * 14 }}>
        <span className="tree-chevron" aria-hidden="true" />
        <span className="tree-icon" aria-hidden="true">
          <FolderIcon />
        </span>
        <input
          className="folder-rename-input inline"
          autoFocus
          placeholder={t('untitledFolder')}
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onBlur={() => void commitCreateFolder()}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Enter') void commitCreateFolder()
            if (e.key === 'Escape') {
              setCreating(null)
              setNewFolderName('')
            }
          }}
        />
      </div>
    </li>
  )

  function renderTreeNode(
    entry: { path: string; name: string; hasSubfolders: boolean },
    depth: number,
  ): ReactElement {
    const rootEntry = roots.find((r) => r.path === entry.path)
    const isRoot = rootEntry !== undefined
    const unavailable = rootEntry !== undefined && !rootEntry.readable
    const isOpen = expanded.has(entry.path) && !unavailable
    const children = listings.get(entry.path)?.folders ?? []
    const isActive = selectedFolder === entry.path
    const isRenaming = folderRenaming?.where === 'tree' && folderRenaming.path === entry.path
    const showChevron = !unavailable && (isRoot || entry.hasSubfolders || children.length > 0)
    return (
      <li key={entry.path} className="tree-item">
        <div
          className={`tree-row${isActive ? ' active' : ''}${dropTarget === entry.path ? ' drop-target' : ''}${unavailable ? ' unavailable' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          role="treeitem"
          aria-selected={isActive}
          aria-expanded={showChevron ? isOpen : undefined}
          tabIndex={0}
          title={isRoot ? entry.path : undefined}
          onClick={() => {
            if (!unavailable) selectFolder(entry.path)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !unavailable) selectFolder(entry.path)
            if (e.key === 'ArrowRight' && !isOpen) toggleExpanded(entry.path)
            if (e.key === 'ArrowLeft' && isOpen) toggleExpanded(entry.path)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setFolderMenu({
              path: entry.path,
              where: 'tree',
              top: e.clientY + 2,
              right: window.innerWidth - e.clientX,
            })
          }}
          draggable={!isRoot && !isRenaming}
          onDragStart={(e) => onRowDragStart(e, [entry.path])}
          {...folderDropProps(entry.path, { autoExpand: true })}
        >
          <button
            className="tree-chevron"
            tabIndex={-1}
            aria-hidden="true"
            style={{ visibility: showChevron ? undefined : 'hidden' }}
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded(entry.path)
            }}
          >
            <Chevron open={isOpen} />
          </button>
          <span className="tree-icon" aria-hidden="true">
            <FolderIcon open={isOpen} />
          </span>
          {isRenaming ? (
            <input
              className="folder-rename-input inline"
              value={folderRenaming.value}
              autoFocus
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                setFolderRenaming({ path: entry.path, where: 'tree', value: e.target.value })
              }
              onBlur={() => void commitRenameFolder()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') void commitRenameFolder()
                if (e.key === 'Escape') setFolderRenaming(null)
              }}
            />
          ) : (
            <span className="tree-name">{entry.name}</span>
          )}
          {unavailable && <span className="tree-hint">{t('rootUnavailable')}</span>}
          {renderFolderMenu(entry, rootEntry)}
        </div>
        {isOpen && (children.length > 0 || creating?.parent === entry.path) && (
          <ul className="tree-children" role="group">
            {creating?.parent === entry.path && renderNewFolderInput(depth + 1)}
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  function renderFolderPanel() {
    const createIn = selectedFolder ?? root?.path
    const canCreate = createIn !== undefined && rootOf(createIn, roots)?.usable === true
    return (
      <div className={`folder-panel${panelDrop ? ' drop-target' : ''}`} {...panelDropProps}>
        <div className="folder-panel-head">
          <span className="folder-panel-title">{t('folders')}</span>
          <div className="folder-panel-actions">
            {roots.length > 0 && (
              <button
                className="folder-add-btn folder-add-root-btn"
                data-tip={t('addFolderRoot')}
                aria-label={t('addFolderRoot')}
                onClick={addFolderRoot}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1" />
                  <path d="M2 13h10" />
                  <path d="m9 16 3-3-3-3" />
                </svg>
              </button>
            )}
            {canCreate && (
              <button
                className="folder-add-btn folder-new-btn"
                data-tip={t('newFolder')}
                aria-label={t('newFolder')}
                onClick={() => startCreateFolder(createIn)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        <ul className="tree" role="tree">
          {root && !root.usable ? (
            <li className="folder-unusable">
              <p>{t('rootUnusable')}</p>
              <button
                className="btn btn-secondary"
                onClick={() => void window.aiOffice.pickDefaultSaveDir().then(() => loadRoot())}
              >
                {t('pickSaveDir')}
              </button>
            </li>
          ) : (
            root && renderTreeNode({ path: root.path, name: root.name, hasSubfolders: true }, 0)
          )}
          {roots
            .slice(1)
            .map((r) =>
              renderTreeNode({ path: r.path, name: r.name, hasSubfolders: r.readable }, 0),
            )}
        </ul>
      </div>
    )
  }

  // ── File row rendering (shared by the plain view and the folder view) ──

  function renderFileRow(entry: RecentEntry, context: 'global' | 'folder') {
    const isRenaming = renaming?.path === entry.path
    const editable = editableAt(entry.path)
    const canDelete =
      context === 'folder' ? folderSelectedPaths.length === 0 : selectedPaths.length === 0
    return (
      <li className="recent-row" key={entry.path}>
        <div
          className="recent-item"
          role="button"
          tabIndex={0}
          draggable={!isRenaming && !entry.missing}
          onDragStart={(e) => onRowDragStart(e, dragPathsFor(entry.path, context))}
          onClick={() => {
            if (!isRenaming) void window.aiOffice.openPath(entry.path)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target === event.currentTarget) {
              void window.aiOffice.openPath(entry.path)
            }
          }}
        >
          <span className="col-check" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              className="row-check"
              checked={selected.has(entry.path)}
              onChange={(event) => toggleSelect(entry.path, event.target.checked)}
              aria-label={t('selectFile', { name: entry.name })}
            />
          </span>
          <span className="recent-icon">
            <FileBadge ext={entry.ext} size={24} />
          </span>
          {isRenaming ? (
            <input
              className="rename-input"
              value={renaming.value}
              autoFocus
              onFocus={(event) => event.target.select()}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenaming({ path: entry.path, value: event.target.value })}
              onBlur={() => commitRename(entry)}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter') commitRename(entry)
                if (event.key === 'Escape') setRenaming(null)
              }}
            />
          ) : (
            <span className="recent-name">{entry.name}</span>
          )}
          <span className="recent-path" title={dirOf(entry.path)}>
            {locationLabel(entry.path, roots)}
          </span>
          <span className="recent-time">
            {entry.missing ? '—' : formatModified(entry.mtimeMs, i18n)}
          </span>
          <span className="recent-size">{entry.missing ? '—' : formatSize(entry.sizeBytes)}</span>

          <button
            className={`star-btn${entry.starred ? ' starred' : ''}`}
            aria-label={entry.starred ? t('unstar') : t('star')}
            onClick={(event) => {
              event.stopPropagation()
              toggleStar(entry.path)
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1.9l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.6l-3.8 2 .72-4.23-3.07-3 4.25-.62z"
                fill={entry.starred ? '#f5a623' : 'none'}
                stroke={entry.starred ? '#f5a623' : 'currentColor'}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span
            className="recent-actions"
            ref={rowMenu === entry.path ? rowMenuWrapRef : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="more-btn"
              aria-label={t('moreActions')}
              aria-expanded={rowMenu === entry.path}
              onClick={() => setRowMenu(rowMenu === entry.path ? null : entry.path)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="3.2" cy="8" r="1.4" fill="currentColor" />
                <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                <circle cx="12.8" cy="8" r="1.4" fill="currentColor" />
              </svg>
            </button>
            {rowMenu === entry.path && (
              <div className="row-menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    setRowMenu(null)
                    void window.aiOffice.openPath(entry.path)
                  }}
                >
                  {t('open')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setRowMenu(null)
                    void window.aiOffice.revealPath(entry.path)
                  }}
                >
                  {t('revealInFolder')}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setRowMenu(null)
                    void navigator.clipboard.writeText(entry.path)
                  }}
                >
                  {t('copyPath')}
                </button>
                {canMove && editable && !entry.missing && (
                  <>
                    <div className="row-menu-divider" />
                    <button role="menuitem" onClick={() => startMove([entry.path])}>
                      {t('moveToFolder')}
                    </button>
                  </>
                )}
                {editable && (
                  <>
                    <div className="row-menu-divider" />
                    <button role="menuitem" onClick={() => startRename(entry)}>
                      {t('rename')}
                    </button>
                    <button role="menuitem" onClick={() => duplicateFile(entry.path)}>
                      {t('duplicate')}
                    </button>
                  </>
                )}
                {canDelete && (context === 'global' || editable) && (
                  <>
                    <div className="row-menu-divider" />
                    {context === 'global' && (
                      <button role="menuitem" onClick={() => removeRecent([entry.path])}>
                        {t('removeFromList')}
                      </button>
                    )}
                    {editable && (
                      <button
                        role="menuitem"
                        className="danger"
                        onClick={() => deleteFiles([entry.path])}
                      >
                        {t('deleteFiles')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </span>
        </div>
      </li>
    )
  }

  /** sub-folder row in the folder view's table: enter on click, same … menu as the tree */
  function renderSubfolderRow(entry: FolderEntry) {
    const isRenaming = folderRenaming?.where === 'table' && folderRenaming.path === entry.path
    const editable = editableAt(entry.path)
    return (
      <li className="recent-row" key={entry.path}>
        <div
          className={`recent-item folder-item${dropTarget === entry.path ? ' drop-target' : ''}`}
          role="button"
          tabIndex={0}
          draggable={!isRenaming}
          onDragStart={(e) => onRowDragStart(e, [entry.path])}
          {...folderDropProps(entry.path, { autoExpand: false })}
          onClick={() => {
            if (isRenaming) return
            expandTo(entry.path)
            selectFolder(entry.path)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target === event.currentTarget) {
              expandTo(entry.path)
              selectFolder(entry.path)
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setFolderMenu({
              path: entry.path,
              where: 'table',
              top: e.clientY + 2,
              right: window.innerWidth - e.clientX,
            })
          }}
        >
          <span className="col-check" aria-hidden="true" />
          <span className="recent-icon folder-badge">
            <FolderIcon size={22} />
          </span>
          {isRenaming ? (
            <input
              className="rename-input"
              value={folderRenaming.value}
              autoFocus
              onFocus={(event) => event.target.select()}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                setFolderRenaming({ path: entry.path, where: 'table', value: event.target.value })
              }
              onBlur={() => void commitRenameFolder()}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter') void commitRenameFolder()
                if (event.key === 'Escape') setFolderRenaming(null)
              }}
            />
          ) : (
            <span className="recent-name">{entry.name}</span>
          )}
          <span className="recent-path">{t('folderType')}</span>
          <span className="recent-time">{formatModified(entry.mtimeMs, i18n)}</span>
          <span className="recent-size">—</span>
          <span />
          <span
            className="recent-actions"
            ref={menuOpenAt('table', entry.path) ? folderMenuWrapRef : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="more-btn"
              aria-label={t('folderMoreActions', { name: entry.name })}
              aria-expanded={menuOpenAt('table', entry.path)}
              onClick={(e) => {
                if (menuOpenAt('table', entry.path)) {
                  setFolderMenu(null)
                  return
                }
                const rect = e.currentTarget.getBoundingClientRect()
                setFolderMenu({
                  path: entry.path,
                  where: 'table',
                  top: rect.bottom + 4,
                  right: window.innerWidth - rect.right,
                })
              }}
            >
              <MoreDots />
            </button>
            {folderMenu && menuOpenAt('table', entry.path) && (
              <div
                className="folder-menu"
                role="menu"
                style={{ top: folderMenu.top, right: folderMenu.right }}
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setFolderMenu(null)
                    expandTo(entry.path)
                    selectFolder(entry.path)
                  }}
                >
                  {t('open')}
                </button>
                {editable && (
                  <>
                    <button role="menuitem" onClick={() => startRenameFolder(entry, 'table')}>
                      {t('rename')}
                    </button>
                    <button role="menuitem" onClick={() => startMove([entry.path])}>
                      {t('moveToFolder')}
                    </button>
                  </>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    setFolderMenu(null)
                    void window.aiOffice.revealPath(entry.path)
                  }}
                >
                  {t('revealInFolder')}
                </button>
                {editable && (
                  <>
                    <div className="row-menu-divider" />
                    <button
                      role="menuitem"
                      className="danger"
                      onClick={() => {
                        setFolderMenu(null)
                        setConfirmDeleteFolder(entry.path)
                      }}
                    >
                      {t('deleteFolder')}
                    </button>
                  </>
                )}
              </div>
            )}
          </span>
        </div>
      </li>
    )
  }

  const renderEmpty = (hint: string) => (
    <p className="empty proj-empty">
      <svg
        className="proj-empty-icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6.29297 3.75H14.1729C14.4927 3.75 14.7979 3.88392 15.0146 4.11914L18.5566 7.96387C18.7512 8.17512 18.8593 8.45208 18.8594 8.73926V19.1055C18.8593 19.7376 18.346 20.25 17.7139 20.25H6.29297C5.66091 20.2499 5.14855 19.7375 5.14844 19.1055V4.89453C5.14855 4.26247 5.66091 3.75011 6.29297 3.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M13.8984 4V7.11C13.8984 8.15382 14.7446 9 15.7884 9H18.8984"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span className="empty-hint">{hint}</span>
    </p>
  )

  // ── Folder view ────────────────────────────────────────

  const clearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const renderSearchSettingsButton = () => (
    <button
      className="file-search-settings"
      title={t('searchJevSettings')}
      aria-label={t('searchJevSettings')}
      onClick={() => setSettingsRequest({ section: 'aiMedia', block: 'rerank' })}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20V4M12 4l-4 4M12 4l4 4" />
        <path d="M3 12h6M3 16h5M3 20h4" />
      </svg>
    </button>
  )

  const renderSearchBox = () => (
    <div className={`file-search${searchActive ? ' active' : ''}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={searchInputRef}
        type="search"
        value={searchQuery}
        placeholder={t('searchFilesPlaceholder')}
        aria-label={t('searchFilesPlaceholder')}
        spellCheck={false}
        onChange={(e) => setSearchQuery(e.target.value)}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false
          setSearchQuery(e.currentTarget.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && searchQuery) {
            e.stopPropagation()
            clearSearch()
          }
        }}
      />
      {searchQuery && (
        <button className="file-search-clear" aria-label={t('searchClear')} onClick={clearSearch}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )

  const renderSearchRow = (hit: FileSearchHit) => (
    <li
      key={hit.path}
      className="search-row"
      role="button"
      tabIndex={0}
      onClick={() => void window.aiOffice.openPath(hit.path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void window.aiOffice.openPath(hit.path)
      }}
    >
      <span className="recent-icon">
        <FileBadge ext={hit.ext} size={24} />
      </span>
      <div className="search-main">
        <div className="search-head">
          <span className="search-name">{highlightText(hit.name, hit.needles)}</span>
          <span className="search-path" title={dirOf(hit.path)}>
            {highlightText(locationLabel(hit.path, roots), hit.needles)}
          </span>
        </div>
        {hit.snippet && (
          <p className="search-snippet">
            {hit.snippet.map((part, i) =>
              part.hit ? (
                <mark key={i} className="search-hit">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
        )}
      </div>
      <span className="search-time">{formatModified(hit.mtimeMs, i18n)}</span>
    </li>
  )

  const renderSearchResults = () => {
    const page = searchPage
    const busy = !!page && (page.index.pending > 0 || page.index.scanning)
    return (
      <div className="search-results" aria-live="polite">
        {busy && (
          <div className="search-status">
            <span className="load-more-spinner" />
            {t('searchIndexing', { n: page.index.pending })}
          </div>
        )}
        {page && page.hits.length === 0 && !busy
          ? renderEmpty(t('searchNoResults', { q }))
          : page && (
              <ul className="search-list">{orderedSearchHits(page.hits).map(renderSearchRow)}</ul>
            )}
      </div>
    )
  }

  const rerankApplied = rerank && rerank.key === rerankKey ? rerank.result : null

  /** judged hits in Jev's order, then the rest in local order */
  const orderedSearchHits = (hits: readonly FileSearchHit[]): FileSearchHit[] => {
    if (!rerankApplied) return [...hits]
    const rank = new Map(rerankApplied.order.map((path, i) => [path, i]))
    return [...hits].sort((a, b) => (rank.get(a.path) ?? Infinity) - (rank.get(b.path) ?? Infinity))
  }

  const renderSearchHeading = () => {
    const total = searchPage?.total ?? 0
    return (
      <div className="recents-heading">
        {rerankApplied && (
          <span className="search-rerank-badge" title={t('searchRerankedBy')}>
            Jev
          </span>
        )}
        <span className="file-count">
          {t(total === 1 ? 'searchResultCountOne' : 'searchResultCount', { n: total })}
        </span>
      </div>
    )
  }

  function renderFolderContent() {
    if (roots.length === 0) return null
    const total = folderSubfolders.length + folderFiles.length
    const sortedFiles = fileSort === 'oldest' ? [...folderFiles].reverse() : folderFiles
    return (
      <main className="content">
        <section className="quick-start" aria-label={t('secQuickStart')}>
          <div className="section-head">
            <span className="section-label">{t('secQuickStart')}</span>
          </div>
          {renderQuickCards()}
        </section>

        <section className="recents" aria-label={t('folders')}>
          <div className="recents-toolbar">
            {folderSelectedPaths.length > 0 ? (
              <div className="selection-bar">
                <span className="selection-count">
                  {t('selectedCount', { n: folderSelectedPaths.length })}
                </span>
                {selectedFolder && editableAt(selectedFolder) && (
                  <>
                    <button
                      className="selection-action"
                      onClick={() => startMove(folderSelectedPaths)}
                    >
                      {t('moveToFolder')}
                    </button>
                    <button
                      className="selection-action danger"
                      onClick={() => deleteFiles(folderSelectedPaths)}
                    >
                      {t('deleteFiles')}
                    </button>
                  </>
                )}
                <button className="selection-action" onClick={() => setSelected(new Set())}>
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <div className="filter-pills" role="tablist" aria-label={t('filterAria')}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-pill${filter === f.key ? ' active' : ''}`}
                    onClick={() => changeFilter(f.key)}
                  >
                    {t(f.label)}
                  </button>
                ))}
              </div>
            )}
            <div className="file-search-group">
              {renderSearchBox()}
              {renderSearchSettingsButton()}
            </div>
            {searchActive ? (
              renderSearchHeading()
            ) : (
              <div className="recents-heading folder-heading">
                <span className="file-count">
                  {t(total === 1 ? 'itemCountOne' : 'itemCount', { n: total })}
                </span>
              </div>
            )}
          </div>

          {searchActive ? (
            renderSearchResults()
          ) : total === 0 ? (
            renderEmpty(filter === 'all' ? t('emptyFolder') : t('emptyFiltered'))
          ) : (
            <div
              className={`recent-table${folderSelectedPaths.length > 0 ? ' has-selection' : ''}`}
            >
              <div className="recent-columns">
                <span className="col-check">
                  <input
                    type="checkbox"
                    checked={folderAllSelected}
                    disabled={folderFiles.length === 0}
                    onChange={toggleSelectAllFolder}
                    aria-label={t('selectAll')}
                  />
                </span>
                <span className="col-name">{t('colName')}</span>
                <span className="col-path">{t('colLocation')}</span>
                {renderModifiedHeader()}
                <span className="col-size">{t('colSize')}</span>
                <span />
                <span />
              </div>
              <ul className="recent-list">
                {folderSubfolders.map((entry) => renderSubfolderRow(entry))}
                {sortedFiles.map((entry) => renderFileRow(entry, 'folder'))}
              </ul>
            </div>
          )}
        </section>
      </main>
    )
  }

  // ── Plain view ────────────────────────────────────────

  function renderGlobalContent() {
    const now = new Date()
    const hour = now.getHours()
    const greetKey =
      hour < 6
        ? 'greetEvening'
        : hour < 12
          ? 'greetMorning'
          : hour < 18
            ? 'greetAfternoon'
            : 'greetEvening'
    const cjk = lang === 'zh' || lang === 'zh-TW' || lang === 'ja'
    const greeting = `${t(greetKey)}${accountName ? (cjk ? '，' : ', ') + accountName : ''}${cjk ? '。' : '. '}`
    return (
      <main className="content">
        <section className="quick-start" aria-label={t('secQuickStart')}>
          <div className="home-hero">
            <h1 className="hero-title">
              {greeting}
              <span className="hero-ask" style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', fontWeight: 'normal' }}>
                The 100% Free Office Suite with Native AI & Agentic Workflows
              </span>
            </h1>
          </div>
          {renderQuickCards()}
        </section>

        <section
          className="recents"
          aria-label={view === 'recent' ? t('secRecent') : t('secStarred')}
        >
          <div className="recents-toolbar">
            {selectedPaths.length > 0 ? (
              <div className="selection-bar">
                <span className="selection-count">
                  {t('selectedCount', { n: selectedPaths.length })}
                </span>
                {canMove && (
                  <button className="selection-action" onClick={() => startMove(selectedPaths)}>
                    {t('moveToFolder')}
                  </button>
                )}
                <button className="selection-action" onClick={() => removeRecent(selectedPaths)}>
                  {t('removeFromList')}
                </button>
                <button
                  className="selection-action danger"
                  onClick={() => deleteFiles(selectedPaths)}
                >
                  {t('deleteFiles')}
                </button>
                <button className="selection-action" onClick={() => setSelected(new Set())}>
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <div className="filter-pills" role="tablist" aria-label={t('filterAria')}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-pill${filter === f.key ? ' active' : ''}`}
                    onClick={() => changeFilter(f.key)}
                  >
                    {t(f.label)}
                  </button>
                ))}
              </div>
            )}
            <div className="file-search-group">
              {renderSearchBox()}
              {renderSearchSettingsButton()}
            </div>
            {searchActive ? (
              renderSearchHeading()
            ) : (
              <div className="recents-heading">
                <span className="section-label">
                  {view === 'recent' ? t('secRecent') : t('secStarred')}
                </span>
                <span className="file-count">{t(fileCountKey(listTotal), { n: listTotal })}</span>
              </div>
            )}
          </div>

          {searchActive ? (
            renderSearchResults()
          ) : entries.length === 0 ? (
            renderEmpty(
              view === 'starred'
                ? t('emptyStarred')
                : navCounts.recent === 0
                  ? t('emptyRecent')
                  : t('emptyFiltered'),
            )
          ) : (
            <div className={`recent-table${selectedPaths.length > 0 ? ' has-selection' : ''}`}>
              <div className="recent-columns">
                <span className="col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label={t('selectAll')}
                  />
                </span>
                <span className="col-name">{t('colName')}</span>
                <span className="col-path">{t('colLocation')}</span>
                {renderModifiedHeader()}
                <span className="col-size">{t('colSize')}</span>
                <span />
                <span />
              </div>
              <ul className="recent-list">
                {(fileSort === 'oldest' ? [...entries].reverse() : entries).map((entry) =>
                  renderFileRow(entry, 'global'),
                )}
              </ul>
              {hasMore && (
                <div ref={sentinelRef} className="load-more" aria-hidden="true">
                  <span className="load-more-spinner" />
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    )
  }

  const movingDirs = (paths: string[]) =>
    paths.filter((p) => {
      // a folder being moved: its own listing is cached, or it is a known sub-folder
      if (listings.has(p)) return true
      const parent = listings.get(dirOf(p))
      return parent?.folders.some((f) => f.path === p) ?? false
    })

  return (
    <div className="home">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img className="logo-lockup" src={logoLockup} alt="VuaOffice" height="32" />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item${view === 'recent' && !selectedFolder && !cloudMode ? ' active' : ''}`}
            onClick={() => changeView('recent')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 4.8V8l2.2 1.6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span className="nav-label">{t('navRecent')}</span>
            <span className="nav-count">{navCounts.recent}</span>
          </button>
          <button
            className={`nav-item${view === 'starred' && !selectedFolder && !cloudMode ? ' active' : ''}`}
            onClick={() => changeView('starred')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.9l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.6l-3.8 2 .72-4.23-3.07-3 4.25-.62z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            <span className="nav-label">{t('navStarred')}</span>
            <span className="nav-count">{navCounts.starred}</span>
          </button>
          {loggedIn && (
            <button
              className={`nav-item${cloudMode && !selectedFolder ? ' active' : ''}`}
              onClick={() => {
                setCloudMode(true)
                setSelectedFolder(null)
                setSelected(new Set())
                setRowMenu(null)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.8l1.55 4.65L14.2 8l-4.65 1.55L8 14.2 6.45 9.55 1.8 8l4.65-1.55z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="nav-label">{t('navCloud')}</span>
              <svg
                className="nav-external"
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6.5 3.5H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12V9.5M9.5 2.5h4v4M13 3l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </nav>

        {/* project sidebar */}
        {projectMode && (
          <>
            <div className="sidebar-divider" />
            <ProjectPanel
              projects={projects}
              selectedId={selectedProjectId}
              onSelect={(id) => {
                setSelectedProjectId(id)
                // reset list-selection state on any project switch (paths are
                // shared between the plain view and project views)
                setSelected(new Set())
                setRowMenu(null)
              }}
              onRefresh={refresh}
            />
          </>
        )}

        <div className="sidebar-divider" />
        {renderFolderPanel()}
        <AccountEntry
          onStatusChange={handleAccountStatus}
          onOpenAiSettings={() => setShowAiSettings(true)}
          onOpenAbout={() => setShowAbout(true)}
          onFileSearchSettingsChange={() => setRerankSettingsTick((n) => n + 1)}
          openRequest={settingsRequest}
        />
      </aside>
      {selectedFolder && rootOf(selectedFolder, roots)?.readable ? (
        renderFolderContent()
      ) : cloudMode ? (
        <CloudProjectsView />
      ) : (
        renderGlobalContent()
      )}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('deleteModalTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t('deleteModalTitle')}</h3>
            <p>
              {confirmDelete.length === 1
                ? t('deleteConfirmOne', { name: fileName(confirmDelete[0]) })
                : t('deleteConfirmMany', { n: confirmDelete.length })}
            </p>
            {confirmDelete.length > 1 && (
              <ul className="modal-file-list">
                {confirmDelete.slice(0, 6).map((p) => (
                  <li key={p}>{fileName(p)}</li>
                ))}
                {confirmDelete.length > 6 && (
                  <li>{t('deleteMoreCount', { n: confirmDelete.length })}</li>
                )}
              </ul>
            )}
            <div className="modal-buttons">
              <button
                className="btn btn-secondary"
                autoFocus
                onClick={() => setConfirmDelete(null)}
              >
                {t('cancel')}
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteNow}>
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiSettings && (
        <AiSettingsModal
          initialDevMode={isDevMode}
          onClose={() => setShowAiSettings(false)}
        />
      )}
      {showAbout && <AboutModal appVersion={appVersion} onClose={() => setShowAbout(false)} />}
      {showDiagnosticReport && (
        <DiagnosticReportModal onClose={() => setShowDiagnosticReport(false)} />
      )}

      {confirmDeleteFolder && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteFolder(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('deleteFolderTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t('deleteFolderTitle')}</h3>
            <p>{t('deleteFolderConfirm', { name: fileName(confirmDeleteFolder) })}</p>
            <div className="modal-buttons">
              <button
                className="btn btn-secondary"
                autoFocus
                onClick={() => setConfirmDeleteFolder(null)}
              >
                {t('cancel')}
              </button>
              <button className="btn btn-danger" onClick={() => void confirmDeleteFolderNow()}>
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmMissing && (
        <div className="modal-overlay" onClick={() => setConfirmMissing(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('missingFileTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t('missingFileTitle')}</h3>
            <p>{t('missingFileBody', { name: confirmMissing.name })}</p>
            <div className="modal-buttons">
              <button
                className="btn btn-secondary"
                autoFocus
                onClick={() => setConfirmMissing(null)}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  // main drops the star of an unavailable entry with the row
                  removeRecent([confirmMissing.path])
                  setConfirmMissing(null)
                }}
              >
                {t('removeFromList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {movePicker && canMove && (
        <FolderPicker
          roots={roots}
          currentDirs={new Set(movePicker.map(dirOf))}
          movingDirs={movingDirs(movePicker)}
          count={movePicker.length}
          onCancel={() => setMovePicker(null)}
          onPick={(dir) => void doMove(movePicker, dir, 'ask')}
        />
      )}

      {conflict && (
        <ConflictPrompt
          names={conflict.paths.map(fileName)}
          onChoose={(policy) => {
            if (policy === 'skip') setConflict(null)
            else void doMove(conflict.paths, conflict.targetDir, policy)
          }}
        />
      )}

      <DropToOpenOverlay />

    </div>
  )
}
