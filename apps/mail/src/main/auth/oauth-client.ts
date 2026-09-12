import * as crypto from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { shell } from 'electron'
import type { StoredCredentials } from './token-store'

export interface OAuthProviderConfig {
  id: 'google' | 'microsoft' | 'microsoft_personal'
  displayName: string
  authEndpoint: string
  tokenEndpoint: string
  clientId: string
  clientSecret?: string
  scopes: string[]
}

// OAuth Client Configurations
// Uses standard desktop Public Client credentials with PKCE (RFC 7636)
export const OAUTH_CONFIGS: Record<'google' | 'microsoft' | 'microsoft_personal', OAuthProviderConfig> = {
  google: {
    id: 'google',
    displayName: 'Google Workspace / Gmail',
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    // Public Native Desktop Client ID for Thunderbird / standard mail clients
    clientId: '406964657835-aq8lmia8j95dhl1a2bvharmfk3t1hgqj.apps.googleusercontent.com',
    scopes: [
      'openid',
      'profile',
      'email',
      'https://mail.google.com/',
    ],
  },
  microsoft_personal: {
    id: 'microsoft_personal',
    displayName: 'Outlook.com / Hotmail / Live (Personal)',
    authEndpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    clientId: '08162f7c-0fd2-4200-a50d-d4508ec32e36',
    scopes: [
      'openid',
      'profile',
      'offline_access',
      'https://outlook.office.com/IMAP.AccessAsUser.All',
      'https://outlook.office.com/SMTP.Send',
    ],
  },
  microsoft: {
    id: 'microsoft',
    displayName: 'Microsoft 365 / Work or School Account',
    authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    // Public multi-tenant Desktop Client ID (Thunderbird / Standard Mail Client)
    clientId: '08162f7c-0fd2-4200-a50d-d4508ec32e36',
    scopes: [
      'openid',
      'profile',
      'offline_access',
      'https://outlook.office.com/IMAP.AccessAsUser.All',
      'https://outlook.office.com/SMTP.Send',
    ],
  },
}

export interface OAuthResult {
  success: boolean
  email?: string
  name?: string
  credentials?: StoredCredentials
  error?: string
}

export class OAuthClient {
  private static activeServer: Server | null = null
  private static activeCancelFn: (() => void) | null = null

  /**
   * Immediately terminates any running OAuth loopback server to release UI
   */
  static cancelActiveFlow(): boolean {
    if (this.activeCancelFn) {
      this.activeCancelFn()
      this.activeCancelFn = null
    }
    if (this.activeServer) {
      try {
        this.activeServer.close()
      } catch {}
      this.activeServer = null
      return true
    }
    return false
  }

  private static base64URLEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  private static sha256(str: string): Buffer {
    return crypto.createHash('sha256').update(str).digest()
  }

