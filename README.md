<div align="center">

# 👑 VuaOffice

### Bộ Ứng Dụng Văn Phòng AI-Native Thuần Việt — Thay Thế Hoàn Toàn Microsoft Office

[![Release](https://img.shields.io/github/v/release/360org/vuaoffice?color=0077cd&label=Phi%C3%AAn%20b%E1%BA%A3n)](https://github.com/360org/vuaoffice/releases/latest)
[![License](https://img.shields.io/badge/Gi%E1%BA%A5y%20ph%C3%A9p-Apache%202.0-00ce2c)](LICENSE)
[![Platform](https://img.shields.io/badge/N%E1%BB%81n%20t%E1%BA%A3ng-macOS%20%7C%20Windows%20%7C%20Linux-slate)](https://github.com/360org/vuaoffice/releases/latest)
[![Website](https://img.shields.io/badge/Trang%20ch%E1%BB%A7-vuaoffice.com-0077cd)](https://vuaoffice.com)

**VuaOffice** là bộ giải pháp văn phòng thế hệ mới do **360 CORP** phát triển, kết hợp hoàn hảo giữa trải nghiệm soạn thảo quen thuộc của Microsoft Office với sức mạnh Trí tuệ Nhân tạo (AI). Ứng dụng chạy mượt mà trên macOS, Windows và Linux, hoạt động ngoại tuyến an toàn và bảo mật tối đa cho cá nhân và doanh nghiệp.

[🌐 Khám phá Trang chủ](https://vuaoffice.com) · [📦 Tải về ngay](#-t%E1%BA%A3i-v%E1%BB%81-b%E1%BB%99-c%C3%A0i-%C4%91%E1%BA%B7t) · [✨ Tính năng nổi bật](#-t%C3%ADnh-n%C4%83ng-%C4%91%E1%BB%99t-ph%C3%A1) · [🤖 Dành cho Coding Agent](#-t%C3%ADch-h%E1%BB%A3p-ai-coding-agents--mcp-server)

</div>

---

## 📦 Tải về bộ cài đặt

Tất cả các bản phát hành được đóng gói tự động, bảo đảm tính toàn vẹn và chữ ký số an toàn:

| Hệ điều hành | Kiến trúc | Tải về trực tiếp | Gói bổ trợ |
| :--- | :--- | :--- | :--- |
| **macOS** | **Apple Silicon** (`M1/M2/M3/M4`) | [📥 Tải .DMG (Khuyên dùng)](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-macOS-arm64.dmg) | [Bản nén .ZIP](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-macOS-arm64.zip) |
| **macOS** | **Intel** (`x86_64`) | [📥 Tải .DMG](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-macOS-x64.dmg) | [Bản nén .ZIP](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-macOS-x64.zip) |
| **Windows** | **64-bit** (`x64`) | [📥 Tải .EXE Installer](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-Windows-x64-Setup.exe) | Windows 10 / 11 |
| **Windows** | **32-bit** (`ia32`) | [📥 Tải .EXE (Legacy)](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50-Windows-ia32-Setup.exe) | Máy cấu hình thấp |
| **Linux** | **Ubuntu / Debian** (`amd64`) | [📥 Tải gói .DEB](https://github.com/360org/vuaoffice/releases/latest/download/vuaoffice_1.0.50_amd64.deb) | Ubuntu 20.04+, Debian |
| **Linux** | **Mọi bản phân phối** (`x86_64`) | [📥 Tải .AppImage](https://github.com/360org/vuaoffice/releases/latest/download/VuaOffice-1.0.50.AppImage) | Chạy ngay không cần cài |

> 💡 *Sếp có thể xem toàn bộ các phiên bản và nhật ký thay đổi tại [Trang Releases GitHub](https://github.com/360org/vuaoffice/releases).*

---

## 🏢 Trọn bộ 7 ứng dụng văn phòng tích hợp

VuaOffice cung cấp không gian làm việc đồng nhất dưới một cửa sổ thông minh với đầy đủ 7 phân hệ thiết yếu:

```
VuaOffice Suite
├── 📄 VuaOffice Docs      → Soạn thảo văn bản chuẩn Word (.docx), giữ nguyên cấu trúc và bố cục.
├── 📊 VuaOffice Sheets    → Bảng tính chuẩn Excel (.xlsx), hỗ trợ Pivot Table, biểu đồ và engine tính toán Rust tốc độ cao.
├── 📽️ VuaOffice Slides    → Thiết kế bài trình chiếu chuyên nghiệp (.pptx), hỗ trợ layout hiện đại và text-shaping cao cấp.
├── 📑 VuaOffice PDF       → Chỉnh sửa trực tiếp văn bản trong file PDF gốc, nhận dạng chữ tiếng Việt OCR ngoại tuyến.
├── 📝 VuaOffice Markdown  → Trình biên soạn Markdown trực quan, chia đôi màn hình, dàn bài thông minh và xuất đa định dạng.
├── 🌐 VuaOffice HTML      → Soạn thảo và xem trước trang web, tài liệu HTML động kèm trợ lý AI thiết kế bố cục.
└── ✉️ VuaOffice Mail      → Quản lý Hộp thư điện tử (IMAP/POP3) và Lịch làm việc bảo mật cao, thay thế hoàn hảo Outlook.
```

---

## ✨ Tính năng đột phá

### 1. Tương thích 100% định dạng Microsoft Office
Mở, chỉnh sửa và lưu trực tiếp các tệp `.docx`, `.xlsx`, `.pptx` với cơ chế **bảo toàn nguyên vẹn byte (Byte-Preserving)**. Các phần nội dung không can thiệp sẽ được giữ nguyên tuyệt đối, không lo xô lệch font chữ, vỡ bảng hay sai định dạng khi trao đổi với người dùng Microsoft Office.

### 2. Trợ lý Trí tuệ Nhân tạo (AI-Native) tích hợp sẵn
Mỗi phân hệ đều tích hợp sẵn thanh công cụ AI thông minh:
* **Docs & Markdown**: Tự động viết tiếp, tóm tắt báo cáo, sửa lỗi chính tả, dịch thuật đa ngôn ngữ và định dạng lại văn bản theo ngữ cảnh.
* **Sheets**: Diễn giải dữ liệu bằng ngôn ngữ tự nhiên, tự động sinh công thức Excel phức tạp, gợi ý tạo biểu đồ trực quan.
* **Slides**: Tạo cấu trúc bài thuyết trình, gợi ý nội dung từng trang trình chiếu và tối ưu hóa thông điệp.
* **PDF OCR Ngoại tuyến**: Nhận dạng chữ viết tiếng Việt và tiếng Anh trên các trang quét (scan) hoàn toàn offline mà không cần kết nối mạng.

### 3. Quyền riêng tư & Bảo mật dữ liệu tuyệt đối
* **Soạn thảo Offline**: Mọi thao tác đọc, sửa, lưu tệp đều diễn ra 100% tại máy tính của người dùng. Tài liệu không bao giờ bị tải lên máy chủ ngoài ý muốn.
* **Linh hoạt AI Provider (BYOK)**: Người dùng có thể tùy chọn kết nối cổng AI Gateway riêng của doanh nghiệp (360 CORP OmiRouter, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Ollama...) hoặc sử dụng kết nối mặc định.

### 4. Giao diện thuần Việt & Trải nghiệm thân thiện
* Giao diện người dùng được thiết kế chuẩn mực theo phong cách Flat Design hiện đại với hai tông màu công nghệ đặc trưng của 360 CORP: **Xanh dương Công nghệ (`#0077cd`)** và **Xanh lá Chuyển đổi số (`#00ce2c`)**.
* Hỗ trợ đầy đủ chế độ Sáng (Light), Tối (Dark) và Tự động theo Hệ thống (System), bảo vệ thị lực khi làm việc ban đêm.

---

## 🤖 Tích hợp AI Coding Agents & MCP Server

VuaOffice là bộ ứng dụng văn phòng tiên phong hỗ trợ giao thức **Model Context Protocol (MCP)**, cho phép các trợ lý lập trình thông minh (như Claude Code, Cursor, Codex, Windsurf) trực tiếp đọc, trích xuất dữ liệu và tạo báo cáo văn phòng tự động.

### 1. Kích hoạt Kỹ năng `/vuaoffice` trên Claude Code
Sau khi cài đặt ứng dụng, Sếp có thể kích hoạt kỹ năng VuaOffice ngay trong terminal của Claude Code hoặc Cursor:

```bash
# Cài đặt hoặc cập nhật skill VuaOffice cho Coding Agent
vuaoffice skill install

# Sử dụng kỹ năng trong cuộc trò chuyện
/vuaoffice "Tóm tắt tài liệu hợp đồng và trích xuất bảng báo giá ra file excel"
```

### 2. Kết nối MCP Server
VuaOffice cung cấp sẵn máy chủ MCP nội bộ:
```json
{
  "mcpServers": {
    "vuaoffice": {
      "command": "vuaoffice",
      "args": ["mcp"]
    }
  }
}
```

---

## ❓ Câu hỏi thường gặp (FAQ)

<details>
<summary><b>1. VuaOffice có miễn phí không?</b></summary>
Có. VuaOffice được phát hành miễn phí cho người dùng cá nhân và doanh nghiệp. Người dùng có thể sử dụng trọn vẹn toàn bộ 7 ứng dụng văn phòng mà không bị giới hạn tính năng soạn thảo.
</details>

<details>
<summary><b>2. Mở file của Microsoft Office có bị nhảy dòng hay mất định dạng không?</b></summary>
Không. VuaOffice áp dụng kiến trúc phân tích hình học tài liệu và cơ chế bảo toàn byte. Các thành phần bảng biểu, chân trang, tiêu đề và phông chữ trong .docx, .xlsx, .pptx được hiển thị chuẩn xác và giữ nguyên khi lưu lại.
</details>

<details>
<summary><b>3. Ứng dụng có thể hoạt động khi mất kết nối Internet không?</b></summary>
Hoàn toàn được. Toàn bộ các tính năng mở, chỉnh sửa, lưu, in ấn, xuất PDF và nhận dạng chữ quét (OCR) đều hoạt động cục bộ 100% trên thiết bị của bạn. Chỉ các tính năng hỏi đáp Trợ lý AI nâng cao mới yêu cầu kết nối mạng.
</details>

<details>
<summary><b>4. VuaOffice có thu thập nội dung tài liệu của tôi không?</b></summary>
Tuyệt đối không. Ứng dụng cam kết không bao giờ thu thập, đọc lén hay gửi nội dung tài liệu, tên file, đường dẫn tệp hay dữ liệu cá nhân của người dùng về máy chủ. Mọi dữ liệu của bạn thuộc về chính bạn.
</details>

---

## ⚖️ Bản quyền & Giấy phép (License & Attribution)

* **Phát triển & Sở hữu thương hiệu**: Bản quyền © 2026 **360 CORP**. Nhãn hiệu "VuaOffice", logo và nhận diện thương hiệu thuộc quyền sở hữu của 360 CORP.
* **Mã nguồn nền tảng**: VuaOffice được phát triển dựa trên dự án mã nguồn mở GenOffice (bản quyền © 2026 Mainfunc, Inc.) và tuân thủ đầy đủ các điều khoản của **[Apache License 2.0](LICENSE)**.
* **Thành phần bên thứ ba**: Dự án sử dụng và ghi nhận sự đóng góp của các thư viện mã nguồn mở uy tín: Electron, Univer, PDFium, PDF.js, Tiptap, ProseMirror, Konva, HarfBuzz, calamine, IronCalc và các phông chữ mở Liberation, Carlito, Noto Sans. Chi tiết xem tại Thông báo Bản quyền Bên thứ ba (`npm run notices`).

---

<div align="center">

**[Trang chủ VuaOffice](https://vuaoffice.com)** · **[Tài liệu Kỹ thuật](docs/)** · **[Trung tâm Hỗ trợ](https://vuahethong.net)**

*Đồng hành cùng Doanh nghiệp Việt Nam trong Kỷ nguyên Văn phòng Thông minh & Chuyển đổi số.*

</div>
