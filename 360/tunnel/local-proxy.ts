/**
 * VuaOffice Local AI Core & Egress Proxy.
 *
 * 100% Node.js standard library (node:http, node:https, node:url).
 * Lives under 360/tunnel/ (protected by .gitattributes merge=ours).
 *
 * Listens locally on 127.0.0.1 (priority port 3600, auto-fallback to 3601/36000).
 * Receives OpenAI-compatible requests from VuaOffice and forwards them
 * directly from the client machine's network interface (Residential IP).
 */

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

export interface LocalAiProxyConfig {
  upstreamBaseUrl: string
  apiKey: string
  preferredPort?: number
}

export interface LocalAiProxyStatus {
  running: boolean
  port?: number
  baseUrl?: string
  upstreamUrl?: string
  lastError?: string
}

let serverInstance: http.Server | null = null
let currentPort = 0
let currentConfig: LocalAiProxyConfig | null = null
let lastProxyError: string | undefined

export function getLocalAiProxyStatus(): LocalAiProxyStatus {
  return {
    running: serverInstance !== null && serverInstance.listening,
    port: currentPort || undefined,
    baseUrl: currentPort ? `http://127.0.0.1:${currentPort}/v1` : undefined,
    upstreamUrl: currentConfig?.upstreamBaseUrl,
    lastError: lastProxyError,
  }
}

/**
 * Forwards an incoming HTTP request to upstream (e.g. airouter.vuahethong.com)
 * while preserving SSE streaming and body chunks.
 */
function forwardRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  upstreamUrlStr: string,
  apiKey: string,
): void {
  let targetUrl: URL
  try {
    const rawPath = req.url || '/'
    // Strip leading /v1 if present so it appends cleanly to upstreamBaseUrl
    const subPath = rawPath.replace(/^\/v1(\/|$)/, '$1')
    const base = upstreamUrlStr.replace(/\/+$/, '')
    targetUrl = new URL(`${base}/${subPath.replace(/^\/+/, '')}`)
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: `Invalid target URL: ${err.message}` } }))
    return
  }

  const isHttps = targetUrl.protocol === 'https:'
  const client = isHttps ? https : http

  const upstreamHeaders: http.OutgoingHttpHeaders = {
    ...req.headers,
    host: targetUrl.host,
    'x-forwarded-host': req.headers.host || '127.0.0.1',
    'x-client-egress': 'vuaoffice-local-core',
  }

  // Ensure authorization header is set
  if (apiKey && !upstreamHeaders.authorization) {
    upstreamHeaders.authorization = `Bearer ${apiKey}`
  }

  const upstreamReq = client.request(
    targetUrl,
    {
      method: req.method,
      headers: upstreamHeaders,
      rejectUnauthorized: false,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers)
      upstreamRes.pipe(res)
    },
  )

  upstreamReq.on('error', (err) => {
    console.warn(`[Local AI Proxy] Upstream request error: ${err.message}`)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: {
            message: `Local AI Proxy could not reach upstream gateway: ${err.message}`,
            code: 'local_proxy_upstream_error',
          },
        }),
      )
    }
  })

  req.pipe(upstreamReq)
}

/**
 * Starts the local AI proxy server. Tries preferredPort (default 3600),
 * falling back to 3601, 36000, or a random dynamic port if busy.
 */
export async function startLocalAiProxy(config: LocalAiProxyConfig): Promise<number> {
  currentConfig = config
  if (serverInstance && serverInstance.listening) {
    return currentPort
  }

  const candidatePorts = [config.preferredPort || 3600, 3601, 36000, 0]

  for (const port of candidatePorts) {
    try {
      const boundPort = await tryBindPort(port, config)
      currentPort = boundPort
      lastProxyError = undefined
      console.log(`[Local AI Proxy] Running on http://127.0.0.1:${currentPort}/v1 (Egress: Local Client IP)`)
      return currentPort
    } catch {
      // Try next port candidate
    }
  }

  throw new Error('Failed to bind Local AI Proxy to any local port')
}

function tryBindPort(port: number, config: LocalAiProxyConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      // CORS headers for local embedded calls
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
      res.setHeader('Access-Control-Allow-Headers', '*')

      if (req.method === 'OPTIONS') {
        res.writeHead(204).end()
        return
      }

      // Health probe
      if (req.url === '/' || req.url === '/health' || req.url === '/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'ok',
            egress: 'local_residential_ip',
            port,
            upstream: config.upstreamBaseUrl,
          }),
        )
        return
      }

      // Forward OpenAI-compatible requests
      forwardRequest(req, res, config.upstreamBaseUrl, config.apiKey)
    })

    srv.once('error', (err: any) => {
      srv.close()
      reject(err)
    })

    srv.listen(port, '127.0.0.1', () => {
      serverInstance = srv
      const addr = srv.address() as any
      resolve(addr?.port || port)
    })
  })
}

export function stopLocalAiProxy(): void {
  if (serverInstance) {
    serverInstance.close()
    serverInstance = null
    currentPort = 0
  }
}
