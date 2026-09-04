/** Disk snapshot recorded at the last read/write of a PDF path. */
export interface DiskFileState {
  mtimeMs: number
  size: number
  hash: string
}

/**
 * True when a PDF no longer matches the state VuaOffice last read or wrote.
 * A missing record/file is not a conflict: Save can create the path again.
 * Hashing only follows a changed stat stamp, keeping normal saves inexpensive.
 */
export async function isExternallyModified(
  recorded: DiskFileState | undefined,
  current: { mtimeMs: number; size: number } | null,
  readHash: () => string | null | Promise<string | null>,
): Promise<boolean> {
  if (!recorded || !current) return false
  if (current.mtimeMs === recorded.mtimeMs && current.size === recorded.size) return false
  const hash = await readHash()
  return hash !== null && hash !== recorded.hash
}
