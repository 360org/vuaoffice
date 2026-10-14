# REQUIREMENTS.md — VuaOffice Whitelabel & Rebrand

> Sinh từ [IDEA.md](IDEA.md). Mỗi section truy nguồn về IDEA tương ứng.

## 1. Tổng quan dự án

### 1.1 Mục tiêu kinh doanh
- Chuyển đổi bộ ứng dụng GenOffice thành **VuaOffice** thuộc sở hữu của **360 CORP**.
- Độc lập hạ tầng AI bằng cách định tuyến qua **vuaaipro** và **9router**.
- Tự động hoá 100% quy trình rebrand qua CLI để tối ưu chi phí vận hành và bảo trì khi cập nhật từ upstream.

### 1.2 Đối tượng người dùng (Personas)
- **Doanh nghiệp vừa và nhỏ (SMEs) tại Việt Nam**: Cần bộ công cụ soạn thảo tài liệu (Docs, Sheets, Slides, Markdown, PDF) tích hợp AI với giao diện tiếng Việt, thương hiệu uy tín của 360 CORP.
- **Quản trị viên hệ thống (IT Admin)**: Cần deploy và cấu hình ứng dụng VuaOffice với API Key AI Router riêng của doanh nghiệp.

### 1.3 Phạm vi (Scope)
- **Trong phạm vi:**
  - Viết CLI script `scripts/whitelabel.js` để tự động hóa việc `apply` rebrand (patch cấu hình build, copy logo/icon, thay thế từ khóa) và `restore` codebase gốc.
  - Cấu hình file `whitelabel/brand-config.json` chứa toàn bộ biến số thương hiệu (tên app, appID, text replacement rules, mặc định provider).
  - Tích hợp 2 provider AI mới: `vuaaipro` và `ninerouter` vào hệ thống core `packages/ai-provider`.
  - Thay đổi default AI provider từ `genspark` thành `vuaaipro`.
  - Thay đổi toàn bộ logo và icon ứng dụng (PNG, ICNS, ICO, SVG) sang logo VuaOffice.
- **Ngoài phạm vi:**
  - Sửa đổi giao diện gốc hoặc tính năng cốt lõi của các ứng dụng con (Docs, Sheets, Slides, PDF).
  - Thay đổi cơ chế lưu trữ file hoặc quản lý tab nội bộ của Electron.

## 2. Yêu cầu chức năng (Functional Requirements)

### 2.1 CLI Script Whitelabel
- **Mô tả:** CLI script hỗ trợ hai câu lệnh `node scripts/whitelabel.js apply` và `node scripts/whitelabel.js restore`.
- **Tiêu chí nghiệm thu:**
  - Khi chạy `apply`: Toàn bộ cấu hình Electron (productName, appId, executableName, author) được cập nhật theo `brand-config.json`. Các từ khóa "GenOffice" và "Genspark" trong file code được chỉ định sẽ được thay thế tương ứng thành "VuaOffice" và "360 CORP". Logo và icon được sao chép đè lên file gốc.
  - Khi chạy `restore`: Khôi phục lại toàn bộ codebase sạch sẽ về trạng thái ban đầu của upstream thông qua `git checkout`. Không để sót file rác hoặc thay đổi thương hiệu nào trong git tracker.
- **Nguồn:** IDEA §Vision, §Giá trị cốt lõi

### 2.2 Tích hợp AI Router (vuaaipro / ninerouter)
- **Mô tả:** Tích hợp `vuaaipro` và `ninerouter` vào danh sách AI Provider của ứng dụng.
- **Tiêu chí nghiệm thu:**
  - Hỗ trợ các model mặc định: `claude-3-5-sonnet`, `gpt-4o`, `gemini-1.5-pro`, `deepseek-chat`.
  - Hỗ trợ custom Base URL lấy từ cấu hình `brand-config.json` hoặc nhập thủ công trong phần cài đặt AI của ứng dụng.
  - Thiết lập default AI provider của ứng dụng là `vuaaipro`.
  - Luồng stream AI tương thích chuẩn OpenAI (`streamOpenAiCompatible`).
- **Nguồn:** IDEA §Bài toán cần giải quyết, §Vision

### 2.3 Tích hợp Module VuaMail (`apps/mail`)
- **Mô tả:** Tích hợp ứng dụng email client VuaMail vào thanh công cụ và launcher của VuaOffice Suite.
- **Tiêu chí nghiệm thu:**
  - Kế thừa engine lưu trữ SQLite cục bộ và hàng đợi offline OpQueue từ GenMail.
  - Giao diện Outlook Ribbon 3 cột (AppRail, Folder Tree, Message List, Reading/Compose Pane) chuẩn Fluent UI trên React 19.
  - Tích hợp tính năng AI: tóm tắt chuỗi thư (Thread Summary), soạn thư thông minh (AI Compose Draft) và trả lời nhanh (Smart Reply).
  - Tương thích 100% Theme Semantic Tokens (Light/Dark mode) của VuaOffice.

