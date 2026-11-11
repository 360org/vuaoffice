# ĐẶC TẢ KIẾN TRÚC SIÊU ỨNG DỤNG DOANH NGHIỆP: VUAOFFICE SUPER-APP
## HỢP NHẤT VUAOFFICE (OFFICE SUITE) • VUA AI (BRAIN ENGINE) • VUA HỆ THỐNG (ODOO ERP)

> **Mã tài liệu**: `360-ARCH-VUAOFFICE-SUPERAPP-ENTERPRISE`  
> **Phiên bản kiến trúc**: `v5.0.0` (Super-App Unified Architecture • Ultra-Smooth • Server Offloading)  
> **Tác giả**: 360 CORP Architecture Team  
> **Ngày chuẩn hoá**: 2026-11-10  
> **Cơ sở nền tảng**: Kế thừa và hợp nhất từ `docs/pro/{IDEA,ARCH,PLAN}.md`, nghiên cứu thực chiến mã nguồn VuaOffice và các chỉ đạo chiến lược từ Sếp.

---

## 1. Tuyên Ngôn Siêu Ứng Dụng (The Super-App Manifesto)

> **"TẬP TRUNG LÕI ENGINE LÀ VUA AI, CÒN DOCS / SHEETS / PDF / MAIL / VUA HỆ THỐNG ĐỀU LÀ MỘT HOẶC CÁC COMBINE TOOLS ĐỂ LÀM VIỆC. CHẠY PHẢI MƯỢT MÀ, GIẢM TẢI TỐI ĐA CHO SERVER, ĐỒNG BỘ NHẸ NHÀNG."**

VuaOffice không đơn thuần là một bộ ứng dụng văn phòng rời rạc hay một trình duyệt bọc Odoo (wrapper). VuaOffice là **SIÊU ỨNG DỤNG ĐIỀU HÀNH DOANH NGHIỆP TẬP TRUNG (UNIFIED DIGITAL WORKPLACE)**:
1. **Vua AI là Bộ Não (Core Brain & Orchestrator)**: Lắng nghe khẩu lệnh tự nhiên của người dùng, phân tích ngữ cảnh, điều phối công việc xuyên suốt giữa các ứng dụng.
2. **Bộ Công Cụ Văn Phòng (Office Arms)**: Docs, Sheets, Slides, PDF, Markdown, HTML và VuaMail — xử lý các dữ liệu "đang trôi" (tài liệu, bảng biểu, email, hóa đơn đính kèm).
3. **VuaHethong ERP (Enterprise Data Core)**: Phân hệ Odoo SaaS — nắm giữ "sổ sách đã chốt" (Kho, Bán hàng, Mua hàng, Kế toán, Nhân sự, CRM).

```
                             ┌───────────────────────────────┐
                             │       SẾP / NGƯỜI DÙNG        │
                             └───────────────┬───────────────┘
                                             │ Ngôn ngữ tự nhiên / Thao tác
                                             ▼
                             ┌───────────────────────────────┐
                             │       LÕI: VUA AI ENGINE      │
                             │  (Suy luận • RAG • Điều phối) │
                             └───────────────┬───────────────┘
              ┌──────────────────────────────┼──────────────────────────────┐
              ▼                              ▼                              ▼
     ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
     │  VUAOFFICE APPS │            │     VUAMAIL     │            │ VUA HỆ THỐNG    │
     │ Docs/Sheets/PDF │            │  Email Doanh    │            │ Odoo ERP Client │
     │ Markdown/Slides │            │  Nghiệp Outlook │            │ Instance SaaS   │
     └─────────────────┘            └─────────────────┘            └─────────────────┘
      (Soạn thảo/Bóc tách)           (Cổng đối ngoại)               (Sổ sách đã chốt)
```

---

## 2. Ma Trận 3 Tầng Người Dùng & Năng Lực Động (Capability Matrix)

