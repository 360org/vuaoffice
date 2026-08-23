import { contextBridge, ipcRenderer } from 'electron'
import { VUA_MAIL_IPC } from '../shared/ipc-events'
import type { EmailAccount, EmailBody, EmailMessage, MailFolder, VuaMailApi } from '../shared/types'

const api: VuaMailApi = {
  getAccounts: (): Promise<EmailAccount[]> => ipcRenderer.invoke(VUA_MAIL_IPC.GET_ACCOUNTS),
  addAccount: (account): Promise<EmailAccount> => ipcRenderer.invoke(VUA_MAIL_IPC.ADD_ACCOUNT, account),
  removeAccount: (accountId: string): Promise<boolean> => ipcRenderer.invoke(VUA_MAIL_IPC.REMOVE_ACCOUNT, accountId),
  setPrimaryAccount: (accountId: string): Promise<boolean> => ipcRenderer.invoke(VUA_MAIL_IPC.SET_PRIMARY_ACCOUNT, accountId),
  getFolders: (accountId: string): Promise<MailFolder[]> => ipcRenderer.invoke(VUA_MAIL_IPC.GET_FOLDERS, accountId),
  getEmails: (folderId: string, category?: 'focused' | 'other'): Promise<EmailMessage[]> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.GET_EMAILS, folderId, category),
  getEmailBody: (emailId: string): Promise<EmailBody | null> => ipcRenderer.invoke(VUA_MAIL_IPC.GET_EMAIL_BODY, emailId),
  markRead: (emailId: string, isRead: boolean): Promise<void> => ipcRenderer.invoke(VUA_MAIL_IPC.MARK_READ, emailId, isRead),
  toggleStarred: (emailId: string): Promise<boolean> => ipcRenderer.invoke(VUA_MAIL_IPC.TOGGLE_STARRED, emailId),
  deleteEmail: (emailId: string): Promise<void> => ipcRenderer.invoke(VUA_MAIL_IPC.DELETE_EMAIL, emailId),
  archiveEmail: (emailId: string): Promise<void> => ipcRenderer.invoke(VUA_MAIL_IPC.ARCHIVE_EMAIL, emailId),
  moveEmail: (emailId: string, targetFolderId: string, targetAccountId?: string): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.MOVE_EMAIL, emailId, targetFolderId, targetAccountId),
  restoreEmail: (emailId: string): Promise<{ success: boolean; restoredFolderId?: string }> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.RESTORE_EMAIL, emailId),
  sendEmail: (draft): Promise<{ success: boolean; emailId?: string }> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.SEND_EMAIL, draft),
  openAttachment: (attachment): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.OPEN_ATTACHMENT, attachment),
  syncNow: (): Promise<any> => ipcRenderer.invoke(VUA_MAIL_IPC.SYNC_NOW),
  getSyncStatus: (): Promise<any> => ipcRenderer.invoke(VUA_MAIL_IPC.GET_SYNC_STATUS),
  startOAuthFlow: (provider, emailHint): Promise<any> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.START_OAUTH_FLOW, provider, emailHint),
  cancelOAuthFlow: (): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.CANCEL_OAUTH_FLOW),
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.GET_APP_VERSION),
  openEmailPopup: (emailId: string): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.OPEN_EMAIL_POPUP, emailId),
  printEmail: (emailId: string): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.PRINT_EMAIL, emailId),
  saveEmailEml: (emailId: string): Promise<boolean> =>
    ipcRenderer.invoke(VUA_MAIL_IPC.SAVE_EMAIL_EML, emailId),
  getAiSettings: (): Promise<any> => ipcRenderer.invoke('ai:get-settings'),
  aiStream: (request: any): Promise<void> => ipcRenderer.invoke('ai:stream', request),
  aiStreamCancel: (requestId: string): Promise<void> => ipcRenderer.invoke('ai:stream-cancel', requestId),
  onAiStream: (handler: (chunk: any) => void) => {
    const listener = (_event: any, chunk: any) => handler(chunk)
    ipcRenderer.on('ai:stream-chunk', listener)
    return () => ipcRenderer.removeListener('ai:stream-chunk', listener)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('vuaMail', api)
  } catch (error) {
    console.error('Failed to expose vuaMail via contextBridge', error)
  }
} else {
  // @ts-ignore
  window.vuaMail = api
}
