import type { AgentSkill, AgentToolCall, AgentToolDef, ToolExecution } from '@genoffice/agent-core'
import type { Shape, Rect, Point } from '../../shared/types'

export interface ScreenshotsSnapshot {
  src: string | null
  shapes: Shape[]
}

export interface ScreenshotsAiDeps {
  getImageDimensions: () => { width: number; height: number }
  getCurrentShapes: () => Shape[]
  addShapes: (shapes: Shape[]) => void
  cropImage: (rect: Rect) => void
  clearShapes: (toolType?: string) => void
  getSnapshot?: () => ScreenshotsSnapshot
  restoreSnapshot?: (snapshot: ScreenshotsSnapshot) => void
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI Thông minh của VuaOffice Screenshots (360 CORP).
Nhiệm vụ của bạn là phân tích ảnh chụp màn hình mà người dùng gửi lên và thực thi các thao tác chỉnh sửa, chú thích, làm mờ dữ liệu nhạy cảm hoặc trích xuất văn bản thay cho con người.

# Nguyên tắc và quy định:
1. Bạn nhìn thấy ảnh chụp màn hình được đính kèm trong tin nhắn của người dùng. Tọa độ (0, 0) là góc trên bên trái của ảnh, trục X hướng sang phải, trục Y hướng xuống dưới theo đơn vị pixel thật của ảnh.
2. Khi người dùng yêu cầu che giấu / làm mờ / bảo mật thông tin (mật khẩu, email, số điện thoại, số CCCD, tài khoản ngân hàng, API key, token...):
   - Sử dụng công cụ auto_redact_sensitive với tọa độ chính xác của các vùng đó.
   - Thêm một viền đệm nhỏ (padding 2-4px) xung quanh văn bản để đảm bảo thông tin được che kín hoàn toàn.
3. Khi người dùng yêu cầu đánh dấu, chú thích, hướng dẫn thao tác (ví dụ: "chỉ vào nút đăng nhập", "vẽ khung đỏ quanh bảng số liệu", "đánh số bước 1 2 3"):
   - Sử dụng công cụ annotate_screenshot.
   - Với mũi tên (arrow), 'from' là đuôi mũi tên, 'to' là đầu nhọn chỉ vào đối tượng.
   - Với số thứ tự bước (step), 'at' là tâm hình tròn chứa số.
   - Với chữ chú thích (text), 'at' là vị trí đặt chữ.
   - Sử dụng màu nổi bật như đỏ (#e03131), vàng cam (#f08c00), hoặc xanh dương (#0077cd).
4. Khi người dùng yêu cầu crop / cắt ảnh:
   - Sử dụng công cụ crop_screenshot với tọa độ hình chữ nhật bao quanh vùng cần giữ lại.
5. Khi người dùng yêu cầu trích xuất văn bản (OCR) hoặc hỏi nội dung trong ảnh:
   - Đọc chính xác văn bản trên ảnh và gọi công cụ extract_text_ocr hoặc trả lời chi tiết, mạch lạc bằng tiếng Việt.
6. Khi hoàn tất thực thi các công cụ, hãy trả lời ngắn gọn, thân thiện, giải thích những gì bạn đã làm.`

export const SCREENSHOTS_TOOLS: AgentToolDef[] = [
  {
    name: 'auto_redact_sensitive',
    description:
      'Tự động che giấu / làm mờ (blur) các vùng chứa thông tin cá nhân, mật khẩu, email, số điện thoại, token hoặc số tài khoản trên ảnh chụp màn hình.',
    inputSchema: {
      type: 'object',
      properties: {
        targets: {
          type: 'array',
          description: 'Danh sách các vùng cần làm mờ trên ảnh',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'Tọa độ X góc trên bên trái' },
              y: { type: 'number', description: 'Tọa độ Y góc trên bên trái' },
              width: { type: 'number', description: 'Chiều rộng vùng cần che' },
              height: { type: 'number', description: 'Chiều cao vùng cần che' },
              label: {
                type: 'string',
                description: 'Loại thông tin nhạy cảm (vd: email, phone, token, password, balance)',
              },
            },
            required: ['x', 'y', 'width', 'height'],
          },
        },
      },
      required: ['targets'],
    },
  },
  {
    name: 'annotate_screenshot',
    description:
      'Thêm các hình vẽ chú thích lên ảnh chụp (khung chữ nhật, elip, mũi tên chỉ dẫn, đường thẳng, số thứ tự bước 1 2 3, hoặc chữ chú thích).',
    inputSchema: {
      type: 'object',
      properties: {
        annotations: {
          type: 'array',
          description: 'Danh sách các chú thích cần vẽ',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['rect', 'ellipse', 'arrow', 'line', 'step', 'text', 'blur'],
                description: 'Loại hình vẽ chú thích',
              },
              color: {
                type: 'string',
                description: 'Mã màu hex (mặc định #e03131 màu đỏ hoặc #0077cd xanh)',
              },
              width: {
                type: 'number',
                description: 'Độ dày nét vẽ (2, 4, hoặc 8, mặc định 4)',
              },
              x: { type: 'number', description: 'Tọa độ X cho rect, ellipse, blur, step, text' },
              y: { type: 'number', description: 'Tọa độ Y cho rect, ellipse, blur, step, text' },
              rectWidth: { type: 'number', description: 'Chiều rộng hình cho rect, ellipse, blur' },
              rectHeight: { type: 'number', description: 'Chiều cao hình cho rect, ellipse, blur' },
              from: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' } },
                description: 'Điểm gốc (đuôi mũi tên) cho arrow hoặc line',
              },
              to: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' } },
                description: 'Điểm ngọn (đầu mũi tên) cho arrow hoặc line',
              },
              text: { type: 'string', description: 'Nội dung chữ cho chú thích text' },
              stepNumber: { type: 'number', description: 'Số thứ tự cho step (1, 2, 3...)' },
              fontSize: { type: 'number', description: 'Cỡ chữ cho text (mặc định 16)' },
            },
            required: ['type'],
          },
        },
      },
      required: ['annotations'],
    },
  },
  {
    name: 'crop_screenshot',
    description: 'Cắt ảnh chụp theo vùng hình chữ nhật để tập trung vào nội dung trọng tâm.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Tọa độ X góc trên bên trái' },
        y: { type: 'number', description: 'Tọa độ Y góc trên bên trái' },
        width: { type: 'number', description: 'Chiều rộng vùng cắt' },
        height: { type: 'number', description: 'Chiều cao vùng cắt' },
        reason: { type: 'string', description: 'Mô tả mục đích cắt' },
      },
      required: ['x', 'y', 'width', 'height'],
    },
  },
  {
    name: 'extract_text_ocr',
    description: 'Trích xuất và trả về văn bản nhìn thấy trong ảnh chụp màn hình.',
    inputSchema: {
      type: 'object',
      properties: {
        extractedText: {
          type: 'string',
          description: 'Toàn bộ nội dung văn bản trích xuất được từ ảnh',
        },
      },
      required: ['extractedText'],
    },
  },
  {
    name: 'clear_annotations',
    description: 'Xóa các hình chú thích trên ảnh (xóa tất cả hoặc theo loại).',
    inputSchema: {
      type: 'object',
      properties: {
        toolType: {
          type: 'string',
          enum: ['all', 'blur', 'arrow', 'rect', 'ellipse', 'line', 'step', 'text'],
          description: 'Loại chú thích muốn xóa, mặc định all để xóa toàn bộ',
        },
      },
    },
  },
]

export function createScreenshotsSkill(deps: ScreenshotsAiDeps): AgentSkill {
  return {
    id: 'screenshots',
    get systemPrompt() {
      return SYSTEM_PROMPT
    },
    get tools() {
      return SCREENSHOTS_TOOLS
    },
    buildContext: () => {
      const dim = deps.getImageDimensions()
      const shapes = deps.getCurrentShapes()
      return `Thông tin ảnh hiện tại: Kích thước ${dim.width}x${dim.height}px. Đang có ${shapes.length} hình chú thích trên ảnh.`
    },
    executeTool: async (call: AgentToolCall): Promise<ToolExecution> => {
      const { name, input } = call

      if (name === 'auto_redact_sensitive') {
        const targets = Array.isArray(input.targets) ? input.targets : []
        if (targets.length === 0) {
          return {
            output: 'Không tìm thấy vùng dữ liệu nhạy cảm nào cần che.',
            summary: 'Không có dữ liệu nhạy cảm',
            mutated: false,
          }
        }

        const newShapes: Shape[] = targets.map((t: any, idx: number) => ({
          id: `ai-blur-${Date.now()}-${idx}`,
          tool: 'blur' as const,
          color: '#e03131',
          width: 4,
          rect: {
            x: Math.max(0, Math.round(Number(t.x) || 0)),
            y: Math.max(0, Math.round(Number(t.y) || 0)),
            width: Math.max(10, Math.round(Number(t.width) || 10)),
            height: Math.max(10, Math.round(Number(t.height) || 10)),
          },
        }))

        deps.addShapes(newShapes)
        const labels = targets
          .map((t: any) => t.label)
          .filter(Boolean)
          .join(', ')
        return {
          output: `Đã làm mờ thành công ${targets.length} vùng thông tin nhạy cảm${labels ? ` (${labels})` : ''}.`,
          summary: `Đã che ${targets.length} vùng nhạy cảm`,
          mutated: true,
        }
      }

      if (name === 'annotate_screenshot') {
        const list = Array.isArray(input.annotations) ? input.annotations : []
        if (list.length === 0) {
          return {
            output: 'Danh sách chú thích rỗng.',
            summary: 'Không có chú thích mới',
            mutated: false,
          }
        }

        const newShapes: Shape[] = []
        for (let i = 0; i < list.length; i++) {
          const item = list[i]
          const id = `ai-shape-${Date.now()}-${i}`
          const color = typeof item.color === 'string' ? item.color : '#e03131'
          const width = Number(item.width) || 4

          if (item.type === 'arrow' || item.type === 'line') {
            const from: Point = {
              x: Math.round(Number(item.from?.x) || Number(item.x) || 0),
              y: Math.round(Number(item.from?.y) || Number(item.y) || 0),
            }
            const to: Point = {
              x: Math.round(Number(item.to?.x) || from.x + 80),
              y: Math.round(Number(item.to?.y) || from.y + 40),
            }
            newShapes.push({
              id,
              tool: item.type,
              color,
              width,
              from,
              to,
            })
          } else if (item.type === 'rect' || item.type === 'ellipse' || item.type === 'blur') {
            const rect: Rect = {
              x: Math.round(Number(item.x) || 0),
              y: Math.round(Number(item.y) || 0),
              width: Math.max(8, Math.round(Number(item.rectWidth) || Number(item.width) || 60)),
              height: Math.max(8, Math.round(Number(item.rectHeight) || Number(item.height) || 40)),
            }
            newShapes.push({
              id,
              tool: item.type,
              color,
              width,
              rect,
            })
          } else if (item.type === 'step') {
            const at: Point = {
              x: Math.round(Number(item.x) || 0),
              y: Math.round(Number(item.y) || 0),
            }
            const n = Math.max(1, Math.round(Number(item.stepNumber) || 1))
            newShapes.push({
              id,
              tool: 'step',
              color,
              width,
              at,
              n,
            })
          } else if (item.type === 'text') {
            const at: Point = {
              x: Math.round(Number(item.x) || 0),
              y: Math.round(Number(item.y) || 0),
            }
            const text = typeof item.text === 'string' ? item.text : ''
            const size = Math.max(10, Math.round(Number(item.fontSize) || 16))
            newShapes.push({
              id,
              tool: 'text',
              color,
              width,
              at,
              text,
              size,
            })
          }
        }

        deps.addShapes(newShapes)
        return {
          output: `Đã thêm thành công ${newShapes.length} chú thích lên ảnh.`,
          summary: `Đã thêm ${newShapes.length} chú thích`,
          mutated: true,
        }
      }

      if (name === 'crop_screenshot') {
        const dim = deps.getImageDimensions()
        const x = Math.max(0, Math.round(Number(input.x) || 0))
        const y = Math.max(0, Math.round(Number(input.y) || 0))
        const width = Math.min(dim.width - x, Math.max(20, Math.round(Number(input.width) || 100)))
        const height = Math.min(
          dim.height - y,
          Math.max(20, Math.round(Number(input.height) || 100)),
        )

        deps.cropImage({ x, y, width, height })
        return {
          output: `Đã cắt ảnh theo vùng ${width}x${height}px tại toạ độ (${x}, ${y}).`,
          summary: `Đã cắt ảnh (${width}x${height}px)`,
          mutated: true,
        }
      }

      if (name === 'extract_text_ocr') {
        const extracted = typeof input.extractedText === 'string' ? input.extractedText : ''
        return {
          output: extracted,
          summary: 'Đã trích xuất văn bản OCR',
          mutated: false,
        }
      }

      if (name === 'clear_annotations') {
        const toolType = typeof input.toolType === 'string' ? input.toolType : 'all'
        deps.clearShapes(toolType)
        return {
          output: `Đã xóa chú thích (${toolType}).`,
          summary: `Đã xóa chú thích (${toolType})`,
          mutated: true,
        }
      }

      return {
        output: `Không tìm thấy công cụ ${name}`,
        isError: true,
        summary: name,
      }
    },
  }
}