| Tiêu chí | Tier 1: VuaOffice Thuần | Tier 2: VuaOffice + VuaAI Pro | Tier 3: VuaOffice Super-App (Odoo + AI) |
|---|---|---|---|
| **Đăng nhập** | **KHÔNG CẦN ĐĂNG NHẬP**. Cài đặt là xài ngay. | Đăng nhập tài khoản `vuahethong.net` 1 lần. | Đăng nhập tài khoản `vuahethong.net` 1 lần (tự động nhận diện Odoo Client Instance). |
| **Phạm vi sử dụng** | Soạn thảo văn bản, bảng tính, trình chiếu, đọc PDF, duyệt mail thủ công. | Văn phòng thông minh: Viết lách, dịch thuật, phân tích dữ liệu, tóm tắt, Smart Reply. | **Trạm điều hành Siêu Doanh Nghiệp**: Văn phòng + AI + Toàn bộ nghiệp vụ Odoo ERP. |
| **Giao diện hiển thị** | Ẩn khung AI, **Ẩn hoàn toàn tab ERP**. | Có khung AI (⌘+J), **Ẩn hoàn toàn tab ERP**. | Mở khóa đầy đủ: **Tab VuaHethong ERP** + Bộ công cụ Cross-App. |
| **Tính năng Cross-App**| Không có. | Giữa các tệp văn phòng nội bộ. | **Siêu liên thông 2 chiều**: Mail/PDF/Sheets ➔ Bắn dữ liệu thẳng vào Odoo và ngược lại. |
| **Chế độ Ngoại tuyến** | 100% Offline vĩnh viễn trên máy tính. | Văn phòng offline; AI cần mạng qua AI Router. | Văn phòng offline; Odoo chạy Shadow Staging, có mạng tự sync & re-sequence. |

---

## 3. Kiến Trúc Giảm Tải Máy Chủ Odoo (Massive Server Offloading Engine)

### 3.1. Nghịch lý của Odoo Web truyền thống
Odoo Server thường xuyên bị nghẽn CPU và I/O Database do:
- Hàng trăm nhân viên liên tục gõ tìm kiếm danh mục (Sản phẩm, Khách hàng, Bảng giá) ➔ Odoo nện liên tục hàng ngàn câu lệnh `SELECT` phức tạp vào PostgreSQL.
- Mỗi lần chuyển trang List view, Kanbans view đều gọi lại server.

### 3.2. Đòn bẩy Điện toán Biên (Edge Computing on Desktop)
VuaOffice tận dụng trực tiếp CPU đa nhân, RAM và ổ cứng SSD NVMe tốc độ cao của máy khách để gánh tải cho server:

```
[Máy Khách VuaOffice Desktop]                                [Máy Chủ Odoo SaaS]
Ô tìm kiếm: User gõ "Bút bi Thiên Long"
        │
        ▼
Truy vấn SQLite FTS5 Cục Bộ (0ms)
(Đã nạp snapshot danh mục vào RAM/SSD)
        │
        ├───────────────────────────────────────────┐
        ▼                                           ▼
Trang kết quả hiện ngay tức thì (0ms)      KHÔNG BẮN QUERY LÊN SERVER!
Không độ trễ, không quay vòng tròn          (PostgreSQL & CPU server nghỉ ngơi)
```

1. **Local SQLite FTS5 (Full-Text Search Engine Cục Bộ)**:
   - Các bảng danh mục ít biến động: Đối tác (`res.partner`), Sản phẩm (`product.template`), Bảng giá (`product.pricelist`), Đơn vị tính (`uom.uom`), Nhân sự (`hr.employee`):
   - Desktop tải đệm 1 lần và lập chỉ mục tìm kiếm toàn văn **SQLite FTS5** trên máy.
   - Thao tác tìm kiếm, tự động điền (autocomplete) chạy **ngay trên SSD máy khách với độ trễ 0ms**, **giảm tới 80% tải đọc (`SELECT`) cho PostgreSQL server**!
