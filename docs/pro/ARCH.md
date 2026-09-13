# ARCH — Kiến trúc Kỹ thuật VuaHeThong Pro

> **Tài liệu kiến trúc.** Tầm nhìn & tuyên ngôn: [`IDEA.md`](IDEA.md) (nguồn chân lý).
> Lộ trình & đặc tả code: [`PLAN.md`](PLAN.md).
>
> **Chủ quản:** 360 CORP · **Cập nhật:** 2026-09-13

---

## 1. Ba Tầng Cô Lập Zero-Conflict

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KHO MÃ NGUỒN DUY NHẤT (SINGLE MONOREPO)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ TẦNG 1: MÃ NGUỒN UPSTREAM GENOFFICE ] ──► Giữ nguyên bản, không đụng     │
│  ├── apps/docs/      apps/sheets/    apps/slides/                           │
│  ├── apps/markdown/  apps/html/      apps/pdf/                              │
│  ├── apps/shell/     (trừ 8 điểm hook ở Tầng 2)                             │
│  └── packages/       (UI Tokens, agent-core, ai-provider…)                  │
│      ▲ Merge upstream/main mượt 100%                                        │
│                                                                             │
│  [ TẦNG 2: DIỆN TIẾP XÚC — 8 ĐIỂM, MỖI ĐIỂM 1–3 DÒNG THÊM VÀO ]             │
│  ├── shell/src/shared/tabs-api.ts        + 'erp' vào union TabKind          │
│  ├── shell/src/shared/home-api.ts        + newErp() + HOME_CHANNELS.newErp  │
│  ├── shell/src/preload/index.ts          + newErp() bridge                  │
│  ├── shell/src/main/index.ts             + configureErpRuntime + ipc handle │
│  ├── shell/src/main/tab-manager.ts       + openErpTab() (mẫu openMailTab)   │
│  ├── shell/src/renderer/src/TabBar.tsx   + ErpIcon vào KIND_ICON            │
│  ├── shell/src/renderer/src/Home.tsx     + thẻ thứ 9 vào NEW_ITEMS          │
│  └── shell/electron-builder.cjs          + modules/erp (⚠ qua brand:gate)   │
│                                                                             │
│  [ TẦNG 3: VÙNG ĐỘC LẬP — UPSTREAM KHÔNG CÓ, KHÔNG THỂ CONFLICT ]           │
│  ├── apps/mail/    ← 360 tự viết, ĐÃ kiểm chứng qua nhiều đợt sync          │
│  └── apps/erp/     ← xây mới, đi đúng con đường của apps/mail/              │
│      ├── src/main/      ErpSession · DriveBridge · AttachmentSniffer        │
│      ├── src/preload/   ContextBridge window.vuaPro · odoo-stealth          │
│      └── src/renderer/  VuaAiPanel.tsx · PreviewDiffCard.tsx                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Bằng chứng thực chiến, không phải phỏng đoán.** `git ls-tree upstream/main apps/`
trả về đúng 7 module: `docs, html, markdown, pdf, sheets, shell, slides`.
`apps/mail/` **không có trên upstream** — do 360 tự viết, đã sống qua nhiều đợt
`git merge upstream/main` mà chưa từng conflict. `apps/erp/` sao chép đúng mô hình đó.

### 1.1 Vì sao 8 điểm, không phải "< 5"
Bản thảo trước ước lượng "< 5 micro-touchpoints". Đếm thật bằng cách truy vết
module `mail` (tiền lệ gần nhất) cho ra **8 file**. Đây là chi phí sàn của việc
thêm một loại tab vào shell — không nén xuống được. Nhưng mỗi điểm chỉ **thêm
dòng mới**, không sửa/xoá dòng upstream nào, nên `git merge` vẫn tự hoà giải sạch.

### 1.2 Luật KHÔNG GỠ thẻ upstream
`AI HTML` là thẻ của upstream GenOffice (`apps/html/`, về repo qua commit
`d24c964` Sync snapshot 2026-09-09) — **giữ nguyên**. Gỡ một thẻ upstream để
"cho đủ con số 8" là tự tạo nợ merge phải trả lại ở **mọi** đợt sync sau này.
Chỉ thêm vào cuối ➜ Home có **9 thẻ**.

---

## 2. Tái Dùng Hạ Tầng Đã Có — Không Xây Lại

