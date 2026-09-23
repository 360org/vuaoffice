import { parentPort, workerData } from 'node:worker_threads'
import Database from 'better-sqlite3'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { SQLITE_SCHEMA } from './schema'

interface WorkerRequest {
  id: string
  action: string
  payload?: any
}

const dbDir = workerData?.dbDir || '/tmp'
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbFilePath = path.join(dbDir, 'mail-local.db')
const db = new Database(dbFilePath)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.exec(SQLITE_SCHEMA)

// Seed demo data if database is empty
const count = (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }).c
if (count === 0) {
  const accountId = 'acc_primary'
  const accountId2 = 'acc_secondary'
  const now = Date.now()

  db.prepare(`
    INSERT INTO accounts (id, email, name, provider, is_default, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(accountId, 'chau.le@360.org.vn', 'Châu Lê (360 CORP)', 'google', now)

  db.prepare(`
    INSERT INTO accounts (id, email, name, provider, is_default, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(accountId2, 'ceo@vuahethong.com', 'Châu Lê (Vua Hệ Thống)', 'microsoft', now)

  const folders = [
    { id: 'f_inbox', accountId, name: 'Inbox', kind: 'inbox', icon: 'Inbox', unread: 2, total: 12, fav: 1 },
    { id: 'f_drafts', accountId, name: 'Drafts', kind: 'drafts', icon: 'Drafts', unread: 0, total: 2, fav: 1 },
    { id: 'f_sent', accountId, name: 'Sent Items', kind: 'sent', icon: 'Send', unread: 0, total: 25, fav: 1 },
    { id: 'f_archive', accountId, name: 'Archive', kind: 'archive', icon: 'Archive', unread: 0, total: 40, fav: 0 },
    { id: 'f_trash', accountId, name: 'Deleted Items', kind: 'trash', icon: 'Delete', unread: 0, total: 5, fav: 0 },

    { id: 'f2_inbox', accountId: accountId2, name: 'Inbox', kind: 'inbox', icon: 'Inbox', unread: 4, total: 18, fav: 1 },
    { id: 'f2_sent', accountId: accountId2, name: 'Sent Items', kind: 'sent', icon: 'Send', unread: 0, total: 10, fav: 1 },
    { id: 'f2_archive', accountId: accountId2, name: 'Archive', kind: 'archive', icon: 'Archive', unread: 0, total: 15, fav: 0 },
  ]

  const folderStmt = db.prepare(`
    INSERT INTO email_folders (id, account_id, name, kind, icon_name, unread_count, total_count, is_favorite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const f of folders) {
    folderStmt.run(f.id, f.accountId, f.name, f.kind, f.icon, f.unread, f.total, f.fav)
  }

  const demoEmails = [
    {
      id: 'msg_001',
      threadId: 'thread_001',
      folderId: 'f_inbox',
      subject: 'Thông báo Kế hoạch Ra mắt GenOffice 0.6.7 & GenOffice Mail Module',
      senderName: 'GenOffice Core Team',
      senderEmail: 'dev@360.org.vn',
      recipientSummary: 'Châu Lê, All Team',
      snippet: 'Kính gửi Sếp Châu, hệ sinh thái GenOffice đã hoàn thiện bổ sung module GenOffice Mail theo chuẩn Outlook UI...',
      bodyText: 'Kính gửi Sếp Châu,\n\nĐội ngũ phát triển GenOffice xin báo cáo tiến độ cập nhật GenOffice 0.6.7 với module GenOffice Mail:\n- Tích hợp giao diện 3-Pane Outlook phong cách hiện đại.\n- Bộ đệm dữ liệu SQLite Local-First, hỗ trợ tìm kiếm siêu tốc độ.\n- Sẵn sàng tích hợp trợ lý AI thông minh.\n\nTrân trọng,\nGenOffice Team',
      bodyHtml: '<p>Kính gửi <b>Sếp Châu</b>,</p><p>Đội ngũ phát triển GenOffice xin báo cáo tiến độ cập nhật <b>GenOffice 0.6.7</b> với module <b>GenOffice Mail</b>:</p><ul><li>Tích hợp giao diện 3-Pane Outlook phong cách hiện đại.</li><li>Bộ đệm dữ liệu SQLite Local-First, hỗ trợ tìm kiếm siêu tốc độ.</li><li>Sẵn sàng tích hợp trợ lý AI thông minh.</li></ul><p>Trân trọng,<br><b>GenOffice Team</b></p>',
      receivedAt: now - 1000 * 60 * 15,
      isUnread: 1,
      isStarred: 1,
      hasAttachments: 1,
      attachments: JSON.stringify([
        {
          id: 'att_01',
          name: 'GenOffice-Architecture-Overview.pdf',
          size: '2.4 MB',
          ext: 'pdf',
          path: '/Volumes/DATA/DEV/GenOffice Mail/docs/mail/ARCH.md',
        },
        {
          id: 'att_02',
          name: 'GenOffice Mail-Specification.docx',
          size: '1.1 MB',
          ext: 'docx',
          path: '/Volumes/DATA/DEV/GenOffice Mail/docs/mail/SPEC.md',
        },
      ]),
    },
    {
      id: 'msg_002',
      threadId: 'thread_002',
      folderId: 'f_inbox',
      subject: 'Báo cáo doanh thu & KPIs tuần - Vua Hệ Thống',
      senderName: 'Nguyễn Văn A',
      senderEmail: 'anguyen@vuahethong.com',
      recipientSummary: 'ceo@vuahethong.com',
      snippet: 'Báo cáo doanh thu tuần vừa qua của các cụm máy chủ SaaS đã tăng trưởng 25% so với cùng kỳ...',
      bodyText: 'Chào anh Châu,\n\nEm gửi anh báo cáo KPIs tuần qua. Mọi chỉ số vận hành trên cluster vuahethong đều ổn định.\n\nThanks anh!',
      bodyHtml: '<p>Chào anh Châu,</p><p>Em gửi anh báo cáo KPIs tuần qua. Mọi chỉ số vận hành trên cluster <code>vuahethong</code> đều ổn định.</p><p>Thanks anh!</p>',
      receivedAt: now - 1000 * 60 * 60 * 3,
      isUnread: 1,
      isStarred: 0,
      hasAttachments: 0,
      attachments: JSON.stringify([]),
    },
  ]

  const emailStmt = db.prepare(`
    INSERT INTO emails (
      id, thread_id, folder_id, subject, sender_name, sender_email,
      recipient_summary, snippet, body_text, body_html, received_at,
      is_unread, is_starred, has_attachments, attachments_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const e of demoEmails) {
    emailStmt.run(
      e.id, e.threadId, e.folderId, e.subject, e.senderName, e.senderEmail,
      e.recipientSummary, e.snippet, e.bodyText, e.bodyHtml, e.receivedAt,
      e.isUnread, e.isStarred, e.hasAttachments, e.attachments
    )
  }
}

if (parentPort) {
  parentPort.on('message', (req: WorkerRequest) => {
    try {
      let result: any = null
      switch (req.action) {
        case 'listAccounts': {
          result = db.prepare('SELECT id, email, name, provider, is_default as isDefault FROM accounts ORDER BY created_at ASC').all()
          break
        }
        case 'listFolders': {
          const accountId = req.payload?.accountId
          const query = accountId
            ? 'SELECT id, account_id as accountId, name, kind, icon_name as iconName, unread_count as unreadCount, total_count as totalCount, is_favorite as isFavorite FROM email_folders WHERE account_id = ?'
            : 'SELECT id, account_id as accountId, name, kind, icon_name as iconName, unread_count as unreadCount, total_count as totalCount, is_favorite as isFavorite FROM email_folders'
          result = accountId ? db.prepare(query).all(accountId) : db.prepare(query).all()
          break
        }
        case 'listEmails': {
          const { folderId, query } = req.payload || {}
          let sql = `
            SELECT
              id, thread_id as threadId, folder_id as folderId,
              subject, sender_name as senderName, sender_email as senderEmail,
              recipient_summary as recipientSummary, snippet,
              received_at as receivedAt, is_unread as isUnread,
              is_starred as isStarred, is_draft as isDraft,
              has_attachments as hasAttachments,
              attachments_json as attachmentsJson
            FROM emails
          `
          const params: any[] = []
          const clauses: string[] = []

          if (folderId) {
            clauses.push('folder_id = ?')
            params.push(folderId)
          }
          if (query) {
            clauses.push('(subject LIKE ? OR sender_name LIKE ? OR snippet LIKE ?)')
            const q = `%${query}%`
            params.push(q, q, q)
          }
          if (clauses.length > 0) {
            sql += ' WHERE ' + clauses.join(' AND ')
          }
          sql += ' ORDER BY received_at DESC LIMIT 100'

          const rows = db.prepare(sql).all(...params) as any[]
          result = rows.map((r) => ({
            ...r,
            isUnread: Boolean(r.isUnread),
            isStarred: Boolean(r.isStarred),
            isDraft: Boolean(r.isDraft),
            hasAttachments: Boolean(r.hasAttachments),
            attachments: JSON.parse(r.attachmentsJson || '[]'),
          }))
          break
        }
        case 'getEmailBody': {
          const id = req.payload?.id
          const row = db.prepare('SELECT id, body_text as bodyText, body_html as bodyHtml FROM emails WHERE id = ?').get(id) as any
          result = row ? { id: row.id, text: row.bodyText, html: row.bodyHtml } : null
          break
        }
        case 'markAsRead': {
          const { id, isUnread } = req.payload
          db.prepare('UPDATE emails SET is_unread = ? WHERE id = ?').run(isUnread ? 1 : 0, id)
          result = { success: true }
          break
        }
        case 'toggleStarred': {
          const { id } = req.payload
          const row = db.prepare('SELECT is_starred FROM emails WHERE id = ?').get(id) as any
          const next = row?.is_starred ? 0 : 1
          db.prepare('UPDATE emails SET is_starred = ? WHERE id = ?').run(next, id)
          result = { isStarred: Boolean(next) }
          break
        }
        case 'deleteEmail': {
          const { id } = req.payload
          db.prepare('UPDATE emails SET folder_id = "f_trash" WHERE id = ?').run(id)
          result = { success: true }
          break
        }
        default:
          throw new Error(`Unknown worker action: ${req.action}`)
      }
      parentPort!.postMessage({ id: req.id, success: true, result })
    } catch (err: any) {
      parentPort!.postMessage({ id: req.id, success: false, error: err.message })
    }
  })
}
