# AUDIT_ROADMAP.md — Lộ trình Kiểm toán & Checklist Nghiệm thu Tính năng

> **Chủ quản**: 360 CORP  
> **Dự án**: VuaOffice Suite  
> **Áp dụng cho**: Quy trình kiểm toán định kỳ, nâng cấp phiên bản và nghiệm thu kiến trúc mới **360-Harness & Universal File Creator**, cùng hệ thống **360 CORP Odoo SSO Auth Provider**.

---

## 📌 Tổng quan Quy trình Audit Trước Khi Triển khai (Audit-First Workflow)

Theo quy chuẩn kỹ thuật của 360 CORP, mọi tính năng nâng cao kiến trúc lớn đều phải hoàn thành việc **Rà soát & Đánh giá An toàn (Audit Gate)** trước khi viết mã nguồn và merge vào nhánh chính:

```text
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Giai đoạn 1: KIỂM TOÁN  │ ──> │ Giai đoạn 2: THI CÔNG   │ ──> │ Giai đoạn 3: PHÁT HÀNH  │
│ • Rà soát bảo mật       │     │ • Tách khối 360/        │     │ • brand:gate            │
│ • Lập Checklist nghiệm thu│   │ • Viết Generator & Seams│     │ • Tag & Build Release   │
│ • Cập nhật Docs Specs   │     │ • Odoo SSO & Deep Link  │     │ • Verifying macOS / Win │
│ • Kiểm toán SSO Auth    │     │ • Tích hợp Artifact UI  │     │                         │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

---

## 📋 GIAI ĐOẠN 1: BẢNG CHECKLIST KIỂM TOÁN KIẾN TRÚC & BẢO MẬT (PRE-DEV AUDIT)

Bảng kiểm này phải đạt trạng thái **[x] ĐÃ DUYỆT** trước khi thực hiện viết code:

- [x] **Audit 1.1 — Tính tương thích Upstream (Zero-Conflict Audit)**:
  - Xác nhận kiến trúc `360/` tách biệt hoàn toàn khỏi cây thư mục `apps/*` và `packages/*` của upstream `genoffice`.
  - Cấu hình `.gitattributes` với quy tắc `360/** merge=ours` để chặn ghi đè khi chạy `git merge upstream`.
- [x] **Audit 1.2 — Đánh giá Khớp nối Năng lực (Capability Seams Audit theo DeepSeek Harness)**:
  - Phân tách rõ 3 vai trò: Service Definition (`IFileGenerator`, `IStorageService`) ➔ Service Provider (`DocxGenerator`, `XlsxGenerator`, `PptxGenerator`, `HostStorage`) ➔ Consumer (`create_file` AI tool).
  - Tận dụng 100% `packages/agent-core` sẵn có qua hàm `composeSkills` (không sửa lõi Agent Loop).
- [x] **Audit 1.3 — Kiểm toán An toàn Hệ thống Tệp & IPC Sandbox (Host Security Audit)**:
  - Kiểm soát đường dẫn ghi file: Chỉ cho phép ghi file vào thư mục an toàn do người dùng chọn qua `dialog.showSaveDialog` hoặc thư mục Downloads/Desktop.
  - Ngăn chặn triệt để Path Traversal (`../`) khi AI truyền tham số `filename`.
- [x] **Audit 1.4 — Đồng bộ Tài liệu Kỹ thuật**:
  - Cập nhật đầy đủ `docs/REQUIREMENTS.md`, `docs/ARCH.md`, `docs/SPEC.md` và `docs/AUDIT_ROADMAP.md`.
- [x] **Audit 1.5 — Đánh giá An toàn Xác thực SSO & Deep Link (Odoo Auth Provider Security Gate)**:
  - **Custom Protocol Handshake**: Sử dụng giao thức an toàn `vuaoffice://auth/callback` với cơ chế anti-tampering (state nonce & timestamp token).
  - **Thu thập dữ liệu bắt buộc (Data Minimization)**: Yêu cầu 3 trường định danh cơ bản: Họ & Tên (`name`), Email (`email`), Số điện thoại (`phone`).
  - **Zero-Loop & Non-Blocking State**: Quản lý vòng đời token trực tiếp qua `auth.json`, phát sự kiện `accountLoginEvent` ngay lập tức tới Renderer khi nhận Deep Link, không polling chờ đợi tránh treo ứng dụng.
  - **Sanitization & URL Defense**: Kiểm tra định dạng tham số URL callback, lọc sạch XSS payload và ký tự lạ trước khi lưu trữ hoặc hiển thị trên giao diện.

---

## 🛠️ GIAI ĐOẠN 2: LỘ TRÌNH TRIỂN KHAI & CHECKLIST NGHIỆM THU TÍNH NĂNG (POST-DEV VERIFICATION)

Lộ trình thi công chia làm 5 mốc trọng tâm:

### Mốc 1: Chuẩn hóa Thư mục Gốc `360/` & Di chuyển Whitelabel
- [ ] Di chuyển thư mục `whitelabel/` vào `360/whitelabel/`.
- [ ] Cập nhật đường dẫn trong `scripts/whitelabel.js`, `tools/check-brand.mjs` và các file cấu hình liên quan.
- [ ] Khai báo workspace `"360/packages/*"` trong `package.json` gốc.
- [ ] Chạy `npm run brand:gate` đảm bảo vượt qua 4 cổng kiểm tra (selftest, status, brand check, audit check).

### Mốc 2: Xây dựng Package `@360/file-creator` (Engine & Seams)
- [ ] Khởi tạo package `360/packages/file-creator`.
- [ ] Xây dựng `DocxGeneratorProvider`: Chuyển đổi nội dung AI sinh thành file `.docx` chuẩn OpenXML (kế thừa `docx-engine`).
- [ ] Xây dựng `XlsxGeneratorProvider`: Chuyển đổi dữ liệu bảng thành file `.xlsx` chuẩn (kế thừa `xlsx-engine` / sidecar).
- [ ] Xây dựng `PptxGeneratorProvider`: Chuyển đổi layout/nội dung thành file `.pptx` chuẩn (kế thừa `pptx-render`).
- [ ] Xây dựng `PdfAndMarkdownGeneratorProvider`: Xuất file PDF, Markdown (`.md`) và Text thuần (`.txt`).
- [ ] Xây dựng IPC Handler trong `apps/shell/src/main/` hỗ trợ ghi file an toàn, mở Finder/Explorer và mở tab mới.

### Mốc 3: Tích hợp Universal File Skill & Artifact Card UI
- [ ] Định nghĩa `createUniversalFileSkill` chứa công cụ `create_file` và `save_local_file`.
- [ ] Tích hợp Skill vào AI Panel thông qua `composeSkills` để toàn bộ các ứng dụng (PDF, Docs, Sheets, Slides, Markdown, Mail) đều tự động nhận diện công cụ.
- [ ] Xây dựng React UI Component `ArtifactCard` hiển thị trực quan thẻ tải file, nút [Mở trong Finder] và [Mở xem ngay] ngay trong khung chat AI.

### Mốc 4: Tích hợp 360 CORP Odoo Auth Provider & 1-Click SSO
- [ ] **Odoo Backend Auth Controller (`backend_base` / `vuaoffice_auth`)**:
  - Endpoint `/vuaoffice/auth/login` và `/vuaoffice/auth/register` (thu thập Họ tên `name`, Email `email`, Số điện thoại `phone`).
  - Cấp Bearer JWT/Token và tự động redirect về Deep Link `vuaoffice://auth/callback?token=...&name=...&email=...&phone=...`.
- [ ] **Desktop Shell Deep Link Protocol Handler (`apps/shell/src/main/index.ts`)**:
  - Khai báo và bắt protocol `app.setAsDefaultProtocolClient('vuaoffice')`.
  - Bắt sự kiện `app.on('open-url')` (macOS) và `app.on('second-instance')` (Windows).
  - Giải mã URL, lưu auth profile vào `~/.genoffice/auth.json` (hoặc `~/.vuaoffice/auth.json`).
  - Gửi event `HOME_CHANNELS.accountLoginEvent` (`{ phase: 'success' }`) tới Renderer.
- [ ] **UI Home & Launcher Branding**:
  - Thay nút đăng nhập thành "Đăng nhập bằng 360 CORP" (`Home.tsx`).
  - 1-Click kích hoạt mở browser tới Odoo Auth Portal, tự động đăng nhập không cần chờ polling.

### Mốc 5: Kiểm thử Toàn diện & Nghiệm thu
- [ ] Test tạo file `.docx`, `.xlsx`, `.pptx`, `.md`, `.pdf` và kiểm tra tính toàn vẹn khi mở bằng MS Office / VuaOffice.
- [ ] Test luồng SSO 1-click từ VuaOffice: Bấm đăng nhập ➔ Browser mở trang Odoo 360 CORP ➔ Đăng ký / Đăng nhập ➔ Redirect về VuaOffice ➔ Giao diện cập nhật ngay trạng thái đã đăng nhập kèm tên người dùng.
- [ ] Test Deep Link trên macOS và Windows không bị xung đột hay treo ứng dụng.

---

## 🔒 GIAI ĐOẠN 3: PHÁT HÀNH & GHI NHẬN KIỂM TOÁN BẤT BIẾN

Trước khi phát hành phiên bản chính thức:
1. Chạy toàn bộ test suites: `npm run brand:gate && npm run typecheck && npm run lint && npm test`.
2. Tạo bản ghi kiểm toán mới `docs/audits/AUDIT-<YYYY-MM-DD>-v<version>.md` kèm banner `<!-- AUDIT-IMMUTABLE -->`.
3. Bổ sung mục tương ứng vào bảng mục lục trong `docs/AUDIT_REPORT.md`.
4. Thực hiện quy trình phát hành 9 bước theo đúng [`docs/RELEASE_PROTOCOL.md`](RELEASE_PROTOCOL.md).
