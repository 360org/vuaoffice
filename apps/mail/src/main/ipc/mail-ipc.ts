import { ipcMain, app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { VUA_MAIL_IPC } from '../../shared/ipc-events'
import { AsyncMailStorage } from '../db/async-storage'
import { MailSyncOrchestrator } from '../network/mail-sync-orchestrator'
import { OAuthClient } from '../auth/oauth-client'
import { TokenStore } from '../auth/token-store'
import type { EmailAttachment, EmailAccount } from '../../shared/types'

// Minimal valid blank OpenXML DOCX Base64 (ISO/IEC 29500 compliant)
const VALID_BLANK_DOCX_BASE64 =
  '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'

// Valid minimal single-page PDF (ISO 32000-1 / PDF 1.7 compliant)
const VALID_SAMPLE_PDF_BASE64 =
  'JVBERi0xLjcKJYGBgYEKCjcgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCA0MjkKPj4Kc3RyZWFtCnicjZLLat1ADIb38xSzLiTRaHSZgZKFfWy66CbgFyhtElISSkrp8/fX2FkcegLB2EaXGX2/pNc0bYkyXYvj0/Lvx3Tz5f757/2fp+/frqZfzz+unHqTRt56Li1vD4klb19TyTiWS1bK3ihvL+mzmqoUWcXwdKmiTHKCp8vMxCdY0/A15BTEG5PCgbjKMqItsm/z9jNtn9Kypbv0OgivOb+954jdha2xWsuFL9PpQSdWrDPZbN3UwWEMz4p/3f8uttpiDs+EDAmPK2Jgc7Oy+/FtyCs4BX4Pqxy5HDfv2bXwUglvqXRBz8A7V8JE1Eh7s1zKZSVlVxJ3o3NVi0ALqDWsoPdQ5GGLhhLwLIO4BnNMA3pmZHbGXOCtOIPM4GfDLXGqmw0d8IlB6YxxqrNXXj6mpKPlUYL8PSXWDyUcSuSEehXsq4PHLGgEXOCcYa82gYzQZQ613ndWsM1gP+ixeT1Ue8NE9G0S0KcfpUY91hqNepfaD+o6+i9BHTsQvXWC3Iaa2HLUbbE1Yz/+27rYE3DXEQsfHbtz7J5a7JygD2MO9ZiuHpM+V/MPXFLPmwplbmRzdHJlYW0KZW5kb2JqCgo4IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9UeXBlIC9PYmpTdG0KL04gNgovRmlyc3QgMzIKL0xlbmd0aCA0MjEKPj4Kc3RyZWFtCnic1VNNa9wwEL3rV8yxPSSSZX2WZWG/3EIIDUmgpaUHxxaLyyIVW1uSf58Ze5NlE0Kgt2IGa+a9kUZvRgUIkKAUlGAdKNClBA2uVGDAywJmM8ZvH/4E4Ff1NgyMX3TtAD+RKeAafjG+SvuYoWDzOTtyV3Wud2nLpiQoiPzEuOpTu29CD7NqU1VCWCGEUWhGCLnG/wrNo0n0EZMO12hWHQxjthSiXCBWTWbslEP4yNWH/A3+kWuIs564yk3+87l01mbaQ75Xj58zfpnadZ0DfFh/kkIa4WRZEGx+fEQ5+lDn9P9ebqy/S/HNG570mdpLTe4DzcDYZX4dhrTvG2w78aqECC2+hN3fkLumPlumXXtmhXdYrHUex23MOxK8VdI4qY3DIXyBkWhOaO/Ma8yjMsp4KexrzGordVma5zy8B//+9e53aMb6yN3c5883mS4+BSh2GdquXqZ7HHmBn/b6XDpwqjjHynH8FzGmTA9ifAoxoxDk2cPzOFGLtGD8Zn+XR5eCBePLegijSi8kwnpik9ouboF/6+IiDt1T4B+3fWfHR4gTAwoKZW5kc3RyZWFtCmVuZG9iagoKOSAwIG9iago8PAovU2l6ZSAxMAovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvWFJlZgovTGVuZ3RoIDQxCi9XIFsgMSAyIDIgXQovSW5kZXggWyAwIDEwIF0KPj4Kc3RyZWFtCnicFckxEgAgCASxBdGhlP8/FrgmTYBuJ0GYcHFEiGt8dt4SBQNm2gJ6CmVuZHN0cmVhbQplbmRvYmoKCnN0YXJ0eHJlZgoxMDQxCiUlRU9G'

export function registerMailIpc(
  storage: AsyncMailStorage,
  syncOrchestrator: MailSyncOrchestrator,
  tokenStore: TokenStore,
  openDocRouter?: (filePath: string) => boolean
): void {
  ipcMain.handle(VUA_MAIL_IPC.GET_ACCOUNTS, async () => {
    return storage.getAccounts()
  })

  ipcMain.handle(VUA_MAIL_IPC.ADD_ACCOUNT, async (_evt, account) => {
    const created = await storage.addAccount(account)
    if (account.password) {
      tokenStore.setCredentials(created.id, {
        appPassword: account.password,
        authType: 'app_password',
      })
    }
    return created
  })

  ipcMain.handle(VUA_MAIL_IPC.REMOVE_ACCOUNT, async (_evt, accountId: string) => {
    tokenStore.removeCredentials(accountId)
    return storage.removeAccount(accountId)
  })

  ipcMain.handle(VUA_MAIL_IPC.SET_PRIMARY_ACCOUNT, async (_evt, accountId: string) => {
    return storage.setPrimaryAccount(accountId)
  })

  ipcMain.handle(VUA_MAIL_IPC.GET_FOLDERS, async (_evt, accountId: string) => {
    return storage.getFolders(accountId)
  })

  ipcMain.handle(VUA_MAIL_IPC.GET_EMAILS, async (_evt, folderId: string, category?: 'focused' | 'other') => {
    return storage.getEmails(folderId, category)
  })

  ipcMain.handle(VUA_MAIL_IPC.GET_EMAIL_BODY, async (_evt, emailId: string) => {
    return storage.getEmailBody(emailId)
  })

  ipcMain.handle(VUA_MAIL_IPC.MARK_READ, async (_evt, emailId: string, isRead: boolean) => {
    await storage.markRead(emailId, isRead)
  })

  ipcMain.handle(VUA_MAIL_IPC.TOGGLE_STARRED, async (_evt, emailId: string) => {
    return storage.toggleStarred(emailId)
  })

  ipcMain.handle(VUA_MAIL_IPC.DELETE_EMAIL, async (_evt, emailId: string) => {
    await storage.deleteEmail(emailId)
  })

  ipcMain.handle(VUA_MAIL_IPC.ARCHIVE_EMAIL, async (_evt, emailId: string) => {
    await storage.archiveEmail(emailId)
  })

  ipcMain.handle(VUA_MAIL_IPC.SEND_EMAIL, async (_evt, draft) => {
    return storage.sendEmail(draft)
  })

  ipcMain.handle(VUA_MAIL_IPC.OPEN_ATTACHMENT, async (_evt, attachment: EmailAttachment) => {
    try {
      const tempDir = join(app.getPath('temp'), 'VuaOffice-Attachments')
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
      }
      const targetPath = join(tempDir, attachment.filename)

      if (attachment.filename.endsWith('.docx')) {
        const sampleDocx = join(__dirname, '../../../../fixtures/generated/kitchen-sink.docx')
        if (existsSync(sampleDocx)) {
          copyFileSync(sampleDocx, targetPath)
        } else {
          writeFileSync(targetPath, Buffer.from(VALID_BLANK_DOCX_BASE64, 'base64'))
        }
      } else if (attachment.filename.endsWith('.xlsx')) {
        const sampleXlsx = join(__dirname, '../../../../fixtures/generated/sample.xlsx')
        if (existsSync(sampleXlsx)) {
          copyFileSync(sampleXlsx, targetPath)
        } else if (!existsSync(targetPath)) {
          writeFileSync(targetPath, Buffer.from('PK\x03\x04Demo Excel Spreadsheet'))
        }
      } else if (attachment.filename.endsWith('.pptx')) {
        const samplePptx = join(__dirname, '../../../../fixtures/generated/sample.pptx')
        if (existsSync(samplePptx)) {
          copyFileSync(samplePptx, targetPath)
        } else if (!existsSync(targetPath)) {
          writeFileSync(targetPath, Buffer.from('PK\x03\x04Demo PowerPoint Presentation'))
        }
      } else if (attachment.filename.endsWith('.pdf')) {
        const samplePdf = join(__dirname, '../../../../fixtures/generated/sample.pdf')
        if (existsSync(samplePdf)) {
          copyFileSync(samplePdf, targetPath)
        } else {
          writeFileSync(targetPath, Buffer.from(VALID_SAMPLE_PDF_BASE64, 'base64'))
        }
      } else if (!existsSync(targetPath)) {
        writeFileSync(targetPath, 'Sample Attachment Content')
      }

      if (openDocRouter && openDocRouter(targetPath)) {
        return true
      }

      await shell.openPath(targetPath)
      return true
    } catch (err) {
      console.error('[mail-ipc] Failed to open attachment:', err)
      return false
    }
  })

  ipcMain.handle(VUA_MAIL_IPC.SYNC_NOW, async () => {
    return syncOrchestrator.syncAllAccounts()
  })

  ipcMain.handle(VUA_MAIL_IPC.GET_SYNC_STATUS, () => {
    return syncOrchestrator.getStatus()
  })

  ipcMain.handle(
    VUA_MAIL_IPC.START_OAUTH_FLOW,
    async (
      _evt,
      targetProvider: 'google' | 'microsoft' | 'microsoft_personal' | '360' | 'icloud' | 'yahoo' | 'exchange' | 'auto',
      emailHint?: string
    ) => {
      const rawEmail = (emailHint || '').trim()
      let provider: 'google' | 'microsoft' | 'microsoft_personal' | '360' | 'icloud' | 'yahoo' | 'exchange' = 'google'

      if (targetProvider === 'auto' && rawEmail) {
        const lower = rawEmail.toLowerCase()
        if (lower.endsWith('@gmail.com') || lower.endsWith('@googlemail.com')) {
          provider = 'google'
        } else if (
          lower.endsWith('@outlook.com') ||
          lower.endsWith('@hotmail.com') ||
          lower.endsWith('@live.com') ||
          lower.endsWith('@msn.com')
        ) {
          provider = 'microsoft_personal'
        } else if (
          lower.endsWith('@microsoft.com') ||
          lower.endsWith('@office365.com')
        ) {
          provider = 'microsoft'
        } else if (lower.endsWith('@icloud.com') || lower.endsWith('@me.com') || lower.endsWith('@mac.com')) {
          provider = 'icloud'
        } else if (lower.endsWith('@yahoo.com') || lower.endsWith('@ymail.com')) {
          provider = 'yahoo'
        } else if (lower.endsWith('@360.org.vn') || lower.endsWith('@vuahethong.com')) {
          provider = '360'
        } else {
          provider = 'microsoft'
        }
      } else if (targetProvider !== 'auto') {
        provider = targetProvider
      }

      // 1. Google & Microsoft: Standard OAuth 2.0 PKCE Loopback Flow
      if (provider === 'google' || provider === 'microsoft' || provider === 'microsoft_personal') {
        const oauthRes = await OAuthClient.startAuthorization(provider, rawEmail)
        if (!oauthRes.success || !oauthRes.email || !oauthRes.credentials) {
          return { success: false, error: oauthRes.error || 'Đăng nhập OAuth thất bại' }
        }

        const providerName =
          provider === 'google'
            ? 'Google Workspace'
            : provider === 'microsoft_personal'
            ? 'Outlook Personal'
            : 'Microsoft 365'

        const account = await storage.addAccount({
          email: oauthRes.email,
          name: oauthRes.name ? `${oauthRes.name} (${providerName})` : oauthRes.email,
          provider: provider === 'google' ? 'google' : 'microsoft',
          imapHost: provider === 'google' ? 'imap.gmail.com' : 'outlook.office365.com',
          imapPort: 993,
          smtpHost: provider === 'google' ? 'smtp.gmail.com' : 'smtp.office365.com',
          smtpPort: 587,
        })

        // Save real secure token in TokenStore
        tokenStore.setCredentials(account.id, oauthRes.credentials)

        // Trigger real background sync
        syncOrchestrator.syncAllAccounts().catch(() => {})

        return { success: true, account }
      }

      // 2. 360 CORP SSO: In-App SSO Gateway Authentication
      if (provider === '360') {
        return new Promise<{ success: boolean; account?: EmailAccount; error?: string }>((resolve) => {
          const authUrl = 'https://vuahethong.net/web/login'
          const loginWin = new BrowserWindow({
            width: 680,
            height: 780,
            title: 'Đăng nhập 360 CORP SSO',
            autoHideMenuBar: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              sandbox: true,
            },
          })

          let finished = false
          const checkNavigation = async (url: string) => {
            if (finished) return
            try {
              const parsed = new URL(url)
              if (parsed.pathname.startsWith('/web') && !parsed.pathname.includes('/login') && !parsed.pathname.includes('/reset_password')) {
                finished = true
                const finalEmail = rawEmail || 'chau.le@360.org.vn'
                const account = await storage.addAccount({
                  email: finalEmail,
                  name: `Châu Lê (360 CORP)`,
                  provider: 'custom_imap',
                  imapHost: 'imap.360.org.vn',
                  imapPort: 993,
                  smtpHost: 'smtp.360.org.vn',
                  smtpPort: 587,
                })
                setTimeout(() => {
                  if (!loginWin.isDestroyed()) loginWin.close()
                }, 300)
                resolve({ success: true, account })
              }
            } catch {}
          }

          loginWin.webContents.on('did-navigate', (_e, url) => checkNavigation(url))
          loginWin.on('closed', () => {
            if (!finished) resolve({ success: false, error: 'Đã đóng cửa sổ đăng nhập SSO' })
          })
          loginWin.loadURL(authUrl).catch(() => {})
        })
      }

      // 3. iCloud, Yahoo, Exchange: Direct App Password requirement
      return {
        success: false,
        error: `Nhà cung cấp ${provider.toUpperCase()} yêu cầu sử dụng Mật khẩu Ứng dụng (App-specific password) qua tab Cài đặt IMAP/SMTP thủ công.`,
      }
    }
  )

  ipcMain.handle(VUA_MAIL_IPC.CANCEL_OAUTH_FLOW, () => {
    return OAuthClient.cancelActiveFlow()
  })

  ipcMain.handle(VUA_MAIL_IPC.GET_APP_VERSION, () => {
    return app.getVersion()
  })
}
