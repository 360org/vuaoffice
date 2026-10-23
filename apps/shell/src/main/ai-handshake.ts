import { app, BrowserWindow } from 'electron'
import { request } from 'node:https'
import { request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import { readAppSettings, writeAppSetting } from './app-settings'
import { loadGenofficeAuth, genofficeLogout } from '@genoffice/ai-search'
import { readFileSync, writeFileSync } from 'node:fs'
import { HOME_CHANNELS, type AiHandshakeResult } from '../shared/home-api'
import {
  startEgressTunnel,
  stopEgressTunnel,
  getEgressTunnelStatus,
  startLocalAiProxy,
  stopLocalAiProxy,
} from '../../../../360/tunnel/index'

const API_ROOT = 'https://vuahethong.net'
const DEFAULT_SETUP_URL = 'https://vuahethong.net/my/ai-provider?tab=packs'


let cachedPublicIp = ''
let lastIpCheck = 0

async function resolveClientPublicIp(): Promise<string> {
  const now = Date.now()
  if (cachedPublicIp && now - lastIpCheck < 300_000) return cachedPublicIp
  for (const url of ['https://api.ipify.org', 'https://icanhazip.com', 'https://ifconfig.me/ip']) {
    try {
      const ip = await new Promise<string>((resolve) => {
        const u = new URL(url)
        const req = (u.protocol === 'https:' ? request : httpRequest)(u, { timeout: 2000, rejectUnauthorized: false }, (res) => {
          let b = ''
          res.on('data', (c) => (b += c))
          res.on('end', () => resolve(b.trim()))
        })
        req.on('error', () => resolve(''))
        req.on('timeout', () => { req.destroy(); resolve('') })
        req.end()
      })
      if (ip && !ip.includes('<') && ip.length >= 7 && ip.length <= 45) {
        cachedPublicIp = ip
        lastIpCheck = now
        return ip
      }
    } catch {}
  }
  return cachedPublicIp || ''
}

let lastHandshakeResult: AiHandshakeResult | null = null

export function getAiHandshakeStatus(): AiHandshakeResult | null {
  return lastHandshakeResult
}

export { getEgressTunnelStatus, stopEgressTunnel, stopLocalAiProxy }

export async function handshakeOdooAiConfig(
  appSettingsPath: string,
  aiSettingsPath: string,
): Promise<AiHandshakeResult> {
  const auth = loadGenofficeAuth()
  if (!auth || (!auth.accessToken && !auth.apiKey)) {
    lastHandshakeResult = {
      ok: false,
      hasPack: false,
      error: 'Chưa đăng nhập VuaHệThống',
      setupUrl: DEFAULT_SETUP_URL,
      timestamp: Date.now(),
    }
    return lastHandshakeResult
  }

  let settings = readAppSettings(appSettingsPath)
  let deviceUid = settings.deviceUid as string
  if (!deviceUid) {
    deviceUid = randomUUID()
    writeAppSetting(appSettingsPath, 'deviceUid', deviceUid)
  }

  const appName = app.getName() || 'GenOffice'
  const appVer = app.getVersion() || '1.0.0'
  const deviceName = os.hostname() || 'Desktop'
  const osName = os.type() + ' ' + os.release()
  const clientPublicIp = await resolveClientPublicIp()

  return new Promise((resolve) => {
    const urlStr = API_ROOT + '/api/ai/v1/config'
    const url = new URL(urlStr)
    const reqMethod = url.protocol === 'http:' ? httpRequest : request

    const req = reqMethod(
      url,
      {
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          Authorization: 'Bearer ' + (auth.accessToken || auth.apiKey),
          'X-Client-App': appName + '/' + appVer,
          'X-Device-Uid': deviceUid,
          ...(clientPublicIp ? { 'X-Device-IP': clientPublicIp, 'X-Client-Real-IP': clientPublicIp } : {}),
          'X-Device-Name': deviceName,
          'X-Device-OS': osName,
          ...(url.protocol === 'http:' ? { 'X-Odoo-Database': 'vuahethong_v19_prod_test' } : {}),
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', async () => {
          let data: any = {}
          try {
            data = JSON.parse(body)
          } catch {}

          // 1. Handle device_revoked (Device revoked from Odoo Portal)
          if (data.error === 'device_revoked' || (res.statusCode === 403 && data.message?.includes('thu hồi'))) {
            const revokeMsg = data.message || 'Thiết bị này đã bị thu hồi quyền truy cập từ trang quản lý vuahethong.net. Phiên đăng nhập đã kết thúc.'
            console.warn('[AI Handshake] Device is REVOKED:', revokeMsg)

            // Terminate proxy, tunnel and session locally
            stopLocalAiProxy()
            stopEgressTunnel()
            await genofficeLogout().catch(() => {})

            // Clean up local AI settings
            try {
              let aiRaw: any = {}
              try { aiRaw = JSON.parse(readFileSync(aiSettingsPath, 'utf8')) } catch {}
              if (aiRaw.providers) delete aiRaw.providers.vuaaipro
              aiRaw.provider = ''
              writeFileSync(aiSettingsPath, JSON.stringify(aiRaw, null, 2))
            } catch {}

            // Broadcast to all windows to switch to logged-out state and alert user
            for (const win of BrowserWindow.getAllWindows()) {
              if (!win.isDestroyed()) {
                win.webContents.send(HOME_CHANNELS.accountLoginEvent, {
                  phase: 'revoked',
                  message: revokeMsg,
                })
              }
            }

            lastHandshakeResult = {
              ok: false,
              hasPack: false,
              isRevoked: true,
              error: revokeMsg,
              setupUrl: DEFAULT_SETUP_URL,
              timestamp: Date.now(),
            }
            resolve(lastHandshakeResult)
            return
          }

          // 2. Successful handshake
          if (res.statusCode === 200) {
            try {
              if (data.api_format === 'openai-compatible' && data.api_key) {
                let aiRaw: any = {}
                try {
                  aiRaw = JSON.parse(readFileSync(aiSettingsPath, 'utf8'))
                } catch {}
                if (!aiRaw.providers) aiRaw.providers = {}

                const validPacks = (data.models || []).map((m: any) => m.id)
                const current = aiRaw.providers.vuaaipro || aiRaw.providers.vuaairouter || {}
                // Pack assigned trên vuahethong.net = default selected assigned dưới VuaOffice
                const assignedOnServer = data.default_model && validPacks.includes(data.default_model) ? data.default_model : ''
                const effectiveModel = assignedOnServer || (validPacks.includes(current.model) ? current.model : (validPacks[0] || ''))

                // Khởi chạy Local AI Proxy (ưu tiên cổng 3600, fallback 3601/36000 nếu bận)
                // Đảm bảo AI request phát xuất trực tiếp từ card mạng dân cư của máy khách để chống mass-ban
                let localBaseUrl = data.base_url
                try {
                  const proxyPort = await startLocalAiProxy({
                    upstreamBaseUrl: data.base_url,
                    apiKey: data.api_key,
                    preferredPort: 3600,
                  })
                  localBaseUrl = `http://127.0.0.1:${proxyPort}/v1`
                  console.log(`[AI Handshake] Local AI Egress Proxy active at ${localBaseUrl} (Port: ${proxyPort})`)
                } catch (proxyErr: any) {
                  console.warn('[AI Handshake] Local AI Proxy fallback to direct gateway:', proxyErr?.message)
                }

                aiRaw.providers.vuaaipro = {
                  apiKey: data.api_key,
                  baseUrl: localBaseUrl,
                  model: effectiveModel,
                  models: validPacks,
                }
                aiRaw.provider = 'vuaaipro'
                delete aiRaw.providers.vuaairouter
                writeFileSync(aiSettingsPath, JSON.stringify(aiRaw, null, 2))
                console.log(
                  '[AI Handshake] Synced settings from Odoo: model=' +
                  effectiveModel +
                  ' base=' +
                  data.base_url,
                )

                const hasPack = Array.isArray(data.models) && data.models.length > 0
                const packName = data.models?.[0]?.label || effectiveModel

                // Initialize VuaOffice Native Egress Tunnel under 360/tunnel
                try {
                  const tunnelUrl = data.tunnel_endpoint || data.base_url?.replace(/\/v1.*$/, '') || 'https://airouter.vuahethong.com'
                  const accountSlug = data.account_slug || (effectiveModel ? effectiveModel.split('-')[0] : 'vuaoffice-client')
                  startEgressTunnel({
                    endpointUrl: tunnelUrl,
                    accountSlug,
                    deviceUid,
                    token: data.api_key,
                  })
                  console.log('[AI Handshake] GenOffice Egress Tunnel initialized via 360/tunnel')
                } catch (tunnelErr: any) {
                  console.warn('[AI Handshake] Egress tunnel start warning:', tunnelErr?.message)
                }

                lastHandshakeResult = {
                  ok: true,
                  hasPack,
                  model: effectiveModel,
                  packName,
                  setupUrl: data.setup_url || DEFAULT_SETUP_URL,
                  timestamp: Date.now(),
                }
                resolve(lastHandshakeResult)
                return
              }
            } catch (e) {
              console.error('[AI Handshake] Write error:', e)
            }
          }

          // 3. Other errors (e.g. no_pack_assigned, account_suspended)
          const errorMsg =
            data.message || data.error || ('Lỗi kết nối AI Gateway (HTTP ' + res.statusCode + ')')
          const setupUrl = data.setup_url || DEFAULT_SETUP_URL
          lastHandshakeResult = {
            ok: false,
            hasPack: false,
            error: errorMsg,
            setupUrl,
            timestamp: Date.now(),
          }
          console.warn('[AI Handshake] Status:', res.statusCode, errorMsg)
          resolve(lastHandshakeResult)
        })
      },
    )

    req.on('error', (err) => {
      console.error('[AI Handshake] Network error:', err.message)
      lastHandshakeResult = {
        ok: false,
        hasPack: false,
        error: 'Không thể kết nối máy chủ: ' + err.message,
        setupUrl: DEFAULT_SETUP_URL,
        timestamp: Date.now(),
      }
      resolve(lastHandshakeResult)
    })
    req.end()
  })
}

