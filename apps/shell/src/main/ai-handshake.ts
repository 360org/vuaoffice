import { app, BrowserWindow } from 'electron'
import { request } from 'node:https'
import { request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import { readAppSettings, writeAppSetting } from './app-settings'
import { loadGenofficeAuth, genofficeLogout } from '@genoffice/ai-search'
import { readFileSync, writeFileSync } from 'node:fs'
import { HOME_CHANNELS, type AiHandshakeResult } from '../shared/home-api'

const API_ROOT = 'https://vuahethong.net'
const DEFAULT_SETUP_URL = 'https://vuahethong.net/my/ai-provider?tab=packs'

let lastHandshakeResult: AiHandshakeResult | null = null

export function getAiHandshakeStatus(): AiHandshakeResult | null {
  return lastHandshakeResult
}

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

  const appName = app.getName() || 'VuaOffice'
  const appVer = app.getVersion() || '1.0.0'
  const deviceName = os.hostname() || 'Desktop'
  const osName = os.type() + ' ' + os.release()

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
          'X-Device-Name': deviceName,
          'X-Device-OS': osName,
          ...(url.protocol === 'http:' ? { 'X-Odoo-Database': 'vuahethong_v19_prod_test' } : {}),
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', async () => {
          let data = {}
          try {
            data = JSON.parse(body)
          } catch {}

          // 1. Handle device_revoked (Device revoked from Odoo Portal)
          if (data.error === 'device_revoked' || (res.statusCode === 403 && data.message?.includes('thu hồi'))) {
            const revokeMsg = data.message || 'Thiết bị này đã bị thu hồi quyền truy cập từ trang quản lý vuahethong.net. Phiên đăng nhập đã kết thúc.'
            console.warn('[AI Handshake] Device is REVOKED:', revokeMsg)

            // Terminate session locally
            await genofficeLogout().catch(() => {})

            // Clean up local AI settings
            try {
              let aiRaw = {}
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
                let aiRaw = {}
                try {
                  aiRaw = JSON.parse(readFileSync(aiSettingsPath, 'utf8'))
                } catch {}
                if (!aiRaw.providers) aiRaw.providers = {}

                const validPacks = (data.models || []).map((m) => m.id)
                const current = aiRaw.providers.vuaaipro || aiRaw.providers.vuaairouter || {}
                const effectiveModel = validPacks.includes(current.model)
                  ? current.model
                  : data.default_model || current.model || ''

                aiRaw.providers.vuaaipro = {
                  apiKey: data.api_key,
                  baseUrl: data.base_url,
                  model: effectiveModel,
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
