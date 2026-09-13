import { describe, it, expect, afterEach } from 'vitest'
import * as net from 'node:net'
import { NativePop3Client } from '../src/main/network/mail-protocol-client'

const SAMPLE_EML = [
  'From: sep@congty.vn',
  'To: ketoan@congty.vn',
  'Subject: Bao cao thang 9',
  'Date: Mon, 01 Sep 2025 08:00:00 +0700',
  'Message-ID: <abc123@congty.vn>',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Noi dung bao cao.',
].join('\r\n')

describe('POP3 (RFC 1939): tải thư & bảo mật kênh truyền', () => {
  let server: net.Server | null = null

  /** Máy chủ POP3 giả, ghi lại mọi lệnh nhận được trên kênh CHƯA mã hoá. */
  const startFakePop3 = (opts: { messageCount?: number; failAuth?: boolean; offerStls?: boolean } = {}) => {
    const { messageCount = 2, failAuth = false, offerStls = true } = opts
    const commands: string[] = []
    server = net.createServer((socket) => {
      socket.setEncoding('utf8')
      socket.write('+OK POP3 server ready\r\n')
      socket.on('data', (chunk: string) => {
        for (const line of chunk.split('\r\n').filter(Boolean)) {
          commands.push(line)
          if (line.startsWith('STLS')) {
            // offerStls=false: từ chối nâng cấp, để test được logic POP3 phía sau
            // mà không cần dựng chứng chỉ TLS thật.
            socket.write(offerStls ? '+OK Begin TLS\r\n' : '-ERR STLS not supported\r\n')
          } else if (line.startsWith('USER')) {
            socket.write('+OK user accepted\r\n')
          } else if (line.startsWith('PASS')) {
            socket.write(failAuth ? '-ERR invalid password\r\n' : '+OK mailbox ready\r\n')
          } else if (line.startsWith('LIST')) {
            const rows = Array.from({ length: messageCount }, (_, i) => `${i + 1} 1024`).join('\r\n')
            socket.write(`+OK ${messageCount} messages\r\n${rows}\r\n.\r\n`)
          } else if (line.startsWith('RETR')) {
            socket.write(`+OK 1024 octets\r\n${SAMPLE_EML}\r\n.\r\n`)
          } else if (line.startsWith('QUIT')) {
            socket.write('+OK bye\r\n')
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

  const fetchVia = async (port: number, tls = true) => {
    const client = new NativePop3Client({
      host: '127.0.0.1',
      port,
      tls,
      user: 'ketoan@congty.vn',
      pass: 'MatKhauBiMat123',
      authType: 'password',
    })
    return client.connectAndFetchRecent(10).catch((err: Error) => ({ error: err.message }))
  }

  // --- Bảo mật: cổng 110 chưa mã hoá phải nâng cấp STLS trước khi gửi mật khẩu ---
  it('gửi STLS trước bất kỳ lệnh USER/PASS nào', async () => {
    const { port, commands } = await startFakePop3()
    await fetchVia(port, false)

    const stlsIdx = commands.findIndex((c) => c.startsWith('STLS'))
    const passIdx = commands.findIndex((c) => c.startsWith('PASS'))
    expect(stlsIdx).toBe(0)
    expect(passIdx === -1 || passIdx > stlsIdx).toBe(true)
  })

  it.each([
    ['MatKhauBiMat123', 'mật khẩu thô'],
    ['PASS', 'lệnh PASS'],
    ['USER', 'lệnh USER'],
  ])('không để lộ %s (%s) trên kênh chưa mã hoá', async (needle) => {
    const { port, commands } = await startFakePop3()
    await fetchVia(port, false)
    expect(commands.join('\n')).not.toContain(needle)
  })

  it('máy chủ giả không có chứng chỉ thật thì thất bại (fail-closed)', async () => {
    const { port } = await startFakePop3()
    const res = await fetchVia(port, false)
    expect(Array.isArray(res)).toBe(false)
    expect((res as { error?: string }).error).toBeTruthy()
  })

  // --- Chức năng: tải và phân tích thư qua kênh đã mã hoá (tls: true bỏ qua STLS) ---
  it('máy chủ từ chối STLS thì HỦY, không gửi mật khẩu qua kênh trần', async () => {
    const { port, commands } = await startFakePop3({ offerStls: false })
    const res = await fetchVia(port, false)
    expect((res as { error?: string }).error).toBeTruthy()
    expect(commands.some((c) => c.startsWith('PASS'))).toBe(false)
    expect(commands.join('\n')).not.toContain('MatKhauBiMat123')
  })

  it('không gửi lệnh DELE (chỉ tải, không xoá thư trên máy chủ)', async () => {
    const { port, commands } = await startFakePop3()
    await fetchVia(port, false)
    expect(commands.some((c) => c.startsWith('DELE'))).toBe(false)
  })

  it('từ chối khi không có mật khẩu lẫn token', async () => {
    const { port } = await startFakePop3()
    const client = new NativePop3Client({
      host: '127.0.0.1',
      port,
      tls: true,
      user: 'ketoan@congty.vn',
      authType: 'password',
    })
    await expect(client.connectAndFetchRecent(10)).rejects.toThrow(/xác thực/i)
  })

  it('từ chối ngay khi chỉ có authType oauth2 nhưng thiếu access token', async () => {
    const client = new NativePop3Client({ host: 'pop.test', tls: true, user: 'u', authType: 'oauth2' })
    await expect(client.connectAndFetchRecent(10)).rejects.toThrow(/xác thực/i)
  })

  it('chấp nhận khởi tạo khi có access token OAuth2 (không chặn sớm)', async () => {
    const { port, commands } = await startFakePop3({ offerStls: false })
    const client = new NativePop3Client({
      host: '127.0.0.1',
      port,
      tls: false,
      user: 'u@congty.vn',
      accessToken: 'at_token',
      authType: 'oauth2',
    })
    await client.connectAndFetchRecent(10).catch(() => {})
    // Vẫn phải STLS trước, không được gửi token qua kênh trần
    expect(commands[0]).toMatch(/^STLS/)
    expect(commands.join('\n')).not.toContain('at_token')
  })
})
