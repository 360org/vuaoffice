import { app } from 'electron'
import { request } from 'node:https'
import { request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import { readAppSettings, writeAppSetting } from './app-settings'
import { loadGenofficeAuth } from '@genoffice/ai-search'
import { readFileSync, writeFileSync } from 'node:fs'

const API_ROOT = 'https://vuahethong.net'

export async function handshakeOdooAiConfig(appSettingsPath: string, aiSettingsPath: string): Promise<void> {
  const auth = loadGenofficeAuth()
  if (!auth || (!auth.accessToken && !auth.apiKey)) return

  let settings = readAppSettings(appSettingsPath)
  let deviceUid = settings.deviceUid as string
  if (!deviceUid) {
    deviceUid = randomUUID()
    writeAppSetting(appSettingsPath, 'deviceUid', deviceUid)
  }

  const appName = app.getName() || 'VuaOffice'
  const appVer = app.getVersion() || '1.0.0'
  const deviceName = os.hostname() || 'Desktop'
  const osName = `${os.type()} ${os.release()}`

  return new Promise((resolve, reject) => {
    const urlStr = `${API_ROOT}/api/ai/v1/config`
    const url = new URL(urlStr)
    const reqMethod = url.protocol === 'http:' ? httpRequest : request

    const req = reqMethod(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth.accessToken || auth.apiKey}`,
        'X-Client-App': `${appName}/${appVer}`,
        'X-Device-Uid': deviceUid,
        'X-Device-Name': deviceName,
        'X-Device-OS': osName,
        ...(url.protocol === 'http:' ? { 'X-Odoo-Database': 'vuahethong_v19_prod_test' } : {})
      }
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body)
            if (data.api_format === 'openai-compatible' && data.api_key) {
              let aiRaw: Record<string, any> = {}
              try { aiRaw = JSON.parse(readFileSync(aiSettingsPath, 'utf8')) } catch {}
              if (!aiRaw.providers) aiRaw.providers = {}
              
              // Only update if something changed to avoid unnecessary disk writes
              const current = aiRaw.providers.vuaaipro || {}
              if (current.apiKey !== data.api_key || current.baseUrl !== data.base_url || current.model !== data.default_model) {
                 aiRaw.providers.vuaaipro = {
                   apiKey: data.api_key,
                   baseUrl: data.base_url,
                   model: current.model || data.default_model || ''
                 }
                 aiRaw.provider = 'vuaaipro'
                 writeFileSync(aiSettingsPath, JSON.stringify(aiRaw, null, 2))
                 console.log('[AI Handshake] Synced settings from Odoo', data.base_url)
              }
            }
            resolve()
          } catch(e) {
            reject(e)
          }
        } else {
          console.error('[AI Handshake] Failed HTTP', res.statusCode, body)
          resolve()
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}
