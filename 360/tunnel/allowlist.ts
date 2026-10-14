/**
 * VuaOffice Egress Tunnel — Security Domain Allowlist Gate.
 *
 * 100% Node.js standard library.
 * Prevents client machines from being abused as open proxies.
 * Only permits outbound TCP connections on port 443 to authorized AI provider endpoints.
 */

import { isIP } from 'node:net'

/**
 * Strictly authorized host patterns for AI providers and connectivity validation.
 */
export const ALLOWED_AI_HOST_PATTERNS: ReadonlyArray<RegExp> = [
  // OpenAI & ChatGPT Web
  /(^|\.)openai\.com$/,
  /(^|\.)chatgpt\.com$/,
  /(^|\.)oaistatic\.com$/,
  /(^|\.)oaiusercontent\.com$/,

  // Anthropic & Claude
  /(^|\.)anthropic\.com$/,
  /(^|\.)claude\.ai$/,

  // Google Gemini & Vertex AI
  /(^|\.)googleapis\.com$/,
  /(^|\.)generativelanguage\.googleapis\.com$/,

  // Egress IP connectivity probe targets
  /(^|\.)ipify\.org$/,
  /(^|\.)icanhazip\.com$/,
  /(^|\.)ifconfig\.me$/,
]

/**
 * Validates whether a target destination (host, port) is permissible for egress routing.
 * Returns true only if port is 443, host is not a raw IP, and matches authorized AI patterns.
 */
export function isAllowedEgressDestination(host: string, port: number): boolean {
  if (port !== 443) {
    return false
  }

  const cleanHost = (host || '').trim().toLowerCase()
  if (!cleanHost) {
    return false
  }

  // Reject raw IP addresses and private network ranges outright (RFC 1918 & loopback)
  if (isIP(cleanHost) !== 0) {
    return false
  }

  // Reject localhost and internal domain names
  if (cleanHost === 'localhost' || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return false
  }

  return ALLOWED_AI_HOST_PATTERNS.some((pattern) => pattern.test(cleanHost))
}
