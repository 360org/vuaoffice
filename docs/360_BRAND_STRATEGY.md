# WHITELABEL_STRATEGY.md — Quy chế Bắt buộc về Whitelabel & Đồng bộ Upstream

> **LOẠI TÀI LIỆU: QUY CHẾ BẮT BUỘC (MANDATORY POLICY) — KHÔNG PHẢI KHUYẾN NGHỊ**
> **Chủ quản**: 360 CORP
> **Đối tượng áp dụng**: MỌI AI agent và MỌI lập trình viên chạm vào kho mã này
> **Hiệu lực**: Từ v0.7.0 trở đi
> **Tài liệu liên quan bắt buộc đọc kèm**: [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md)

---

## §0. TÓM TẮT CHO AGENT — ĐỌC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ

Nếu bạn là AI agent và chỉ đọc được một phần tài liệu này, hãy đọc phần này.

| Bạn định làm gì | Bạn BẮT BUỘC phải |
| :--- | :--- |
| Sửa bất kỳ chuỗi thương hiệu nào | Sửa `whitelabel/brand-config.json`, **KHÔNG** sửa trực tiếp mã nguồn |
| Merge/pull từ upstream | Theo đúng §7, không được bỏ bước nào |
| Trước khi commit bất kỳ thay đổi nào | Chạy `npm run brand:gate` và đạt |
| Thấy `check-brand` báo lỗi | Theo §8, **KHÔNG** được vô hiệu hóa cổng kiểm tra |
| Tạo tag & release | Theo `RELEASE_PROTOCOL.md`, không được tự ý chạy |

**Một câu duy nhất cần nhớ:**
> Thương hiệu là **dữ liệu cấu hình**, không phải mã nguồn.
> Mọi thay đổi thương hiệu đi qua `brand-config.json`. Không có ngoại lệ.

---

## §1. Vấn đề Gốc rễ mà Quy chế này Giải quyết

VuaOffice là bản phái sinh whitelabel của dự án mã nguồn mở `genspark-ai/genoffice`. Mỗi lần đồng bộ upstream, tùy biến thương hiệu bị ghi đè.

**Nguyên nhân gốc (đã được khắc phục, tuyệt đối không tái lập):**

Cơ chế cũ sửa đổi phá hủy tại chỗ (destructive in-place mutation) các tệp mã nguồn rồi commit kết quả. Điều đó khiến dòng thương hiệu của ta và dòng mã của upstream trở thành **cùng một dòng vật lý** — Git bắt buộc phải xung đột.

```
       MÔ HÌNH CŨ (đã bỏ)                    MÔ HÌNH BẮT BUỘC HIỆN NAY
   ┌──────────────────────────┐          ┌──────────────────────────┐
   │ Ribbon.tsx               │          │ Ribbon.tsx               │
   │  'VuaOffice AI' ←────────│ GHI ĐÈ   │  'VuaOffice AI'          │
   │  (chính dòng của upstream)│          │  (sinh ra từ config)     │
   └──────────────────────────┘          └───────────▲──────────────┘
              ▲                                      │ apply
    merge = XUNG ĐỘT mỗi lần            ┌────────────┴─────────────┐
                                        │ whitelabel/              │
                                        │   brand-config.json      │
                                        │ (merge=ours, upstream    │
                                        │  KHÔNG BAO GIỜ đụng tới) │
                                        └──────────────────────────┘
```

**Bằng chứng thiệt hại lịch sử**: merge `91502ea` kéo theo commit `3c771c7` phải khôi phục tay 25 dòng `VuaOffice` và gỡ 26 dòng `Genspark` — và **vẫn bỏ sót**, khiến nhãn "Genspark AI" hiển thị công khai trên Ribbon của Docs suốt nhiều bản phát hành.

---

## §2. BẢY ĐIỀU CẤM TUYỆT ĐỐI

Vi phạm bất kỳ điều nào dưới đây đều bị coi là làm hỏng kho mã.

