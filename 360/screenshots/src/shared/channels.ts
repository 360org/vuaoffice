/** IPC channels between the shell main process and the Screenshots tab. */
export const SCREENSHOTS_CHANNELS = {
  capture: 'screenshots:capture',
  takePending: 'screenshots:take-pending',
  imageReady: 'screenshots:image-ready',
  save: 'screenshots:save',
  copy: 'screenshots:copy',
  openImage: 'screenshots:open-image',
  setDirty: 'screenshots:set-dirty',
  openPermissionSettings: 'screenshots:open-permission-settings',
  relaunchApp: 'screenshots:relaunch-app',
  /** main → renderer: the close prompt chose Save; renderer answers on saveResult */
  saveRequest: 'screenshots:save-request',
  saveResult: 'screenshots:save-result',
} as const

export type CapturePermission = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

export interface CaptureOutcome {
  /** PNG bytes; absent when the user cancelled the picker */
  png?: Uint8Array
  /** the platform has no interactive picker: the editor should open in crop mode */
  needsCrop?: boolean
  /** macOS screen-recording permission at capture time (a denied grant yields a desktop-only image) */
  permission?: CapturePermission
  error?: string
}

export interface ScreenshotsApi {
  capture(mode: import('./types').CaptureMode): Promise<CaptureOutcome>
  takePending(): Promise<CaptureOutcome | null>
  onImageReady(handler: () => void): () => void
  /** null when the save dialog was cancelled */
  save(png: Uint8Array): Promise<string | null>
  copy(png: Uint8Array): Promise<boolean>
  openImage(): Promise<Uint8Array | null>
  setDirty(dirty: boolean): void
  openPermissionSettings(): Promise<void>
  relaunchApp(): Promise<void>
  /** the close prompt chose Save: run the save flow and report whether it landed */
  onSaveRequest(handler: () => Promise<boolean>): () => void
}
