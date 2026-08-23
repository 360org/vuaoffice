import WordExtractor from 'word-extractor'
import { buildBlankDocx, parseDocx, saveDocx, type SaveBlock } from '@genoffice/docx-engine'
import './vendor'

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

/** Extract readable body and text-box content from a legacy Word 97-2003 file. */
export async function docToText(bytes: Uint8Array): Promise<string> {
  const document = await new WordExtractor().extract(Buffer.from(bytes))
  const body = document.getBody({ filterUnicode: false })
  const textboxes = document.getTextboxes({
    filterUnicode: false,
    includeHeadersAndFooters: false,
  })
  return normalizeText([body, textboxes].filter((part) => part.trim()).join('\n'))
}

/** Convert a legacy Word 97-2003 (.doc) file into modern .docx bytes. */
export async function docToDocx(bytes: Uint8Array): Promise<Uint8Array> {
  const document = await new WordExtractor().extract(Buffer.from(bytes))
  const body = document.getBody({ filterUnicode: false }) || ''
  const textboxes = document.getTextboxes({
    filterUnicode: false,
    includeHeadersAndFooters: false,
  }) || ''

  const combined = [body, textboxes].filter((part) => part && part.trim()).join('\n')
  const paragraphs = combined.split(/\r?\n/).map((p) => p.trim()).filter(Boolean)

  const blocks: SaveBlock[] = paragraphs.map((text) => ({
    kind: 'generated',
    block: {
      type: 'paragraph',
      runs: [{ text }],
    },
  }))

  if (blocks.length === 0) {
    blocks.push({
      kind: 'generated',
      block: {
        type: 'paragraph',
        runs: [],
      },
    })
  }

  const blank = await buildBlankDocx()
  const parsed = await parseDocx(blank)
  return saveDocx(parsed, blocks)
}
