import { describe, expect, it } from 'vitest'
import { aiPackAlert } from '../src/renderer/src/ai-pack-alert'

describe('aiPackAlert', () => {
  it('reports an expired plan with its date instead of "no pack"', () => {
    const a = aiPackAlert({ ok: false, hasPack: false, reason: 'account_expired', expiresOn: '2026-11-04' })
    expect(a.text).toBe('Gói AI hết hạn 04/11/2026')
    expect(a.link).toBe('Gia hạn')
  })
  it('keeps the "no pack" prompt for no_pack_assigned and legacy results', () => {
    expect(aiPackAlert({ ok: false, hasPack: false, reason: 'no_pack_assigned' }).text).toBe('Chưa gán AI Pack')
    expect(aiPackAlert({ ok: false, hasPack: false }).text).toBe('Chưa gán AI Pack')
  })
  it('falls back to a generic alert carrying the server message', () => {
    const a = aiPackAlert({ ok: false, hasPack: false, reason: 'account_suspended', error: 'Bị khoá' })
    expect(a.text).toBe('AI chưa sẵn sàng')
    expect(a.title).toBe('Bị khoá')
  })
})
