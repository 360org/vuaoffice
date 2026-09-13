# PLAN — Lộ trình Dev & Đặc tả Thực thi VuaHeThong Pro

> **Tài liệu thi công.** Tầm nhìn: [`IDEA.md`](IDEA.md) · Kiến trúc: [`ARCH.md`](ARCH.md).
> Tài liệu này **không nhắc lại** tuyên ngôn — chỉ trả lời: *làm gì, ở file nào, xong thì nghiệm thu ra sao.*
>
> **Chủ quản:** 360 CORP · **Cập nhật:** 2026-09-13

---

## 0. Đính Chính Bản Thảo Cũ (đã đối chiếu mã nguồn thật)

| # | Bản thảo cũ ghi | Thực tế mã nguồn | Hệ quả |
|:-:|---|---|---|
| 1 | Home có "đúng 8 icon" | `NEW_ITEMS` có **7 mục** + nút Open Local File = **8 thẻ** (sót `AI HTML`) | Thêm Pro ➜ **9 thẻ**, không gỡ thẻ upstream |
| 2 | "Triển khai SSO PKCE" (Pha 1) | **SSO 360 đã chạy** tại [`index.ts:3049`](../../apps/shell/src/main/index.ts) | Xoá khỏi Pha 1 — tái dùng |
| 3 | "Viết `token-vault.ts`" | `loadGenofficeAuth()` đã quản lý phiên | Xoá khỏi phạm vi |
| 4 | `packages/agent-core/src/skills/erp-*.ts` | **Không có thư mục `skills/`**; API là `AgentSkill` + `composeSkills()` | Skill sống trong `apps/erp/` |
| 5 | "< 5 micro-touchpoints" | Đếm theo vết `apps/mail/` ra **8 file** | Cập nhật phạm vi Pha 1 |
| 6 | Sửa `electron-builder.cjs` tự do | File nằm trong `brand-config.json → scan.extraFiles` | **Bắt buộc `npm run brand:gate`** |

### 0b. Đính Chính Lượt Đọc Mã Nguồn THỨ HAI (2026-09-13)

Sếp yêu cầu đọc lại và đánh giá đi/lại. Lượt hai tìm thêm **5 điểm sai hoặc bỏ sót
trong chính tài liệu này**:

| # | Tài liệu (bản trước) ghi | Mã nguồn thật | Hệ quả |
|:-:|---|---|---|
| 7 | `erpSkill.tools = ['erp_read_document', …]` | `tools: AgentToolDef[]` — mảng **object** `{name, description, inputSchema}` ([types.ts](../../packages/agent-core/src/types.ts)) | Sửa đoạn mẫu Pha 4 — **đã sửa** |
| 8 | Cần viết `erp_export_to_sheet` (tool 8) | `create_document` + `propose_operations` **đã làm đúng việc đó** ([tools.ts:490,524](../../apps/sheets/src/renderer/ai/tools.ts)) | **Bỏ tool 8** · bỏ `report-builder.ts` · 8 tool ➜ **7** |
| 9 | Không nhắc rủi ro trùng tên tool | `composeSkills` **ném `Error`** khi trùng ([skill.ts](../../packages/agent-core/src/skill.ts)) | Tiền tố `erp_` thành **bắt buộc** |
| 10 | Chỉ có phương án query-param cho `plan` | Token SSO **là JWT**, `parseJwtPayload()` đã có sẵn và đã rút `uid` = `res.users` id | Thêm **mục 0.6 — phương án B**, an toàn hơn hẳn |
| 11 | Không nêu hạ tầng Odoo còn thiếu | `grep jsonrpc\|call_kw` toàn repo ➜ **0 kết quả** | Client JSON-RPC là hạng mục **viết mới 100%**, phải ghi vào Pha 3 |

> ✅ **Tổng kết hai lượt đọc:** phạm vi thu hẹp lại — bỏ 1 tool, bỏ 1 file
> (`report-builder.ts`), và tìm được phương án xác thực an toàn hơn mà **không tốn
> thêm dòng hạ tầng nào**. Phần duy nhất phình ra là `odoo-rpc.ts` — thứ trước đây
> tài liệu ngầm định "sẽ có".

---

## 1. Phạm Vi 8 Điểm Hook Vào Upstream

Mỗi điểm **chỉ thêm dòng mới**, không sửa/xoá dòng upstream.

| # | File | Thay đổi | Pha |
|:-:|---|---|:-:|
| 1 | `apps/shell/src/shared/tabs-api.ts` | `\| 'erp'` vào union `TabKind` | 1 |
| 2 | `apps/shell/src/shared/home-api.ts` | `HOME_CHANNELS.newErp` + type `newErp()` | 1 |
| 3 | `apps/shell/src/preload/index.ts` | bridge `newErp: () => ipcRenderer.invoke(...)` | 1 |
| 4 | `apps/shell/src/main/index.ts` | `configureErpRuntime({...})` + `ipcMain.handle(newErp)` + `TAB_MENU_ICON.erp` | 1 |
| 5 | `apps/shell/src/main/tab-manager.ts` | `openErpTab()` — sao mẫu `openMailTab()` (dòng 297-316) | 1 |
| 6 | `apps/shell/src/renderer/src/TabBar.tsx` | `ErpIcon` vào `KIND_ICON` | 1 |
| 7 | `apps/shell/src/renderer/src/Home.tsx` | thẻ thứ 9 vào `NEW_ITEMS` (chèn **cuối mảng**) | 1 |
| 8 | `apps/shell/electron-builder.cjs` | `'../erp/out'` vào danh sách kiểm tra + `{ from: '../erp/out', to: 'modules/erp' }` ⚠️ qua `brand:gate` | 1 |

