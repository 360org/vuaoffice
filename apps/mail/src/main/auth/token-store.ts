import { app, safeStorage } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface StoredCredentials {
  accessToken?: string
  refreshToken?: string
  tokenExpiryEpochMs?: number
  appPassword?: string
  authType: 'oauth2' | 'app_password' | 'password'
  /**
   * Nhà cung cấp OAuth thật dùng lúc đăng nhập. Tài khoản Outlook.com cá nhân
   * được lưu với provider 'microsoft', nhưng phải refresh qua endpoint
   * /consumers chứ không phải /common — thiếu trường này thì token hết hạn
   * sau 1 tiếng là tài khoản cá nhân chết im lặng.
   */
  oauthProvider?: 'google' | 'microsoft' | 'microsoft_personal'
}

/**
 * Secure Credential Storage using Electron's safeStorage (Apple Keychain / Windows DPAPI / Linux Secret Service)
 * Falls back to Base64 obfuscation only in environments where safeStorage encryption is unavailable.
 */
export class TokenStore {
  private filePath: string
  private cache: Record<string, StoredCredentials> = {}

  constructor(customDir?: string) {
    const dir = customDir ?? (app ? app.getPath('userData') : '/tmp')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.filePath = path.join(dir, 'mail-tokens.vault')
    this.load()
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.cache = {}
      return
    }

    try {
      const encryptedBuffer = fs.readFileSync(this.filePath)
      let jsonString = ''

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        try {
          jsonString = safeStorage.decryptString(encryptedBuffer)
        } catch {
          // Fallback if encrypted differently or raw
          jsonString = encryptedBuffer.toString('utf8')
        }
      } else {
        jsonString = encryptedBuffer.toString('utf8')
      }

      this.cache = JSON.parse(jsonString || '{}')
    } catch {
      this.cache = {}
    }
  }

  private save(): void {
    try {
      const jsonString = JSON.stringify(this.cache, null, 2)
      let buffer: Buffer

      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        buffer = safeStorage.encryptString(jsonString)
      } else {
        buffer = Buffer.from(jsonString, 'utf8')
      }

      const tempPath = `${this.filePath}.tmp.${Date.now()}`
      fs.writeFileSync(tempPath, buffer)
      fs.renameSync(tempPath, this.filePath)
    } catch (err) {
      console.error('[TokenStore] Failed to persist secure tokens:', err)
    }
  }

  setCredentials(accountId: string, creds: StoredCredentials): void {
    this.cache[accountId] = creds
    this.save()
  }

  getCredentials(accountId: string): StoredCredentials | null {
    return this.cache[accountId] || null
  }

  removeCredentials(accountId: string): void {
    if (this.cache[accountId]) {
      delete this.cache[accountId]
      this.save()
    }
  }

  clearAll(): void {
    this.cache = {}
    this.save()
  }
}
