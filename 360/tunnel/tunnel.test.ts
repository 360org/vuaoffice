import { describe, expect, it } from 'vitest'
import http from 'node:http'
import net from 'node:net'
import {
  createFrameParser,
  encodeFrame,
  FrameType,
  HEADER_SIZE,
} from './protocol'
import { isAllowedEgressDestination } from './allowlist'
import { EgressTunnelClient } from './client'

describe('VuaOffice Egress Tunnel — Protocol Framing', () => {
  it('encodes and decodes single complete frame', () => {
    const streamId = 42
    const payload = Buffer.from('hello-tunnel-egress')
    const frame = encodeFrame(FrameType.DATA, streamId, payload)

    expect(frame.length).toBe(HEADER_SIZE + payload.length)
    expect(frame[0]).toBe(FrameType.DATA)
    expect(frame.readUInt32BE(1)).toBe(streamId)
    expect(frame.readUInt32BE(5)).toBe(payload.length)

    let parsedType: FrameType | null = null
    let parsedStreamId = 0
    let parsedPayload: Buffer = Buffer.alloc(0)

    const parser = createFrameParser((type, id, pl) => {
      parsedType = type
      parsedStreamId = id
      parsedPayload = pl
    })

    parser(frame)

    expect(parsedType).toBe(FrameType.DATA)
    expect(parsedStreamId).toBe(streamId)
    expect(parsedPayload.toString('utf8')).toBe('hello-tunnel-egress')
  })

  it('handles chunk fragmentation across arbitrary byte boundaries', () => {
    const received: string[] = []
    const parser = createFrameParser((_type, _id, pl) => {
      received.push(pl.toString('utf8'))
    })

    const frame1 = encodeFrame(FrameType.DATA, 1, Buffer.from('part-one'))
    const frame2 = encodeFrame(FrameType.DATA, 2, Buffer.from('part-two'))
    const stream = Buffer.concat([frame1, frame2])

    // Feed in tiny chunks of 3 bytes to simulate TCP fragmentation
    for (let i = 0; i < stream.length; i += 3) {
      parser(stream.subarray(i, Math.min(stream.length, i + 3)))
    }

    expect(received).toEqual(['part-one', 'part-two'])
  })
})

describe('VuaOffice Egress Tunnel — Security Domain Allowlist Gate', () => {
  it('permits authorized AI provider domains on port 443', () => {
    expect(isAllowedEgressDestination('api.openai.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('chatgpt.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('api.anthropic.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('claude.ai', 443)).toBe(true)
    expect(isAllowedEgressDestination('generativelanguage.googleapis.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('api.ipify.org', 443)).toBe(true)
  })

  it('rejects non-443 ports even for valid domains', () => {
    expect(isAllowedEgressDestination('api.openai.com', 80)).toBe(false)
    expect(isAllowedEgressDestination('api.openai.com', 8080)).toBe(false)
    expect(isAllowedEgressDestination('claude.ai', 22)).toBe(false)
  })

  it('rejects raw IP addresses and private subnets', () => {
    expect(isAllowedEgressDestination('127.0.0.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('192.168.1.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('10.0.0.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('8.8.8.8', 443)).toBe(false)
    expect(isAllowedEgressDestination('::1', 443)).toBe(false)
  })

  it('rejects unauthorized external domains', () => {
    expect(isAllowedEgressDestination('google.com', 443)).toBe(false)
    expect(isAllowedEgressDestination('facebook.com', 443)).toBe(false)
    expect(isAllowedEgressDestination('evil-hacker.ru', 443)).toBe(false)
    expect(isAllowedEgressDestination('localhost', 443)).toBe(false)
  })
})

describe('VuaOffice Egress Tunnel — End-to-End Client Lifecycle & Mock Multiplexing', () => {
  it('connects via HTTP Upgrade, exchanges frames and handles termination', async () => {
    let mockUpgradeReceived = false
    let clientConnectedAck = false

    // Start local mock HTTP server that supports HTTP Upgrade
    const server = http.createServer((_req, res) => {
      res.writeHead(426).end('Upgrade Required')
    })

    server.on('upgrade', (req, socket) => {
      if (req.headers.upgrade === 'vuaoffice-egress/1') {
        mockUpgradeReceived = true
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: vuaoffice-egress/1\r\n' +
            'Connection: Upgrade\r\n\r\n',
        )

        const parser = createFrameParser((type, streamId) => {
          if (type === FrameType.PING) {
            socket.write(encodeFrame(FrameType.PONG, 0))
          }
          if (type === FrameType.CONNECT) {
            // Echo back CONNECTED
            socket.write(encodeFrame(FrameType.CONNECTED, streamId))
          }
        })

        socket.on('data', parser)
      }
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as net.AddressInfo

    const client = new EgressTunnelClient()

    client.on('stateChange', (st) => {
      if (st.state === 'connected') {
        clientConnectedAck = true
      }
    })

    client.start({
      endpointUrl: `http://127.0.0.1:${addr.port}/v1/tunnel`,
      accountSlug: 'test-account',
      deviceUid: 'device-test-uid',
      token: 'mock-token',
      heartbeatIntervalMs: 200,
    })

    // Wait for client to connect
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (clientConnectedAck) {
          clearInterval(check)
          resolve()
        }
      }, 20)
    })

    expect(mockUpgradeReceived).toBe(true)
    expect(clientConnectedAck).toBe(true)
    expect(client.getStatus().state).toBe('connected')

    client.stop()
    expect(client.getStatus().state).toBe('idle')

    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