### 2.4 Tính năng Kiểm tra Cập nhật Thủ công (Manual Check for Updates)
- **Mô tả:** Cho phép người dùng chủ động kiểm tra phiên bản mới từ UI hoặc menu hệ thống.
- **Tiêu chí nghiệm thu:**
  - Tích hợp menu `Check for Updates…` trên macOS Application Menu và Windows/Linux Help menu.
  - Tích hợp nút kiểm tra trong Account dropdown menu tại màn hình chính `Home.tsx`.
  - Phản hồi trực quan bằng Native Dialog khi đã ở bản mới nhất hoặc có lỗi kết nối; giữ im lặng đối với kiểm tra ngầm định kỳ.
## 3. Yêu cầu phi chức năng (Non-Functional Requirements)

### 3.1 Hiệu năng
- Script whitelabel apply/restore phải thực thi nhanh chóng (< 2 giây).
- Quá trình stream AI qua vuaaipro/9router không được làm tăng độ trễ (latency) so với kết nối trực tiếp đến các provider gốc.

### 3.2 Bảo mật
- Không lưu cứng API Keys trong mã nguồn. Cung cấp giao diện cấu hình API key cho người dùng cuối.
- Dữ liệu truyền tải qua API Router phải sử dụng giao thức HTTPS bảo mật.

### 3.3 Khả năng bảo trì (Maintainability)
- Toàn bộ thay đổi phải được cô lập và có thể rollback sạch sẽ để phục vụ cho quy trình Git Merge từ upstream GenOffice.
- Cấu hình thương hiệu tách biệt hoàn toàn khỏi logic code thông qua `whitelabel/brand-config.json`.

### 3.4 Đa ngôn ngữ (i18n)
- Hỗ trợ tiếng Việt và tiếng Anh đồng bộ với hệ thống i18n sẵn có của GenOffice.

## 4. Thiết kế & Trải nghiệm (UX/UI)

### 4.1 Brand guidelines
- Tên hiển thị trên thanh tiêu đề ứng dụng, menu và các thông tin giới thiệu: **VuaOffice**.
- Đơn vị phát triển hiển thị: **360 CORP**.
- Logo ứng dụng: Sử dụng logo VuaOffice (được override tại `apps/shell/src/renderer/src/assets/genoffice-logo.svg`).
- Icon ứng dụng: Override đầy đủ định dạng PNG, ICNS (macOS), ICO (Windows).

## 5. Tích hợp & Phụ thuộc

### 5.1 Hệ thống bên ngoài
- **VuaAI Pro API**: Gateway phân phối AI của 360 CORP (mặc định: `https://vuahethong.net`).
- **9Router API**: Gateway phân phối AI dự phòng của 360 CORP (mặc định: `https://api.9router.com/v1`).

### 5.2 Hệ sinh thái
- Liên kết nhận diện thương hiệu với hệ sinh thái **360 CORP**.

## 6. Ràng buộc (Constraints)

### 6.1 Công nghệ
- NodeJS >= 22.12.0
- Electron >= 43.3.0
- Git phải được cài đặt trên máy dev/build để phục vụ cơ chế `restore` (git checkout).

## 7. Tiêu chí nghiệm thu (Acceptance Criteria)

| # | Tiêu chí | Phương pháp kiểm tra |
|---|----------|---------------------|
| 1 | Áp dụng Whitelabel thành công | Chạy `npm run whitelabel:apply`, kiểm tra thông tin hiển thị trong `package.json` và `electron-builder.cjs` |
| 2 | Khôi phục Codebase gốc sạch sẽ | Chạy `npm run whitelabel:restore`, chạy `git status` đảm bảo không còn file code nào bị modified (ngoại trừ brand-config.json và scripts/whitelabel.js) |
| 3 | Tích hợp AI Router thành công | Chạy typecheck và kiểm tra settings AI trong ứng dụng có xuất hiện VuaAI Pro AI và 9Router AI với URL tương ứng |
| 4 | Build ứng dụng thành công | Chạy `npm run dist:mac` build ra file cài đặt `.dmg` / `.app` mang tên VuaOffice và hoạt động bình thường |

---

**Nguồn:** [IDEA.md](IDEA.md)
**Người duyệt:** Sếp (Product Owner)
**Trạng thái:** Approved
**Ngày duyệt:** 2026-08-10
