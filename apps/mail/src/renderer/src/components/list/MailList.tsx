import React, { useState, useEffect } from 'react'
import type { EmailMessage } from '../../../../shared/types'
import {
  IconRefresh,
  IconStar,
  IconPaperclip,
  IconMail,
  IconMailUnread,
  IconTrash,
  IconArchive,
  IconFlag,
  IconReply,
  IconReplyAll,
  IconForward,
  IconExternalLink,
  IconPrinter,
  IconDownload,
} from '../common/MailIcons'

interface MailListProps {
  emails: EmailMessage[]
  selectedEmailId: string | null
  onSelectEmail: (emailId: string) => void
  categoryTab: string
  onCategoryChange: (cat: string) => void
  folderName?: string
  activeAccountId?: string
  accounts?: Array<{ id: string; name: string; email: string }>
  onRefresh?: () => void
  onDeleteEmail?: (emailId: string, e?: React.MouseEvent) => void
  onArchiveEmail?: (emailId: string, e?: React.MouseEvent) => void
  onToggleReadEmail?: (emailId: string, e?: React.MouseEvent) => void
  onToggleFlagEmail?: (emailId: string, e?: React.MouseEvent) => void
  onOpenInNewWindow?: (emailId: string) => void
  onReplyEmail?: (emailId: string) => void
  onReplyAllEmail?: (emailId: string) => void
  onForwardEmail?: (emailId: string) => void
  onPrintEmail?: (emailId: string) => void
  onSaveEml?: (emailId: string) => void
}

type FilterType = 'all' | 'unread' | 'flagged' | 'attachments'

const AVATAR_COLORS = ['#0077cd', '#107c41', '#8764b8', '#d13438', '#008272', '#b4009e', '#d83b01']