### 1.1 Thẻ thứ 9 — CÓ ĐIỀU KIỆN, dán vào cuối `NEW_ITEMS`

Thẻ chỉ hiện khi user là **một trong các seat** của gói Pro (máy chủ phán quyết qua
SSO). Khách thường vẫn thấy đúng 8 thẻ.
Tiền lệ sẵn có: `Home.tsx` đã đọc `accountStatus()` và đã có mẫu thẻ ẩn/hiện theo
cờ (`isDevMode` ở thẻ Mail) — tái dùng đúng khuôn đó, không phát minh cơ chế mới.

```typescript
// apps/shell/src/renderer/src/Home.tsx — sau mục 'eml', KHÔNG sửa 7 mục trên
...(status?.plan === 'erp_pro'
  ? [{
      ext: 'erp',
      title: 'VuaHeThong Pro',
      sub: '360 ERP ENTERPRISE',
      action: handleOpenErp,
      badge: 'PRO',
      disabled: false,
    }]
  : []),
```

Mở rộng `AccountStatus` ([home-api.ts:319](../../apps/shell/src/shared/home-api.ts)) —
mọi giá trị do máy chủ trả về, client không tự suy ra:

```typescript
export interface AccountStatus {
  loggedIn: boolean
  email?: string
  name?: string
  avatarUrl?: string
  /** 'agentic' = Gói 1 · 'erp_pro' = Gói 2 — vuahethong.net phán quyết. */
  plan?: 'none' | 'agentic' | 'erp_pro'
  /** Instance Odoo của công ty; chỉ có giá trị khi plan === 'erp_pro'. */
  instanceUrl?: string
}
```

> `proEntitled` không cần tồn tại: `plan === 'erp_pro'` đã nói đủ. Thêm cờ boolean
> song song với enum là hai nguồn chân lý cho cùng một sự thật — sớm muộn lệch nhau.

> 🔴 **Cấm để client tự quyết.** Không đọc gói từ tệp cấu hình cục bộ, không suy ra
> từ email/tên miền. Chỉ nhận từ máy chủ. Client tự quyết = sửa một biến trong
> DevTools là mở khoá Pro miễn phí.

> ⚠️ `ponytail:` `plan` là **cờ hiển thị**, không phải cơ chế bảo vệ. Ẩn thẻ chỉ
> ngăn nhầm lẫn, không ngăn kẻ cố tình. Lá chắn thật là **Odoo**: user không nằm
> trong seat thì mọi lệnh gọi dữ liệu đều bị từ chối, thẻ hiện cũng vô dụng.
> Ceiling: chưa kiểm tra lại định kỳ khi gói hết hạn giữa phiên. Nâng cấp khi khách
> bắt đầu hết hạn giữa chừng: làm mới `accountStatus()` theo chu kỳ.

### 1.2 Giới hạn 5 thiết bị — desktop chỉ khai, máy chủ quyết

Tái dùng `ensureAnalyticsClientId(settingsPath)`
([analytics.ts:104](../../apps/shell/src/main/analytics.ts)) làm mã thiết bị. Không
thêm `node-machine-id` hay thư viện nào — repo đã có sẵn UUID bền vững này.

```typescript
// apps/shell/src/main/index.ts — tại chỗ dựng URL SSO (đã có sẵn, thêm 1 tham số)
authUrl.searchParams.set('device_id', ensureAnalyticsClientId(settingsPath))
authUrl.searchParams.set('device_name', os.hostname())   // để user nhận ra máy nào
```

Máy chủ trả về qua callback: chấp nhận, hoặc từ chối kèm lý do + danh sách máy
đang chiếm chỗ để user tự gỡ.

> ⚠️ `ponytail:` `clientId` reset khi user xoá app settings hoặc cài lại máy — máy
> cũ vẫn chiếm slot. Ceiling: cài lại 5 lần là tự khoá chính mình. **Bắt buộc có
> nút gỡ thiết bị** trong Profile (việc phía vuahethong.net, Pha 0).

### 1.3 `openErpTab()` — sao mẫu singleton
```typescript
// apps/shell/src/main/tab-manager.ts
openErpTab(): string {
  const existing = this.tabs.find((t) => t.kind === 'erp')
  if (existing) { this.activateTab(existing.id); return existing.id }
  const view = createErpView()
  const id = `t${this.nextId++}`
  this.shellWindow.contentView.addChildView(view)
  view.setVisible(false)
  this.tabs.push({ id, kind: 'erp', view, title: 'VuaHeThong Pro' })
  this.activateTab(id)
  return id
}
```

---

## 2. Cây Thư Mục `apps/erp/` (vùng cô lập)

