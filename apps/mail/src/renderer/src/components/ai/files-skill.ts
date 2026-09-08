import type { AgentSkill } from '@genoffice/agent-core'
import type { AttachmentMeta } from '../../../../shared/types'

const READ_CHUNK_CHARS = 24_000
const ATTACHMENT_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

const FILES_SYSTEM_PROMPT = `## Attachments
The user may attach local files to the conversation (see the "attachment list" in each turn's context).
- When the user's request involves attachment content, read it with read_attachment first, then answer or write; do not guess content from file names.
- Long files are read in pages: the result reports the total character count and the current range; to continue, set offset to the end position of the previous slice.
- Image attachments (png/jpg/gif/webp) are already sent as images with the user message — just look at them; read_attachment is only for text-like attachments.
- Do not call read_attachment when there are no attachments or they are unrelated to the request.`

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function isImageAttachment(ext: string): boolean {
  return ATTACHMENT_IMAGE_EXTS.has(ext)
}

export function createFilesSkill(getAttachments: () => readonly AttachmentMeta[]): AgentSkill {
  return {
    id: 'files',
    systemPrompt: FILES_SYSTEM_PROMPT,
    tools: [
      {
        name: 'read_attachment',
        description:
          'Read the text content of an attachment (parsed locally). Long files are paged: read offset=0 first, then decide whether to continue based on the returned total character count.',
        inputSchema: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'attachment index (0-based)' },
            offset: { type: 'integer', description: 'start character position, default 0' },
          },
          required: ['index'],
        },
      },
    ],
    buildContext: () => {
      const list = getAttachments()
      if (list.length === 0) return ''
      const lines = list.map((a, i) => `${i} | ${a.name} | .${a.ext} | ${formatSize(a.sizeBytes)}`)
      return `Attachment list (index | file name | type | size):\n${lines.join('\n')}`
    },
    executeTool: async (call) => {
      if (call.name !== 'read_attachment') {
        return { output: `unknown tool: ${call.name}`, isError: true, summary: call.name }
      }
      const list = getAttachments()
      const index = Number(call.input.index)
      const att = Number.isInteger(index) ? list[index] : undefined
      if (!att) return { output: 'invalid attachment index', isError: true, summary: 'Read attachment' }
      if (isImageAttachment(att.ext)) {
        return {
          output: `${att.name} is an image attachment already sent as an image with the user message; just look at the image in the message, no text to read.`,
          mutated: false,
          summary: `Image ${att.name}`,
        }
      }
      const result = await window.vuaMail?.readAttachment?.(
        att.path,
        Math.max(0, Number(call.input.offset) || 0),
        READ_CHUNK_CHARS,
      )
      if (!result?.ok) {
        return { output: result?.error ?? 'read failed', isError: true, summary: `Read ${att.name}` }
      }
      const end = (result.offset ?? 0) + (result.text?.length ?? 0)
      const header = `File ${att.name}, total characters ${result.totalChars}, this slice ${result.offset}-${end}${
        end < (result.totalChars ?? 0) ? ' (not finished, continue with offset=' + end + ')' : ' (end of file)'
      }`
      return { output: `${header}\n---\n${result.text ?? ''}`, mutated: false, summary: `Read ${att.name}` }
    },
  }
}
