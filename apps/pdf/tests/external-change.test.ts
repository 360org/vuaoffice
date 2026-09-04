import { describe, expect, it, vi } from 'vitest'
import { isExternallyModified, type DiskFileState } from '../src/main/external-change'

const recorded: DiskFileState = { mtimeMs: 1000, size: 42, hash: 'aaa' }

describe('isExternallyModified', () => {
  it('is false when mtime and size still match without reading the hash', async () => {
    const readHash = vi.fn(() => 'zzz')

    await expect(
      isExternallyModified(recorded, { mtimeMs: 1000, size: 42 }, readHash),
    ).resolves.toBe(false)
    expect(readHash).not.toHaveBeenCalled()
  })

  it('is false when only the file stamp changed', async () => {
    await expect(
      isExternallyModified(recorded, { mtimeMs: 2000, size: 42 }, () => 'aaa'),
    ).resolves.toBe(false)
  })

  it('is true when another program changed the PDF bytes', async () => {
    await expect(
      isExternallyModified(recorded, { mtimeMs: 2000, size: 43 }, () => 'bbb'),
    ).resolves.toBe(true)
  })

  it('supports an async hash reader', async () => {
    await expect(
      isExternallyModified(recorded, { mtimeMs: 2000, size: 43 }, async () => 'bbb'),
    ).resolves.toBe(true)
  })

  it('is false without a recorded state', async () => {
    await expect(
      isExternallyModified(undefined, { mtimeMs: 2000, size: 43 }, () => 'bbb'),
    ).resolves.toBe(false)
  })

  it('is false when the file was deleted so Save can recreate it', async () => {
    await expect(isExternallyModified(recorded, null, () => null)).resolves.toBe(false)
  })

  it('is false when the changed file cannot be read back', async () => {
    await expect(
      isExternallyModified(recorded, { mtimeMs: 2000, size: 43 }, () => null),
    ).resolves.toBe(false)
  })
})