```text
apps/erp/
├── package.json                        # tên @genoffice/erp — KHÔNG đổi scope (CLAUDE.md §3)
├── electron.vite.config.ts             # sao từ apps/mail/
└── src/
    ├── main/
    │   ├── erp-main.ts                 # ErpRuntimeConfig + createErpView() — mẫu mail-main.ts
    │   ├── erp-session.ts              # Auto-Suspend 15 phút          [Pha 1]
    │   ├── attachment-sniffer.ts       # will-download ➜ openDocumentPath [Pha 2]
    │   ├── drive-bridge.ts             # SHA256 + versioning + isDriveScoped() [Pha 2]
    │   ├── odoo-rpc.ts                 # client JSON-RPC — repo CHƯA có, phải viết [Pha 3]
    │   └── erp-skill.ts                # AgentSkill 7 tool (KHÔNG để trong agent-core) [Pha 3-4]
    ├── preload/
    │   ├── erp-preload.ts              # contextBridge window.vuaPro
    │   └── odoo-stealth.ts             # đọc hash #model=&id= báo về AI Panel [Pha 3]
    └── renderer/
        ├── erp-view.html
        └── components/
            ├── VuaAiPanel.tsx          [Pha 3]
            └── PreviewDiffCard.tsx     [Pha 4]
```

---

## 3. Roadmap 5 Pha (Pha 0 + 4 pha dev)

```
[Pha 0 — Hợp đồng máy chủ]    CỔNG CHẶN (xem ngay dưới) — vuahethong.net làm
   │ callback trả plan · instance_url · device_status + UI gỡ thiết bị
   ▼
[Pha 1 — Tab Odoo chạy được]  ~1 tuần
   │ 8 hook + apps/erp/ khung + tái dùng SSO + 5 thiết bị + Auto-Suspend
   ▼
[Pha 2 — Cầu nối tệp]         ~1.5 tuần
   │ Attachment 1-Click + Lưu về Drive + đồng bộ ngược Ctrl+S
   ▼
[Pha 3 — AI Panel + Mail]     ~2 tuần
   │ VuaAiPanel trái 28% + odoo-stealth + Talk-to-Convert
   ▼
[Pha 4 — Agentic + Báo cáo động] ~2 tuần
   │ erp-skill.ts 7 tool + báo cáo động + Reconciliation Diff + UAT 22 ca
   ▼
[Đóng gói Installer]
```

---

### Pha 0 — Hợp Đồng Máy Chủ (CỔNG CHẶN)

Desktop không code được gì có ý nghĩa nếu callback chưa trả đủ dữ liệu. Đây là
việc của đội vuahethong.net (Odoo), không phải desktop.

**Callback hiện tại** ([index.ts:4565](../../apps/shell/src/main/index.ts)):
`token · email · name · avatar_url · key_id` — parse tại chỗ sẵn có.

**Cần bổ sung — cùng chỗ parse, KHÔNG đổi luồng:**

```
vuaoffice://auth/callback?token=…&email=…
    &plan=erp_pro                               ← none | agentic | erp_pro
    &instance_url=https://abc.vuahethong.net    ← chỉ khi plan=erp_pro
    &device_status=ok                           ← ok | limit_exceeded
    &device_list=<base64 JSON>                  ← chỉ khi limit_exceeded
```

| # | Hạng mục máy chủ | Phục vụ | Chặn ca UAT |
|:-:|---|---|---|
| 0.1 | Bảng `device_id ↔ user`, đếm máy đang hoạt động, chặn khi > 5 | Gói 1 | TC-13, TC-14 |
| 0.2 | UI **gỡ thiết bị** trong Profile trên vuahethong.net | Gói 1 | TC-15 |
| 0.3 | Trả `plan` theo subscription đang hiệu lực | Gói 1+2 | TC-01b, TC-01c |
| 0.4 | Trả `instance_url` theo công ty của `res.users` | Gói 2 | TC-01d |
| 0.5 | Odoo từ chối truy vấn của user ngoài seat (lá chắn thật) | Gói 2 | TC-01e |

**Checkpoint 0:** gọi thử callback bằng tay với đủ 5 tham số ➜ desktop parse đúng,
không vỡ luồng đăng nhập cũ. Chưa đạt thì **không khởi động Pha 1**.

#### 0.6 🟢 Phương án B — nhét vào JWT, KHÔNG đổi callback

Đọc lại [`genoffice-auth.ts:126`](../../packages/ai-search/src/genoffice-auth.ts)
phát hiện: token SSO 360 **đã là JWT** và repo **đã có sẵn** `parseJwtPayload()`
giải mã nó (hỗ trợ cả JWT 3 phần lẫn token 360 dạng 2 phần). Hàm này đang rút
`name`, `email`, `uid` ra khỏi payload — `uid` chính là **`res.users` id của Odoo**,
và avatar dựng từ chính `uid` đó:

```typescript
`https://vuahethong.net/web/image/res.users/${jwtUid}/avatar_128`
```

➜ Nghĩa là **liên kết danh tính VuaOffice ↔ `res.users` Odoo không phải xây mới —
nó đã tồn tại và đang chạy trong bản release hiện tại.**

| | Phương án A (query param) | Phương án B (claim JWT) |
|---|---|---|
| Đội Odoo phải sửa | Thêm 4 param vào redirect | Thêm 4 claim vào payload |
| Giả mạo được không | ⚠️ Có — sửa URL deeplink là xong | ✅ **Không** — chữ ký JWT chặn |
| Desktop phải viết | Parse query (đã có chỗ) | Đọc claim (đã có `parseJwtPayload`) |
| Bền qua re-login | Phải gửi lại mỗi lần | Nằm trong token, đọc lại bất cứ lúc nào |

> 🔴 **Chọn B.** Query param của deeplink là **dữ liệu do người dùng kiểm soát** —
> ai cũng gõ được `vuaoffice://auth/callback?plan=erp_pro` vào trình duyệt. Luật
> cứng *"máy chủ phán quyết"* ([`IDEA.md` §2](IDEA.md)) chỉ thật sự có hiệu lực khi
> phán quyết nằm trong **phần đã ký**. Đề nghị đội vuahethong.net thêm 4 claim:
> `plan`, `instance_url`, `device_status`, `exp`.

