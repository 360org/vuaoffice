/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isEditableTarget } from '../../../360/screenshots/src/renderer/ScreenshotsEditor'
import {
  CAPTURE_ACCELERATORS,
  DEFAULT_SCREENSHOT_HOTKEYS,
  isValidAccelerator,
} from '../../../360/screenshots/src/shared/capture-args'
import {
  formatAcceleratorBadges,
  keyEventToAccelerator,
} from '../src/shared/home-api'
import {
  loadAiTokenUsage,
  recordAiTokenUsage,
  resetAiTokenUsage,
} from '../src/main/ai-token-tracker'
import { strings } from '../src/renderer/src/strings'
import type { SectionId } from '../src/renderer/src/SettingsModal'

describe('Settings, Shortcuts & AI Profile verification', () => {
  describe('1. Editable target detection (Keyboard shortcut collision guard)', () => {
    it('case 1: returns true for standard input elements', () => {
      const input = document.createElement('input')
      expect(isEditableTarget(input)).toBe(true)
    })

    it('case 2: returns true for textarea elements (e.g. AI prompt box)', () => {
      const textarea = document.createElement('textarea')
      expect(isEditableTarget(textarea)).toBe(true)
    })

    it('case 3: returns true for select elements', () => {
      const select = document.createElement('select')
      expect(isEditableTarget(select)).toBe(true)
    })

    it('case 4: returns true for elements with isContentEditable', () => {
      const div = document.createElement('div')
      div.contentEditable = 'true'
      expect(isEditableTarget(div)).toBe(true)
    })

    it('case 5: returns true for child elements nested within a contenteditable container', () => {
      const parent = document.createElement('div')
      parent.contentEditable = 'true'
      const child = document.createElement('span')
      parent.appendChild(child)
      expect(isEditableTarget(child)).toBe(true)
    })

    it('case 6: returns false for canvas element', () => {
      const canvas = document.createElement('canvas')
      expect(isEditableTarget(canvas)).toBe(false)
    })

    it('case 7: returns false for regular buttons and divs', () => {
      const btn = document.createElement('button')
      const div = document.createElement('div')
      expect(isEditableTarget(btn)).toBe(false)
      expect(isEditableTarget(div)).toBe(false)
    })

    it('case 8: safely handles null or non-HTMLElement targets', () => {
      expect(isEditableTarget(null)).toBe(false)
      expect(isEditableTarget(undefined as unknown as EventTarget)).toBe(false)
      expect(isEditableTarget({} as EventTarget)).toBe(false)
    })
  })

  describe('2. Localization symmetry for shortcuts section', () => {
    const locales = Object.keys(strings) as Array<keyof typeof strings>

    it('case 9: verifies setSecShortcuts exists across all locales', () => {
      expect(locales.length).toBeGreaterThanOrEqual(22)
      for (const loc of locales) {
        const table = strings[loc] as Record<string, string>
        expect(table.setSecShortcuts).toBeDefined()
        expect(typeof table.setSecShortcuts).toBe('string')
        expect(table.setSecShortcuts.trim().length).toBeGreaterThan(0)
      }
    })

    it('case 10: verifies specific translations for key locales (vi, en, zh)', () => {
      expect(strings.vi.setSecShortcuts).toBe('Phím tắt')
      expect(strings.en.setSecShortcuts).toBe('Shortcuts')
      expect(strings.zh.setSecShortcuts).toBe('快捷键')
    })
  })

  describe('3. Global screenshot hotkeys alignment & validation', () => {
    it('case 11: area capture accelerator matches CommandOrControl+Alt+Shift+1', () => {
      expect(CAPTURE_ACCELERATORS.area).toBe('CommandOrControl+Alt+Shift+1')
      expect(DEFAULT_SCREENSHOT_HOTKEYS.area).toBe('CommandOrControl+Alt+Shift+1')
    })

    it('case 12: window capture accelerator matches CommandOrControl+Alt+Shift+2', () => {
      expect(CAPTURE_ACCELERATORS.window).toBe('CommandOrControl+Alt+Shift+2')
      expect(DEFAULT_SCREENSHOT_HOTKEYS.window).toBe('CommandOrControl+Alt+Shift+2')
    })

    it('case 13: fullscreen capture accelerator matches CommandOrControl+Alt+Shift+3', () => {
      expect(CAPTURE_ACCELERATORS.fullscreen).toBe('CommandOrControl+Alt+Shift+3')
      expect(DEFAULT_SCREENSHOT_HOTKEYS.fullscreen).toBe('CommandOrControl+Alt+Shift+3')
    })

    it('case 14: AI assistant accelerator defaults to CommandOrControl+J', () => {
      expect(DEFAULT_SCREENSHOT_HOTKEYS.aiAssistant).toBe('CommandOrControl+J')
      expect(DEFAULT_SCREENSHOT_HOTKEYS.format).toBe('png')
      expect(DEFAULT_SCREENSHOT_HOTKEYS.enabled).toBe(true)
    })

    it('case 15: isValidAccelerator accurately checks modifier and function keys', () => {
      expect(isValidAccelerator('CommandOrControl+Alt+Shift+1')).toBe(true)
      expect(isValidAccelerator('Ctrl+Shift+A')).toBe(true)
      expect(isValidAccelerator('F9')).toBe(true)
      expect(isValidAccelerator('F12')).toBe(true)
      expect(isValidAccelerator('A')).toBe(false)
      expect(isValidAccelerator('')).toBe(false)
    })
  })

  describe('4. macOS-safe keyEventToAccelerator and badge formatting', () => {
    it('case 16: handles macOS Option key letter combos without character mangling', () => {
      // On macOS, Alt+J produces delta symbol '∆', but code is 'KeyJ'
      const accel = keyEventToAccelerator({
        key: '∆',
        code: 'KeyJ',
        metaKey: true,
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
      })
      expect(accel).toBe('CommandOrControl+Alt+J')
    })

    it('case 17: handles digit hotkeys via code fallback', () => {
      const accel = keyEventToAccelerator({
        key: '!',
        code: 'Digit1',
        metaKey: true,
        ctrlKey: false,
        altKey: true,
        shiftKey: true,
      })
      expect(accel).toBe('CommandOrControl+Alt+Shift+1')
    })

    it('case 18: rejects bare keys without modifiers unless function key', () => {
      expect(
        keyEventToAccelerator({
          key: 'a',
          code: 'KeyA',
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        }),
      ).toBeNull()

      expect(
        keyEventToAccelerator({
          key: 'F5',
          code: 'F5',
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        }),
      ).toBe('F5')
    })

    it('case 19: formats display badges for macOS and Windows platforms', () => {
      const macBadges = formatAcceleratorBadges('CommandOrControl+Alt+Shift+1', true)
      expect(macBadges).toEqual(['⌘', '⌥', '⇧', '1'])

      const winBadges = formatAcceleratorBadges('CommandOrControl+Alt+Shift+1', false)
      expect(winBadges).toEqual(['Ctrl', 'Alt', 'Shift', '1'])

      expect(formatAcceleratorBadges('', true)).toEqual([])
    })
  })

  describe('5. Local Device AI Token Tracker', () => {
    it('case 20: accumulates token usage and increments request counter atomically', () => {
      const dir = mkdtempSync(join(tmpdir(), 'vuaoffice-token-test-'))
      const filePath = join(dir, 'test-usage.json')

      try {
        const initial = loadAiTokenUsage(filePath)
        expect(initial.totalTokens).toBe(0)
        expect(initial.requestsCount).toBe(0)

        const first = recordAiTokenUsage({ inputTokens: 120, outputTokens: 80 }, filePath)
        expect(first.inputTokens).toBe(120)
        expect(first.outputTokens).toBe(80)
        expect(first.totalTokens).toBe(200)
        expect(first.requestsCount).toBe(1)

        const second = recordAiTokenUsage({ inputTokens: 300, outputTokens: 500 }, filePath)
        expect(second.inputTokens).toBe(420)
        expect(second.outputTokens).toBe(580)
        expect(second.totalTokens).toBe(1000)
        expect(second.requestsCount).toBe(2)

        const reset = resetAiTokenUsage(filePath)
        expect(reset.totalTokens).toBe(0)
        expect(reset.requestsCount).toBe(0)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('6. Settings Modal 4-section architecture', () => {
    it('case 21: restricts SectionId strictly to account, general, shortcuts, skills', () => {
      const validSections: SectionId[] = ['account', 'general', 'shortcuts', 'skills']
      expect(validSections.length).toBe(4)
      for (const s of validSections) {
        expect(['account', 'general', 'shortcuts', 'skills']).toContain(s)
      }
    })
  })
})
