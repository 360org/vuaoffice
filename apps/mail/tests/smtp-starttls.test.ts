import { describe, it, expect, afterEach } from 'vitest'
import * as net from 'node:net'
import { NativeSmtpClient } from '../src/main/network/mail-protocol-client'

/**
 * Hồi quy bảo mật: cổng gửi thư 587 khởi đầu KHÔNG mã hoá.
 * Nếu client gửi thẳng AUTH LOGIN thì mật khẩu bay qua mạng dạng base64 —
 * base64 là mã hoá ký tự, KHÔNG phải mã hoá bảo mật, ai bắt gói tin cũng đọc được.
 * Máy chủ giả dưới đây ghi lại mọi lệnh nhận được trên kênh plaintext.
 */
describe('SMTP trên cổng 587: bắt buộc STARTTLS trước khi xác thực', () => {
  let server: net.Server | null = null

  const startFakeSmtp = (opts: { offerStartTls: boolean }) => {
    const commands: string[] = []
    server = net.createServer((socket) => {
      socket.setEncoding('utf8')
      socket.write('220 smtp.gia.test ESMTP\r\n')
      socket.on('data', (chunk: string) => {
        for (const line of chunk.split('\r\n').filter(Boolean)) {
          commands.push(line)
          if (line.startsWith('EHLO')) {
            socket.write(opts.offerStartTls ? '250-smtp.gia.test\r\n250 STARTTLS\r\n' : '250 smtp.gia.test\r\n')
          } else if (line.startsWith('STARTTLS')) {
            // Chấp nhận rồi lặng thinh: đủ để chứng minh client CÓ yêu cầu nâng cấp,
            // không cần dựng chứng chỉ thật (bắt tay TLS sẽ hỏng và client reject).
            socket.write('220 Ready to start TLS\r\n')
          } else {
            socket.write('250 OK\r\n')
          }
        }
      })
      socket.on('error', () => {})
    })
    return new Promise<{ port: number; commands: string[] }>((resolve) => {
      server!.listen(0, '127.0.0.1', () => {
        resolve({ port: (server!.address() as net.AddressInfo).port, commands })
      })
    })
  }

  afterEach(() => {
    server?.close()
    server = null
  })

  const sendVia = async (port: number) => {
    const client = new NativeSmtpClient({
      host: '127.0.0.1',
      port,
      tls: false, // đúng như orchestrator cấu hình cho cổng 587
      user: 'ketoan@congty.vn',
      pass: 'MatKhauBiMat123',
      authType: 'password',
    })
    return client
      .sendMail({ from: 'ketoan@congty.vn', to: ['khach@doitac.vn'], subject: 'x', bodyHtml: '<p>x</p>' })
      .catch((err: Error) => ({ error: err.message }))
  }

  it('gửi STARTTLS ngay sau EHLO, trước bất kỳ lệnh AUTH nào', async () => {
    const { port, commands } = await startFakeSmtp({ offerStartTls: true })
    await sendVia(port)

    const startTlsIndex = commands.findIndex((c) => c.startsWith('STARTTLS'))
    const authIndex = commands.findIndex((c) => c.startsWith('AUTH'))
    expect(startTlsIndex).toBeGreaterThanOrEqual(0)
    // Chưa có AUTH nào, hoặc nếu có thì phải nằm SAU STARTTLS
    expect(authIndex === -1 || authIndex > startTlsIndex).toBe(true)
  })

  it.each([
    ['AUTH', 'lệnh xác thực'],
    ['MatKhauBiMat123', 'mật khẩu thô'],
    [Buffer.from('MatKhauBiMat123').toString('base64'), 'mật khẩu base64'],
    [Buffer.from('ketoan@congty.vn').toString('base64'), 'tên đăng nhập base64'],
  ])('không để lộ %s (%s) trên kênh chưa mã hoá', async (needle) => {
    const { port, commands } = await startFakeSmtp({ offerStartTls: true })
    await sendVia(port)
    expect(commands.join('\n')).not.toContain(needle)
  })

  it('máy chủ không hỗ trợ STARTTLS thì HỦY, không gửi thông tin đăng nhập', async () => {
    const { port, commands } = await startFakeSmtp({ offerStartTls: false })
    await sendVia(port)
    // Client vẫn phải hỏi STARTTLS và dừng lại, tuyệt đối không rơi về AUTH plaintext
    expect(commands.some((c) => c.startsWith('AUTH'))).toBe(false)
    expect(commands.join('\n')).not.toContain('MatKhauBiMat123')
  })

  it('không gửi nội dung thư (MAIL FROM/DATA) khi chưa mã hoá', async () => {
    const { port, commands } = await startFakeSmtp({ offerStartTls: true })
    await sendVia(port)
    expect(commands.some((c) => c.startsWith('MAIL FROM'))).toBe(false)
    expect(commands.some((c) => c.startsWith('DATA'))).toBe(false)
  })

  it('bắt tay TLS với chứng chỉ không hợp lệ thì thất bại (fail-closed)', async () => {
    const { port } = await startFakeSmtp({ offerStartTls: true })
    const result = await sendVia(port)
    // Máy chủ giả không có chứng chỉ thật -> phải lỗi, không được coi là gửi thành công
    expect((result as { success?: boolean }).success).not.toBe(true)
  })
})
