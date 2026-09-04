import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib'

export interface RevisionInfo {
  revisionNumber: number
  byteOffset: number
  producer?: string
  creator?: string
  modDate?: string
  creationDate?: string
}

export interface ModifiedItem {
  type: 'page_content' | 'annotation' | 'page_added' | 'page_removed' | 'form_field' | 'metadata'
  pageNumber?: number // 1-indexed
  description: string
  details?: string
}

export interface PdfForensicsResult {
  isOriginal: boolean
  revisionCount: number
  revisions: RevisionInfo[]
  modifiedItems: ModifiedItem[]
  producer?: string
  creator?: string
  creationDate?: string
  modDate?: string
  datesDiffer: boolean
  hasXmpHistory: boolean
  xmpHistoryEvents: Array<{ action?: string; when?: string; softwareAgent?: string }>
}

function parsePdfDate(d?: string): string | undefined {
  if (!d) return undefined
  // D:YYYYMMDDHHmmSSOHH'mm'
  const match = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(d)
  if (!match) return d
  const [, year, month = '01', day = '01', hour = '00', minute = '00', second = '00'] = match
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function extractXmpHistory(content: string): {
  hasXmpHistory: boolean
  events: Array<{ action?: string; when?: string; softwareAgent?: string }>
} {
  const events: Array<{ action?: string; when?: string; softwareAgent?: string }> = []
  if (!content.includes('xmpMM:History')) {
    return { hasXmpHistory: false, events }
  }

  // Regex extract stEvt items
  const eventRegex = /<rdf:li[^>]*stEvt:action="([^"]*)"[^>]*stEvt:when="([^"]*)"[^>]*stEvt:softwareAgent="([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = eventRegex.exec(content)) !== null) {
    events.push({
      action: match[1],
      when: match[2],
      softwareAgent: match[3],
    })
  }

  if (events.length === 0) {
    // Alternative XML format: child tags <stEvt:action>...
    const liRegex = /<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g
    while ((match = liRegex.exec(content)) !== null) {
      const block = match[1]
      if (block.includes('stEvt:')) {
        const action = /<stEvt:action>([^<]*)<\/stEvt:action>/.exec(block)?.[1]
        const when = /<stEvt:when>([^<]*)<\/stEvt:when>/.exec(block)?.[1]
        const software = /<stEvt:softwareAgent>([^<]*)<\/stEvt:softwareAgent>/.exec(block)?.[1]
        if (action || when || software) {
          events.push({ action, when, softwareAgent: software })
        }
      }
    }
  }

  return { hasXmpHistory: events.length > 0 || content.includes('xmpMM:History'), events }
}

/**
 * Locate EOF offsets for incremental updates.
 */
export function findEofOffsets(buf: Buffer): number[] {
  const content = buf.toString('latin1')
  const eofRegex = /%%EOF/g
  const offsets: number[] = []
  let match: RegExpExecArray | null
  while ((match = eofRegex.exec(content)) !== null) {
    // Offset right after %%EOF (plus trailing newline/spaces if any)
    let endIdx = match.index + 5
    while (endIdx < content.length && (content[endIdx] === '\r' || content[endIdx] === '\n' || content[endIdx] === ' ')) {
      endIdx++
    }
    offsets.push(endIdx)
  }
  return offsets
}

/**
 * Inspect PDF binary structure and compare revisions to identify whether the document
 * is original or has been modified, pinpointing modified pages, annotations, and form fields.
 */
