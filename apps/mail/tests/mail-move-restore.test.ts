import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import { SQLiteMailStorage } from '../src/main/db/sqlite-storage'

describe('SQLiteMailStorage: Move, Drag-Drop & Restore Email', () => {
  const testDbDir = join(__dirname, 'temp-test-mail-dir')
  let storage: SQLiteMailStorage

  beforeEach(() => {
    if (existsSync(testDbDir)) rmSync(testDbDir, { recursive: true, force: true })
    storage = new SQLiteMailStorage(testDbDir)
  })

  afterEach(() => {
    if (existsSync(testDbDir)) rmSync(testDbDir, { recursive: true, force: true })
  })

  it('lưu previousFolderId khi xoá email và chuyển vào f_trash', () => {
    const emails = storage.getEmails('f_inbox')
    expect(emails.length).toBeGreaterThan(0)
    const targetEmail = emails[0]
    const initialFolder = targetEmail.folderId

    storage.deleteEmail(targetEmail.id)

    const trashEmails = storage.getEmails('f_trash')
    const deletedInTrash = trashEmails.find((e) => e.id === targetEmail.id)
    expect(deletedInTrash).toBeDefined()
    expect(deletedInTrash?.folderId).toBe('f_trash')
    expect(deletedInTrash?.previousFolderId).toBe(initialFolder)
  })

  it('khôi phục email từ f_trash về đúng previousFolderId khi gọi restoreEmail', () => {
    const emails = storage.getEmails('f_inbox')
    const targetEmail = emails[0]
    const originFolderId = targetEmail.folderId

    // Bước 1: Xoá email vào thùng rác
    storage.deleteEmail(targetEmail.id)
    expect(storage.getEmails('f_inbox').find((e) => e.id === targetEmail.id)).toBeUndefined()
    expect(storage.getEmails('f_trash').find((e) => e.id === targetEmail.id)).toBeDefined()

    // Bước 2: Khôi phục email
    const restoreResult = storage.restoreEmail(targetEmail.id)
    expect(restoreResult.success).toBe(true)
    expect(restoreResult.restoredFolderId).toBe(originFolderId)

    // Bước 3: Kiểm tra email đã quay trở lại f_inbox và biến mất khỏi f_trash
    const inInbox = storage.getEmails('f_inbox').find((e) => e.id === targetEmail.id)
    expect(inInbox).toBeDefined()
    expect(inInbox?.folderId).toBe(originFolderId)
    expect(inInbox?.previousFolderId).toBeUndefined()
    expect(storage.getEmails('f_trash').find((e) => e.id === targetEmail.id)).toBeUndefined()
  })

  it('di chuyển email trực tiếp sang thư mục khác (Move / Drag & Drop)', () => {
    const emails = storage.getEmails('f_inbox')
    const targetEmail = emails[0]

    // Di chuyển sang Kho lưu trữ (f_archive)
    const moved = storage.moveEmail(targetEmail.id, 'f_archive')
    expect(moved).toBe(true)

    // Không còn ở inbox
    expect(storage.getEmails('f_inbox').find((e) => e.id === targetEmail.id)).toBeUndefined()

    // Có mặt ở archive
    const inArchive = storage.getEmails('f_archive').find((e) => e.id === targetEmail.id)
    expect(inArchive).toBeDefined()
    expect(inArchive?.folderId).toBe('f_archive')
  })

  it('hỗ trợ kéo thả vào thư mục ảo hợp nhất (Unified Virtual Folder all_inbox / all_trash)', () => {
    const emails = storage.getEmails('f_inbox')
    const targetEmail = emails[0]

    // Di chuyển vào all_trash -> tự động phân giải thành f_trash
    const moved = storage.moveEmail(targetEmail.id, 'all_trash')
    expect(moved).toBe(true)

    const inTrash = storage.getEmails('f_trash').find((e) => e.id === targetEmail.id)
    expect(inTrash).toBeDefined()
    expect(inTrash?.folderId).toBe('f_trash')
  })
})