2. **Conditional ETag / HTTP 304 Not Modified**:
   - Khi cần kiểm tra dữ liệu danh mục có mới không, client chỉ gửi nhẹ một HEAD request kèm ETag (dựa trên `max(write_date)` của bảng).
   - Nếu dữ liệu chưa đổi ➔ Server trả về `HTTP 304 Not Modified` (0 bytes payload).
3. **Kênh WSS Push Vi Sai thay vì Polling liên tục**:
   - Thay vì hàng trăm client bật polling `/longpolling` liên tục ngốn tài nguyên HTTP workers của Odoo, VuaOffice duy trì **1 kết nối WSS duy nhất** thông qua AI Gateway / Egress Tunnel.
   - Khi có đơn hàng mới hoặc trạng thái thay đổi, server PUSH một gói tin vi sai tí hon (~200 bytes) xuống desktop để client nạp đúng record đó.

---

## 4. Cơ Chế Chạy Mượt Mà & Quản Trị Bộ Nhớ (Ultra-Smooth Performance & Tab Hibernation)

Để Siêu Ứng Dụng chạy mượt mà trên cả máy tính 8GB RAM, không bị giật lag và không biến thành "kẻ ngốn RAM":

### 4.1. Chính Sách Ngủ Đông Tab Odoo (Smart Odoo Tab Hibernation)
- Trong VuaOffice đã có sẵn cơ chế `tab-hibernation.ts`.
- Khi người dùng mở tab VuaHethong làm việc rồi chuyển sang gõ tài liệu trong Docs hoặc tính toán trong Sheets:
  * Sau **10 phút không hoạt động** (idle), tab Odoo tự động chuyển sang chế độ **Ngủ Đông (Hibernation)**.
  * Electron hủy tiến trình render của WebContentsView đó để giải phóng ngay lập tức **350MB – 500MB RAM**.
  * Trước khi hủy, hệ thống lưu lại **Snapshot State** (URL hiện tại, vị trí scroll, dữ liệu form đang nhập dở).
  * Khi người dùng click lại vào tab VuaHethong: View được tái tạo và khôi phục lại màn hình đang làm việc trong **0.2 giây**, giữ nguyên trạng thái không mất chữ nào!

### 4.2. Kiến Trúc Đa Luồng Tách Biệt (Off-Main-Thread Architecture)
- **Main Thread**: Tuyệt đối chỉ xử lý khung cửa sổ Electron, điều phối Tab và bắt phím tắt. Đảm bảo giao diện luôn đạt **60fps / 120fps (ProMotion trên macOS của Sếp)**, gõ phím và click chuột không bao giờ bị khựng.
- **Worker Thread (`node:worker_threads`)**:
  * Tách riêng một tiến trình ngầm `odoo-worker.ts` (như mô hình `db-worker.ts` của VuaMail).
  * Toàn bộ việc ghi SQLite, đồng bộ Outbox, tính toán hash, giải mã token Keychain đều chạy trong luồng này.

---

## 5. Đồng Bộ Nhẹ Nhàng & Phân Tầng Dữ Liệu (Lightweight & Graceful Sync)

### 5.1. Phân Tầng Dữ Liệu Nóng / Nguội (Hot vs Cold Data Partitioning)
* **Hot Data (Dữ liệu nóng)**:
  - Các chứng từ phát sinh trong vòng **30 – 60 ngày gần nhất** hoặc các chứng từ do chính user này phụ trách (gán `user_id`).
  - Được đồng bộ vi sai về SQLite cục bộ để phục vụ làm việc tức thì và offline.
* **Cold Data (Dữ liệu nguội)**:
  - Hóa đơn, chứng từ từ năm ngoái, dữ liệu lịch sử nhiều năm trước:
  - Áp dụng cơ chế **Lazy Loading on Demand** (Chỉ khi nào user bấm xem chi tiết hoặc search mở rộng mới kéo từ server về).
  - Tuyệt đối **không bao giờ kéo cả database hàng chục GB về máy**, giữ cho ứng dụng luôn nhẹ nhàng, thanh thoát.