export async function inspectPdfForensics(bytes: Uint8Array): Promise<PdfForensicsResult> {
  const buf = Buffer.from(bytes)
  const content = buf.toString('latin1')
  const eofOffsets = findEofOffsets(buf)
  const revisionCount = Math.max(1, eofOffsets.length)

  // Parse metadata & history from XMP
  const { hasXmpHistory, events: xmpHistoryEvents } = extractXmpHistory(content)

  let producer: string | undefined
  let creator: string | undefined
  let creationDate: string | undefined
  let modDate: string | undefined

  try {
    const fullDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    producer = fullDoc.getProducer()
    creator = fullDoc.getCreator()
    const cDate = fullDoc.getCreationDate()
    const mDate = fullDoc.getModificationDate()
    if (cDate) creationDate = cDate.toISOString().replace('T', ' ').slice(0, 19)
    if (mDate) modDate = mDate.toISOString().replace('T', ' ').slice(0, 19)
  } catch {
    // fallback regex in latin1
    const pMatch = /\/Producer\s*\(([^)]+)\)/.exec(content)
    if (pMatch) producer = pMatch[1]
    const cMatch = /\/Creator\s*\(([^)]+)\)/.exec(content)
    if (cMatch) creator = cMatch[1]
    const cdMatch = /\/CreationDate\s*\(([^)]+)\)/.exec(content)
    if (cdMatch) creationDate = parsePdfDate(cdMatch[1])
    const mdMatch = /\/ModDate\s*\(([^)]+)\)/.exec(content)
    if (mdMatch) modDate = parsePdfDate(mdMatch[1])
  }

  // Check if CreationDate and ModDate significantly differ (> 60s)
  let datesDiffer = false
  if (creationDate && modDate && creationDate !== modDate) {
    const cTime = new Date(creationDate).getTime()
    const mTime = new Date(modDate).getTime()
    if (!isNaN(cTime) && !isNaN(mTime) && Math.abs(mTime - cTime) > 60_000) {
      datesDiffer = true
    }
  }

  const modifiedItems: ModifiedItem[] = []
  const revisions: RevisionInfo[] = []

  // Record revisions
  for (let i = 0; i < eofOffsets.length; i++) {
    revisions.push({
      revisionNumber: i + 1,
      byteOffset: eofOffsets[i],
    })
  }

  // If there are multiple revisions, compare base revision vs latest revision
  if (eofOffsets.length > 1) {
    try {
      const baseBytes = buf.subarray(0, eofOffsets[0])
      const baseDoc = await PDFDocument.load(baseBytes, { ignoreEncryption: true })
      const latestDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })

      const basePageCount = baseDoc.getPageCount()
      const latestPageCount = latestDoc.getPageCount()

      if (latestPageCount > basePageCount) {
        modifiedItems.push({
          type: 'page_added',
          description: `Đã thêm ${latestPageCount - basePageCount} trang vào tài liệu`,
          details: `Tài liệu gốc có ${basePageCount} trang, bản hiện tại có ${latestPageCount} trang`,
        })
      } else if (latestPageCount < basePageCount) {
        modifiedItems.push({
          type: 'page_removed',
          description: `Đã xóa ${basePageCount - latestPageCount} trang khỏi tài liệu`,
          details: `Tài liệu gốc có ${basePageCount} trang, bản hiện tại còn ${latestPageCount} trang`,
        })
      }

      const commonPages = Math.min(basePageCount, latestPageCount)
      for (let p = 0; p < commonPages; p++) {
        const basePage = baseDoc.getPage(p)
        const latestPage = latestDoc.getPage(p)

        // Compare Contents stream ref
        const baseContentsRef = basePage.node.lookupMaybe(PDFName.of('Contents'), PDFRef)
        const latestContentsRef = latestPage.node.lookupMaybe(PDFName.of('Contents'), PDFRef)

        const baseContents = basePage.node.lookupMaybe(PDFName.of('Contents'), PDFArray)
        const latestContents = latestPage.node.lookupMaybe(PDFName.of('Contents'), PDFArray)

        let contentsChanged = false
        if (baseContentsRef && latestContentsRef) {
          if (baseContentsRef.objectNumber !== latestContentsRef.objectNumber ||
              baseContentsRef.generationNumber !== latestContentsRef.generationNumber) {
            contentsChanged = true
          }
        } else if (baseContents && latestContents) {
          if (baseContents.size() !== latestContents.size()) {
            contentsChanged = true
          }
        } else if ((baseContentsRef || baseContents) && (latestContentsRef || latestContents)) {
          contentsChanged = true
        }

        if (contentsChanged) {
          modifiedItems.push({
            type: 'page_content',
            pageNumber: p + 1,
            description: `Nội dung và văn bản trang ${p + 1} đã bị sửa đổi`,
            details: `Luồng nội dung (Content Stream) của trang đã bị thay thế hoặc chèn mới trong bản cập nhật`,
          })
        }

        // Compare Annots (Annotations, comments, highlights, drawings)
        const baseAnnots = basePage.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
        const latestAnnots = latestPage.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
        const baseAnnotCount = baseAnnots ? baseAnnots.size() : 0
        const latestAnnotCount = latestAnnots ? latestAnnots.size() : 0

        if (baseAnnotCount !== latestAnnotCount) {
          modifiedItems.push({
            type: 'annotation',
            pageNumber: p + 1,
            description: `Chú thích / chữ ký / vẽ tay trên trang ${p + 1} có thay đổi`,
            details: `Số lượng chú thích thay đổi từ ${baseAnnotCount} thành ${latestAnnotCount}`,
          })
        } else if (latestAnnotCount > 0 && baseAnnotCount > 0) {
          // Check if any annot ref differs
          let annotRefsDiffer = false
          for (let a = 0; a < baseAnnotCount; a++) {
            const bRef = baseAnnots!.get(a)
            const lRef = latestAnnots!.get(a)
            if (bRef?.toString() !== lRef?.toString()) {
              annotRefsDiffer = true
              break
            }
          }
          if (annotRefsDiffer) {
            modifiedItems.push({
              type: 'annotation',
              pageNumber: p + 1,
              description: `Chú thích trên trang ${p + 1} đã được cập nhật`,
              details: `Đối tượng chú thích đã được sửa đổi ở phiên bản kế tiếp`,
            })
          }
        }
      }

      // Check AcroForm field values
      const baseForm = baseDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)
      const latestForm = latestDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)
      if (!baseForm && latestForm) {
        modifiedItems.push({
          type: 'form_field',
          description: 'Đã thêm biểu mẫu tương tác (AcroForm)',
        })
      } else if (baseForm && latestForm) {
        const baseFields = baseForm.lookupMaybe(PDFName.of('Fields'), PDFArray)
        const latestFields = latestForm.lookupMaybe(PDFName.of('Fields'), PDFArray)
        if (baseFields && latestFields && baseFields.size() !== latestFields.size()) {
          modifiedItems.push({
            type: 'form_field',
            description: 'Các trường biểu mẫu (Form Fields) đã bị thêm hoặc bớt',
            details: `Từ ${baseFields.size()} trường thành ${latestFields.size()} trường`,
          })
        }
      }
    } catch {
      // If comparing incremental updates fails due to corrupt intermediate xref, report general modification
      modifiedItems.push({
        type: 'metadata',
        description: `Tài liệu có ${revisionCount} phiên bản ghi đè liên tiếp (Incremental Updates)`,
      })
    }
  }

  // If no incremental updates but XMP History has edit events
  if (xmpHistoryEvents.length > 1 && modifiedItems.length === 0) {
    modifiedItems.push({
      type: 'metadata',
      description: `Lịch sử chỉnh sửa XMP ghi nhận ${xmpHistoryEvents.length} lần sửa đổi`,
      details: xmpHistoryEvents
        .map((e) => `${e.action || 'Sửa'}: ${e.softwareAgent || 'Ứng dụng không rõ'} (${e.when || 'Thời gian không rõ'})`)
        .join('; '),
    })
  }

  // If dates differ significantly and no other items found
  if (datesDiffer && modifiedItems.length === 0) {
    modifiedItems.push({
      type: 'metadata',
      description: 'Thời gian sửa đổi (ModDate) khác biệt đáng kể so với thời gian tạo gốc (CreationDate)',
      details: `Tạo lúc: ${creationDate} · Sửa đổi: ${modDate}`,
    })
  }

  const isOriginal = revisionCount === 1 && !datesDiffer && xmpHistoryEvents.length <= 1 && modifiedItems.length === 0

  return {
    isOriginal,
    revisionCount,
    revisions,
    modifiedItems,
    producer,
    creator,
    creationDate,
    modDate,
    datesDiffer,
    hasXmpHistory,
    xmpHistoryEvents,
  }
}
