import { app, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import type {
  DiagnosticEndpointStatus,
  DiagnosticExportResult,
  DiagnosticReportData,
  DiagnosticSubmitResult,
  DiagnosticSystemInfo,
} from '../shared/home-api'
import { readAppSettings } from './app-settings'

/**
 * In-memory circular log buffer capturing recent warnings, errors, and system events.
 */
const MAX_BUFFERED_LOGS = 150
const recentLogsBuffer: string[] = []

export function appendDiagnosticLog(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const timestamp = new Date().toISOString()
  const formatted = `[${timestamp}] [${level}] ${message}`
  recentLogsBuffer.push(formatted)
  if (recentLogsBuffer.length > MAX_BUFFERED_LOGS) {
    recentLogsBuffer.shift()
  }
}

/**
 * Scrubber to remove sensitive user information, tokens, and home directory paths.
 */
export function scrubSensitiveText(text: string): string {
  if (!text) return ''
  let scrubbed = text

  // 1. Scrub user home directory
  try {
    const homeDir = os.homedir()
    if (homeDir && homeDir.length > 3) {
      scrubbed = scrubbed.split(homeDir).join('~')
    }
  } catch {
    // Ignore home dir resolution errors
  }

  // 2. Scrub Bearer tokens and standard API keys
  scrubbed = scrubbed.replace(/(?:bearer\s+|key=|\bapi[_-]?key[:=]\s*["']?)([\w-]{12,})/gi, '$1=<redacted>')
  scrubbed = scrubbed.replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-<redacted>')
  scrubbed = scrubbed.replace(/glpat-[a-zA-Z0-9_-]{20,}/g, 'glpat-<redacted>')
  scrubbed = scrubbed.replace(/ghp_[a-zA-Z0-9]{20,}/g, 'ghp_<redacted>')

  // 3. Scrub emails (preserve @360.org.vn or replace user part)
  scrubbed = scrubbed.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, user, domain) => {
    if (domain === '360.org.vn' || domain === 'vuahethong.com') return match
    return `${user.substring(0, 2)}***@${domain}`
  })

  // 4. Scrub potential IPv4 addresses (except standard local loopbacks/gateways)
  scrubbed = scrubbed.replace(/\b(?!127\.0\.0\.1|0\.0\.0\.0)(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, 'xxx.xxx.xxx.xxx')

  return scrubbed
}

/**
 * Redacts nested configuration objects
 */
function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('cookie')
    ) {
      result[key] = typeof value === 'string' && value.length > 0 ? '<redacted>' : value
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeConfig(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Ping an endpoint with timeout to determine reachability
 */
async function checkEndpointReachability(name: string, url: string): Promise<DiagnosticEndpointStatus> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': `VuaOffice-Diagnostic/${app.getVersion()}` },
    })
    clearTimeout(timer)
    return {
      name,
      url,
      reachable: res.status < 500,
      status: res.status,
      latencyMs: Date.now() - start,
    }
  } catch (err: unknown) {
    clearTimeout(timer)
    const message = err instanceof Error ? err.message : String(err)
    return {
      name,
      url,
      reachable: false,
      error: scrubSensitiveText(message),
      latencyMs: Date.now() - start,
    }
  }
}

/**
 * Collect complete diagnostic report data
 */