> ⚠️ `ponytail:` Desktop **không** verify chữ ký JWT (không có public key, và cũng
> không cần — client không phải nơi cưỡng chế). Ceiling: người sửa tệp
> `~/.genoffice/auth.json` vẫn bật được thẻ Pro trên giao diện. Chấp nhận: bấm vào
> thì Odoo từ chối, vì **lá chắn thật là mục 0.5** chứ không phải cái thẻ.

> 🔴 Ba câu hỏi thương mại phải chốt trước 0.1 (không suy ra được từ mã nguồn):
> (a) máy thứ 6 — chặn thẳng hay đá máy cũ nhất ra? (b) seat ERP tính theo user
> hay theo máy? (c) gói hết hạn giữa phiên — cắt ngay hay cho làm nốt?
> Đề xuất mặc định của em: **chặn thẳng + cho tự gỡ · theo user · cho làm nốt.**

---

### Pha 1 — Tab Odoo chạy được (~1 tuần)
**Mục tiêu:** Click thẻ thứ 9 ➜ mở tab Odoo nguyên bản, đã đăng nhập, RAM có kiểm soát. **Chưa có AI Panel.**

| # | Việc | File |
|:-:|---|---|
| 1.1 | Scaffold `apps/erp/` (copy khung `apps/mail/`, đổi tên) | `apps/erp/**` |
| 1.2 | `createErpView()` — partition `persist:vuahethong-pro`, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` | `erp-main.ts` |
| 1.3 | Chặn điều hướng: `setWindowOpenHandler` deny + `will-navigate` chỉ cho `vuahethong.net` | `erp-main.ts` |
| 1.4 | 8 điểm hook ở §1 | `apps/shell/**` |
| 1.5 | **Tái dùng SSO sẵn có** — nạp phiên từ `loadGenofficeAuth()`, KHÔNG viết token vault mới | `erp-main.ts` |
| 1.5b | **Mở rộng callback SSO** parse thêm `plan` · `instance_url` · `device_status` (chỗ parse sẵn có: `index.ts:4565`) | `index.ts` |
| 1.5c | Thẻ 9 ẩn/hiện theo `plan === 'erp_pro'`; bấm thẻ mở thẳng `instance_url` — **KHÔNG hỏi đăng nhập lại** | `Home.tsx` + `erp-main.ts` |
| 1.5d | Gửi `device_id` (tái dùng `ensureAnalyticsClientId`) + `device_name` khi dựng URL SSO — §1.2 | `index.ts` |
| 1.5e | `device_status === 'limit_exceeded'` ➜ hiện màn chặn kèm danh sách máy + link gỡ trên vuahethong.net. **Không đăng nhập tiếp.** | `Home.tsx` |
| 1.6 | `ErpSessionManager` Auto-Suspend 15 phút | `erp-session.ts` |
| 1.7 | Thêm `externalizeDepsPlugin.exclude` nếu `apps/erp` khai báo workspace package (CLAUDE.md Build gotchas) | `electron.vite.config.ts` |
| 1.8 | `npm run brand:gate` sau khi đụng `electron-builder.cjs` | — |

**Checkpoint 1:** Tài khoản Gói 2 thấy **9 thẻ**, Gói 1 thấy **8 thẻ** · click Pro mở Odoo đã đăng nhập · mở lần 2 không tạo tab trùng · máy thứ 6 bị chặn có màn hình rõ ràng · bỏ nền 15 phút RAM tụt rõ rệt, click lại về đúng trang cũ · `brand:gate` PASS.

> 📏 **Đo, đừng đoán.** Tại Checkpoint 1 phải ghi lại **số thực** bằng
> `process.getProcessMemoryInfo()` (RAM trước/sau suspend) và `performance.now()`
> (thời gian phục hồi). Con số đo được mới là chỉ tiêu chính thức cho TC-03 —
> hiện tài liệu **chưa có** cơ sở để cam kết một mốc cụ thể.

> ⚠️ Nhắc build: mã trong `apps/erp/src/main` **biên dịch vào bản build của shell** — sửa xong phải rebuild shell, nếu không thay đổi âm thầm không chạy.

### Pha 2 — Cầu nối tệp (~1.5 tuần)
| # | Việc | File |
|:-:|---|---|
| 2.1 | `attachment-sniffer.ts`: bắt `will-download` **trên session riêng** `persist:vuahethong-pro` (KHÔNG dùng `session.defaultSession` — sẽ nuốt luôn download của tab khác), lọc đuôi tệp, `item.setSavePath(temp)`, chờ `item.once('done')` rồi mới gọi `openDocumentPath(tempPath)` | `apps/erp/src/main/` |
| 2.2 | Nút **[☁️ Lưu về VuaHeThong Drive]** trên Ribbon Docs/Sheets/Slides/Markdown | các app tương ứng |
| 2.3 | `drive-bridge.ts`: SHA256 client-side chống trùng, upload `ir.attachment`, versioning `v1/v2/final` | `apps/erp/src/main/` |
| 2.4 | Đồng bộ ngược: tệp mở từ Odoo, `Ctrl+S` ➜ đẩy version mới + log Chatter | `drive-bridge.ts` |

**Checkpoint 2:** Click `.pdf` trong Chatter ➜ mở thẳng tab AI PDF, không hộp thoại tải về · Lưu về Drive từ Docs ➜ tệp hiện trong Chatter Odoo kèm hash.

> ⚠️ `ponytail:` Versioning theo quy ước tên `v1/v2/final`, không dùng model version riêng. Ceiling: không có lịch sử diff nội dung. Nâng cấp khi khách cần so sánh 2 phiên bản.

### Pha 3 — AI Panel + Talk-to-Convert (~2 tuần)
| # | Việc | File |
|:-:|---|---|
| 3.1 | `VuaAiPanel.tsx` — trái `max(340px, 28%)`, Odoo phải phần còn lại; co giãn khi đóng/mở panel | `renderer/components/` |
| 3.2 | `odoo-stealth.ts` — nghe `hashchange`, gửi `{model, id}` về panel làm ngữ cảnh | `preload/` |
| 3.3 | Kênh IPC `vua-pro:*` (auth · drive · webview navigate · ai run/approve) | `apps/shell/src/shared/pro-channels.ts` |
| 3.3b | 🆕 **`odoo-rpc.ts` — client JSON-RPC** (`/web/session/authenticate`, `call_kw`, `search_read`, `read_group`) | `apps/erp/src/main/` |
| 3.4 | Talk-to-Convert trong VuaMail ➜ `crm.lead` / `sale.order` / ticket + đẩy đính kèm lên Drive | `apps/mail/` + `erp-skill.ts` |

> 🔴 **3.3b là hạng mục viết mới 100%, đừng ngầm định có sẵn.** Grep toàn repo
> (`jsonrpc`, `call_kw`, `/web/session/authenticate`) trả về **0 kết quả** — VuaOffice
> hiện chưa từng nói chuyện với Odoo bằng RPC, chỉ mở web bằng trình duyệt nhúng.
> Mọi tool ERP ở Pha 4 đều **đứng trên** file này, nên nó phải xong trước.

> ⚠️ `ponytail:` Dùng `fetch` trần + `/jsonrpc` (hoặc `/web/dataset/call_kw` kèm
> cookie phiên) — **không** thêm thư viện `odoo-xmlrpc`/`odoo-await`. Ceiling: chưa
> có retry/pool/typed model. Nâng cấp khi số tool vượt ~10 hoặc bắt đầu gặp timeout.

**Checkpoint 3:** Tab Pro có panel trái · mở form SO trên Odoo thì panel hiện đúng `sale.order #id` · `odoo-rpc.ts` gọi được `search_read` trả dữ liệu thật · từ VuaMail ra lệnh tạo được Lead kèm đính kèm.

### Pha 4 — Agentic + Báo cáo động (~2 tuần)
Khai báo **một** `AgentSkill` duy nhất trong `apps/erp/src/main/erp-skill.ts`, ghép vào lõi bằng `composeSkills()`:

```typescript
import type { AgentSkill, AgentToolDef } from '@genoffice/agent-core'

// ⚠️ tools là AgentToolDef[] — mảng OBJECT {name, description, inputSchema},
// KHÔNG phải mảng chuỗi. Xem packages/agent-core/src/types.ts.
const ERP_TOOLS: AgentToolDef[] = [
  /* 1 */ { name: 'erp_read_document',            description: '…', inputSchema: { /* JSON Schema */ } },
  /* 2 */ { name: 'erp_query_products',           description: '…', inputSchema: {} },
  /* 3 */ { name: 'erp_draft_sale_order',         description: '…', inputSchema: {} },
  /* 4 */ { name: 'erp_compare_sheet_with_order', description: '…', inputSchema: {} },
  /* 5 */ { name: 'erp_apply_price_updates',      description: '…', inputSchema: {} },
  /* 6 */ { name: 'erp_create_record_from_mail',  description: '…', inputSchema: {} },
  /* 7 */ { name: 'erp_query_report',             description: '…', inputSchema: {} }, // 🔥 CHỈ ĐỌC
]

