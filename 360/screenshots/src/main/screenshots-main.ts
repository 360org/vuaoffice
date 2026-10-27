import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import {
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  shell,
  systemPreferences,
  WebContentsView,
  type WebContents,
} from 'electron'
import { RENDERER_SCHEME } from '@genoffice/electron-utils'
import { CAPTURE_ACCELERATORS, screencaptureArgs } from '../shared/capture-args'
import { SCREENSHOTS_CHANNELS as CH, type CaptureOutcome, type CapturePermission } from '../shared/channels'
import { screenshotsStrings } from '../shared/i18n'
import type { CaptureMode } from '../shared/types'

/**
 * Screenshots module, main-process side. Compiled into the shell bundle; the
 * shell owns the tab and calls in through configureScreenshotsRuntime().
 */
export interface ScreenshotsRuntime {
  preloadPath: string
  rendererUrl?: string
  /** UI language for dialogs (the shell's current language) */
  lang: () => string
  /** bring the Screenshots tab to front (opening it if needed) and return its contents */
  showTab: () => WebContents | null
  /** windows to hide while the OS picker runs, so VuaOffice is not in the shot */
  windowsToHide: () => BrowserWindow[]
}

let runtime: ScreenshotsRuntime | null = null
const dirtyViews = new Set<number>()
/** capture taken by a hotkey before the renderer was ready to receive it */
let pending: CaptureOutcome | null = null
let captureInFlight = false

const MAX_OPEN_BYTES = 100 * 1024 * 1024
const OPEN_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']

export function configureScreenshotsRuntime(config: ScreenshotsRuntime): void {
  runtime = config
}

export function createScreenshotsView(): WebContentsView {
  if (!runtime) throw new Error('configureScreenshotsRuntime() was not called')
  const view = new WebContentsView({
    webPreferences: {
      preload: runtime.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  view.webContents.on('will-navigate', (event) => event.preventDefault())
  const id = view.webContents.id
  view.webContents.once('destroyed', () => dirtyViews.delete(id))
  void view.webContents.loadURL(screenshotsUrl(runtime.rendererUrl))
  return view
}

/** the page is screenshots.html inside the shell renderer build (not index.html) */
export function screenshotsUrl(devUrl: string | undefined): string {
  return devUrl
    ? new URL('screenshots.html', devUrl.endsWith('/') ? devUrl : `${devUrl}/`).toString()
    : `${RENDERER_SCHEME}://screenshots/screenshots.html`
}

export function screenshotsIsDirty(wcId: number): boolean {
  return dirtyViews.has(wcId)
}

/** Save / Don't Save / Cancel for a dirty Screenshots tab; true when it may close. */
export async function requestScreenshotsClose(wc: WebContents, parent: BrowserWindow): Promise<boolean> {
  if (!dirtyViews.has(wc.id)) return true
  const s = screenshotsStrings(runtime?.lang() ?? 'en')
  const { response } = await dialog.showMessageBox(parent, {
    type: 'warning',
    message: s.unsavedTitle,
    detail: s.unsavedDetail,
    buttons: [s.unsavedSave, s.unsavedDiscard, s.cancel],
    defaultId: 0,
    cancelId: 2,
  })
  if (response === 2) return false
  if (response === 1) {
    dirtyViews.delete(wc.id)
    return true
  }
  // Save: let the renderer run its own export + save dialog, then close only if it landed
  return new Promise((resolve) => {
    const finish = (saved: boolean) => {
      ipcMain.removeListener(CH.saveResult, onResult)
      wc.removeListener('destroyed', onGone)
      resolve(saved)
    }
    const onResult = (e: Electron.IpcMainEvent, saved: unknown) => {
      if (e.sender.id === wc.id) finish(saved === true)
    }
    // a renderer that died mid-save has nothing left to lose
    const onGone = () => finish(true)
    ipcMain.on(CH.saveResult, onResult)
    wc.once('destroyed', onGone)
    wc.send(CH.saveRequest)
  })
}

function permission(): CapturePermission {
  if (process.platform !== 'darwin') return 'granted'
  try {
    return systemPreferences.getMediaAccessStatus('screen') as CapturePermission
  } catch {
    return 'unknown'
  }
}

async function withHiddenWindows<T>(run: () => Promise<T>): Promise<T> {
  const hidden = (runtime?.windowsToHide() ?? []).filter((w) => !w.isDestroyed() && w.isVisible())
  for (const w of hidden) w.hide()
  // let the window server drop our windows from the next frame
  if (hidden.length) await new Promise((r) => setTimeout(r, 250))
  try {
    return await run()
  } finally {
    for (const w of hidden) if (!w.isDestroyed()) w.show()
  }
}

async function captureMac(mode: CaptureMode): Promise<CaptureOutcome> {
  const dir = await mkdtemp(join(tmpdir(), 'vuaoffice-shot-'))
  const file = join(dir, 'shot.png')
  try {
    await new Promise<void>((resolve, reject) =>
      execFile('/usr/sbin/screencapture', screencaptureArgs(mode, file), (err) =>
        err ? reject(err) : resolve(),
      ),
    )
    // Esc in the picker exits 0 and writes nothing: a cancel, not an error
    const exists = await stat(file).then(
      (st) => st.size > 0,
      () => false,
    )
    return exists ? { png: new Uint8Array(await readFile(file)) } : {}
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Windows/Linux have no system picker we can drive: grab the display under the
 * pointer and let the editor crop it (area/window modes open in crop mode). */
async function captureDisplay(mode: CaptureMode): Promise<CaptureOutcome> {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { width, height } = display.size
  const sf = display.scaleFactor
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * sf), height: Math.round(height * sf) },
  })
  const source = sources.find((x) => x.display_id === String(display.id)) ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) return { error: 'no screen source' }
  return { png: new Uint8Array(source.thumbnail.toPNG()), needsCrop: mode !== 'fullscreen' }
}