### 🚫 CẤM 1 — Không hardcode chuỗi thương hiệu trực tiếp vào mã nguồn

Không được sửa tay `'GenOffice Docs'` thành `'VuaOffice Docs'` trong tệp `.ts`/`.tsx`/`.html`.
**Đúng**: thêm cặp thay thế vào `brand-config.json` rồi chạy `npm run whitelabel:apply`.

### 🚫 CẤM 2 — Không tạo nguồn chân lý thứ hai

`whitelabel/brand-config.json` là **nguồn chân lý DUY NHẤT**. Cấm hardcode quy tắc thương hiệu trong `scripts/whitelabel.js`, `tools/check-brand.mjs`, hay bất kỳ đâu khác.

> *Đây chính là khiếm khuyết đã giết chết cơ chế cũ: `brand-config.json` tồn tại nhưng script không bao giờ đọc nó, tạo ra hai bộ quy tắc mâu thuẫn — và bộ đúng hơn lại là bộ không bao giờ chạy.*

### 🚫 CẤM 3 — Không đổi tên định danh kỹ thuật

Xem §5. Đổi `@genoffice/*`, alias font, khóa từ điển PDF, hay thư mục `~/.genoffice` gây thiệt hại **lớn hơn nhiều** so với lợi ích thương hiệu.

### 🚫 CẤM 4 — Không sửa ghi công giấy phép

Chuỗi ghi công Apache License 2.0 (`Original Work: Copyright ... Mainfunc, Inc. (GenOffice)`, `licenseNotice`) là **nghĩa vụ pháp lý**. Sửa chúng là **vi phạm giấy phép**.

### 🚫 CẤM 5 — Không vô hiệu hóa cổng kiểm tra

Cấm xóa, bỏ qua, hay thêm `continue-on-error` cho `brand:gate` trong CI. Cấm dùng `--no-verify`. Cổng báo đỏ nghĩa là **có lỗi thật**, không phải cổng sai.

### 🚫 CẤM 6 — Không merge upstream trực tiếp vào `main`

Mọi lần đồng bộ đi qua nhánh `sync/upstream-YYYYMMDD` và Pull Request. Xem §7.

### 🚫 CẤM 7 — Không thêm quy tắc `protected` một chiều

Mọi mẫu `protected` chặn một chiều PHẢI có cặp đối xứng cho chiều còn lại. Xem §6 — đây là lỗi âm thầm nguy hiểm nhất trong toàn hệ thống.

---

## §3. Kiến trúc Bắt buộc

```
whitelabel/brand-config.json      ← NGUỒN CHÂN LÝ DUY NHẤT (merge=ours)
          │
          ├── scripts/lib/brand-core.cjs      lõi dùng chung (đọc config)
          │         │
          │         ├── scripts/whitelabel.js   apply | restore | status | selftest
          │         └── tools/check-brand.mjs   cổng kiểm tra CI
          │
          └── .gitattributes  merge=ours  →  upstream không ghi đè được
```

**Bốn lệnh của engine** (`scripts/whitelabel.js`):

| Lệnh | Tác dụng | Ghi tệp? |
| :--- | :--- | :---: |
| `apply` | upstream → VuaOffice | Có |
| `restore` | VuaOffice → upstream (để merge 3 chiều sạch) | Có |
| `status` | Báo cáo còn bao nhiêu điểm chưa apply, exit 1 nếu chưa sạch | Không |
| `selftest` | Kiểm chứng bộ quy tắc song ánh (§6) | Không |

Engine **zero-dependency** (chỉ dùng module lõi Node) để chạy được **trước** `npm ci`.

---

## §4. CÂY QUYẾT ĐỊNH — Chuỗi này là Rò rỉ hay Được Miễn trừ?

Đây là phần thao tác quan trọng nhất. Khi gặp một chuỗi chứa `GenOffice`/`Genspark`, đi theo cây này:

