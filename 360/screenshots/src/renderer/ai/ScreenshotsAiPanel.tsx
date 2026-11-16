import React, { useState, useRef, useEffect } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AgentLoop, withAttachedSkills } from '@genoffice/agent-core'
import type { AgentImage } from '@genoffice/agent-core'
import type { Lang } from '@genoffice/i18n'
import {
  AiComposer,
  AiModelPicker,
  type AiModelPickerBridge,
  AiPanelSideButton,
  Markdown,
  AiTypingIndicator,
  AiUsageChip,
  addTokenUsage,
  type AiTokenUsageView,
  AiScopeQuote,
  type AiScopeQuoteData,
  AI_PANEL_WIDTH_DEFAULT,
  clampAiPanelWidth,
  loadAiPanelWidth,
  saveAiPanelWidth,
  aiPanelWidthAtPointer,
  AiSkillsMenu,
  AiSkillChips,
  AttachmentCardIcon,
  ATTACHMENT_IMAGE_EXTS,
  fileImageIcon,
  truncateCardName,
  formatAttachmentSize,
} from '@genoffice/ui'
import type { AttachmentMeta, AttachmentAddResult } from '../../shared/channels'
import iconUrl from '../assets/vuaoffice-icon.svg'
import sendEnterOn from '../assets/send-enter-on.png'
import sendEnterOff from '../assets/send-enter-off.png'
import sendStop from '../assets/send-stop.png'
import {
  createScreenshotsSkill,
  type ScreenshotsAiDeps,
  type ScreenshotsSnapshot,
} from './screenshots-skill'
import { createScreenshotsTransport } from './screenshots-transport'

const PANEL_WIDTH_KEY = 'screenshots-ai-panel-width'

export function GensparkMark({ size = 20 }: { size?: number }) {
  return (
    <img
      src={iconUrl}
      width={size}
      height={size}
      alt="VuaAI Pro"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        flexShrink: 0,
      }}
      aria-hidden
    />
  )
}

function IconNewChat({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      aria-hidden
    >
      <path
        d="M 12.68 7.32 v -2.55 A 1.44 1.44 0 0 0 11.23 3.33 H 4.77 a 1.44 1.44 0 0 0 -1.44 1.44 v 5.19 a 1.44 1.44 0 0 0 1.44 1.44 h 0.94 v 1.7 l 2.21 -1.7 h 1.11"
        strokeLinejoin="round"
      />
      <path d="M 11.57 9.19 v 3.4 M 9.87 10.89 h 3.4" />
    </svg>
  )
}

function IconSidebarCollapse({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
      <path d="M5.5 2.5v11" />
      <path d="M12.5 8H8.1M9.8 5.9 7.7 8l2.1 2.1" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function RollbackButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="ai-rollback-btn"
      disabled={disabled}
      onClick={onClick}
      data-tip="Khôi phục trạng thái ảnh trước thao tác này"
      aria-label="Khôi phục trạng thái ảnh trước thao tác này"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5.91026 4L2.5 7.14791L5.91026 10.8205" />
        <path d="M3.96154 7.41028H15.1636C18.5169 7.41028 21.3646 10.1484 21.4953 13.5C21.6334 17.0416 18.707 20.0769 15.1636 20.0769H6.88384" />
      </svg>
      <span>Khôi phục</span>
    </button>
  )
}