  /**
   * Generates cryptographically secure PKCE verifier and S256 challenge
   */
  static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.base64URLEncode(crypto.randomBytes(32))
    const challenge = this.base64URLEncode(this.sha256(verifier))
    return { verifier, challenge }
  }

  /**
   * Starts RFC 8252 Authorization Code Flow with PKCE via dynamic Loopback Server
   */
  static async startAuthorization(
    providerKey: 'google' | 'microsoft' | 'microsoft_personal',
    loginHint?: string
  ): Promise<OAuthResult> {
    const config = OAUTH_CONFIGS[providerKey]
    if (!config) {
      return { success: false, error: `Nhà cung cấp OAuth không được hỗ trợ: ${providerKey}` }
    }

    const { verifier, challenge } = this.generatePKCE()
    const state = this.base64URLEncode(crypto.randomBytes(16))

    return new Promise<OAuthResult>((resolve) => {
      let resolved = false
      let server: Server | null = null

      const cleanup = () => {
        if (server) {
          try {
            server.close()
          } catch {}
          server = null
        }
        if (OAuthClient.activeServer === server) {
          OAuthClient.activeServer = null
        }
        OAuthClient.activeCancelFn = null
      }

      const finish = (result: OAuthResult) => {
        if (resolved) return
        resolved = true
        cleanup()
        resolve(result)
      }

      // Allow cancelation from outside
      OAuthClient.activeCancelFn = () => {
        finish({ success: false, error: 'Người dùng đã hủy tiến trình xác thực OAuth' })
      }

      // Timeout 3 minutes
      const timeoutTimer = setTimeout(() => {
        finish({ success: false, error: 'Quá thời gian xác thực OAuth (3 phút)' })
      }, 180000)

      server = createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', 'http://127.0.0.1')
          if (reqUrl.pathname === '/callback' || reqUrl.pathname === '/') {
            const code = reqUrl.searchParams.get('code')
            const returnedState = reqUrl.searchParams.get('state')
            const errorParam = reqUrl.searchParams.get('error')
            const errorDesc = reqUrl.searchParams.get('error_description')

            if (errorParam) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(this.renderHtmlResponse(false, `Xác thực bị từ chối: ${errorDesc || errorParam}`))
              clearTimeout(timeoutTimer)
              finish({ success: false, error: errorDesc || errorParam })
              return
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(this.renderHtmlResponse(false, 'Thiếu mã xác thực (Authorization Code)'))
              clearTimeout(timeoutTimer)
              finish({ success: false, error: 'Không nhận được mã xác thực từ máy chủ' })
              return
            }

            if (returnedState && returnedState !== state) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(this.renderHtmlResponse(false, 'Mã bảo mật State không trùng khớp'))
              clearTimeout(timeoutTimer)
              finish({ success: false, error: 'State CSRF check failed' })
              return
            }

            // Perform Real Token Exchange
            const redirectUri = `http://127.0.0.1:${(server?.address() as any)?.port}/callback`
            const tokenResult = await OAuthClient.exchangeCodeForToken(
              config,
              code,
              verifier,
              redirectUri
            )

            if (!tokenResult.success || !tokenResult.credentials) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(this.renderHtmlResponse(false, tokenResult.error || 'Trao đổi token thất bại'))
              clearTimeout(timeoutTimer)
              finish(tokenResult)
              return
            }

            // Extract User Info from ID Token or UserInfo Endpoint
            const userInfo = await OAuthClient.fetchUserInfo(
              config,
              tokenResult.credentials.accessToken!
            )

            const finalEmail = userInfo.email || loginHint || 'user@example.com'
            const finalName = userInfo.name || finalEmail.split('@')[0]

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(this.renderHtmlResponse(true, `Tài khoản <strong>${finalEmail}</strong> đã được xác thực an toàn.`))

            clearTimeout(timeoutTimer)
            finish({
              success: true,
              email: finalEmail,
              name: finalName,
              credentials: tokenResult.credentials,
            })
          }
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(this.renderHtmlResponse(false, err?.message || 'Server Error'))
          clearTimeout(timeoutTimer)
          finish({ success: false, error: err?.message || 'Lỗi xử lý callback' })
        }
      })

      // Listen on random free port on 127.0.0.1
      server.listen(0, '127.0.0.1', () => {
        OAuthClient.activeServer = server
        const port = (server?.address() as any)?.port
        const redirectUri = `http://127.0.0.1:${port}/callback`

        const authParams = new URLSearchParams({
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          response_mode: 'query',
          scope: config.scopes.join(' '),
          state,
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })

        if (loginHint) {
          authParams.append('login_hint', loginHint)
        }

        if (providerKey === 'google') {
          authParams.append('access_type', 'offline')
          authParams.append('prompt', 'consent select_account')
        } else if (providerKey === 'microsoft') {
          authParams.append('prompt', 'select_account')
        }

        const fullAuthUrl = `${config.authEndpoint}?${authParams.toString()}`
        shell.openExternal(fullAuthUrl)
      })

      server.on('error', (err) => {
        clearTimeout(timeoutTimer)
        finish({ success: false, error: `Không thể mở cổng xác thực cục bộ: ${err.message}` })
      })
    })
  }

  /**
   * Exchanges Authorization Code + PKCE Verifier for Access & Refresh Tokens
   */
  static async exchangeCodeForToken(
    config: OAuthProviderConfig,
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<OAuthResult> {
    try {
      const bodyParams = new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      })

      if (config.clientSecret) {
        bodyParams.append('client_secret', config.clientSecret)
      }

      const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error_description || data.error || 'Trao đổi mã xác thực thất bại',
        }
      }

      const expiresIn = data.expires_in ? Number(data.expires_in) : 3600
      const tokenExpiryEpochMs = Date.now() + expiresIn * 1000

      return {
        success: true,
        credentials: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiryEpochMs,
          authType: 'oauth2',
        },
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Lỗi kết nối máy chủ Token: ${err?.message || err}`,
      }
    }
  }

  /**
   * Refreshes an expired access token using the stored refresh_token
   */
  static async refreshAccessToken(
    providerKey: 'google' | 'microsoft' | 'microsoft_personal',
    refreshToken: string
  ): Promise<{ success: boolean; accessToken?: string; expiresIn?: number; error?: string }> {
    const config = OAUTH_CONFIGS[providerKey]
    if (!config) {
      return { success: false, error: 'Config provider không tồn tại' }
    }

    try {
      const bodyParams = new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })

      if (config.clientSecret) {
        bodyParams.append('client_secret', config.clientSecret)
      }

      const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error_description || data.error || 'Làm mới token thất bại',
        }
      }

      return {
        success: true,
        accessToken: data.access_token,
        expiresIn: data.expires_in ? Number(data.expires_in) : 3600,
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi khi refresh token' }
    }
  }

  /**
   * Fetches user profile from Identity Provider
   */
  private static async fetchUserInfo(
    config: OAuthProviderConfig,
    accessToken: string
  ): Promise<{ email?: string; name?: string }> {
    try {
      if (config.id === 'google') {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const info = await res.json()
          return { email: info.email, name: info.name }
        }
      } else if (config.id === 'microsoft') {
        const res = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const info = await res.json()
          return { email: info.mail || info.userPrincipalName, name: info.displayName }
        }
      }
    } catch {}
    return {}
  }

  private static renderHtmlResponse(success: boolean, messageHtml: string): string {
    const primaryColor = success ? '#0077cd' : '#e11d48'
    const icon = success ? '✓' : '✕'
    const title = success ? 'Xác thực thành công!' : 'Xác thực không thành công'

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GenOffice — ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
    .card { background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 440px; border: 1px solid #e2e8f0; }
    .icon { width: 60px; height: 60px; margin: 0 auto 16px; background: ${success ? '#e5f3fc' : '#ffe4e6'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${primaryColor}; font-size: 30px; font-weight: bold; }
    h2 { margin: 0 0 10px; color: #0f172a; font-size: 20px; }
    p { margin: 0 0 20px; color: #64748b; font-size: 14px; line-height: 1.5; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h2>${title}</h2>
    <p>${messageHtml}</p>
    <div class="footer">Bạn có thể đóng tab trình duyệt này và quay lại ứng dụng <strong>GenOffice</strong>.</div>
  </div>
</body>
</html>`
  }
}
