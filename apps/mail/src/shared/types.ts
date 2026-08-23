export interface EmailAccount {
  id: string
  email: string
  name: string
  provider: 'google' | 'microsoft' | 'custom_imap'
  avatarUrl?: string
  isDefault?: boolean
  imapHost?: string
  imapPort?: number
}

export type FolderKind = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'junk' | 'custom'

export interface MailFolder {
  id: string
  accountId: string
  name: string
  kind: FolderKind
  iconName: string
  unreadCount: number
  totalCount: number
  isFavorite?: boolean
}

export interface EmailAttachment {
  id: string
  filename: string
  sizeBytes: number
  mimeType: string
  url?: string
}

export interface EmailMessage {
  id: string
  accountId: string
  folderId: string
  senderName: string
  senderEmail: string
  recipientEmails: string[]
  ccEmails?: string[]
  bccEmails?: string[]
  subject: string
  snippet: string
  dateIso: string
  isRead: boolean
  isStarred: boolean
  isImportant?: boolean
  isDraft?: boolean
  previousFolderId?: string
  hasAttachments: boolean
  attachments?: EmailAttachment[]
  category?: 'focused' | 'other'
}

export interface EmailBody {
  emailId: string
  html: string
  plainText: string
}

export interface MailOp {
  id: string
  opType: 'mark_read' | 'mark_unread' | 'delete' | 'archive' | 'move_folder' | 'send_draft'
  emailId: string
  payloadJson: string
  createdAt: number
}

export interface ContactInfo {
  id: string
  name: string
  email: string
  jobTitle?: string
  department?: string
  company?: string
  phone?: string
  isFavorite?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  startIso: string
  endIso: string
  location?: string
  description?: string
  isAllDay?: boolean
  category?: 'work' | 'personal' | 'important'
}

export interface TodoItem {
  id: string
  title: string
  isCompleted: boolean
  dueDateIso?: string
  priority?: 'high' | 'normal' | 'low'
}

export interface SyncStatus {
  isSyncing: boolean
  lastSyncTimeIso: string | null
  syncedCount: number
  pendingOpsCount: number
  error: string | null
}

export interface VuaMailApi {
  getAccounts: () => Promise<EmailAccount[]>
  addAccount: (account: {
    email: string
    name: string
    provider: 'google' | 'microsoft' | 'custom_imap'
    imapHost?: string
    imapPort?: number
    smtpHost?: string
    smtpPort?: number
    password?: string
  }) => Promise<EmailAccount>
  removeAccount: (accountId: string) => Promise<boolean>
  setPrimaryAccount: (accountId: string) => Promise<boolean>
  getFolders: (accountId: string) => Promise<MailFolder[]>
  getEmails: (folderId: string, category?: 'focused' | 'other') => Promise<EmailMessage[]>
  getEmailBody: (emailId: string) => Promise<EmailBody | null>
  markRead: (emailId: string, isRead: boolean) => Promise<void>
  toggleStarred: (emailId: string) => Promise<boolean>
  deleteEmail: (emailId: string) => Promise<void>
  archiveEmail: (emailId: string) => Promise<void>
  moveEmail: (emailId: string, targetFolderId: string, targetAccountId?: string) => Promise<boolean>
  restoreEmail: (emailId: string) => Promise<{ success: boolean; restoredFolderId?: string }>
  sendEmail: (draft: {
    accountId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
    attachments?: EmailAttachment[]
  }) => Promise<{ success: boolean; emailId?: string }>
  openAttachment: (attachment: EmailAttachment) => Promise<boolean>
  syncNow: () => Promise<SyncStatus>
  getSyncStatus: () => Promise<SyncStatus>
  startOAuthFlow: (
    provider: 'google' | 'microsoft' | 'microsoft_personal' | '360' | 'icloud' | 'yahoo' | 'exchange' | 'auto',
    emailHint?: string
  ) => Promise<{
    success: boolean
    account?: EmailAccount
    error?: string
  }>
  cancelOAuthFlow: () => Promise<boolean>
  getAppVersion?: () => Promise<string>
  openEmailPopup?: (emailId: string) => Promise<boolean>
  printEmail?: (emailId: string) => Promise<boolean>
  saveEmailEml?: (emailId: string) => Promise<boolean>
  getAiSettings?: () => Promise<any>
  aiStream?: (request: any) => Promise<void>
  aiStreamCancel?: (requestId: string) => Promise<void>
  onAiStream?: (handler: (chunk: any) => void) => () => void
}

declare global {
  interface Window {
    vuaMail?: VuaMailApi
  }
}