export const erpSkill: AgentSkill = {
  id: 'erp',
  systemPrompt: '…',
  tools: ERP_TOOLS,
  executeTool(call, signal) { /* JSON-RPC tới Odoo */ },
}
```

> 🔴 **Tool `erp_export_to_sheet` ĐÃ BỊ LOẠI (Ponytail nấc 2).** Bản trước liệt kê
> tool thứ 8 để "dựng workbook rồi mở tab Sheets". Đọc lại
> [`apps/sheets/src/renderer/ai/tools.ts`](../../apps/sheets/src/renderer/ai/tools.ts)
> thì việc đó **đã có sẵn 100%**: `create_document` nói thẳng trong mô tả — *"To
> export data that is not in a sheet yet, write it into a new sheet first
> (`add_sheet` + `set_range`), then export that sheet."* Skill ERP chỉ cần **trả về
> dữ liệu**; phần dựng Excel để `propose_operations` + `create_document` lo. Viết
> tool thứ 8 là nhân bản hạ tầng đã chạy tốt.

> ⚠️ **Cấm trùng tên tool.** `composeSkills` ném `Error("duplicate tool name: X")`
> ngay khi đọc getter `tools` ([`skill.ts`](../../packages/agent-core/src/skill.ts)).
> Tiền tố `erp_` là bắt buộc, không phải quy ước cho đẹp — nó là thứ giữ cho skill
> ERP không đụng 17 tool sẵn có của Sheets.

**Thuật toán đối chiếu (chạy tại RAM máy trạm):**
1. Khớp tuyệt đối `SKU / default_code`.
2. Chưa khớp ➜ khớp mờ theo tên sản phẩm.
3. Δ giá & Δ số lượng ➜ tô đỏ, kèm % lệch.
4. Liệt kê mặt hàng thừa/thiếu hai bên.

> ⚠️ `ponytail:` Nhận diện header cột bằng heuristic từ khoá (`mã`, `tên`, `SL`, `đơn giá`). Ceiling: sai với sheet gộp ô nhiều tầng. Nâng cấp khi gặp: cho người dùng chỉ định cột thủ công trên Diff Card.

**Cổng an toàn (bắt buộc):** mọi tool **ghi** vào Odoo chỉ chạy sau khi Sếp bấm duyệt trên Preview/Diff Card. Không có đường tự động ghi.
Tool 7 (`erp_query_report`) là **chỉ đọc** ➜ không qua cổng duyệt, chạy thẳng — đó
là lý do báo cáo động nhanh và an toàn ([`IDEA.md` §5③](IDEA.md)).

#### 4.2 Báo cáo động — luồng thi công (mục tiêu 4)

```
"báo cáo sale tháng này, cột A/B/C/D"
   ▼
