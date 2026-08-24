import React, { useState } from 'react'
import type { EmailAccount } from '../../../../shared/types'
import {
  IconSettings,
  IconUsers,
  IconEdit,
  IconX,
  IconLock,
  IconMicrosoft,
  IconGoogle,
  IconGlobe,
  IconApple,
  IconServer,
  IconBell,
  IconTag,
  IconType,
  IconMailOpen,
  IconSliders,
  IconJunk,
  IconCalendar,
  IconContact,
  IconShield,
  IconPlus,
  IconTrash,
} from '../common/MailIcons'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: EmailAccount[]
  activeAccountId: string
  onAccountsUpdated: () => void
}

export type SettingsSection =
  | 'grid'
  | 'general'
  | 'accounts'
  | 'notifications'
  | 'categories'
  | 'fonts'
  | 'reading'
  | 'composing'
  | 'signatures'
  | 'rules'
  | 'junk'
  | 'calendar'
  | 'contacts'
  | 'privacy'

type AddAccountStep = 'input_email' | 'choose_provider' | 'manual_imap'

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onAccountsUpdated,
}) => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('grid')
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [addStep, setAddStep] = useState<AddAccountStep>('input_email')

  // Account state
  const [provider, setProvider] = useState<'google' | 'microsoft' | 'custom_imap'>('custom_imap')
  const [accName, setAccName] = useState('')
  const [accEmail, setAccEmail] = useState('')
  const [accPassword, setAccPassword] = useState('')
  const [imapHost, setImapHost] = useState('imap.360.org.vn')
  const [imapPort, setImapPort] = useState(993)
  const [smtpHost, setSmtpHost] = useState('smtp.360.org.vn')
  const [smtpPort, setSmtpPort] = useState(587)
  const [isSaving, setIsSaving] = useState(false)
  const [authStatus, setAuthStatus] = useState<string | null>(null)

  // Signatures state
  const [signatures, setSignatures] = useState<Array<{ id: string; name: string; content: string; isDefault: boolean }>>([
    {
      id: 'sig_1',
      name: 'Chữ ký 360 CORP (Mặc định)',
      content: '--\nTrân trọng,\nChâu Lê | 360 CORP\nEmail: chau.le@360.org.vn | Website: https://360.org.vn\nVuaOffice Suite — Văn phòng thông minh thời đại AI',
      isDefault: true,
    },
    {
      id: 'sig_2',
      name: 'Chữ ký Ngắn gọn (Di động / Trả lời)',
      content: 'Trân trọng,\nChâu Lê (Gửi từ VuaOffice Mail)',
      isDefault: false,
    },
  ])
  const [selectedSigId, setSelectedSigId] = useState('sig_1')

  // General & Reading & Composing Preferences state
  const [focusedInboxEnabled, setFocusedInboxEnabled] = useState(true)
  const [autoMarkReadSeconds, setAutoMarkReadSeconds] = useState(3)
  const [undoSendDelay, setUndoSendDelay] = useState(10)
  const [defaultComposeFont, setDefaultComposeFont] = useState('Segoe UI')
  const [defaultFontSize, setDefaultFontSize] = useState('14px')
  const [playNotificationSound, setPlayNotificationSound] = useState(true)
  const [showBadgeCount, setShowBadgeCount] = useState(true)
  const [aiAutoSummarize, setAiAutoSummarize] = useState(true)
  const [aiSmartReplyEnabled, setAiSmartReplyEnabled] = useState(true)
  const [spamFilterLevel, setSpamFilterLevel] = useState<'standard' | 'strict' | 'exclusive'>('standard')

  // Blocked senders state
  const [blockedSenders, setBlockedSenders] = useState<string[]>([
    'spammer@unwanted-marketing.com',
    'promo@cold-leads-service.net',
  ])
  const [newBlockedInput, setNewBlockedInput] = useState('')

  // Mail Rules state
  const [rules, setRules] = useState<Array<{ id: string; name: string; condition: string; action: string; enabled: boolean }>>([
    {
      id: 'rule_1',
      name: 'Tự động gắn cờ email từ Ban Giám Đốc',
      condition: 'Người gửi chứa "@360.org.vn"',
      action: 'Đưa vào Hộp thư Ưu tiên (Focused) và Gắn sao',
      enabled: true,
    },
    {
      id: 'rule_2',
      name: 'Lưu trữ hóa đơn và sao kê tự động',
      condition: 'Tiêu đề chứa "Hóa đơn" hoặc "Invoice"',
      action: 'Chuyển vào thư mục Hóa đơn',
      enabled: true,
    },
  ])

  // Categories state
  const [categories, setCategories] = useState([
    { id: 'cat_red', name: 'Khẩn cấp / Quan trọng', color: '#e11d48' },
    { id: 'cat_blue', name: 'Dự án VuaOffice', color: '#0077cd' },
    { id: 'cat_green', name: 'Tài chính & Hợp đồng', color: '#10b981' },
    { id: 'cat_yellow', name: 'Khách hàng 360 CORP', color: '#f59e0b' },
    { id: 'cat_purple', name: 'Hội thảo & Sự kiện', color: '#8b5cf6' },
  ])

  if (!isOpen) return null

  const handleStartOAuthLogin = async (
    selectedService: 'google' | 'microsoft' | '360' | 'icloud' | 'yahoo' | 'exchange' | 'auto',
    emailHintInput?: string
  ) => {
    setIsSaving(true)
    const emailToUse = emailHintInput || accEmail
    setAuthStatus(`Đang kết nối xác thực ${selectedService.toUpperCase()}...`)

    try {
      if (window.vuaMail) {
        const result = await window.vuaMail.startOAuthFlow(selectedService, emailToUse)
        if (result && result.success) {
          setAuthStatus('Xác thực và kết nối tài khoản thành công!')
          onAccountsUpdated()
          setTimeout(() => {
            setIsAddingAccount(false)
            setAddStep('input_email')
            setIsSaving(false)
            setAuthStatus(null)
          }, 600)
        } else {
          setAuthStatus(result?.error || 'Xác thực không thành công')
          setIsSaving(false)
        }
      }
    } catch (err: any) {
      setAuthStatus(`Lỗi xác thực: ${err.message || 'Không thể đăng nhập'}`)
      setIsSaving(false)
    }
  }

  const handleCancelOAuth = async () => {
    if (window.vuaMail) {
      await window.vuaMail.cancelOAuthFlow()
    }
    setIsSaving(false)
    setAuthStatus(null)
  }

  const handleEmailContinue = () => {
    const raw = accEmail.trim().toLowerCase()
    if (!raw) return

    if (raw.endsWith('@gmail.com') || raw.endsWith('@googlemail.com')) {
      handleStartOAuthLogin('google', raw)
    } else if (
      raw.endsWith('@outlook.com') ||
      raw.endsWith('@hotmail.com') ||
      raw.endsWith('@live.com') ||
      raw.endsWith('@microsoft.com') ||
      raw.endsWith('@office365.com')
    ) {
      handleStartOAuthLogin('microsoft', raw)
    } else if (raw.endsWith('@icloud.com') || raw.endsWith('@me.com') || raw.endsWith('@mac.com')) {
      handleStartOAuthLogin('icloud', raw)
    } else if (raw.endsWith('@yahoo.com') || raw.endsWith('@ymail.com')) {
      handleStartOAuthLogin('yahoo', raw)
    } else if (raw.endsWith('@360.org.vn') || raw.endsWith('@vuahethong.com') || raw.endsWith('@vuaai.net')) {
      handleStartOAuthLogin('360', raw)
    } else {
      setAddStep('choose_provider')
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accEmail.trim() || !window.vuaMail) return
    setIsSaving(true)
    try {
      await window.vuaMail.addAccount({
        email: accEmail.trim(),
        name: accName.trim() || accEmail.split('@')[0],
        provider,
        imapHost: provider === 'custom_imap' ? imapHost : undefined,
        imapPort: provider === 'custom_imap' ? Number(imapPort) : undefined,
        smtpHost: provider === 'custom_imap' ? smtpHost : undefined,
        smtpPort: provider === 'custom_imap' ? Number(smtpPort) : undefined,
        password: accPassword,
      })
      setIsAddingAccount(false)
      setAddStep('input_email')
      setAccEmail('')
      setAccName('')
      setAccPassword('')
      onAccountsUpdated()
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveAccount = async (id: string) => {
    if (!window.vuaMail) return
    if (confirm('Sếp có chắc chắn muốn ngắt kết nối tài khoản email này?')) {
      await window.vuaMail.removeAccount(id)
      onAccountsUpdated()
    }
  }

  const handleSetPrimary = async (id: string) => {
    if (!window.vuaMail) return
    await window.vuaMail.setPrimaryAccount(id)
    onAccountsUpdated()
  }

  const activeSig = signatures.find((s) => s.id === selectedSigId) || signatures[0]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '820px',
          height: '620px',
          backgroundColor: 'var(--surface, #ffffff)',
          borderRadius: '12px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border, #e3e6ea)',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border, #e3e6ea)',
            backgroundColor: 'var(--surface-subtle, #f6f7f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentSection !== 'grid' && (
              <button
                type="button"
                onClick={() => setCurrentSection('grid')}
                style={{
                  border: '1px solid var(--border, #e3e6ea)',
                  backgroundColor: 'var(--surface, #ffffff)',
                  borderRadius: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--mail-primary-blue, #0077cd)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>‹</span>
                <span>Tất cả cài đặt</span>
              </button>
            )}

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #232425)' }}>
              {currentSection === 'grid' && 'Cài đặt VuaOffice Mail (Outlook Preferences)'}
              {currentSection === 'general' && 'Cài đặt Chung (General)'}
              {currentSection === 'accounts' && 'Tài khoản Mail (Accounts)'}
              {currentSection === 'notifications' && 'Thông báo & Âm thanh (Notifications)'}
              {currentSection === 'categories' && 'Danh mục & Nhãn màu (Categories)'}
              {currentSection === 'fonts' && 'Phông chữ & Định dạng (Fonts)'}
              {currentSection === 'reading' && 'Đọc thư & Chế độ xem (Reading)'}
              {currentSection === 'composing' && 'Soạn thư & Gửi đi (Composing)'}
              {currentSection === 'signatures' && 'Chữ ký điện tử (Signatures)'}
              {currentSection === 'rules' && 'Quy tắc lọc thư (Rules)'}
              {currentSection === 'junk' && 'Thư rác & Bảo vệ (Junk Email)'}
              {currentSection === 'calendar' && 'Lịch & Cuộc hẹn (Calendar)'}
              {currentSection === 'contacts' && 'Danh bạ & Gợi ý (Contacts)'}
              {currentSection === 'privacy' && 'Quyền riêng tư & AI (Privacy)'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #878e96)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ===================== VIEW 1: OUTLOOK PREFERENCES GRID ===================== */}
          {currentSection === 'grid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
              {/* Group 1: Personal Settings */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #878e96)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Cài đặt Cá nhân (Personal Settings)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentSection('general')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#0078d4' }}>
                      <IconSettings size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Chung</span>
                    <span style={tileSubStyle}>General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('accounts')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#0077cd' }}>
                      <IconUsers size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Tài khoản</span>
                    <span style={tileSubStyle}>Accounts ({accounts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('notifications')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#e11d48' }}>
                      <IconBell size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Thông báo</span>
                    <span style={tileSubStyle}>Notifications</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('categories')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#f59e0b' }}>
                      <IconTag size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Danh mục</span>
                    <span style={tileSubStyle}>Categories</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('fonts')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#8b5cf6' }}>
                      <IconType size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Phông chữ</span>
                    <span style={tileSubStyle}>Fonts</span>
                  </button>
                </div>
              </div>

              {/* Group 2: Email Settings */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #878e96)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Hộp thư & Thao tác Email (Email)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentSection('reading')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#10b981' }}>
                      <IconMailOpen size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Đọc thư</span>
                    <span style={tileSubStyle}>Reading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('composing')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#0284c7' }}>
                      <IconEdit size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Soạn thảo</span>
                    <span style={tileSubStyle}>Composing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('signatures')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#059669' }}>
                      <IconEdit size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Chữ ký</span>
                    <span style={tileSubStyle}>Signatures</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('rules')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#4f46e5' }}>
                      <IconSliders size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Quy tắc</span>
                    <span style={tileSubStyle}>Rules</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('junk')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#dc2626' }}>
                      <IconJunk size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Thư rác</span>
                    <span style={tileSubStyle}>Junk Email</span>
                  </button>
                </div>
              </div>

              {/* Group 3: Other / System Settings */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #878e96)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Khác & Hệ thống (Other)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentSection('calendar')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#2563eb' }}>
                      <IconCalendar size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Lịch họp</span>
                    <span style={tileSubStyle}>Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('contacts')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#0d9488' }}>
                      <IconContact size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Danh bạ</span>
                    <span style={tileSubStyle}>People</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSection('privacy')}
                    className="pref-tile"
                    style={tileStyle}
                  >
                    <div style={{ ...iconWrapperStyle, backgroundColor: '#475569' }}>
                      <IconShield size={22} color="#fff" />
                    </div>
                    <span style={tileLabelStyle}>Bảo mật & AI</span>
                    <span style={tileSubStyle}>Privacy & AI</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 2: ACCOUNTS SETTINGS ===================== */}
          {currentSection === 'accounts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #232425)' }}>
                    Danh sách tài khoản ({accounts.length})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #878e96)' }}>
                    Hỗ trợ tài khoản Microsoft 365, Google Workspace, 360 CORP SSO và Custom IMAP/SMTP.
                  </div>
                </div>

                {!isAddingAccount && (
                  <button
                    onClick={() => {
                      setIsAddingAccount(true)
                      setAddStep('input_email')
                    }}
                    style={{
                      backgroundColor: '#0078d4',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <IconPlus size={14} color="#fff" />
                    <span>Thêm tài khoản</span>
                  </button>
                )}
              </div>

              {/* Add Account Flow */}
              {isAddingAccount && (
                <div
                  style={{
                    backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                    border: '1px solid var(--border, #e3e6ea)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--mail-primary-blue, #0077cd)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconLock size={14} color="var(--mail-primary-blue, #0077cd)" />
                      <span>Xác thực tài khoản Microsoft Outlook / Google / IMAP</span>
                    </div>

                    {addStep !== 'input_email' && (
                      <button
                        type="button"
                        onClick={() => setAddStep('input_email')}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          backgroundColor: 'var(--surface)',
                          cursor: 'pointer',
                        }}
                      >
                        ← Quay lại
                      </button>
                    )}
                  </div>

                  {addStep === 'input_email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Nhập địa chỉ Email của bạn:
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="email"
                            placeholder="chau.le@outlook.com, name@gmail.com, ceo@360.org.vn..."
                            value={accEmail}
                            onChange={(e) => setAccEmail(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '7px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && accEmail.trim()) {
                                handleEmailContinue()
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={!accEmail.trim() || isSaving}
                            onClick={handleEmailContinue}
                            style={{
                              backgroundColor: 'var(--outlook-blue, #0078d4)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '7px 16px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: accEmail.trim() ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {isSaving ? 'Đang mở...' : 'Tiếp tục →'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleStartOAuthLogin('microsoft')}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            cursor: 'pointer',
                          }}
                        >
                          <IconMicrosoft size={24} />
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>Microsoft Outlook</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Office 365 / Exchange</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartOAuthLogin('google')}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            cursor: 'pointer',
                          }}
                        >
                          <IconGoogle size={24} />
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>Google Workspace</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Gmail / Workspace</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartOAuthLogin('360')}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            cursor: 'pointer',
                          }}
                        >
                          <IconGlobe size={24} color="var(--mail-primary-blue, #0077cd)" />
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>360 CORP SSO</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>360.org.vn Server</span>
                        </button>
                      </div>

                      {authStatus && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '4px', backgroundColor: 'var(--mail-primary-blue-soft, #e5f3fc)', color: 'var(--mail-primary-blue, #0077cd)', fontSize: '12px', fontWeight: 500 }}>
                          <span>⏳ {authStatus}</span>
                          {isSaving && (
                            <button
                              type="button"
                              onClick={handleCancelOAuth}
                              style={{
                                border: '1px solid var(--mail-primary-blue, #0077cd)',
                                background: '#fff',
                                color: 'var(--mail-primary-blue, #0077cd)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isSaving) handleCancelOAuth()
                            setIsAddingAccount(false)
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            padding: '5px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                  {addStep === 'choose_provider' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleStartOAuthLogin('microsoft', accEmail)}
                        style={providerCardStyle}
                      >
                        <IconMicrosoft size={24} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Microsoft 365</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartOAuthLogin('google', accEmail)}
                        style={providerCardStyle}
                      >
                        <IconGoogle size={24} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Google</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartOAuthLogin('icloud', accEmail)}
                        style={providerCardStyle}
                      >
                        <IconApple size={24} color="var(--text-primary)" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>iCloud</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddStep('manual_imap')}
                        style={providerCardStyle}
                      >
                        <IconServer size={24} color="#10b981" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>IMAP / POP</span>
                      </button>
                    </div>
                  )}

                  {addStep === 'manual_imap' && (
                    <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 500 }}>Email:</label>
                          <input
                            type="email"
                            required
                            value={accEmail}
                            onChange={(e) => setAccEmail(e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 500 }}>Tên hiển thị:</label>
                          <input
                            type="text"
                            required
                            value={accName}
                            onChange={(e) => setAccName(e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 500 }}>Mật khẩu ứng dụng:</label>
                          <input
                            type="password"
                            required
                            value={accPassword}
                            onChange={(e) => setAccPassword(e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 500 }}>Giao thức:</label>
                          <select
                            value={provider}
                            onChange={(e: any) => setProvider(e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                          >
                            <option value="custom_imap">Custom IMAP / SMTP</option>
                            <option value="microsoft">Microsoft Exchange</option>
                            <option value="google">Google Workspace</option>
                          </select>
                        </div>
                      </div>

                      {provider === 'custom_imap' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 500 }}>Máy chủ IMAP:</label>
                            <input
                              type="text"
                              value={imapHost}
                              onChange={(e) => setImapHost(e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 500 }}>Cổng:</label>
                            <input
                              type="number"
                              value={imapPort}
                              onChange={(e) => setImapPort(Number(e.target.value))}
                              style={{ width: '100%', padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 500 }}>Máy chủ SMTP:</label>
                            <input
                              type="text"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 500 }}>Cổng:</label>
                            <input
                              type="number"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(Number(e.target.value))}
                              style={{ width: '100%', padding: '4px 6px', fontSize: '10.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                        <button type="button" onClick={() => setAddStep('choose_provider')} style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '3px', cursor: 'pointer' }}>
                          Quay lại
                        </button>
                        <button type="submit" disabled={isSaving} style={{ backgroundColor: '#0078d4', color: '#fff', border: 'none', padding: '4px 14px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                          {isSaving ? 'Đang lưu...' : 'Lưu tài khoản'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Accounts list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {accounts.map((acc) => {
                  const isPrimary = Boolean(acc.isDefault)
                  const isCurrentViewing = acc.id === activeAccountId
                  const initial = (acc.name || acc.email).charAt(0).toUpperCase()

                  return (
                    <div
                      key={acc.id}
                      style={{
                        border: isCurrentViewing ? '1px solid var(--outlook-blue, #0078d4)' : '1px solid var(--border, #e3e6ea)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--surface, #ffffff)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--outlook-blue, #0078d4)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          {initial}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {acc.name}
                            </span>
                            {isPrimary && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--mail-primary-blue-soft, #e5f3fc)',
                                  color: 'var(--mail-primary-blue, #0077cd)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                }}
                              >
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {acc.email} • {acc.provider.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(acc.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '3px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--surface)',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Đặt mặc định
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveAccount(acc.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            color: '#ef4444',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===================== VIEW 3: GENERAL SETTINGS ===================== */}
          {currentSection === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Hộp thư Đến có tiêu điểm (Focused Inbox)</div>
                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={focusedInboxEnabled}
                    onChange={(e) => setFocusedInboxEnabled(e.target.checked)}
                  />
                  <span>Tự động phân loại email quan trọng vào tab Ưu tiên (Focused) và email khác vào Khác (Other)</span>
                </label>
              </div>

              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Khởi động & Đồng bộ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Thư mục mở khi khởi động:</span>
                    <select style={selectStyle} defaultValue="f_inbox">
                      <option value="f_inbox">Hộp thư Đến (Inbox)</option>
                      <option value="f_starred">Có gắn dấu sao</option>
                      <option value="all">Tất cả thư</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Tần suất đồng bộ thư ngầm:</span>
                    <select style={selectStyle} defaultValue="1">
                      <option value="1">Mỗi 1 phút (Real-time)</option>
                      <option value="5">Mỗi 5 phút</option>
                      <option value="15">Mỗi 15 phút</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 4: NOTIFICATIONS ===================== */}
          {currentSection === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Thông báo tin nhắn mới</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={playNotificationSound}
                      onChange={(e) => setPlayNotificationSound(e.target.checked)}
                    />
                    <span>Phát âm thanh khi có email mới gửi đến (Chime sound)</span>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={showBadgeCount}
                      onChange={(e) => setShowBadgeCount(e.target.checked)}
                    />
                    <span>Hiển thị số lượng thư chưa đọc trên biểu tượng ứng dụng (Dock / Taskbar badge)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 5: CATEGORIES ===================== */}
          {currentSection === 'categories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Tạo và quản lý các nhãn màu (Category Tags) để tổ chức hộp thư hiệu quả theo chuẩn Outlook.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                      border: '1px solid var(--border, #e3e6ea)',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: cat.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{cat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategories(categories.filter((c) => c.id !== cat.id))}
                      style={{ border: 'none', background: 'none', color: 'var(--danger, #d13438)', cursor: 'pointer' }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== VIEW 6: FONTS ===================== */}
          {currentSection === 'fonts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Phông chữ Soạn thư mặc định</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Phông chữ (Font Family):</label>
                    <select
                      value={defaultComposeFont}
                      onChange={(e) => setDefaultComposeFont(e.target.value)}
                      style={{ ...selectStyle, width: '100%', marginTop: '4px' }}
                    >
                      <option value="Segoe UI">Segoe UI (Chuẩn Microsoft Office)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Kích thước chữ (Font Size):</label>
                    <select
                      value={defaultFontSize}
                      onChange={(e) => setDefaultFontSize(e.target.value)}
                      style={{ ...selectStyle, width: '100%', marginTop: '4px' }}
                    >
                      <option value="12px">12 px (Nhỏ)</option>
                      <option value="14px">14 px (Tiêu chuẩn)</option>
                      <option value="16px">16 px (Lớn)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 7: READING ===================== */}
          {currentSection === 'reading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Đánh dấu là đã đọc (Mark as Read)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12.5px' }}>Tự động đánh dấu đã đọc sau khi xem:</span>
                  <select
                    value={autoMarkReadSeconds}
                    onChange={(e) => setAutoMarkReadSeconds(Number(e.target.value))}
                    style={selectStyle}
                  >
                    <option value={0}>Ngay lập tức</option>
                    <option value={3}>Sau 3 giây</option>
                    <option value={5}>Sau 5 giây</option>
                    <option value={-1}>Chỉ khi đánh dấu thủ công</option>
                  </select>
                </div>
              </div>

              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Bố cục khung đọc (Reading Pane)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12.5px' }}>Vị trí hiển thị nội dung thư:</span>
                  <select style={selectStyle} defaultValue="right">
                    <option value="right">Bên phải (Outlook 3-Column View)</option>
                    <option value="bottom">Bên dưới (Bottom Split View)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 8: COMPOSING ===================== */}
          {currentSection === 'composing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Hoàn tác gửi thư (Undo Send)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12.5px' }}>Thời gian cho phép hủy gửi thư sau khi bấm Send:</span>
                  <select
                    value={undoSendDelay}
                    onChange={(e) => setUndoSendDelay(Number(e.target.value))}
                    style={selectStyle}
                  >
                    <option value={5}>5 giây</option>
                    <option value={10}>10 giây (Khuyên dùng)</option>
                    <option value={30}>30 giây</option>
                    <option value={0}>Không kích hoạt (Gửi ngay)</option>
                  </select>
                </div>
              </div>

              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Định dạng thư gửi</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '12.5px' }}>Định dạng soạn thư mặc định:</span>
                  <select style={selectStyle} defaultValue="html">
                    <option value="html">HTML chuẩn VuaOffice Docs (Rich Text)</option>
                    <option value="plain">Văn bản thuần (Plain Text)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 9: SIGNATURES ===================== */}
          {currentSection === 'signatures' && (
            <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border)', paddingRight: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>DANH SÁCH CHỮ KÝ</div>
                {signatures.map((sig) => (
                  <button
                    key={sig.id}
                    type="button"
                    onClick={() => setSelectedSigId(sig.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '5px',
                      border: '1px solid var(--border)',
                      backgroundColor: selectedSigId === sig.id ? 'var(--mail-primary-blue-soft, #e5f3fc)' : 'var(--surface)',
                      color: selectedSigId === sig.id ? 'var(--mail-primary-blue, #0077cd)' : 'var(--text-primary)',
                      fontWeight: selectedSigId === sig.id ? 600 : 400,
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {sig.name}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Nội dung chữ ký:</div>
                <textarea
                  rows={8}
                  value={activeSig.content}
                  onChange={(e) => {
                    const newContent = e.target.value
                    setSignatures(signatures.map((s) => (s.id === activeSig.id ? { ...s, content: newContent } : s)))
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => alert('Đã lưu chữ ký thành công!')}
                    style={{ backgroundColor: '#0078d4', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Lưu chữ ký
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 10: RULES ===================== */}
          {currentSection === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Thiết lập các quy tắc xử lý email tự động khi nhận thư mới.
                </div>
                <button
                  type="button"
                  onClick={() => alert('Thêm quy tắc lọc mới')}
                  style={{ backgroundColor: '#0078d4', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Tạo quy tắc mới
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--surface-subtle, #f6f7f9)',
                      border: '1px solid var(--border, #e3e6ea)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{rule.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Nếu: <b>{rule.condition}</b> ➔ Thì: <b>{rule.action}</b>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => {
                          const updated = rules.map((r) => (r.id === rule.id ? { ...r, enabled: e.target.checked } : r))
                          setRules(updated)
                        }}
                      />
                      <span>Bật</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== VIEW 11: JUNK EMAIL ===================== */}
          {currentSection === 'junk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Cấp độ lọc thư rác (Spam Filtering Level)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <label style={checkboxRowStyle}>
                    <input
                      type="radio"
                      name="spamLevel"
                      checked={spamFilterLevel === 'standard'}
                      onChange={() => setSpamFilterLevel('standard')}
                    />
                    <span>Tiêu chuẩn: Tự động phát hiện và chuyển các email quảng cáo/spam rõ ràng vào Thư rác.</span>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input
                      type="radio"
                      name="spamLevel"
                      checked={spamFilterLevel === 'strict'}
                      onChange={() => setSpamFilterLevel('strict')}
                    />
                    <span>Nghiêm ngặt: Chỉ nhận thư từ những người có trong Danh bạ hoặc Danh sách An toàn.</span>
                  </label>
                </div>
              </div>

              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Danh sách Người gửi bị chặn (Blocked Senders)</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="email"
                    placeholder="Nhập email cần chặn..."
                    value={newBlockedInput}
                    onChange={(e) => setNewBlockedInput(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBlockedInput.trim()) {
                        setBlockedSenders([...blockedSenders, newBlockedInput.trim()])
                        setNewBlockedInput('')
                      }
                    }}
                    style={{ backgroundColor: '#0078d4', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Thêm
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {blockedSenders.map((email, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}>
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => setBlockedSenders(blockedSenders.filter((_, i) => i !== idx))}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 12: CALENDAR ===================== */}
          {currentSection === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Cấu hình Tuần làm việc & Giờ họp</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Ngày đầu tuần:</span>
                    <select style={selectStyle} defaultValue="monday">
                      <option value="monday">Thứ Hai (Monday)</option>
                      <option value="sunday">Chủ Nhật (Sunday)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Thời gian nhắc nhở cuộc hẹn mặc định:</span>
                    <select style={selectStyle} defaultValue="15">
                      <option value="15">Trước 15 phút</option>
                      <option value="30">Trước 30 phút</option>
                      <option value="60">Trước 1 giờ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 13: CONTACTS ===================== */}
          {currentSection === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>Tự động hoàn thành địa chỉ (Auto-Complete)</div>
                <label style={checkboxRowStyle}>
                  <input type="checkbox" defaultChecked />
                  <span>Tự động gợi ý danh bạ từ các email đã từng liên hệ trong quá khứ</span>
                </label>
              </div>
            </div>
          )}

          {/* ===================== VIEW 14: PRIVACY & AI ===================== */}
          {currentSection === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={sectionCardStyle}>
                <div style={cardTitleStyle}>VuaOffice AI & Quyền riêng tư</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={aiAutoSummarize}
                      onChange={(e) => setAiAutoSummarize(e.target.checked)}
                    />
                    <span>Bật tính năng AI Tóm tắt thư thông minh (VuaOffice AI Summary)</span>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={aiSmartReplyEnabled}
                      onChange={(e) => setAiSmartReplyEnabled(e.target.checked)}
                    />
                    <span>Bật đề xuất phản hồi thông minh (Smart Reply Chips)</span>
                  </label>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                🔒 <b>Cam kết bảo mật dữ liệu 360 CORP:</b> Mọi dữ liệu email và chỉ thị xử lý AI được lưu trữ an toàn trong SQLite cục bộ trên máy và truyền tải qua giao thức mã hóa TLS 1.3 tới hệ thống máy chủ 360 AI Gateway.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline Style Constants for macOS / Outlook Preferences
const tileStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 8px',
  backgroundColor: 'var(--surface, #ffffff)',
  border: '1px solid var(--border, #e3e6ea)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  textAlign: 'center',
}

const iconWrapperStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '8px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
}

const tileLabelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-primary, #232425)',
}

const tileSubStyle: React.CSSProperties = {
  fontSize: '10.5px',
  color: 'var(--text-muted, #878e96)',
  marginTop: '2px',
}

const sectionCardStyle: React.CSSProperties = {
  padding: '14px 16px',
  backgroundColor: 'var(--surface-subtle, #f6f7f9)',
  border: '1px solid var(--border, #e3e6ea)',
  borderRadius: '8px',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary, #232425)',
  marginBottom: '8px',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12.5px',
  cursor: 'pointer',
  color: 'var(--text-primary, #232425)',
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid var(--border, #e3e6ea)',
  fontSize: '12px',
  outline: 'none',
  backgroundColor: 'var(--surface, #ffffff)',
}

const providerCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  cursor: 'pointer',
}
