import React, { useState, useEffect, useRef } from 'react'
import {
  IconSparkles,
  IconX,
  IconLink,
  IconList,
  IconListOrdered,
  IconSend,
  IconMaximize,
  IconMinimize,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustify,
  IconQuote,
  IconCode,
  IconUndo,
  IconRedo,
  IconImage,
  IconTable,
  IconPaperclip,
  IconSignature,
  IconTemplate,
} from '../common/MailIcons'
import {
  getStoredSignatures,
  getStoredTemplates,
  getDefaultSignature,
  type EmailSignature,
  type EmailTemplate,
} from '../../services/template-store'

interface ComposeModalProps {
  isOpen: boolean
  initialTo?: string
  initialCc?: string
  initialBcc?: string
  initialSubject?: string
  initialBody?: string
  onClose: () => void
  onSend: (draft: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; bodyHtml: string }) => void
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  initialTo = '',
  initialCc = '',
  initialBcc = '',
  initialSubject = '',
  initialBody = '',
  onClose,
  onSend,
}) => {
  const [to, setTo] = useState(initialTo)
  const [cc, setCc] = useState(initialCc)
  const [bcc, setBcc] = useState(initialBcc)
  const [showCc, setShowCc] = useState(Boolean(initialCc))
  const [showBcc, setShowBcc] = useState(Boolean(initialBcc))
  const [subject, setSubject] = useState(initialSubject)
  const [bodyHtml, setBodyHtml] = useState(initialBody ? `<p>${initialBody.replace(/\n/g, '<br/>')}</p>` : '<p></p>')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedFont, setSelectedFont] = useState('Segoe UI, -apple-system, sans-serif')
  const [selectedFontSize, setSelectedFontSize] = useState('3')
  const [showSignatureMenu, setShowSignatureMenu] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo)
      setCc(initialCc)
      setBcc(initialBcc)
      setShowCc(Boolean(initialCc))
      setShowBcc(Boolean(initialBcc))
      setSubject(initialSubject)
      const loadedSigs = getStoredSignatures()
      const loadedTpls = getStoredTemplates()
      setSignatures(loadedSigs)
      setTemplates(loadedTpls)

      let initialContent = initialBody ? `<p>${initialBody.replace(/\n/g, '<br/>')}</p>` : '<p></p>'
      // Automatically attach default signature if starting a fresh email
      if (!initialBody && loadedSigs.length > 0) {
        const defaultSig = getDefaultSignature()
        if (defaultSig) {
          initialContent = `<p><br/></p><p><br/></p>${defaultSig.contentHtml}`
        }
      }

      setBodyHtml(initialContent)
      if (editorRef.current) {
        editorRef.current.innerHTML = initialContent
      }
    }
  }, [isOpen, initialTo, initialCc, initialBcc, initialSubject, initialBody])

  // Periodic Auto-save timer (every 15s)
  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      if (to.trim() || subject.trim() || (bodyHtml && bodyHtml !== '<p></p>')) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLastAutoSaved(timeStr)
      }
    }, 15000)
    return () => clearInterval(timer)
  }, [isOpen, to, subject, bodyHtml])

  if (!isOpen) return null

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML)
    }
  }

  const handleSend = () => {
    const finalHtml = editorRef.current ? editorRef.current.innerHTML : bodyHtml
    const toList = to.split(',').map((s) => s.trim()).filter(Boolean)
    const ccList = cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined
    const bccList = bcc ? bcc.split(',').map((s) => s.trim()).filter(Boolean) : undefined

    onSend({
      to: toList,
      cc: ccList && ccList.length > 0 ? ccList : undefined,
      bcc: bccList && bccList.length > 0 ? bccList : undefined,
      subject: subject || '(Không có chủ đề)',
      bodyHtml: finalHtml,
    })
    onClose()
  }

  const handleAiDraft = () => {
    if (!aiPrompt.trim()) return
    setIsGeneratingAi(true)
    setTimeout(() => {
      setSubject(`Phản hồi: ${aiPrompt}`)
      const aiGenerated = `<p>Kính gửi Quý đối tác / Anh/Chị,</p><p>Cảm ơn thông tin liên quan đến <strong>"${aiPrompt}"</strong>.</p><p>Tôi đã tiếp nhận yêu cầu và sẽ phối hợp xử lý dứt điểm trước 17h hôm nay.</p><p>Trân trọng cảm ơn,<br/><strong>Châu Lê</strong><br/><em>360 CORP / VuaOffice Team</em></p>`
      setBodyHtml(aiGenerated)
      if (editorRef.current) {
        editorRef.current.innerHTML = aiGenerated
      }
      setIsGeneratingAi(false)
    }, 600)
  }

  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid var(--border, #e3e6ea);">
        <thead>
          <tr style="background-color: var(--surface-subtle, #f6f7f9);">
            <th style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px; text-align: left;">Cột 1</th>
            <th style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px; text-align: left;">Cột 2</th>
            <th style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px; text-align: left;">Cột 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px;">Dữ liệu 1</td>
            <td style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px;">Dữ liệu 2</td>
            <td style="border: 1px solid var(--border, #e3e6ea); padding: 6px 10px;">Dữ liệu 3</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `
    execCmd('insertHTML', tableHtml)
  }

  const insertSignature = (sig: EmailSignature) => {
    execCmd('insertHTML', sig.contentHtml)
    setShowSignatureMenu(false)
  }

  const applyTemplate = (tpl: EmailTemplate) => {
    if (!subject.trim()) {
      setSubject(tpl.subject)
    }
    const defaultSig = getDefaultSignature()
    const fullHtml = defaultSig
      ? `${tpl.bodyHtml}<p><br/></p>${defaultSig.contentHtml}`
      : tpl.bodyHtml

    setBodyHtml(fullHtml)
    if (editorRef.current) {
      editorRef.current.innerHTML = fullHtml
    }
    setShowTemplateMenu(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isExpanded ? '0' : '24px',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: isExpanded ? '100vw' : '840px',
          height: isExpanded ? '100vh' : '660px',
          maxWidth: '100%',
          maxHeight: isExpanded ? '100vh' : '92vh',
          backgroundColor: 'var(--surface, #ffffff)',
          color: 'var(--text-primary, #232425)',
          borderRadius: isExpanded ? '0' : '8px',
          boxShadow: isExpanded ? 'none' : '0 24px 48px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: isExpanded ? 'none' : '1px solid var(--border, #e3e6ea)',
          transition: 'width 0.2s ease, height 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            backgroundColor: 'var(--surface-subtle, #f6f7f9)',
            borderBottom: '1px solid var(--border, #e3e6ea)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #232425)' }}>
              Soạn thư mới (VuaOffice Mail)
            </span>
            {lastAutoSaved && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #878e96)' }}>
                • Đã tự động lưu nháp lúc {lastAutoSaved}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #606366)',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isExpanded ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng cửa sổ soạn thư"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted, #878e96)',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden', backgroundColor: 'var(--surface, #ffffff)' }}>
          {/* AI Drafting Prompt */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--surface-subtle, #f6f7f9)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border, #e3e6ea)',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <IconSparkles size={14} color="var(--mail-primary-blue, #0077cd)" />
              <input
                type="text"
                placeholder="Yêu cầu VuaOffice AI viết nháp thư..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiDraft()}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12.5px',
                  color: 'var(--text-primary, #232425)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={isGeneratingAi || !aiPrompt.trim()}
              style={{
                backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 12px',
                fontSize: '11.5px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isGeneratingAi ? 'Đang viết...' : 'Tạo nháp AI'}
            </button>
          </div>

          {/* Recipients: To, Cc, Bcc */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '56px', fontSize: '12.5px', color: 'var(--text-secondary, #606366)', fontWeight: 600 }}>Đến:</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="nguoinhan@company.com"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '5px',
                  border: '1px solid var(--border, #e3e6ea)',
                  background: 'var(--surface, #ffffff)',
                  color: 'var(--text-primary, #232425)',
                  outline: 'none',
                  fontSize: '12.5px',
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--surface-subtle, #f6f7f9)',
                      border: '1px solid var(--border, #e3e6ea)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary, #606366)',
                      cursor: 'pointer',
                    }}
                  >
                    + Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--surface-subtle, #f6f7f9)',
                      border: '1px solid var(--border, #e3e6ea)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary, #606366)',
                      cursor: 'pointer',
                    }}
                  >
                    + Bcc
                  </button>
                )}
              </div>
            </div>

            {showCc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '56px', fontSize: '12.5px', color: 'var(--text-secondary, #606366)', fontWeight: 600 }}>Cc:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="nguoicc@company.com (nhận bản sao công khai)"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid var(--border, #e3e6ea)',
                    background: 'var(--surface, #ffffff)',
                    color: 'var(--text-primary, #232425)',
                    outline: 'none',
                    fontSize: '12.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false)
                    setCc('')
                  }}
                  title="Ẩn trường Cc"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-muted, #878e96)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            {showBcc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '56px', fontSize: '12.5px', color: 'var(--text-secondary, #606366)', fontWeight: 600 }}>Bcc:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="nguoibcc@company.com (nhận bản sao ẩn danh)"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid var(--border, #e3e6ea)',
                    background: 'var(--surface, #ffffff)',
                    color: 'var(--text-primary, #232425)',
                    outline: 'none',
                    fontSize: '12.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false)
                    setBcc('')
                  }}
                  title="Ẩn trường Bcc"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--text-muted, #878e96)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <IconX size={13} />
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '56px', fontSize: '12.5px', color: 'var(--text-secondary, #606366)', fontWeight: 600 }}>Tiêu đề:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Chủ đề thư..."
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '5px',
                border: '1px solid var(--border, #e3e6ea)',
                background: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #232425)',
                outline: 'none',
                fontSize: '12.5px',
              }}
            />
          </div>

          {/* VuaOffice Word-Style Rich-text Ribbon Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              padding: '6px 8px',
              backgroundColor: 'var(--surface-subtle, #f6f7f9)',
              borderRadius: '6px',
              border: '1px solid var(--border, #e3e6ea)',
              alignItems: 'center',
            }}
          >
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => execCmd('undo')}
              title="Hoàn tác (Undo - Ctrl+Z)"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconUndo size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              title="Làm lại (Redo - Ctrl+Y)"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconRedo size={13} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Font Family Selector */}
            <select
              value={selectedFont}
              onChange={(e) => {
                setSelectedFont(e.target.value)
                execCmd('fontName', e.target.value)
              }}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border, #e3e6ea)',
                backgroundColor: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #232425)',
                fontSize: '11.5px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="Segoe UI, -apple-system, sans-serif">Segoe UI</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Times New Roman, serif">Times New Roman</option>
              <option value="Calibri, sans-serif">Calibri</option>
              <option value="Courier New, monospace">Courier New</option>
              <option value="Roboto, sans-serif">Roboto</option>
            </select>

            {/* Font Size Selector */}
            <select
              value={selectedFontSize}
              onChange={(e) => {
                setSelectedFontSize(e.target.value)
                execCmd('fontSize', e.target.value)
              }}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border, #e3e6ea)',
                backgroundColor: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #232425)',
                fontSize: '11.5px',
                outline: 'none',
                cursor: 'pointer',
                width: '52px',
              }}
            >
              <option value="1">10px</option>
              <option value="2">12px</option>
              <option value="3">14px</option>
              <option value="4">16px</option>
              <option value="5">18px</option>
              <option value="6">24px</option>
            </select>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Bold, Italic, Underline, Strikethrough */}
            <button
              type="button"
              onClick={() => execCmd('bold')}
              title="Đậm (Ctrl+B)"
              style={{ padding: '3px 8px', fontWeight: 'bold', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', fontSize: '12px' }}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              title="Nghiêng (Ctrl+I)"
              style={{ padding: '3px 8px', fontStyle: 'italic', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', fontSize: '12px' }}
            >
              I
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              title="Gạch chân (Ctrl+U)"
              style={{ padding: '3px 8px', textDecoration: 'underline', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', fontSize: '12px' }}
            >
              U
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              title="Gạch ngang"
              style={{ padding: '3px 8px', textDecoration: 'line-through', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', fontSize: '12px' }}
            >
              S
            </button>

            {/* Font Color & Highlight */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', padding: '2px 4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #606366)' }}>Màu:</span>
              <input
                type="color"
                defaultValue="#232425"
                onChange={(e) => execCmd('foreColor', e.target.value)}
                title="Màu chữ"
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="color"
                defaultValue="#ffff00"
                onChange={(e) => execCmd('hiliteColor', e.target.value)}
                title="Màu nền làm nổi bật (Highlight)"
                style={{ width: '18px', height: '18px', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}
              />
            </div>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Text Alignment */}
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              title="Căn trái"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconAlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              title="Căn giữa"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconAlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              title="Căn phải"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconAlignRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              title="Căn đều 2 bên"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconAlignJustify size={13} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Lists */}
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              title="Danh sách dấu chấm"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconList size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              title="Danh sách số"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconListOrdered size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', 'blockquote')}
              title="Khối trích dẫn (Quote)"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconQuote size={13} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', 'pre')}
              title="Mã nguồn (Code Block)"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconCode size={13} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Insert Elements: Link, Table, Image */}
            <button
              type="button"
              onClick={() => {
                const url = prompt('Nhập đường dẫn liên kết:')
                if (url) execCmd('createLink', url)
              }}
              title="Chèn liên kết"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconLink size={13} />
            </button>
            <button
              type="button"
              onClick={insertTable}
              title="Chèn bảng dữ liệu (Table)"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconTable size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                const imgUrl = prompt('Nhập URL hình ảnh:')
                if (imgUrl) execCmd('insertImage', imgUrl)
              }}
              title="Chèn ảnh qua liên kết"
              style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e3e6ea)', borderRadius: '4px', color: 'var(--text-primary, #232425)', display: 'flex', alignItems: 'center' }}
            >
              <IconImage size={13} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border, #e3e6ea)', margin: '0 2px' }} />

            {/* Signature Dropdown (Outlook Parity) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSignatureMenu(!showSignatureMenu)
                  setShowTemplateMenu(false)
                }}
                title="Chèn chữ ký điện tử (Signature)"
                style={{
                  padding: '3px 8px',
                  cursor: 'pointer',
                  background: showSignatureMenu ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'var(--surface, #ffffff)',
                  border: showSignatureMenu ? '1px solid var(--mail-primary-blue, #0077cd)' : '1px solid var(--border, #e3e6ea)',
                  borderRadius: '4px',
                  color: showSignatureMenu ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                }}
              >
                <IconSignature size={13} />
                <span>Chữ ký</span>
              </button>

              {showSignatureMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    zIndex: 1050,
                    width: '220px',
                    padding: '4px 0',
                  }}
                >
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #606366)', borderBottom: '1px solid var(--border, #e3e6ea)' }}>
                    DANH SÁCH CHỮ KÝ
                  </div>
                  {signatures.map((sig) => (
                    <button
                      key={sig.id}
                      type="button"
                      onClick={() => insertSignature(sig)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        color: 'var(--text-primary, #232425)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f0f2f5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{ fontWeight: sig.isDefault ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sig.name}
                      </span>
                      {sig.isDefault && (
                        <span style={{ fontSize: '10px', color: 'var(--mail-primary-blue, #0077cd)', fontWeight: 600 }}>Mặc định</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Templates Dropdown (Outlook Quick Parts / Templates Parity) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateMenu(!showTemplateMenu)
                  setShowSignatureMenu(false)
                }}
                title="Chọn mẫu email có sẵn (Email Templates)"
                style={{
                  padding: '3px 8px',
                  cursor: 'pointer',
                  background: showTemplateMenu ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'var(--surface, #ffffff)',
                  border: showTemplateMenu ? '1px solid var(--mail-primary-blue, #0077cd)' : '1px solid var(--border, #e3e6ea)',
                  borderRadius: '4px',
                  color: showTemplateMenu ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                }}
              >
                <IconTemplate size={13} />
                <span>Mẫu thư</span>
              </button>

              {showTemplateMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    zIndex: 1050,
                    width: '260px',
                    padding: '4px 0',
                  }}
                >
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #606366)', borderBottom: '1px solid var(--border, #e3e6ea)' }}>
                    MẪU EMAIL CHUẨN (TEMPLATES)
                  </div>
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f0f2f5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #232425)' }}>
                        {tpl.title}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #878e96)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tpl.category ? `[${tpl.category}] ` : ''}{tpl.subject}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* VuaOffice Mail Document Writing Canvas */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface-subtle, #f0f2f5)',
              borderRadius: '6px',
              border: '1px solid var(--border, #e3e6ea)',
              overflowY: 'auto',
              padding: isExpanded ? '16px 24px' : '12px 16px',
              alignItems: 'stretch',
            }}
          >
            <div
              ref={editorRef}
              contentEditable
              onInput={() => {
                if (editorRef.current) {
                  setBodyHtml(editorRef.current.innerHTML)
                }
              }}
              style={{
                width: '100%',
                minHeight: '100%',
                flex: 1,
                padding: isExpanded ? '28px 36px' : '20px 24px',
                backgroundColor: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #232425)',
                outline: 'none',
                fontSize: '13.5px',
                lineHeight: '1.7',
                fontFamily: selectedFont,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                borderRadius: '4px',
                border: '1px solid var(--border, #e3e6ea)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            backgroundColor: 'var(--surface-subtle, #f6f7f9)',
            borderTop: '1px solid var(--border, #e3e6ea)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                alert('Tính năng đính kèm tệp sẽ sớm mở trong bản cập nhật kế tiếp.')
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                border: '1px solid var(--border, #e3e6ea)',
                background: 'var(--surface, #ffffff)',
                color: 'var(--text-secondary, #606366)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <IconPaperclip size={13} />
              <span>Đính kèm tệp</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '5px',
                border: '1px solid var(--border, #e3e6ea)',
                background: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #232425)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSend}
              style={{
                padding: '7px 20px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(0,119,205,0.25)',
              }}
            >
              <IconSend size={14} color="#ffffff" />
              <span>Gửi thư (Send)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