erp_query_report  ─► dịch sang domain + fields + groupby Odoo
   ▼
Preview Card hiện LẠI điều kiện đã hiểu ─► Sếp xác nhận  ⚠️ bắt buộc
   ▼
JSON-RPC search_read / read_group  (CHỈ ĐỌC) ─► trả bảng dữ liệu cho agent
   ▼
╔═══ HẠ TẦNG SẴN CÓ — KHÔNG VIẾT DÒNG NÀO ═══════════════════╗
║ propose_operations (add_sheet + set_range) ─► dựng bảng     ║
║ create_document('xlsx')  ─► ghi tệp + mở tab AI Sheets      ║
╚════════════════════════════════════════════════════════════╝
   ▼
Nói tiếp "thêm cột lợi nhuận gộp" ─► propose_operations lần nữa
                                     trên CHÍNH sheet đang mở
```

| # | Việc | File | Viết mới? |
|:-:|---|---|:-:|
| 4.2a | `erp_query_report` — NL ➜ `{model, domain, fields, groupby, limit}` ➜ JSON-RPC | `erp-skill.ts` | ✍️ mới |
| 4.2b | Preview Card hiện lại điều kiện đã hiểu + số dòng ước tính trước khi chạy | `PreviewDiffCard.tsx` | ✍️ mới |
| 4.2c | Dựng workbook & mở tab | — | ✅ **có sẵn** (`propose_operations` + `create_document`) |
| 4.2d | Vòng lặp tinh chỉnh trên sheet đang mở | — | ✅ **có sẵn** (`propose_operations`) |

> ✅ **Chỉ 2 việc mới, không phải 4.** Đây là kết quả đọc lại mã nguồn thật: toàn bộ
> khâu dựng Excel + mở tab + tinh chỉnh lặp đã là năng lực sẵn có của Sheets skill.
> Phần duy nhất còn thiếu là **lấy dữ liệu từ Odoo** và **hiện lại cách hiểu truy vấn**.

> ⚠️ `ponytail:` `propose_operations` giới hạn **2.000 ô** cho op thường, nhưng
> `fill_range`/`set_range` dạng bulk chịu tới **200.000 ô**. Báo cáo lớn phải đi
> đường bulk. Ceiling: vượt 200k ô thì vỡ — chặn trước bằng giới hạn dòng ở 4.2a.

> ⚠️ `ponytail:` Giới hạn cứng số dòng (đề xuất **50.000**) và cảnh báo trước khi
> truy vấn nặng. Ceiling: chưa có phân trang/streaming. Nâng cấp khi khách cần báo
> cáo triệu dòng: xuất theo lô + ghi thẳng ra tệp thay vì giữ trong RAM.

> 🔴 **Bẫy ngữ nghĩa phải chặn:** "tháng này" có thể là tháng dương lịch hoặc kỳ
> kế toán; "doanh số" có thể gồm/không gồm thuế. Agent **bắt buộc** hiện lại cách
> hiểu của mình trên Preview Card — sai một chữ là báo cáo sai toàn bộ.

#### 4.3 Gác cổng Odoo Drive cho đọc chéo (mục tiêu 2)

| # | Việc | File |
|:-:|---|---|
| 4.3a | Đăng ký **thư mục đồng bộ Drive** trong Settings (mặc định `~/VuaHeThongDrive`) | `apps/shell` settings |
| 4.3b | `isDriveScoped(filePath)` — so tiền tố đường dẫn với thư mục sync đã đăng ký | `drive-bridge.ts` |
| 4.3c | Đối chiếu SHA256 với `ir.attachment` để xác nhận tệp thật thuộc Drive | `drive-bridge.ts` |
| 4.3d | Tool đọc chéo gọi `isDriveScoped()` trước; ngoài phạm vi ➜ **từ chối + nêu lý do** | `erp-skill.ts` |

> ⚠️ `ponytail:` Kiểm bằng tiền tố đường dẫn + hash. Ceiling: người có quyền ghi
> Drive vẫn copy được tệp lạ vào. Chấp nhận — họ đã có quyền đó. Nâng cấp nếu cần
> chặt hơn: chỉ chấp nhận tệp đã có `ir.attachment` id tương ứng.

**Checkpoint 4:** Mở Excel báo giá ➜ ra lệnh so với PO123 ➜ chỉ đúng mục lệch +20% ➜ bấm cập nhật ➜ Odoo đổi giá và màn hình nhảy tới PO123.

---

### 4.1 Skill ghép vào đâu — quyết định sau audit

`AgentLoop` **chạy trong renderer của từng app** (đã kiểm chứng: `apps/docs`,
`apps/sheets`, `apps/html`, `apps/pdf`, `apps/mail` đều gọi `new AgentLoop({...})`
trong AiPanel riêng). Mỗi tab là một `WebContentsView` biệt lập — **renderer này
không gọi thẳng được vào bộ nhớ renderer kia**.

> ⚠️ **Nói cho chính xác** (bản trước viết quá mạnh là "không thấy nhau"): main
> process **có** thấy `filePath` của mọi tab, và tệp trên đĩa thì tiến trình nào
> cũng `fs.readFile` được. Rào chắn kỹ thuật thật sự chỉ nằm ở **phần chưa lưu
> đang trong RAM** của renderer. Vậy nên "đọc chéo" là bài toán **thẩm quyền**,
> không phải bài toán kỹ thuật: mặc định TẮT, chỉ mở sau khi có phiên ERP hợp lệ
> ([`IDEA.md` §2](IDEA.md) luật cứng 3).

Hệ quả bắt buộc: `erpSkill` phải được **ghép vào AgentLoop của chính app đang giữ
dữ liệu**, không phải đặt trong tab Pro rồi với sang.

| Tính năng | Ghép ở đâu | Vì sao |
|---|---|---|
| Đối chiếu Excel ↔ PO123 | `apps/sheets` — `composeSkills('sheets+erp', ...)` | Snapshot bảng tính chỉ tồn tại trong renderer Sheets (`adapterRef.current.getSnapshot()`) |
| Talk-to-Convert | `apps/mail` | Nội dung email nằm ở renderer Mail |
| Lập báo giá từ văn bản | `apps/docs` | AST tài liệu nằm ở renderer Docs |
| Điều khiển webview Odoo | `apps/erp` | Chỉ tab Pro mới có webview |

```typescript
// apps/sheets/src/renderer/App.tsx — sửa 1 dòng tại chỗ gọi AgentLoop
import { composeSkills } from '@genoffice/agent-core'
import { erpSkill } from '@genoffice/erp/skill'

