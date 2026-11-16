import { randomUUID } from 'node:crypto'
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { AiTokenUsageStats, DailyAiTokenUsage } from '../shared/home-api'

const DEFAULT_STATS: AiTokenUsageStats = {
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
  requestsCount: 0,
  estimatedCostUsd: 0,
  lastUpdated: 0,
  dailyUsage: [],
}

let cachedStats: AiTokenUsageStats | null = null

function defaultUsagePath(): string | null {
  try {
    const userData = app?.getPath?.('userData')
    return userData ? join(userData, 'ai-token-usage.json') : null
  } catch {
    return null
  }
}

function calculateCost(input: number, output: number, cached = 0): number {
  const cost = (input * 3 + output * 15 + cached * 0.75) / 1_000_000
  return Math.round(cost * 1000) / 1000
}

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ensureRecentDays(stats: AiTokenUsageStats): DailyAiTokenUsage[] {
  const map = new Map<string, DailyAiTokenUsage>()
  if (Array.isArray(stats.dailyUsage)) {
    for (const d of stats.dailyUsage) {
      if (d?.date) map.set(d.date, { ...d })
    }
  }

  // Ensure last 7 days exist in the map
  const out: DailyAiTokenUsage[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const target = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const y = target.getFullYear()
    const m = String(target.getMonth() + 1).padStart(2, '0')
    const d = String(target.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    const existing = map.get(dateStr)
    if (existing) {
      out.push(existing)
    } else {
      out.push({
        date: dateStr,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        requestsCount: 0,
        costUsd: 0,
      })
    }
  }
  return out
}

export function loadAiTokenUsage(filePath?: string): AiTokenUsageStats {
  const target = filePath ?? defaultUsagePath()
  if (!filePath && cachedStats) {
    return {
      ...cachedStats,
      dailyUsage: ensureRecentDays(cachedStats),
    }
  }
  if (target) {
    try {
      const raw = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown>
      if (raw && typeof raw === 'object') {
        const inputTokens = Math.max(0, Number(raw.inputTokens) || 0)
        const outputTokens = Math.max(0, Number(raw.outputTokens) || 0)
        const cachedTokens = Math.max(0, Number(raw.cachedTokens) || 0)
        const requestsCount = Math.max(0, Number(raw.requestsCount) || 0)
        const totalTokens = Math.max(0, Number(raw.totalTokens) || inputTokens + outputTokens)
        const rawDaily = Array.isArray(raw.dailyUsage) ? (raw.dailyUsage as DailyAiTokenUsage[]) : []

        const stats: AiTokenUsageStats = {
          inputTokens,
          outputTokens,
          cachedTokens,
          totalTokens,
          requestsCount,
          estimatedCostUsd: calculateCost(inputTokens, outputTokens, cachedTokens),
          lastUpdated: Number(raw.lastUpdated) || 0,
          dailyUsage: rawDaily,
        }
        stats.dailyUsage = ensureRecentDays(stats)
        if (!filePath) cachedStats = stats
        return { ...stats }
      }
    } catch {
      // missing or unreadable: start fresh
    }
  }
  const fresh = { ...DEFAULT_STATS }
  fresh.dailyUsage = ensureRecentDays(fresh)
  if (!filePath) cachedStats = fresh
  return { ...fresh }
}

function writeAtomic(target: string, data: AiTokenUsageStats): void {
  const tempPath = `${target}.${process.pid}.${randomUUID()}.tmp`
  try {
    writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', flush: true })
    renameSync(tempPath, target)
  } catch {
    try {
      unlinkSync(tempPath)
    } catch {}
  }
}

export function recordAiTokenUsage(
  delta: { inputTokens?: number; outputTokens?: number; cachedTokens?: number },
  filePath?: string,
): AiTokenUsageStats {
  const current = loadAiTokenUsage(filePath)
  const inDelta = Math.max(0, Math.floor(Number(delta.inputTokens) || 0))
  const outDelta = Math.max(0, Math.floor(Number(delta.outputTokens) || 0))
  const cacheDelta = Math.max(0, Math.floor(Number(delta.cachedTokens) || 0))

  const nextInput = current.inputTokens + inDelta
  const nextOutput = current.outputTokens + outDelta
  const nextCached = (current.cachedTokens || 0) + cacheDelta
  const nextTotal = current.totalTokens + inDelta + outDelta
  const nextRequests = current.requestsCount + 1

  // Update dailyUsage
  const today = todayKey()
  const dailyList = Array.isArray(current.dailyUsage) ? [...current.dailyUsage] : []
  const todayIdx = dailyList.findIndex((d) => d.date === today)
  if (todayIdx >= 0) {
    const prevDay = dailyList[todayIdx]
    const dIn = prevDay.inputTokens + inDelta
    const dOut = prevDay.outputTokens + outDelta
    const dCache = prevDay.cachedTokens + cacheDelta
    dailyList[todayIdx] = {
      date: today,
      inputTokens: dIn,
      outputTokens: dOut,
      cachedTokens: dCache,
      totalTokens: prevDay.totalTokens + inDelta + outDelta,
      requestsCount: prevDay.requestsCount + 1,
      costUsd: calculateCost(dIn, dOut, dCache),
    }
  } else {
    dailyList.push({
      date: today,
      inputTokens: inDelta,
      outputTokens: outDelta,
      cachedTokens: cacheDelta,
      totalTokens: inDelta + outDelta,
      requestsCount: 1,
      costUsd: calculateCost(inDelta, outDelta, cacheDelta),
    })
  }

  // Keep last 30 days
  const trimmedDaily = dailyList.slice(-30)

  const next: AiTokenUsageStats = {
    inputTokens: nextInput,
    outputTokens: nextOutput,
    cachedTokens: nextCached,
    totalTokens: nextTotal,
    requestsCount: nextRequests,
    estimatedCostUsd: calculateCost(nextInput, nextOutput, nextCached),
    lastUpdated: Date.now(),
    dailyUsage: trimmedDaily,
  }

  if (!filePath) cachedStats = next
  const target = filePath ?? defaultUsagePath()
  if (target) writeAtomic(target, next)
  return { ...next, dailyUsage: ensureRecentDays(next) }
}

export function resetAiTokenUsage(filePath?: string): AiTokenUsageStats {
  const next: AiTokenUsageStats = {
    ...DEFAULT_STATS,
    lastUpdated: Date.now(),
    dailyUsage: ensureRecentDays(DEFAULT_STATS),
  }
  if (!filePath) cachedStats = next
  const target = filePath ?? defaultUsagePath()
  if (target) writeAtomic(target, next)
  return { ...next }
}