### 5.2. Đồng Bộ Vi Sai (Change Data Capture - CDC)
* Client và Server chỉ trao đổi đúng các trường thay đổi (**Dirty Fields**):
  - Ví dụ: Người dùng sửa địa chỉ khách hàng ➔ Gói sync chỉ gửi:
    `{ "model": "res.partner", "id": 425, "values": { "street": "456 Nguyễn Huệ" } }`
  - Không gửi lại toàn bộ đối tượng khách hàng với 60 trường dữ liệu dư thừa.
* **Adaptive Background Sync**:
  - Quá trình sync ngầm tự động thăm dò mức độ tải của máy tính: Khi CPU rảnh và mạng ổn định mới kích hoạt.
  - Khi người dùng đang họp online, đang gõ phím nhanh hoặc mạng yếu: Quá trình sync tự hạ độ ưu tiên để nhường toàn bộ băng thông cho trải nghiệm người dùng.
  - Payload được nén bằng thuật toán **Brotli / Gzip**, tiết kiệm tới 70% dung lượng truyền tải.

---

## 6. Xử Lý Xung Đột Số Thứ Tự Ngoại Tuyến (`SO0010` ➔ `SO0011`) — Chuẩn Ponytail

Cơ chế giải quyết bài toán: *Offline user tạo `SO0010`, đồng thời trên online một user khác đã tạo `SO0010`*:

```
[Client VuaOffice (Lúc Offline)]
Tạo đơn hàng mới:
  • client_uuid = "c-sale-9b1deb4d..."
  • name_tam = "SO0010 (Chờ đồng bộ)"
  • client_created_at = UTC_Time + Clock_Skew (Thời gian thực đã bù sai lệch)
  • Lưu vào SQLite outbox_staging
          │
          │ (Có mạng trở lại ➔ Background Sync kích hoạt)
          ▼
[Gửi lên Odoo Client Instance]
Kiểm tra: Mã 'SO0010' đã tồn tại trong Odoo chưa?
          │
    ┌─────┴──────────────────────────────────────────────────────┐
   CHƯA CÓ                                                     ĐÃ CÓ
    │                                                            │
    ▼                                                            ▼
Cấp chính thức mã SO0010                      ÁP DỤNG CƠ CHẾ NATIVE CỦA ODOO:
                                              Client gửi lệnh create() với name = '/'
                                              Lõi Odoo Server tự gọi ir.sequence:
                                              ──► CẤP CHÍNH THỨC SỐ TIẾP THEO: SO0011!
                                                                 │
                                                                 ▼
                                              Cập nhật lại SQLite cục bộ:
                                              • Mã chính thức: SO0011
                                              • Xóa bản ghi tạm trong outbox_staging
                                              • Thông báo nhẹ: "Đơn SO0010 đã đổi thành SO0011"
                                              • Dòng con (lines) KHÔNG ĐỨT vì trỏ client_uuid!
```

> **Đỉnh cao Ponytail**: Bằng cách truyền `name = '/'` khi phát hiện đụng mã, ta tận dụng **chính xác 100% logic cấp số tự động sẵn có của Odoo core (`ir.sequence`)**, **không phải viết thêm một dòng code Python/Postgres nào trên server của khách hàng!**

---

## 7. Động Cơ Siêu Liên Thông AI Cross-App (VuaAI Orchestrator)

Tính năng **Đặc quyền của Kiểu người dùng số 3**. Cho phép ra lệnh cho VuaAI **trên VuaOffice hoặc trên Odoo đều được**:

### 7.1. Cầu nối OpenDocumentsBridge (Tái Dùng 100% Hạ Tầng)
Trong `apps/shell/src/main/mcp/open-documents-bridge.ts`, VuaOffice đã có sẵn cơ chế cho phép AI đọc nội dung của bất kỳ tab nào đang mở (Docs, Sheets, PDF, Mail). Khi user là Tier 3, VuaAI Pro được nạp thêm 3 công cụ ERP:
1. `erp_read_record(model, domain, fields)`
2. `erp_create_record(model, values)`
3. `erp_write_record(model, id, values)`

