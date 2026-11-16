/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  loadAiTokenUsage,
  recordAiTokenUsage,
  resetAiTokenUsage,
} from '../src/main/ai-token-tracker'
import type { AiTokenUsageStats, DailyAiTokenUsage } from '../src/shared/home-api'

describe('AI Token Usage & Chart Tracker Suite', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'vuaoffice-ai-usage-test-'))
  const testFile = join(tmpDir, 'ai-token-usage.json')

  it('case 1: starts with empty stats and generates recent 7 days continuous timeline', () => {
    const stats = loadAiTokenUsage(testFile)
    expect(stats.inputTokens).toBe(0)
    expect(stats.outputTokens).toBe(0)
    expect(stats.cachedTokens).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(stats.requestsCount).toBe(0)
    expect(stats.estimatedCostUsd).toBe(0)
    expect(Array.isArray(stats.dailyUsage)).toBe(true)
    expect(stats.dailyUsage!.length).toBe(7)
  })

  it('case 2: accurately records prompt, output and cached tokens delta', () => {
    const updated = recordAiTokenUsage(
      { inputTokens: 10000, outputTokens: 2000, cachedTokens: 5000 },
      testFile,
    )
    expect(updated.inputTokens).toBe(10000)
    expect(updated.outputTokens).toBe(2000)
    expect(updated.cachedTokens).toBe(5000)
    expect(updated.totalTokens).toBe(12000)
    expect(updated.requestsCount).toBe(1)
    // Cost formula: (10000 * 3 + 2000 * 15 + 5000 * 0.75) / 1,000,000 = (30000 + 30000 + 3750) / 1000000 = 0.06375 -> 0.064
    expect(updated.estimatedCostUsd).toBeCloseTo(0.064, 3)
  })

  it('case 3: aggregates multiple calls into today record in dailyUsage', () => {
    const updated = recordAiTokenUsage(
      { inputTokens: 5000, outputTokens: 1000, cachedTokens: 2000 },
      testFile,
    )
    expect(updated.inputTokens).toBe(15000)
    expect(updated.outputTokens).toBe(3000)
    expect(updated.cachedTokens).toBe(7000)
    expect(updated.totalTokens).toBe(18000)
    expect(updated.requestsCount).toBe(2)

    const today = updated.dailyUsage![updated.dailyUsage!.length - 1]
    expect(today.totalTokens).toBe(18000)
    expect(today.requestsCount).toBe(2)
    expect(today.cachedTokens).toBe(7000)
  })

  it('case 4: resets usage stats cleanly and maintains 7 continuous timeline days', () => {
    const reset = resetAiTokenUsage(testFile)
    expect(reset.totalTokens).toBe(0)
    expect(reset.requestsCount).toBe(0)
    expect(reset.dailyUsage!.length).toBe(7)
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
