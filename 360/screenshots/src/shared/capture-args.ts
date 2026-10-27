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