| Nhu cầu | Bản thảo cũ định làm | Thực tế đã có sẵn |
|---|---|---|
| Đăng nhập Odoo | "Triển khai SSO PKCE" | ✅ **SSO 360 CORP đã chạy**: `vuahethong.net/vuaoffice/auth` + deeplink `vuaoffice://auth/callback`, nonce 32-byte, TTL 10 phút ([`index.ts:3049`](../../apps/shell/src/main/index.ts:3049)) |
| Lưu token an toàn | "Viết token-vault.ts" | ✅ `loadGenofficeAuth()` đã quản lý phiên đăng nhập |
| Mở tệp bằng tab đúng | "Viết openDocumentPath" | ✅ Đã có; `apps/mail/` dùng qua `MailRuntimeConfig.openDocumentPath` |
| Khung skill cho AI | "Tạo `packages/agent-core/src/skills/`" | ✅ Dùng `AgentSkill` + `composeSkills()` ([`skill.ts`](../../packages/agent-core/src/skill.ts)) — **không tồn tại thư mục `skills/`**; skill sống trong app sở hữu nó |

| Dựng file Excel từ dữ liệu | "Viết `report-builder.ts`" | ✅ `propose_operations` (`add_sheet`+`set_range`) + `create_document` ([tools.ts:490,524](../../apps/sheets/src/renderer/ai/tools.ts)) — mô tả tool nói thẳng đường đi này |
| Liên kết user ↔ `res.users` | (chưa nêu) | ✅ Token SSO là **JWT**; `parseJwtPayload()` đã rút `uid` = `res.users` id ([genoffice-auth.ts:126](../../packages/ai-search/src/genoffice-auth.ts)) |

> 🔴 **Ponytail nấc 2 (tái sử dụng trước khi viết mới):** sáu hạng mục trên chiếm
> gần trọn Pha 1 của bản thảo cũ. Tất cả đều đã tồn tại ➜ Pha 1 thật sự chỉ còn
> việc mở tab.

### 2.1 Thứ DUY NHẤT chưa có — client JSON-RPC

Cân bằng lại bảng trên: `grep -rn "jsonrpc\|call_kw\|/web/session/authenticate"`
toàn bộ `apps/` + `packages/` trả về **0 kết quả**. VuaOffice chưa từng gọi Odoo
bằng RPC — nó chỉ mở web Odoo trong `WebContentsView`.

➜ `apps/erp/src/main/odoo-rpc.ts` là **hạ tầng nền viết mới 100%**, và **mọi** tool
ERP đứng trên nó. Đây là hạng mục rủi ro cao nhất về lịch, không phải AI Panel.

---

## 3. Các Luồng Nghiệp Vụ Combine Tools

### 3.1 Tự động lập Báo giá Sale Order từ văn bản
```
[1. Sếp] "Em đọc văn bản bao-gia-mau.docx > lập báo giá trên hệ thống"
      │
      ▼
[2. Vua AI Panel] ──► chuyển intent + tên tệp cho lõi agentic
      │
      ├──► [3. Drive / tệp đang mở] đọc nội dung .docx thành AST
      │
      └──► [4. Odoo] query product.product + product.pricelist
                 │ trả về mã hàng, tồn kho, đơn giá chuẩn
      ┌──────────┘
      ▼
[5. Soạn dự thảo SO ➜ hiện Preview Card trên AI Panel]
      │
      ▼
[6. Sếp bấm ✅ XÁC NHẬN]
      ├──► 1 lệnh JSON-RPC tạo sale.order ──► Odoo tạo SO#00142
      └──► điều hướng webview: #id=142&model=sale.order&view_type=form
      ▼
[7. Màn hình phải hiện ngay đơn vừa tạo]
```

### 3.2 Đối chiếu Excel với đơn mua hàng PO123
```
[1. Sếp mở Bao_gia_NCC_A.xlsx trong VuaOffice Sheets]
      │ "Em so sánh với các hạng mục trong PO123 xem có đúng không?"
      ▼
[2. AI Panel] ──► gọi tool erp_compare_sheet_with_order
      │
      ├──► [3. Đọc bảng tính tại RAM máy trạm] mã hàng · SL · đơn giá
      │
      └──► [4. Odoo] lấy purchase.order.line của PO123
      ▼
[5. Reconciliation Diff — chạy tại máy trạm]
      ├── Khớp tuyệt đối theo SKU / Internal Reference
      ├── Khớp mờ (fuzzy) theo tên sản phẩm
      ├── Δ giá: PO123 = 100k · Excel = 120k ──► 🔴 +20%
      └── Phát hiện mặt hàng thừa / thiếu
      ▼
[6. Diff Card: lệch tô đỏ, khớp tô xanh]
      ▼
[7. Sếp bấm 🔄 CẬP NHẬT GIÁ VÀO PO123  (hoặc soạn email phản hồi)]
      ▼
[8. 1 lệnh JSON-RPC cập nhật + chuyển màn hình tới PO123]
```

