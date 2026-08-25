# REQUIREMENTS.md — Đặc tả Yêu cầu Hệ thống VuaOffice

> **Tài liệu Yêu cầu Sản phẩm & Kỹ thuật (Product & Technical Requirements Document)**  
> **Truy nguồn từ**: [IDEA.md](IDEA.md)  
> **Chủ quản**: 360 CORP  
> **Phiên bản**: v1.0.0+

---

## 1. Tổng quan Dự án & Bối cảnh

### 1.1 Mục tiêu Kinh doanh & Kỹ thuật
- Xây dựng **VuaOffice** trở thành bộ công cụ văn phòng máy tính (Desktop Office Suite) hoàn chỉnh, mã nguồn mở, tích hợp trí tuệ nhân tạo (AI-Native) 100% miễn phí bản quyền.
- Hoàn toàn làm chủ hạ tầng định tuyến AI thông qua mạng lưới Gateway của 360 CORP (**OmiRouter**, **9Router**, **Hermes Agent**) và hỗ trợ Custom Endpoint tương thích chuẩn OpenAI API.
- Tự động hóa 100% quy trình Rebrand/Whitelabel thông qua CLI và quy trình đồng bộ 2 Remote Git (GitLab Private / GitHub Public).

### 1.2 Chân dung Người dùng (User Personas)
- **Doanh nghiệp & Tổ chức (Enterprise & SMEs)**: Cần giải pháp văn phòng bảo mật, làm chủ dữ liệu, tiết kiệm chi phí bản quyền Microsoft Office, hỗ trợ chuẩn định dạng OpenXML (.docx, .xlsx, .pptx).
- **Chuyên viên Tri thức & Lập trình viên (Knowledge Workers & Developers)**: Cần công cụ soạn thảo kết hợp AI thông minh, hỗ trợ Markdown/KaTeX/Mermaid, tóm tắt PDF, trích xuất dữ liệu tự động và khả năng tùy biến AI Provider trong Developer Mode.
- **Quản trị viên Hệ thống (IT Admins)**: Cần khả năng triển khai đồng loạt qua gói cài đặt chuẩn (DMG, EXE, AppImage/DEB) và dễ dàng quản lý phân phối cập nhật tự động (Auto-Updater).

---

## 2. Yêu cầu Chức năng Hệ thống (Functional Requirements)

### 2.1 Khung Ứng dụng Desktop Host (`apps/shell`)
- **Quản lý Đa Tab & Phân lập Tiến trình**:
  - Mở nhiều tài liệu đồng thời trên các tab riêng biệt.
  - Mỗi tab chạy trên một `WebContentsView` độc lập (`contextIsolation: true`, `nodeIntegration: false`). Sự cố ở một tab không làm sập ứng dụng chính.
- **Màn hình Khởi chạy (Home Launcher)**:
  - Hiển thị danh sách tệp gần đây (Recent Files), ghim tệp quan trọng (Pinned Files).
  - Khởi tạo nhanh tài liệu mới cho 6 loại ứng dụng: Docs, Sheets, Slides, PDF, Markdown, Mail.
  - Header Sidebar hiển thị logo thương hiệu sắc nét VuaOffice.
- **Hệ thống Menu Hệ thống & Phím tắt**:
  - Tích hợp chuẩn menu macOS Application Menu và Windows/Linux Menu Bar.
  - Hỗ trợ menu `Help > Troubleshooting > Enable Developer Mode` (dạng Checkbox toggle).
- **Cơ chế Cập nhật Tự động & Thủ công (Auto & Manual Updater)**:
  - Tự động kiểm tra bản cập nhật ngầm sau 15 giây khởi động và định kỳ mỗi 4 giờ.
  - Hỗ trợ kiểm tra thủ công qua menu `Check for Updates…` và Account popup với thông báo Dialog rõ ràng.

### 2.2 Soạn thảo Văn bản VuaOffice Docs (`apps/docs`)
- **Định dạng Hỗ trợ**: Đọc/ghi chuẩn xác tệp `.docx` (OpenXML), xuất PDF, in ấn trực tiếp.
- **Bộ máy Phân trang (Pagination Engine)**: Phân trang thời gian thực, hiển thị thước đo lề, header/footer, bảng biểu, ngắt trang chuẩn xác như Microsoft Word.
- **Tác tử AI Đồng hành (Docs AI Assistant)**:
  - Viết tiếp văn bản, viết lại theo phong cách chuyên nghiệp (Rewrite), tóm tắt và dịch thuật đa ngôn ngữ.
  - **Paragraph-level Patching**: Thay thế và cập nhật trực tiếp từng đoạn văn bản trong DOM mà không làm mất định dạng hoặc xáo trộn bố cục xung quanh.

