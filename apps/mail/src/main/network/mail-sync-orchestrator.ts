import type { SQLiteMailStorage } from '../db/sqlite-storage'
import { NativeImapClient, NativePop3Client, NativeSmtpClient } from './mail-protocol-client'
import type { TokenStore } from '../auth/token-store'
import { OAuthClient } from '../auth/oauth-client'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncTimeIso: string | null
  syncedCount: number
  pendingOpsCount: number
  error: string | null
}

/**
 * Outlook-style Sync Orchestrator
 * - Manages scheduled folder sync
 * - Flushes pending OpQueue operations (marks, deletes, sends)
 * - Uses TokenStore credentials and auto-refreshes OAuth2 access tokens
 */
export class MailSyncOrchestrator {
  private isSyncing = false
  private lastSyncTime: number | null = null
  private syncTimer: NodeJS.Timeout | null = null

  constructor(
    private storage: SQLiteMailStorage,
    private tokenStore: TokenStore
  ) {}

  startSyncLoop(intervalMs = 60000): void {
    if (this.syncTimer) clearInterval(this.syncTimer)
    this.syncAllAccounts().catch(() => {})
    this.syncTimer = setInterval(() => {
      this.syncAllAccounts().catch(() => {})
    }, intervalMs)
  }

  stopSyncLoop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  async syncAllAccounts(): Promise<SyncStatus> {
    if (this.isSyncing) {
      return this.getStatus()
    }

    this.isSyncing = true
    let syncedCount = 0
    let lastError: string | null = null

    try {
      // 1. Flush offline pending operations
      await this.flushPendingOps()

      // 2. Fetch new emails for all accounts
      const accounts = this.storage.getAccounts()
      for (const acc of accounts) {
        const creds = this.tokenStore.getCredentials(acc.id)
        let activeAccessToken = creds?.accessToken

        // Auto-refresh token if expired (or within 5 mins of expiry)
        if (creds?.authType === 'oauth2' && creds.refreshToken) {
          // Dùng đúng nhà cung cấp đã đăng nhập: tài khoản Outlook.com cá nhân lưu
          // provider 'microsoft' nhưng phải refresh qua endpoint /consumers.
          const oauthProvider =
            creds.oauthProvider ?? (acc.provider === 'google' || acc.provider === 'microsoft' ? acc.provider : null)
          const now = Date.now()
          if (oauthProvider && (!creds.tokenExpiryEpochMs || creds.tokenExpiryEpochMs - now < 300000)) {
            const refreshRes = await OAuthClient.refreshAccessToken(oauthProvider, creds.refreshToken)
            if (refreshRes.success && refreshRes.accessToken) {
              activeAccessToken = refreshRes.accessToken
              this.tokenStore.setCredentials(acc.id, {
                ...creds,
                accessToken: refreshRes.accessToken,
                // Giữ token xoay vòng mới nếu nhà cung cấp cấp lại.
                refreshToken: refreshRes.refreshToken ?? creds.refreshToken,
                tokenExpiryEpochMs: Date.now() + (refreshRes.expiresIn || 3600) * 1000,
              })
            } else if (refreshRes.isPermanent) {
              // Token bị thu hồi: xoá access token chết và báo lên UI để người dùng
              // đăng nhập lại, thay vì lặng lẽ thử lại mỗi 60 giây mãi mãi.
              this.tokenStore.setCredentials(acc.id, {
                ...creds,
                accessToken: undefined,
                tokenExpiryEpochMs: 0,
              })
              lastError = `Tài khoản ${acc.email} cần đăng nhập lại (phiên đã hết hạn)`
              continue
            }
          }
        }

        const domain = acc.email.split('@')[1] || '360.org.vn'
        const imapHost =
          acc.imapHost ||
          (acc.provider === 'google'
            ? 'imap.gmail.com'
            : acc.provider === 'microsoft'
              ? 'outlook.office365.com'
              : `imap.${domain}`)

        const usePop3 = acc.incomingProtocol === 'pop3'
        const authOptions = {
          host: imapHost,
          user: acc.email,
          pass: creds?.appPassword,
          accessToken: activeAccessToken,
          authType: creds?.authType || 'password',
        }
        const client = usePop3
          ? new NativePop3Client({ ...authOptions, port: acc.imapPort || 995, tls: (acc.imapPort || 995) === 995 })
          : new NativeImapClient({ ...authOptions, port: acc.imapPort || 993, tls: true })

        try {
          const fetched = usePop3
            ? await (client as NativePop3Client).connectAndFetchRecent(10)
            : await (client as NativeImapClient).connectAndFetchRecent('INBOX', 10)
          const inboxFolderId = this.storage.resolveFolderId(acc.id, 'inbox')
          const knownUids = new Set(this.storage.getEmails(inboxFolderId).map((e) => e.id))
          for (const item of fetched) {
            // Chống trùng theo UID của máy chủ: hai thư khác nhau hoàn toàn có thể
            // trùng tiêu đề (VD "Báo cáo hàng ngày"), so theo tiêu đề sẽ nuốt mất thư.
            if (!knownUids.has(item.uid)) {
              knownUids.add(item.uid)
              this.storage.insertEmailDirectly({
                id: item.uid,
                accountId: acc.id,
                folderId: inboxFolderId,
                senderName: item.from.split('@')[0],
                senderEmail: item.from,
                recipientEmails: [item.to],
                subject: item.subject,
                snippet: item.snippet,
                dateIso: item.dateIso,
                isRead: false,
                isStarred: false,
                category: 'focused',
                bodyHtml: item.bodyHtml || `<p>${item.snippet}</p>`,
                plainText: item.plainText || item.snippet,
                hasAttachments: item.hasAttachments,
                attachments: item.attachments,
              })
              syncedCount++
            }
          }
        } catch (err: any) {
          lastError = err?.message || 'Sync failed for account ' + acc.email
        }
      }

      this.lastSyncTime = Date.now()
    } catch (err: any) {
      lastError = err?.message || 'Lỗi vòng lặp đồng bộ'
    } finally {
      this.isSyncing = false
    }

    return {
      isSyncing: false,
      lastSyncTimeIso: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      syncedCount,
      pendingOpsCount: this.storage.getPendingOpsCount(),
      error: lastError,
    }
  }

