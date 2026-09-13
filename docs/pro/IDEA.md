# IDEA — VuaHeThong Pro

> **Nguồn chân lý cho tầm nhìn & tuyên ngôn.** Kiến trúc: [`ARCH.md`](ARCH.md) · Thi công: [`PLAN.md`](PLAN.md).
> **Chủ quản:** 360 CORP · **Cập nhật:** 2026-09-13

---

## 0. Sáu Mục Tiêu Cốt Lõi

| # | Mục tiêu | Hiện thực ở |
|:-:|---|---|
| 0 | **Hợp nhất** VuaOffice + Mail AI + ERP Pro thành **một hệ thống làm việc dưới máy local** | §1 |
| 1 | **Giảm tải Odoo** — AI native desktop, **không tích hợp vào Odoo server** ➜ giảm rủi ro can thiệp module/DB | §6 |
| 2 | **Đọc chéo dữ liệu giữa các tab** — với điều kiện dữ liệu thuộc Odoo Drive | §2.1 |
| 3 | **Đơn giản hoá nghiệp vụ ERP cứng nhắc** — làm việc bằng file quen thuộc, agent sinh dữ liệu cho ERP | §5① |
| 4 | **Tương tác 2 chiều, số liệu động** — nói một câu ra báo cáo Excel, **không cần viết module báo cáo** | §5③ |
| 5 | **Native desktop đẹp, mượt, giảm thời gian chết** | §7 |

---

## 1. Tôn Chỉ

> **"TẬP TRUNG LÕI ENGINE LÀ VUA AI, CÒN DOCS / SHEETS / PDF / MAIL / VUA HỆ THỐNG ĐỀU LÀ MỘT HOẶC CÁC COMBINE TOOLS ĐỂ LÀM VIỆC."**
> *— Chỉ đạo của Sếp*

Vua AI là **bộ não**, không phải chatbot bên lề. Bộ ứng dụng là **tay chân**:

| Công cụ | Vai trò | Trạng thái |
|---|---|:---:|
| Docs · Sheets · Slides · Markdown · HTML · PDF | Soạn thảo, bóc tách, xuất bản | ✅ upstream |
| Mail | Cổng đối ngoại | ✅ 360 tự viết (`apps/mail/`) |
| **VuaHeThong** | Data Center Odoo: kho, bán hàng, kế toán | 🔨 **xây mới** (`apps/erp/`) |

```
                    ┌──────────────────────┐
                    │  SẾP / NGƯỜI DÙNG    │
                    └──────────┬───────────┘
                               │ ngôn ngữ tự nhiên
                               ▼
                 ┌───────────────────────────┐
                 │   LÕI: VUA AI ENGINE      │
                 │  hiểu · suy luận · điều phối│
                 └─────────────┬─────────────┘
      ┌────────────┬───────────┴───────┬────────────┐
      ▼            ▼                   ▼            ▼
 ┌─────────┐ ┌──────────┐      ┌───────────┐ ┌───────────┐
 │ VUAMAIL │ │  SHEETS  │      │ DOCS/PDF  │ │  360 ERP  │
 └─────────┘ └──────────┘      └───────────┘ └───────────┘
        Bốn công cụ NGANG HÀNG dưới quyền Vua AI
```

**ERP ngang hàng, khác ở hệ quả.** Mail/Sheets/Docs xử lý dữ liệu *đang trôi*; ERP
giữ **sổ sách đã chốt**. Nên thao tác **đọc** ERP tự do như mọi tool; thao tác
**ghi** bắt buộc qua cổng duyệt của Sếp, gửi bằng **1 lệnh JSON-RPC trọn gói**.

> ⚙️ Về thi công, `AgentLoop` **chạy trong renderer của từng app** (đã kiểm chứng ở
> docs/sheets/html/pdf/mail). ERP **không phải bộ não thứ hai** — nó là một
> `AgentSkill` ghép thêm vào AgentLoop sẵn có bằng `composeSkills()`. Chi tiết:
> [`PLAN.md` §4.1](PLAN.md).

---

## 2. Hai Gói Dịch Vụ

Một danh tính duy nhất: tài khoản vuahethong.net **chính là** `res.users` Odoo.
Không ghép, không ánh xạ, không đăng nhập hai lần.

### 2.1 Điều Kiện Đọc Chéo — Dữ Liệu Phải Thuộc Odoo Drive