### 3.3 VuaMail Talk-to-Convert
```
[1. Sếp xem email kèm YeuCau.pdf trong VuaMail]
      │ "Em đọc mail này > tạo Cơ hội bán hàng CRM trên VuaHeThong nhé"
      ▼
[2. Vua AI bóc tách: subject · người gửi · email · nội dung · đính kèm]
      │
      ├──► [3. Odoo] tra res.partner (chưa có ➜ tạo mới)
      │
      └──► [4. Drive Vault] đẩy YeuCau.pdf lên, lấy attachment id
      ▼
[5. Tạo crm.lead kèm link đính kèm]
      ▼
[6. "Đã tạo Cơ hội #88 — bấm để mở ngay"]
```

---

## 4. Cầu Nối Tệp Đính Kèm 1-Click

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    VUAOFFICE DESKTOP (MÁY TRẠM)                          │
│                                                                          │
│  ┌──────────────────┐          ┌────────────────────────────────────┐    │
│  │ HOME LAUNCHER    │          │ EDITORS NATIVE                     │    │
│  │ (9 thẻ icon)     │          │ AI Docs / Sheets / PDF / Slides    │    │
│  └──────────────────┘          └──────────────┬─────────────────────┘    │
│                                   [Ctrl+S]    │                          │
│                                               ▼                          │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ ATTACHMENT STREAM INTERCEPTOR (session 'will-download')         │      │
│  │ bắt .pdf/.docx/.xlsx ➜ tempPath ➜ openDocumentPath(tempPath)    │      │
│  └──────────────────▲─────────────────────────────▲───────────────┘      │
└─────────────────────┼─────────────────────────────┼──────────────────────┘
                      │ 1-Click mở ngay              │ Đồng bộ ngược khi Ctrl+S
┌─────────────────────┴─────────────────────────────┴──────────────────────┐
│              360 ERP ENTERPRISE (ODOO SAAS DATA CENTER)                  │
│  ┌────────────────────────────┐   ┌──────────────────────────────────┐   │
│  │ CHATTER & FORM VIEWS       │──►│ VUAHETHONG DRIVE VAULT           │   │
│  │ Đính kèm ở Dự án/Đơn/Task  │   │ Versioning v1→v2→final · SHA256  │   │
│  └────────────────────────────┘   └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Giảm Tải Server & Kiểm Soát RAM Desktop

### 5.1 Edge Offload — Odoo chịu 0% tải render và 0% tải AI
Render văn bản, bảng tính trăm nghìn dòng, xem PDF đều do CPU/GPU máy trạm lo.
Hiểu văn bản do AI Gateway (OmiRouter / Hermes) lo. Odoo chỉ nhận **1 transaction
JSON-RPC hoàn chỉnh** khi Sếp đã duyệt — đúng vai trò Data Center.

**Điểm nghẽn nếu làm ngược lại (AI native trên Odoo):** bóc tách tệp và gọi LLM
chiếm giữ worker Python (uwsgi/gevent). Nhiều nhân viên gọi AI cùng lúc ➜ worker
starvation ➜ chậm luôn nghiệp vụ cốt lõi: bán hàng, kế toán, xuất kho, hoá đơn
điện tử. Bảng so sánh đầy đủ: [`IDEA.md` §6](IDEA.md).

### 5.2 Auto-Suspend
Tab Pro là **singleton** (mẫu `openMailTab()`: đã mở thì activate lại, không tạo
tab thứ hai), chạy trên partition `persist:vuahethong-pro`.

- Sau **15 phút** không tương tác ➜ dừng render view, giải phóng phần lớn RAM tab.
- Click lại ➜ nạp lại đúng URL cũ.

> 📏 **Con số phải đo, không được đoán.** Bản thảo trước ghi "250MB → 0MB, phục hồi
> 300ms" — đó là **ước lượng chưa kiểm chứng**. Chỉ tiêu thật chốt sau khi đo bằng
> Electron `process.getProcessMemoryInfo()` ở Checkpoint 1, ghi lại số thực đo được.

> ⚠️ `ponytail:` Suspend dùng `webContents.stop()` + `loadURL(lastUrl)` — mất
> trạng thái form đang nhập dở trên Odoo. Chấp nhận được vì sau 15 phút bỏ quên
> thì session form của Odoo cũng đã hết. Nâng cấp khi cần: snapshot
> `sessionStorage` trước khi stop.

---

## 6. Bảo Mật

| Lớp | Biện pháp |
|---|---|
| Session | Partition riêng `persist:vuahethong-pro`, không chung cookie với web thường |
| Sandbox | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` |
| Điều hướng | `setWindowOpenHandler` deny; chặn `will-navigate` ra ngoài `vuahethong.net` |
| Token | Tái dùng SSO 360 đã có (nonce 32-byte, TTL 10 phút) — không tự chế kho khoá mới |
| Dữ liệu | Tài liệu không rời máy trạm khi phân tích; chỉ kết quả đã duyệt mới gửi lên Odoo |

---

**Trạng thái:** Đã đối chiếu mã nguồn thật · **Cập nhật:** 2026-09-13
