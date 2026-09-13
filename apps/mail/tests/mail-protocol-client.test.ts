import { describe, expect, it } from 'vitest'
import { createTlsConnectionOptions } from '../src/main/network/mail-protocol-client'

describe('mail protocol TLS configuration', () => {
  it.each([
    ['imap.example.test', 993],
    ['smtp.example.test', 465],
    ['smtp.example.test', 587],
    ['mail.example.test', 143],
    ['mail.example.test', 25],
    ['localhost', 993],
    ['mail.internal.test', 465],
    ['mail.example.test', 1],
    ['mail.example.test', 65535],
    ['192.0.2.1', 993],
  ])('rejects untrusted certificates for %s:%i', (host, port) => {
    expect(createTlsConnectionOptions(host, port)).toEqual({ host, port, rejectUnauthorized: true })
  })
})