```
Chuỗi có chứa "GenOffice" hoặc "Genspark"
│
├─ Nằm trong chú thích mã nguồn (// hoặc /* */)?
│    └─ CÓ → MIỄN TRỪ. Không sửa.
│            Lý do: không ai nhìn thấy; sửa chỉ làm phình bề mặt xung đột.
│            Nguy hiểm hơn: chú thích thường chứa link tới issue upstream —
│            đổi slug tạo ra liên kết TRỎ SAI.
│
├─ Là ghi công bản quyền / giấy phép (Copyright, Original Work, licenseNotice)?
│    └─ CÓ → MIỄN TRỪ TUYỆT ĐỐI. ⚖️ Sửa = VI PHẠM Apache License 2.0 §4.
│
├─ "GenOffice" liền ngay một chữ/số, không có dấu cách? (GenOfficeSansKR…)
│    └─ CÓ → MIỄN TRỪ. Đây là ĐỊNH DANH KỸ THUẬT:
│            • tên tệp font trên đĩa   → đổi = font lỗi 404
│            • khóa từ điển PDF        → đổi = không đọc được file đã lưu
│
├─ Là tên package / biến môi trường / thư mục dữ liệu?
│    (@genoffice/*, GENOFFICE_*, ~/.genoffice)
│    └─ CÓ → MIỄN TRỪ. Xem §5 để hiểu quy mô thiệt hại nếu đổi.
│
├─ Nói về DỊCH VỤ Genspark có thật? ("Sign in to Genspark", genspark.ai/pricing)
│    └─ CÓ → MIỄN TRỪ. Genspark là nhà cung cấp AI HỢP LỆ trong AI_PROVIDERS.
│            Đổi thành "VuaOffice" là NÓI DỐI người dùng về nơi họ đăng nhập.
│
└─ Còn lại: sản phẩm TỰ XƯNG sai thương hiệu
     (tiêu đề cửa sổ, nhãn Ribbon, system prompt AI, menu, lời mời Star…)
     └─ ĐÂY LÀ RÒ RỈ → thêm cặp vào `replacements` trong brand-config.json
```

**Quy luật vàng để phân biệt nhanh:**
> `GenOffice` **liền chữ** = định danh kỹ thuật (miễn trừ).
> `GenOffice` **có dấu cách hoặc dấu câu ngay sau** = chữ hiển thị (phải sửa).
>
> `GenOfficeSansKR` → miễn trừ · `GenOffice Docs`, `Enjoying GenOffice?` → phải sửa.

---

## §5. Danh mục Miễn trừ — Quy mô Thiệt hại nếu Vi phạm

| Định danh | Nếu đổi tên thì sao |
| :--- | :--- |
| `@genoffice/*` (tên package) | **299 tệp** có lệnh import. Xung đột trên **mọi dòng import**, mọi lần merge upstream. Người dùng không bao giờ thấy tên này. |
| `GenOffice Sans/Serif/Batang/Myungjo/MingLiU/Hiragino/Songti/Heiti/Fullwidth/Box/Ethiopic/MS` | Khóa so khớp `local()` alias trong `fonts.css`. Đổi = **vỡ fallback font CJK** (Hàn/Nhật/Trung). |
| `GenOfficeSansKR-Regular-subset.woff2` | **Tên tệp thật trên đĩa**. Đổi = font **lỗi 404**, chữ hiển thị sai. |
| `PDFName.of('GenOfficeFormField')`, `GenOfficeStaticFormFills`, `GenOffice visual signature field` | **Khóa/marker định dạng dữ liệu ghi bên trong tệp PDF**. Đổi = ứng dụng **không đọc được form và chữ ký trong PDF người dùng đã lưu**. Mất tương thích ngược. |
| `~/.genoffice/`, `GENOFFICE_AUTH_DIR` | Thư mục dữ liệu. Đổi = **mất phiên đăng nhập của toàn bộ người dùng hiện hữu**. |
| `Copyright`, `Original Work`, `licenseNotice` | ⚖️ **Vi phạm Apache License 2.0 §4** — nghĩa vụ pháp lý giữ ghi công tác giả gốc. |
| `Sign in to Genspark`, `genspark.ai/pricing`, `aiGsk*` | Tham chiếu **dịch vụ Genspark thật**. Đổi = nói dối người dùng về nơi họ đăng nhập và nạp tiền. |