Đọc chéo giữa các tab **không mở tự do cho mọi tệp trên máy**. Ranh giới:

```
  ✅ ĐƯỢC đọc chéo                    ❌ KHÔNG đọc chéo
  ┌──────────────────────────┐        ┌──────────────────────────┐
  │ Tệp thuộc ODOO DRIVE:    │        │ Tệp cá nhân bất kỳ:      │
  │ • đính kèm Chatter/form  │        │ • ~/Desktop/rieng_tu.xlsx│
  │ • trong thư mục đồng bộ  │        │ • tệp tải từ web         │
  │   Drive dưới máy (kiểu   │        │ • tệp ngoài thư mục sync │
  │   OneDrive/Dropbox)      │        │                          │
  └──────────────────────────┘        └──────────────────────────┘
```

**Tệp có thể nằm dưới máy** — miễn nó ở trong **thư mục đồng bộ Odoo Drive**, y như
cách OneDrive/Dropbox hoạt động. Không bắt buộc phải upload thủ công mỗi lần.

Ba điều kiện đồng thời để một tệp được đọc chéo:
1. Tài khoản đã đăng nhập và `plan = 'erp_pro'`;
2. Đã có **phiên hợp lệ** với instance Odoo của công ty;
3. Tệp nằm trong **phạm vi Odoo Drive** (đính kèm ERP, hoặc trong thư mục sync).

> 🔴 **Vì sao ràng buộc này quan trọng.** Không có nó, AI ở tab ERP có thể với sang
> tệp cá nhân bất kỳ đang mở — vừa là lỗ hổng riêng tư, vừa khiến dữ liệu vào ERP
> không truy được nguồn gốc. Neo vào Drive thì mọi dữ liệu sinh ra đều có **đường
> dẫn kiểm toán**: tệp nào, phiên bản nào, ai đưa vào.

> ⚠️ `ponytail:` Xác định "thuộc Drive" bằng cách **so đường dẫn với thư mục sync**
> đã đăng ký + đối chiếu SHA256 với `ir.attachment`. Ceiling: chưa chống được người
> cố tình copy tệp lạ vào thư mục sync. Chấp nhận — người đó đã có quyền ghi Drive.

### Gói 1 — AI Agentic

| Bước | Hành động | Ai làm |
|:-:|---|---|
| 1 | Đăng ký gói AI Agentic trên vuahethong.net | Khách |
| 2 | Mở VuaOffice ➜ Đăng nhập (SSO 360) | Khách · ✅ hạ tầng đã có |
| 3 | Máy chủ trả về: gói + danh sách thiết bị | vuahethong.net |
| 4 | Profile ➜ đăng nhập AI Router | Odoo đảm nhiệm |
| 5 | ⚡ Tính năng AI của VuaOffice bật | Desktop |
| 6 | Làm việc với AI trên Docs/Sheets/PDF/Mail | Khách |

🔒 **Tối đa 5 thiết bị / tài khoản.** Máy thứ 6 bị chặn.
📋 Home: **8 thẻ** — không có thẻ Pro.

### Gói 2 — AI Agentic + ERP Pro

Kế thừa trọn vẹn Gói 1, cộng thêm:

| Bước | Hành động |
|:-:|---|
| 7 | Đăng nhập xong ➜ 🏢 **thẻ Pro tự xuất hiện** trên Home (không có nút kích hoạt thủ công) |
| 8 | Bấm thẻ ➜ vào thẳng instance Odoo của công ty — **không hỏi đăng nhập lại** |
| 9 | Nạp dữ liệu ➜ tác nghiệp ERP + đọc chéo tài liệu |

📋 Home: **9 thẻ**.

### Luật cứng
1. **Máy chủ phán quyết, client thi hành.** Không đọc gói từ tệp cục bộ, không suy
   từ tên miền email. Client tự quyết = sửa một biến DevTools là mở khoá miễn phí.
2. **Ẩn thẻ chỉ là giao diện.** Lá chắn thật là Odoo từ chối user không có quyền.
3. **Đọc chéo mặc định TẮT**, chỉ sống khi đã có phiên hợp lệ với instance công ty.
4. **Đếm thiết bị do máy chủ giữ sổ.** Client chỉ khai mình là máy nào.

