import type { CaptureMode } from './types'

/**
 * Arguments for macOS `/usr/sbin/screencapture`. `-x` silences the shutter,
 * `-s`/`-w` lock the interactive picker to a drag rectangle / a window, `-m`
 * keeps fullscreen to the main display (one output file = one screen).
 */
export function screencaptureArgs(mode: CaptureMode, outFile: string): string[] {
  switch (mode) {
    case 'area':
      return ['-i', '-s', '-x', outFile]
    case 'window':
      return ['-i', '-w', '-x', outFile]
    case 'fullscreen':
      return ['-m', '-x', outFile]
  }
}

/** Global capture hotkeys. ⇧⌘3/4/5 belong to macOS, so ours add ⌥. */
export const CAPTURE_ACCELERATORS: Record<CaptureMode, string> = {
  area: 'CommandOrControl+Alt+Shift+1',
  window: 'CommandOrControl+Alt+Shift+2',
  fullscreen: 'CommandOrControl+Alt+Shift+3',
}

/** ⌘/Ctrl + key combos the editor handles itself; the rest (⌘V, ⌘W, ⌘N…) stay with the app menu. */
const EDITOR_MENU_KEYS = new Set(['z', 'y', 'c', 's', 'o', '0', '=', '+', '-'])

/** True when a keystroke belongs to the editor rather than the shell menu (⌥ combos stay with the menu's UI scale). */
export function isEditorShortcut(input: { type: string; key: string; meta: boolean; control: boolean; alt: boolean }): boolean {
  return input.type === 'keyDown' && (input.meta || input.control) && !input.alt && EDITOR_MENU_KEYS.has(input.key.toLowerCase())
}

export interface ScreenshotHotkeysSettings {
  enabled: boolean
  area: string
  window: string
  fullscreen: string
  aiAssistant: string
  format: 'png' | 'jpeg'
}

export const DEFAULT_SCREENSHOT_HOTKEYS: ScreenshotHotkeysSettings = {
  enabled: true,
  area: 'CommandOrControl+Alt+Shift+1',
  window: 'CommandOrControl+Alt+Shift+2',
  fullscreen: 'CommandOrControl+Alt+Shift+3',
  aiAssistant: 'CommandOrControl+J',
  format: 'png',
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS', 'AltGraph'])

export function isValidAccelerator(accel: string): boolean {
  if (!accel || typeof accel !== 'string') return false
  const parts = accel.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return false
  const key = parts[parts.length - 1]
  const hasMod = parts.some((p) =>
    ['CommandOrControl', 'CmdOrCtrl', 'Command', 'Cmd', 'Control', 'Ctrl', 'Alt', 'Option', 'Shift', 'Super'].includes(p),
  )
  const isFKey = /^F(1[0-2]|[1-9])$/i.test(key)
  return hasMod || isFKey
}

/**
 * Convert a DOM KeyboardEvent-like object into an Electron globalShortcut accelerator string,
 * or null if bare modifier / invalid single key.
 * Uses e.code for letters/digits so macOS Option-key character mangling (e.g. Option+J -> ∆) still captures 'J'.
 */
export function keyEventToAccelerator(e: {
  key: string
  code?: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}): string | null {
  if (!e.key || MODIFIER_KEYS.has(e.key)) return null

  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  let mainKey = ''
  if (e.code && /^Digit[0-9]$/.test(e.code)) {
    mainKey = e.code.slice(5)
  } else if (e.code && /^Key[A-Z]$/.test(e.code)) {
    mainKey = e.code.slice(3)
  } else if (/^F(1[0-2]|[1-9])$/i.test(e.key)) {
    mainKey = e.key.toUpperCase()
  } else if (e.key === ' ') {
    mainKey = 'Space'
  } else if (e.key === 'ArrowUp') {
    mainKey = 'Up'
  } else if (e.key === 'ArrowDown') {
    mainKey = 'Down'
  } else if (e.key === 'ArrowLeft') {
    mainKey = 'Left'
  } else if (e.key === 'ArrowRight') {
    mainKey = 'Right'
  } else if (e.key === '+') {
    mainKey = 'Plus'
  } else if (e.key === '-') {
    mainKey = 'Minus'
  } else if (e.key.length === 1) {
    mainKey = e.key.toUpperCase()
  } else {
    mainKey = e.key
  }

  const isFunctionKey = /^F(1[0-2]|[1-9])$/i.test(mainKey)
  if (parts.length === 0 && !isFunctionKey) return null

  parts.push(mainKey)
  return parts.join('+')
}

/** Format an Electron accelerator string into platform-appropriate display key badges. */
export function formatAcceleratorBadges(accel: string, isMac: boolean): string[] {
  if (!accel) return []
  const parts = accel.split('+').map((p) => p.trim()).filter(Boolean)
  return parts.map((p) => {
    const low = p.toLowerCase()
    if (low === 'commandorcontrol' || low === 'cmdorctrl') return isMac ? '⌘' : 'Ctrl'
    if (low === 'command' || low === 'cmd' || low === 'meta' || low === 'super') return isMac ? '⌘' : 'Win'
    if (low === 'control' || low === 'ctrl') return isMac ? '⌃' : 'Ctrl'
    if (low === 'alt' || low === 'option') return isMac ? '⌥' : 'Alt'
    if (low === 'shift') return isMac ? '⇧' : 'Shift'
    if (low === 'up') return '↑'
    if (low === 'down') return '↓'
    if (low === 'left') return '←'
    if (low === 'right') return '→'
    if (low === 'space') return 'Space'
    if (low === 'plus') return '+'
    if (low === 'minus') return '-'
    return p.length === 1 ? p.toUpperCase() : p
  })
}
