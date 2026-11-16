import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AI_CUSTOM_FONT_MAX_PX,
  AI_CUSTOM_FONT_MIN_PX,
  DEFAULT_AI_PANEL_PREFS,
  Dropdown,
  aiPanelFontPx,
  clampAiCustomFontSize,
} from '@genoffice/ui'
import type { AiFontSize, AiPanelPrefs, AiPanelSide } from '@genoffice/ui'
import {
  AUTHOR_NAME_MAX,
  DEFAULT_SCREENSHOT_HOTKEYS,
  formatAcceleratorBadges,
  keyEventToAccelerator,
} from '../../shared/home-api'
import type {
  AccountStatus,
  AiHandshakeResult,
  AiTokenUsageStats,
  AuthorNameSetting,
  DailyAiTokenUsage,
  DecisionEndpoint,
  DefaultAppStatus,
  DocTheme,
  McpStatus,
  ScreenshotHotkeysSettings,
  UiTheme,
} from '../../shared/home-api'
import { useI18n } from './locale'
import type { StringKey, TFunc } from './locale'
import { FoundSkills } from './FoundSkills'
import './settings.css'

// ── Settings modal (opened from the account menu) ─────────
// Clean 4-section layout: Account, General, Shortcuts, Skills.

const LANG_OPTIONS = [
  { value: 'ar', label: 'العربية' },
  { value: 'cs', label: 'Čeština' },
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
  { value: 'tr', label: 'Türkçe' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'zh', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
] as const

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'themeSystem' },
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
] as const satisfies readonly { value: UiTheme; labelKey: StringKey }[]

const DOC_THEME_OPTIONS = [
  { value: 'follow', labelKey: 'docThemeFollowApp' },
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
] as const satisfies readonly { value: DocTheme; labelKey: StringKey }[]

const AI_FONT_SIZE_OPTIONS = [
  { value: 'default', labelKey: 'aiFontSizeDefault' },
  { value: 'large', labelKey: 'aiFontSizeLarge' },
  { value: 'xlarge', labelKey: 'aiFontSizeXLarge' },
  { value: 'custom', labelKey: 'aiFontSizeCustom' },
] as const satisfies readonly { value: AiFontSize; labelKey: StringKey }[]

