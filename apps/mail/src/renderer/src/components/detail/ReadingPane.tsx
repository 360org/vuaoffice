import React, { useState } from 'react'
import type { EmailAttachment, EmailBody, EmailMessage } from '../../../../shared/types'
import { EmailHtmlFrame } from './EmailHtmlFrame'
import {
  IconMail,
  IconReply,
  IconReplyAll,
  IconForward,
  IconArchive,
  IconTrash,
  IconRestore,
  IconSparkles,
  IconPaperclip,
  IconFileText,
  IconCalendarCheck,
  IconCheckSquare,
  IconExternalLink,
  IconX,
  IconMaximize,
  IconPrinter,
  IconDownload,
} from '../common/MailIcons'

interface ReadingPaneProps {
  email: EmailMessage | null
  body: EmailBody | null
  aiSummary: string | null
  isLoadingBody: boolean
  activeAccountEmail?: string
  targetAccountEmail?: string
  isTrashFolder?: boolean
  onTriggerAiSummary: () => void
  onSmartReply?: (replyText: string) => void
  onPreviewAttachment?: (att: EmailAttachment) => void
  onReply?: () => void
  onReplyAll?: () => void
  onForward?: () => void
  onExpandReply?: (currentText: string) => void
  onDelete?: () => void
  onRestore?: () => void
  onArchive?: () => void
  onCreateTask?: (title: string) => void
  onCreateCalendar?: (title: string) => void
  onOpenInNewWindow?: () => void
  onPrint?: () => void
  onSaveEml?: () => void
}