agentLoopRef.current = new AgentLoop({
  skill: composeSkills('sheets-erp', INTRO, [sheetsSkill, erpSkill]),
  // ...phần còn lại giữ nguyên
})
```

> 🔴 **Sai lầm đã tránh được:** bản trước ngầm định AI Panel trong tab Pro đọc được
> bảng tính đang mở ở tab Sheets. Làm vậy phải dựng cầu snapshot xuyên tab qua IPC
> main — tốn công, chậm, dữ liệu lệch phiên bản. Ghép skill dùng `composeSkills()`
> **đã có sẵn**, không viết mới dòng hạ tầng nào.

> ⚠️ **Đánh đổi:** cách này thêm 1 điểm chạm vào 3 app upstream (`sheets`, `docs`,
> `mail` — riêng `mail` là của 360 nên miễn phí). Tổng hook lên **10**, không phải 8.
> Vẫn rẻ hơn nhiều so với dựng cầu xuyên tab, và mỗi chỗ chỉ sửa đúng **1 dòng**
> `skill:` tại lời gọi `new AgentLoop`.

---

## 4. Nghiệm Thu UAT — 22 Ca

| # | Mã | Thao tác | Tiêu chí đạt | Pha |
|:-:|:-:|---|---|:-:|
| 1 | TC-01 | Mở Home, **chưa đăng nhập** | Hiện đúng **8 thẻ** — KHÔNG có thẻ Pro | 1 |
| 1b | TC-01b | Đăng nhập user **Gói 1** (AI Agentic) | Vẫn **8 thẻ**; tính năng AI hoạt động | 1 |
| 1c | TC-01c | Đăng nhập user **Gói 2** của công ty ABC | Hiện **9 thẻ**, huy hiệu `PRO` — tự động, không cần thao tác kích hoạt | 1 |
| 1d | TC-01d | Bấm thẻ Pro | Mở thẳng instance ABC, **không hỏi đăng nhập lại** | 1 |
| 1e | TC-01e | Sửa `plan = 'erp_pro'` trong DevTools (tài khoản Gói 1) | Thẻ hiện nhưng **không lấy được dữ liệu** — Odoo từ chối | 1 |
| 13 | TC-13 | Đăng nhập cùng tài khoản trên **máy thứ 1→5** | Cả 5 máy vào được bình thường | 1 |
| 14 | TC-14 | Đăng nhập trên **máy thứ 6** | Bị chặn, báo *"đã dùng đủ 5 thiết bị"* + liệt kê 5 máy đang chiếm chỗ | 1 |
| 15 | TC-15 | Gỡ 1 máy trên Profile vuahethong.net rồi thử lại máy 6 | Vào được | 0+1 |
| 16 | TC-16 | Xoá app settings rồi đăng nhập lại trên **cùng máy** | Sinh `device_id` mới, chiếm thêm 1 slot — ⚠️ hành vi đã biết, ghi nhận đúng như tài liệu, không coi là lỗi | 1 |
| 2 | TC-02 | Click thẻ Pro | Mở tab Odoo đã đăng nhập; click lần 2 không tạo tab trùng | 1 |
| 3 | TC-03 | Bỏ tab Pro ở nền 20 phút | RAM giảm rõ rệt (ghi số đo); click lại về đúng trang cũ, không mất phiên đăng nhập | 1 |
| 3b | TC-03b | Tải tệp ở tab khác khi tab Pro đang mở | Sniffer **không** bắt nhầm — chỉ chặn download phát sinh từ session Pro | 2 |
| 4 | TC-04 | `git merge upstream/main` thử | Không conflict ở `apps/erp/`; build & chạy bình thường | 1 |
| 5 | TC-05 | `npm run brand:gate` | PASS cả 4 cổng sau khi sửa `electron-builder.cjs` | 1 |
| 6 | TC-06 | Click `.pdf` trong Chatter | Mở thẳng tab AI PDF, không hộp thoại tải về | 2 |
| 7 | TC-07 | Click `.docx` / `.xlsx` | Mở đúng tab AI Docs / AI Sheets | 2 |
| 8 | TC-08 | Bấm Lưu về Drive từ Docs | Tệp lên Odoo kèm SHA256, đánh dấu `v1` | 2 |
| 9 | TC-09 | Sửa tệp mở từ Odoo rồi `Ctrl+S` | Lên `v2`, Chatter có log | 2 |
| 10 | TC-10 | Mở form SO trên Odoo | Panel trái hiện đúng ngữ cảnh `sale.order #id` | 3 |
| 11 | TC-11 | VuaMail: *"tạo cơ hội CRM từ email này"* | Tạo đúng `crm.lead`, đính kèm đã lên Drive | 3 |
| 12 | TC-12 | Excel + *"so sánh với PO123"* | Diff Card chỉ đúng mục lệch +20%; bấm cập nhật ➜ Odoo đổi giá | 4 |
| 17 | TC-17 | Ở module Sales: *"báo cáo sale tháng này, cột khách/ngày/SP/doanh số"* | Preview hiện lại điều kiện đã hiểu ➜ xác nhận ➜ mở tab Sheets đúng 4 cột, số khớp Odoo | 4 |
| 18 | TC-18 | Nói tiếp *"thêm cột lợi nhuận gộp, nhóm theo nhân viên sale"* | **Sheet đang mở cập nhật**, không sinh tệp thứ hai | 4 |
| 19 | TC-19 | Chạy báo cáo động rồi kiểm log Odoo | **Không có lệnh ghi nào** — chỉ `search_read`/`read_group` | 4 |
| 20 | TC-20 | Mở `~/Desktop/rieng_tu.xlsx` (ngoài Drive) ➜ yêu cầu đối chiếu ERP | **Từ chối**, nêu rõ lý do ngoài phạm vi Drive | 4 |
| 21 | TC-21 | Chép đúng tệp đó vào thư mục sync Drive ➜ thử lại | Đọc chéo chạy bình thường | 4 |
| 22 | TC-22 | Báo cáo vượt **50.000 dòng** | Cảnh báo trước, không treo app | 4 |

