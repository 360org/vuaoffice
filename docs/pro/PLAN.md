# PLAN — Kế Hoạch Thi Công Siêu Ứng Dụng VuaOffice Super-App
## TÍCH HỢP VUAOFFICE (OFFICE) • VUA AI (BRAIN) • VUA HỆ THỐNG (ODOO ERP)

> **Tài liệu thi công chi tiết.** Nguồn chân lý tầm nhìn: [`IDEA.md`](IDEA.md) · Kiến trúc chi tiết: [`ARCH.md`](ARCH.md) và [`docs/ARCH_SUPERAPP_VUAOFFICE_SYSTEM.md`](../ARCH_SUPERAPP_VUAOFFICE_SYSTEM.md).  
> **Chủ quản:** 360 CORP Architecture Team  
> **Cập nhật:** 2026-11-10 (Bản v5.0 — Super-App Execution Plan)  
> **Nguyên tắc kỹ thuật:** Ponytail / YAGNI — Mượt mà, giảm tải tối đa cho server, đồng bộ vi sai siêu nhẹ.

---

## 0. Ma Trận 3 Tầng Người Dùng & Điều Kiện Kích Hoạt

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MA TRẬN PHÂN TẦNG NGƯỜI DÙNG VUAOFFICE                         │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│  TIER 1: VUAOFFICE THUẦN │  TIER 2: VUAOFFICE + AI PRO   │  TIER 3: VUAOFFICE SUPER-APP │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ • Không cần đăng nhập   │ • Đăng nhập vuahethong.net    │ • Đăng nhập vuahethong.net   │
│ • Không dùng AI         │ • Add AI Provider (VuaAI Pro) │ • Có AI + Odoo Client Instance│
│ • Chỉnh sửa tài liệu    │ • Ra lệnh cho AI thực thi     │ • Realtime Odoo WebView      │
│   văn phòng thủ công    │   thay trong Docs/Sheets/Mail │ • Shadow Offline lưu tạm     │
│ • 100% Offline, nhẹ, êm │ • ẨN HOÀN TOÀN TÍNH NĂNG ERP  │ • SIÊU LIÊN THÔNG CROSS-APP  │
└─────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

* **Xác thực bằng Claim JWT (Phương án B an toàn tuyệt đối)**:
  - Khi người dùng đăng nhập qua SSO `vuahethong.net/vuaoffice/auth`, token trả về là JWT được giải mã qua `parseJwtPayload()` (sẵn có trong `packages/ai-search/src/genoffice-auth.ts`).
  - Claim chứa: `uid` (Odoo `res.users` id), `plan` (`none` | `agentic` | `erp_pro`), `instance_url` (domain Client Instance Odoo), `allowed_companies`.
  - Chỉ khi `plan === 'erp_pro'` thì app mới kích hoạt Tier 3: mở thẻ thứ 9 (VuaHeThong Pro) và nạp động bộ công cụ MCP ERP.

---

## 1. Phạm Vi 8 Điểm Hook Vào Upstream (Chỉ Thêm Dòng — Merge Sạch 100%)

Tuân thủ nghiêm ngặt nguyên tắc **Zero-Intrusion**: Mỗi điểm **chỉ thêm dòng mới**, không sửa hoặc xoá bất kỳ dòng code upstream nào của GenOffice.

| # | File | Thay đổi kỹ thuật cụ thể | Mục đích |
|:-:|---|---|---|
| 1 | `apps/shell/src/shared/tabs-api.ts` | Thêm `'erp'` vào union `TabKind` | Khai báo định danh tab loại ERP |
| 2 | `apps/shell/src/shared/home-api.ts` | Khai báo `HOME_CHANNELS.newErp` + type `newErp()` | IPC mở tab ERP từ Home |
| 3 | `apps/shell/src/preload/index.ts` | Cầu nối `newErp: () => ipcRenderer.invoke(...)` | Cho phép Renderer gọi Main mở tab ERP |
| 4 | `apps/shell/src/main/index.ts` | `configureErpRuntime({...})` + `ipcMain.handle(newErp)` + `TAB_MENU_ICON.erp` | Đăng ký IPC handler và icon tab |
| 5 | `apps/shell/src/main/tab-manager.ts` | Viết hàm `openErpTab()` (sao chép mẫu singleton `openMailTab()`) | Quản lý lifecycle WebContentsView ERP |
| 6 | `apps/shell/src/renderer/src/TabBar.tsx` | Thêm `ErpIcon` vào bảng map `KIND_ICON` | Hiển thị biểu tượng VuaHethong trên thanh tab |
| 7 | `apps/shell/src/renderer/src/Home.tsx` | Chèn thẻ thứ 9 có điều kiện vào cuối mảng `NEW_ITEMS` | Hiện thẻ "VuaHeThong Pro" khi `plan === 'erp_pro'` |
| 8 | `apps/shell/electron-builder.cjs` | Thêm `{ from: '../erp/out', to: 'modules/erp' }` vào `extraResources` | Đóng gói bản cài app (qua cổng `brand:gate`) |