/**
 * Gửi yêu cầu chuyển đổi AI Pack lên máy chủ vuahethong.net
 * Khi người dùng chọn pack mới trong VuaOffice, trên vuahethong.net sẽ tự động chuyển đổi theo.
 */
export async function selectOdooAiPack(
  model: string,
  appSettingsPath: string,
): Promise<boolean> {
  const auth = loadGenofficeAuth()
  if (!auth || (!auth.accessToken && !auth.apiKey) || !model) return false

  let settings = readAppSettings(appSettingsPath)
  let deviceUid = settings.deviceUid as string
  if (!deviceUid) return false

  return new Promise((resolve) => {
    try {
      const url = new URL(API_ROOT + '/api/ai/v1/device/select-pack')
      const reqMethod = url.protocol === 'http:' ? httpRequest : request
      const payload = JSON.stringify({ model })

      const req = reqMethod(
        url,
        {
          method: 'POST',
          rejectUnauthorized: false,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            Authorization: 'Bearer ' + (auth.accessToken || auth.apiKey),
            'X-Device-Uid': deviceUid,
            'X-Client-App': (app.getName() || 'GenOffice') + '/' + (app.getVersion() || '1.0.0'),
          },
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log('[AI Pack Sync] Đã chuyển đổi AI Pack trên vuahethong.net sang:', model)
              resolve(true)
            } else {
              console.warn('[AI Pack Sync] Lỗi chuyển đổi AI Pack:', res.statusCode, body)
              resolve(false)
            }
          })
        },
      )
      req.on('error', (err) => {
        console.error('[AI Pack Sync] Network error:', err.message)
        resolve(false)
      })
      req.write(payload)
      req.end()
    } catch (e) {
      console.error('[AI Pack Sync] Exception:', e)
      resolve(false)
    }
  })
}