> **Nguyên tắc phân định**: Chỉ whitelabel những gì **người dùng nhìn thấy và hiểu là tên sản phẩm**. Giữ nguyên mọi định danh kỹ thuật để bề mặt xung đột với upstream nhỏ nhất có thể.

---

## §6. LUẬT SONG ÁNH (Bijectivity Law) — Bắt buộc

**Bất biến bắt buộc của bộ quy tắc:**

```
apply( restore( apply(x) ) )   ===   apply(x)
```

Mọi mẫu trong `protected` chặn một chiều **PHẢI** có cặp đối xứng chiều còn lại.

### Vì sao đây là lỗi nguy hiểm nhất

Lỗi này đã thực sự xảy ra trong quá trình xây dựng cơ chế và được `selftest` bắt được:

```
Ban đầu:  import { VuaOfficeIcon } from './VuaOfficeIcon'
restore:  import { GenOfficeIcon } from './GenOfficeIcon'      ← đổi được
apply  :  import { GenOfficeIcon } from './GenOfficeIcon'      ← KẸT LUÔN
                   ↑ vì mẫu `GenOffice[A-Za-z]` đang được bảo vệ
```

Chỉ **một** chu kỳ `restore → apply` là **hỏng vĩnh viễn** mã nguồn. Lỗi hoàn toàn **im lặng**: không cảnh báo, không báo đỏ, chỉ lộ ra khi ứng dụng chạy hỏng ở production.

### Bắt buộc

Sau **mọi** thay đổi `brand-config.json`, phải chạy:

```bash
npm run whitelabel:selftest
```

Lệnh này kiểm chứng bất biến trên 9 mẫu tổng hợp **và toàn bộ 447 tệp thật** của kho mã.

---

## §7. QUY TRÌNH ĐỒNG BỘ UPSTREAM — Bắt buộc, không được bỏ bước

### Bước 0 — Thiết lập máy (một lần duy nhất mỗi máy)

```bash
npm run upstream:setup
```

Lệnh này thêm remote `upstream` và **đăng ký merge driver `ours`**.

> ⚠️ **CỰC KỲ QUAN TRỌNG**: Git **KHÔNG** tự kích hoạt merge driver khi clone. Nếu chưa chạy lệnh này, toàn bộ khai báo `merge=ours` trong `.gitattributes` **IM LẶNG không có tác dụng** — trong khi cả nhóm tin rằng thương hiệu đang được bảo vệ.

### Bước 1–6 — Quy trình đồng bộ

```bash
# 1. Đưa mã về trạng thái upstream sạch để Git merge 3 chiều tối ưu
npm run whitelabel:restore

# 2. Tạo nhánh đồng bộ riêng — CẤM merge thẳng vào main (§2 CẤM 6)
git fetch upstream
git checkout -b sync/upstream-$(date +%Y%m%d)
git merge upstream/main

# 3. Xử lý xung đột còn lại (sẽ rất ít nhờ merge=ours + brand-config)

# 4. Áp lại thương hiệu
npm run whitelabel:apply

# 5. CỔNG BẮT BUỘC — phải đạt trước khi commit
npm run brand:gate          # selftest + status + check-brand
npm run typecheck
npm test

# 6. Mở Pull Request để rà soát. KHÔNG tự merge.
```

### Sau khi merge PR đồng bộ

Kiểm tra `check-brand` Tầng 2 có báo chuỗi mới không (§8). Upstream thường xuyên thêm chuỗi thương hiệu mới; đó là việc bình thường và phải được khai báo vào config.

---

## §8. Xử lý khi Cổng Kiểm tra Báo đỏ

