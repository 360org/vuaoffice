import React, { useState, useRef, useEffect } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AgentLoop } from '@genoffice/agent-core'
import type { AgentImage } from '@genoffice/agent-core'
import type { Lang } from '@genoffice/i18n'
import {
  AiComposer,
  AiModelPicker,
  type AiModelPickerBridge,
  AiPanelSideButton,
  Markdown,
  AiTypingIndicator,
  AI_PANEL_WIDTH_DEFAULT,
  clampAiPanelWidth,
  loadAiPanelWidth,
  saveAiPanelWidth,
  aiPanelWidthAtPointer,
} from '@genoffice/ui'
import iconUrl from '../assets/vuaoffice-icon.svg'
import sendEnterOn from '../assets/send-enter-on.png'
import sendEnterOff from '../assets/send-enter-off.png'
import sendStop from '../assets/send-stop.png'
import { createScreenshotsSkill, type ScreenshotsAiDeps } from './screenshots-skill'
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

function IconNewChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
    </svg>
  )
}

function IconCollapse() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
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
  const [chat, setChat] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      text: 'Xin chào Sếp! Em là **VuaAI Screenshots Assistant**. Em có thể tự động nhìn ảnh chụp màn hình để che thông tin nhạy cảm (blur), vẽ mũi tên & khung chú thích, crop vùng trọng tâm, hoặc trích xuất văn bản (OCR) thay cho Sếp.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const preferredWidthRef = useRef(loadAiPanelWidth(PANEL_WIDTH_KEY) ?? AI_PANEL_WIDTH_DEFAULT)
  const [panelWidth, setPanelWidth] = useState(() => clampAiPanelWidth(preferredWidthRef.current))
  const [resizing, setResizing] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<AgentLoop | null>(null)
  const aiSettingsRef = useRef<any>(null)
  const depsRef = useRef(deps)
  depsRef.current = deps
  const getCanvasBase64Ref = useRef(getCanvasBase64)
  getCanvasBase64Ref.current = getCanvasBase64

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

  // Instantiate AgentLoop with ScreenshotsSkill & Transport
  useEffect(() => {
    const proxyDeps: ScreenshotsAiDeps = {
      getImageDimensions: () => depsRef.current.getImageDimensions(),
      getCurrentShapes: () => depsRef.current.getCurrentShapes(),
      addShapes: (shapes) => depsRef.current.addShapes(shapes),
      cropImage: (rect) => depsRef.current.cropImage(rect),
      clearShapes: (toolType) => depsRef.current.clearShapes(toolType),
    }
    const screenshotsSkill = createScreenshotsSkill(proxyDeps)
    const transport = createScreenshotsTransport(() => aiSettingsRef.current)

    loopRef.current = new AgentLoop({
      skill: screenshotsSkill,
      transport,
      events: {
        onText: (text: string) => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                text,
              }
            }
            return next
          })
        },
        onToolStart: (call) => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
              const currentTools = last.tools || []
              next[next.length - 1] = {
                ...last,
                tools: [
                  ...currentTools,
                  { name: call.name, summary: `Đang thực hiện ${call.name}...`, running: true },
                ],
              }
            }
            return next
          })
        },
        onToolExecuted: (event) => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
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
              next[next.length - 1] = {
                ...last,
                tools: currentTools,
              }
            }
            return next
          })
        },
        onTurnEnd: () => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, streaming: false }
            }
            return [...next, { role: 'assistant', text: '', streaming: true }]
          })
        },
        onDone: ({ text, cancelled }) => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                streaming: false,
                text: text || last.text || (cancelled ? 'Đã dừng xử lý.' : 'Đã hoàn tất tác vụ.'),
                tools: last.tools?.filter((tl) => !tl.running),
              }
            }
            return next
          })
          setBusy(false)
        },
        onError: (error: string) => {
          setChat((prev) => {
            const next = [...prev]
            const last = next.at(-1)
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                streaming: false,
                error: error || 'Lỗi xử lý yêu cầu.',
              }
            }
            return next
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

    let images: AgentImage[] | undefined
    const base64Url = getCanvasBase64Ref.current()
    if (base64Url && base64Url.startsWith('data:image/')) {
      const commaIdx = base64Url.indexOf(',')
      if (commaIdx !== -1) {
        images = [
          {
            mime: 'image/png',
            base64: base64Url.slice(commaIdx + 1),
          },
        ]
      }
    }

    setChat((prev) => [
      ...prev,
      { role: 'user', text: textToSend },
      { role: 'assistant', text: '', streaming: true },
    ])

    try {
      loopRef.current.run(textToSend, images)
    } catch (err: any) {
      setChat((prev) => {
        const next = [...prev]
        const last = next.at(-1)
        if (last && last.role === 'assistant') {
          next[next.length - 1] = {
            ...last,
            streaming: false,
            error: err?.message || 'Có lỗi xảy ra khi gọi AI.',
          }
        }
        return next
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
          <GensparkMark size={20} />
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
              title="Làm mới hội thoại"
              aria-label="Làm mới hội thoại"
            >
              <IconNewChat />
            </button>
          )}
          <button
            type="button"
            className="ai-header-btn ai-panel-collapse"
            onClick={onClose}
            title="Đóng bảng VuaAI (Esc)"
            aria-label="Đóng bảng VuaAI"
          >
            <IconCollapse />
          </button>
        </div>
      </header>

      <div className="ai-chat" ref={logRef}>
        {chat.length === 0 ? (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-title">Trợ lý VuaAI Pro Chụp Màn Hình</div>
            <div className="ai-chat-empty-body">
              Em tự động nhận diện hình ảnh màn hình hiện tại để che thông tin nhạy cảm (blur), vẽ chú thích và mũi tên, hoặc trích xuất văn bản (OCR) thay cho Sếp.
            </div>
            <div className="ai-starter-list">
              {STARTER_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-starter"
                  disabled={busy}
                  onClick={() => void handleSend(p.prompt)}
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
                  <span dir="auto">{msg.text}</span>
                </div>
              )
            }
            const hasTools = (msg.tools?.length ?? 0) > 0
            if (!msg.text && !msg.streaming && !hasTools && !msg.error) return null
            const turnEnded = !busy
            const showToolbar = !msg.streaming && turnEnded && !!msg.text && !msg.error

            return (
              <div
                key={i}
                className={`ai-msg ai-msg-assistant${msg.error ? ' ai-msg-error' : ''}${msg.streaming ? ' ai-msg-streaming' : ''}`}
              >
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
                {hasTools && <ToolChipList tools={msg.tools!} />}
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
                      title="Sao chép câu trả lời"
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
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M14.6113 5.34253C16.0608 5.3428 17.2363 6.518 17.2363 7.96753V15.5066C17.2361 16.956 16.0607 18.1313 14.6113 18.1316H7.07227C5.62267 18.1316 4.44751 16.9561 4.44727 15.5066V7.96753C4.44732 6.51783 5.62255 5.34253 7.07227 5.34253H14.6113ZM7.07227 6.59253C6.31291 6.59253 5.69732 7.20819 5.69727 7.96753V15.5066C5.69751 16.2658 6.31302 16.8816 7.07227 16.8816H14.6113C15.3703 16.8813 15.9861 16.2656 15.9863 15.5066V7.96753C15.9863 7.20835 15.3705 6.5928 14.6113 6.59253H7.07227Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="ai-composer">
        <AiComposer
          value={input}
          busy={busy}
          placeholder="Hỏi VuaAI hoặc yêu cầu che thông tin, vẽ chú thích, cắt ảnh..."
          hintIdle="Enter gửi · Shift+Enter xuống dòng"
          hintBusy="Đang xử lý..."
          sendLabel="Gửi"
          stopLabel="Dừng"
          iconOnly
          footerStart={
            <>
              <AiModelPicker bridge={MODEL_BRIDGE} lang={lang as Lang} />
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                📷 Màn hình hiện tại
              </span>
            </>
          }
          sendIconEnabled={<img src={sendEnterOn} alt="" aria-hidden />}
          sendIconDisabled={<img src={sendEnterOff} alt="" aria-hidden />}
          stopIcon={<img src={sendStop} alt="" aria-hidden />}
          onChange={setInput}
          onSend={() => void handleSend()}
          onStop={handleStop}
        />
      </div>
    </aside>
  )
}