function StepIcon({ status }: { status: 'running' | 'done' | 'error' }) {
  if (status === 'running') {
    return (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6.5 3.5h11M6.5 20.5h11M8 3.5v3.2c0 2.6 4 4.2 4 5.3 0 1.1 4 2.7 4 5.3v3.2M16 3.5v3.2c0 2.6-4 4.2-4 5.3 0 1.1-4 2.7-4 5.3v3.2" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.4 2.4 2.4 4.6-5" />
    </svg>
  )
}

interface ToolActivity {
  name: string
  summary: string
  running?: boolean
  isError?: boolean
  output?: string
}

function ToolChipList({ tools }: { tools: ToolActivity[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [userOpen, setUserOpen] = useState<boolean | null>(null)

  const toggle = (j: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(j)) next.delete(j)
      else next.add(j)
      return next
    })
  }

  const anyRunning = tools.some((tool) => tool.running)
  const open = userOpen ?? anyRunning
  const label = anyRunning ? 'Đang thực hiện...' : `Đã thực hiện · ${tools.length} bước`

  return (
    <div className="ai-work-group">
      <button
        type="button"
        className={`ai-work-group-summary${anyRunning ? ' running' : ''}`}
        aria-expanded={open}
        onClick={() => setUserOpen(!open)}
      >
        {anyRunning && !open && <span className="ai-tool-chip-spinner" aria-hidden />}
        <span className="ai-work-group-label">{label}</span>
        <span className={`ai-tool-chip-caret${open ? ' open' : ''}`} aria-hidden>
          ›
        </span>
      </button>
      <div className={`ai-work-group-body${open ? ' open' : ''}`}>
        <div className="ai-work-group-body-inner">
          {tools.map((tool, j) => {
            const hasOutput = !tool.running && !!tool.output
            const isOpen = expanded.has(j)
            const stepStatus = tool.running ? 'running' : tool.isError ? 'error' : 'done'
            return (
              <div key={j} className="ai-step-row">
                <span className={`ai-step-icon ${stepStatus}`} aria-hidden>
                  <StepIcon status={stepStatus} />
                </span>
                <div className="ai-step-content">
                  {hasOutput ? (
                    <button
                      type="button"
                      className="ai-step-title clickable"
                      aria-expanded={isOpen}
                      onClick={() => toggle(j)}
                    >
                      {tool.summary}
                    </button>
                  ) : (
                    <span className="ai-step-title">{tool.summary}</span>
                  )}
                  {hasOutput && isOpen && (
                    <div className="ai-step-detail">
                      <div className="ai-tool-output">
                        <div className="ai-tool-output-pre">{tool.output}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
  error?: string
  streaming?: boolean
  tools?: ToolActivity[]
  usage?: AiTokenUsageView
  scope?: AiScopeQuoteData
  skills?: string[]
  attachments?: AttachmentMeta[]
  snapshot?: ScreenshotsSnapshot
}

const STARTER_PROMPTS = [
  {
    label: 'Che thông tin nhạy cảm',
    prompt:
      'Tự động quét và làm mờ (blur) các thông tin cá nhân, email, mật khẩu, số điện thoại, số tài khoản, token trên ảnh này.',
  },
  {
    label: 'Đánh dấu điểm nhấn',
    prompt:
      'Hãy phân tích ảnh và vẽ mũi tên, khung đỏ làm nổi bật nút bấm và nội dung thao tác quan trọng.',
  },
  {
    label: 'Cắt vùng trọng tâm',
    prompt: 'Nhận diện vùng thông tin chính trên ảnh chụp và thực hiện crop cắt bỏ viền thừa.',
  },
  {
    label: 'Trích xuất văn bản (OCR)',
    prompt:
      'Hãy trích xuất toàn bộ văn bản (OCR) nhìn thấy được trong ảnh chụp này ra dạng text.',
  },
  {
    label: 'Giải thích nội dung ảnh',
    prompt: 'Giải thích chi tiết nội dung, bố cục và ý nghĩa của bức ảnh chụp màn hình này.',
  },
]

const MODEL_BRIDGE: AiModelPickerBridge = {
  getSettings: () => (window.screenshotsApi?.getAiSettings ? window.screenshotsApi.getAiSettings() : Promise.resolve(null as any)),
  setSettings: (s) => (window.screenshotsApi?.setAiSettings ? window.screenshotsApi.setAiSettings(s) : Promise.resolve()),
  onSettingsChanged: (h) => (window.screenshotsApi?.onAiSettingsChanged ? window.screenshotsApi.onAiSettingsChanged(h) : () => {}),
  gskLoggedIn: () => (window.screenshotsApi?.gskStatus ? window.screenshotsApi.gskStatus().then((s) => !!s?.loggedIn) : Promise.resolve(false)),
  openModelSettings: () => (window.screenshotsApi?.openAiModelSettings ? window.screenshotsApi.openAiModelSettings().catch(() => {}) : Promise.resolve()),
}

export interface ScreenshotsAiPanelProps {
  isOpen: boolean
  onClose: () => void
  deps: ScreenshotsAiDeps
  getCanvasBase64: () => string | null
  lang?: string
}

export const ScreenshotsAiPanel: React.FC<ScreenshotsAiPanelProps> = ({
  isOpen,
  onClose,
  deps,
  getCanvasBase64,
  lang = 'vi',
}) => {
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionUsage, setSessionUsage] = useState<AiTokenUsageView | undefined>(undefined)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const preferredWidthRef = useRef(loadAiPanelWidth(PANEL_WIDTH_KEY) ?? AI_PANEL_WIDTH_DEFAULT)
  const [panelWidth, setPanelWidth] = useState(() => clampAiPanelWidth(preferredWidthRef.current))
  const [resizing, setResizing] = useState(false)
  const [attachedSkills, setAttachedSkills] = useState<string[]>([])
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({})
  const previewRequestedRef = useRef(new Set<string>())
  const [attachNotice, setAttachNotice] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const loopRef = useRef<AgentLoop | null>(null)
  const aiSettingsRef = useRef<any>(null)
  const depsRef = useRef(deps)
  depsRef.current = deps
  const getCanvasBase64Ref = useRef(getCanvasBase64)
  getCanvasBase64Ref.current = getCanvasBase64

  const runUsageRef = useRef<AiTokenUsageView | undefined>(undefined)
  const runSnapshotRef = useRef<ScreenshotsSnapshot | null>(null)
  const lastInstructionRef = useRef<string>('')

  // Attachment image previews
  useEffect(() => {
    const alive = new Set(attachments.map((a) => a.path))
    setAttachmentPreviews((prev) => {
      const stale = Object.keys(prev).filter((p) => !alive.has(p))
      if (stale.length === 0) return prev
      const next = { ...prev }
      for (const p of stale) delete next[p]
      return next
    })
    for (const p of previewRequestedRef.current) {
      if (!alive.has(p)) previewRequestedRef.current.delete(p)
    }
    for (const a of attachments) {
      if (!ATTACHMENT_IMAGE_EXTS.has(a.ext) || previewRequestedRef.current.has(a.path)) continue
      previewRequestedRef.current.add(a.path)
      void window.screenshotsApi
        ?.readAttachmentImage?.(a.path)
        .then((r) => {
          if (r?.ok && r.base64 && r.mime) {
            setAttachmentPreviews((prev) => ({
              ...prev,
              [a.path]: `data:${r.mime};base64,${r.base64}`,
            }))
          }
        })
        .catch(() => {
          previewRequestedRef.current.delete(a.path)
        })
    }
  }, [attachments])

  const mergeAttachments = (result: AttachmentAddResult | null | undefined) => {
    if (!result) return
    if (result.accepted.length > 0) {
      setAttachments((prev) => {
        const seen = new Set(prev.map((a) => a.path))
        return [...prev, ...result.accepted.filter((a) => !seen.has(a.path))]
      })
    }
    if (result.rejected.length > 0) {
      setAttachNotice(result.rejected.join(';'))
      window.setTimeout(() => setAttachNotice(null), 5000)
    }
  }

  const pickAttachments = async () => {
    const res = await window.screenshotsApi?.pickAttachments?.()
    mergeAttachments(res)
  }

  const removeAttachment = (path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path))
  }

  const listSkillsForMenu = async () => {
    if (!window.screenshotsApi?.skillsList) return []
    try {
      const list = await window.screenshotsApi.skillsList()
      return list.map(({ name, description }) => ({ name, description }))
    } catch {
      return []
    }
  }

  const toggleSkill = (name: string) => {
    setAttachedSkills((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  const withSkillBodies = async (instruction: string, names: readonly string[]) => {
    if (names.length === 0) return instruction
    const bodies = await Promise.all(
      names.map(async (name) => {
        try {
          const body = await window.screenshotsApi?.skillText?.(name)
          return body ? { name, body } : null
        } catch {
          return null
        }
      }),
    )
    return withAttachedSkills(
      instruction,
      bodies.filter((b): b is { name: string; body: string } => b !== null),
    )
  }

  // Window resize handler
  useEffect(() => {
    const onResize = () => setPanelWidth(clampAiPanelWidth(preferredWidthRef.current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Panel horizontal resizing
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const resizer = e.currentTarget
    setResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      const w = clampAiPanelWidth(aiPanelWidthAtPointer(ev.clientX))
      preferredWidthRef.current = w
      setPanelWidth(w)
    }

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
      resizer.removeEventListener('lostpointercapture', cleanup)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setResizing(false)
      saveAiPanelWidth(PANEL_WIDTH_KEY, preferredWidthRef.current)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
    resizer.addEventListener('lostpointercapture', cleanup)
    resizer.setPointerCapture(e.pointerId)
  }

  // Load AI Settings on mount
  useEffect(() => {
    async function loadSettings() {
      const api = window.screenshotsApi
      if (api?.getAiSettings) {
        try {
          const s = await api.getAiSettings()
          aiSettingsRef.current = s
        } catch {
          // ignore
        }
      }
    }
    void loadSettings()
  }, [])

  // Auto-scroll chat log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [chat])

  const patchLastAssistant = (
    patch: Partial<ChatEntry> | ((last: ChatEntry) => Partial<ChatEntry>),
  ) => {
    setChat((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') return prev
      next[next.length - 1] = { ...last, ...(typeof patch === 'function' ? patch(last) : patch) }
      return next
    })
  }

  const rollback = (entryIdx: number, snapshot: ScreenshotsSnapshot) => {
    depsRef.current.restoreSnapshot?.(snapshot)
    setChat((prev) =>
      prev.map((e, i) => (i >= entryIdx && e.snapshot ? { ...e, snapshot: undefined } : e)),
    )
  }

  const retry = () => {
    if (lastInstructionRef.current && !busy) {
      void handleSend(lastInstructionRef.current)
    }
  }

  // Instantiate AgentLoop with ScreenshotsSkill & Transport
  useEffect(() => {
    const proxyDeps: ScreenshotsAiDeps = {
      getImageDimensions: () => depsRef.current.getImageDimensions(),
      getCurrentShapes: () => depsRef.current.getCurrentShapes(),
      addShapes: (shapes) => depsRef.current.addShapes(shapes),
      cropImage: (rect) => depsRef.current.cropImage(rect),
      clearShapes: (toolType) => depsRef.current.clearShapes(toolType),
      getSnapshot: () => depsRef.current.getSnapshot?.() ?? { src: null, shapes: [] },
      restoreSnapshot: (snap) => depsRef.current.restoreSnapshot?.(snap),
    }
    const screenshotsSkill = createScreenshotsSkill(proxyDeps)
    const transport = createScreenshotsTransport(() => aiSettingsRef.current)

    loopRef.current = new AgentLoop({
      skill: screenshotsSkill,
      transport,
      events: {
        onText: (text: string) => {
          patchLastAssistant({ text })
        },
        onToolStart: (call) => {
          patchLastAssistant((last) => {
            const currentTools = last.tools || []
            return {
              tools: [
                ...currentTools,
                { name: call.name, summary: `Đang thực hiện ${call.name}...`, running: true },
              ],
            }
          })
        },
        onToolExecuted: (event) => {
          patchLastAssistant((last) => {
            const currentTools = (last.tools || []).map((tl) =>
              tl.name === event.call.name && tl.running
                ? {
                    ...tl,
                    summary: event.execution.summary || event.call.name,
                    running: false,
                    isError: event.execution.isError,
                    output: typeof event.execution.output === 'string' ? event.execution.output : undefined,
                  }
                : tl,
            )
            return { tools: currentTools }
          })
        },
        onTurnEnd: () => {
          patchLastAssistant({ streaming: false })
          setChat((prev) => [...prev, { role: 'assistant', text: '', streaming: true }])
        },
        onUsage: (usage) => {
          runUsageRef.current = addTokenUsage(runUsageRef.current, usage)
          setSessionUsage((prev) => addTokenUsage(prev, usage))
          patchLastAssistant({ usage: runUsageRef.current })
        },
        onDone: ({ text, cancelled }) => {
          patchLastAssistant((last) => ({
            streaming: false,
            text: text || (last.tools?.length ? last.text : (cancelled ? 'Đã dừng xử lý.' : 'Đã hoàn tất tác vụ.')),
            tools: last.tools?.filter((tl) => !tl.running),
            snapshot: runSnapshotRef.current ?? undefined,
          }))
          setBusy(false)
        },
        onError: (error: string) => {
          patchLastAssistant({
            streaming: false,
            error: error || 'Lỗi xử lý yêu cầu.',
          })
          setBusy(false)
        },
      },
    })

    return () => {
      loopRef.current?.cancel()
    }
  }, [])

  const handleSend = async (userPrompt?: string) => {
    const textToSend = (userPrompt ?? input).trim()
    if (!textToSend || busy || !loopRef.current) return

    setInput('')
    setBusy(true)
    lastInstructionRef.current = textToSend
    runUsageRef.current = undefined
    runSnapshotRef.current = depsRef.current.getSnapshot ? depsRef.current.getSnapshot() : null

    const sentSkills = [...attachedSkills]
    const sentAtts = [...attachments]
    if (sentSkills.length > 0) setAttachedSkills([])
    if (sentAtts.length > 0) setAttachments([])

    const images: AgentImage[] = []
    const base64Url = getCanvasBase64Ref.current()
    if (base64Url && base64Url.startsWith('data:image/')) {
      const commaIdx = base64Url.indexOf(',')
      if (commaIdx !== -1) {
        images.push({
          mime: 'image/png',
          base64: base64Url.slice(commaIdx + 1),
        })
      }
    }

    for (const att of sentAtts.filter((a) => ATTACHMENT_IMAGE_EXTS.has(a.ext))) {
      const prevUrl = attachmentPreviews[att.path]
      if (prevUrl) {
        const comma = prevUrl.indexOf(',')
        if (comma !== -1) {
          images.push({
            mime: prevUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
            base64: prevUrl.slice(comma + 1),
          })
        }
      }
    }

    setChat((prev) => [
      ...prev,
      {
        role: 'user',
        text: textToSend,
        scope: { label: 'Theo dõi ảnh chụp màn hình' },
        skills: sentSkills.length > 0 ? sentSkills : undefined,
        attachments: sentAtts.length > 0 ? sentAtts : undefined,
      },
      { role: 'assistant', text: '', streaming: true },
    ])

    try {
      const enrichedPrompt = await withSkillBodies(textToSend, sentSkills)
      loopRef.current.run(enrichedPrompt, images.length > 0 ? images : undefined)
    } catch (err: any) {
      patchLastAssistant({
        streaming: false,
        error: err?.message || 'Có lỗi xảy ra khi gọi AI.',
      })
      setBusy(false)
    }
  }

  const handleStop = () => {
    loopRef.current?.cancel()
    setBusy(false)
  }

  const handleClear = () => {
    loopRef.current?.cancel()
    setBusy(false)
    setChat([])
  }

  const copyMessage = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    window.setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1200)
  }

  if (!isOpen) return null

  return (
    <aside
      className={`copilot${resizing ? ' ai-panel-resizing' : ''}`}
      style={{ width: panelWidth }}
    >
      <div
        className="ai-panel-resizer"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Đổi độ rộng bảng AI"
      />
      <header className="ai-panel-header">
        <span className="ai-panel-title">
          <GensparkMark size={22} />
          VuaAI Pro
        </span>
        <div className="ai-panel-header-actions">
          <AiPanelSideButton
            lang={lang as Lang}
            onMove={(side) =>
              window.screenshotsApi?.setAiPanelPrefs
                ? window.screenshotsApi.setAiPanelPrefs({ side })
                : Promise.resolve({ side, font: 'medium', fontSize: 14 } as any)
            }
          />
          {chat.length > 0 && (
            <button
              type="button"
              className="ai-header-btn"
              onClick={handleClear}
              data-tip="Cuộc trò chuyện mới"
              aria-label="Cuộc trò chuyện mới"
            >
              <IconNewChat size={16} />
            </button>
          )}
          <button
            type="button"
            className="ai-header-btn ai-panel-collapse"
            onClick={onClose}
            data-tip="Thu gọn bảng điều khiển"
            aria-label="Thu gọn bảng điều khiển"
          >
            <IconSidebarCollapse size={15} />
          </button>
        </div>
      </header>

      <div className="ai-chat" ref={logRef}>
        {chat.length === 0 ? (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-title">Trợ lý VuaAI Chụp Màn Hình</div>
            <div className="ai-chat-empty-body">
              Hỏi về bức ảnh hiện tại hoặc yêu cầu AI thao tác trực tiếp.
              <br />
              Nhấn vào các gợi ý bên dưới để thử nhanh.
            </div>
            <div className="ai-starter-list">
              {STARTER_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-starter"
                  disabled={busy}
                  onClick={() => {
                    setInput(p.prompt)
                    inputRef.current?.focus()
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="ai-msg ai-msg-user">
                  {msg.scope && <AiScopeQuote scope={msg.scope} />}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="ai-attachments" style={{ marginBottom: 6 }}>
                      {msg.attachments.map((a) => (
                        <span key={a.path} className="ai-attachment-card" data-tip={a.path}>
                          <span className="ai-attachment-card-icon">
                            <AttachmentCardIcon ext={a.ext} />
                          </span>
                          <span className="ai-attachment-card-meta">
                            <span className="ai-attachment-card-name">{truncateCardName(a.name)}</span>
                            <span className="ai-attachment-card-size">{formatAttachmentSize(a.sizeBytes)}</span>
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.skills && msg.skills.length > 0 && (
                    <AiSkillChips lang={lang as Lang} names={msg.skills} />
                  )}
                  <span dir="auto">{msg.text}</span>
                </div>
              )
            }
            const hasTools = (msg.tools?.length ?? 0) > 0
            if (!msg.text && !msg.streaming && !hasTools && !msg.error) return null
            const turnEnded = !busy
            const isLast = i === chat.length - 1
            const showToolbar = !msg.streaming && turnEnded && !!msg.text && !msg.error

            return (
              <div
                key={i}
                className={`ai-msg ai-msg-assistant${msg.error ? ' ai-msg-error' : ''}${msg.streaming ? ' ai-msg-streaming' : ''}`}
              >
                {hasTools && <ToolChipList tools={msg.tools!} />}
                {!msg.text && msg.streaming ? (
                  <span className="ai-typing-row">
                    <AiTypingIndicator label={hasTools ? 'VuaAI đang thực thi công cụ' : 'VuaAI đang suy nghĩ'} />
                  </span>
                ) : (
                  msg.text && (
                    <div dir="auto">
                      <Markdown text={msg.text} />
                    </div>
                  )
                )}
                {msg.usage && (
                  <div className="ai-message-usage">
                    <AiUsageChip usage={msg.usage} lang={lang as Lang} />
                  </div>
                )}
                {msg.error && (
                  <div className="ai-msg-undelivered" style={{ marginTop: 8, color: 'var(--color-text-danger, #e02424)' }}>
                    ⚠️ {msg.error}
                  </div>
                )}
                {showToolbar && (
                  <div className="ai-msg-toolbar">
                    <button
                      type="button"
                      className="ai-msg-tool-btn"
                      onClick={() => copyMessage(msg.text, i)}
                      aria-label="Sao chép câu trả lời"
                      data-tip="Sao chép câu trả lời"
                    >
                      {copiedIdx === i ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M14.6113 5.34253C16.0608 5.3428 17.2363 6.518 17.2363 7.96753V15.5066C17.2361 16.956 16.0607 18.1313 14.6113 18.1316H7.07227C5.62267 18.1316 4.44751 16.9561 4.44727 15.5066V7.96753C4.44732 6.51783 5.62255 5.34253 7.07227 5.34253H14.6113ZM7.07227 6.59253C6.31291 6.59253 5.69732 7.20819 5.69727 7.96753V15.5066C5.69751 16.2658 6.31302 16.8816 7.07227 16.8816H14.6113C15.3703 16.8813 15.9861 16.2656 15.9863 15.5066V7.96753C15.9863 7.20835 15.3705 6.5928 14.6113 6.59253H7.07227ZM10.0176 2.8689C10.3626 2.86905 10.6426 3.14882 10.6426 3.4939C10.6425 3.83888 10.3626 4.11874 10.0176 4.1189H4.59961C3.84022 4.1189 3.22461 4.73451 3.22461 5.4939V11.324C3.22433 11.6689 2.94461 11.949 2.59961 11.949C2.25461 11.949 1.97489 11.6689 1.97461 11.324V5.4939C1.97461 4.04415 3.14987 2.8689 4.59961 2.8689H10.0176Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </button>
                    {isLast && !busy && lastInstructionRef.current && (
                      <button
                        type="button"
                        className="ai-msg-tool-btn"
                        onClick={retry}
                        aria-label="Tạo lại câu trả lời"
                        data-tip="Tạo lại câu trả lời"
                      >
                        <svg
                          style={{ width: 18, height: 18 }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3.68881 9.85339C4.1791 8.0054 5.28205 6.30704 6.9459 5.09101C10.8046 2.27085 16.2188 3.11279 19.0389 6.97147C19.7242 7.90904 20.1932 8.93842 20.4553 10.0001" />
                          <path d="M2.00452 8.46411L2.87229 10.7059C2.96814 10.9535 3.24658 11.0765 3.4942 10.9807L5.73594 10.1129" />
                          <path d="M20.3308 14.4908C19.8405 16.3388 18.7376 18.0372 17.0738 19.2532C13.215 22.0734 7.80083 21.2314 4.98071 17.3728C4.22167 16.3342 3.72792 15.183 3.48686 13.9999" />
                          <path d="M22.0151 15.8801L21.1474 13.6384C21.0515 13.3908 20.7731 13.2677 20.5255 13.3636L18.2837 14.2314" />
                        </svg>
                      </button>
                    )}
                    {msg.snapshot && (
                      <>
                        <span className="ai-rollback-sep" aria-hidden />
                        <RollbackButton disabled={busy} onClick={() => rollback(i, msg.snapshot!)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="ai-composer">
        <AiComposer
          header={
            (attachments.length > 0 || attachedSkills.length > 0) && (
              <>
                <AiSkillChips lang={lang as Lang} names={attachedSkills} onRemove={toggleSkill} />
                {attachments.length > 0 && (
                  <div className="ai-attachments">
                    {attachments.map((a) =>
                      ATTACHMENT_IMAGE_EXTS.has(a.ext) ? (
                        <span key={a.path} className="ai-attachment-thumb" data-tip={a.path}>
                          {attachmentPreviews[a.path] ? (
                            <img src={attachmentPreviews[a.path]} alt={a.name} />
                          ) : (
                            <span className="ai-attachment-thumb-pending" aria-hidden>
                              <img src={fileImageIcon} alt="" />
                            </span>
                          )}
                          <button
                            type="button"
                            className="ai-attachment-thumb-remove"
                            onClick={() => removeAttachment(a.path)}
                            data-tip="Xoá tệp đính kèm"
                            aria-label="Xoá tệp đính kèm"
                          >
                            <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
                              <path
                                d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="0.25"
                              />
                            </svg>
                          </button>
                        </span>
                      ) : (
                        <span key={a.path} className="ai-attachment-card" data-tip={a.path}>
                          <span className="ai-attachment-card-icon">
                            <AttachmentCardIcon ext={a.ext} />
                          </span>
                          <span className="ai-attachment-card-meta">
                            <span className="ai-attachment-card-name">
                              {truncateCardName(a.name)}
                            </span>
                            <span className="ai-attachment-card-size">
                              {formatAttachmentSize(a.sizeBytes)}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="ai-attachment-thumb-remove"
                            onClick={() => removeAttachment(a.path)}
                            data-tip="Xoá tệp đính kèm"
                            aria-label="Xoá tệp đính kèm"
                          >
                            <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
                              <path
                                d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="0.25"
                              />
                            </svg>
                          </button>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </>
            )
          }
          value={input}
          busy={busy}
          placeholder="Hỏi VuaAI hoặc yêu cầu che thông tin, vẽ chú thích, cắt ảnh..."
          hintIdle="Enter để gửi"
          hintBusy="Esc để dừng"
          hintIdleTitle="Enter để gửi · Shift+Enter để xuống dòng"
          sendLabel="Gửi"
          stopLabel="Dừng"
          iconOnly
          sendIconEnabled={<img src={sendEnterOn} alt="" aria-hidden />}
          sendIconDisabled={<img src={sendEnterOff} alt="" aria-hidden />}
          stopIcon={<img src={sendStop} alt="" aria-hidden />}
          textareaRef={inputRef}
          onChange={setInput}
          onSend={() => void handleSend()}
          onStop={handleStop}
          onPasteFiles={(files) => {
            const paths = Array.from(files)
              .map((f: any) => f.path)
              .filter(Boolean)
            if (paths.length > 0 && window.screenshotsApi?.addAttachmentPaths) {
              void window.screenshotsApi.addAttachmentPaths(paths).then((res) => {
                if (res?.accepted?.length) mergeAttachments(res)
              })
            }
          }}
          footerStart={
            <>
              <AiModelPicker bridge={MODEL_BRIDGE} lang={lang as Lang} />
              {sessionUsage && <AiUsageChip usage={sessionUsage} session lang={lang as Lang} />}
              <AiSkillsMenu
                lang={lang as Lang}
                listSkills={listSkillsForMenu}
                selected={attachedSkills}
                onToggle={toggleSkill}
                onAddFile={() => void pickAttachments()}
                onManage={() => void window.screenshotsApi?.openSkillsSettings?.()}
              />
              <button
                type="button"
                className="ai-track-btn on"
                data-tip="Theo dõi ảnh chụp màn hình hiện tại"
              >
                <span className="ai-track-dot" aria-hidden />
                <span className="ai-track-label">Theo dõi ảnh</span>
              </button>
            </>
          }
        />
      </div>
    </aside>
  )
}
