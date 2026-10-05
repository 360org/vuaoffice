# VuaOffice Mail (`@genoffice/mail`)

Module Email Client phong cách **Microsoft Outlook** tích hợp trực tiếp trong bộ ứng dụng văn phòng **VuaOffice Desktop Suite** (Electron + React 19 + TypeScript).

---

## 🌟 Tính năng Nổi bật

- 📬 **Outlook Fluent UI**: Bố cục 3 cột kinh điển (AppRail & Folder Tree, Message List phân loại Focused/Other, Reading & Viewer Pane).
- ⚡ **Local SQLite Engine**: Lưu trữ toàn bộ dữ liệu email cục bộ với SQLite WAL Mode (`better-sqlite3`), hỗ trợ truy vấn siêu tốc và hàng đợi thao tác ngoại tuyến (Offline OpQueue).
- 🧠 **VuaAI Pro Assistant**:
  - Tóm tắt chuỗi hội thoại email (AI Thread Summary).
  - Soạn thảo và trau chuốt email thông minh (AI Compose Draft).
  - Trả lời nhanh chỉ với 1 cú nhấp chuột (Smart Reply).
- 🌓 **Chuẩn Theme Đa nền tảng**: Tương thích 100% hệ thống Semantic Tokens Light / Dark / System mode của VuaOffice Suite (`packages/ui/src/tokens.css`).
- 🔄 **Shell Integration**: Chạy liền mạch dưới dạng một Tab độc lập bên trong `apps/shell`.

---

## 🏗️ Cấu trúc Module

- `src/main`: Tiến trình nền Electron quản lý SQLite DB (`db/sqlite-storage.ts`), khởi tạo bảng (`db/schema.ts`), và cầu nối IPC (`ipc/mail-ipc.ts`).
- `src/preload`: Cung cấp API an toàn `window.vuaMail` qua ContextBridge.
- `src/renderer`: Giao diện người dùng React 19 Fluent UI với hệ thống component Ribbon, AppRail, FolderTree, MailList, ReadingPane, ComposeModal.
- `src/shared`: Định nghĩa Type TypeScript và IPC Channel Events.

---

## 🛠️ Hướng dẫn Phát triển

```bash
# Kiểm tra TypeScript
npm run typecheck -w @genoffice/mail

# Build module
npm run build -w @genoffice/mail

# Chạy độc lập trong môi trường phát triển
npm run dev -w @genoffice/mail
```
