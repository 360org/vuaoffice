import { BrowserWindow, WebContentsView, app } from 'electron'
import { join } from 'node:path'
import { AsyncMailStorage } from './db/async-storage'
import { SQLiteMailStorage } from './db/sqlite-storage'
import { registerMailIpc } from './ipc/mail-ipc'
import { MailSyncOrchestrator } from './network/mail-sync-orchestrator'
import { TokenStore } from './auth/token-store'

let asyncMailStorage: AsyncMailStorage | null = null
let syncOrchestrator: MailSyncOrchestrator | null = null
let tokenStore: TokenStore | null = null

export interface MailRuntimeConfig {
  preloadPath: string
  rendererUrl?: string | undefined
  rendererFile: string
  openDocumentPath?: (filePath: string) => boolean
}

let runtime: MailRuntimeConfig = {
  preloadPath: join(__dirname, '../preload/index.js'),
  rendererUrl: process.env.MAIL_RENDERER_URL,
  rendererFile: join(__dirname, '../renderer/index.html'),
}

export function configureMailRuntime(config: MailRuntimeConfig): void {
  runtime = config
}

export function initMailBackend(): AsyncMailStorage {
  if (!asyncMailStorage) {
    // 1. Single unified SQLite storage instance (Single Source of Truth)
    const unifiedStorage = new SQLiteMailStorage()
    asyncMailStorage = new AsyncMailStorage(unifiedStorage)
    tokenStore = new TokenStore()

    // 2. Orchestrator and IPC share the EXACT same storage and token store
    syncOrchestrator = new MailSyncOrchestrator(unifiedStorage, tokenStore)
    syncOrchestrator.startSyncLoop(60000)

    registerMailIpc(
      asyncMailStorage,
      syncOrchestrator,
      tokenStore,
      (filePath) => {
        if (runtime.openDocumentPath) {
          return runtime.openDocumentPath(filePath)
        }
        return false
      }
    )
  }
  return asyncMailStorage
}

export function createMailView(): WebContentsView {
  initMailBackend()

  const view = new WebContentsView({
    webPreferences: {
      preload: runtime.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  view.webContents.on('will-navigate', (event) => event.preventDefault())

  if (runtime.rendererUrl) {
    void view.webContents.loadURL(runtime.rendererUrl)
  } else if (runtime.rendererFile) {
    void view.webContents.loadFile(runtime.rendererFile)
  }

  return view
}

export function startMailStandalone(): void {
  void app.whenReady().then(() => {
    initMailBackend()
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: 'GenOffice Mail',
      webPreferences: {
        preload: runtime.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    if (runtime.rendererUrl) {
      void win.loadURL(runtime.rendererUrl)
    } else if (runtime.rendererFile) {
      void win.loadFile(runtime.rendererFile)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
