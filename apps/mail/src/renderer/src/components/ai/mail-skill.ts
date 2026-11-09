import type { AgentSkill, AgentToolCall } from '@genoffice/agent-core'
import type { EmailMessage, EmailBody } from '../../../../shared/types'

export interface MailSkillCallbacks {
  getSelectedEmail: () => EmailMessage | null
  getEmailBody: (emailId: string) => Promise<EmailBody | null>
  onDraftReply: (replyText: string) => void
  onCreateTodo: (taskTitle: string) => void
  onCreateCalendarEvent: (event: { title: string; dateIso: string; time?: string; location?: string }) => void
}

const MAIL_SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên nghiệp cho VuaOffice Mail (thuộc VuaOffice Suite - 360 CORP).
Bạn hỗ trợ Sếp/người dùng xử lý email, soạn thư trả lời thông minh, trích xuất việc cần làm (To-Do), lên lịch họp Calendar và tóm tắt thông tin thư.

## Hướng dẫn sử dụng Công cụ (Tool Usage):
1. Khi người dùng yêu cầu tóm tắt email hoặc hỏi thông tin về email đang chọn:
   - Dùng tool get_current_email để đọc chi tiết thư đang chọn nếu cần.
   - Trả lời súc tích, chuyên nghiệp bằng tiếng Việt.
2. Khi người dùng yêu cầu soạn thư trả lời hoặc đồng ý nội dung:
   - Dùng tool draft_reply để điền nội dung vào khung soạn thư.
3. Khi người dùng muốn tạo công việc hoặc phát hiện việc cần làm trong email:
   - Dùng tool create_todo_task để thêm vào danh sách To-Do.
4. Khi người dùng muốn đặt lịch họp hoặc email có hẹn lịch:
   - Dùng tool schedule_calendar_event để ghi nhận lịch hẹn.
`

export function createMailSkill(callbacks: MailSkillCallbacks): AgentSkill {
  return {
    id: 'mail',
    systemPrompt: MAIL_SYSTEM_PROMPT,
    tools: [
      {
        name: 'get_current_email',
        description: 'Lấy thông tin chi tiết (người gửi, người nhận, tiêu đề, ngày, nội dung đầy đủ) của email đang được chọn.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'draft_reply',
        description: 'Soạn thảo nội dung thư trả lời và đưa vào khung soạn thảo của VuaOffice Mail.',
        inputSchema: {
          type: 'object',
          properties: {
            replyText: {
              type: 'string',
              description: 'Nội dung thư phản hồi hoàn chỉnh, trang trọng và đúng ngữ cảnh.',
            },
          },
          required: ['replyText'],
        },
      },
      {
        name: 'create_todo_task',
        description: 'Trích xuất hoặc tạo mới một nhiệm vụ công việc vào danh mục To-Do của VuaOffice.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Tiêu đề công việc cần làm.',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'schedule_calendar_event',
        description: 'Tạo một sự kiện hoặc lịch họp mới trong Calendar của VuaOffice.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Tiêu đề cuộc họp hoặc sự kiện.',
            },
            dateIso: {
              type: 'string',
              description: 'Ngày diễn ra theo định dạng YYYY-MM-DD hoặc ISO.',
            },
            time: {
              type: 'string',
              description: 'Thời gian (VD: 09:00 - 10:00).',
            },
            location: {
              type: 'string',
              description: 'Địa điểm hoặc link họp (Google Meet / Zoom / Office).',
            },
          },
          required: ['title', 'dateIso'],
        },
      },
    ],
    buildContext: () => {
      const email = callbacks.getSelectedEmail()
      if (!email) {
        return 'Ngữ cảnh hiện tại: Chưa có email nào được chọn trong danh sách thư.'
      }
      return [
        '## Email đang chọn:',
        `- Người gửi: ${email.senderName} <${email.senderEmail}>`,
        `- Người nhận: ${email.recipientEmails.join(', ')}`,
        `- Tiêu đề: ${email.subject}`,
        `- Thời gian: ${email.dateIso}`,
        `- Trích đoạn nội dung: ${email.snippet}`,
        `- Trạng thái: ${email.isRead ? 'Đã đọc' : 'Chưa đọc'}, ${email.isStarred ? 'Gắn cờ sao' : 'Bình thường'}`,
      ].join('\n')
    },
    executeTool: async (call: AgentToolCall) => {
      if (call.name === 'get_current_email') {
        const email = callbacks.getSelectedEmail()
        if (!email) {
          return {
            output: 'Không có email nào đang được chọn.',
            isError: true,
            summary: 'Đọc email hiện tại',
          }
        }
        const body = await callbacks.getEmailBody(email.id)
        return {
          output: JSON.stringify({
            sender: `${email.senderName} <${email.senderEmail}>`,
            to: email.recipientEmails,
            subject: email.subject,
            date: email.dateIso,
            textBody: body?.plainText || email.snippet,
          }),
          mutated: false,
          summary: `Đọc nội dung email: ${email.subject}`,
        }
      }

      if (call.name === 'draft_reply') {
        const replyText = String(call.input?.replyText || '')
        if (!replyText) {
          return { output: 'Thiếu nội dung thư trả lời.', isError: true, summary: 'Soạn thư trả lời' }
        }
        callbacks.onDraftReply(replyText)
        return {
          output: 'Đã đưa nội dung thư trả lời vào khung soạn thảo thành công.',
          mutated: true,
          summary: 'Soạn thư trả lời',
        }
      }

      if (call.name === 'create_todo_task') {
        const title = String(call.input?.title || '')
        if (!title) {
          return { output: 'Thiếu tiêu đề việc cần làm.', isError: true, summary: 'Tạo việc To-Do' }
        }
        callbacks.onCreateTodo(title)
        return {
          output: `Đã tạo công việc: "${title}" vào danh sách To-Do.`,
          mutated: true,
          summary: `Tạo To-Do: ${title}`,
        }
      }

      if (call.name === 'schedule_calendar_event') {
        const { title, dateIso, time, location } = call.input as any
        if (!title) {
          return { output: 'Thiếu tiêu đề sự kiện.', isError: true, summary: 'Lên lịch Calendar' }
        }
        callbacks.onCreateCalendarEvent({ title, dateIso, time, location })
        return {
          output: `Đã lên lịch sự kiện: "${title}" vào ngày ${dateIso}.`,
          mutated: true,
          summary: `Tạo lịch họp: ${title}`,
        }
      }

      return {
        output: `Công cụ không xác định: ${call.name}`,
        isError: true,
        summary: call.name,
      }
    },
  }
}