### 2.3 Bảng tính & Phân tích Dữ liệu VuaOffice Sheets (`apps/sheets`)
- **Định dạng Hỗ trợ**: `.xlsx`, `.xlsm`, `.csv`, `.tsv`.
- **Hiệu năng & Rust Engine**: Tích hợp Rust sidecar engine cho tác vụ xử lý tệp dữ liệu lớn (> 100,000 dòng) và tính toán công thức phức tạp.
- **Tác tử AI Bảng tính (Sheets AI Copilot)**:
  - Tự động tạo công thức Excel phức tạp theo yêu cầu ngôn ngữ tự nhiên.
  - Phân tích xu hướng dữ liệu, tự động dựng Pivot Table và biểu đồ minh họa trực quan.

### 2.4 Trình chiếu & Thiết kế Slide VuaOffice Slides (`apps/slides`)
- **Định dạng Hỗ trợ**: `.pptx`, `.ppsx`.
- **Bộ máy Kết xuất (Render Engine)**: Kết xuất Canvas 2D + Konva với công nghệ HarfBuzz Text Shaping đảm bảo hiển thị hoàn hảo dấu tiếng Việt.
- **Tác tử AI Thiết kế Slide**:
  - Tạo dàn ý bài thuyết trình từ chủ đề hoặc trích xuất từ tài liệu Word/PDF.
  - Tự động dựng toàn bộ slide với bố cục chuyên nghiệp, phối màu hài hòa và tạo ghi chú thuyết trình (Speaker Notes).
  - Tự động xuất bản slide chất lượng cao sang định dạng PPTX và PDF.

### 2.5 Xem & Ghi chú VuaOffice PDF (`apps/pdf`)
- **Định dạng Hỗ trợ**: `.pdf`.
- **Công cụ Ghi chú & Chỉnh sửa**: Highlight, gạch chân, vẽ tay, chèn ghi chú (Sticky Notes), đóng dấu bản quyền (Stamp) và quản lý chữ ký số.
- **Tác tử AI Đọc hiểu PDF (Long-Context PDF Q&A)**: Đọc hiểu tài liệu hàng trăm trang, trích xuất tóm tắt nội dung chính và chuyển đổi bảng biểu PDF sang Sheets.

### 2.6 Soạn thảo Kỹ thuật VuaOffice Markdown (`apps/markdown`)
- **Định dạng Hỗ trợ**: `.md`, `.markdown`.
- **Tính năng Soạn thảo**: Tiptap Editor hỗ trợ GitHub Flavored Markdown (GFM), công thức toán học KaTeX, sơ đồ tư duy/kiến trúc Mermaid, Task Lists và xuất bản sang HTML/PDF.

### 2.8 Hệ sinh thái Mở rộng 360-Office & Universal File Creator (`360/packages/file-creator`)
- **Tạo & Lưu File Cục bộ Đa định dạng (Universal File Creation & Local Save)**:
  - Cho phép AI Assistant tại **bất kỳ ứng dụng nào** (PDF, Docs, Sheets, Slides, Markdown, Mail) tạo tệp tin mới độc lập theo các định dạng chuẩn: DOCX, XLSX, PPTX, PDF, Markdown (`.md`), Plain Text (`.txt`).
  - Ghi file an toàn trực tiếp xuống đĩa cục bộ (Desktop/Downloads hoặc mở hộp thoại Save Dialog của hệ điều hành).
- **Thẻ Tệp Tương tác (Interactive Artifact Card)**:
  - Hiển thị Artifact Card trực quan ngay trong khung chat AI sau khi tạo file.
  - Hỗ trợ các hành động nhanh 1-click: `Mở thư mục chứa file trong Finder/Explorer`, `Mở xem ngay trong tab mới của VuaOffice`.
- **Kiến trúc Plugin Độc lập (Zero-Conflict Extension)**:
  - Đóng gói toàn bộ logic trong thư mục tách biệt `360/`, bảo đảm không gây xung đột mã nguồn khi đồng bộ cập nhật từ upstream `genoffice`.

### 2.9 Xác thực Đơn điểm 360 CORP Odoo Auth Provider (1-Click SSO & Deep Link)
- **Luồng Người dùng 1-Click Login (Non-blocking & Zero-pending)**:
  - Nút đăng nhập "Đăng nhập bằng 360 CORP" tại Home Launcher mở trực tiếp trình duyệt tới Odoo Auth Portal (`https://vuahethong.net/vuaoffice/auth`).
  - Người dùng đăng nhập hoặc đăng ký tài khoản (bắt buộc 3 trường: Họ & Tên `name`, Email `email`, Số điện thoại `phone`).
  - Odoo tự động chuyển hướng về VuaOffice Desktop qua Custom Protocol `vuaoffice://auth/callback?token=...&name=...&email=...&phone=...`.
- **Deep Link Protocol Handler & State Management**:
  - Electron Main Process bắt sự kiện `open-url` (macOS) / `second-instance` (Windows) và xử lý lưu token tức thì vào `~/.genoffice/auth.json`.
  - Phát sự kiện IPC `accountLoginEvent` (`{ phase: 'success' }`) tới toàn bộ Renderer, cập nhật trạng thái người dùng tức thì không qua polling.

---

