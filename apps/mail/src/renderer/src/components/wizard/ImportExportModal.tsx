import React, { useState } from 'react'
import { parseEml, PstContainerReader } from '@genoffice/mail-engine'
import { IconX } from '../common/MailIcons'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportEml: (parsedEmail: any) => void
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportEml,
}) => {
  const [activeTab, setActiveTab] = useState<'eml' | 'pst'>('eml')
  const [emlContent, setEmlContent] = useState('')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    if (activeTab === 'eml') {
      reader.onload = (event) => {
        const text = event.target?.result as string
        setEmlContent(text)
        try {
          const parsed = parseEml(text)
          setStatusMsg(`Đã nhận diện EML: "${parsed.subject}" từ ${parsed.from.name || parsed.from.address}`)
        } catch {
          setStatusMsg('Lỗi cú pháp EML.')
        }
      }
      reader.readAsText(file)
    } else {
      reader.onload = (event) => {
        const buffer = Buffer.from(event.target?.result as ArrayBuffer)
        const pstReader = new PstContainerReader(buffer)
        if (pstReader.isPstFile()) {
          const folders = pstReader.getFolderTree()
          setStatusMsg(`Nhận diện thành công Outlook PST Container (${folders.length} thư mục).`)
        } else {
          setStatusMsg('File không đúng định dạng chuẩn Outlook PST (!BDN Header).')
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleCommitImport = () => {
    if (activeTab === 'eml' && emlContent.trim()) {
      try {
        const parsed = parseEml(emlContent)
        onImportEml(parsed)
        setStatusMsg('Import email thành công!')
        setTimeout(() => onClose(), 600)
      } catch {
        setStatusMsg('Lỗi khi lưu email vào database.')
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-bg-overlay, rgba(0,0,0,0.45))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          width: '560px',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--surface-subtle)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Import & Export Mail Wizard (.eml / .pst)</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <button
              onClick={() => { setActiveTab('eml'); setStatusMsg(null) }}
              style={{
                background: activeTab === 'eml' ? '#0078d4' : 'var(--surface-subtle)',
                color: activeTab === 'eml' ? '#fff' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              EML (RFC822 MIME)
            </button>
            <button
              onClick={() => { setActiveTab('pst'); setStatusMsg(null) }}
              style={{
                background: activeTab === 'pst' ? '#0078d4' : 'var(--surface-subtle)',
                color: activeTab === 'pst' ? '#fff' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Outlook PST (.pst)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Chọn file từ máy tính để import vào hộp thư VuaOffice Mail:
            </span>
            <input
              type="file"
              accept={activeTab === 'eml' ? '.eml,.msg' : '.pst'}
              onChange={handleFileUpload}
              style={{ fontSize: '12px' }}
            />
          </div>

          {activeTab === 'eml' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Hoặc dán trực tiếp mã nguồn EML RFC822:</span>
              <textarea
                rows={6}
                value={emlContent}
                onChange={(e) => setEmlContent(e.target.value)}
                placeholder="From: sender@example.com&#10;To: recipient@example.com&#10;Subject: Test Email&#10;&#10;Nội dung email..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {statusMsg && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#0078d4',
                fontWeight: 500,
              }}
            >
              {statusMsg}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: 'var(--surface-subtle)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Đóng
          </button>
          <button
            onClick={handleCommitImport}
            disabled={!emlContent.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: emlContent.trim() ? '#0078d4' : '#999',
              color: '#fff',
              cursor: emlContent.trim() ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Thực hiện Import
          </button>
        </div>
      </div>
    </div>
  )
}