> 🟢 **Danh tính đã liên thông sẵn, không phải xây.** Token SSO 360 là **JWT**, và
> repo đã có `parseJwtPayload()` rút ra `uid` — chính là `res.users` id của Odoo
> ([genoffice-auth.ts:126](../../packages/ai-search/src/genoffice-auth.ts); avatar
> hiện tại dựng từ đúng `uid` đó). Câu *"tài khoản vuahethong.net **chính là**
> `res.users`"* không phải mong muốn — nó **đang chạy trong bản release hiện tại**.

### Giới hạn 5 thiết bị

Repo **đã có** định danh máy bền vững: `clientId` (UUID trong app settings,
[analytics.ts:92](../../apps/shell/src/main/analytics.ts)) — dùng lại, không thêm
thư viện nào.

> ⚠️ `ponytail:` `clientId` reset khi xoá settings / cài lại máy. Ceiling: người cố
> tình lách được. Chấp nhận — đây là chống lạm dụng thường, không phải DRM. Nâng
> cấp khi bị lách thật: vân tay phần cứng (MAC + serial ổ đĩa).

| Tình huống | Xử lý |
|---|---|
| Máy thứ **6** đăng nhập | Chặn, báo *"đã dùng đủ 5 thiết bị"* + liệt kê máy để tự gỡ |
| Người dùng **cài lại máy** | Cần nút **gỡ thiết bị** trong Profile — 🔴 thiếu nó, cài lại 5 lần là tự khoá tài khoản |
| Gói **hết hạn** giữa lúc làm | Không cắt ngang; kiểm ở lần khởi động kế tiếp |

---

## 3. Home Launcher — 9 Thẻ

```
┌──────────────────────────────────────────────────────────────────────┐
│ [W]   [X]    [P]    [M↓]  [</>] [PDF]  [✉]   [🏢]      [📁]          │
│ Docs Sheets Slides   MD   HTML  PDF   Mail  VUAHETHONG Open Local    │
│  1     2      3       4     5     6     7     8 ← MỚI    9           │
└──────────────────────────────────────────────────────────────────────┘
```

- **KHÔNG gỡ thẻ upstream** để "cho đủ 8". Mỗi lần gỡ là nợ merge phải trả lại ở
  mọi đợt sync. Chỉ **thêm vào cuối**.
- Thẻ 🏢 là **có điều kiện** — khách Gói 1 và khách thường vẫn thấy đúng 8 thẻ.

---

## 4. Tab Pro — AI Panel Trái + Odoo Phải

```
┌──────────────────────┬─────────────────────────────────────────────┐
│ VUA AI PANEL (28%)   │ 360 ERP ENTERPRISE (72%) — ODOO WEB CLIENT  │
├──────────────────────┼─────────────────────────────────────────────┤
│ • AgentLoop tại chỗ  │ • Odoo nguyên bản 100% tính năng            │
│ • AI Gateway 360     │ • Sales · Kho · Kế toán · CRM · Project     │
│ • 0% tải Odoo Server │                                             │
│                      │ 📎 Đính kèm trong Chatter:                  │
│ [Khung chat ra lệnh] │  Hop_dong.docx ─► click ─► tab AI Docs      │
│                      │  Bang_gia.xlsx ─► click ─► tab AI Sheets    │
│ [Preview / Diff Card]│  Ban_ve.pdf    ─► click ─► tab AI PDF       │
│ [ ✅ Xác nhận tạo ] ─┼─► 1 JSON-RPC + nhảy tới bản ghi vừa tạo     │
└──────────────────────┴─────────────────────────────────────────────┘
```

**Không split-view khi soạn thảo.** Docs/Sheets chiếm toàn màn hình, chỉ thêm nút
**[☁️ Lưu về VuaHeThong Drive]** trên Ribbon.

---

## 5. Ba Kịch Bản Sát Thủ

### ① File quen thuộc ➜ dữ liệu ERP *(Mail + Sheets + ERP)*

> **Giải mục tiêu 3: đơn giản hoá nghiệp vụ ERP cứng nhắc.**

NCC gửi email ➜ mở đính kèm bằng Sheets ➜ *"So sánh với PO123"* ➜ AI đọc bảng tại
RAM máy trạm + tra Odoo ➜ Diff: *"Mục ABC: PO 100k, Excel 120k (+20%)"* ➜ Sếp
duyệt ➜ cập nhật Odoo + soạn email phản hồi.