---

## 5. Rủi Ro

| Rủi ro | Mức | Ứng phó |
|---|:-:|---|
| Upstream đổi cấu trúc `NEW_ITEMS` | Thấp | Thẻ Pro ở **cuối mảng** ➜ merge chỉ đụng 1 khối liền mạch |
| Upstream đổi chữ ký `TabManager` | Thấp | `openErpTab()` sao nguyên mẫu `openMailTab()`; upstream đổi thì sửa cùng lúc cả hai |
| Odoo nâng v17→v18→v19 | Thấp | Webview chạy web client chuẩn, không phụ thuộc code desktop |
| Excel gộp ô nhiều tầng | Trung bình | Heuristic header + cho chỉ định cột thủ công (§Pha 4) |
| Quên rebuild shell sau khi sửa `apps/erp/src/main` | **Cao** | Ghi vào checklist Pha 1; triệu chứng: sửa code mà không thấy đổi |
| `will-download` bắt nhầm download của tab khác | **Cao** | Gắn handler vào `persist:vuahethong-pro`, tuyệt đối không `defaultSession` |
| Tệp temp tích tụ đầy ổ đĩa | Trung bình | Dọn thư mục temp lúc `app.quit()`; ceiling: chưa dọn khi app bị kill |
| `composeSkills` làm phình system prompt ở tab Sheets | Trung bình | Đo token trước/sau; nếu phình thì nạp `erpSkill` **lười** — chỉ ghép khi phiên đã đăng nhập ERP |
| **Pha 0 chậm ➜ Pha 1 không nghiệm thu được** | **Cao** | Chốt hợp đồng callback với đội vuahethong.net **trước khi** mở sprint; tạm thời dựng mock deeplink để code song song |
| User cài lại máy nhiều lần tự khoá tài khoản | **Cao** | UI gỡ thiết bị (mục 0.2) là **bắt buộc**, không phải nice-to-have |

---

## 6. Quy Trình Trước Mỗi Commit

```bash
npm run brand:gate && npm run lint && npm run typecheck
```

Sync upstream: `brand:restore` ➜ `git merge upstream/main` ➜ `brand:apply` ➜ `brand:gate`.
Luôn merge qua nhánh `sync/upstream-YYYYMMDD` + Pull Request — **cấm merge thẳng `main`**.
Commit kèm trailer `Authored-By: 360org <support@360.org.vn>`.

---

**Trạng thái:** Đã đối chiếu mã nguồn thật, sẵn sàng thi công Pha 1 · **Cập nhật:** 2026-09-13