---

## 2. Cấu Trúc Module Mới: `apps/erp/` (Vùng Độc Lập — Giống `apps/mail/`)

```text
apps/erp/
├── package.json                        # Scope @genoffice/erp (chống conflict namespace)
├── electron.vite.config.ts             # Cấu hình build tách biệt (mẫu apps/mail/)
└── src/
    ├── main/
    │   ├── erp-main.ts                 # createErpView() WebContentsView WebView Odoo
    │   ├── erp-session.ts              # Tab Hibernation: Auto-suspend 10 phút giải phóng RAM
    │   ├── odoo-worker.ts              # Worker Thread (off-main-thread): SQLite & Sync
    │   ├── local-fts.ts                # SQLite FTS5 Full-Text Search: Giảm 80% tải Odoo Server
    │   ├── outbox-staging.ts           # SQLite Staging lưu tạm khi mất mạng
    │   ├── sequence-resolver.ts        # Thuật toán đổi số tự động SO0010 -> SO0011 (name='/')
    │   ├── attachment-sniffer.ts       # Bắt will-download trong session persist:vuahethong-pro
    │   ├── drive-bridge.ts             # Tự động đẩy file gốc lên Chatter Odoo
    │   ├── odoo-rpc.ts                 # Client JSON-RPC (call_kw, search_read)
    │   └── erp-skill.ts                # Bộ công cụ Agent MCP ERP (7 tools)
    ├── preload/
    │   ├── erp-preload.ts              # ContextBridge, bắt online/offline, inject overlay bar
    │   └── odoo-stealth.ts             # Bắt hashchange (#model=&id=) gửi ngữ cảnh về VuaAI
    └── renderer/
        ├── erp-view.html
        └── components/
            ├── VuaAiPanel.tsx          # Panel AI trái 28%, điều khiển Odoo phải
            └── PreviewDiffCard.tsx     # Thẻ duyệt trước dữ liệu PO/SO trước khi ghi
```

---

## 3. Thiết Kế Chi Tiết 4 Cột Trụ Kỹ Thuật

### 3.1. Cột Trụ 1: Chạy Siêu Mượt Mà (Ultra-Smooth Performance & RAM Optimization)

#### A. Chính sách Ngủ đông Tab Odoo (Tab Hibernation)
* **Vị trí thi công**: `apps/erp/src/main/erp-session.ts` tích hợp với `apps/shell/src/main/tab-hibernation.ts`.
* **Cơ chế**:
  ```typescript
  // Khi tab ERP ở chế độ nền (background) quá 10 phút:
  export function suspendErpView(tabRecord: TabRecord): void {
    if (!tabRecord.view || tabRecord.dormant) return
    // 1. Chụp lại snapshot trạng thái làm việc hiện tại
    const currentUrl = tabRecord.view.webContents.getURL()
    const scrollPos = await tabRecord.view.webContents.executeJavaScript('window.scrollY')
    tabRecord.snapshot = { url: currentUrl, scrollPos, timestamp: Date.now() }
    
    // 2. Hủy WebContentsView để giải phóng ngay lập tức 350MB - 500MB RAM
    tabRecord.view.webContents.destroy()
    tabRecord.view = null
    tabRecord.dormant = true
  }

  // Khi người dùng bấm lại vào tab ERP:
  export function resumeErpView(tabRecord: TabRecord): void {
    if (!tabRecord.dormant) return
    tabRecord.view = createErpView(tabRecord.snapshot.url)
    tabRecord.dormant = false
    // Tự động cuộn lại đúng vị trí cũ trong 0.2s
  }
  ```

#### B. Off-Main-Thread Architecture
* Tách toàn bộ việc nặng (SQLite I/O, hash SHA256, nén Brotli, mã hóa token) vào `odoo-worker.ts` chạy bằng `node:worker_threads`.
* Main Thread của Electron được giải phóng 100%, đảm bảo giao diện luôn mượt mà ở **60fps / 120fps (ProMotion Mac)**, không bao giờ bị khựng chuột hay giật phím.

