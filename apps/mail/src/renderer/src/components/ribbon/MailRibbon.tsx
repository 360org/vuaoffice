import React, { useState } from 'react'
import { GensparkMark } from './GensparkMark'
import {
  IconX,
  IconUser,
  IconEdit,
  IconCalendarPlus,
  IconTrash,
  IconRestore,
  IconArchive,
  IconJunk,
  IconReply,
  IconReplyAll,
  IconForward,
  IconMail,
  IconMailUnread,
  IconFlag,
  IconTag,
  IconFolderMove,
  IconUsers,
  IconFilter,
  IconFileText,
  IconSend,
  IconRefresh,
  IconSendReceive,
  IconDatabase,
  IconLightning,
  IconImportExport,
  IconLayoutSidebarRight,
} from '../common/MailIcons'

interface MailRibbonProps {
  onNewMail: () => void
  onNewMeeting?: () => void
  onDelete: () => void
  onRestore?: () => void
  onArchive: () => void
  onJunk?: () => void
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onMarkReadUnread?: () => void
  onToggleFlag?: () => void
  onCategorize?: () => void
  onMoveToFolder?: () => void
  onOpenAddressBook?: () => void
  onFilterEmails?: () => void
  onAiAssist: () => void
  onAiDraft?: () => void
  onSyncNow?: () => void
  onManageRules?: () => void
  onOpenImportExport?: () => void
  onOpenProfile?: () => void
  isSyncing?: boolean
  isTrashFolder?: boolean
  hasSelectedEmail: boolean
  isSelectedRead?: boolean
  isSelectedFlagged?: boolean
  aiOpen: boolean
  onToggleAi: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  activeAccountEmail?: string
}

type RibbonTab = 'home' | 'sendreceive' | 'folder' | 'view'

