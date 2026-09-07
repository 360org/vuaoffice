/**
 * In Electron main processes AI requests run on Node's fetch (undici), which
 * connects directly instead of going through Chromium's network stack. Under
 * VPN/tun setups those direct connections can get reset (ECONNRESET) while
 * Chromium traffic — login, renderer fetches — works fine. Main processes
 * inject Electron's net.fetch here as a rescue path: when the primary fetch
 * fails at the network layer, the request is retried once over the Chromium
 * stack. Renderers never inject one (their fetch already is Chromium's).
 *
 * aiFetch also implements exponential backoff retry for transient network and
 * server errors (HTTP 429, 502, 503, 504).
 */

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

let rescueFetch: FetchLike | null = null

export function setRescueFetch(fn: FetchLike | null): void {
  rescueFetch = fn
}

/**
 * Node's fetch announces itself as a bare `node`, which gateways that watch
 * for anonymous automation treat as abusive traffic (OpenCode Go requires
 * clients to identify themselves and flags "broad" user agents). Main
 * processes refine the default with the app version.
 */
export const AI_DEFAULT_USER_AGENT = 'GenOffice'

let userAgent = AI_DEFAULT_USER_AGENT

export function setAiUserAgent(ua: string): void {
  userAgent = ua || AI_DEFAULT_USER_AGENT
}

/** protocols pass plain header records; keep that shape so callers can read the request back */
function withUserAgent(init: RequestInit): RequestInit {
  const given = init.headers
  const headers: Record<string, string> = {}
  if (given instanceof Headers) given.forEach((value, name) => (headers[name] = value))
  else if (Array.isArray(given)) for (const [name, value] of given) headers[name] = value
  else Object.assign(headers, given)
  if (!Object.keys(headers).some((name) => name.toLowerCase() === 'user-agent')) {
    headers['User-Agent'] = userAgent
  }
  return { ...init, headers }
}

async function singleFetch(url: string, rawInit: RequestInit): Promise<Response> {
  const init = withUserAgent(rawInit)
  try {
    return await fetch(url, init)
  } catch (primaryError) {
    const signal = init.signal as AbortSignal | null | undefined
    if (!rescueFetch || signal?.aborted) throw primaryError
    console.warn('[ai-provider] fetch failed, retrying via rescue fetch:', String(primaryError))
    try {
      return await rescueFetch(url, init)
    } catch {
      throw primaryError
    }
  }
}

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])

export interface AiFetchOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000
  }
  const date = Date.parse(header)
  if (!Number.isNaN(date)) {
    const diff = date - Date.now()
    return diff > 0 ? diff : 0
  }
  return null
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'))
      return
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason ?? new Error('Aborted'))
    }
    if (signal) signal.addEventListener('abort', onAbort)
  })
}

export async function aiFetch(
  url: string,
  init: RequestInit,
  options: AiFetchOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 2
  const initialDelay = options.initialDelayMs ?? 100
  const maxDelay = options.maxDelayMs ?? 4000
  const signal = init.signal as AbortSignal | null | undefined

  let attempt = 0
  while (true) {
    if (signal?.aborted) {
      throw signal.reason ?? new Error('Aborted')
    }
    try {
      const response = await singleFetch(url, init)
      if (response.ok || attempt >= maxRetries || !RETRYABLE_STATUS_CODES.has(response.status)) {
        return response
      }
      // Retryable status code (429, 502, 503, 504)
      const retryAfter = parseRetryAfter(response)
      const backoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt) + Math.random() * 20)
      const delay = retryAfter !== null ? Math.min(maxDelay, retryAfter) : backoff
      attempt++
      await sleep(delay, signal)
    } catch (err) {
      if (signal?.aborted || attempt >= maxRetries) {
        throw err
      }
      const backoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt) + Math.random() * 20)
      attempt++
      await sleep(backoff, signal)
    }
  }
}