**Điểm mấu chốt:** nhân viên vẫn làm việc bằng **Excel/Word như thói quen 10 năm
nay**, không phải học form Odoo nhiều tab nhiều trường. Agent chịu trách nhiệm
dịch từ file sang bản ghi ERP đúng chuẩn.

### ② VuaMail Talk-to-Convert *(Mail + PDF + ERP + Drive)*

Nhận email kèm `YeuCau.pdf` ➜ *"Tạo Cơ hội bán hàng CRM"* ➜ AI bóc người gửi ➜
tìm/tạo `res.partner`, tạo `crm.lead`, đẩy đính kèm lên Drive Vault ➜ xong.

### ③ Báo cáo động — KHÔNG cần viết module báo cáo 🔥

> **Giải mục tiêu 4: tương tác 2 chiều, số liệu động.**
> Đây là kịch bản **thay đổi cuộc chơi** lớn nhất về mặt chi phí vận hành.

```
[1] Sếp đang ở module Sales trên tab Pro
        │  panel trái tự biết ngữ cảnh: sale.order
        ▼
[2] "Em lấy cho anh báo cáo sale tháng này, xuất Excel
     với các trường: khách hàng, ngày, sản phẩm, doanh số"
        ▼
[3] Agent dựng truy vấn ➜ đọc Odoo qua JSON-RPC (CHỈ ĐỌC)
        ▼
[4] Dựng workbook tại RAM máy trạm ➜ mở thẳng tab AI Sheets
        │  ✅ khâu này KHÔNG phải viết mới: propose_operations
        │     + create_document của Sheets đã làm sẵn
        ▼
[5] Sếp xem, chỉnh trực tiếp, nói tiếp: "thêm cột lợi nhuận gộp,
     nhóm theo nhân viên sale" ➜ bảng cập nhật ngay
        ▼
[6] Ưng ý ➜ [☁️ Lưu về VuaHeThong Drive] hoặc gửi mail luôn
```

**So với cách làm cũ:**

| | Cách cũ | Báo cáo động |
|---|---|---|
| Cần gì để có báo cáo mới | Viết module Python + QWeb, test, deploy, restart | **Nói một câu** |
| Thời gian | Vài ngày đến vài tuần | Vài giây |
| Ai làm được | Lập trình viên Odoo | **Chính người dùng nghiệp vụ** |
| Muốn sửa cột/nhóm | Sửa code, deploy lại | Nói tiếp câu nữa |
| Rủi ro cho hệ thống | Đụng module/DB production | **Zero** — chỉ đọc, dựng file dưới máy |

> 🔴 **Đây là chỗ ràng buộc "chỉ đọc" phát huy giá trị.** Báo cáo động **không ghi
> một dòng nào** vào Odoo ➜ không cần duyệt, không cần lo hỏng sổ sách. Mọi tool
> **ghi** vẫn phải qua cổng phê duyệt như §1.

> ⚠️ `ponytail:` Agent sinh truy vấn từ ngôn ngữ tự nhiên — có thể hiểu sai ý
> (ví dụ "tháng này" là tháng dương hay kỳ kế toán). Ceiling: cần hiện **lại điều
> kiện truy vấn đã hiểu** trên Preview Card để Sếp xác nhận trước khi chạy. Nâng
> cấp khi dữ liệu lớn: giới hạn số dòng + cảnh báo trước khi truy vấn nặng.

---

## 6. Vì Sao AI Dưới Desktop, Không Native Trên Odoo?

| Tiêu chí | AI trên server Odoo | AI dưới desktop |
|---|---|---|
| Đọc DOCX/PDF/Excel | Upload rồi parse lại | **Đã nằm sẵn trong RAM** |
| Tải CPU/RAM Odoo | Nặng, nghẽn worker Python | **0%** — nhận 1 transaction |
| Latency AI | Vòng 2 chặng qua Odoo | **Thẳng AI Gateway 360** |
| Nâng cấp Odoo / upstream | Viết lại module Python | **Zero-Conflict** |
| **Rủi ro cho hệ thống khách** | **Cài module lạ vào production, đụng DB** | **Không cài gì vào Odoo** |

**Hai điểm nghẽn nếu làm ngược lại:**

**① Nghẽn tài nguyên.** Bóc tệp + gọi LLM chiếm giữ worker Python (uwsgi/gevent).
Nhiều người gọi AI cùng lúc ➜ worker starvation ➜ chậm luôn bán hàng, kế toán,
xuất kho, hoá đơn điện tử.