---

### 3.2. Cột Trụ 2: Giảm Tải Tối Đa Cho Server Odoo (Server Offloading Engine)

#### A. Tìm kiếm Danh mục Cục bộ qua SQLite FTS5 (0ms — 0 Query lên Server)
* **Vị trí thi công**: `apps/erp/src/main/local-fts.ts`.
* **Cơ chế**:
  - Khi online lần đầu, tải một bản snapshot nhẹ của 5 danh mục ít biến động:
    1. Sản phẩm: `product.template` (id, default_code, name, list_price, uom_id)
    2. Đối tác / Khách hàng: `res.partner` (id, name, phone, email, vat, street)
    3. Bảng giá: `product.pricelist`
    4. Đơn vị tính: `uom.uom`
    5. Nhân viên: `hr.employee`
  - Tạo bảng FTS5 trong SQLite:
    ```sql
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_products USING fts5(
        product_id UNINDEXED, 
        default_code, 
        name, 
        list_price UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 2'
    );
    ```
  - Khi người dùng gõ tìm kiếm trên VuaOffice: Truy vấn trực tiếp FTS5 trên máy khách, trả kết quả tức thì trong **0ms**.
  - **Hiệu quả**: Cắt giảm **80% số lượng câu lệnh `SELECT`** nện vào PostgreSQL của máy chủ Odoo.

#### B. Conditional ETag & Kênh WSS Push Vi Sai
* Client định kỳ kiểm tra thay đổi danh mục bằng HEAD request `max(write_date)` kèm ETag. Nếu chưa đổi ➔ Server trả `HTTP 304 Not Modified` (0 bytes payload).
* Thay vì chạy polling `/longpolling` liên tục, client kết nối 1 kênh WSS duy nhất qua AI Gateway / Egress Tunnel. Server chỉ PUSH một gói tin vi sai nhỏ (~200 bytes) khi có record thay đổi thực sự.

---

### 3.3. Cột Trụ 3: Đồng Bộ Nhẹ Nhàng & Chống Xung Đột Số Thứ Tự (`SO0010` ➔ `SO0011`)

#### A. Phân tầng Dữ liệu Hot vs Cold
* **Hot Data (30-60 ngày)**: Đơn hàng, nhiệm vụ gần đây được sync ngầm về máy để tìm kiếm và làm việc tức thì.
* **Cold Data (Dữ liệu cũ)**: Chỉ tải khi người dùng bấm xem chi tiết (Lazy Loading on Demand). Không bao giờ tải cả database hàng chục GB về máy.

#### B. Cơ chế Xử lý Xung đột Số thứ tự Chuẩn Ponytail (Zero-Core Modification)
* **Vị trí thi công**: `apps/erp/src/main/sequence-resolver.ts`.
* **Quy trình thực thi**:
  1. Lúc Offline: Người dùng tạo đơn hàng, lưu vào `outbox_staging`:
     - Khóa chính: `client_uuid` (ví dụ `c-sale-9b1deb4d...`).
     - Mã hiển thị tạm: `SO0010 (Chờ gửi)`.
     - Timestamp thực: `client_created_at = Date.now() + clock_skew`.
     - Các dòng con (`sale.order.line`) liên kết qua `client_uuid`.
  2. Lúc Online: Gửi payload lên Odoo:
     - Kiểm tra: `search([('name', '=', 'SO0010')])`.
     - Nếu mã `SO0010` đã bị một người dùng online khác chiếm trước:
       * Desktop App **KHÔNG truyền `name = 'SO0010'`** vào lệnh RPC `create()`, mà truyền **`name = '/'`**.
       * Lõi Odoo server **tự động gọi native `ir.sequence.next_by_code('sale.order')` sinh số kế tiếp là `SO0011`**!
       * Dòng con không bị mồ côi vì liên kết theo `client_uuid`.
       * **Không phải sửa một dòng code nào trong lõi Odoo của khách hàng!**
  3. Cập nhật lại SQLite, xóa bản ghi trong `outbox_staging`, reload WebView hiển thị `SO0011`.

---

### 3.4. Cột Trụ 4: Siêu Liên Thông AI Cross-App (VuaAI Orchestrator)

