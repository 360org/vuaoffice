import { app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { EmailAccount, EmailBody, EmailMessage, MailFolder } from '../../shared/types'

interface OpQueueItem {
  id: string
  opType: string
  emailId: string
  payloadJson: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: number
}

interface MailStoreData {
  accounts: EmailAccount[]
  folders: MailFolder[]
  emails: EmailMessage[]
  bodies: Record<string, EmailBody>
  opQueue: OpQueueItem[]
}

// ponytail: Pure Node.js filesystem JSON store in userData eliminates native C++ addon (.node) resolution bugs during electron packaging
export class SQLiteMailStorage {
  private filePath: string
  private data: MailStoreData

  constructor(customPath?: string) {
    const dbDir = customPath ?? (app ? app.getPath('userData') : '/tmp')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    this.filePath = path.join(dbDir, 'mail-local-store.json')
    this.data = this.loadData()
    // Only seed initial default account/folders if storage is completely pristine and empty
    if (this.data.accounts.length === 0 && this.data.folders.length === 0) {
      this.seedDemoData()
    }
  }

  private loadData(): MailStoreData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8')
        const parsed = JSON.parse(raw)
        return {
          accounts: parsed.accounts || [],
          folders: parsed.folders || [],
          emails: parsed.emails || [],
          bodies: parsed.bodies || {},
          opQueue: parsed.opQueue || [],
        }
      } catch {
        // Fallback to empty on read error
      }
    }
    return {
      accounts: [],
      folders: [],
      emails: [],
      bodies: {},
      opQueue: [],
    }
  }

  private persist(): void {
    try {
      const tempPath = `${this.filePath}.tmp.${Date.now()}`
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8')
      fs.renameSync(tempPath, this.filePath)
    } catch {
      // Non-fatal write failure
    }
  }

  private seedDemoData(): void {
    const accountId = 'acc_primary'
    const accountId2 = 'acc_secondary'
    const now = Date.now()

    this.data.accounts = [
      {
        id: accountId,
        email: 'chau.le@360.org.vn',
        name: 'Châu Lê (360 CORP)',
        provider: 'google',
        isDefault: true,
      },
      {
        id: accountId2,
        email: 'ceo@vuahethong.com',
        name: 'Châu Lê (Vua Hệ Thống)',
        provider: 'microsoft',
        isDefault: false,
      },
    ]

    this.data.folders = [
      { id: 'f_inbox', accountId, name: 'Inbox', kind: 'inbox', iconName: 'Inbox', unreadCount: 2, totalCount: 12, isFavorite: true },
      { id: 'f_drafts', accountId, name: 'Drafts', kind: 'drafts', iconName: 'Drafts', unreadCount: 0, totalCount: 1, isFavorite: true },
      { id: 'f_sent', accountId, name: 'Sent Items', kind: 'sent', iconName: 'Send', unreadCount: 0, totalCount: 2, isFavorite: true },
      { id: 'f_archive', accountId, name: 'Archive', kind: 'archive', iconName: 'Archive', unreadCount: 0, totalCount: 1, isFavorite: false },
      { id: 'f_trash', accountId, name: 'Deleted Items', kind: 'trash', iconName: 'Delete', unreadCount: 0, totalCount: 1, isFavorite: false },

      { id: 'f2_inbox', accountId: accountId2, name: 'Inbox', kind: 'inbox', iconName: 'Inbox', unreadCount: 1, totalCount: 2, isFavorite: true },
      { id: 'f2_sent', accountId: accountId2, name: 'Sent Items', kind: 'sent', iconName: 'Send', unreadCount: 0, totalCount: 1, isFavorite: false },
      { id: 'f2_archive', accountId: accountId2, name: 'Archive', kind: 'archive', iconName: 'Archive', unreadCount: 0, totalCount: 1, isFavorite: false },
    ]

    const demoEmails: EmailMessage[] = [
      // Account 1 - Inbox
      {
        id: 'msg_1',
        accountId,
        folderId: 'f_inbox',
        senderName: '360 CORP Engineering',
        senderEmail: 'support@360.org.vn',
        recipientEmails: ['chau.le@360.org.vn'],
        subject: 'Chào mừng Sếp đến với VuaOffice Mail trong hệ sinh thái VuaOffice Suite',
        snippet: 'VuaOffice Mail tích hợp AI Smart Summary, Smart Reply và Offline SQLite Sync hoàn toàn mới...',
        dateIso: new Date(now - 1000 * 60 * 15).toISOString(),
        isRead: false,
        isStarred: true,
        category: 'focused',
        hasAttachments: false,
      },
      {
        id: 'msg_2',
        accountId,
        folderId: 'f_inbox',
        senderName: 'VuaOffice AI Agent',
        senderEmail: 'ai@vuahethong.com',
        recipientEmails: ['chau.le@360.org.vn'],
        subject: 'Báo cáo tổng kết tuần & Lịch họp rà soát tính năng mới',
        snippet: 'AI Agent đã chuẩn bị xong báo cáo tuần cho toàn bộ module Docs, Sheets, Slides và Mail...',
        dateIso: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        isRead: false,
        isStarred: false,
        category: 'focused',
        hasAttachments: true,
        attachments: [
          {
            id: 'att_1',
            filename: 'Bao_cao_tong_ket_VuaOffice_T8.docx',
            sizeBytes: 245760,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          {
            id: 'att_2',
            filename: 'Ke_hoach_trien_khai_VuaOffice Mail_v0.7.pdf',
            sizeBytes: 524288,
            mimeType: 'application/pdf',
          },
        ],
      },
      {
        id: 'msg_3',
        accountId,
        folderId: 'f_inbox',
        senderName: 'GitHub Notifications',
        senderEmail: 'notifications@github.com',
        recipientEmails: ['chau.le@360.org.vn'],
        subject: '[360org/vuaoffice] Release v0.6.6 published successfully',
        snippet: 'Branch main release v0.6.6 with updated updater URL is now live on releases page...',
        dateIso: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        isRead: true,
        isStarred: false,
        category: 'other',
        hasAttachments: false,
      },

      // Account 1 - Drafts
      {
        id: 'msg_draft_1',
        accountId,
        folderId: 'f_drafts',
        senderName: 'Châu Lê',
        senderEmail: 'chau.le@360.org.vn',
        recipientEmails: ['partners@microsoft.com'],
        subject: '[Bản nháp] Đề xuất hợp tác tích hợp định dạng Outlook PST vào VuaOffice',
        snippet: 'Kính gửi đại diện Microsoft, chúng tôi gửi đề xuất hợp tác...',
        dateIso: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        isRead: true,
        isStarred: false,
        category: 'focused',
        hasAttachments: false,
      },

      // Account 1 - Sent
      {
        id: 'msg_sent_1',
        accountId,
        folderId: 'f_sent',
        senderName: 'Châu Lê',
        senderEmail: 'chau.le@360.org.vn',
        recipientEmails: ['team@360.org.vn'],
        subject: 'Chỉ đạo hoàn thiện hệ thống VuaOffice Mail chuẩn Fluent UI Outlook 365',
        snippet: 'Yêu cầu toàn bộ các bộ phận kiểm tra kỹ lưỡng các module trước khi phát hành...',
        dateIso: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
        isRead: true,
        isStarred: true,
        category: 'focused',
        hasAttachments: false,
      },

      // Account 1 - Archive
      {
        id: 'msg_arch_1',
        accountId,
        folderId: 'f_archive',
        senderName: 'Hệ Thống CloudPanel',
        senderEmail: 'admin@cloudpanel.io',
        recipientEmails: ['chau.le@360.org.vn'],
        subject: 'Sao lưu định kỳ cơ sở dữ liệu hoàn tất thành công',
        snippet: 'Hệ thống đã tự động sao lưu an toàn toàn bộ dữ liệu vào lưu trữ offsite...',
        dateIso: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
        isRead: true,
        isStarred: false,
        category: 'other',
        hasAttachments: false,
      },

      // Account 1 - Trash
      {
        id: 'msg_trash_1',
        accountId,
        folderId: 'f_trash',
        senderName: 'Newsletter Marketing',
        senderEmail: 'promo@marketing-digest.net',
        recipientEmails: ['chau.le@360.org.vn'],
        subject: 'Bản tin khuyến mãi công nghệ tuần 33',
        snippet: 'Tổng hợp các ưu đãi máy chủ đám mây trong tuần...',
        dateIso: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
        isRead: true,
        isStarred: false,
        category: 'other',
        hasAttachments: false,
      },

      // Account 2 (Vua Hệ Thống) - Inbox
      {
        id: 'msg_f2_1',
        accountId: accountId2,
        folderId: 'f2_inbox',
        senderName: 'Vua Hệ Thống SaaS Server',
        senderEmail: 'saas-alert@vuahethong.com',
        recipientEmails: ['ceo@vuahethong.com'],
        subject: 'Thông báo triển khai cụm Kubernetes SaaS mới',
        snippet: 'Cụm cluster saas đã hoàn tất cấu hình và sẵn sàng tiếp nhận khách hàng mới...',
        dateIso: new Date(now - 1000 * 60 * 45).toISOString(),
        isRead: false,
        isStarred: true,
        category: 'focused',
        hasAttachments: false,
      },
    ]

    this.data.emails = demoEmails

    this.data.bodies = {
      msg_1: {
        emailId: 'msg_1',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #242424;">
            <h2 style="color: #0078d4; margin-top: 0;">Chào mừng Sếp đến với VuaOffice Mail — VuaOffice Suite</h2>
            <p>Kính gửi Sếp Châu,</p>
            <p>Ứng dụng <strong>VuaOffice Mail</strong> đã được nâng cấp toàn diện với kiến trúc hiện đại:</p>
            <ul>
              <li><strong>Local Engine</strong>: SQLite Storage siêu tốc, đồng bộ Op-Queue offline.</li>
              <li><strong>Giao diện Microsoft Outlook</strong>: Ribbon Fluent UI 3 cột chuẩn Microsoft 365.</li>
              <li><strong>Đa tài khoản & Cây thư mục</strong>: Hỗ trợ cây thư mục Accordion chuyển đổi tức thì.</li>
              <li><strong>VuaOffice AI</strong>: Hỗ trợ tóm tắt chuỗi thư và soạn thảo phản hồi tự động thông minh.</li>
              <li><strong>To-Do, Calendar & People</strong>: Đồng bộ hóa toàn bộ công việc, lịch biểu và danh bạ đối tác.</li>
            </ul>
            <p>Trân trọng,<br/><strong>360 CORP Engineering Team</strong></p>
          </div>
        `,
        plainText: 'Chào mừng Sếp đến với VuaOffice Mail trong hệ sinh thái VuaOffice Suite...',
      },
      msg_2: {
        emailId: 'msg_2',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #0078d4;">Báo cáo tuần & Tính năng mới</h3>
            <p>Chào Sếp Châu,</p>
            <p>AI Agent xin gửi Sếp báo cáo tổng kết tuần và các tài liệu đính kèm bên dưới:</p>
            <ul>
              <li><strong>Báo cáo tuần</strong>: File DOCX chi tiết tiến độ các module VuaOffice.</li>
              <li><strong>Kế hoạch triển khai VuaOffice Mail</strong>: File PDF lộ trình phát triển v0.7.0.</li>
            </ul>
            <p>Sếp có thể nhấn nút <strong>"Tóm tắt email này với VuaOffice AI"</strong> hoặc chọn phản hồi nhanh bên dưới nhé.</p>
          </div>
        `,
        plainText: 'Báo cáo tổng kết tuần & Lịch họp rà soát tính năng mới...',
      },
      msg_3: {
        emailId: 'msg_3',
        html: '<div style="font-family: sans-serif; line-height: 1.5;"><p>Release <strong>v0.6.6</strong> is live on GitHub Releases.</p><p>All binaries and auto-updater feeds are up-to-date.</p></div>',
        plainText: 'Release v0.6.6 is live on GitHub Releases.',
      },
      msg_draft_1: {
        emailId: 'msg_draft_1',
        html: '<div style="font-family: sans-serif; line-height: 1.6;"><p>Kính gửi Quý đại diện đối tác Microsoft,</p><p>Chúng tôi đề xuất phối hợp thử nghiệm khả năng tương thích chuẩn lưu trữ tệp .pst trong VuaOffice Suite...</p></div>',
        plainText: 'Kính gửi Quý đại diện đối tác Microsoft...',
      },
      msg_sent_1: {
        emailId: 'msg_sent_1',
        html: '<div style="font-family: sans-serif; line-height: 1.6;"><p>Gửi toàn bộ đội ngũ kỹ thuật 360 CORP,</p><p>Yêu cầu hoàn tất kiểm thử trải nghiệm người dùng trên tất cả các tab Mail, People, Calendar và To-Do trước khi đóng gói bản release.</p><p>Trân trọng,<br/><strong>Châu Lê</strong></p></div>',
        plainText: 'Gửi toàn bộ đội ngũ kỹ thuật 360 CORP...',
      },
      msg_arch_1: {
        emailId: 'msg_arch_1',
        html: '<div style="font-family: sans-serif;"><p>Quá trình sao lưu định kỳ lúc 02:00 sáng đã hoàn tất không có cảnh báo nào.</p></div>',
        plainText: 'Quá trình sao lưu định kỳ lúc 02:00 sáng đã hoàn tất.',
      },
      msg_trash_1: {
        emailId: 'msg_trash_1',
        html: '<div style="font-family: sans-serif;"><p>Ưu đãi máy chủ Cloud tuần này giảm giá 20%...</p></div>',
        plainText: 'Ưu đãi máy chủ Cloud...',
      },
      msg_f2_1: {
        emailId: 'msg_f2_1',
        html: '<div style="font-family: sans-serif; line-height: 1.6;"><h3 style="color: #0078d4;">Cụm Kubernetes SaaS Vua Hệ Thống</h3><p>Kính gửi CEO,</p><p>Cụm máy chủ Kubernetes cho hệ thống Vua Hệ Thống đã hoàn tất đồng bộ và tự động scale pod ổn định.</p></div>',
        plainText: 'Thông báo triển khai cụm Kubernetes SaaS mới...',
      },
    }

    this.persist()
  }

  getAccounts(): EmailAccount[] {
    return [...this.data.accounts]
  }

  addAccount(account: {
    email: string
    name: string
    provider: 'google' | 'microsoft' | 'custom_imap'
    imapHost?: string
    imapPort?: number
    smtpHost?: string
    smtpPort?: number
    password?: string
  }): EmailAccount {
    const id = `acc_${Date.now()}`
    const isFirst = this.data.accounts.length === 0
    const newAcc: EmailAccount = {
      id,
      email: account.email,
      name: account.name || account.email.split('@')[0],
      provider: account.provider || 'custom_imap',
      isDefault: isFirst,
    }

    this.data.accounts.push(newAcc)

    // Automatically create default folders for new account
    const defaultFolders: MailFolder[] = [
      { id: `f_${id}_inbox`, accountId: id, name: 'Inbox', kind: 'inbox', iconName: 'Inbox', unreadCount: 1, totalCount: 1, isFavorite: true },
      { id: `f_${id}_drafts`, accountId: id, name: 'Drafts', kind: 'drafts', iconName: 'Drafts', unreadCount: 0, totalCount: 0, isFavorite: false },
      { id: `f_${id}_sent`, accountId: id, name: 'Sent Items', kind: 'sent', iconName: 'Send', unreadCount: 0, totalCount: 0, isFavorite: false },
      { id: `f_${id}_archive`, accountId: id, name: 'Archive', kind: 'archive', iconName: 'Archive', unreadCount: 0, totalCount: 0, isFavorite: false },
      { id: `f_${id}_trash`, accountId: id, name: 'Deleted Items', kind: 'trash', iconName: 'Delete', unreadCount: 0, totalCount: 0, isFavorite: false },
    ]

    this.data.folders.push(...defaultFolders)

    // Add a welcome email for newly added account
    const welcomeMsgId = `msg_${Date.now()}`
    this.data.emails.unshift({
      id: welcomeMsgId,
      accountId: id,
      folderId: `f_${id}_inbox`,
      senderName: 'VuaOffice Mail Setup',
      senderEmail: 'mailer-daemon@360.org.vn',
      recipientEmails: [account.email],
      subject: `Kết nối tài khoản ${account.email} thành công`,
      snippet: `Tài khoản mail ${account.email} đã được cấu hình thành công với giao thức ${account.provider.toUpperCase()} trên VuaOffice Mail...`,
      dateIso: new Date().toISOString(),
      isRead: false,
      isStarred: true,
      category: 'focused',
      hasAttachments: false,
    })

    this.data.bodies[welcomeMsgId] = {
      emailId: welcomeMsgId,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
          <h3 style="color: #0078d4;">Cấu hình tài khoản ${account.email} hoàn tất</h3>
          <p>Kính gửi ${account.name || 'Người dùng'},</p>
          <p>Tài khoản email của bạn đã được kết nối thành công vào VuaOffice Mail trong hệ sinh thái VuaOffice Suite.</p>
          <ul>
            <li><strong>Email:</strong> ${account.email}</li>
            <li><strong>Nhà cung cấp:</strong> ${account.provider}</li>
            <li><strong>Đồng bộ Offline SQLite:</strong> Đã kích hoạt</li>
            <li><strong>Trình đọc tệp đính kèm:</strong> Tích hợp VuaOffice Engine</li>
          </ul>
          <p>Chúc bạn có trải nghiệm làm việc hiệu quả và bảo mật tuyệt đối.</p>
        </div>
      `,
      plainText: `Cấu hình tài khoản ${account.email} hoàn tất thành công.`,
    }

    this.persist()
    return newAcc
  }

  removeAccount(accountId: string): boolean {
    const initialLen = this.data.accounts.length
    this.data.accounts = this.data.accounts.filter((a) => a.id !== accountId)
    this.data.folders = this.data.folders.filter((f) => f.accountId !== accountId)
    this.data.emails = this.data.emails.filter((e) => e.accountId !== accountId)
    if (this.data.accounts.length > 0 && !this.data.accounts.some((a) => a.isDefault)) {
      this.data.accounts[0].isDefault = true
    }
    this.persist()
    return this.data.accounts.length < initialLen
  }

  setPrimaryAccount(accountId: string): boolean {
    let found = false
    this.data.accounts.forEach((a) => {
      if (a.id === accountId) {
        a.isDefault = true
        found = true
      } else {
        a.isDefault = false
      }
    })
    if (found) {
      this.persist()
    }
    return found
  }

  getFolders(accountId: string): MailFolder[] {
    if (accountId === 'all_accounts') {
      // Unified aggregate folders across all accounts
      const folderKinds: Array<{ kind: 'inbox' | 'drafts' | 'sent' | 'archive' | 'trash'; name: string; iconName: string }> = [
        { kind: 'inbox', name: 'Inbox', iconName: 'Inbox' },
        { kind: 'drafts', name: 'Drafts', iconName: 'Drafts' },
        { kind: 'sent', name: 'Sent Items', iconName: 'Send' },
        { kind: 'archive', name: 'Archive', iconName: 'Archive' },
        { kind: 'trash', name: 'Deleted Items', iconName: 'Delete' },
      ]

      return folderKinds.map(({ kind, name, iconName }) => {
        const matchingFolders = this.data.folders.filter((f) => f.kind === kind)
        const matchingFolderIds = new Set(matchingFolders.map((f) => f.id))
        const matchingEmails = this.data.emails.filter((e) => matchingFolderIds.has(e.folderId))
        const unreadCount = matchingEmails.filter((e) => !e.isRead).length
        const totalCount = matchingEmails.length

        return {
          id: `all_${kind}`,
          accountId: 'all_accounts',
          name,
          kind,
          iconName,
          unreadCount,
          totalCount,
          isFavorite: kind === 'inbox' || kind === 'drafts' || kind === 'sent' || kind === 'trash',
        }
      })
    }
    return this.data.folders.filter((f) => f.accountId === accountId)
  }

  getEmails(folderId: string, category?: 'focused' | 'other'): EmailMessage[] {
    if (folderId.startsWith('all_')) {
      const targetKind = folderId.replace('all_', '')
      const matchingFolderIds = new Set(
        this.data.folders.filter((f) => f.kind === targetKind).map((f) => f.id)
      )
      return this.data.emails.filter((e) => {
        if (!matchingFolderIds.has(e.folderId)) return false
        if (category && e.category !== category) return false
        return true
      })
    }
    return this.data.emails.filter((e) => {
      if (e.folderId !== folderId) return false
      if (category && e.category !== category) return false
      return true
    })
  }

  getEmailBody(emailId: string): EmailBody | null {
    return this.data.bodies[emailId] || null
  }

  markRead(emailId: string, isRead: boolean): void {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (email) {
      email.isRead = isRead
      this.persist()
    }
  }

  toggleStarred(emailId: string): boolean {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (email) {
      email.isStarred = !email.isStarred
      this.persist()
      return email.isStarred
    }
    return false
  }

  deleteEmail(emailId: string): void {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (email) {
      if (email.folderId === 'f_trash' || email.folderId === 'all_trash') {
        // permanently delete
        this.data.emails = this.data.emails.filter((e) => e.id !== emailId)
        delete this.data.bodies[emailId]
      } else {
        // remember previous location for 1-click restore
        email.previousFolderId = email.folderId
        email.folderId = 'f_trash'
      }
      this.persist()
    }
  }

  moveEmail(emailId: string, targetFolderId: string, targetAccountId?: string): boolean {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (!email) return false

    // If target folder is a virtual unified folder, map to corresponding account folder
    let resolvedFolderId = targetFolderId
    if (targetFolderId.startsWith('all_')) {
      const kind = targetFolderId.replace('all_', '')
      if (email.accountId === 'acc_secondary') {
        resolvedFolderId = kind === 'inbox' ? 'f2_inbox' : kind === 'sent' ? 'f2_sent' : kind === 'archive' ? 'f2_archive' : 'f_trash'
      } else {
        resolvedFolderId = kind === 'inbox' ? 'f_inbox' : kind === 'drafts' ? 'f_drafts' : kind === 'sent' ? 'f_sent' : kind === 'archive' ? 'f_archive' : 'f_trash'
      }
    }

    if (email.folderId !== resolvedFolderId) {
      email.previousFolderId = email.folderId
      email.folderId = resolvedFolderId
    }

    if (targetAccountId && targetAccountId !== 'all_accounts' && targetAccountId !== email.accountId) {
      email.accountId = targetAccountId
    }

    this.persist()
    return true
  }

  restoreEmail(emailId: string): { success: boolean; restoredFolderId?: string } {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (!email) return { success: false }

    // Restore to previousFolderId if known, else default to inbox of email's account
    let targetFolderId = email.previousFolderId
    if (!targetFolderId || targetFolderId === 'f_trash' || targetFolderId === 'all_trash') {
      targetFolderId = email.accountId === 'acc_secondary' ? 'f2_inbox' : 'f_inbox'
    }

    email.folderId = targetFolderId
    delete email.previousFolderId
    this.persist()
    return { success: true, restoredFolderId: targetFolderId }
  }

  archiveEmail(emailId: string): void {
    const email = this.data.emails.find((e) => e.id === emailId)
    if (email) {
      email.folderId = 'f_archive'
      this.persist()
    }
  }

  sendEmail(draft: {
    accountId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
  }): { success: boolean; emailId?: string } {
    const id = `msg_${Date.now()}`
    const nowIso = new Date().toISOString()
    const snippet = draft.bodyHtml.replace(/<[^>]*>?/gm, '').slice(0, 100)

    const targetAccount = this.data.accounts.find((a) => a.id === draft.accountId) || this.data.accounts[0]

    const newEmail: EmailMessage = {
      id,
      accountId: draft.accountId,
      folderId: draft.accountId === 'acc_secondary' ? 'f2_sent' : 'f_sent',
      senderName: targetAccount ? targetAccount.name : 'Châu Lê',
      senderEmail: targetAccount ? targetAccount.email : 'chau.le@360.org.vn',
      recipientEmails: draft.to,
      ccEmails: draft.cc,
      bccEmails: draft.bcc,
      subject: draft.subject,
      snippet,
      dateIso: nowIso,
      isRead: true,
      isStarred: false,
      category: 'focused',
      hasAttachments: false,
    }

    this.data.emails.unshift(newEmail)
    this.data.bodies[id] = {
      emailId: id,
      html: draft.bodyHtml,
      plainText: snippet,
    }

    this.enqueueOp('send_draft', id, JSON.stringify(draft))
    this.persist()

    return { success: true, emailId: id }
  }

  insertEmailDirectly(email: {
    id: string
    accountId: string
    folderId: string
    senderName: string
    senderEmail: string
    recipientEmails: string[]
    subject: string
    snippet: string
    dateIso: string
    isRead: boolean
    isStarred: boolean
    category: 'focused' | 'other'
    bodyHtml: string
    plainText: string
    hasAttachments?: boolean
    attachments?: Array<{
      id: string
      filename: string
      mimeType: string
      sizeBytes: number
      contentBase64?: string
    }>
  }): void {
    const existingIndex = this.data.emails.findIndex((e) => e.id === email.id)
    const msg: EmailMessage = {
      id: email.id,
      accountId: email.accountId,
      folderId: email.folderId,
      senderName: email.senderName,
      senderEmail: email.senderEmail,
      recipientEmails: email.recipientEmails,
      subject: email.subject,
      snippet: email.snippet,
      dateIso: email.dateIso,
      isRead: email.isRead,
      isStarred: email.isStarred,
      category: email.category,
      hasAttachments: Boolean(email.hasAttachments),
      attachments: email.attachments,
    }

    if (existingIndex >= 0) {
      this.data.emails[existingIndex] = msg
    } else {
      this.data.emails.unshift(msg)
    }

    this.data.bodies[email.id] = {
      emailId: email.id,
      html: email.bodyHtml,
      plainText: email.plainText,
    }

    this.persist()
  }

  enqueueOp(opType: string, emailId: string, payloadJson: string): void {
    const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    this.data.opQueue.push({
      id: opId,
      opType,
      emailId,
      payloadJson,
      status: 'pending',
      createdAt: Date.now(),
    })
    this.persist()
  }

  getPendingOps(): Array<{ id: string; opType: string; emailId: string; payloadJson: string }> {
    return this.data.opQueue
      .filter((op) => op.status === 'pending')
      .map((op) => ({
        id: op.id,
        opType: op.opType,
        emailId: op.emailId,
        payloadJson: op.payloadJson,
      }))
  }

  getPendingOpsCount(): number {
    return this.data.opQueue.filter((op) => op.status === 'pending').length
  }

  markOpCompleted(id: string): void {
    const op = this.data.opQueue.find((o) => o.id === id)
    if (op) {
      op.status = 'completed'
      this.persist()
    }
  }
}
