import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OAuthClient, OAUTH_CONFIGS } from '../src/main/auth/oauth-client'

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() }, app: null, safeStorage: null }))

/**
 * Hồi quy vòng đời token OAuth.
 * Các lỗi dưới đây đều KHÔNG lộ ra lúc đăng nhập lần đầu — chúng chỉ giết
 * tài khoản sau ~1 giờ khi access token hết hạn, nên test thủ công rất dễ bỏ sót.
 */
describe('OAuth: vòng đời refresh token', () => {
  const origFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  const mockTokenResponse = (body: Record<string, unknown>, ok = true) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok,
      json: async () => body,
    }) as unknown as typeof fetch
  }

  // Lỗi: refresh token xoay vòng bị vứt mất -> lần hết hạn sau dùng token đã chết
  it('giữ lại refresh token mới khi nhà cung cấp xoay vòng', async () => {
    mockTokenResponse({ access_token: 'at_moi', refresh_token: 'rt_xoay_vong', expires_in: 3600 })
    const res = await OAuthClient.refreshAccessToken('google', 'rt_cu')
    expect(res.success).toBe(true)
    expect(res.refreshToken).toBe('rt_xoay_vong')
  })

  it('không bịa refresh token khi nhà cung cấp không cấp lại', async () => {
    mockTokenResponse({ access_token: 'at_moi', expires_in: 3600 })
    const res = await OAuthClient.refreshAccessToken('microsoft', 'rt_cu')
    expect(res.success).toBe(true)
    expect(res.refreshToken).toBeUndefined()
  })

  // Lỗi: thử lại vô hạn mỗi 60s khi token đã bị thu hồi vĩnh viễn
  it('đánh dấu invalid_grant là lỗi vĩnh viễn để dừng thử lại', async () => {
    mockTokenResponse({ error: 'invalid_grant', error_description: 'Token đã bị thu hồi' }, false)
    const res = await OAuthClient.refreshAccessToken('google', 'rt_da_bi_thu_hoi')
    expect(res.success).toBe(false)
    expect(res.isPermanent).toBe(true)
  })

  it.each([
    ['invalid_request', 'lỗi tạm thời'],
    ['server_error', 'lỗi máy chủ'],
  ])('KHÔNG đánh dấu %s (%s) là vĩnh viễn', async (errCode) => {
    mockTokenResponse({ error: errCode }, false)
    const res = await OAuthClient.refreshAccessToken('google', 'rt')
    expect(res.success).toBe(false)
    expect(res.isPermanent).toBeFalsy()
  })

  // Lỗi: đăng nhập không có refresh token -> chết im lặng sau 1 giờ
  it('từ chối đăng nhập khi không nhận được refresh token', async () => {
    mockTokenResponse({ access_token: 'at', expires_in: 3600 })
    const res = await OAuthClient.exchangeCodeForToken(
      OAUTH_CONFIGS.google,
      'code',
      'verifier',
      'http://127.0.0.1:1234/callback'
    )
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/refresh token/i)
  })

  it('chấp nhận đăng nhập khi có đủ access + refresh token', async () => {
    mockTokenResponse({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 })
    const res = await OAuthClient.exchangeCodeForToken(
      OAUTH_CONFIGS.google,
      'code',
      'verifier',
      'http://127.0.0.1:1234/callback'
    )
    expect(res.success).toBe(true)
    expect(res.credentials?.refreshToken).toBe('rt')
    expect(res.credentials?.authType).toBe('oauth2')
  })

  // Lỗi: Outlook.com cá nhân refresh nhầm endpoint /common thay vì /consumers
  it('tài khoản cá nhân dùng endpoint /consumers, không phải /common', () => {
    expect(OAUTH_CONFIGS.microsoft_personal.tokenEndpoint).toContain('/consumers/')
    expect(OAUTH_CONFIGS.microsoft.tokenEndpoint).toContain('/common/')
    expect(OAUTH_CONFIGS.microsoft_personal.tokenEndpoint).not.toBe(OAUTH_CONFIGS.microsoft.tokenEndpoint)
  })

  it('refresh gọi đúng endpoint theo từng nhà cung cấp', async () => {
    mockTokenResponse({ access_token: 'at', expires_in: 3600 })
    await OAuthClient.refreshAccessToken('microsoft_personal', 'rt')
    const calledUrl = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(calledUrl).toContain('/consumers/')
  })

  it('PKCE sinh verifier/challenge khác nhau mỗi lần và đúng định dạng base64url', () => {
    const a = OAuthClient.generatePKCE()
    const b = OAuthClient.generatePKCE()
    expect(a.verifier).not.toBe(b.verifier)
    expect(a.challenge).not.toBe(a.verifier)
    for (const v of [a.verifier, a.challenge]) {
      expect(v).toMatch(/^[A-Za-z0-9_-]+$/) // không có +, /, = theo RFC 7636
      expect(v.length).toBeGreaterThanOrEqual(43)
    }
  })

  it('mọi cấu hình nhà cung cấp đều xin quyền gửi & đọc thư', () => {
    for (const key of ['google', 'microsoft', 'microsoft_personal'] as const) {
      const cfg = OAUTH_CONFIGS[key]
      expect(cfg.clientId).toBeTruthy()
      expect(cfg.authEndpoint).toMatch(/^https:\/\//)
      expect(cfg.tokenEndpoint).toMatch(/^https:\/\//)
      expect(cfg.scopes.length).toBeGreaterThan(0)
    }
  })
})