  private async flushPendingOps(): Promise<void> {
    const pendingOps = this.storage.getPendingOps()
    for (const op of pendingOps) {
      try {
        if (op.opType === 'send_draft') {
          const payload = JSON.parse(op.payloadJson)
          const creds = this.tokenStore.getCredentials(payload.accountId)
          // Không được đoán máy chủ gửi: fallback cứng sẽ đẩy thư của MỌI khách hàng
          // sang máy chủ Microsoft kèm thông tin đăng nhập. Thiếu cấu hình thì báo lỗi,
          // op nằm lại hàng đợi để người dùng khai báo rồi gửi lại.
          if (!payload.smtpHost) {
            throw new Error(`Tài khoản ${payload.from || payload.accountId} chưa cấu hình máy chủ SMTP`)
          }
          const smtpPort = payload.smtpPort || 587
          const smtpClient = new NativeSmtpClient({
            host: payload.smtpHost,
            port: smtpPort,
            tls: smtpPort === 465,
            user: payload.from,
            pass: creds?.appPassword,
            accessToken: creds?.accessToken,
            authType: creds?.authType || 'password',
          })
          await smtpClient.sendMail({
            from: payload.from,
            to: payload.to,
            subject: payload.subject,
            bodyHtml: payload.bodyHtml,
          })
        }
        this.storage.markOpCompleted(op.id)
      } catch {
        // Op stays pending for next retry cycle
      }
    }
  }

  getStatus(syncedCount = 0): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      lastSyncTimeIso: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      syncedCount,
      pendingOpsCount: this.storage.getPendingOpsCount(),
      error: null,
    }
  }
}