export async function generateDiagnosticReportData(settingsPath: string): Promise<DiagnosticReportData> {
  const rawSettings = readAppSettings(settingsPath)
  const sanitizedConfig = sanitizeConfig(rawSettings)

  const system: DiagnosticSystemInfo = {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron || 'unknown',
    nodeVersion: process.versions.node || 'unknown',
    chromeVersion: process.versions.chrome || 'unknown',
    osPlatform: os.platform(),
    osRelease: os.release(),
    osArch: os.arch(),
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    uptimeSec: Math.round(os.uptime()),
    developerMode: rawSettings.developerMode === true,
    language: String(rawSettings.language || 'vi'),
    theme: String(rawSettings.theme || 'system'),
  }

  // Generate unique report ID
  const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const reportId = `VUA-DIAG-${dateStr}-${randomSuffix}`

  // Check network reachability in parallel
  const endpointsToCheck = [
    { name: 'GitLab API (360org)', url: 'https://gitlab.com/api/v4/version' },
    { name: 'vuaofficerouter Gateway', url: 'https://ai-router.vuahethong.com/v1/models' },
    { name: 'OmiRouter AI Gateway', url: 'https://api.omirouter.com/v1/models' },
    { name: 'Hermes Agent Endpoint', url: 'https://hermes.vuahethong.com/v1/models' },
  ]

  const networkReachability = await Promise.all(
    endpointsToCheck.map((ep) => checkEndpointReachability(ep.name, ep.url))
  )

  const scrubbedLogs = recentLogsBuffer.map((line) => scrubSensitiveText(line))

  // Build raw formatted report string
  const rawLines: string[] = [
    `================================================================================`,
    `VUAOFFICE SUITE — DIAGNOSTIC & TROUBLESHOOTING REPORT`,
    `Report ID: ${reportId}`,
    `Generated At: ${new Date().toISOString()}`,
    `================================================================================`,
    ``,
    `[SYSTEM & RUNTIME INFORMATION]`,
    `- App Version:        VuaOffice Suite v${system.appVersion}`,
    `- Platform / OS:      ${system.osPlatform} (${system.osRelease}) [${system.osArch}]`,
    `- Electron Version:   v${system.electronVersion}`,
    `- Chromium Version:   v${system.chromeVersion}`,
    `- Node.js Version:    v${system.nodeVersion}`,
    `- System Memory:      ${system.freeMemoryMB} MB Free / ${system.totalMemoryMB} MB Total`,
    `- System Uptime:      ${Math.floor(system.uptimeSec / 3600)}h ${Math.floor((system.uptimeSec % 3600) / 60)}m`,
    `- Developer Mode:     ${system.developerMode ? 'ENABLED' : 'DISABLED'}`,
    `- Active Language:    ${system.language}`,
    `- UI Theme:           ${system.theme}`,
    ``,
    `[NETWORK ENDPOINTS REACHABILITY]`,
    ...networkReachability.map(
      (ep) =>
        `- ${ep.name.padEnd(26)} : ${ep.reachable ? 'ONLINE (Status ' + ep.status + ')' : 'OFFLINE/FAILED (' + (ep.error || 'Timeout') + ')'} [${ep.latencyMs}ms]`
    ),
    ``,
    `[SANITIZED APPLICATION CONFIGURATION]`,
    JSON.stringify(sanitizedConfig, null, 2),
    ``,
    `[RECENT DIAGNOSTIC & ERROR LOGS]`,
    ...(scrubbedLogs.length > 0 ? scrubbedLogs : ['(No warnings or errors logged in current session)']),
    ``,
    `================================================================================`,
    `END OF REPORT — AUTHORED BY VUAOFFICE SUITE`,
    `================================================================================`,
  ]

  const rawText = rawLines.join('\n')

  return {
    reportId,
    generatedAt: new Date().toISOString(),
    system,
    sanitizedConfig,
    networkReachability,
    recentLogs: scrubbedLogs,
    rawText,
  }
}

/**
 * Export diagnostic report to local disk via save dialog
 */