export const DECISION_ENDPOINTS: { value: DecisionEndpoint; label: string }[] = [
  { value: 'openrouter', label: 'Jev (OpenRouter)' },
  { value: 'direct', label: 'Jev (TypeSafe API)' },
  { value: 'perplexity', label: 'Perplexity (v1 27B)' },
  { value: 'perplexity-v12', label: 'Perplexity (v1.2)' },
  { value: 'perplexity-flash', label: 'Perplexity (Flash v1.2)' },
  { value: 'liquid', label: 'Liquid AI (d1)' },
  { value: 'liquid-ultra', label: 'Liquid AI (d1-ultra)' },
  { value: 'openai', label: 'OpenAI (gpt-6-luna)' },
  { value: 'cloudflare', label: 'Cloudflare (Clef)' },
  { value: 'cloudflare-flash', label: 'Cloudflare (Clef-flash)' },
  { value: 'kev', label: 'Kev (local)' },
  { value: 'rizzo', label: 'Rizzo Flow (local)' },
  { value: 'custom', label: 'Custom (/v1/systemone)' },
]

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function CustomFontSizeInput({
  value,
  label,
  onCommit,
}: {
  value: number
  label: string
  onCommit: (px: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const shown = editing ? draft : String(value)
  const commit = (raw: string) => {
    const px = clampAiCustomFontSize(raw)
    if (px !== null && px !== value) onCommit(px)
  }
  return (
    <label className="set-num">
      <input
        type="number"
        className="set-input set-num-input"
        aria-label={label}
        min={AI_CUSTOM_FONT_MIN_PX}
        max={AI_CUSTOM_FONT_MAX_PX}
        step={1}
        value={shown}
        onFocus={() => {
          setDraft(String(value))
          setEditing(true)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = Number(e.target.value)
          if (Number.isInteger(n) && n >= AI_CUSTOM_FONT_MIN_PX && n <= AI_CUSTOM_FONT_MAX_PX) {
            onCommit(n)
          }
        }}
        onBlur={() => {
          commit(draft)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <span className="set-num-unit">px</span>
    </label>
  )
}

export type SectionId = 'account' | 'general' | 'shortcuts' | 'skills'

const SECTIONS: readonly { id: SectionId; labelKey: StringKey }[] = [
  { id: 'account', labelKey: 'setSecAccount' },
  { id: 'general', labelKey: 'setSecGeneral' },
  { id: 'shortcuts', labelKey: 'setSecShortcuts' },
  { id: 'skills', labelKey: 'setSecSkills' },
]

function SectionIcon({ id }: { id: SectionId }) {
  if (id === 'account') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.2" r="2.9" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M2.7 13.6a5.5 5.5 0 0 1 10.6 0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (id === 'skills') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 3.5h6.5l3.5 3.5v5.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M9.5 3.5V7H13" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M5 10.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'shortcuts') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4 6.5h1M7.5 6.5h1M11 6.5h1M5 9.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 5h8M13 5h1M2 11h1M6 11h8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="11.5" cy="5" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.5" cy="11" r="1.7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function Field({
  label,
  value,
  valueTitle,
  action,
}: {
  label: string
  value: string
  valueTitle?: string
  action?: ReactNode
}) {
  return (
    <div className="set-field">
      <div className="set-field-text">
        <div className="set-field-label">{label}</div>
        <div className="set-field-value" data-tip={valueTitle}>
          {value}
        </div>
      </div>
      {action}
    </div>
  )
}

// ── Shortcuts Pane (Interactive hotkeys configuration) ──
function ShortcutsPane({ t }: { t: TFunc }) {
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)
  const modKey = isMac ? '⌘' : 'Ctrl'
  const [hotkeys, setHotkeys] = useState<ScreenshotHotkeysSettings>(DEFAULT_SCREENSHOT_HOTKEYS)
  const [taken, setTaken] = useState<string[]>([])
  const [recordingField, setRecordingField] = useState<keyof ScreenshotHotkeysSettings | null>(null)
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    let alive = true
    window.aiOffice?.getScreenshotHotkeys?.().then((settings) => {
      if (alive && settings) setHotkeys(settings)
    })
    const unsub = window.aiOffice?.onScreenshotHotkeysChanged?.((settings) => {
      if (alive && settings) setHotkeys(settings)
    })
    return () => {
      alive = false
      unsub?.()
    }
  }, [])

  const persist = async (next: ScreenshotHotkeysSettings) => {
    setHotkeys(next)
    try {
      const res = await window.aiOffice?.setScreenshotHotkeys?.(next)
      if (res?.taken) setTaken(res.taken)
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 2000)
    } catch (err) {
      console.warn('[shortcuts] failed to persist:', err)
    }
  }

  const handleToggle = (enabled: boolean) => {
    void persist({ ...hotkeys, enabled })
  }

  const handleFormat = (format: 'png' | 'jpeg') => {
    void persist({ ...hotkeys, format })
  }

  const handleRestore = () => {
    setRecordingField(null)
    void persist({ ...DEFAULT_SCREENSHOT_HOTKEYS })
  }

  const handleKeyRecord = (field: keyof ScreenshotHotkeysSettings, e: React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setRecordingField(null)
      return
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      void persist({ ...hotkeys, [field]: '' })
      setRecordingField(null)
      return
    }

    const accel = keyEventToAccelerator({
      key: e.key,
      code: e.code,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
    })

    if (accel) {
      void persist({ ...hotkeys, [field]: accel })
      setRecordingField(null)
    }
  }

  const renderShortcutButton = (field: 'area' | 'window' | 'fullscreen' | 'aiAssistant') => {
    const isRecording = recordingField === field
    const accel = hotkeys[field]
    const badges = formatAcceleratorBadges(accel, isMac)
    const isTaken = accel ? taken.includes(accel) : false

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          className={`set-shortcut-input-btn${isRecording ? ' recording' : ''}`}
          disabled={!hotkeys.enabled}
          onClick={() => setRecordingField(isRecording ? null : field)}
          onKeyDown={(e) => {
            if (isRecording) handleKeyRecord(field, e)
          }}
          title={isRecording ? 'Nhấn phím tổ hợp hoặc Esc để hủy' : 'Nhấp để thay đổi phím tắt'}
        >
          {isRecording ? (
            <span className="set-recording-text">Đang ghi phím... (Esc để hủy)</span>
          ) : badges.length > 0 ? (
            <span className="set-kbd-group">
              {badges.map((b: string, i: number) => (
                <kbd key={i} className="set-kbd">
                  {b}
                </kbd>
              ))}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Chưa gán phím</span>
          )}
        </button>
        {isTaken && (
          <span className="set-shortcut-warning" title="Phím tắt này đang bị ứng dụng khác chiếm giữ">
            ⚠️ Bị trùng
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="set-shortcuts-pane">
      <h3 className="set-pane-title">{t('setSecShortcuts')}</h3>

      {/* Master toggle switch */}
      <div className="set-hotkey-master-row">
        <div className="set-hotkey-master-text">
          <div className="set-hotkey-master-title">
            Bật phím tắt chụp màn hình toàn hệ thống (Global Shortcuts)
          </div>
          <div className="set-hotkey-master-desc">
            Cho phép chụp ảnh màn hình từ bất kỳ cửa sổ hoặc ứng dụng nào mà không cần chuyển về GenOffice
          </div>
        </div>
        <button
          className="set-switch"
          role="switch"
          aria-checked={hotkeys.enabled}
          aria-label="Kích hoạt phím tắt chụp màn hình toàn hệ thống"
          onClick={() => handleToggle(!hotkeys.enabled)}
        />
      </div>

      {/* Configurable Hotkeys */}
      <div className="set-shortcut-section" style={{ opacity: hotkeys.enabled ? 1 : 0.6 }}>
        <div className="set-shortcut-section-title">Phím tắt chụp ảnh màn hình (Tuỳ chỉnh tổ hợp phím)</div>

        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <div className="set-field-label">Chụp vùng màn hình (Area Capture)</div>
              <div className="set-field-desc">Kéo chọn vùng bất kỳ để chụp và mở ngay trình chỉnh sửa ảnh</div>
            </div>
          </div>
          {renderShortcutButton('area')}
        </div>

        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <div className="set-field-label">Chụp cửa sổ ứng dụng (Window Capture)</div>
              <div className="set-field-desc">Nhấp chọn một cửa sổ đang mở để chụp lại</div>
            </div>
          </div>
          {renderShortcutButton('window')}
        </div>

        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <div className="set-field-label">Chụp toàn bộ màn hình (Fullscreen)</div>
              <div className="set-field-desc">Chụp trọn vẹn toàn bộ màn hình hiển thị chính</div>
            </div>
          </div>
          {renderShortcutButton('fullscreen')}
        </div>

        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <div className="set-field-label">Trợ lý AI chụp ảnh (AI Assistant)</div>
              <div className="set-field-desc">Bật/tắt bảng trợ lý AI phân tích, OCR và xử lý ảnh chụp</div>
            </div>
          </div>
          {renderShortcutButton('aiAssistant')}
        </div>
      </div>

      {/* Format & Actions */}
      <div className="set-shortcut-section">
        <div className="set-shortcut-section-title">Định dạng lưu ảnh mặc định</div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-stack">
              <div className="set-field-label">Định dạng tệp ảnh</div>
              <div className="set-field-desc">Chọn định dạng lưu khi xuất ảnh từ trình chỉnh sửa Screenshots</div>
            </div>
          </div>
          <Dropdown
            className="set-dd"
            value={hotkeys.format || 'png'}
            ariaLabel="Định dạng tệp ảnh"
            options={[
              { value: 'png', label: 'PNG (Chất lượng gốc, không nén)' },
              { value: 'jpeg', label: 'JPEG (Kích thước nhỏ, nén 92%)' },
            ]}
            onPick={(v) => handleFormat(v as 'png' | 'jpeg')}
          />
        </div>

        <div className="set-hotkey-actions-row">
          <button type="button" className="set-btn" onClick={handleRestore}>
            Khôi phục mặc định
          </button>
          {savedNote && <span className="set-shortcut-saved-toast">✓ Đã lưu cài đặt phím tắt</span>}
        </div>
      </div>

      {/* Editor reference shortcuts */}
      <div className="set-shortcut-section">
        <div className="set-shortcut-section-title">Phím tắt trong trình chỉnh sửa ảnh (Screenshots Editor)</div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-label">Cắt ảnh (Crop tool) / Xác nhận cắt</div>
          </div>
          <div className="set-kbd-group">
            <kbd className="set-kbd">C</kbd>
            <span>/</span>
            <kbd className="set-kbd">Enter</kbd>
          </div>
        </div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-label">Công cụ vẽ (Bút / Chữ nhật / Mũi tên)</div>
          </div>
          <div className="set-kbd-group">
            <kbd className="set-kbd">P</kbd>
            <kbd className="set-kbd">R</kbd>
            <kbd className="set-kbd">A</kbd>
          </div>
        </div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-label">Sắp xếp đối tượng (Lên trên / Xuống dưới)</div>
          </div>
          <div className="set-kbd-group">
            <kbd className="set-kbd">]</kbd>
            <kbd className="set-kbd">[</kbd>
          </div>
        </div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-label">Hoàn tác (Undo) / Làm lại (Redo)</div>
          </div>
          <div className="set-kbd-group">
            <kbd className="set-kbd">{modKey}</kbd>
            <kbd className="set-kbd">Z</kbd>
            <span>/</span>
            <kbd className="set-kbd">{modKey}</kbd>
            <kbd className="set-kbd">⇧</kbd>
            <kbd className="set-kbd">Z</kbd>
          </div>
        </div>
        <div className="set-field">
          <div className="set-field-text">
            <div className="set-field-label">Sao chép ảnh (Copy) / Lưu tệp (Save)</div>
          </div>
          <div className="set-kbd-group">
            <kbd className="set-kbd">{modKey}</kbd>
            <kbd className="set-kbd">C</kbd>
            <span>/</span>
            <kbd className="set-kbd">{modKey}</kbd>
            <kbd className="set-kbd">S</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

function AiUsageChart({ stats }: { stats: AiTokenUsageStats }) {
  const [metric, setMetric] = useState<'tokens' | 'requests' | 'cost'>('tokens')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const rawDays = stats.dailyUsage && stats.dailyUsage.length > 0 ? stats.dailyUsage : []
  const chartDays: DailyAiTokenUsage[] =
    rawDays.length >= 7
      ? rawDays.slice(-14)
      : [
          { date: '2026-11-07', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          { date: '2026-11-08', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          { date: '2026-11-09', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          { date: '2026-11-10', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          { date: '2026-11-11', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          { date: '2026-11-12', inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, requestsCount: 0, costUsd: 0 },
          {
            date: '2026-11-13',
            inputTokens: stats.inputTokens,
            outputTokens: stats.outputTokens,
            cachedTokens: stats.cachedTokens || 0,
            totalTokens: stats.totalTokens,
            requestsCount: stats.requestsCount,
            costUsd: stats.estimatedCostUsd || 0,
          },
        ]

  const svgWidth = 540
  const svgHeight = 170
  const padLeft = 45
  const padRight = 15
  const padTop = 20
  const padBottom = 26
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  let maxVal = 1000
  if (metric === 'tokens') {
    const dataMax = Math.max(0, ...chartDays.map((d) => (d.totalTokens || 0) + (d.cachedTokens || 0)))
    maxVal = dataMax > 0 ? Math.ceil(dataMax * 1.15) : 1000
  } else if (metric === 'requests') {
    const dataMax = Math.max(0, ...chartDays.map((d) => d.requestsCount || 0))
    maxVal = dataMax > 0 ? Math.ceil(dataMax * 1.25) : 10
  } else {
    const dataMax = Math.max(0, ...chartDays.map((d) => d.costUsd || 0))
    maxVal = dataMax > 0 ? Number((dataMax * 1.25).toFixed(3)) : 0.01
  }

  const slotWidth = plotWidth / chartDays.length
  const barWidth = Math.min(26, Math.max(12, slotWidth * 0.52))

  const formatY = (v: number) => {
    if (metric === 'tokens') return formatTokens(Math.round(v))
    if (metric === 'requests') return String(Math.round(v))
    return `$${v.toFixed(3)}`
  }

  const activeDay = hoveredIdx !== null ? chartDays[hoveredIdx] : chartDays[chartDays.length - 1]

  return (
    <div className="set-usage-chart-wrap">
      <div className="set-usage-chart-header">
        <div className="set-usage-chart-title-row">
          <span className="set-usage-chart-title">Biểu đồ tiêu thụ</span>
          <div className="set-usage-chart-legend">
            {metric === 'tokens' && (
              <>
                <span className="set-usage-legend-item">
                  <span className="set-usage-legend-dot token-active" />
                  Prompt &amp; Output
                </span>
                <span className="set-usage-legend-item">
                  <span className="set-usage-legend-dot token-cached" />
                  Cached
                </span>
              </>
            )}
            {metric === 'requests' && (
              <span className="set-usage-legend-item">
                <span className="set-usage-legend-dot token-active" />
                Lượt gọi API
              </span>
            )}
            {metric === 'cost' && (
              <span className="set-usage-legend-item">
                <span className="set-usage-legend-dot token-active" />
                Chi phí ước tính (USD)
              </span>
            )}
          </div>
        </div>

        <div className="set-usage-tabs">
          <button
            type="button"
            className={`set-usage-tab${metric === 'tokens' ? ' active' : ''}`}
            onClick={() => setMetric('tokens')}
          >
            Tokens
          </button>
          <button
            type="button"
            className={`set-usage-tab${metric === 'requests' ? ' active' : ''}`}
            onClick={() => setMetric('requests')}
          >
            Requests
          </button>
          <button
            type="button"
            className={`set-usage-tab${metric === 'cost' ? ' active' : ''}`}
            onClick={() => setMetric('cost')}
          >
            Chi phí
          </button>
        </div>
      </div>

      <div className="set-usage-svg-container">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="set-usage-svg">
          {[1, 0.5, 0].map((ratio) => {
            const y = padTop + plotHeight * (1 - ratio)
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  className="set-usage-gridline"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="set-usage-axis-text"
                >
                  {formatY(maxVal * ratio)}
                </text>
              </g>
            )
          })}

          {chartDays.map((d, idx) => {
            const cx = padLeft + idx * slotWidth + slotWidth / 2
            const isHovered = hoveredIdx === idx
            const shortDate = d.date.slice(5).replace('-', '/')

            if (metric === 'tokens') {
              const activeH = Math.max(2, (d.totalTokens / maxVal) * plotHeight)
              const cachedH =
                (d.cachedTokens || 0) > 0 ? Math.max(2, ((d.cachedTokens || 0) / maxVal) * plotHeight) : 0
              const yActive = padTop + plotHeight - activeH
              const yCached = yActive - cachedH

              return (
                <g
                  key={d.date}
                  className="set-usage-bar-group"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <rect
                    x={cx - slotWidth / 2}
                    y={padTop}
                    width={slotWidth}
                    height={plotHeight + padBottom}
                    fill="transparent"
                  />
                  <rect
                    x={cx - barWidth / 2}
                    y={yActive}
                    width={barWidth}
                    height={activeH}
                    rx={cachedH > 0 ? 0 : 3}
                    className="set-usage-bar-active"
                    opacity={isHovered ? 1 : 0.88}
                  />
                  {cachedH > 0 && (
                    <rect
                      x={cx - barWidth / 2}
                      y={yCached}
                      width={barWidth}
                      height={cachedH}
                      rx={3}
                      className="set-usage-bar-cached"
                      opacity={isHovered ? 1 : 0.88}
                    />
                  )}
                  <text
                    x={cx}
                    y={padTop + plotHeight + 16}
                    textAnchor="middle"
                    className="set-usage-axis-text"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  >
                    {shortDate}
                  </text>
                </g>
              )
            }

            const val = metric === 'requests' ? d.requestsCount : d.costUsd
            const h = Math.max(val > 0 ? 3 : 1, (val / maxVal) * plotHeight)
            const y = padTop + plotHeight - h

            return (
              <g
                key={d.date}
                className="set-usage-bar-group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <rect
                  x={cx - slotWidth / 2}
                  y={padTop}
                  width={slotWidth}
                  height={plotHeight + padBottom}
                  fill="transparent"
                />
                <rect
                  x={cx - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={3}
                  className="set-usage-bar-active"
                  opacity={isHovered ? 1 : 0.88}
                />
                <text
                  x={cx}
                  y={padTop + plotHeight + 16}
                  textAnchor="middle"
                  className="set-usage-axis-text"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                >
                  {shortDate}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {activeDay && (
        <div className="set-usage-tooltip-card">
          <span className="set-usage-tooltip-date">
            📅 {activeDay.date.split('-').reverse().join('/')}
          </span>
          <div className="set-usage-tooltip-details">
            {metric === 'tokens' ? (
              <>
                <span>Prompt: <strong>{formatTokens(activeDay.inputTokens)}</strong></span>
                <span>Output: <strong>{formatTokens(activeDay.outputTokens)}</strong></span>
                <span>Cached: <strong>{formatTokens(activeDay.cachedTokens || 0)}</strong></span>
                <span>Tổng: <strong style={{ color: '#0077cd' }}>{formatTokens(activeDay.totalTokens + (activeDay.cachedTokens || 0))}</strong></span>
              </>
            ) : metric === 'requests' ? (
              <>
                <span>Yêu cầu: <strong style={{ color: '#0077cd' }}>{activeDay.requestsCount} reqs</strong></span>
                <span>Tokens TB: <strong>{activeDay.requestsCount > 0 ? formatTokens(Math.round(activeDay.totalTokens / activeDay.requestsCount)) : 0}</strong></span>
              </>
            ) : (
              <>
                <span>Chi phí: <strong style={{ color: '#0077cd' }}>${activeDay.costUsd.toFixed(4)}</strong></span>
                <span>Tokens: <strong>{formatTokens(activeDay.totalTokens)}</strong></span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface SettingsTarget {
  section: SectionId | string
  block?: string
  nonce?: number
}

export interface SettingsModalProps {
  status: AccountStatus | null
  loggingOut: boolean
  loginWaiting: boolean
  loginUrl: string | null
  urlCopied: boolean
  onOpenLoginUrl: () => void
  onCopyLoginUrl: () => void
  onClose: () => void
  onFileSearchChange?: () => void
  onLogin: () => void
  onLogout: () => void
  skillUpdateDue?: boolean
  onSkillUpdateDue?: (due: boolean) => void
  target?: SettingsTarget | null
}

export function SettingsModal({
  status,
  loggingOut,
  loginWaiting,
  loginUrl,
  urlCopied,
  onOpenLoginUrl,
  onCopyLoginUrl,
  onClose,
  onLogin,
  onLogout,
  target,
}: SettingsModalProps) {
  const { lang, setLang, t } = useI18n()
  const normalizeSection = (sec?: string): SectionId => {
    if (sec === 'skills' || sec === 'general' || sec === 'shortcuts' || sec === 'account') {
      return sec
    }
    return 'account'
  }
  const [section, setSection] = useState<SectionId>(normalizeSection(target?.section))

  useEffect(() => {
    if (target?.section) setSection(normalizeSection(target.section))
  }, [target])

  const [theme, setTheme] = useState<UiTheme>('system')
  const [docTheme, setDocTheme] = useState<DocTheme>('follow')
  const [saveDir, setSaveDir] = useState('')
  const [analyticsOn, setAnalyticsOn] = useState(true)
  const [analyticsSaving, setAnalyticsSaving] = useState(false)
  const [autoSaveOn, setAutoSaveOn] = useState(false)
  const [tabSleepOn, setTabSleepOn] = useState(true)
  const [restoreSessionOn, setRestoreSessionOn] = useState(false)
  const [defaultApp, setDefaultApp] = useState<DefaultAppStatus | null>(null)
  const [defaultAppBusy, setDefaultAppBusy] = useState(false)
  const [defaultAppFailed, setDefaultAppFailed] = useState(false)
  const [aiPrefs, setAiPrefs] = useState<AiPanelPrefs>(DEFAULT_AI_PANEL_PREFS)
  const [authorName, setAuthorName] = useState<AuthorNameSetting>({ value: '', fallback: '' })
  const [appVersion, setAppVersion] = useState('')

  // AI Profile & Token Usage states
  const [aiStatus, setAiStatus] = useState<AiHandshakeResult | null>(null)
  const [tokenUsage, setTokenUsage] = useState<AiTokenUsageStats>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requestsCount: 0,
  })
  const [aiSyncing, setAiSyncing] = useState(false)

  // MCP status state
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)
  const [mcpSaving, setMcpSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void window.aiOffice.getTheme?.().then((th) => {
      if (alive && th) setTheme(th)
    })
    void window.aiOffice.getDocumentTheme?.().then((th) => {
      if (alive && th) setDocTheme(th)
    })
    void window.aiOffice.getDefaultSaveDir?.().then((dir) => {
      if (alive && dir) setSaveDir(dir)
    })
    void window.aiOffice.getAnalyticsEnabled?.().then((on) => {
      if (alive) setAnalyticsOn(on !== false)
    })
    void window.aiOffice.getAutoSaveDefault?.().then((v) => {
      if (alive && v) setAutoSaveOn(v.on)
    })
    void window.aiOffice.getTabSleepEnabled?.().then((on) => {
      if (alive && on !== undefined) setTabSleepOn(on)
    })
    void window.aiOffice.getRestoreLastSession?.().then((on) => {
      if (alive && on !== undefined) setRestoreSessionOn(on)
    })
    void window.aiOffice.getDefaultAppStatus?.().then((st) => {
      if (alive && st) setDefaultApp(st)
    })
    void window.aiOffice.getAiPanelPrefs?.().then((prefs) => {
      if (alive && prefs) setAiPrefs(prefs)
    })
    void window.aiOffice.getAuthorName?.().then((an) => {
      if (alive && an) setAuthorName(an)
    })
    void window.aiOffice.getAppVersion?.().then((v) => {
      if (alive && v) setAppVersion(v)
    })
    void window.aiOffice.getMcpStatus?.().then((st) => {
      if (alive && st) setMcpStatus(st)
    })
    void window.aiOffice.getAiConfigStatus?.().then((st) => {
      if (alive && st) setAiStatus(st)
    })
    void window.aiOffice.getAiTokenUsage?.().then((usage) => {
      if (alive && usage) setTokenUsage(usage)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleSyncAiProfile = async () => {
    setAiSyncing(true)
    try {
      const res = await window.aiOffice?.syncAiConfig?.()
      if (res) setAiStatus(res)
      const usage = await window.aiOffice?.getAiTokenUsage?.()
      if (usage) setTokenUsage(usage)
    } finally {
      setAiSyncing(false)
    }
  }

  const applyTheme = (next: UiTheme) => {
    setTheme(next)
    void window.aiOffice.setTheme(next)
  }

  const applyDocTheme = (next: DocTheme) => {
    setDocTheme(next)
    void window.aiOffice.setDocumentTheme(next)
  }

  const updateAiPrefs = (patch: Partial<AiPanelPrefs>) => {
    setAiPrefs((prev) => ({ ...prev, ...patch }))
    void window.aiOffice.setAiPanelPrefs(patch)
  }

  const claimDefaultApp = () => {
    setDefaultAppBusy(true)
    setDefaultAppFailed(false)
    void window.aiOffice
      .setDefaultApp?.()
      .then((st) => {
        if (st) {
          setDefaultApp(st)
          if (!st.manualOnly && st.state !== 'default') setDefaultAppFailed(true)
        }
      })
      .catch(() => setDefaultAppFailed(true))
      .finally(() => setDefaultAppBusy(false))
  }

  const defaultAppDesc = (() => {
    if (!defaultApp) return ''
    if (defaultAppFailed) return t('setDefaultAppFailed')
    if (defaultApp.state === 'default') return t('setDefaultAppIs')
    if (defaultApp.state === 'other' && defaultApp.others.length > 0)
      return t('setDefaultAppOther', { app: defaultApp.others.join(', ') })
    return t('setDefaultAppDesc')
  })()

  const email = status?.email ?? ''
  const loggedIn = status?.loggedIn ?? false

  return (
    <div
      className="set-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="set-dialog" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <div className="set-header">
          <h2 className="set-title">{t('settings')}</h2>
          <button className="set-close" onClick={onClose} aria-label={t('cancel')}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="set-body">
          <nav className="set-nav" aria-label={t('settings')}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`set-nav-item${section === s.id ? ' active' : ''}`}
                aria-current={section === s.id}
                onClick={() => setSection(s.id)}
              >
                <SectionIcon id={s.id} />
                {t(s.labelKey)}
              </button>
            ))}
          </nav>
          <div className="set-pane">
            {/* 1. Account Section */}
            {section === 'account' && (
              <>
                <h3 className="set-pane-title">{t('setSecAccount')}</h3>
                <Field label={t('setEmail')} value={loggedIn ? email : t('setNotLoggedIn')} />

                {/* VuaHệThống AI Profile Card */}
                <div className="set-ai-profile-card">
                  <div className="set-ai-card-header">
                    <div className="set-ai-card-title">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M8 1.8 9.5 6l4.2 1.5L9.5 9 8 13.2 6.5 9 2.3 7.5 6.5 6 8 1.8Z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Hồ sơ AI VuaHệThống
                    </div>
                    <span
                      className={`set-ai-status-badge ${
                        aiStatus?.hasPack ? 'active' : aiStatus?.reason === 'account_expired' ? 'expired' : 'inactive'
                      }`}
                    >
                      {aiStatus?.hasPack
                        ? 'Đang hoạt động'
                        : aiStatus?.reason === 'account_expired'
                          ? 'Đã hết hạn'
                          : 'Chưa kích hoạt'}
                    </span>
                  </div>

                  <div className="set-ai-profile-meta">
                    <div className="set-ai-meta-item">
                      <span className="set-ai-meta-label">Gói AI</span>
                      <span className="set-ai-meta-val">
                        {aiStatus?.packName || (aiStatus?.hasPack ? 'Gói Genspark AI' : 'Chưa gán gói AI')}
                      </span>
                    </div>
                    <div className="set-ai-meta-item">
                      <span className="set-ai-meta-label">Mô hình AI</span>
                      <span className="set-ai-meta-val">
                        {aiStatus?.model || 'gpt-4o / claude-3-5-sonnet'}
                      </span>
                    </div>
                    <div className="set-ai-meta-item">
                      <span className="set-ai-meta-label">Thời hạn</span>
                      <span className="set-ai-meta-val">
                        {aiStatus?.expiresOn || (aiStatus?.hasPack ? 'Theo tài khoản' : '—')}
                      </span>
                    </div>
                    <div className="set-ai-meta-item">
                      <span className="set-ai-meta-label">Cổng Gateway</span>
                      <span className="set-ai-meta-val">vuahethong.net (360 CORP)</span>
                    </div>
                  </div>

                  <div className="set-ai-card-actions">
                    <button
                      type="button"
                      className="set-btn primary"
                      onClick={() => void window.aiOffice.openAiProfile?.(aiStatus?.setupUrl)}
                    >
                      Quản lý gói AI
                    </button>
                    <button
                      type="button"
                      className="set-btn"
                      disabled={aiSyncing}
                      onClick={handleSyncAiProfile}
                    >
                      {aiSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại'}
                    </button>
                  </div>
                </div>

                {/* Device AI Token Usage Card & Consumption Dashboard */}
                <div className="set-ai-token-card">
                  <div className="set-ai-card-header">
                    <div className="set-ai-card-title">Mức sử dụng AI trên thiết bị này (Token Usage)</div>
                  </div>
                  <div className="set-token-stat-grid">
                    <div className="set-token-stat-box">
                      <span className="set-token-stat-num">{formatTokens(tokenUsage.totalTokens)}</span>
                      <span className="set-token-stat-lbl">Tổng Tokens</span>
                      <span className="set-token-stat-sub">
                        In {formatTokens(tokenUsage.inputTokens)} • Out {formatTokens(tokenUsage.outputTokens)}
                      </span>
                    </div>
                    <div className="set-token-stat-box">
                      <span className="set-token-stat-num">{formatTokens(tokenUsage.cachedTokens || 0)}</span>
                      <span className="set-token-stat-lbl">Cached (Bộ đệm)</span>
                      <span className="set-token-stat-sub">
                        <span className="set-token-stat-badge">
                          Tiết kiệm{' '}
                          {tokenUsage.totalTokens > 0
                            ? Math.round(
                                ((tokenUsage.cachedTokens || 0) /
                                  (tokenUsage.totalTokens + (tokenUsage.cachedTokens || 0))) *
                                  100,
                              )
                            : 0}
                          %
                        </span>
                      </span>
                    </div>
                    <div className="set-token-stat-box">
                      <span className="set-token-stat-num">{tokenUsage.requestsCount}</span>
                      <span className="set-token-stat-lbl">Lượt yêu cầu</span>
                      <span className="set-token-stat-sub">API Gateway</span>
                    </div>
                    <div className="set-token-stat-box">
                      <span className="set-token-stat-num">${(tokenUsage.estimatedCostUsd ?? 0).toFixed(3)}</span>
                      <span className="set-token-stat-lbl">Chi phí ước tính</span>
                      <span className="set-token-stat-sub">Theo giá chuẩn</span>
                    </div>
                    <div className="set-token-stat-box">
                      <span className="set-token-stat-num">
                        {tokenUsage.requestsCount > 0
                          ? formatTokens(Math.round(tokenUsage.totalTokens / tokenUsage.requestsCount))
                          : '0'}
                      </span>
                      <span className="set-token-stat-lbl">Tokens / request</span>
                      <span className="set-token-stat-sub">Tải trung bình</span>
                    </div>
                  </div>

                  <AiUsageChart stats={tokenUsage} />
                </div>

                <div className="set-pane-footer">
                  {loggedIn ? (
                    <button className="set-btn danger" disabled={loggingOut} onClick={onLogout}>
                      {loggingOut ? t('loggingOut') : t('logout')}
                    </button>
                  ) : (
                    <>
                      {loginWaiting && loginUrl && (
                        <>
                          <button className="set-btn" onClick={onOpenLoginUrl}>
                            {t('loginOpenManually')}
                          </button>
                          <button className="set-btn" onClick={onCopyLoginUrl}>
                            {urlCopied ? t('loginCopied') : t('loginCopyUrl')}
                          </button>
                        </>
                      )}
                      <button className="set-btn primary" onClick={onLogin}>
                        {loginWaiting ? t('waitingShort') : t('loginGenspark')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* 2. General Section */}
            {section === 'general' && (
              <>
                <h3 className="set-pane-title">{t('setSecGeneral')}</h3>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('language')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={lang}
                    ariaLabel={t('language')}
                    options={LANG_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                    onPick={(v) => setLang(v as typeof lang)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('theme')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={theme}
                    ariaLabel={t('theme')}
                    options={THEME_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => applyTheme(v as UiTheme)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('documentTheme')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={docTheme}
                    ariaLabel={t('documentTheme')}
                    options={DOC_THEME_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => applyDocTheme(v as DocTheme)}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('setAiPanelSide')}</label>
                  </div>
                  <Dropdown
                    className="set-dd"
                    value={aiPrefs.side}
                    ariaLabel={t('setAiPanelSide')}
                    options={[
                      { value: 'left', label: t('aiPanelSideLeft') },
                      { value: 'right', label: t('aiPanelSideRight') },
                    ]}
                    onPick={(side) => updateAiPrefs({ side: side as AiPanelSide })}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <label className="set-field-label">{t('setAiFontSize')}</label>
                  </div>
                  {aiPrefs.fontSize === 'custom' && (
                    <CustomFontSizeInput
                      value={aiPrefs.customFontSize}
                      label={t('aiFontSizeCustom')}
                      onCommit={(px) => updateAiPrefs({ customFontSize: px })}
                    />
                  )}
                  <Dropdown
                    className="set-dd"
                    value={aiPrefs.fontSize}
                    ariaLabel={t('setAiFontSize')}
                    options={AI_FONT_SIZE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: t(opt.labelKey),
                    }))}
                    onPick={(v) => {
                      const fontSize = v as AiFontSize
                      updateAiPrefs(
                        fontSize === 'custom' && aiPrefs.fontSize !== 'custom'
                          ? { fontSize, customFontSize: aiPanelFontPx(aiPrefs) }
                          : { fontSize },
                      )
                    }}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAiSpellcheck')}</div>
                      <div className="set-field-desc">{t('setAiSpellcheckDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={aiPrefs.spellcheck}
                    aria-label={t('setAiSpellcheck')}
                    onClick={() => updateAiPrefs({ spellcheck: !aiPrefs.spellcheck })}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <label className="set-field-label" htmlFor="set-author-name">
                        {t('setAuthorName')}
                      </label>
                      <div className="set-field-desc">{t('setAuthorNameDesc')}</div>
                    </div>
                  </div>
                  <input
                    id="set-author-name"
                    className="set-input"
                    type="text"
                    value={authorName.value}
                    placeholder={authorName.fallback}
                    maxLength={AUTHOR_NAME_MAX}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setAuthorName((prev) => ({ ...prev, value: e.target.value }))}
                    onBlur={() => {
                      void window.aiOffice.setAuthorName(authorName.value).then((applied) => {
                        setAuthorName(applied)
                      })
                    }}
                  />
                </div>
                <Field
                  label={t('saveLocation')}
                  value={saveDir || '—'}
                  valueTitle={saveDir}
                  action={
                    <button
                      className="set-btn"
                      onClick={() => {
                        void window.aiOffice.pickDefaultSaveDir?.().then((picked) => {
                          if (picked) setSaveDir(picked)
                        })
                      }}
                    >
                      {t('setChange')}
                    </button>
                  }
                />
                {defaultApp && defaultApp.state !== 'unsupported' && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <div className="set-field-stack">
                        <div className="set-field-label">{t('setDefaultApp')}</div>
                        <div className="set-field-desc">{defaultAppDesc}</div>
                      </div>
                    </div>
                    <button
                      className="set-btn"
                      disabled={defaultAppBusy || defaultApp.state === 'default'}
                      onClick={claimDefaultApp}
                    >
                      {defaultApp.manualOnly
                        ? t('setDefaultAppOpenSettings')
                        : t('setDefaultAppSet')}
                    </button>
                  </div>
                )}
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAutoSave')}</div>
                      <div className="set-field-desc">{t('setAutoSaveDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={autoSaveOn}
                    aria-label={t('setAutoSave')}
                    onClick={() => {
                      const next = !autoSaveOn
                      setAutoSaveOn(next)
                      void window.aiOffice.setAutoSaveDefault?.(next).catch(() => {})
                    }}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setTabSleep')}</div>
                      <div className="set-field-desc">{t('setTabSleepDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={tabSleepOn}
                    aria-label={t('setTabSleep')}
                    onClick={() => {
                      const next = !tabSleepOn
                      setTabSleepOn(next)
                      void window.aiOffice.setTabSleepEnabled(next)
                    }}
                  />
                </div>
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setRestoreSession')}</div>
                      <div className="set-field-desc">{t('setRestoreSessionDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={restoreSessionOn}
                    aria-label={t('setRestoreSession')}
                    onClick={() => {
                      const next = !restoreSessionOn
                      setRestoreSessionOn(next)
                      void window.aiOffice.setRestoreLastSession(next)
                    }}
                  />
                </div>
                {mcpStatus && (
                  <div className="set-field">
                    <div className="set-field-text">
                      <div className="set-field-stack">
                        <div className="set-field-label">{t('setMcp')}</div>
                        <div className="set-field-desc">{t('setMcpDesc')}</div>
                      </div>
                    </div>
                    <button
                      className="set-switch"
                      role="switch"
                      aria-checked={mcpStatus.enabled}
                      aria-label={t('setMcp')}
                      disabled={mcpSaving}
                      onClick={() => {
                        const next = !mcpStatus.enabled
                        setMcpSaving(true)
                        void window.aiOffice
                          .setMcpSettings({ enabled: next })
                          .then((st) => setMcpStatus(st))
                          .finally(() => setMcpSaving(false))
                      }}
                    />
                  </div>
                )}
                <div className="set-field">
                  <div className="set-field-text">
                    <div className="set-field-stack">
                      <div className="set-field-label">{t('setAnalytics')}</div>
                      <div className="set-field-desc">{t('setAnalyticsDesc')}</div>
                    </div>
                  </div>
                  <button
                    className="set-switch"
                    role="switch"
                    aria-checked={analyticsOn}
                    aria-label={t('setAnalytics')}
                    disabled={analyticsSaving}
                    onClick={() => {
                      const next = !analyticsOn
                      setAnalyticsSaving(true)
                      void window.aiOffice
                        .setAnalyticsEnabled(next)
                        .then((persisted) => {
                          if (persisted) setAnalyticsOn(next)
                        })
                        .catch(() => {})
                        .finally(() => setAnalyticsSaving(false))
                    }}
                  />
                </div>
                {appVersion && (
                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                    GenOffice v{appVersion} · Phát triển bởi 360 CORP (support@360.org.vn)
                  </div>
                )}
              </>
            )}

            {/* 3. Shortcuts Section */}
            {section === 'shortcuts' && <ShortcutsPane t={t} />}

            {/* 4. Skills Section */}
            {section === 'skills' && <FoundSkills t={t} />}
          </div>
        </div>
      </div>
    </div>
  )
}
