import React, { useState, useEffect } from 'react'
import type { EmailAccount } from '../../../../shared/types'
import {
  IconUsers,
  IconSettings,
  IconEdit,
  IconKeyboard,
  IconLock,
  IconMicrosoft,
  IconGoogle,
  IconGlobe,
  IconApple,
  IconYahoo,
  IconServer,
  IconBox,
  IconTemplate,
  IconBell,
  IconMail,
  IconSparkles,
  IconPlus,
} from '../common/MailIcons'
import {
  getStoredSignatures,
  saveStoredSignatures,
  getStoredTemplates,
  saveStoredTemplates,
  type EmailSignature,
  type EmailTemplate,
} from '../../services/template-store'

interface ProfileViewProps {
  accounts: EmailAccount[]
  activeAccountId: string
  onAccountsUpdated: () => void
  onSelectAccount: (accountId: string) => void
  onOpenImportExport?: () => void
  onClose?: () => void
}

type ProfileTab = 'accounts' | 'general' | 'signatures' | 'templates' | 'shortcuts'
type AddAccountStep = 'input_email' | 'choose_provider' | 'manual_imap'

export const ProfileView: React.FC<ProfileViewProps> = ({
  accounts,
  activeAccountId,
  onAccountsUpdated,
  onSelectAccount,
  onOpenImportExport,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('accounts')
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [addStep, setAddStep] = useState<AddAccountStep>('input_email')

  // Manual account form state
  const [provider, setProvider] = useState<'google' | 'microsoft' | 'custom_imap'>('custom_imap')
  const [accName, setAccName] = useState('')
  const [accEmail, setAccEmail] = useState('')
  const [accPassword, setAccPassword] = useState('')
  const [imapHost, setImapHost] = useState('imap.360.org.vn')
  const [imapPort, setImapPort] = useState(993)
  const [smtpHost, setSmtpHost] = useState('smtp.360.org.vn')
  const [smtpPort, setSmtpPort] = useState(587)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null)

  // General settings state
  const [focusedInboxEnabled, setFocusedInboxEnabled] = useState(true)
  const [notificationSound, setNotificationSound] = useState(true)
  const [autoSummary, setAutoSummary] = useState(true)
  const [smartReplyEnabled, setSmartReplyEnabled] = useState(true)
  const [undoSendSeconds, setUndoSendSeconds] = useState(10)

  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editingSigId, setEditingSigId] = useState<string | null>(null)
  const [sigNameInput, setSigNameInput] = useState('')
  const [sigHtmlInput, setSigHtmlInput] = useState('')
  const [editingTplId, setEditingTplId] = useState<string | null>(null)
  const [tplTitleInput, setTplTitleInput] = useState('')
  const [tplSubjectInput, setTplSubjectInput] = useState('')
  const [tplCategoryInput, setTplCategoryInput] = useState('')
  const [tplBodyInput, setTplBodyInput] = useState('')
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    setSignatures(getStoredSignatures())
    setTemplates(getStoredTemplates())
    if (window.vuaMail?.getAppVersion) {
      window.vuaMail.getAppVersion().then((ver) => {
        if (ver) setAppVersion(ver)
      }).catch(() => {})
    }
  }, [])

  // Trigger OAuth 2.0 / SSO Login Flow
  const handleStartOAuthLogin = async (
    selectedService: 'google' | 'microsoft' | 'microsoft_personal' | '360' | 'icloud' | 'yahoo' | 'exchange' | 'auto',
    emailHintInput?: string
  ) => {
    setIsAuthenticating(true)
    const emailToUse = emailHintInput || accEmail
    setAuthStatusMessage(`Đang mở kết nối xác thực an toàn với ${selectedService.toUpperCase()}...`)

    try {
      if (window.vuaMail) {
        const result = await window.vuaMail.startOAuthFlow(selectedService, emailToUse)
        if (result && result.success) {
          setAuthStatusMessage('Đăng nhập và cấp quyền thành công!')
          onAccountsUpdated()
          if (result.account) {
            onSelectAccount(result.account.id)
          }
          setTimeout(() => {
            setIsAddingAccount(false)
            setAddStep('input_email')
            setIsAuthenticating(false)
            setAuthStatusMessage(null)
          }, 600)
        } else {
          setAuthStatusMessage(result?.error || 'Xác thực không thành công')
          setIsAuthenticating(false)
        }
      }
    } catch (err: any) {
      setAuthStatusMessage(`Lỗi xác thực: ${err.message || 'Không thể hoàn tất đăng nhập'}`)
      setIsAuthenticating(false)
    }
  }

  const handleCancelOAuth = async () => {
    if (window.vuaMail) {
      await window.vuaMail.cancelOAuthFlow()
    }
    setIsAuthenticating(false)
    setAuthStatusMessage(null)
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

  const handleCreateAccountManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accEmail.trim() || !window.vuaMail) return
    setIsAuthenticating(true)
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
      setIsAuthenticating(false)
    }
  }

  const handleRemoveAccount = async (id: string) => {
    if (!window.vuaMail) return
    if (confirm('Sếp có chắc chắn muốn đăng xuất và ngắt kết nối tài khoản này?')) {
      await window.vuaMail.removeAccount(id)
      onAccountsUpdated()
    }
  }

  const handleSetPrimary = async (id: string) => {
    if (!window.vuaMail) return
    await window.vuaMail.setPrimaryAccount(id)
    onAccountsUpdated()
  }

  const navItems = [
    {
      id: 'accounts',
      title: 'Tài khoản & Hộp thư',
      subtitle: 'OAuth, IMAP & Sync',
      icon: <IconUsers size={16} />,
      badge: accounts.length,
    },
    {
      id: 'general',
      title: 'Cấu hình chung',
      subtitle: 'Thông báo, Hộp thư & AI',
      icon: <IconSettings size={16} />,
    },
    {
      id: 'signatures',
      title: 'Chữ ký email',
      subtitle: 'Quản lý chữ ký công việc',
      icon: <IconEdit size={16} />,
      badge: signatures.length,
    },
    {
      id: 'templates',
      title: 'Mẫu email (Templates)',
      subtitle: 'Thư mẫu & Trả lời nhanh',
      icon: <IconTemplate size={16} />,
      badge: templates.length,
    },
    {
      id: 'shortcuts',
      title: 'Phím tắt',
      subtitle: 'Thao tác nhanh bàn phím',
      icon: <IconKeyboard size={16} />,
    },
  ]

  return (
    <div className="settings-window">
      {/* LEFT NAVIGATION SIDEBAR */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <div className="settings-sidebar-title">
            <IconSettings size={18} color="var(--mail-primary-blue, #0077cd)" />
            <span>Cài đặt & Hồ sơ</span>
          </div>
          <div className="settings-sidebar-subtitle">
            Hệ thống quản trị thư điện tử VuaOffice
          </div>
        </div>

        <div className="settings-nav-group">
          <div className="settings-nav-group-title">Tuỳ chọn hệ thống</div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`settings-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id as ProfileTab)
                  setIsAddingAccount(false)
                  setEditingSigId(null)
                  setEditingTplId(null)
                }}
              >
                <div className="settings-nav-item-left">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="settings-sidebar-footer">
          <span>VuaOffice Mail v{appVersion || '1.0.10'}</span>
          <span style={{ color: 'var(--mail-brand-green)', fontWeight: 600 }}>● Trực tuyến</span>
        </div>
      </div>

      {/* RIGHT MAIN CONTENT PANE */}
      <div className="settings-main">
        {/* Header Bar */}
        <div className="settings-main-header">
          <div className="settings-main-title-box">
            <h2>
              {activeTab === 'accounts' && 'Tài khoản & Xác thực an toàn'}
              {activeTab === 'general' && 'Tuỳ chọn & Cấu hình ứng dụng'}
              {activeTab === 'signatures' && 'Chữ ký thư điện tử (Email Signatures)'}
              {activeTab === 'templates' && 'Mẫu thư chuẩn (Templates & Quick Parts)'}
              {activeTab === 'shortcuts' && 'Phím tắt thao tác nhanh'}
            </h2>
            <p>
              {activeTab === 'accounts' && 'Quản lý tài khoản hộp thư Microsoft 365, Google Workspace, Exchange và IMAP/SMTP'}
              {activeTab === 'general' && 'Tuỳ biến trải nghiệm đọc, nhận thông báo, sao lưu dữ liệu và trợ lý AI'}
              {activeTab === 'signatures' && 'Tạo và chỉ định chữ ký chuẩn hóa tự động chèn vào thư gửi đi'}
              {activeTab === 'templates' && 'Danh mục mẫu email chuyên nghiệp cho công việc và kinh doanh'}
              {activeTab === 'shortcuts' && 'Bảng tổ hợp phím tắt chuẩn Outlook 365 tăng năng suất làm việc'}
            </p>
          </div>
          {onClose && (
            <button type="button" className="settings-close-btn" onClick={onClose}>
              Đóng (Esc)
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="settings-body-scroll">
          {/* ========================================================================= */}
          {/* TAB 1: ACCOUNTS */}
          {/* ========================================================================= */}
          {activeTab === 'accounts' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Danh sách hộp thư đang liên kết ({accounts.length})
                </div>
                {!isAddingAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAccount(true)
                      setAddStep('input_email')
                    }}
                    style={{
                      backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '7px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconPlus size={14} />
                    <span>Thêm tài khoản mới</span>
                  </button>
                )}
              </div>

              {/* Add Account Modal / Panel */}
              {isAddingAccount && (
                <div className="settings-card" style={{ borderColor: 'var(--mail-primary-blue)' }}>
                  <div className="settings-card-header">
                    <div className="settings-card-title">
                      <IconLock size={16} color="var(--mail-primary-blue)" />
                      <span>Thêm tài khoản & Kết nối bảo mật (Outlook Account Setup)</span>
                    </div>
                    {addStep !== 'input_email' && (
                      <button
                        type="button"
                        onClick={() => setAddStep('input_email')}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        ← Quay lại
                      </button>
                    )}
                  </div>

                  {/* STEP 1: EMAIL AUTO-DETECT */}
                  {addStep === 'input_email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="email"
                          placeholder="Nhập địa chỉ email: chau.le@360.org.vn, name@outlook.com, user@gmail.com..."
                          value={accEmail}
                          onChange={(e) => setAccEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && accEmail.trim()) handleEmailContinue()
                          }}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          disabled={!accEmail.trim() || isAuthenticating}
                          onClick={handleEmailContinue}
                          style={{
                            backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '9px 18px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: accEmail.trim() ? 'pointer' : 'not-allowed',
                            opacity: accEmail.trim() && !isAuthenticating ? 1 : 0.6,
                          }}
                        >
                          {isAuthenticating ? 'Đang kết nối...' : 'Tiếp tục →'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Hệ thống tự động phát hiện Microsoft 365, Google Workspace, Exchange hoặc 360 CORP SSO.
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddStep('choose_provider')}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--mail-primary-blue)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Chọn dịch vụ thủ công (Advanced)
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>HOẶC ĐĂNG NHẬP NHANH 1-CLICK</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('microsoft')}>
                          <IconMicrosoft size={26} />
                          <div>
                            <div className="provider-tile-name">Microsoft 365</div>
                            <div className="provider-tile-desc">Outlook / Hotmail / Azure</div>
                          </div>
                        </div>

                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('google')}>
                          <IconGoogle size={26} />
                          <div>
                            <div className="provider-tile-name">Google Workspace</div>
                            <div className="provider-tile-desc">Gmail / G-Suite</div>
                          </div>
                        </div>

                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('360')}>
                          <IconGlobe size={26} color="var(--mail-primary-blue)" />
                          <div>
                            <div className="provider-tile-name">360 CORP SSO</div>
                            <div className="provider-tile-desc">Cloud ERP / 360.org.vn</div>
                          </div>
                        </div>
                      </div>

                      {authStatusMessage && (
                        <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--mail-primary-blue-soft)', color: 'var(--mail-primary-blue)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>⏳ {authStatusMessage}</span>
                          {isAuthenticating && (
                            <button
                              type="button"
                              onClick={handleCancelOAuth}
                              style={{ background: '#fff', border: '1px solid var(--mail-primary-blue)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: PROVIDER GRID */}
                  {addStep === 'choose_provider' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Chọn loại nhà cung cấp dịch vụ thư điện tử:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('microsoft', accEmail)}>
                          <IconMicrosoft size={24} />
                          <div className="provider-tile-name">Microsoft 365</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('microsoft_personal', accEmail)}>
                          <IconMicrosoft size={24} />
                          <div className="provider-tile-name">Outlook.com</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('google', accEmail)}>
                          <IconGoogle size={24} />
                          <div className="provider-tile-name">Google Workspace</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('exchange', accEmail)}>
                          <IconServer size={24} color="var(--mail-primary-blue)" />
                          <div className="provider-tile-name">Exchange Server</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('icloud', accEmail)}>
                          <IconApple size={24} />
                          <div className="provider-tile-name">iCloud Mail</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('yahoo', accEmail)}>
                          <IconYahoo size={24} />
                          <div className="provider-tile-name">Yahoo Mail</div>
                        </div>
                        <div className="provider-tile" onClick={() => handleStartOAuthLogin('360', accEmail)}>
                          <IconGlobe size={24} color="var(--mail-primary-blue)" />
                          <div className="provider-tile-name">360 CORP SSO</div>
                        </div>
                        <div className="provider-tile" onClick={() => setAddStep('manual_imap')}>
                          <IconServer size={24} color="var(--mail-brand-green)" />
                          <div className="provider-tile-name">IMAP / SMTP</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: MANUAL IMAP */}
                  {addStep === 'manual_imap' && (
                    <form onSubmit={handleCreateAccountManual} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Địa chỉ Email:</label>
                          <input type="email" required placeholder="admin@360.org.vn" value={accEmail} onChange={(e) => setAccEmail(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Tên hiển thị:</label>
                          <input type="text" required placeholder="Châu Lê" value={accName} onChange={(e) => setAccName(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Mật khẩu ứng dụng (App Password):</label>
                          <input type="password" required placeholder="••••••••••••" value={accPassword} onChange={(e) => setAccPassword(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Giao thức kết nối:</label>
                          <select value={provider} onChange={(e: any) => setProvider(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}>
                            <option value="custom_imap">Custom IMAP / SMTP (SSL/TLS)</option>
                            <option value="microsoft">Microsoft Exchange</option>
                            <option value="google">Google Workspace</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>IMAP Host:</label>
                          <input type="text" value={imapHost} onChange={(e) => setImapHost(e.target.value)} style={{ width: '100%', padding: '5px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Port:</label>
                          <input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} style={{ width: '100%', padding: '5px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SMTP Host:</label>
                          <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} style={{ width: '100%', padding: '5px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Port:</label>
                          <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} style={{ width: '100%', padding: '5px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button type="button" onClick={() => setAddStep('choose_provider')} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: 'var(--surface)' }}>Quay lại</button>
                        <button type="submit" disabled={isAuthenticating} style={{ backgroundColor: 'var(--mail-primary-blue)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{isAuthenticating ? 'Đang lưu...' : 'Lưu tài khoản'}</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Accounts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {accounts.map((acc, idx) => {
                  const isPrimary = Boolean(acc.isDefault)
                  const isCurrentViewing = acc.id === activeAccountId
                  const initial = (acc.name || acc.email).charAt(0).toUpperCase()
                  const colors = ['#0077cd', '#004c87', '#107c41', '#8b5cf6', '#d97706']
                  const avatarBg = colors[idx % colors.length]

                  return (
                    <div
                      key={acc.id}
                      className={`settings-account-row ${isCurrentViewing ? 'active-account' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="account-avatar-badge" style={{ backgroundColor: avatarBg }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {acc.name}
                            </span>
                            {isPrimary && (
                              <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--mail-primary-blue-soft)', color: 'var(--mail-primary-blue)' }}>
                                Hộp thư chính (Default)
                              </span>
                            )}
                            {isCurrentViewing && !isPrimary && (
                              <span style={{ fontSize: '10.5px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                                Đang xem
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {acc.email} • {acc.provider.toUpperCase()} • Đang đồng bộ tự động (Push/IMAP)
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(acc.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--surface)',
                              fontSize: '11.5px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            Đặt làm mặc định
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(acc.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            color: '#ef4444',
                            fontSize: '11.5px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GENERAL SETTINGS */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <>
              {/* Focused Inbox */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">
                    <IconMail size={16} color="var(--mail-primary-blue)" />
                    <span>Hộp thư Đến có tiêu điểm (Focused & Other Inbox)</span>
                  </div>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={focusedInboxEnabled}
                      onChange={(e) => setFocusedInboxEnabled(e.target.checked)}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Tự động phân tách hộp thư đến thành tab <strong>Ưu tiên (Focused)</strong> và tab <strong>Khác (Other)</strong> để tập trung xử lý các email quan trọng từ đối tác và công việc.
                </div>
              </div>

              {/* AI & Automation */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">
                    <IconSparkles size={16} color="var(--mail-primary-blue)" />
                    <span>Trợ lý thông minh VuaOffice AI</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tự động tóm tắt nội dung email (AI Executive Summary)
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Sinh bản tóm tắt 3 ý chính khi mở email dài hoặc email trao đổi công việc.
                      </div>
                    </div>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={autoSummary}
                        onChange={(e) => setAutoSummary(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Gợi ý câu trả lời thông minh (Smart Reply Chips)
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Hiển thị các nút trả lời nhanh theo ngữ cảnh ở cuối mỗi bức thư.
                      </div>
                    </div>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={smartReplyEnabled}
                        onChange={(e) => setSmartReplyEnabled(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Notifications & Undo Send */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">
                    <IconBell size={16} color="var(--mail-primary-blue)" />
                    <span>Thông báo & Hoàn tác gửi thư</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      Phát âm thanh thông báo khi có email mới
                    </span>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={notificationSound}
                        onChange={(e) => setNotificationSound(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        Thời gian hoàn tác gửi (Undo Send)
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Cho phép hủy lệnh gửi thư trong khoảng thời gian nhất định.
                      </div>
                    </div>
                    <select
                      value={undoSendSeconds}
                      onChange={(e) => setUndoSendSeconds(Number(e.target.value))}
                      style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}
                    >
                      <option value={5}>5 giây</option>
                      <option value={10}>10 giây (Mặc định)</option>
                      <option value={20}>20 giây</option>
                      <option value={30}>30 giây</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Import / Export PST */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">
                    <IconBox size={16} color="var(--mail-primary-blue)" />
                    <span>Sao lưu & Nhập / Xuất dữ liệu hộp thư</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      Nhập/Xuất tệp Outlook PST và EML Archive
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Xuất dữ liệu lưu trữ ra file .pst hoặc nhập email từ Outlook / Thunderbird.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenImportExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <IconBox size={14} color="var(--mail-primary-blue)" />
                    <span>Mở Wizard Import/Export</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SIGNATURES */}
          {/* ========================================================================= */}
          {activeTab === 'signatures' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Danh sách chữ ký công việc ({signatures.length})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSigId('new')
                    setSigNameInput('')
                    setSigHtmlInput('<p>--<br/><strong>Họ và tên</strong><br/>Chức vụ | 360 CORP<br/>Email: user@company.com</p>')
                  }}
                  style={{
                    backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IconPlus size={14} />
                  <span>Thêm chữ ký mới</span>
                </button>
              </div>

              {/* Editor */}
              {editingSigId && (
                <div className="settings-card" style={{ borderColor: 'var(--mail-primary-blue)' }}>
                  <div className="settings-card-header">
                    <div className="settings-card-title">
                      <IconEdit size={16} color="var(--mail-primary-blue)" />
                      <span>{editingSigId === 'new' ? 'Tạo chữ ký mới' : 'Chỉnh sửa chữ ký'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tên chữ ký:</label>
                    <input
                      type="text"
                      placeholder="VD: Chữ ký công việc chính"
                      value={sigNameInput}
                      onChange={(e) => setSigNameInput(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nội dung HTML:</label>
                    <textarea
                      rows={5}
                      value={sigHtmlInput}
                      onChange={(e) => setSigHtmlInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingSigId(null)}
                      style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!sigNameInput.trim()) return
                        const updated: EmailSignature[] =
                          editingSigId === 'new'
                            ? [
                                ...signatures,
                                {
                                  id: `sig-${Date.now()}`,
                                  name: sigNameInput.trim(),
                                  contentHtml: sigHtmlInput,
                                  isDefault: signatures.length === 0,
                                },
                              ]
                            : signatures.map((s) =>
                                s.id === editingSigId
                                  ? { ...s, name: sigNameInput.trim(), contentHtml: sigHtmlInput }
                                  : s
                              )
                        setSignatures(updated)
                        saveStoredSignatures(updated)
                        setEditingSigId(null)
                      }}
                      style={{ padding: '5px 16px', borderRadius: '4px', border: 'none', background: 'var(--mail-primary-blue)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Lưu chữ ký
                    </button>
                  </div>
                </div>
              )}

              {/* Signatures List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {signatures.map((sig) => (
                  <div key={sig.id} className="settings-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{sig.name}</span>
                        {sig.isDefault && (
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '3px', background: 'var(--mail-primary-blue-soft)', color: 'var(--mail-primary-blue)', fontWeight: 600 }}>
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!sig.isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = signatures.map((s) => ({ ...s, isDefault: s.id === sig.id }))
                              setSignatures(updated)
                              saveStoredSignatures(updated)
                            }}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Đặt mặc định
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSigId(sig.id)
                            setSigNameInput(sig.name)
                            setSigHtmlInput(sig.contentHtml)
                          }}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = signatures.filter((s) => s.id !== sig.id)
                            setSignatures(updated)
                            saveStoredSignatures(updated)
                          }}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                        fontSize: '12px',
                      }}
                      dangerouslySetInnerHTML={{ __html: sig.contentHtml }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TEMPLATES */}
          {/* ========================================================================= */}
          {activeTab === 'templates' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Mẫu email chuẩn hóa ({templates.length})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTplId('new')
                    setTplTitleInput('')
                    setTplSubjectInput('')
                    setTplCategoryInput('Công việc')
                    setTplBodyInput('<p>Kính gửi Anh/Chị,</p><p>Nội dung mẫu thư...</p>')
                  }}
                  style={{
                    backgroundColor: 'var(--mail-primary-blue, #0077cd)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IconPlus size={14} />
                  <span>Thêm mẫu mới</span>
                </button>
              </div>

              {/* Template Editor */}
              {editingTplId && (
                <div className="settings-card" style={{ borderColor: 'var(--mail-primary-blue)' }}>
                  <div className="settings-card-header">
                    <div className="settings-card-title">
                      <IconTemplate size={16} color="var(--mail-primary-blue)" />
                      <span>{editingTplId === 'new' ? 'Tạo mẫu thư mới' : 'Chỉnh sửa mẫu thư'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tên mẫu:</label>
                      <input
                        type="text"
                        placeholder="VD: Thư chào hàng / Báo giá"
                        value={tplTitleInput}
                        onChange={(e) => setTplTitleInput(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Danh mục:</label>
                      <input
                        type="text"
                        placeholder="VD: Kinh doanh / Nhân sự"
                        value={tplCategoryInput}
                        onChange={(e) => setTplCategoryInput(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiêu đề mặc định (Subject):</label>
                    <input
                      type="text"
                      placeholder="VD: [Báo giá] Đề xuất cung cấp giải pháp phần mềm..."
                      value={tplSubjectInput}
                      onChange={(e) => setTplSubjectInput(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nội dung mẫu thư (HTML):</label>
                    <textarea
                      rows={5}
                      value={tplBodyInput}
                      onChange={(e) => setTplBodyInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingTplId(null)}
                      style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tplTitleInput.trim()) return
                        const updated: EmailTemplate[] =
                          editingTplId === 'new'
                            ? [
                                ...templates,
                                {
                                  id: `tpl-${Date.now()}`,
                                  title: tplTitleInput.trim(),
                                  subject: tplSubjectInput.trim(),
                                  category: tplCategoryInput.trim() || 'Công việc',
                                  bodyHtml: tplBodyInput,
                                },
                              ]
                            : templates.map((t) =>
                                t.id === editingTplId
                                  ? {
                                      ...t,
                                      title: tplTitleInput.trim(),
                                      subject: tplSubjectInput.trim(),
                                      category: tplCategoryInput.trim() || 'Công việc',
                                      bodyHtml: tplBodyInput,
                                    }
                                  : t
                              )
                        setTemplates(updated)
                        saveStoredTemplates(updated)
                        setEditingTplId(null)
                      }}
                      style={{ padding: '5px 16px', borderRadius: '4px', border: 'none', background: 'var(--mail-primary-blue)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Lưu mẫu thư
                    </button>
                  </div>
                </div>
              )}

              {/* Grid Templates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {templates.map((tpl) => (
                  <div key={tpl.id} className="settings-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{tpl.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {tpl.category ? `[${tpl.category}] ` : ''}{tpl.subject}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTplId(tpl.id)
                            setTplTitleInput(tpl.title)
                            setTplSubjectInput(tpl.subject)
                            setTplCategoryInput(tpl.category || '')
                            setTplBodyInput(tpl.bodyHtml)
                          }}
                          style={{ padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '10.5px', cursor: 'pointer' }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = templates.filter((t) => t.id !== tpl.id)
                            setTemplates(updated)
                            saveStoredTemplates(updated)
                          }}
                          style={{ padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--surface)', color: '#ef4444', fontSize: '10.5px', cursor: 'pointer' }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        maxHeight: '75px',
                        overflow: 'hidden',
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                        fontSize: '11px',
                        lineHeight: '1.4',
                      }}
                      dangerouslySetInnerHTML={{ __html: tpl.bodyHtml }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: KEYBOARD SHORTCUTS */}
          {/* ========================================================================= */}
          {activeTab === 'shortcuts' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <IconKeyboard size={16} color="var(--mail-primary-blue)" />
                  <span>Danh sách phím tắt thông dụng (Outlook 365 Keyboard Shortcuts)</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Soạn thư mới (New Mail)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>⌘ N / Ctrl+N</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Gửi thư (Send Mail)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>⌘ Enter / Ctrl+Enter</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Trả lời (Reply)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>⌘ R / Ctrl+R</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Chuyển tiếp (Forward)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>⌘ F / Ctrl+F</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Xóa thư (Delete)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>Delete / Backspace</kbd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Đồng bộ thư (Send/Receive)</span>
                  <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '11px', fontWeight: 600 }}>F9 / ⌘ Shift R</kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