### 7.2. Ba Kịch Bản Tự Động Hóa Thực Chiến
1. **Email ➔ PDF ➔ Tạo Đơn Mua Hàng (PO) Tức Thì**:
   - Khách hàng nhận email báo giá trong VuaMail ➔ Click mở file đính kèm bằng VuaOffice PDF.
   - Bấm mở chat VuaAI Pro (⌘+J): *"Trích xuất file PDF báo giá này và tạo Đơn Mua Hàng PO trên VuaHethong cho anh"*.
   - AI đọc trực tiếp nội dung tab PDF qua `openDocumentsBridge` ➔ Parse bảng hàng hóa ➔ Gọi RPC tạo PO trên Odoo ➔ Gắn file gốc vào Chatter của PO.
   - **Người dùng không cần tải file về máy, không upload thủ công, không gõ tay.**
2. **Đối Soát & So Sánh Giá Động**:
   - Đang mở bảng giá mới của nhà cung cấp trên PDF hoặc Sheets.
   - Ra lệnh: *"So sánh giá các sản phẩm trong file này với PO0015 trên hệ thống"*.
   - AI đọc file + truy vấn Odoo đọc `PO0015` ➔ Lập bảng phân tích: sản phẩm nào tăng/giảm bao nhiêu % ➔ Hỏi Sếp có muốn tự động cập nhật đơn giá mới vào PO0015 không.
3. **Từ Odoo Xuất Dữ Liệu Ra Sheets Tạo Báo Cáo Động**:
   - Đang xem danh sách doanh số hoặc tồn kho trên tab Odoo.
   - Ra lệnh: *"Xuất dữ liệu này ra Sheets và vẽ biểu đồ cột so sánh theo tháng cho anh"*.
   - AI gọi công cụ `create_document` + `propose_operations` (đã có sẵn trong VuaOffice Sheets) để tạo file `.xlsx` và mở ngay tab Sheets mới cho Sếp xem.

---

## 8. Lộ Trình Triển Khai Thực Chiến 4 Pha

| Pha | Hạng mục công việc | Mức độ can thiệp | Kiểm thử nghiệm thu |
|:---:|---|:---:|---|
| **Pha 1** | **Handshake & Feature Gate**<br>Bắt cờ `plan === 'erp_pro'` từ JWT `vuahethong.net`. Khách Tier 1 và Tier 2 giữ nguyên 100%. | 8 điểm hook mỏng trong Shell (~40 dòng code). | Mở app thường không thấy tab ERP; Đăng nhập có ERP mới hiện tab. |
| **Pha 2** | **WebView Tab & Auto-SSO**<br>Mở tab VuaHethong nạp URL Odoo Client Instance realtime, inject cookie session không cần gõ mật khẩu. | Tái dùng mẫu `apps/mail/` (~30 dòng code). | Mở tab ERP vào thẳng màn hình Odoo của công ty, mượt mà 60fps. |
| **Pha 3** | **Shadow Offline Guard & Sequence Resolver**<br>Bắt sự kiện mất mạng, lưu tạm SQLite, tự động sync và cấp lại `SO0010` ➔ `SO0011` qua `name='/'`. | Tạo `odoo-worker.ts` chạy ngầm off-main-thread. | Ngắt mạng tạo đơn không trắng trang; bật mạng tự sync đổi số an toàn. |
| **Pha 4** | **Cross-App AI Bridge & Local FTS5 Cache**<br>Đăng ký MCP ERP cho VuaAI Pro; cache danh mục SQLite FTS5 giảm tải đọc cho server Odoo. | Nạp động trong `app-mcp.ts` khi user là Tier 3. | Ra lệnh AI đọc PDF tạo PO trên Odoo; Search sản phẩm ra ngay 0ms. |