export const ReadingPane: React.FC<ReadingPaneProps> = ({
  email,
  body,
  aiSummary,
  isLoadingBody,
  targetAccountEmail,
  isTrashFolder,
  onTriggerAiSummary,
  onSmartReply,
  onPreviewAttachment,
  onReply,
  onReplyAll,
  onForward,
  onExpandReply,
  onDelete,
  onRestore,
  onArchive,
  onCreateTask,
  onCreateCalendar,
  onOpenInNewWindow,
  onPrint,
  onSaveEml,
}) => {
  const [quickReplyText, setQuickReplyText] = useState('')
  const [isQuickReplying, setIsQuickReplying] = useState(false)

  if (!email) {
    return (
      <div
        className="mail-reading"
        style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #878e96)' }}
      >
        <IconMail size={48} color="var(--border-strong, #d0d4d9)" />
        <div style={{ marginTop: '12px', fontSize: '14px' }}>Chọn một email để đọc nội dung</div>
      </div>
    )
  }

  const initial = (email.senderName || email.senderEmail || 'U').charAt(0).toUpperCase()

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const smartReplies = [
    'Dạ em đã nhận được thông tin, sẽ xử lý ngay ạ.',
    'Cảm ơn Sếp, báo cáo rất đầy đủ và chi tiết.',
    'Em đã xem tài liệu và đồng ý với kế hoạch đề xuất.',
  ]

  const handleSendQuickReply = () => {
    if (!quickReplyText.trim()) return
    onSmartReply?.(quickReplyText)
    setQuickReplyText('')
    setIsQuickReplying(false)
  }

  return (
    <div className="mail-reading">
      {/* Top Reading Header with Outlook Action Buttons */}
      <div className="reading-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
          <div className="reading-subject">{email.subject || '(Không có tiêu đề)'}</div>

          {/* Quick Action Toolbar (Parity with GensMail & Microsoft Outlook) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onReply}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary, #232425)',
                cursor: 'pointer',
              }}
              title="Trả lời người gửi (Ctrl+R)"
            >
              <IconReply size={13} color="var(--mail-primary-blue, #0077cd)" />
              <span>Trả lời</span>
            </button>

            <button
              type="button"
              onClick={onReplyAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary, #232425)',
                cursor: 'pointer',
              }}
              title="Trả lời tất cả người nhận (Ctrl+Shift+R)"
            >
              <IconReplyAll size={13} color="var(--mail-primary-blue, #0077cd)" />
              <span>Tất cả</span>
            </button>

            <button
              type="button"
              onClick={onForward}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary, #232425)',
                cursor: 'pointer',
              }}
              title="Chuyển tiếp thư (Ctrl+F)"
            >
              <IconForward size={13} color="var(--mail-primary-blue, #0077cd)" />
              <span>Chuyển tiếp</span>
            </button>

            {isTrashFolder && (
              <button
                type="button"
                onClick={onRestore}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  backgroundColor: 'var(--mail-primary-blue-soft, #e5f3fc)',
                  border: '1px solid var(--mail-primary-blue, #0077cd)',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--mail-primary-blue, #0077cd)',
                  cursor: 'pointer',
                }}
                title="Khôi phục email về thư mục gốc trước khi xoá (Restore)"
              >
                <IconRestore size={13} color="var(--mail-primary-blue, #0077cd)" />
                <span>Khôi phục</span>
              </button>
            )}

            {onOpenInNewWindow && (
              <button
                type="button"
                onClick={onOpenInNewWindow}
                style={{
                  padding: '5px 8px',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e3e6ea)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #606366)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Mở thư trong cửa sổ riêng (Shift+Enter)"
              >
                <IconExternalLink size={13} />
              </button>
            )}

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                style={{
                  padding: '5px 8px',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e3e6ea)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #606366)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="In thư (Ctrl+P)"
              >
                <IconPrinter size={13} />
              </button>
            )}

            {onSaveEml && (
              <button
                type="button"
                onClick={onSaveEml}
                style={{
                  padding: '5px 8px',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e3e6ea)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #606366)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Lưu file thư (.eml)"
              >
                <IconDownload size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={onArchive}
              style={{
                padding: '5px 8px',
                backgroundColor: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '5px',
                cursor: 'pointer',
                color: 'var(--text-secondary, #606366)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Lưu trữ thư"
            >
              <IconArchive size={13} />
            </button>

            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '5px 8px',
                backgroundColor: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e3e6ea)',
                borderRadius: '5px',
                cursor: 'pointer',
                color: 'var(--danger, #d13438)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Xoá thư"
            >
              <IconTrash size={13} />
            </button>
          </div>
        </div>

        <div className="reading-meta">
          <div className="reading-avatar">{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="reading-sender-name">{email.senderName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #878e96)' }}>
                {new Date(email.dateIso).toLocaleString('vi-VN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div className="reading-sender-email">
              &lt;{email.senderEmail}&gt; • Gửi tới: {email.recipientEmails.join(', ')}
              {targetAccountEmail && (
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface-subtle, #f0f4f8)',
                    color: 'var(--mail-primary-blue, #0077cd)',
                    border: '1px solid var(--border, #e3e6ea)',
                  }}
                >
                  Tài khoản: {targetAccountEmail}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Outlook & VuaOffice Smart Action Strip (AI Proactive Suggestions) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--surface-subtle, #f6f7f9)',
          border: '1px solid var(--border, #e3e6ea)',
          borderRadius: '6px',
          marginBottom: '14px',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: 'var(--mail-primary-blue, #0077cd)' }}>
          <IconSparkles size={13} />
          <span>Đề xuất AI:</span>
        </span>
        <button
          type="button"
          onClick={() => onCreateTask?.(email.subject || 'Công việc từ email')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            backgroundColor: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e3e6ea)',
            borderRadius: '4px',
            fontSize: '11.5px',
            color: 'var(--text-primary, #232425)',
            cursor: 'pointer',
          }}
        >
          <IconCheckSquare size={12} color="var(--mail-brand-green, #00ce2c)" />
          <span>Tạo To-Do</span>
        </button>
        <button
          type="button"
          onClick={() => onCreateCalendar?.(email.subject || 'Lịch hẹn từ email')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            backgroundColor: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e3e6ea)',
            borderRadius: '4px',
            fontSize: '11.5px',
            color: 'var(--text-primary, #232425)',
            cursor: 'pointer',
          }}
        >
          <IconCalendarCheck size={12} color="var(--mail-primary-blue, #0077cd)" />
          <span>Lên lịch họp</span>
        </button>
      </div>

      {aiSummary && (
        <div className="ai-summary-card">
          <div className="ai-summary-title">
            <IconSparkles size={14} color="var(--mail-primary-blue, #0077cd)" />
            <span>VuaOffice AI Summary</span>
          </div>
          <div className="ai-summary-text" style={{ whiteSpace: 'pre-line' }}>{aiSummary}</div>
        </div>
      )}

      {!aiSummary && (
        <button
          type="button"
          className="ribbon-btn"
          style={{ width: 'fit-content', marginBottom: '16px', border: '1px solid var(--border, #e3e6ea)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={onTriggerAiSummary}
        >
          <IconSparkles size={14} color="var(--mail-primary-blue, #0077cd)" />
          <span>Tóm tắt email này với VuaOffice AI</span>
        </button>
      )}

      {isLoadingBody ? (
        <div style={{ color: 'var(--text-muted, #878e96)', fontSize: '13px' }}>Đang nạp nội dung thư...</div>
      ) : body?.html ? (
        <EmailHtmlFrame html={body.html} title={email.subject} />
      ) : (
        <div className="reading-body">{body?.plainText || email.snippet}</div>
      )}

      {/* Attachments Section with Enhanced Card Design */}
      {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
        <div className="reading-attachments">
          <div className="attachments-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconPaperclip size={14} color="var(--text-secondary, #606366)" />
            <span>Tệp đính kèm ({email.attachments.length})</span>
          </div>
          <div className="attachments-list">
            {email.attachments.map((att) => (
              <div
                key={att.id}
                className="attachment-chip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                  border: '1px solid var(--border, #e3e6ea)',
                  borderRadius: '6px',
                }}
              >
                <IconFileText size={18} color="var(--mail-primary-blue, #0077cd)" />
                <div>
                  <div className="attachment-name" style={{ fontSize: '12px', fontWeight: 600 }}>{att.filename}</div>
                  <div className="attachment-size" style={{ fontSize: '10.5px', color: 'var(--text-muted, #878e96)' }}>{formatFileSize(att.sizeBytes)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onPreviewAttachment?.(att)}
                  style={{
                    marginLeft: '8px',
                    padding: '3px 8px',
                    backgroundColor: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--mail-primary-blue, #0077cd)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconExternalLink size={11} />
                  <span>Xem nhanh</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Smart Reply Quick Suggestion Section */}
      <div className="smart-reply-bar">
        <div className="smart-reply-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconSparkles size={14} color="var(--mail-primary-blue, #0077cd)" />
          <span>Gợi ý phản hồi nhanh AI (Smart Reply)</span>
        </div>
        <div className="smart-reply-chips">
          {smartReplies.map((reply, idx) => (
            <button
              type="button"
              key={idx}
              className="smart-reply-chip"
              onClick={() => onSmartReply?.(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Quick Reply Box (Parity with GensMail & Outlook Web) */}
      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border, #e3e6ea)', paddingTop: '16px' }}>
        {!isQuickReplying ? (
          <div
            onClick={() => setIsQuickReplying(true)}
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--surface-subtle, #f6f7f9)',
              border: '1px solid var(--border, #e3e6ea)',
              borderRadius: '8px',
              color: 'var(--text-muted, #878e96)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconReply size={15} color="var(--text-secondary, #606366)" />
              <span>Nhấp vào đây để trả lời <b>{email.senderName}</b>...</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onReply?.()
                }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border, #e3e6ea)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mở khung soạn
              </button>
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--mail-primary-blue, #0077cd)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--surface, #ffffff)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '8px 14px', backgroundColor: 'var(--surface-subtle, #f6f7f9)', borderBottom: '1px solid var(--border, #e3e6ea)', fontSize: '12px', color: 'var(--text-secondary, #606366)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Trả lời tới: <b>{email.senderEmail}</b></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onExpandReply) {
                      onExpandReply(quickReplyText)
                    } else {
                      onReply?.()
                    }
                    setIsQuickReplying(false)
                  }}
                  title="Phóng to thành cửa sổ soạn thư đầy đủ (Expand)"
                  style={{
                    border: '1px solid var(--border, #e3e6ea)',
                    background: 'var(--surface, #ffffff)',
                    color: 'var(--text-primary, #232425)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  <IconMaximize size={12} color="var(--mail-primary-blue, #0077cd)" />
                  <span>Phóng to</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickReplying(false)}
                  style={{ border: 'none', background: 'none', color: 'var(--text-muted, #878e96)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <IconX size={14} />
                </button>
              </div>
            </div>
            <textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Nhập nội dung trả lời nhanh..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border, #e3e6ea)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--surface, #ffffff)' }}>
              <button
                type="button"
                onClick={() => setIsQuickReplying(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '5px',
                  border: '1px solid var(--border, #e3e6ea)',
                  backgroundColor: 'var(--surface, #ffffff)',
                  color: 'var(--text-primary, #232425)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendQuickReply}
                style={{
                  padding: '6px 16px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,119,205,0.3)',
                }}
              >
                Gửi phản hồi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

