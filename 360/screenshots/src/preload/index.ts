import { contextBridge, ipcRenderer } from 'electron'
import { SCREENSHOTS_CHANNELS as CH, type ScreenshotsApi } from '../shared/channels'

const api: ScreenshotsApi = {
  capture: (mode) => ipcRenderer.invoke(CH.capture, mode),
  takePending: () => ipcRenderer.invoke(CH.takePending),
  onImageReady(handler) {
    const listener = () => handler()
    ipcRenderer.on(CH.imageReady, listener)
    return () => ipcRenderer.removeListener(CH.imageReady, listener)
  },
  save: (png) => ipcRenderer.invoke(CH.save, png),
  copy: (png) => ipcRenderer.invoke(CH.copy, png),
  openImage: () => ipcRenderer.invoke(CH.openImage),
  setDirty: (dirty) => ipcRenderer.send(CH.setDirty, dirty),
  openPermissionSettings: () => ipcRenderer.invoke(CH.openPermissionSettings),
  relaunchApp: () => ipcRenderer.invoke(CH.relaunchApp),
  onSaveRequest(handler) {
    const listener = () => {
      void handler().then(
        (saved) => ipcRenderer.send(CH.saveResult, saved),
        () => ipcRenderer.send(CH.saveResult, false),
      )
    }
    ipcRenderer.on(CH.saveRequest, listener)
    return () => ipcRenderer.removeListener(CH.saveRequest, listener)
  },
  getAiSettings: () => ipcRenderer.invoke('ai:get-settings'),
  setAiSettings: (settings: unknown) => ipcRenderer.invoke('ai:set-settings', settings),
  onAiSettingsChanged(handler: () => void) {
    const listener = () => handler()
    ipcRenderer.on('ai:settings-changed', listener)
    return () => ipcRenderer.removeListener('ai:settings-changed', listener)
  },
  gskStatus: () => ipcRenderer.invoke('ai:gsk-status'),
  aiStream: (request: unknown) => ipcRenderer.invoke('ai:stream', request),
  aiStreamCancel: (requestId: string) => ipcRenderer.invoke('ai:stream-cancel', requestId),
  onAiStream(handler: (chunk: unknown) => void) {
    const listener = (_event: unknown, chunk: unknown) => handler(chunk)
    ipcRenderer.on('ai:stream-chunk', listener)
    return () => ipcRenderer.removeListener('ai:stream-chunk', listener)
  },
  openAiModelSettings: () => ipcRenderer.invoke('ai:open-model-settings'),
  getAiPanelPrefs: () => ipcRenderer.invoke('app:get-ai-panel-prefs'),
  setAiPanelPrefs: (prefs: unknown) => ipcRenderer.invoke('app:set-ai-panel-prefs', prefs),
  onAiPanelPrefsChanged(handler: (prefs: unknown) => void) {
    const listener = (_event: unknown, p: unknown) => handler(p)
    ipcRenderer.on('app:ai-panel-prefs-changed', listener)
    return () => ipcRenderer.removeListener('app:ai-panel-prefs-changed', listener)
  },
}

contextBridge.exposeInMainWorld('screenshotsApi', api)

// theme + language: the app-wide channels every editor tab uses (shell main answers them)
const onString = (channel: string, handler: (v: string) => void) => {
  const listener = (_e: unknown, v: unknown) => typeof v === 'string' && handler(v)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('screenshotsHost', {
  getLanguage: (): Promise<string> => ipcRenderer.invoke('app:get-language'),
  getTheme: (): Promise<string> => ipcRenderer.invoke('app:get-theme'),
  onLanguageChanged: (handler: (lang: string) => void) => onString('app:language-changed', handler),
  onThemeChanged: (handler: (theme: string) => void) => onString('app:theme-changed', handler),
})
