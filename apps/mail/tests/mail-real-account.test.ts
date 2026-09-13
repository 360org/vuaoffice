import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import { SQLiteMailStorage } from '../src/main/db/sqlite-storage'

/**
 * Hồi quy cho các lỗi chỉ lộ ra với TÀI KHOẢN THẬT.
 * Hai tài khoản demo có sẵn dùng đúng ID thư mục bị hardcode (`f_inbox`/`f_sent`)
 * nên test thủ công bằng dữ liệu demo sẽ thấy "chạy tốt" dù mã đang hỏng.
 * Mọi test dưới đây bắt buộc tạo tài khoản mới qua addAccount().
 */
describe('Tài khoản thật: lưu cấu hình máy chủ & định tuyến thư mục', () => {
  const testDbDir = join(__dirname, 'temp-test-real-account')
  let storage: SQLiteMailStorage

  const newAccount = () =>
    storage.addAccount({
      email: 'ketoan@congty.vn',
      name: 'Kế toán',
      provider: 'custom_imap',
      imapHost: 'imap.congty.vn',
      imapPort: 993,
      smtpHost: 'smtp.congty.vn',
      smtpPort: 587,
    })

  beforeEach(() => {
    if (existsSync(testDbDir)) rmSync(testDbDir, { recursive: true, force: true })
    storage = new SQLiteMailStorage(testDbDir)
  })

  afterEach(() => {
    if (existsSync(testDbDir)) rmSync(testDbDir, { recursive: true, force: true })
  })

  // Lỗi 1: addAccount() nuốt mất thông số máy chủ -> không thể kết nối
  it.each([
    ['imapHost', 'imap.congty.vn'],
    ['imapPort', 993],
    ['smtpHost', 'smtp.congty.vn'],
    ['smtpPort', 587],
  ])('addAccount lưu lại %s', (field, expected) => {
    const acc = newAccount()
    expect((acc as Record<string, unknown>)[field]).toBe(expected)
    // Phải còn sau khi đọc lại từ đĩa, không chỉ trong đối tượng trả về
    const reloaded = new SQLiteMailStorage(testDbDir).getAccounts().find((a) => a.id === acc.id)
    expect((reloaded as unknown as Record<string, unknown>)?.[field]).toBe(expected)
  })

  // Lỗi 2: sendEmail() hardcode folderId -> thư gửi rơi vào ID không tồn tại
  it('sendEmail đưa thư vào đúng thư mục Sent của chính tài khoản đó', () => {
    const acc = newAccount()
    const sentFolderId = storage.resolveFolderId(acc.id, 'sent')
    expect(sentFolderId).toContain(acc.id)

    storage.sendEmail({
      accountId: acc.id,
      to: ['khach@doitac.vn'],
      subject: 'Báo giá tháng 9',
      bodyHtml: '<p>Kính gửi quý khách</p>',
    })

    const sent = storage.getEmails(sentFolderId)
    expect(sent.map((e) => e.subject)).toContain('Báo giá tháng 9')
  })

  it('thư gửi của tài khoản mới KHÔNG lọt sang Sent của tài khoản demo', () => {
    const acc = newAccount()
    const before = storage.getEmails('f_sent').length

    storage.sendEmail({
      accountId: acc.id,
      to: ['khach@doitac.vn'],
      subject: 'Không được lẫn sang hộp thư khác',
      bodyHtml: '<p>x</p>',
    })

    expect(storage.getEmails('f_sent').length).toBe(before)
  })

  // Lỗi 3: payload hàng đợi gửi thiếu thông tin máy chủ -> orchestrator đoán bừa
  it('hàng đợi send_draft mang đủ from/smtpHost/smtpPort của tài khoản', () => {
    const acc = newAccount()
    storage.sendEmail({
      accountId: acc.id,
      to: ['khach@doitac.vn'],
      subject: 'Kiểm tra hàng đợi',
      bodyHtml: '<p>x</p>',
    })

    const op = storage.getPendingOps().find((o) => o.opType === 'send_draft')
    expect(op).toBeDefined()
    const payload = JSON.parse(op!.payloadJson)
    expect(payload.from).toBe('ketoan@congty.vn')
    expect(payload.smtpHost).toBe('smtp.congty.vn')
    expect(payload.smtpPort).toBe(587)
  })

  // Lỗi 4: resolveFolderId phải tra theo tài khoản, không trả nhầm của tài khoản khác
  it.each(['inbox', 'sent', 'trash'] as const)('resolveFolderId trả thư mục %s thuộc đúng tài khoản', (kind) => {
    const acc = newAccount()
    const folderId = storage.resolveFolderId(acc.id, kind)
    const folder = storage.getFolders(acc.id).find((f) => f.id === folderId)
    expect(folder).toBeDefined()
    expect(folder?.accountId).toBe(acc.id)
    expect(folder?.kind).toBe(kind)
  })
})
