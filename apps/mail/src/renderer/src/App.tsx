import React, { useEffect, useState } from 'react'
import { AppRail, AppRailTab } from './components/sidebar/AppRail'
import { FolderTree } from './components/sidebar/FolderTree'
import { MailRibbon } from './components/ribbon/MailRibbon'
import { MailList } from './components/list/MailList'
import { ReadingPane } from './components/detail/ReadingPane'
import { ComposeModal } from './components/compose/ComposeModal'
import { PeopleView } from './components/people/PeopleView'
import { CalendarView } from './components/calendar/CalendarView'
import { TodoView } from './components/todo/TodoView'
import { BrainView } from './components/brain/BrainView'
import { ProfileView } from './components/profile/ProfileView'
import { ImportExportModal } from './components/wizard/ImportExportModal'
import { RulesModal } from './components/rules/RulesModal'
import { AiPanel } from './components/ai/AiPanel'
import { SettingsModal } from './components/settings/SettingsModal'
import type { MailFilterRule } from '@genoffice/mail-engine'
import type { EmailAccount, EmailBody, EmailMessage, MailFolder } from '../../shared/types'
import './styles/mail-theme.css'

export const App: React.FC = () => {
  const [activeRailTab, setActiveRailTab] = useState<AppRailTab>('mail')
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string>('acc_primary')
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string>('f_inbox')
  const [categoryTab, setCategoryTab] = useState<string>('all')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [activeBody, setActiveBody] = useState<EmailBody | null>(null)
  const [isLoadingBody, setIsLoadingBody] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true) // Sliding AI Dock
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [rules, setRules] = useState<MailFilterRule[]>([
    {
      id: 'r_vip',
      name: 'Thư quan trọng từ Sếp & Ban Giám Đốc',
      enabled: true,
      matchAllConditions: false,
      conditions: [
        { field: 'from', operator: 'contains', value: '360.org.vn' },
        { field: 'subject', operator: 'contains', value: 'Khẩn' },
      ],
      actions: [{ type: 'markAsStarred' }],
    },
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [composeInitial, setComposeInitial] = useState<{
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    body?: string
  }>({})
  const [isSyncing, setIsSyncing] = useState(false)

  // Load initial accounts & all folders
  useEffect(() => {
    async function loadInitial() {
      if (!window.vuaMail) return
      const api = window.vuaMail
      const accList = await api.getAccounts()
      setAccounts(accList)
      if (accList.length > 0) {
        const primary = accList[0]
        setActiveAccountId('all_accounts')

        // Fetch folders for all individual accounts and the unified all_accounts
        const allFolderPromises = [
          api.getFolders('all_accounts'),
          ...accList.map((acc) => api.getFolders(acc.id)),
        ]
        const folderResults = await Promise.all(allFolderPromises)
        const combinedFolders = folderResults.flat()
        setFolders(combinedFolders)

        const defaultFolder =
          combinedFolders.find((f) => f.accountId === 'all_accounts' && f.kind === 'inbox') ||
          combinedFolders.find((f) => f.accountId === primary.id && f.kind === 'inbox') ||
          combinedFolders[0]
        if (defaultFolder) {
          setActiveFolderId(defaultFolder.id)
        }
      }
    }
    loadInitial()
  }, [])

  // Switch account handler
  const handleSelectAccount = (accountId: string) => {
    setActiveAccountId(accountId)
    const accFolder = folders.find((f) => f.accountId === accountId && f.kind === 'inbox') || folders.find((f) => f.accountId === accountId)
    if (accFolder) {
      setActiveFolderId(accFolder.id)
    }
  }

  // Switch folder handler
  const handleSelectFolder = (folderId: string, accountId: string) => {
    setActiveAccountId(accountId)
    setActiveFolderId(folderId)
  }

  // Load emails when folder or category changes
  useEffect(() => {
    async function loadEmails() {
      if (!window.vuaMail || !activeFolderId) return
      const list = await window.vuaMail.getEmails(
        activeFolderId,
        categoryTab === 'primary' ? 'focused' : categoryTab === 'all' ? undefined : 'other'
      )
      setEmails(list)
      if (list.length > 0) {
        setSelectedEmailId(list[0].id)
      } else {
        setSelectedEmailId(null)
        setActiveBody(null)
      }
    }
    loadEmails()
  }, [activeFolderId, categoryTab])

  // Load email body when selection changes
  useEffect(() => {
    async function loadBody() {
      if (!window.vuaMail || !selectedEmailId) {
        setActiveBody(null)
        setAiSummary(null)
        return
      }
      setIsLoadingBody(true)
      setAiSummary(null)
      const body = await window.vuaMail.getEmailBody(selectedEmailId)
      setActiveBody(body)
      setIsLoadingBody(false)
    }
    loadBody()
  }, [selectedEmailId])

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0] || null
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null
  const targetAccountForSelected = selectedEmail ? accounts.find((a) => a.id === selectedEmail.accountId) : null
  const activeFolder = folders.find((f) => f.id === activeFolderId)

  const filteredEmails = emails.filter((e) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.subject.toLowerCase().includes(q) ||
      e.senderName.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    )
  })

  const handleDelete = async () => {
    if (!window.vuaMail || !selectedEmailId) return
    await window.vuaMail.deleteEmail(selectedEmailId)
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmailId))
    setSelectedEmailId(null)
  }

  const handleArchive = async () => {
    if (!window.vuaMail || !selectedEmailId) return
    await window.vuaMail.archiveEmail(selectedEmailId)
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmailId))
    setSelectedEmailId(null)
  }

  const handleTriggerAiSummary = () => {
    if (!selectedEmail) return
    setIsAiPanelOpen(true)
    setAiSummary(
      `Tóm tắt nội dung chính:\n• Email thông báo tiến độ cập nhật và vận hành của hệ sinh thái VuaOffice Mail.\n• Đã kết nối thành công SQLite Engine và giao diện Fluent UI Outlook 365.\n• Đề xuất Sếp kiểm tra lại và duyệt release.`
    )
  }

  const handleSmartReply = (replyText: string) => {
    if (!selectedEmail) return
    setComposeInitial({
      to: selectedEmail.senderEmail,
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body: `${replyText}\n\n---\nOn ${new Date(selectedEmail.dateIso).toLocaleString()}, ${selectedEmail.senderName} wrote:\n> ${selectedEmail.snippet}`,
    })
    setIsComposeOpen(true)
  }

  const handleOpenComposeNew = () => {
    setComposeInitial({})
    setIsComposeOpen(true)
  }

  const handleReplySelected = () => {
    if (!selectedEmail) return
    setComposeInitial({
      to: selectedEmail.senderEmail,
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${new Date(selectedEmail.dateIso).toLocaleString()}, ${selectedEmail.senderName} wrote:\n> ${selectedEmail.snippet}`,
    })
    setIsComposeOpen(true)
  }

  const handlePreviewAttachment = async (att: any) => {
    if (!window.vuaMail) return
    await window.vuaMail.openAttachment(att)
  }

  const handleSyncNow = async () => {
    if (!window.vuaMail || isSyncing) return
    setIsSyncing(true)
    try {
      const status = await window.vuaMail.syncNow()
      if (status.syncedCount > 0) {
        const list = await window.vuaMail.getEmails(activeFolderId, categoryTab === 'primary' ? 'focused' : 'other')
        setEmails(list)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSendDraft = async (draft: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    bodyHtml: string
  }) => {
    if (!window.vuaMail || !activeAccount) return
    await window.vuaMail.sendEmail({
      accountId: activeAccount.id,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      bodyHtml: draft.bodyHtml,
    })
    if (activeFolderId === 'f_sent' || activeFolderId === 'f2_sent') {
      const list = await window.vuaMail.getEmails(activeFolderId, categoryTab === 'primary' ? 'focused' : 'other')
      setEmails(list)
    }
  }

  const handleSendEmailToContact = (email: string, _name: string) => {
    setComposeInitial({
      to: email,
      subject: '',
      body: '',
    })
    setIsComposeOpen(true)
  }

  return (
    <div className="mail-app">
      {/* VuaOffice Standard Ribbon Header (Replaces legacy ad-hoc top bar) */}
      <MailRibbon
        onNewMail={handleOpenComposeNew}
        onNewMeeting={() => setActiveRailTab('calendar')}
        onDelete={handleDelete}
        onArchive={handleArchive}
        onJunk={async () => {
          if (!selectedEmailId || !window.vuaMail) return
          await window.vuaMail.deleteEmail(selectedEmailId)
          setEmails((prev) => prev.filter((e) => e.id !== selectedEmailId))
          setSelectedEmailId(null)
        }}
        onReply={handleReplySelected}
        onReplyAll={handleReplySelected}
        onForward={handleReplySelected}
        onMarkReadUnread={async () => {
          if (!selectedEmail) return
          const updatedRead = !selectedEmail.isRead
          if (window.vuaMail) {
            await window.vuaMail.markRead(selectedEmail.id, updatedRead)
          }
          setEmails((prev) =>
            prev.map((e) => (e.id === selectedEmail.id ? { ...e, isRead: updatedRead } : e))
          )
        }}
        onToggleFlag={async () => {
          if (!selectedEmail) return
          const updatedStarred = !selectedEmail.isStarred
          if (window.vuaMail) {
            await window.vuaMail.toggleStarred(selectedEmail.id)
          }
          setEmails((prev) =>
            prev.map((e) => (e.id === selectedEmail.id ? { ...e, isStarred: updatedStarred } : e))
          )
        }}
        onCategorize={() => {
          // Switch or highlight category tab
          setCategoryTab(categoryTab === 'all' ? 'primary' : 'all')
        }}
        onMoveToFolder={() => {
          setIsRulesOpen(true)
        }}
        onOpenAddressBook={() => setActiveRailTab('people')}
        onFilterEmails={() => {
          setCategoryTab(categoryTab === 'other' ? 'all' : 'other')
        }}
        onAiAssist={handleTriggerAiSummary}
        onAiDraft={() => {
          if (!selectedEmail) return
          handleSmartReply('Kính gửi Quý đối tác/Khách hàng,\n\nTôi đã nhận được thông tin và hoàn toàn nhất trí với đề xuất. Đội ngũ VuaOffice sẽ triển khai theo đúng lộ trình.\n\nTrân trọng,')
        }}
        onSyncNow={handleSyncNow}
        onManageRules={() => setIsRulesOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isSyncing={isSyncing}
        hasSelectedEmail={Boolean(selectedEmail)}
        isSelectedRead={selectedEmail ? selectedEmail.isRead : true}
        isSelectedFlagged={selectedEmail ? Boolean(selectedEmail.isStarred) : false}
        aiOpen={isAiPanelOpen}
        onToggleAi={() => setIsAiPanelOpen(!isAiPanelOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeAccountEmail={activeAccount?.email}
      />

      {/* Main Workspace Frame: AppRail + Content Multi-columns + Sliding AiDock */}
      <div className="mail-shell-layout">
        {/* Left Navigation Rail (56px) */}
        <AppRail activeTab={activeRailTab} onTabChange={setActiveRailTab} />

        {/* Dynamic Workspace Body */}
        <div className="mail-workspace">
          {activeRailTab === 'brain' && (
            <BrainView />
          )}

          {activeRailTab === 'mail' && (
            <div className="mail-mail-columns">
              <FolderTree
                accounts={accounts}
                activeAccountId={activeAccountId}
                onSelectAccount={handleSelectAccount}
                folders={folders}
                activeFolderId={activeFolderId}
                onSelectFolder={handleSelectFolder}
              />

              <MailList
                emails={filteredEmails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={setSelectedEmailId}
                categoryTab={categoryTab}
                onCategoryChange={setCategoryTab}
                folderName={activeFolder?.name}
                activeAccountId={activeAccountId}
                accounts={accounts}
                onRefresh={handleSyncNow}
                onDeleteEmail={async (emailId, e) => {
                  e.stopPropagation()
                  if (window.vuaMail) await window.vuaMail.deleteEmail(emailId)
                  setEmails((prev) => prev.filter((item) => item.id !== emailId))
                  if (selectedEmailId === emailId) setSelectedEmailId(null)
                }}
                onArchiveEmail={async (emailId, e) => {
                  e.stopPropagation()
                  if (window.vuaMail) await window.vuaMail.archiveEmail(emailId)
                  setEmails((prev) => prev.filter((item) => item.id !== emailId))
                  if (selectedEmailId === emailId) setSelectedEmailId(null)
                }}
                onToggleReadEmail={async (emailId, e) => {
                  e.stopPropagation()
                  const target = emails.find((item) => item.id === emailId)
                  if (!target) return
                  const nextRead = !target.isRead
                  if (window.vuaMail) await window.vuaMail.markRead(emailId, nextRead)
                  setEmails((prev) =>
                    prev.map((item) => (item.id === emailId ? { ...item, isRead: nextRead } : item))
                  )
                }}
                onToggleFlagEmail={async (emailId, e) => {
                  e.stopPropagation()
                  const target = emails.find((item) => item.id === emailId)
                  if (!target) return
                  const nextStarred = !target.isStarred
                  if (window.vuaMail) await window.vuaMail.toggleStarred(emailId)
                  setEmails((prev) =>
                    prev.map((item) => (item.id === emailId ? { ...item, isStarred: nextStarred } : item))
                  )
                }}
              />

              <ReadingPane
                email={selectedEmail}
                body={activeBody}
                aiSummary={aiSummary}
                isLoadingBody={isLoadingBody}
                targetAccountEmail={targetAccountForSelected?.email}
                onTriggerAiSummary={handleTriggerAiSummary}
                onSmartReply={handleSmartReply}
                onPreviewAttachment={handlePreviewAttachment}
                onReply={handleReplySelected}
                onReplyAll={handleReplySelected}
                onForward={handleReplySelected}
                onExpandReply={(text) => {
                  if (!selectedEmail) return
                  setComposeInitial({
                    to: selectedEmail.senderEmail,
                    subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
                    body: text
                      ? `${text}\n\n---\nOn ${new Date(selectedEmail.dateIso).toLocaleString()}, ${selectedEmail.senderName} wrote:\n> ${selectedEmail.snippet}`
                      : `\n\n---\nOn ${new Date(selectedEmail.dateIso).toLocaleString()}, ${selectedEmail.senderName} wrote:\n> ${selectedEmail.snippet}`,
                  })
                  setIsComposeOpen(true)
                }}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onCreateTask={(_title) => setActiveRailTab('todo')}
                onCreateCalendar={(_title) => setActiveRailTab('calendar')}
              />

              {/* VuaOffice Sliding AI Dock (Collapses to 34px rail when closed) */}
              <AiPanel
                isOpen={isAiPanelOpen}
                onClose={() => setIsAiPanelOpen(!isAiPanelOpen)}
                selectedEmail={selectedEmail}
                onApplyReply={handleSmartReply}
                onCreateTask={(_t) => setActiveRailTab('todo')}
              />
            </div>
          )}

          {activeRailTab === 'people' && (
            <PeopleView onSendEmailTo={handleSendEmailToContact} />
          )}

          {activeRailTab === 'calendar' && (
            <CalendarView />
          )}

          {activeRailTab === 'todo' && (
            <TodoView />
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        initialTo={composeInitial.to}
        initialCc={composeInitial.cc}
        initialBcc={composeInitial.bcc}
        initialSubject={composeInitial.subject}
        initialBody={composeInitial.body}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendDraft}
      />

      {/* Import & Export Wizard Modal (.eml / .pst) */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportEml={async (parsed) => {
          if (!window.vuaMail || !activeAccount) return
          await window.vuaMail.sendEmail({
            accountId: activeAccount.id,
            to: [parsed.from?.address || 'imported@local'],
            subject: `[Imported] ${parsed.subject || '(No subject)'}`,
            bodyHtml: parsed.htmlBody || `<pre>${parsed.textBody || ''}</pre>`,
          })
          const list = await window.vuaMail.getEmails(activeFolderId, categoryTab === 'primary' ? 'focused' : 'other')
          setEmails(list)
        }}
      />

      {/* Outlook Rules & Filters Manager Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        rules={rules}
        onClose={() => setIsRulesOpen(false)}
        onSaveRules={(newRules) => {
          setRules(newRules)
        }}
        onRunRulesNow={(rulesToRun) => {
          // Execute rules immediately on currently loaded emails (Outlook Parity)
          setEmails((prev) =>
            prev.map((email) => {
              let updated = { ...email }
              for (const rule of rulesToRun) {
                if (!rule.enabled) continue
                const condMatches = rule.conditions.map((cond) => {
                  let fieldVal = ''
                  if (cond.field === 'from') fieldVal = `${email.senderName} ${email.senderEmail}`
                  else if (cond.field === 'to') fieldVal = email.senderEmail
                  else if (cond.field === 'subject') fieldVal = email.subject
                  else if (cond.field === 'body') fieldVal = email.snippet
                  else if (cond.field === 'hasAttachments') return email.hasAttachments === Boolean(cond.value)

                  const sVal = String(cond.value).toLowerCase()
                  const fVal = fieldVal.toLowerCase()
                  if (cond.operator === 'contains') return fVal.includes(sVal)
                  if (cond.operator === 'equals') return fVal === sVal
                  if (cond.operator === 'startsWith') return fVal.startsWith(sVal)
                  if (cond.operator === 'endsWith') return fVal.endsWith(sVal)
                  return false
                })

                const isMatch = rule.matchAllConditions
                  ? condMatches.every(Boolean)
                  : condMatches.some(Boolean)

                if (isMatch) {
                  for (const act of rule.actions) {
                    if (act.type === 'markAsStarred') updated.isStarred = true
                    if (act.type === 'markAsRead') updated.isRead = true
                    if (act.type === 'applyLabel') updated.category = 'focused'
                  }
                }
              }
              return updated
            })
          )
        }}
      />

      {/* Profile & Account Settings Modal (Opened from Top-Right Account Trigger) */}
      {isProfileModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsProfileModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ProfileView
              accounts={accounts}
              activeAccountId={activeAccountId}
              onAccountsUpdated={async () => {
                if (!window.vuaMail) return
                const api = window.vuaMail
                const accList = await api.getAccounts()
                setAccounts(accList)
                const allFolderPromises = accList.map((acc) => api.getFolders(acc.id))
                const folderResults = await Promise.all(allFolderPromises)
                const combinedFolders = folderResults.flat()
                setFolders(combinedFolders)
              }}
              onSelectAccount={handleSelectAccount}
              onOpenImportExport={() => {
                setIsProfileModalOpen(false)
                setIsImportExportOpen(true)
              }}
              onClose={() => setIsProfileModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onAccountsUpdated={async () => {
          if (!window.vuaMail) return
          const api = window.vuaMail
          const accList = await api.getAccounts()
          setAccounts(accList)
          const allFolderPromises = accList.map((acc) => api.getFolders(acc.id))
          const folderResults = await Promise.all(allFolderPromises)
          const combinedFolders = folderResults.flat()
          setFolders(combinedFolders)
          if (accList.length > 0 && !accList.some((a) => a.id === activeAccountId)) {
            setActiveAccountId(accList[0].id)
            const defaultFolder = combinedFolders.find((f) => f.accountId === accList[0].id && f.kind === 'inbox') || combinedFolders[0]
            if (defaultFolder) {
              setActiveFolderId(defaultFolder.id)
            }
          }
        }}
      />
    </div>
  )
}