export async function exportDiagnosticReportToFile(report: DiagnosticReportData): Promise<DiagnosticExportResult> {
  const defaultFilename = `vuaoffice-diagnostic-${report.reportId}.txt`
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Diagnostic & Log Report',
    defaultPath: defaultFilename,
    filters: [
      { name: 'Text Document (*.txt)', extensions: ['txt'] },
      { name: 'JSON Data (*.json)', extensions: ['json'] },
    ],
  })

  if (canceled || !filePath) {
    return { success: false }
  }

  try {
    if (filePath.endsWith('.json')) {
      writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8')
    } else {
      writeFileSync(filePath, report.rawText, 'utf8')
    }
    return { success: true, filePath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * Submit diagnostic report directly to GitLab Issues on 360org/vuaoffice
 */
const GITLAB_PROJECT_ID = process.env.VUAOFFICE_GITLAB_PROJECT_ID || '85301646'
const GITLAB_REPORT_TOKEN = process.env.VUAOFFICE_GITLAB_REPORT_TOKEN || ''

export async function submitDiagnosticReportToGitLab(
  report: DiagnosticReportData,
  userNote?: string
): Promise<DiagnosticSubmitResult> {
  if (!GITLAB_REPORT_TOKEN) {
    return {
      success: false,
      error: 'GitLab reporting token is not configured. Please export report to file.',
    }
  }

  const issueTitle = `[Bug Report] Diagnostic Log - ${report.reportId}`

  const markdownDescription = [
    `## 📋 VuaOffice Diagnostic Report (${report.reportId})`,
    ``,
    `### 👤 User Note / Issue Description:`,
    userNote?.trim() ? userNote.trim() : `*(No additional user note provided)*`,
    ``,
    `---`,
    `### 💻 System & Environment`,
    `| Property | Value |`,
    `|---|---|`,
    `| **App Version** | \`v${report.system.appVersion}\` |`,
    `| **OS Platform** | \`${report.system.osPlatform} (${report.system.osRelease}) [${report.system.osArch}]\` |`,
    `| **Electron** | \`v${report.system.electronVersion}\` |`,
    `| **Chromium** | \`v${report.system.chromeVersion}\` |`,
    `| **Node.js** | \`v${report.system.nodeVersion}\` |`,
    `| **Memory** | \`${report.system.freeMemoryMB} MB free / ${report.system.totalMemoryMB} MB total\` |`,
    `| **Dev Mode** | \`${report.system.developerMode ? 'Enabled' : 'Disabled'}\` |`,
    `| **Language / Theme** | \`${report.system.language}\` / \`${report.system.theme}\` |`,
    ``,
    `### 🌐 Network Reachability`,
    ...report.networkReachability.map(
      (ep) =>
        `- **${ep.name}**: ${ep.reachable ? '🟢 ONLINE (`' + ep.status + '`)' : '🔴 OFFLINE (`' + (ep.error || 'Failed') + '`)'} — *${ep.latencyMs}ms*`
    ),
    ``,
    `### 📜 Full Sanitized Diagnostic Log`,
    `<details>`,
    `<summary>Click to expand diagnostic logs (${Math.round(report.rawText.length / 1024)} KB)</summary>`,
    ``,
    `\`\`\`text`,
    report.rawText,
    `\`\`\``,
    `</details>`,
    ``,
    `---`,
    `*Report submitted automatically via VuaOffice Suite Help > Troubleshooting*`,
  ].join('\n')

  try {
    // Direct call to official GitLab REST API v4
    const response = await fetch(`https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': GITLAB_REPORT_TOKEN,
        'User-Agent': `VuaOffice-Suite/${report.system.appVersion}`,
      },
      body: JSON.stringify({
        title: issueTitle,
        description: markdownDescription,
        labels: ['diagnostic-report', 'user-report', report.system.osPlatform].join(','),
      }),
    })

    if (response.ok) {
      const data = (await response.json()) as { web_url?: string; iid?: number }
      return {
        success: true,
        issueUrl: data.web_url || `https://gitlab.com/360org/vuaoffice/-/work_items/${data.iid}`,
        issueIid: data.iid,
      }
    } else {
      const errText = await response.text()
      appendDiagnosticLog('ERROR', `GitLab direct dispatch failed (${response.status}): ${errText}`)
      return {
        success: false,
        error: `GitLab API responded with status ${response.status}`,
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    appendDiagnosticLog('ERROR', `Failed to dispatch report to GitLab: ${message}`)
    return {
      success: false,
      error: scrubSensitiveText(message),
    }
  }
}
