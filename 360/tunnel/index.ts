/**
 * VuaOffice Egress Tunnel — Public Module Interface.
 *
 * 100% Node.js standard library.
 * Lives under 360/tunnel/ (protected by .gitattributes merge=ours).
 */

import { EgressTunnelClient, type EgressTunnelConfig, type EgressTunnelStatus } from './client'
import {
  startLocalAiProxy,
  stopLocalAiProxy,
  getLocalAiProxyStatus,
  type LocalAiProxyConfig,
  type LocalAiProxyStatus,
} from './local-proxy'

export { EgressTunnelClient }
export type { EgressTunnelConfig, EgressTunnelStatus, TunnelState } from './client'
export { isAllowedEgressDestination } from './allowlist'
export { FrameType, encodeFrame, createFrameParser } from './protocol'
export {
  startLocalAiProxy,
  stopLocalAiProxy,
  getLocalAiProxyStatus,
  type LocalAiProxyConfig,
  type LocalAiProxyStatus,
}

let singletonClient: EgressTunnelClient | null = null

function getClient(): EgressTunnelClient {
  if (!singletonClient) {
    singletonClient = new EgressTunnelClient()
  }
  return singletonClient
}

/**
 * Starts the native egress tunnel with the provided device credentials.
 */
export function startEgressTunnel(config: EgressTunnelConfig): void {
  getClient().start(config)
}

/**
 * Gracefully terminates the egress tunnel and closes all multiplexed streams.
 */
export function stopEgressTunnel(): void {
  if (singletonClient) {
    singletonClient.stop()
  }
}

/**
 * Returns current real-time telemetry and connection state of the tunnel.
 */
export function getEgressTunnelStatus(): EgressTunnelStatus {
  return getClient().getStatus()
}

/**
 * Subscribes to tunnel state transition events.
 */
export function onEgressTunnelStateChange(
  listener: (status: EgressTunnelStatus) => void,
): () => void {
  const client = getClient()
  client.on('stateChange', listener)
  return () => {
    client.off('stateChange', listener)
  }
}