* **Vị trí thi công**: `apps/erp/src/main/erp-skill.ts` tích hợp qua `openDocumentsBridge.ts`.
* **7 công cụ ERP MCP chuẩn hóa**:
  1. `erp_read_document`: Đọc nội dung tab PDF/Sheets/Docs đang mở thông qua `openDocumentsBridge`.
  2. `erp_query_products`: Tra cứu nhanh mã hàng, giá bán từ cache FTS5 hoặc Odoo.
  3. `erp_draft_sale_order`: Lập báo giá nháp từ dữ liệu đã bóc tách.
  4. `erp_compare_sheet_with_order`: So sánh đối soát bảng giá trong Excel/PDF với PO/SO trên Odoo.
  5. `erp_apply_price_updates`: Tự động cập nhật đơn giá mới vào các dòng của PO/SO sau khi Sếp duyệt.
  6. `erp_create_record_from_mail`: Chuyển đổi email trong VuaMail thành `crm.lead` hoặc `project.task`.
  7. `erp_query_report`: Dịch ngôn ngữ tự nhiên thành báo cáo Odoo và tự động mở trên tab VuaOffice Sheets.
* **Cổng an toàn bắt buộc**: Mọi lệnh **ghi** vào Odoo bắt buộc hiển thị `PreviewDiffCard.tsx` trong khung chat để Sếp bấm [Xác nhận] mới được thực thi.

---

## 4. Lộ Trình Triển Khai 5 Pha Kỹ Thuật

```
[Pha 0: Hợp Đồng Máy Chủ & JWT Claim]
   │ vuahethong.net trả claim: plan, instance_url, device_status
   ▼
[Pha 1: 8 Hook Points & WebView Odoo Realtime] (~1 tuần)
   │ Mở tab Odoo nguyên bản, Auto-SSO 1 chạm, Tab Hibernation 10 phút
   ▼
[Pha 2: Local SQLite FTS5 & Cầu Nối Tệp] (~1.5 tuần)
   │ Cache danh mục FTS5 (0ms search), tự đính kèm file gốc vào Chatter Odoo
   ▼
[Pha 3: Shadow Offline Guard & Sequence Resolver] (~1.5 tuần)
   │ SQLite Outbox lưu tạm khi mất mạng, tự re-sequence SO0010 -> SO0011 qua name='/'
   ▼
[Pha 4: Cross-App AI Bridge & Báo Cáo Động] (~2 tuần)
   │ 7 ERP MCP tools, đọc PDF/Sheets tạo PO, đối soát giá, xuất Excel qua create_document
   ▼
[Nghiệm thu UAT 25 Ca & Đóng Gói Release]
```

---

## 5. Bảng Kiểm Tra Nghiệm Thu UAT (25 Ca Kiểm Thử Toàn Diện)

