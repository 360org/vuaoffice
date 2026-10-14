import { describe, expect, it } from 'vitest'
import http from 'node:http'
import net from 'node:net'
import {
  createFrameParser,
  encodeFrame,
  FrameType,
  HEADER_SIZE,
} from '../../../360/tunnel/protocol.ts'
import { isAllowedEgressDestination } from '../../../360/tunnel/allowlist.ts'
import { EgressTunnelClient } from '../../../360/tunnel/client.ts'

describe('360 Egress Tunnel — Binary Protocol Framing', () => {
  it('encodes and decodes complete binary frame', () => {
    const streamId = 99
    const payload = Buffer.from('vuaoffice-native-tunnel-stream')
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
    expect(parsedPayload.toString('utf8')).toBe('vuaoffice-native-tunnel-stream')
  })

  it('reassembles split chunks across TCP packet boundaries', () => {
    const received: string[] = []
    const parser = createFrameParser((_type, _id, pl) => {
      received.push(pl.toString('utf8'))
    })

    const frameA = encodeFrame(FrameType.DATA, 1, Buffer.from('chunk-alpha'))
    const frameB = encodeFrame(FrameType.DATA, 2, Buffer.from('chunk-beta'))
    const stream = Buffer.concat([frameA, frameB])

    // Feed in fragments of 4 bytes
    for (let i = 0; i < stream.length; i += 4) {
      parser(stream.subarray(i, Math.min(stream.length, i + 4)))
    }

    expect(received).toEqual(['chunk-alpha', 'chunk-beta'])
  })
})

describe('360 Egress Tunnel — Security Domain Allowlist Gate', () => {
  it('allows port 443 to authorized AI domains', () => {
    expect(isAllowedEgressDestination('api.openai.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('chatgpt.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('api.anthropic.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('claude.ai', 443)).toBe(true)
    expect(isAllowedEgressDestination('generativelanguage.googleapis.com', 443)).toBe(true)
    expect(isAllowedEgressDestination('api.ipify.org', 443)).toBe(true)
  })

  it('strictly blocks non-443 ports', () => {
    expect(isAllowedEgressDestination('api.openai.com', 80)).toBe(false)
    expect(isAllowedEgressDestination('api.openai.com', 8080)).toBe(false)
    expect(isAllowedEgressDestination('claude.ai', 22)).toBe(false)
  })

  it('strictly blocks raw IPs, localhost and internal subnets', () => {
    expect(isAllowedEgressDestination('127.0.0.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('192.168.1.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('10.0.0.1', 443)).toBe(false)
    expect(isAllowedEgressDestination('localhost', 443)).toBe(false)
    expect(isAllowedEgressDestination('service.local', 443)).toBe(false)
  })
})

describe('360 Egress Tunnel — Client Lifecycle & Multiplexing', () => {
  it('performs HTTP upgrade, state transitions and cleanly disconnects', async () => {
    let upgradeAcknowledged = false
    let clientConnected = false
    const activeSockets = new Set<net.Socket>()

    const server = http.createServer((_req, res) => {
      res.writeHead(426).end()
    })

    server.on('upgrade', (req, socket) => {
      activeSockets.add(socket)
      socket.on('close', () => activeSockets.delete(socket))

      if (req.headers.upgrade === 'vuaoffice-egress/1') {
        upgradeAcknowledged = true
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
        clientConnected = true
      }
    })

    client.start({
      endpointUrl: `http://127.0.0.1:${addr.port}/v1/tunnel`,
      accountSlug: '360-account',
      deviceUid: 'device-test-uid',
      token: 'valid-test-token',
      heartbeatIntervalMs: 200,
    })

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (clientConnected) {
          clearInterval(interval)
          resolve()
        }
      }, 20)
    })

    expect(upgradeAcknowledged).toBe(true)
    expect(clientConnected).toBe(true)
    expect(client.getStatus().state).toBe('connected')

    client.stop()
    expect(client.getStatus().state).toBe('idle')

    // Clean up server and any open sockets
    for (const s of activeSockets) {
      s.destroy()
    }
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
