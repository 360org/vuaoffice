# SECURITY.md — Chính sách Bảo mật Hệ thống VuaOffice

> **Tài liệu Chính sách Bảo mật Thông tin & An toàn Ứng dụng (Security Policy)**  
> **Chủ quản**: 360 CORP  
> **Phiên bản**: v0.6.7+

---

## 1. Báo cáo Lỗ hổng Bảo mật (Reporting a Vulnerability)

360 CORP cam kết đảm bảo an toàn thông tin tối đa cho người dùng và doanh nghiệp sử dụng VuaOffice. Nếu phát hiện lỗ hổng bảo mật:
- **Tuyệt đối KHÔNG** mở công khai (public issue) trên GitHub/GitLab.
- Vui lòng gửi báo cáo bảo mật riêng tư qua tính năng [Private Vulnerability Reporting](https://github.com/360org/vuaoffice/security/advisories/new) hoặc gửi email trực tiếp đến `security@360.org.vn` / `support@360.org.vn`.
- Chúng tôi sẽ phản hồi tiếp nhận trong vòng **24–72 giờ** và tiến hành thẩm định, vá lỗi kịp thời.

---

## 2. Mô hình Bảo mật Đa Tiến trình Electron (Process Security Posture)

Toàn bộ các cửa sổ và tab tài liệu của VuaOffice Suite vận hành dưới cơ chế bảo vệ nghiêm ngặt nhất của Electron:

1. **Phân lập Tiến trình Tuyệt đối (Full Renderer Lockdown)**:
   - Tất cả các tab ứng dụng (`apps/docs`, `apps/sheets`, `apps/slides`, `apps/pdf`, `apps/markdown`, `apps/mail`, `apps/shell`, `updater`) đều thiết lập:
     - `contextIsolation: true`
     - `nodeIntegration: false`
     - `sandbox: true`
2. **Kênh Giao tiếp IPC An toàn & Kiểm soát Đường dẫn / Schema**:
   - Tiến trình Renderer chỉ có thể giao tiếp với Main Process thông qua các API có kiểu dữ liệu rõ ràng được công bố qua `contextBridge` (`window.aiOffice`, `window.vuaMail`).
   - Các payload IPC được kiểm tra kiểu, sanitize và kiểm soát biên an toàn: Sheets áp dụng xác thực schema end-to-end bằng `zod`, trong khi Shell/Docs/Slides kiểm tra sandbox đường dẫn người dùng (`assertSafeUserPath`, `isPathInside` với `path.sep` chuẩn đa nền tảng), cho phép chỉ truy cập các vùng hợp lệ.
   - Các định dạng markup nhúng (MathML, HTML email) được kiểm soát qua bộ phân tích `DOMParser` với danh sách thẻ/thuộc tính cho phép (allowlist) hoặc cách ly trong `<iframe sandbox>`.
3. **Cổng Kiểm soát Liên kết Ngoài (`safeExternalUrl`)**:
   - Mọi thao tác mở URL bên ngoài (`shell.openExternal`) bắt buộc phải đi qua cổng kiểm duyệt tập trung `@genoffice/electron-utils` → `safeExternalUrl`.
   - Chỉ cho phép các giao thức an toàn trong whitelist (`http:`, `https:`, riêng chú thích PDF cho phép thêm `mailto:`).
   - Tự động chặn và từ chối các giao thức nguy hiểm như `file:`, `javascript:`, `data:` hoặc custom URI schemes độc hại.
4. **Nguyên tắc "Zero Client Key Exposure"**:
   - Tuyệt đối không lưu cứng API Keys trong mã nguồn của ứng dụng.
   - Các yêu cầu AI mặc định được chuyển tiếp qua Gateway bảo mật của 360 CORP (OmiRouter / 9Router / Hermes).
   - Khi người dùng nhập API Key tùy biến trong Developer Mode, khóa sẽ được lưu trữ an toàn trong vùng nhớ cấu hình hệ điều hành cục bộ (`app-settings.json` trong thư mục User Data được bảo vệ).

---

## 3. Mô hình Đe dọa & Phòng thủ (Threat Models)

### 3.1 Thực thi Script Bố cục Slide do AI Tạo ra (`apps/slides`)
Tác tử AI của Slides có khả năng tinh chỉnh bố cục bằng cách sinh ra một đoạn script ngắn. Để ngăn chặn nguy cơ tấn công RCE (Remote Code Execution) hoặc Injection:
- Đoạn mã **KHÔNG BAO GIỜ** được thực thi trực tiếp qua `eval()`, `new Function()`, `vm` context hay Web Worker.
- Mã được phân tích cú pháp (parse) bằng **Acorn AST** và được thông dịch bởi bộ diễn dịch AST tùy biến cô lập (`apps/slides/src/renderer/ai/layout-script-interpreter.ts`).
- **Phạm vi An toàn của Bộ Diễn dịch (Interpreter Sandbox)**:
  - Chỉ làm việc trên bản sao JSON độc lập không chứa prototype của các phần tử đồ họa (`els`/`canvas`).
  - Chỉ hỗ trợ các hàm toán học, chuỗi và các lệnh chỉnh sửa đồ họa cơ bản (`setBox`, `moveBy`, `resizeBy`, `setText`, `setStyle`, `setFill`, `setStroke`, `log`).
  - Mọi thao tác ghi đều lưu vào một buffer tạm và được kiểm tra hợp lệ trước khi áp dụng vào pipeline chỉnh sửa tài liệu.
  - Giới hạn số lượng câu lệnh (statement limit) và độ sâu đệ quy để chống tấn công từ chối dịch vụ (DoS / Infinite Loop).

### 3.2 Kết xuất HTML phục vụ Xuất bản Slide sang PPTX
Quá trình chuyển đổi HTML sang PPTX của Slides được thực thi trong một `BrowserWindow` ẩn:
- Cửa sổ này được đối xử như một vùng chứa mã không tin cậy (Hostile Content Sandbox): `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- Không nạp bất kỳ Preload script nào và không mở bất kỳ kênh IPC nào.
- Tiến trình Main điều khiển việc xuất bản độc quyền qua `executeJavaScript` với cơ chế giám sát thời gian thực (Watchdog Timeout) tự động hủy tiến trình khi hết hạn.

---

## 4. Phạm vi Ngoài Chính sách (Out of Scope)

- Các dịch vụ Cloud AI bên thứ ba kết nối qua API công cộng (vấn đề bảo mật hạ tầng máy chủ của nhà cung cấp thuộc trách nhiệm của bên thứ ba tương ứng).
- Các cuộc tấn công đòi hỏi kẻ tấn công đã kiểm soát toàn quyền máy tính người dùng (Root/Admin compromised environment) hoặc trực tiếp can thiệp/sửa đổi mã nhị phân của ứng dụng.
- Việc ghi đè các biến môi trường phát triển cục bộ (`XLSX_SIDECAR_PATH`, `GSK_CLI_PATH`) vốn đòi hỏi quyền kiểm soát process environment trên thiết bị.

---

**Chủ quản**: 360 CORP  
**Trạng thái**: Đã phê duyệt (Approved)  
**Ngày cập nhật**: 2026-08-16
