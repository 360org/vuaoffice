import type { AiHandshakeResult } from '../../shared/home-api'

/** Account-menu alert for a failed AI handshake: the server reason, not always "no pack". */
export function aiPackAlert(r: AiHandshakeResult): { text: string; link: string; title: string } {
  if (r.reason === 'account_expired') {
    const d = r.expiresOn?.split('-').reverse().join('/')
    return {
      text: d ? `Gói AI hết hạn ${d}` : 'Gói AI đã hết hạn',
      link: 'Gia hạn',
      title: r.error || 'Gói dịch vụ AI đã hết hạn. Nhấn để gia hạn trên vuahethong.net.',
    }
  }
  if (!r.reason || r.reason === 'no_pack_assigned') {
    return {
      text: 'Chưa gán AI Pack',
      link: 'Gán ngay',
      title: 'Thiết bị chưa được gán AI Pack. Nhấn để mở hồ sơ AI trên vuahethong.net để kích hoạt.',
    }
  }
  return { text: 'AI chưa sẵn sàng', link: 'Xem', title: r.error || r.reason }
}