export const MailList: React.FC<MailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  categoryTab,
  onCategoryChange,
  folderName,
  activeAccountId,
  accounts = [],
  onRefresh,
  onDeleteEmail,
  onArchiveEmail,
  onToggleReadEmail,
  onToggleFlagEmail,
  onOpenInNewWindow,
  onReplyEmail,
  onReplyAllEmail,
  onForwardEmail,
  onPrintEmail,
  onSaveEml,
}) => {
  const [filterQuery, setFilterQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    email: EmailMessage
  } | null>(null)

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutside = () => setContextMenu(null)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', handleOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const filtered = emails.filter((m) => {
    // Category tab filter (Focused / Other / All)
    if (categoryTab === 'primary' && m.category === 'other') return false
    if (categoryTab === 'other' && m.category !== 'other') return false

    // Advanced filter type (unread / flagged / attachments)
    if (activeFilter === 'unread' && m.isRead) return false
    if (activeFilter === 'flagged' && !m.isStarred) return false
    if (activeFilter === 'attachments' && !m.hasAttachments) return false

    // Search query filter
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      return (
        m.subject.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group emails by Today / Earlier
  const now = new Date(2026, 7, 16)
  const todayEmails = filtered.filter((m) => {
    const d = new Date(m.dateIso)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  })

  const earlierEmails = filtered.filter((m) => {
    const d = new Date(m.dateIso)
    return d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth()
  })

  const renderEmailCard = (msg: EmailMessage, index: number) => {
    const date = new Date(msg.dateIso)
    const isToday = date.getDate() === now.getDate()
    const dateStr = isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`

    const isSelected = msg.id === selectedEmailId
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
    const initial = (msg.senderName || msg.senderEmail || 'U').charAt(0).toUpperCase()
    const targetAccount = accounts.find((a) => a.id === msg.accountId)

    return (
      <div
        key={msg.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/email-id', msg.id)
          e.dataTransfer.setData('text/plain', msg.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={`msg-card ${isSelected ? 'active' : ''} ${!msg.isRead ? 'unread' : ''}`}
        onClick={() => onSelectEmail(msg.id)}
        onDoubleClick={() => onOpenInNewWindow?.(msg.id)}
        onContextMenu={(e) => {
          e.preventDefault()
          onSelectEmail(msg.id)
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            email: msg,
          })
        }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '10px 14px',
          cursor: 'grab',
          borderBottom: '1px solid var(--border-subtle, #efefef)',
          borderLeft: isSelected ? '3px solid var(--mail-primary-blue, #0077cd)' : '3px solid transparent',
          position: 'relative',
        }}
      >
        {/* Unread indicator dot */}
        {!msg.isRead && (
          <span
            style={{
              position: 'absolute',
              left: '3px',
              top: '16px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--mail-primary-blue, #0077cd)',
            }}
          />
        )}

        {/* Sender Avatar Initial */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: avatarColor,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '12px',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: !msg.isRead ? 700 : 600,
                  color: 'var(--text-primary, #232425)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {msg.senderName || msg.senderEmail}
              </span>
              {activeAccountId === 'all_accounts' && targetAccount && (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface-subtle, #f0f4f8)',
                    color: 'var(--text-secondary, #606366)',
                    border: '1px solid var(--border, #e3e6ea)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title={targetAccount.email}
                >
                  {targetAccount.email.split('@')[0]}
                </span>
              )}
            </div>

            {/* Date & Icons (Always present, zero layout shift) */}
            <div className="mail-card-date" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
              {msg.hasAttachments && (
                <IconPaperclip size={12} color="var(--text-muted, #878e96)" />
              )}
              {msg.isStarred && (
                <IconStar size={12} active />
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #878e96)' }}>
                {dateStr}
              </span>
            </div>

            {/* Hover Actions Bar (CSS absolute overlay, zero layout jump) */}
            <div
              className="mail-hover-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="mail-hover-btn"
                title={msg.isRead ? 'Đánh dấu Chưa đọc' : 'Đánh dấu Đã đọc'}
                onClick={(e) => onToggleReadEmail?.(msg.id, e)}
              >
                {msg.isRead ? <IconMailUnread size={13} /> : <IconMail size={13} />}
              </button>
              <button
                type="button"
                className="mail-hover-btn"
                title="Gắn cờ theo dõi"
                onClick={(e) => onToggleFlagEmail?.(msg.id, e)}
              >
                <IconFlag size={13} active={msg.isStarred} />
              </button>
              <button
                type="button"
                className="mail-hover-btn"
                title="Lưu trữ"
                onClick={(e) => onArchiveEmail?.(msg.id, e)}
              >
                <IconArchive size={13} />
              </button>
              <button
                type="button"
                className="mail-hover-btn delete-action"
                title="Xoá thư"
                onClick={(e) => onDeleteEmail?.(msg.id, e)}
              >
                <IconTrash size={13} />
              </button>
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: !msg.isRead ? 600 : 500,
              color: isSelected ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary, #232425)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}
          >
            {msg.subject || '(Không có tiêu đề)'}
          </div>

          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--text-muted, #878e96)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.35',
            }}
          >
            {msg.snippet}
          </div>
        </div>
      </div>
    )
  }

  const focusedCount = emails.filter((m) => m.category !== 'other').length
  const otherCount = emails.filter((m) => m.category === 'other').length

  return (
    <div
      style={{
        width: '340px',
        minWidth: '280px',
        borderRight: '1px solid var(--border, #e3e6ea)',
        backgroundColor: 'var(--surface, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Mail List Header & Refresh */}
      <div
        style={{
          padding: '10px 14px 6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle, #efefef)',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #232425)' }}>
          {folderName || 'Hộp thư đến (Inbox)'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={onRefresh}
            title="Đồng bộ / Làm mới danh sách"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #606366)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconRefresh size={14} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle, #efefef)',
          backgroundColor: 'var(--surface, #ffffff)',
        }}
      >
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Tìm kiếm thư..."
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border, #e3e6ea)',
            outline: 'none',
            backgroundColor: 'var(--surface-subtle, #f8f9fa)',
          }}
        />
      </div>

      {/* Outlook Parity: Focused (Ưu tiên) / Other (Khác) Tab Switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border, #e3e6ea)',
          backgroundColor: 'var(--surface-subtle, #f8f9fa)',
          padding: '0 8px',
        }}
      >
        <button
          type="button"
          onClick={() => onCategoryChange('primary')}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: 'none',
            borderBottom: categoryTab === 'primary' ? '2px solid var(--mail-primary-blue, #0077cd)' : '2px solid transparent',
            background: 'transparent',
            color: categoryTab === 'primary' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-secondary, #606366)',
            fontWeight: categoryTab === 'primary' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>Ưu tiên</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '10px',
              backgroundColor: categoryTab === 'primary' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'var(--border, #e3e6ea)',
              color: categoryTab === 'primary' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-muted, #878e96)',
              fontWeight: 700,
            }}
          >
            {focusedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('other')}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: 'none',
            borderBottom: categoryTab === 'other' ? '2px solid var(--mail-primary-blue, #0077cd)' : '2px solid transparent',
            background: 'transparent',
            color: categoryTab === 'other' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-secondary, #606366)',
            fontWeight: categoryTab === 'other' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>Khác</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '10px',
              backgroundColor: categoryTab === 'other' ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'var(--border, #e3e6ea)',
              color: categoryTab === 'other' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-muted, #878e96)',
              fontWeight: 700,
            }}
          >
            {otherCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('all')}
          style={{
            padding: '8px 10px',
            border: 'none',
            borderBottom: categoryTab === 'all' ? '2px solid var(--mail-primary-blue, #0077cd)' : '2px solid transparent',
            background: 'transparent',
            color: categoryTab === 'all' ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-secondary, #606366)',
            fontWeight: categoryTab === 'all' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Tất cả
        </button>
      </div>

      {/* Quick Filters: All / Unread / Flagged / Attachments */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle, #f0f0f0)',
          backgroundColor: 'var(--surface, #ffffff)',
        }}
      >
        {[
          { id: 'all', label: 'Tất cả', icon: null },
          { id: 'unread', label: 'Chưa đọc', icon: null },
          { id: 'flagged', label: 'Gắn cờ', icon: <IconStar size={11} active={activeFilter === 'flagged'} style={{ marginRight: '3px' }} /> },
          { id: 'attachments', label: 'Đính kèm', icon: <IconPaperclip size={11} style={{ marginRight: '3px' }} /> },
        ].map((f) => {
          const isActive = activeFilter === f.id
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => setActiveFilter(f.id as FilterType)}
              style={{
                background: isActive ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'transparent',
                border: 'none',
                color: isActive ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-secondary, #606366)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '11.5px',
                padding: '3px 7px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {f.icon}
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Email Items Grouped by Date */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted, #878e96)',
              fontSize: '13px',
            }}
          >
            Không tìm thấy email nào
          </div>
        ) : (
          <>
            {todayEmails.length > 0 && (
              <>
                <div
                  style={{
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #878e96)',
                    backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Hôm nay ({todayEmails.length})
                </div>
                {todayEmails.map((msg, idx) => renderEmailCard(msg, idx))}
              </>
            )}

            {earlierEmails.length > 0 && (
              <>
                <div
                  style={{
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #878e96)',
                    backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Trước đó ({earlierEmails.length})
                </div>
                {earlierEmails.map((msg, idx) => renderEmailCard(msg, todayEmails.length + idx))}
              </>
            )}
          </>
        )}
      </div>

      {/* Outlook Standard Context Menu (Right Click on Email) */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 320),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            backgroundColor: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e3e6ea)',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
            zIndex: 9999,
            minWidth: '200px',
            padding: '4px 0',
            fontSize: '12.5px',
            color: 'var(--text-primary, #232425)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onOpenInNewWindow?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconExternalLink size={14} color="var(--mail-primary-blue, #0077cd)" />
            <span>Mở trong cửa sổ mới</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, #efefef)', margin: '4px 0' }} />

          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onReplyEmail?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconReply size={14} color="var(--mail-primary-blue, #0077cd)" />
            <span>Trả lời (Ctrl+R)</span>
          </button>

          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onReplyAllEmail?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconReplyAll size={14} color="var(--mail-primary-blue, #0077cd)" />
            <span>Trả lời tất cả</span>
          </button>

          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onForwardEmail?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconForward size={14} color="var(--mail-primary-blue, #0077cd)" />
            <span>Chuyển tiếp (Ctrl+F)</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, #efefef)', margin: '4px 0' }} />

          <button
            type="button"
            className="ctx-menu-item"
            onClick={(e) => {
              onToggleReadEmail?.(contextMenu.email.id, e)
              setContextMenu(null)
            }}
          >
            {contextMenu.email.isRead ? <IconMailUnread size={14} /> : <IconMail size={14} />}
            <span>{contextMenu.email.isRead ? 'Đánh dấu Chưa đọc' : 'Đánh dấu Đã đọc'}</span>
          </button>

          <button
            type="button"
            className="ctx-menu-item"
            onClick={(e) => {
              onToggleFlagEmail?.(contextMenu.email.id, e)
              setContextMenu(null)
            }}
          >
            <IconFlag size={14} active={contextMenu.email.isStarred} />
            <span>{contextMenu.email.isStarred ? 'Bỏ gắn cờ' : 'Gắn cờ theo dõi'}</span>
          </button>

          <button
            type="button"
            className="ctx-menu-item"
            onClick={(e) => {
              onArchiveEmail?.(contextMenu.email.id, e)
              setContextMenu(null)
            }}
          >
            <IconArchive size={14} />
            <span>Lưu trữ (Archive)</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, #efefef)', margin: '4px 0' }} />

          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onPrintEmail?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconPrinter size={14} />
            <span>In email (Ctrl+P)</span>
          </button>

          <button
            type="button"
            className="ctx-menu-item"
            onClick={() => {
              onSaveEml?.(contextMenu.email.id)
              setContextMenu(null)
            }}
          >
            <IconDownload size={14} />
            <span>Lưu tệp thư (.eml)...</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, #efefef)', margin: '4px 0' }} />

          <button
            type="button"
            className="ctx-menu-item delete-item"
            style={{ color: 'var(--danger, #d13438)' }}
            onClick={(e) => {
              onDeleteEmail?.(contextMenu.email.id, e)
              setContextMenu(null)
            }}
          >
            <IconTrash size={14} color="var(--danger, #d13438)" />
            <span>Xoá thư (Delete)</span>
          </button>
        </div>
      )}
    </div>
  )
}