`tools/check-brand.mjs` báo lỗi theo hai tầng. **Cách xử lý khác nhau hoàn toàn.**

### Tầng 1 — Chuỗi upstream đã biết

Nghĩa là: whitelabel chưa được apply.

```bash
npm run whitelabel:apply
```

### Tầng 2 — TRÔI DẠT: chuỗi upstream MỚI

Nghĩa là: upstream vừa thêm một chuỗi thương hiệu mà `brand-config.json` chưa biết. **Đây là tình huống bình thường sau mỗi lần đồng bộ upstream** — không phải lỗi của cổng.

**Bắt buộc xử lý theo §4 (cây quyết định):**

1. Đọc ngữ cảnh chuỗi bị báo.
2. Đi qua cây quyết định §4.
3. Nếu là **rò rỉ** → thêm cặp vào `replacements`.
4. Nếu là **miễn trừ** → thêm mẫu vào `protected`, **kèm trường `reason` giải thích rõ vì sao**.
5. Chạy `npm run whitelabel:selftest` (§6).
6. Chạy `npm run whitelabel:apply`.

> 🚫 **CẤM**: thêm mẫu vào `protected` chỉ để cổng hết báo đỏ mà không thực sự phân loại. Trường `reason` là bắt buộc và sẽ bị soi trong code review.

---

## §9. Checklist Bắt buộc trước khi Commit

Agent phải tự xác nhận đủ các mục sau. Không được bỏ qua mục nào.

- [ ] Không sửa tay chuỗi thương hiệu trong `.ts`/`.tsx`/`.html` (§2 CẤM 1)
- [ ] Mọi thay đổi thương hiệu đã đi qua `whitelabel/brand-config.json` (§2 CẤM 2)
- [ ] Mọi mẫu `protected` mới đều có trường `reason` rõ ràng (§8)
- [ ] Mọi mẫu `protected` mới đều có cặp đối xứng (§6, §2 CẤM 7)
- [ ] `npm run whitelabel:selftest` — ĐẠT
- [ ] `npm run whitelabel:status` — báo SẠCH
- [ ] `npm run brand:check` — ĐẠT
- [ ] Không vô hiệu hóa/bỏ qua cổng kiểm tra nào (§2 CẤM 5)
- [ ] Nếu là đồng bộ upstream: đi qua nhánh `sync/upstream-*` và PR (§2 CẤM 6)

Lệnh gộp chạy nhanh cả ba cổng:

```bash
npm run brand:gate
```

---

## §10. Chỉ số Đo lường Hiệu quả

| Chỉ số | Trước quy chế | Sau quy chế |
| :--- | :---: | :---: |
| Rò rỉ thương hiệu trên `main` | 4 điểm hiển thị công khai | 0 (CI chặn) |
| Chuỗi cần whitelabel được quản lý | 8 quy tắc hardcode rải rác | 9 cặp trong 1 tệp config |
| Điểm đã whitelabel toàn suite | ~34 (thủ công, sót) | 127 (tự động, kiểm chứng được) |
| Khả năng về trạng thái upstream sạch | Không có (`restore` là lệnh giả) | Có, kiểm chứng song ánh |
| Cổng kiểm tra CI | Dương tính giả (luôn PASS) | 3 tầng thực chất |
| Phát hiện chuỗi upstream mới | Không có | Tự động (Tầng 2) |
| Bảo vệ khi merge upstream | Không có | `merge=ours` + runbook |

---

## §11. Tài liệu Liên quan

- [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md) — **Quy chế bắt buộc khi tag & release**
- [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) — Báo cáo kiểm toán mã nguồn v0.7.0
- [`DEPLOY_GUIDE.md`](./DEPLOY_GUIDE.md) — Hướng dẫn đóng gói
- [`../CLAUDE.md`](../CLAUDE.md) — Quy tắc tổng cho AI agent
- `whitelabel/brand-config.json` — Nguồn chân lý thương hiệu