**② Nghẽn rủi ro — nghiêm trọng hơn.** AI native trên Odoo nghĩa là **cài thêm
module vào hệ thống production đang chạy thật của khách**:

- Module lỗi ➜ **sập cả hệ thống ERP**, không chỉ sập tính năng AI
- Đụng schema DB ➜ migration hỏng, khó rollback
- Odoo nâng cấp v17→v18→v19 ➜ **viết lại module** mỗi lần
- Mỗi khách một bản cài ➜ nhân bản rủi ro theo số khách hàng

> ✅ **Cách của VuaOffice:** Odoo giữ nguyên bản 100%, **không cài thêm gì**. Desktop
> nói chuyện với Odoo qua **JSON-RPC chuẩn** — đúng thứ giao diện Odoo vẫn công bố
> cho bên thứ ba dùng. Odoo nâng cấp phiên bản, desktop không phải sửa dòng nào.

---

## 7. Trải Nghiệm Native — Mượt & Giảm Thời Gian Chết

> **Giải mục tiêu 5.** Đây là thứ người dùng **cảm nhận được ngay**, khác với các
> mục tiêu kỹ thuật ở trên.

| Việc | Cách làm | Lợi ích cảm nhận |
|---|---|---|
| Render bảng/văn bản | CPU/GPU **máy trạm**, không đợi server | Cuộn bảng trăm nghìn dòng không khựng |
| Mở tệp đính kèm | 1-click ➜ mở thẳng tab đúng | Không tải về ➜ tìm thư mục ➜ mở tay |
| Tab Pro để nền | Auto-Suspend sau 15 phút, click lại về đúng trang | Không ngốn RAM khi không dùng |
| Giao diện | Token màu chung, sáng/tối đồng bộ toàn suite | Một bộ, không chắp vá |
| Gọi AI | Thẳng AI Gateway 360, không vòng qua Odoo | Phản hồi nhanh, không phụ thuộc tải ERP |

> 📏 **Con số phải đo, không được đoán.** Chỉ tiêu RAM/thời gian phục hồi chốt sau
> khi đo thật bằng `process.getProcessMemoryInfo()` ở Checkpoint 1 ([`PLAN.md`](PLAN.md)).
> Tài liệu này **không cam kết** mốc cụ thể khi chưa có số đo.

---

## 8. Các Giai Đoạn Thực Hiện

```
[Pha 0] Hợp đồng máy chủ           — vuahethong.net · CHẶN mọi pha sau
   │ callback SSO trả thêm: pro_entitled · instance_url · device slot
   ▼
[Pha 1] Tab Odoo chạy được          ~1 tuần
   │ 8 điểm hook + apps/erp/ + tái dùng SSO + 5-thiết-bị + Auto-Suspend
   ▼
[Pha 2] Cầu nối tệp                 ~1.5 tuần
   │ Đính kèm 1-click + Lưu về Drive + đồng bộ ngược Ctrl+S
   ▼
[Pha 3] AI Panel + Talk-to-Convert  ~2 tuần
   ▼
[Pha 4] Agentic + Báo cáo động + Diff  ~2 tuần
   ▼
[Đóng gói Installer]
```

> 🔴 **Pha 0 là cổng chặn.** Desktop chỉ đọc và thi hành phán quyết của máy chủ.
> Chưa chốt hợp đồng callback thì Pha 1 không có gì để kiểm thử.

Việc chi tiết từng pha, file cụ thể và 22 ca UAT: [`PLAN.md`](PLAN.md).

---

## 9. Phát Triển Song Song Không Xung Đột

- **1 monorepo duy nhất**; gói Pro nằm trọn trong `apps/erp/` — upstream không có
  thư mục này ➜ `git merge upstream/main` không bao giờ conflict ở phần ERP.
- **Tiền lệ đã kiểm chứng:** `apps/mail/` do 360 tự viết, đã sống qua nhiều đợt sync
  upstream mà chưa từng conflict. `apps/erp/` đi đúng con đường đó.
- Sync: `brand:restore` ➜ `git merge upstream/main` ➜ `brand:apply` ➜ `brand:gate`.
  Chi tiết: [`../360_BRAND_STRATEGY.md`](../360_BRAND_STRATEGY.md).

---

**Trạng thái:** Đã đối chiếu mã nguồn thật · **Cập nhật:** 2026-09-13
