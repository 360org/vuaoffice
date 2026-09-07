import React, { useState, useRef, useEffect } from 'react'
import type { EmailMessage, EmailBody } from '../../../../shared/types'
import { AgentLoop } from '@genoffice/agent-core'
import { Markdown, AiComposer, AiTypingIndicator } from '@genoffice/ui'
import { createMailSkill } from './mail-skill'
import { createMailTransport } from './mail-transport'
import { GensparkMark } from '../ribbon/GensparkMark'
import {
  IconMail,
  IconSparkles,
  IconChevronRight,
  IconRefresh,
} from '../common/MailIcons'
import sendEnterOn from '../../assets/send-enter-on.png'
import sendEnterOff from '../../assets/send-enter-off.png'
import sendStop from '../../assets/send-stop.png'
import attachIcon from '../../assets/attach-icon.png'

interface AiPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedEmail: EmailMessage | null
  onApplyReply: (replyText: string) => void
  onCreateTask: (taskTitle: string) => void
  onCreateCalendar?: (event: any) => void
}

interface ToolActivity {
  name: string
  summary: string
  running?: boolean
  isError?: boolean
}

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
  error?: string
  streaming?: boolean
  tools?: ToolActivity[]
}

const STARTER_PROMPTS = [
  'Tóm tắt các điểm chính của email này',
  'Soạn thư đồng ý và xác nhận cuộc hẹn',
  'Trích xuất việc cần làm (To-Do) từ email',
  'Lên lịch họp theo thông tin trong email',
]