## 3. Yêu cầu Kết nối & Hạ tầng AI Gateway

### 3.1 Cấu hình AI Provider Mặc định
- Kết nối tự động qua hạ tầng **OmiRouter AI** (`https://api.omirouter.com/v1`) và **9Router AI** (`https://api.9router.com/v1`).
- Mô hình hỗ trợ: `claude-3-5-sonnet`, `gpt-4o`, `gemini-1.5-pro`, `deepseek-chat`.

### 3.2 Tác tử Thông minh Hermes Agent
- Kết nối đến **Hermes Agent** (`https://hermes.vuahethong.com/v1`).
- Hỗ trợ luồng suy luận đa bước (Agentic Tool Calling) và truy xuất dữ liệu ngữ cảnh nâng cao.

### 3.3 Chế độ Nhà phát triển (Developer Mode)
- Bật/tắt linh hoạt qua menu `Help > Troubleshooting > Enable Developer Mode`.
- Cho phép cấu hình Custom OpenAI-compatible Base URL và API Key cá nhân.

---

## 4. Yêu cầu Phi Chức năng (Non-Functional Requirements)

### 4.1 Hiệu năng & Khởi động
- Thời gian khởi động ứng dụng lạnh (Cold Start) < 1.5 giây trên thiết bị tiêu chuẩn.
- Thao tác chuyển đổi tab, mở tài liệu diễn ra tức thì (< 300ms).
- Script `whitelabel:apply` thực thi hoàn tất < 2 giây.

### 4.2 Bảo mật & Quyền riêng tư (Security & Privacy)
- **Zero Client Key Exposure**: Không lưu cứng API Key trong mã nguồn client; gọi API qua tiến trình Main bảo vệ nghiêm ngặt.
- **Phân lập Renderer**: Mọi cửa sổ/tab chạy với `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- **Kiểm soát External URL**: Toàn bộ liên kết ngoài phải qua cổng kiểm duyệt an toàn `safeExternalUrl` (chỉ chấp nhận http/https/mailto).

### 4.3 Khả năng Bảo trì & Đồng bộ Upstream
- Tách biệt 100% cấu hình thương hiệu trong `whitelabel/brand-config.json`.
- Khôi phục codebase sạch tức thì bằng lệnh `npm run whitelabel:restore` trước khi pull/merge từ upstream `genspark-ai/genoffice`.

### 4.4 Đa ngôn ngữ (i18n) & Design System
- Hỗ trợ đầy đủ Tiếng Việt và Tiếng Anh cùng 17 ngôn ngữ quốc tế khác.
- Tuân thủ nghiêm ngặt hệ thống Semantic Theme Tokens trong `packages/ui/src/tokens.css` và quy tắc "Dark Chrome, White Paper".

---

## 5. Ma trận Kiểm tra Nghiệm thu (Traceability & Acceptance Matrix)

| ID | Hạng mục Yêu cầu | Phương pháp Nghiệm thu | Trạng thái |
|---|---|---|---|
| **FR-01** | Áp dụng Whitelabel thương hiệu VuaOffice | Chạy `npm run whitelabel:apply`, sau đó `npm run whitelabel:status` báo SẠCH và `npm run brand:check` ĐẠT | Đạt |
| **FR-02** | Khôi phục Codebase gốc sạch sẽ | Chạy `npm run whitelabel:restore` (mã nguồn trở về dạng upstream — `git status` sẽ báo BẨN, vì trạng thái đã commit mang thương hiệu VuaOffice). Nghiệm thu bằng `npm run whitelabel:selftest`: bất biến `apply(restore(apply(x))) === apply(x)` phải ĐẠT | Đạt |
| **FR-02b** | Chống ghi đè khi đồng bộ upstream | `npm run upstream:setup` cấu hình remote + merge driver `ours`; `.gitattributes` bảo vệ tài sản thương hiệu; `npm run brand:gate` chặn rò rỉ sau merge | Đạt |
| **FR-03** | Tích hợp OmiRouter, 9Router, Hermes | Chạy typecheck và kiểm tra dropdown AI Settings trong ứng dụng | Đạt |
| **FR-04** | Toggle Developer Mode qua Menu Help | Kiểm tra checkbox trong `Help > Troubleshooting > Enable Developer Mode` | Đạt |
| **FR-05** | Kiểm tra cập nhật thủ công & tự động | Kiểm tra menu `Check for Updates…` và Account dropdown menu | Đạt |
| **FR-06** | Đóng gói phân phối đa nền tảng | Build thành công gói cài đặt DMG/EXE/DEB mang tên VuaOffice | Đạt |
| **FR-07** | Báo cáo chẩn đoán & Log lỗi hệ thống | Mở menu `Help > Troubleshooting > Generate Log, Diagnostic Report...`, kiểm tra export file và gửi GitLab Issues | Đạt |

---

**Chủ quản**: 360 CORP  
**Trạng thái**: Đã phê duyệt (Approved)  
**Ngày cập nhật**: 2026-08-16
