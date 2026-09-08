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
> Mốc này **chỉ** là attachment native cho AI Chat; không trộn với OCR native PDF.

- [x] **Kéo thả & Paste vào AI Chat trên Docs, Sheets, Slides**: Đã hoàn thành hỗ trợ đính kèm tài liệu (`.docx`, `.xlsx`, `.pptx`, `.pdf`, `.txt`, `.md`) và hình ảnh (`.png`, `.jpg`, `.webp`) qua `createFilesSkill` & `files:add`.
- [ ] **Mở rộng Drag & Drop & Paste vào AI Chat trên PDF, Markdown và Mail**:
  - Bổ sung chọn file, kéo thả, paste ảnh/tệp vào `AiPanel.tsx` của **VuaOffice PDF**, **VuaOffice Markdown** và **VuaOffice Mail**.
  - Tệp văn bản/PDF/Office được parse nội bộ qua `read_attachment`; ảnh được gửi trực tiếp theo multimodal vision prompt để AI tự quyết định tác vụ (ví dụ: hóa đơn → Sheets, ảnh minh họa → Docs).
- [x] **Trợ lý AI Trích xuất & Phân tích Tệp Đính Kèm**: Tự động trích xuất nội dung văn bản từ tệp đính kèm (`extractAttachmentText` qua `@genoffice/file-parse`) trên Docs, Sheets, Slides.
- [ ] **Trợ lý AI Thực Thi Nhiệm Vụ Mở Rộng**: Tối ưu hóa tác vụ AI đối chiếu, tóm tắt chéo tài liệu đa nguồn cho PDF, Markdown và Mail.

### Mốc 4: OCR Native PDF Offline bằng PaddleOCR.js / PP-OCRv6
> Mốc này là tính năng native của **VuaOffice PDF**: mở PDF scan hoặc right-click page/image → convert “to PDF native”; AI chỉ là bước sửa lỗi hậu xử lý khi OCR chưa hoàn hảo.

- [ ] **Đóng gói OCR offline dưới `360/`**: Lưu manifest/cấu hình PP-OCRv6 và adapter tải model ở `360/ocr/*`; không hardcode vào `packages/file-parse/src/*` trừ khi bắt buộc để tránh conflict upstream.
- [ ] **Nhận dạng offline không cần AI**: PaddleOCR.js với model `PP-OCRv6_tiny_det` / `PP-OCRv6_tiny_rec` phải trả được text từ ảnh/trang scan ngay cả khi không cấu hình AI.
- [ ] **Tích hợp VuaOffice PDF**: Dùng seam hiện có `window.pdfApi.ocrPage(png)` để render trang scan → OCR lines → overlay searchable/selectable trong viewer.
- [ ] **Xuất kết quả native/searchable**: Tạo text output và nền tảng text-insert cho PDF searchable; phần hidden-text hoàn chỉnh sẽ mở rộng pipeline `textInserts` khi cần giữ ảnh gốc nhưng thêm lớp chữ không nhìn thấy.
- [ ] **AI correction tùy chọn**: Chỉ gửi vùng confidence thấp / kết quả chưa hoàn hảo sang AI để sửa, không phụ thuộc AI cho OCR cơ bản.

### Mốc 5: Kiểm thử Toàn diện & Nghiệm thu
- [x] Test luồng kéo thả tài liệu và ảnh vào khung chat AI trên Docs, Sheets, Slides.
- [ ] Test luồng kéo thả tài liệu và ảnh trên PDF, Markdown, Mail.
- [ ] Test OCR PDF scan offline bằng PaddleOCR.js / PP-OCRv6 khi không có AI.
- [ ] Test xuất text/searchable PDF từ trang scan và xác minh text có thể search/select trong VuaOffice PDF.
- [x] Test luồng SSO 1-click từ VuaOffice qua Odoo 360 CORP và deep link `vuaoffice://auth/callback`.
- [x] Test Deep Link trên macOS và Windows không bị xung đột hay treo ứng dụng.

---

## 🔒 GIAI ĐOẠN 3: PHÁT HÀNH & GHI NHẬN KIỂM TOÁN BẤT BIẾN

Trước khi phát hành phiên bản chính thức:
1. Chạy toàn bộ test suites: `npm run brand:gate && npm run typecheck && npm run lint && npm test`.
2. Tạo bản ghi kiểm toán mới `docs/audits/AUDIT-<YYYY-MM-DD>-v<version>.md` kèm banner `<!-- AUDIT-IMMUTABLE -->`.
3. Bổ sung mục tương ứng vào bảng mục lục trong `docs/AUDIT_REPORT.md`.
4. Thực hiện quy trình phát hành 9 bước theo đúng [`docs/RELEASE_PROTOCOL.md`](RELEASE_PROTOCOL.md).
