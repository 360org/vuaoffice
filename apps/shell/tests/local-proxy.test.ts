import { describe, expect, it } from 'vitest'
import http from 'node:http'
import {
  startLocalAiProxy,
  stopLocalAiProxy,
  getLocalAiProxyStatus,
} from '../../../360/tunnel/local-proxy'

describe('360 Local AI Proxy — Port Orchestration & Request Forwarding', () => {
  it('starts local proxy, falls back if port busy, and forwards request', async () => {
    // 1. Create a dummy upstream server to receive forwarded requests
    let upstreamReceived = false
    let upstreamAuthHeader = ''
    const upstreamServer = http.createServer((req, res) => {
      upstreamReceived = true
      upstreamAuthHeader = req.headers.authorization || ''
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', model: 'vuaai-pro-local' }))
    })

    await new Promise<void>((resolve) => upstreamServer.listen(0, '127.0.0.1', resolve))
    const upstreamAddr = upstreamServer.address() as any
    const upstreamUrl = `http://127.0.0.1:${upstreamAddr.port}/v1`

    // 2. Occupy port 36990 to test collision fallback
    const blocker = http.createServer((_req, res) => res.end('occupied'))
    await new Promise<void>((resolve) => blocker.listen(36990, '127.0.0.1', resolve))

    try {
      // 3. Start local proxy with preferredPort 36990 (should fallback to next port)
      const boundPort = await startLocalAiProxy({
        upstreamBaseUrl: upstreamUrl,
        apiKey: 'sk-test-vuaoffice-key',
        preferredPort: 36990,
      })

      expect(boundPort).not.toBe(36990)
      const status = getLocalAiProxyStatus()
      expect(status.running).toBe(true)
      expect(status.port).toBe(boundPort)
      expect(status.baseUrl).toBe(`http://127.0.0.1:${boundPort}/v1`)

      // 4. Send request to local proxy endpoint
      const proxyRes = await fetch(`http://127.0.0.1:${boundPort}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      })

      const data = await proxyRes.json()
      expect(proxyRes.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(upstreamReceived).toBe(true)
      expect(upstreamAuthHeader).toBe('Bearer sk-test-vuaoffice-key')
    } finally {
      stopLocalAiProxy()
      await new Promise<void>((resolve) => blocker.close(() => resolve()))
      await new Promise<void>((resolve) => upstreamServer.close(() => resolve()))
    }
  })
})