export async function captureScreen(mode: CaptureMode): Promise<CaptureOutcome> {
  if (captureInFlight) return {}
  captureInFlight = true
  try {
    const out = await withHiddenWindows(() =>
      process.platform === 'darwin' ? captureMac(mode) : captureDisplay(mode),
    )
    return { ...out, permission: permission() }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), permission: permission() }
  } finally {
    captureInFlight = false
  }
}

/** Hotkey path: capture first, then surface the tab with the image waiting in it. */
async function captureFromHotkey(mode: CaptureMode): Promise<void> {
  const out = await captureScreen(mode)
  if (!out.png && !out.error) return
  pending = out
  const wc = runtime?.showTab()
  wc?.send(CH.imageReady)
}

let hotkeysRegistered: CaptureMode[] = []

/** Register the global capture hotkeys; returns the modes another app already holds. */
export function registerScreenshotsHotkeys(): CaptureMode[] {
  const taken: CaptureMode[] = []
  for (const [mode, accel] of Object.entries(CAPTURE_ACCELERATORS) as Array<[CaptureMode, string]>) {
    const ok = globalShortcut.register(accel, () => void captureFromHotkey(mode))
    if (ok) hotkeysRegistered.push(mode)
    else taken.push(mode)
  }
  return taken
}

export function unregisterScreenshotsHotkeys(): void {
  for (const mode of hotkeysRegistered) globalShortcut.unregister(CAPTURE_ACCELERATORS[mode])
  hotkeysRegistered = []
}

function senderWindow(wc: WebContents): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(wc) ?? BrowserWindow.getFocusedWindow() ?? undefined
}

function asPng(data: unknown): Buffer | null {
  if (!(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength > MAX_OPEN_BYTES) return null
  const buf = Buffer.from(data)
  // PNG signature: the renderer only ever sends canvas.toBlob('image/png') output
  return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? buf : null
}

export function registerScreenshotsIpc(): void {
  ipcMain.handle(CH.capture, (_e, mode: unknown) =>
    mode === 'area' || mode === 'window' || mode === 'fullscreen' ? captureScreen(mode) : {},
  )
  ipcMain.handle(CH.takePending, () => {
    const out = pending
    pending = null
    return out
  })
  ipcMain.handle(CH.copy, (_e, data: unknown) => {
    const png = asPng(data)
    if (!png) return false
    const img = nativeImage.createFromBuffer(png)
    if (img.isEmpty()) return false
    clipboard.writeImage(img)
    return true
  })
  ipcMain.handle(CH.save, async (e, data: unknown) => {
    const png = asPng(data)
    if (!png) return null
    const s = screenshotsStrings(runtime?.lang() ?? 'en')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const parent = senderWindow(e.sender)
    const opts = {
      title: s.saveDialogTitle,
      defaultPath: `Screenshot-${stamp}.png`,
      filters: [
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      ],
    }
    const { canceled, filePath } = parent
      ? await dialog.showSaveDialog(parent, opts)
      : await dialog.showSaveDialog(opts)
    if (canceled || !filePath) return null
    const ext = extname(filePath).toLowerCase()
    const out = ext === '.jpg' || ext === '.jpeg' ? nativeImage.createFromBuffer(png).toJPEG(92) : png
    await writeFile(filePath, out)
    return filePath
  })
  ipcMain.handle(CH.openImage, async (e) => {
    const s = screenshotsStrings(runtime?.lang() ?? 'en')
    const parent = senderWindow(e.sender)
    const opts = {
      title: s.openDialogTitle,
      properties: ['openFile' as const],
      filters: [{ name: 'Images', extensions: OPEN_EXTS }],
    }
    const { canceled, filePaths } = parent
      ? await dialog.showOpenDialog(parent, opts)
      : await dialog.showOpenDialog(opts)
    if (canceled || !filePaths[0]) return null
    const st = await stat(filePaths[0])
    if (st.size > MAX_OPEN_BYTES) return null
    const img = nativeImage.createFromBuffer(await readFile(filePaths[0]))
    return img.isEmpty() ? null : new Uint8Array(img.toPNG())
  })
  ipcMain.on(CH.setDirty, (e, dirty: unknown) => {
    if (dirty === true) dirtyViews.add(e.sender.id)
    else dirtyViews.delete(e.sender.id)
  })
  ipcMain.handle(CH.openPermissionSettings, () =>
    process.platform === 'darwin'
      ? shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
      : undefined,
  )
}
