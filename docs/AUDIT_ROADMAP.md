# AUDIT_ROADMAP.md — Lộ trình Kiểm toán & Checklist Nghiệm thu Tính năng

> **Chủ quản**: 360 CORP  
> **Dự án**: VuaOffice Suite  
> **Áp dụng cho**: Quy trình kiểm toán định kỳ, nâng cấp phiên bản, bảo mật hệ thống **360 CORP Odoo SSO Auth Provider** và **AI Multimodal Assistant**.

---

## 📌 Tổng quan Quy trình Audit Trước Khi Triển khai (Audit-First Workflow)

Theo quy chuẩn kỹ thuật của 360 CORP, mọi tính năng nâng cao kiến trúc lớn đều phải hoàn thành việc **Rà soát & Đánh giá An toàn (Audit Gate)** trước khi viết mã nguồn và merge vào nhánh chính:

```text
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Giai đoạn 1: KIỂM TOÁN  │ ──> │ Giai đoạn 2: THI CÔNG   │ ──> │ Giai đoạn 3: PHÁT HÀNH  │
│ • Rà soát bảo mật       │     │ • Tách khối 360/        │     │ • brand:gate            │
│ • Lập Checklist nghiệm thu│   │ • Odoo SSO & Deep Link  │     │ • Tag & Build Release   │
│ • Cập nhật Docs Specs   │     │ • AI Drag & Drop        │     │ • Verifying macOS / Win │
│ • Kiểm toán SSO Auth    │     │ • Multimodal AI Chat    │     │                         │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

---

## 📋 GIAI ĐOẠN 1: BẢNG CHECKLIST KIỂM TOÁN KIẾN TRÚC & BẢO MẬT (PRE-DEV AUDIT)

Bảng kiểm này phải đạt trạng thái **[x] ĐÃ DUYỆT** trước khi thực hiện viết code:

- [x] **Audit 1.1 — Tính tương thích Upstream (Zero-Conflict Audit)**:
  - Xác nhận kiến trúc `360/` tách biệt hoàn toàn khỏi cây thư mục `apps/*` và `packages/*` của upstream `genoffice`.
  - Cấu hình `.gitattributes` với quy tắc `360/** merge=ours` để chặn ghi đè khi chạy `git merge upstream`.
- [x] **Audit 1.2 — Kiểm toán An toàn Hệ thống Tệp & IPC Sandbox (Host Security Audit)**:
  - Kiểm soát đường dẫn ghi và đọc file: Ngăn chặn triệt để Path Traversal (`../`) khi xử lý file đính kèm.
- [x] **Audit 1.3 — Đồng bộ Tài liệu Kỹ thuật**:
  - Cập nhật đầy đủ `docs/REQUIREMENTS.md`, `docs/ARCH.md`, `docs/SPEC.md` và `docs/AUDIT_ROADMAP.md`.
- [x] **Audit 1.4 — Đánh giá An toàn Xác thực SSO & Deep Link (Odoo Auth Provider Security Gate)**:
  - **Custom Protocol Handshake**: Sử dụng giao thức an toàn `vuaoffice://auth/callback` với cơ chế anti-tampering (state nonce & timestamp token).
  - **Thu thập dữ liệu bắt buộc (Data Minimization)**: Yêu cầu 3 trường định danh cơ bản: Họ & Tên (`name`), Email (`email`), Số điện thoại (`phone`).
  - **Zero-Loop & Non-Blocking State**: Quản lý vòng đời token trực tiếp qua `auth.json`, phát sự kiện `accountLoginEvent` ngay lập tức tới Renderer khi nhận Deep Link, không polling chờ đợi tránh treo ứng dụng.
  - **Sanitization & URL Defense**: Kiểm tra định dạng tham số URL callback, lọc sạch XSS payload và ký tự lạ trước khi lưu trữ hoặc hiển thị trên giao diện.

---

## 🛠️ GIAI ĐOẠN 2: LỘ TRÌNH TRIỂN KHAI & CHECKLIST NGHIỆM THU TÍNH NĂNG (POST-DEV VERIFICATION)

Lộ trình thi công chia làm các mốc trọng tâm:

### Mốc 1: Chuẩn hóa Thư mục Gốc `360/` & Whitelabel (Đã hoàn thành 100%)
- [x] Di chuyển và chuẩn hóa cấu hình vào `360/brand-config.json`.
- [x] Chuyển đổi công cụ sang `scripts/360-brand.js`, `tools/check-brand.mjs` và các file cấu hình liên quan.
- [x] Hoàn thiện bộ lệnh `brand:apply`, `brand:restore`, `brand:status`, `brand:selftest`.
- [x] Chạy `npm run brand:gate` đảm bảo vượt qua 4 cổng kiểm tra (selftest, status, brand check, audit check).

### Mốc 2: Tích hợp 360 CORP Odoo Auth Provider & 1-Click SSO (Đã hoàn thành 100%)
- [x] **Odoo Backend Auth Controller (`backend_base` / `vuaoffice_auth`)**:
  - Endpoint `/vuaoffice/auth/login` và `/vuaoffice/auth/register` (thu thập Họ tên `name`, Email `email`, Số điện thoại `phone`).
  - Cấp Bearer JWT/Token và tự động redirect về Deep Link `vuaoffice://auth/callback?token=...&name=...&email=...&phone=...`.
- [x] **Desktop Shell Deep Link Protocol Handler (`apps/shell/src/main/index.ts`)**:
  - Khai báo và bắt protocol `app.setAsDefaultProtocolClient('vuaoffice')`.
  - Bắt sự kiện `app.on('open-url')` (macOS) và `app.on('second-instance')` (Windows).
  - Giải mã URL, lưu auth profile vào `~/.genoffice/auth.json` (hoặc `~/.vuaoffice/auth.json`).
  - Gửi event `HOME_CHANNELS.accountLoginEvent` (`{ phase: 'success' }`) tới Renderer.
- [x] **UI Home & Launcher Branding**:
  - Tích hợp nút đăng nhập / liên kết tài khoản Odoo 360 CORP (`Home.tsx`).
  - 1-Click kích hoạt mở browser tới Odoo Auth Portal, tự động đăng nhập callback qua deep link không cần chờ polling.

### Mốc 3: Hỗ trợ Kéo Thả (Drag & Drop) Tài Liệu & Ảnh Vào Khung Chat AI Đa Nền Tảng
- [x] **Kéo thả & Paste vào AI Chat trên Docs, Sheets, Slides**: Đã hoàn thành hỗ trợ đính kèm tài liệu (`.docx`, `.xlsx`, `.pptx`, `.pdf`, `.txt`, `.md`) và hình ảnh (`.png`, `.jpg`, `.webp`) qua `createFilesSkill` & `files:add`.
- [ ] **Mở rộng Drag & Drop & Paste vào AI Chat trên PDF, Markdown và Mail**:
  - Bổ sung `onDragOver`, `onDragLeave`, `onDrop` và `onPasteFiles` vào `AiPanel.tsx` của **VuaOffice PDF** và **VuaOffice Markdown** (tích hợp cùng `createFilesSkill` của `agent-core`).
  - Mở rộng xử lý đa phương thức (multimodal vision prompt) cho AI khi nhận ảnh đính kèm trên toàn bộ các ứng dụng.
- [x] **Trợ lý AI Trích xuất & Phân tích Tệp Đính Kèm**: Tự động trích xuất nội dung văn bản từ tệp đính kèm (`extractAttachmentText` qua `@genoffice/file-parse`) trên Docs, Sheets, Slides.
- [ ] **Trợ lý AI Thực Thi Nhiệm Vụ Mở Rộng**: Tối ưu hóa tác vụ AI đối chiếu, tóm tắt chéo tài liệu đa nguồn cho PDF và Markdown.

### Mốc 4: Kiểm thử Toàn diện & Nghiệm thu
- [x] Test luồng kéo thả tài liệu và ảnh vào khung chat AI trên Docs, Sheets, Slides.
- [ ] Test luồng kéo thả tài liệu và ảnh trên PDF, Markdown, Mail.
- [x] Test luồng SSO 1-click từ VuaOffice qua Odoo 360 CORP và deep link `vuaoffice://auth/callback`.
- [x] Test Deep Link trên macOS và Windows không bị xung đột hay treo ứng dụng.

---

## 🔒 GIAI ĐOẠN 3: PHÁT HÀNH & GHI NHẬN KIỂM TOÁN BẤT BIẾN

Trước khi phát hành phiên bản chính thức:
1. Chạy toàn bộ test suites: `npm run brand:gate && npm run typecheck && npm run lint && npm test`.
2. Tạo bản ghi kiểm toán mới `docs/audits/AUDIT-<YYYY-MM-DD>-v<version>.md` kèm banner `<!-- AUDIT-IMMUTABLE -->`.
3. Bổ sung mục tương ứng vào bảng mục lục trong `docs/AUDIT_REPORT.md`.
4. Thực hiện quy trình phát hành 9 bước theo đúng [`docs/RELEASE_PROTOCOL.md`](RELEASE_PROTOCOL.md).