| STT | Mã Test | Thao tác kiểm thử | Tiêu chí nghiệm thu chuẩn | Pha |
|:---:|:---:|---|---|:---:|
| 1 | **TC-01** | Khách Tier 1 (không login) mở app | Hiện đúng **8 thẻ văn phòng**. Ẩn hoàn toàn khung AI và tab ERP. | 1 |
| 2 | **TC-02** | Khách Tier 2 (chỉ mua VuaAI Pro) | Hiện khung AI, **Ẩn hoàn toàn tab ERP**, không tốn RAM. | 1 |
| 3 | **TC-03** | Khách Tier 3 (`plan === 'erp_pro'`) | Hiện **9 thẻ** kèm huy hiệu `PRO`. Click mở thẳng Odoo của công ty, **không hỏi mật khẩu**. | 1 |
| 4 | **TC-04** | Giới hạn 5 thiết bị | Đăng nhập máy thứ 6 ➔ Bị chặn, hiện danh sách 5 máy và link gỡ thiết bị. | 0+1 |
| 5 | **TC-05** | Tab Hibernation kiểm tra RAM | Mở tab ERP rồi bỏ nền 10 phút ➔ RAM giảm **> 350MB**. Click lại phục hồi trong **< 0.3s**. | 1 |
| 6 | **TC-06** | Tìm kiếm FTS5 Cục bộ | Gõ tìm sản phẩm ➔ Kết quả hiện tức thì **0ms**, kiểm tra network log **0 request** lên Odoo. | 2 |
| 7 | **TC-07** | ETag 304 Not Modified | Kiểm tra danh mục chưa đổi ➔ Server trả `HTTP 304`, payload 0 byte. | 2 |
| 8 | **TC-08** | Mở đính kèm từ Chatter Odoo | Click file `.pdf`/`.xlsx` trong Chatter ➔ Mở thẳng tab AI PDF / AI Sheets, không hiện dialog tải. | 2 |
| 9 | **TC-09** | Tự động lưu file gốc vào Chatter | Tạo PO từ file PDF ➔ File PDF tự động xuất hiện trong Chatter của PO đó trên Odoo. | 2 |
| 10 | **TC-10** | Ngắt mạng khi đang mở Odoo | WebView không hiện trang lỗi Chromium; hiện thanh báo *"Chế độ Lưu tạm Ngoại tuyến"*. | 3 |
| 11 | **TC-11** | Tạo đơn hàng lúc Offline | Đơn hàng tạo thành công với mã tạm `SO0010 (Chờ gửi)`, lưu vào SQLite `outbox_staging`. | 3 |
| 12 | **TC-12** | Trùng số `SO0010` (Online lấy trước) | Có mạng lại, sync phát hiện `SO0010` đã có ➔ Tự đổi thành `SO0011` qua `name='/'`. | 3 |
| 13 | **TC-13** | Hai máy cùng Offline tạo `SO0010` | Máy tạo trước (theo `client_created_at`) giữ `SO0010`, máy tạo sau nhận `SO0011`. | 3 |
| 14 | **TC-14** | Toàn vẹn dòng hàng con (lines) | Đơn hàng sau khi đổi số `SO0010` ➔ `SO0011`, toàn bộ dòng con vẫn liên kết chính xác 100%. | 3 |
| 15 | **TC-15** | Dọn dẹp cache sau Sync | Sau khi sync thành công, bản ghi tạm trong SQLite bị xóa sạch, WebView tự reload realtime. | 3 |
| 16 | **TC-16** | Cross-App: Email ➔ Lead CRM | Trong VuaMail ra lệnh AI: *"Tạo cơ hội từ email này"* ➔ Tạo đúng `crm.lead` trên Odoo. | 4 |
| 17 | **TC-17** | Cross-App: PDF Báo giá ➔ Tạo PO | Mở PDF báo giá trên VuaOffice PDF ➔ Lệnh AI tạo PO ➔ Tạo thành công PO trên Odoo. | 4 |
| 18 | **TC-18** | Cross-App: Đối soát giá | Ra lệnh so sánh giá trong file PDF với `PO0015` ➔ AI xuất bảng phân tích lệch giá trong chat. | 4 |
| 19 | **TC-19** | Cập nhật đơn giá sau đối soát | Bấm nút [Cập nhật giá] trên Diff Card ➔ Đơn giá trong PO trên Odoo tự động cập nhật. | 4 |
| 20 | **TC-20** | Báo cáo động ra Sheets | Ra lệnh: *"Báo cáo doanh số tháng này"* ➔ Mở tab Sheets dựng bảng 4 cột từ dữ liệu Odoo. | 4 |
| 21 | **TC-21** | Tinh chỉnh báo cáo trên Sheet | Ra lệnh tiếp: *"Thêm cột lợi nhuận gộp"* ➔ Sheet đang mở cập nhật trực tiếp, không tạo file mới. | 4 |
| 22 | **TC-22** | Chống đọc tệp ngoài phạm vi | Yêu cầu đối chiếu tệp ngoài thư mục Drive ➔ AI từ chối và giải thích lý do bảo mật. | 4 |
| 23 | **TC-23** | An toàn dữ liệu ghi | Mọi thao tác ghi vào Odoo bắt buộc phải có bước Sếp duyệt trên Preview Card. | 4 |
| 24 | **TC-24** | Kiểm tra Cổng Thương hiệu | Chạy `npm run brand:gate` ➔ Toàn bộ 7 cổng kiểm tra (Selftest, Brand, Audit...) báo **ĐẠT 100%**. | 1-4 |
| 25 | **TC-25** | Kiểm tra Xung đột Merge Upstream | Chạy thử `git merge upstream/main` ➔ Không bị conflict ở `apps/erp/` hay các file upstream. | 1-4 |

---

## 6. Quy Trình Commit & Đồng Bộ Mã Nguồn

```bash
# Kiểm tra cổng chất lượng bắt buộc trước khi commit
npm run brand:gate && npm run lint && npm run typecheck
```

* **Git Commit Attribution**: Mọi commit git trong dự án BẮT BUỘC sử dụng trailer:  
  `Authored-By: 360org <support@360.org.vn>`
* **Đồng bộ Upstream an toàn**:  
  `npm run brand:restore` ➔ `git merge upstream/main` ➔ `npm run brand:apply` ➔ `npm run brand:gate`.
