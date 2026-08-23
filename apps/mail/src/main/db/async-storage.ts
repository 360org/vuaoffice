import type { EmailAccount, EmailBody, EmailMessage, MailFolder } from '../../shared/types'
import { SQLiteMailStorage } from './sqlite-storage'

// ponytail: shared storage singleton avoids file overwrite races across IPC and Orchestrator
export class AsyncMailStorage {
  public storage: SQLiteMailStorage

  constructor(storageInstance?: SQLiteMailStorage, customPath?: string) {
    this.storage = storageInstance || new SQLiteMailStorage(customPath)
  }

  async getAccounts(): Promise<EmailAccount[]> {
    return this.storage.getAccounts()
  }

  async addAccount(account: {
    email: string
    name: string
    provider: 'google' | 'microsoft' | 'custom_imap'
    imapHost?: string
    imapPort?: number
    smtpHost?: string
    smtpPort?: number
    password?: string
  }): Promise<EmailAccount> {
    return this.storage.addAccount(account)
  }

  async removeAccount(accountId: string): Promise<boolean> {
    return this.storage.removeAccount(accountId)
  }

  async setPrimaryAccount(accountId: string): Promise<boolean> {
    return this.storage.setPrimaryAccount(accountId)
  }

  async getFolders(accountId?: string): Promise<MailFolder[]> {
    return this.storage.getFolders(accountId || 'acc_primary')
  }

  async getEmails(folderId: string, category?: 'focused' | 'other'): Promise<EmailMessage[]> {
    return this.storage.getEmails(folderId, category)
  }

  async getEmailBody(emailId: string): Promise<EmailBody | null> {
    return this.storage.getEmailBody(emailId)
  }

  async markRead(emailId: string, isRead: boolean): Promise<void> {
    this.storage.markRead(emailId, isRead)
  }

  async toggleStarred(emailId: string): Promise<boolean> {
    return this.storage.toggleStarred(emailId)
  }

  async deleteEmail(emailId: string): Promise<void> {
    this.storage.deleteEmail(emailId)
  }

  async archiveEmail(emailId: string): Promise<void> {
    this.storage.archiveEmail(emailId)
  }

  async moveEmail(emailId: string, targetFolderId: string, targetAccountId?: string): Promise<boolean> {
    return this.storage.moveEmail(emailId, targetFolderId, targetAccountId)
  }

  async restoreEmail(emailId: string): Promise<{ success: boolean; restoredFolderId?: string }> {
    return this.storage.restoreEmail(emailId)
  }

  async sendEmail(draft: {
    accountId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
  }): Promise<{ success: boolean; emailId?: string }> {
    return this.storage.sendEmail(draft)
  }
}
