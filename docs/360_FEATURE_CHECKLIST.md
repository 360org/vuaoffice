# BẢNG KIỂM TRA TOÀN DIỆN CÁC TÍNH NĂNG 360 CORP (VUAOFFICE)

Tài liệu này là **bảng kiểm tra bắt buộc (Mandatory Regression Checklist)** cho toàn bộ tính năng và module độc quyền do **360 CORP** phát triển trên nền tảng VuaOffice so với bản gốc upstream (GenOffice). 

Mỗi khi **merge upstream**, **sửa lỗi** hoặc **chuẩn bị release phiên bản mới**, bắt buộc phải chạy kiểm tra tự động qua `npm run brand:gate` và rà soát thủ công theo bảng kiểm dưới đây.

---

## 1. Danh Mục 10 Nhóm Tính Năng Độc Quyền 360 CORP

| STT | Nhóm Tính Năng | Vị trí mã nguồn | Điểm đấu nối then chốt | Mục tiêu kiểm tra |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **VuaOffice Mail** | `apps/mail/`, `packages/mail-engine/` | `extraResources`, `installRendererProtocol`, `RendererHost`, port 5179, `APPS` | Mở tab Mail không bị màn hình trắng; kết nối IMAP/SMTP, AI Compose, Smart Reply, đồng bộ Odoo CRM/Helpdesk. |
| **2** | **360 AI Gateway & OmiRouter** | `packages/ai-provider/`, `360/brand-config.json` | `defaultProvider: "vuaairouter"`, `vuaairouterUrl`, Hermes Agent endpoint | Gọi AI trả lời mượt qua Gateway của 360 (`ai-router.vuahethong.com`), hỗ trợ chuyển đổi linh hoạt. |
| **3** | **Bản quyền & Giấy phép 360** | `apps/shell/src/renderer/src/AboutModal.tsx` | Copyright 360 CORP (Derivative Work / Proprietary Freeware), Apache 2.0 Attribution Mainfunc | Modal Giới thiệu (About) hiển thị đúng bản quyền 360 CORP, mở Third-Party Notices và Open Source licenses đầy đủ. |
| **4** | **Sửa tiêu đề Tab Tài liệu** | `apps/shell/src/main/tab-manager.ts`, `apps/shell/src/renderer/src/Home.tsx` | IPC `shell:tab-title`, hàm `renameTab()`, menu context tab | Cho phép click đúp hoặc chuột phải đổi tên tab trực tiếp trên thanh tab mà không làm thay đổi hay hỏng file gốc. |
| **5** | **Tìm kiếm Font tiếng Việt (Gập dấu)** | `packages/ui/src/dropdown.tsx`, `apps/docs/src/renderer/components/Ribbon.tsx` | Thuộc tính `searchable`, hàm chuẩn hóa diacritic (`normalize('NFD')`, bỏ dấu tiếng Việt) | Khi gõ "danh", "tieng viet", "carlito" trên thanh font đều lọc ra đúng danh sách font tương ứng. |
| **6** | **Offline Apple Vision OCR (macOS)** | `packages/pdf2docx/ocr-helper/vision-ocr.swift`, `packages/pdf2docx/src/ocr-vision.ts` | Binary `vision-ocr`, framework Apple Vision native | Nhận dạng chữ tiếng Việt/Anh trong PDF scan hoàn toàn offline trên macOS mà không gửi dữ liệu ra ngoài. |
| **7** | **PDF Forensics Alteration Inspector** | `apps/pdf/tests/pdf-forensics.test.ts`, `apps/pdf/src/` | Bộ phân tích cấu trúc chữ ký số, metadata sửa đổi, lớp đối tượng ẩn | Phát hiện tài liệu PDF bị tẩy xóa, can thiệp nội dung, cảnh báo tính toàn vẹn của chữ ký số. |
| **8** | **Cổng Tải Về vuahethong.net & Update Modal** | `apps/shell/src/main/updater.ts` | `DOWNLOAD_PAGE_URL: 'https://vuahethong.net/#download-desktop-app'`, `onOpenDownload` | Khi có bản cập nhật mới hoặc cập nhật lỗi, nút bấm luôn mở trang landing page `vuahethong.net`, tuyệt đối không mở link thô GitHub raw binary. |
| **9** | **Động Cơ Whitelabel Song Ánh** | `360/brand-config.json`, `scripts/360-brand.js` | Quy tắc song ánh `apply(restore(apply(x))) === apply(x)`, selftest 1234 tệp | Đảm bảo chuyển đổi sạch giữa upstream và VuaOffice trước/sau khi merge, không rò rỉ tên gốc trên giao diện. |
| **10** | **Website & Trình Sinh Changelog Tự Động** | `tools/sync-site-updates.mjs`, `docs/updates.json`, `docs/index.html` | Cổng `site:check`, tự động đồng bộ theo version `package.json` | Website giới thiệu sản phẩm và lịch sử phiên bản trên `vuaoffice.com` luôn đồng bộ tự động 100%. |

