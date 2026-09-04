import { describe, expect, it } from 'vitest'
import { PDFDocument, rgb } from 'pdf-lib'
import { inspectPdfForensics, findEofOffsets } from '../src/main/pdf-inspector'

describe('PDF Forensics Inspector', () => {
  it('correctly identifies an original PDF without incremental updates', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([400, 600])
    page.drawText('Hello Original World', { x: 50, y: 500 })
    doc.setTitle('Original Document')
    doc.setProducer('Original PDF Producer')
    const bytes = await doc.save()

    const report = await inspectPdfForensics(bytes)
    expect(report.isOriginal).toBe(true)
    expect(report.revisionCount).toBe(1)
    expect(report.modifiedItems).toHaveLength(0)
    expect(report.producer).toBeDefined()
  })

  it('detects incremental updates and differences in contents/metadata', async () => {
    // 1. Create base document
    const doc = await PDFDocument.create()
    const page1 = doc.addPage([400, 600])
    page1.drawText('Base Page 1', { x: 50, y: 500 })
    const baseBytes = await doc.save()

    // Verify findEofOffsets on single revision
    const eofs = findEofOffsets(Buffer.from(baseBytes))
    expect(eofs.length).toBe(1)

    // 2. Load document and apply incremental changes (useSaveMode or standard append)
    const loadedDoc = await PDFDocument.load(baseBytes, { updateMetadata: false })
    const page2 = loadedDoc.addPage([400, 600])
    page2.drawText('Appended Page 2', { x: 50, y: 500 })
    const secondBytes = await loadedDoc.save({ useObjectStreams: false })

    // Simulate an incremental update file by appending second revision
    // In real-world PDF incremental updates, the new xref and trailer append after %%EOF
    const incrementalBuf = Buffer.concat([
      Buffer.from(baseBytes),
      Buffer.from('\n'),
      Buffer.from(secondBytes),
    ])

    const report = await inspectPdfForensics(new Uint8Array(incrementalBuf))
    expect(report.isOriginal).toBe(false)
    expect(report.revisionCount).toBeGreaterThan(1)
    expect(report.modifiedItems.length).toBeGreaterThan(0)
  })

  it('detects modifications stored in catalog forensics record on single revision save', async () => {
    const { PDFName, PDFHexString } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const page = doc.addPage([400, 600])
    page.drawText('Original invoice', { x: 50, y: 500 })

    const forensicsLog = [
      {
        type: 'page_content',
        pageNumber: 1,
        description: 'Đã chỉnh sửa văn bản trên trang 1',
        details: 'Nội dung mới: "[Đà Lạt]"',
      },
    ]
    doc.catalog.set(
      PDFName.of('GenOfficeForensics'),
      PDFHexString.fromText(JSON.stringify(forensicsLog)),
    )
    const savedBytes = await doc.save({ useObjectStreams: false })

    const report = await inspectPdfForensics(savedBytes)
    expect(report.isOriginal).toBe(false)
    expect(report.revisionCount).toBe(1)
    expect(report.modifiedItems).toHaveLength(1)
    expect(report.modifiedItems[0].pageNumber).toBe(1)
    expect(report.modifiedItems[0].description).toContain('trang 1')
  })
})
