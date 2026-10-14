/**
 * VuaOffice Egress Tunnel — Native Client.
 *
 * 100% Node.js standard library (node:net, node:https, node:http, node:crypto, node:events).
 * Lives under 360/tunnel/ (protected by .gitattributes merge=ours).
 * Connects out to the Gateway relay over HTTP Upgrade (Port 443 HTTPS),
 * and serves as a residential egress exit for AI provider requests.
 */

import { EventEmitter } from 'node:events'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { URL } from 'node:url'
import { isAllowedEgressDestination } from './allowlist'
import {
  createFrameParser,
  encodeFrame,
  FrameType,
  type ConnectPayload,
} from './protocol'

export type TunnelState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface EgressTunnelConfig {
  /** Relay server URL, e.g. https://airouter.vuahethong.com */
  endpointUrl: string
  /** Account slug or identifier from vuahethong.net */
  accountSlug: string
  /** Hardware device unique identifier */
  deviceUid: string
  /** Signed auth token for the device tunnel */
  token: string
  /** Connect timeout in ms (default: 10_000) */
  connectTimeoutMs?: number
  /** Heartbeat interval in ms (default: 20_000) */
  heartbeatIntervalMs?: number
  /** Max reconnect delay in ms (default: 30_000) */
  maxReconnectDelayMs?: number
}

export interface EgressTunnelStatus {
  state: TunnelState
  activeStreams: number
  endpoint?: string
  lastConnectedAt?: number
  lastError?: string
}

export class EgressTunnelClient extends EventEmitter {
  private config: EgressTunnelConfig | null = null
  private state: TunnelState = 'idle'
  private tunnelSocket: net.Socket | null = null
  private outboundSockets: Map<number, net.Socket> = new Map()
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isDestroyed = false
  private lastConnectedAt: number | undefined
  private lastError: string | undefined

  constructor() {
    super()
  }

  public getStatus(): EgressTunnelStatus {
    return {
      state: this.state,
      activeStreams: this.outboundSockets.size,
      endpoint: this.config?.endpointUrl,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
    }
  }