---

## 2. Checklist 10 Bước Kiểm Thử Bắt Buộc Trước Khi Release

Trước khi tag và release bất kỳ phiên bản nào, kỹ sư phụ trách BẮT BUỘC thực hiện tuần tự:

- [ ] **Bước 1 (Cổng tự động)**: Chạy `npm run brand:gate`. Toàn bộ 7 cổng kiểm tra (Selftest, Brand, Audit, Site, Boundary, Module-Wiring, 360-Features) phải báo **ĐẠT 100%**.
- [ ] **Bước 2 (Kiểm tra VuaOffice Mail)**: Khởi động app qua `npm run dev`, bấm mở tab **Mail**. Xác nhận giao diện hiển thị danh sách thư, thanh soạn thảo, không xuất hiện màn hình trắng.
- [ ] **Bước 3 (Kiểm tra AI Assistant)**: Mở khung chat AI trong Docs hoặc Mail, gõ câu hỏi thử nghiệm. Xác nhận AI phản hồi thông qua 360 Gateway (`vuaairouter`).
- [ ] **Bước 4 (Kiểm tra Tìm kiếm Font)**: Trong Docs, bấm vào dropdown chọn Font trên thanh Ribbon, gõ tìm kiếm tiếng Việt không dấu (VD: "danh", "sans"). Xác nhận danh sách font hiển thị chính xác.
- [ ] **Bước 5 (Kiểm tra Đổi tên Tab)**: Mở 1 file tài liệu, click đúp hoặc chuột phải vào tab trên thanh tiêu đề, đổi tên thành tên khác. Xác nhận tên tab cập nhật tức thì.
- [ ] **Bước 6 (Kiểm tra About Modal)**: Vào menu `VuaOffice > About VuaOffice`. Xác nhận bản quyền ghi rõ `360 CORP (Derivative Work & Proprietary Freeware)` và phần Original Work ghi nhận `Mainfunc, Inc. (GenOffice)`.
- [ ] **Bước 7 (Kiểm tra Nút Cập nhật)**: Bấm `Check for Updates`. Nếu gặp sự cố hoặc chọn tải thủ công, xác nhận trình duyệt mở ra trang `https://vuahethong.net/#download-desktop-app`.
- [ ] **Bước 8 (Kiểm tra PDF OCR / Scan)**: Mở 1 file PDF dạng ảnh quét trên macOS, chọn chuyển đổi sang văn bản hoặc tìm kiếm. Xác nhận tiến trình Apple Vision OCR hoạt động bình thường.
- [ ] **Bước 9 (Kiểm tra Theme Sáng / Tối)**: Chuyển đổi giữa Light Mode, Dark Mode và System. Xác nhận màu nền semantic tokens đổi mượt, không lỗi hiển thị tương phản.
- [ ] **Bước 10 (Kiểm tra Website & Changelog)**: Kiểm tra `docs/index.html` và `docs/changelog.html` đã được cập nhật đúng số phiên bản mới nhất qua `npm run site:sync`.