export const AiPanel: React.FC<AiPanelProps> = ({
  isOpen,
  onClose,
  selectedEmail,
  onApplyReply,
  onCreateTask,
  onCreateCalendar,
}) => {
  const [chat, setChat] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      text: 'Xin chào Sếp! Em là VuaOffice AI Mail Agent. Em có thể hỗ trợ Sếp tóm tắt email, soạn thư trả lời chuyên nghiệp, tạo công việc To-Do hoặc lên lịch họp Calendar.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [panelWidth, setPanelWidth] = useState(360)

  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(360)
  const logRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<AgentLoop | null>(null)
  const aiSettingsRef = useRef<any>(null)

  // Resizing logic for AI Dock
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = startXRef.current - e.clientX
      const newWidth = Math.min(Math.max(280, startWidthRef.current + delta), 600)
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleStartResize = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Load AI Settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (window.vuaMail?.getAiSettings) {
        try {
          const s = await window.vuaMail.getAiSettings()
          aiSettingsRef.current = s
        } catch {
          // ignore
        }
      }
    }
    loadSettings()
  }, [])

  // Auto-scroll chat log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [chat])

  // Instantiate AgentLoop with MailSkill & Transport
  useEffect(() => {
    const mailSkill = createMailSkill({
      getSelectedEmail: () => selectedEmail,
      getEmailBody: async (emailId: string): Promise<EmailBody | null> => {
        if (!window.vuaMail) return null
        return window.vuaMail.getEmailBody(emailId)
      },
      onDraftReply: (replyText: string) => {
        onApplyReply(replyText)
      },
      onCreateTodo: (taskTitle: string) => {
        onCreateTask(taskTitle)
      },
      onCreateCalendarEvent: (evt) => {
        if (onCreateCalendar) onCreateCalendar(evt)
      },
    })

    const transport = createMailTransport(() => aiSettingsRef.current)

    loopRef.current = new AgentLoop({
      skill: mailSkill,
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
                tools: [...currentTools, { name: call.name, summary: `Đang thực hiện ${call.name}...`, running: true }],
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
                  ? { ...tl, summary: event.execution.summary || event.call.name, running: false, isError: event.execution.isError }
                  : tl
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
  }, [selectedEmail, onApplyReply, onCreateTask, onCreateCalendar])

  const runWith = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed || busy || !loopRef.current) return

    setInput('')
    setChat((prev) => [
      ...prev,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: '', streaming: true },
    ])
    setBusy(true)

    loopRef.current.run(trimmed)
  }

  const handleStop = () => {
    if (loopRef.current && busy) {
      loopRef.current.cancel()
      setBusy(false)
    }
  }

  const handleNewChat = () => {
    if (loopRef.current) {
      loopRef.current.reset()
    }
    setBusy(false)
    setChat([
      {
        role: 'assistant',
        text: 'Cuộc trò chuyện mới đã bắt đầu. Sếp muốn em hỗ trợ xử lý email nào?',
      },
    ])
  }

  if (!isOpen) {
    return (
      <aside className="ai-dock collapsed" style={{ width: 34 }}>
        <button
          className="ai-rail"
          onClick={onClose}
          title="Mở VuaOffice AI Mail"
        >
          <GensparkMark size={18} />
          <span className="ai-rail-text">VUAOFFICE AI</span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="ai-dock" style={{ width: panelWidth }}>
      {/* Resizer handle */}
      <div className="ai-dock-resizer" onMouseDown={handleStartResize} />

      <div className="ai-dock-content">
        {/* Header */}
        <div className="ai-panel-header">
          <div className="ai-header-left">
            <GensparkMark size={18} />
            <span>VuaOffice AI</span>
          </div>
          <div className="ai-header-actions">
            <button
              className="ai-action-btn"
              onClick={handleNewChat}
              title="Làm mới cuộc trò chuyện"
            >
              <IconRefresh size={14} />
            </button>
            <button
              className="ai-action-btn"
              onClick={onClose}
              title="Thu nhỏ AI"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Selected Email Context Banner */}
        {selectedEmail && (
          <div className="ai-context-banner">
            <IconMail size={13} color="var(--mail-primary-blue, #0077cd)" />
            <span className="context-subject">{selectedEmail.subject || '(Không có tiêu đề)'}</span>
            <span className="context-badge">{selectedEmail.senderName}</span>
          </div>
        )}

        {/* Messages Log */}
        <div className="ai-messages-scroll" ref={logRef}>
          {chat.map((msg, idx) => (
            <div key={idx} className={`ai-message-bubble-wrapper ${msg.role}`}>
              {/* Tool activity indicators */}
              {msg.tools && msg.tools.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                  {msg.tools.map((tl, tIdx) => (
                    <div
                      key={tIdx}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                        border: '1px solid var(--border, #e3e6ea)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: tl.isError ? '#d32f2f' : 'var(--text-secondary, #606366)',
                      }}
                    >
                      {tl.running ? (
                        <span className="ai-spinner-dot" />
                      ) : (
                        <IconSparkles size={11} color="var(--mail-primary-blue, #0077cd)" />
                      )}
                      <span>{tl.summary}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message text with Markdown rendering */}
              {msg.text && (
                <div className="ai-message-bubble">
                  {msg.role === 'assistant' ? (
                    <Markdown text={msg.text} />
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              )}

              {/* Starter Prompts list when starting chat with an email */}
              {idx === 0 && chat.length === 1 && selectedEmail && (
                <div className="ai-starter-list">
                  {STARTER_PROMPTS.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      className="ai-starter"
                      onClick={() => runWith(prompt)}
                    >
                      <IconSparkles size={13} color="var(--mail-primary-blue, #0077cd)" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Streaming Indicator */}
              {msg.streaming && !msg.text && (
                <div className="ai-processing-state">
                  <AiTypingIndicator label="Đang suy nghĩ" />
                </div>
              )}

              {/* Error notification */}
              {msg.error && (
                <div
                  style={{
                    color: '#d32f2f',
                    fontSize: '11.5px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(211, 47, 47, 0.08)',
                    marginTop: '4px',
                  }}
                >
                  {msg.error}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Unified VuaOffice AiComposer */}
        <div style={{ padding: '0 12px 12px' }}>
          <AiComposer
            value={input}
            onChange={setInput}
            onSend={() => runWith(input)}
            onStop={handleStop}
            busy={busy}
            placeholder="Hỏi hoặc yêu cầu VuaOffice AI Mail..."
            hintIdle=""
            hintBusy=""
            sendLabel="Gửi"
            stopLabel="Dừng"
            iconOnly
            sendIconEnabled={<img src={sendEnterOn} alt="Gửi" aria-hidden />}
            sendIconDisabled={<img src={sendEnterOff} alt="" aria-hidden />}
            stopIcon={<img src={sendStop} alt="Dừng" aria-hidden />}
            footerStart={
              <button
                type="button"
                className="ai-attach-btn"
                title="Đính kèm tài liệu tham khảo"
                onClick={() => {}}
              >
                <img src={attachIcon} alt="" aria-hidden />
              </button>
            }
          />
        </div>
      </div>
    </aside>
  )
}