  public start(config: EgressTunnelConfig): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      this.stop()
    }

    this.config = {
      connectTimeoutMs: 10_000,
      heartbeatIntervalMs: 20_000,
      maxReconnectDelayMs: 30_000,
      ...config,
    }
    this.isDestroyed = false
    this.reconnectAttempts = 0
    this.connect()
  }

  public stop(): void {
    this.isDestroyed = true
    this.clearTimers()
    this.cleanupSockets()
    this.setState('idle')
  }

  private setState(newState: TunnelState, error?: string): void {
    this.state = newState
    if (error) {
      this.lastError = error
    }
    if (newState === 'connected') {
      this.lastConnectedAt = Date.now()
      this.lastError = undefined
    }
    this.emit('stateChange', this.getStatus())
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private cleanupSockets(): void {
    for (const [streamId, sock] of this.outboundSockets.entries()) {
      sock.destroy()
      this.outboundSockets.delete(streamId)
    }

    if (this.tunnelSocket) {
      this.tunnelSocket.removeAllListeners()
      this.tunnelSocket.destroy()
      this.tunnelSocket = null
    }
  }

  private connect(): void {
    if (this.isDestroyed || !this.config) return

    this.setState('connecting')
    let parsedUrl: URL
    try {
      parsedUrl = new URL(this.config.endpointUrl)
    } catch (e) {
      const msg = `Invalid tunnel endpoint URL: ${this.config.endpointUrl}`
      this.setState('error', msg)
      return
    }

    const isSecure = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'wss:'
    const requestFn = isSecure ? https.request : http.request
    const port = parsedUrl.port || (isSecure ? 443 : 80)

    const req = requestFn(
      {
        host: parsedUrl.hostname,
        port,
        path: parsedUrl.pathname || '/v1/tunnel',
        method: 'GET',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'vuaoffice-egress/1',
          'X-Account-Slug': this.config.accountSlug,
          'X-Device-Uid': this.config.deviceUid,
          'X-Tunnel-Token': this.config.token,
        },
        timeout: this.config.connectTimeoutMs,
      },
      (res) => {
        // If upgrade failed, server returned HTTP status
        if (res.statusCode !== 101) {
          const err = `Tunnel upgrade rejected: HTTP ${res.statusCode}`
          this.handleDisconnect(err)
        }
      },
    )

    req.on('upgrade', (_res, socket) => {
      this.tunnelSocket = socket
      this.reconnectAttempts = 0
      this.setState('connected')

      const parser = createFrameParser((type, streamId, payload) => {
        this.handleInboundFrame(type, streamId, payload)
      })

      socket.on('data', parser)
      socket.on('close', () => this.handleDisconnect('Tunnel socket closed'))
      socket.on('error', (err) => this.handleDisconnect(`Tunnel socket error: ${err.message}`))

      this.armHeartbeat()
    })

    req.on('error', (err) => {
      this.handleDisconnect(`Request error: ${err.message}`)
    })

    req.on('timeout', () => {
      req.destroy()
      this.handleDisconnect('Connect timeout')
    })

    req.end()
  }

  private handleInboundFrame(type: FrameType, streamId: number, payload: Buffer): void {
    switch (type) {
      case FrameType.CONNECT: {
        this.handleConnectRequest(streamId, payload)
        break
      }
      case FrameType.DATA: {
        const sock = this.outboundSockets.get(streamId)
        if (sock && !sock.destroyed) {
          sock.write(payload)
        }
        break
      }
      case FrameType.CLOSE: {
        const sock = this.outboundSockets.get(streamId)
        if (sock) {
          sock.end()
          this.outboundSockets.delete(streamId)
        }
        break
      }
      case FrameType.PING: {
        this.sendFrame(FrameType.PONG, 0)
        break
      }
      case FrameType.PONG: {
        // Heartbeat acknowledged
        break
      }
    }
  }

  private handleConnectRequest(streamId: number, payload: Buffer): void {
    let target: ConnectPayload
    try {
      target = JSON.parse(payload.toString('utf8'))
    } catch {
      this.sendFrame(FrameType.ERROR, streamId)
      return
    }

    // Security Gate: Validate destination allowlist
    if (!isAllowedEgressDestination(target.host, target.port)) {
      console.warn(`[Tunnel Security] Blocked unauthorized destination: ${target.host}:${target.port}`)
      this.sendFrame(FrameType.ERROR, streamId)
      return
    }

    // Open local outbound TCP connection using real residential network interface
    const outbound = net.connect(
      {
        host: target.host,
        port: target.port,
      },
      () => {
        this.sendFrame(FrameType.CONNECTED, streamId)
      },
    )

    this.outboundSockets.set(streamId, outbound)

    outbound.on('data', (chunk) => {
      this.sendFrame(FrameType.DATA, streamId, chunk)
    })

    outbound.on('close', () => {
      this.outboundSockets.delete(streamId)
      this.sendFrame(FrameType.CLOSE, streamId)
    })

    outbound.on('error', (err) => {
      console.warn(`[Tunnel Outbound] Error for ${target.host}:${target.port}: ${err.message}`)
      this.outboundSockets.delete(streamId)
      this.sendFrame(FrameType.ERROR, streamId)
    })
  }

  private sendFrame(type: FrameType, streamId: number, payload?: Buffer): void {
    if (this.tunnelSocket && !this.tunnelSocket.destroyed) {
      const frame = encodeFrame(type, streamId, payload)
      this.tunnelSocket.write(frame)
    }
  }

  private armHeartbeat(): void {
    this.clearTimers()
    const interval = this.config?.heartbeatIntervalMs || 20_000
    this.heartbeatTimer = setInterval(() => {
      this.sendFrame(FrameType.PING, 0)
    }, interval)
  }

  private handleDisconnect(reason: string): void {
    this.clearTimers()
    this.cleanupSockets()

    if (this.isDestroyed) return

    this.setState('disconnected', reason)
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const baseDelay = 1_000
    const maxDelay = this.config?.maxReconnectDelayMs || 30_000
    // Exponential backoff with jitter
    const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1_000)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }
}