export const MailRibbon: React.FC<MailRibbonProps> = ({
  onNewMail,
  onNewMeeting,
  onDelete,
  onRestore,
  onArchive,
  onJunk,
  onReply,
  onReplyAll,
  onForward,
  onMarkReadUnread,
  onToggleFlag,
  onCategorize,
  onMoveToFolder,
  onOpenAddressBook,
  onFilterEmails,
  onAiAssist,
  onAiDraft,
  onSyncNow,
  onManageRules,
  onOpenImportExport,
  onOpenProfile,
  isSyncing,
  isTrashFolder = false,
  hasSelectedEmail,
  isSelectedRead = true,
  isSelectedFlagged = false,
  aiOpen,
  onToggleAi,
  searchQuery,
  onSearchChange,
  activeAccountEmail,
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home')

  return (
    <div className="ribbon">
      {/* Top Tab Strip & Quick Access Toolbar (Parity with Microsoft Outlook 365 & VuaOffice Suite) */}
      <div className="ribbon-tabs">
        {/* Quick Access Action Buttons */}
        <div className="ribbon-qat">
          <button
            type="button"
            className="qa-btn"
            title="Đồng bộ / Gửi & Nhận thư (F9)"
            disabled={isSyncing}
            onClick={onSyncNow}
          >
            <IconRefresh size={15} className={isSyncing ? 'spinning' : ''} />
          </button>
          <div className="qa-sep" />
        </div>

        {/* Standard Outlook Ribbon Navigation Tabs */}
        <div className="ribbon-tab-list">
          <button
            type="button"
            className={`ribbon-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Trang chủ
          </button>
          <button
            type="button"
            className={`ribbon-tab-btn ${activeTab === 'sendreceive' ? 'active' : ''}`}
            onClick={() => setActiveTab('sendreceive')}
          >
            Gửi / Nhận
          </button>
          <button
            type="button"
            className={`ribbon-tab-btn ${activeTab === 'folder' ? 'active' : ''}`}
            onClick={() => setActiveTab('folder')}
          >
            Thư mục & Quy tắc
          </button>
          <button
            type="button"
            className={`ribbon-tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            Xem & Bố cục
          </button>
        </div>

        {/* Global Search Bar centered/aligned */}
        <div className="ribbon-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary, #606366)" strokeWidth="1.6">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm thư, người gửi, tài liệu (Ctrl+E)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Xoá tìm kiếm"
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        {/* Top-right Profile/Settings Trigger */}
        <div className="ribbon-tabs-right">
          {onOpenProfile && (
            <button
              type="button"
              className="account-badge profile-icon-btn"
              title={activeAccountEmail ? `Hồ sơ & Cài đặt (${activeAccountEmail})` : 'Hồ sơ cá nhân & Cài đặt tài khoản'}
              onClick={onOpenProfile}
            >
              <span className="profile-icon-avatar">
                <IconUser size={15} />
              </span>
              <span className="status-dot" />
            </button>
          )}
        </div>
      </div>

      {/* Ribbon Body (Fixed 80px Height conforming to VuaOffice Suite Standards) */}
      <div className="ribbon-body">
        {activeTab === 'home' && (
          <>
            {/* Nhóm 1: New Items (Chuẩn Outlook: Soạn thư & Cuộc họp) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big rb-primary"
                  onClick={onNewMail}
                  title="Soạn thư mới (Ctrl+N)"
                >
                  <span className="rb-big-icon">
                    <IconEdit size={22} />
                  </span>
                  <span>Soạn thư</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  onClick={onNewMeeting}
                  title="Tạo lịch hẹn / Cuộc họp mới (Ctrl+Shift+Q)"
                >
                  <span className="rb-big-icon">
                    <IconCalendarPlus size={22} />
                  </span>
                  <span>Mục mới</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm 2: Xử lý & Xoá (Delete / Restore / Archive / Junk) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                {isTrashFolder && (
                  <button
                    type="button"
                    className="rb-big rb-primary"
                    disabled={!hasSelectedEmail}
                    onClick={onRestore}
                    title="Khôi phục thư về thư mục gốc trước khi xoá (Restore)"
                  >
                    <span className="rb-big-icon">
                      <IconRestore size={22} />
                    </span>
                    <span>Khôi phục</span>
                  </button>
                )}
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onDelete}
                  title="Xoá thư đã chọn (Delete)"
                >
                  <span className="rb-big-icon">
                    <IconTrash size={22} />
                  </span>
                  <span>Xoá</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onArchive}
                  title="Lưu trữ thư vào Archive (Backspace)"
                >
                  <span className="rb-big-icon">
                    <IconArchive size={22} />
                  </span>
                  <span>Lưu trữ</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onJunk}
                  title="Báo cáo Thư rác / Chặn người gửi (Junk)"
                >
                  <span className="rb-big-icon">
                    <IconJunk size={22} />
                  </span>
                  <span>Thư rác</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm 3: Phản hồi & Chuyển tiếp (Reply / Reply All / Forward) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onReply}
                  title="Trả lời người gửi (Ctrl+R)"
                >
                  <span className="rb-big-icon">
                    <IconReply size={22} />
                  </span>
                  <span>Trả lời</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onReplyAll}
                  title="Trả lời tất cả người nhận (Ctrl+Shift+R)"
                >
                  <span className="rb-big-icon">
                    <IconReplyAll size={22} />
                  </span>
                  <span>Trả lời tất cả</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onForward}
                  title="Chuyển tiếp email (Ctrl+F)"
                >
                  <span className="rb-big-icon">
                    <IconForward size={22} />
                  </span>
                  <span>Chuyển tiếp</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm 4: Tags & Theo dõi (Read/Unread / Categorize / Follow-up / Move) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onMarkReadUnread}
                  title={isSelectedRead ? 'Đánh dấu Chưa đọc (Ctrl+U)' : 'Đánh dấu Đã đọc (Ctrl+Q)'}
                >
                  <span className="rb-big-icon">
                    {isSelectedRead ? <IconMailUnread size={22} /> : <IconMail size={22} />}
                  </span>
                  <span>{isSelectedRead ? 'Chưa đọc' : 'Đã đọc'}</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onToggleFlag}
                  title="Gắn cờ theo dõi / Follow Up"
                >
                  <span className="rb-big-icon">
                    <IconFlag size={22} active={isSelectedFlagged} />
                  </span>
                  <span>Theo dõi</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onCategorize}
                  title="Phân loại nhãn màu sắc"
                >
                  <span className="rb-big-icon">
                    <IconTag size={22} />
                  </span>
                  <span>Phân loại</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={!hasSelectedEmail}
                  onClick={onMoveToFolder}
                  title="Di chuyển thư sang thư mục khác"
                >
                  <span className="rb-big-icon">
                    <IconFolderMove size={22} />
                  </span>
                  <span>Di chuyển</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm 5: Tìm & Danh bạ (Filter & Address Book) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big"
                  onClick={onOpenAddressBook}
                  title="Mở Danh bạ / Sổ địa chỉ (Address Book)"
                >
                  <span className="rb-big-icon">
                    <IconUsers size={22} />
                  </span>
                  <span>Danh bạ</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  onClick={onFilterEmails}
                  title="Lọc nhanh danh sách thư"
                >
                  <span className="rb-big-icon">
                    <IconFilter size={22} />
                  </span>
                  <span>Lọc thư</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm 6: VuaOffice AI Suite */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className={`rb-big ai-entry ${aiOpen ? 'active' : ''}`}
                  onClick={onToggleAi}
                  title="Mở bảng trợ lý VuaOffice AI"
                >
                  <span className="rb-big-icon">
                    <GensparkMark size={24} />
                  </span>
                  <span>VuaOffice AI</span>
                </button>
                <button
                  type="button"
                  className="rb-big ai-entry"
                  disabled={!hasSelectedEmail}
                  onClick={onAiAssist}
                  title="Tóm tắt nội dung email bằng VuaOffice AI"
                >
                  <span className="rb-big-icon">
                    <IconFileText size={22} />
                  </span>
                  <span>Tóm tắt AI</span>
                </button>
                <button
                  type="button"
                  className="rb-big ai-entry"
                  disabled={!hasSelectedEmail}
                  onClick={onAiDraft}
                  title="Soạn thư trả lời thông minh bằng AI"
                >
                  <span className="rb-big-icon">
                    <IconSend size={22} />
                  </span>
                  <span>AI Smart Draft</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'sendreceive' && (
          <>
            {/* Nhóm Gửi & Nhận Toàn bộ (Outlook 365 Parity) */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big rb-primary"
                  disabled={isSyncing}
                  onClick={onSyncNow}
                  title="Gửi và nhận tất cả thư mục (F9)"
                >
                  <span className="rb-big-icon">
                    <IconRefresh size={22} className={isSyncing ? 'spinning' : ''} />
                  </span>
                  <span>{isSyncing ? 'Đang đồng bộ...' : 'Gửi / Nhận tất cả'}</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  disabled={isSyncing}
                  onClick={onSyncNow}
                  title="Cập nhật thư mục hiện tại"
                >
                  <span className="rb-big-icon">
                    <IconSendReceive size={22} />
                  </span>
                  <span>Cập nhật thư mục</span>
                </button>
              </div>
            </div>

            <div className="ribbon-sep" />

            {/* Nhóm Trạng thái kết nối */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big"
                  title="Trạng thái đồng bộ ngoại tuyến SQLite WAL"
                >
                  <span className="rb-big-icon">
                    <IconDatabase size={22} />
                  </span>
                  <span>SQLite Offline</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'folder' && (
          <>
            {/* Nhóm Quy tắc & Bộ lọc */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className="rb-big"
                  onClick={onManageRules}
                  title="Cấu hình bộ lọc & quy tắc tự động xử lý thư"
                >
                  <span className="rb-big-icon">
                    <IconLightning size={22} />
                  </span>
                  <span>Quy tắc & Bộ lọc</span>
                </button>
                <button
                  type="button"
                  className="rb-big"
                  onClick={onOpenImportExport}
                  title="Nhập / Xuất dữ liệu thư (.pst & .eml)"
                >
                  <span className="rb-big-icon">
                    <IconImportExport size={22} />
                  </span>
                  <span>Nhập / Xuất (.pst)</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'view' && (
          <>
            {/* Nhóm Bố cục giao diện */}
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <button
                  type="button"
                  className={`rb-big ${aiOpen ? 'active' : ''}`}
                  onClick={onToggleAi}
                  title="Hiển thị / Thu gọn bảng AI"
                >
                  <span className="rb-big-icon">
                    <IconLayoutSidebarRight size={22} />
                  </span>
                  <span>Bảng AI Dock</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

