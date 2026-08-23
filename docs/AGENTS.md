# AGENTS.md — Quy chuẩn Tác tử AI & Lập trình trong VuaOffice

> **Tài liệu Hướng dẫn Dành cho AI Agents & Các Kỹ sư Tham gia Phát triển**  
> **Chủ quản**: 360 CORP  
> **Phiên bản**: v1.0.0+

---

## 1. Quy chuẩn Hệ thống Giao diện & Semantic Theme Tokens (Bắt buộc)

VuaOffice hỗ trợ 3 chế độ giao diện: **Light (Sáng)**, **Dark (Tối)**, và **System (Theo hệ điều hành)**. Cơ chế chuyển đổi theme sử dụng thuộc tính `data-theme` trên thẻ `<html>` và hệ thống biến CSS Custom Properties tại `packages/ui/src/tokens.css`.

### 1.1 Nguyên tắc Màu sắc Giao diện (UI Chrome Colors)
- **Tuyệt đối không dùng mã màu thô (`#hex`, `rgb()`, `hsl()`)** trong các file CSS của Renderer hoặc các inline styles của UI Chrome.
- **Bắt buộc tham chiếu các Semantic Tokens** từ `packages/ui/src/tokens.css`:
  - Bề mặt: `var(--surface)`, `var(--surface-subtle)`, `var(--bg-hover)`, `var(--border)`, `var(--border-subtle)`
  - Văn bản: `var(--text)`, `var(--text-primary)`, `var(--text-muted)`, `var(--text-disabled)`
  - Điểm nhấn: `var(--accent)`, `var(--accent-hover)`, `var(--accent-soft)`
- CI sẽ tự động kiểm tra và chặn commit nếu phát hiện mã màu thô (`tools/check-theme-colors.mjs`).

### 1.2 Nguyên tắc "Dark Chrome, White Paper" (Bảo toàn Dữ liệu Tài liệu)
- **Nội dung tài liệu KHÔNG BAO GIỜ đổi màu theo Theme hệ thống**:
  - Trang giấy soạn thảo Docs, các ô tính Sheets, bề mặt Slide trình chiếu, trang bitmap PDF, sơ đồ biểu đồ xuất bản, con dấu và WordArt là **dữ liệu tài liệu**.
  - Dữ liệu này phải giữ nguyên định dạng màu sắc tiêu chuẩn để hiển thị, in ấn và xuất bản ra ngoài đồng nhất 100% giữa các máy tính (giống như Microsoft Office: thanh công cụ tối, trang giấy trắng).

### 1.3 Canvas Chrome & Konva Constants Table
- Các thành phần điều khiển vẽ trên Canvas (khung chọn selection frames, thước căn guides, điểm neo handles) phải đọc từ bảng hằng số màu (`canvas-colors.ts`) dựa trên theme hiện tại, không viết cứng mã hex trong lệnh `ctx.draw()`.

---

## 2. Lưu ý Kỹ thuật khi Xây dựng & Biên dịch (Build Gotchas)

1. **Tiến trình Main Process của các App con (`apps/*/src/main`)**:
   - Mã nguồn main của các app con được đóng gói chung vào bản build của **Shell** (`apps/shell`).
   - Sau khi chỉnh sửa bất kỳ logic nào trong `apps/*/src/main`, **bắt buộc phải rebuild Shell** (`npm run build:shell` hoặc `npm run dev`) để thay đổi có hiệu lực.
2. **Preload Scripts trong Môi trường Phát triển (Dev Mode)**:
   - Thay đổi trong các file `preload.ts` đòi hỏi phải rebuild preload, nếu không trang Renderer sẽ bị trắng (blank screen).
3. **Phân phối Workspace Packages**:
   - Mọi workspace package nội bộ được khai báo trong `dependencies` của một app con phải được đưa vào danh sách `exclude` của `externalizeDepsPlugin`, nếu không ứng dụng đóng gói sẽ bị crash khi khởi động.
4. **Hệ thống Đa ngôn ngữ `useI18n()`**:
   - Hàm `t` trả về từ `useI18n()` không có tính ổn định tham chiếu (referentially stable). **Tuyệt đối không đưa `t` vào dependency array của `useEffect` hoặc `useCallback`**. Lưu key dịch và gọi `t(key)` tại thời điểm render.

---

## 3. Quy chuẩn Whitelabel (Bắt buộc)

> 📕 **Quy chế đầy đủ, BẮT BUỘC đọc trước khi chạm vào bất kỳ chuỗi thương hiệu nào:
> [`WHITELABEL_STRATEGY.md`](./WHITELABEL_STRATEGY.md)**
> Phần dưới chỉ là bản rút gọn. Khi có mâu thuẫn, tài liệu quy chế là chuẩn.

VuaOffice là bản phái sinh whitelabel của dự án mã nguồn mở `genspark-ai/genoffice`.

> **Thương hiệu là DỮ LIỆU CẤU HÌNH, không phải mã nguồn.**
> Mọi thay đổi thương hiệu đi qua `whitelabel/brand-config.json`. Không có ngoại lệ.

1. **KHÔNG hardcode chuỗi thương hiệu vào mã nguồn.** Không sửa tay
   `'GenOffice Docs'` → `'VuaOffice Docs'` trong `.ts`/`.tsx`/`.html`. Thay vào đó
   thêm cặp vào `replacements` của `brand-config.json` rồi chạy `npm run whitelabel:apply`.
2. **`whitelabel/brand-config.json` là nguồn chân lý DUY NHẤT.** Cấm hardcode quy tắc
   thương hiệu trong `scripts/whitelabel.js`, `tools/check-brand.mjs` hay bất kỳ đâu khác.
3. **KHÔNG đổi tên định danh kỹ thuật**: `@genoffice/*` (299 tệp import), alias font
   (`GenOffice Sans KR`…), tên tệp font trên đĩa, khóa từ điển PDF (`GenOfficeFormField`),
   thư mục `~/.genoffice`. Xem quy chế §5 để biết quy mô thiệt hại.
4. **KHÔNG sửa ghi công giấy phép** (`Copyright`, `Original Work`, `licenseNotice`) —
   nghĩa vụ pháp lý theo Apache License 2.0 §4. ⚖️
5. **Quy luật phân biệt nhanh**: `GenOffice` **liền chữ** = định danh kỹ thuật (miễn trừ)
   · `GenOffice` **có dấu cách/dấu câu ngay sau** = chữ hiển thị (phải whitelabel).
   Chú thích mã nguồn luôn được miễn trừ.
6. **Genspark là nhà cung cấp AI hợp lệ.** `Sign in to Genspark`, `genspark.ai/pricing`
   nói về **dịch vụ có thật** — đổi thành "VuaOffice" là nói dối người dùng.
7. **Luật song ánh**: `apply(restore(apply(x))) === apply(x)`. Mọi mẫu `protected` chặn
   một chiều PHẢI có cặp đối xứng, nếu không một chu kỳ `restore→apply` sẽ **hỏng vĩnh
   viễn mã nguồn** một cách im lặng. Sau mọi thay đổi config: `npm run whitelabel:selftest`.
8. **Đồng bộ upstream**: chạy `npm run upstream:setup` một lần trên mỗi máy (Git KHÔNG tự
   kích hoạt merge driver `ours` khi clone — thiếu bước này thì `.gitattributes` im lặng
   vô tác dụng). Luôn merge qua nhánh `sync/upstream-YYYYMMDD` + Pull Request,
   **CẤM merge thẳng vào `main`**.

### 3.1 Bảng lệnh whitelabel

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run whitelabel:apply` | upstream → VuaOffice |
| `npm run whitelabel:restore` | VuaOffice → upstream (chạy TRƯỚC khi merge upstream) |
| `npm run whitelabel:status` | Báo cáo, không ghi tệp, exit 1 nếu chưa sạch |
| `npm run whitelabel:selftest` | Kiểm chứng luật song ánh |
| `npm run brand:check` | Cổng phát hiện rò rỉ (2 tầng) |
| `npm run audit:check` | Chặn sửa/xoá/đổi tên bản ghi kiểm toán |
| `npm run brand:gate` | **Gộp cả bốn cổng — chạy trước mọi commit** |
| `npm run upstream:setup` | Cấu hình remote upstream + merge driver |

### 3.2 Bảo toàn tính toàn vẹn thương hiệu

- **Logo Sidebar**: `whitelabel/Logo/vuaoffice-logo.svg` (lockup) và
  `whitelabel/Logo/vuaoffice-icon.svg` (icon 28x28px). Đây là **thư mục `Logo` chữ L hoa** —
  chính là nguồn mà `brand-config.json` sao chép vào `apps/shell/src/renderer/src/assets/`
  và là tệp app thực sự import. Thư mục `whitelabel/logo/` (chữ thường) **không được mã
  nguồn nào tham chiếu**; sửa tệp trong đó sẽ không có tác dụng gì.
- **Ribbon & AI Panel**: bắt buộc "VuaOffice AI", không còn chữ/icon Genspark cũ.
  Cổng `npm run brand:check` sẽ chặn nếu rò rỉ.


### 3.3 🔒 Bản ghi kiểm toán là BẤT BIẾN

Báo cáo kiểm toán là **ảnh chụp kho mã tại một thời điểm**. Giá trị của nó nằm ở
chỗ phản ánh đúng những gì đã thấy **lúc đó**.

> **CẤM sửa, ghi đè, đổi tên hay xoá một bản kiểm toán đã tồn tại trong `docs/audits/`.**
> Kiểm toán mới → **tạo tệp mới** `docs/audits/AUDIT-<YYYY-MM-DD>-<version>.md`,
> kèm banner `<!-- AUDIT-IMMUTABLE -->` ngay sau tiêu đề, rồi thêm một dòng vào
> bảng mục lục trong `docs/AUDIT_REPORT.md`.

Lỗi này **đã xảy ra thật**: một lượt cập nhật ghi đè `AUDIT_REPORT.md` bằng nội
dung kiểm toán mới, xoá mất bản v0.7.0 cùng các ghi chú "đã vá" của maintainer —
phải khôi phục từ lịch sử git.

Quy tắc không dựa vào trí nhớ: `npm run audit:check` (nằm trong `brand:gate` và
CI) sẽ **chặn** mọi lượt sửa, xoá, đổi tên, sai quy ước tên, hay thiếu banner.

---

## 4. ⛔ RÀNG BUỘC BẮT BUỘC TRƯỚC KHI BUILD / PHÁT HÀNH

> 📕 **Quy chế đầy đủ: [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md)** — bảng kiểm 9 bước,
> 6 điều cấm và mẫu báo cáo bắt buộc nằm ở đó.

### 4.1 Điều kiện kích hoạt

1. **Tuyệt đối KHÔNG tự động build khi commit/push lên `main`.** Mọi commit đẩy lên `main`
   chỉ để lưu lịch sử mã nguồn. CI/Build runner KHÔNG được tự chạy trừ khi Sếp yêu cầu trực tiếp.
2. **🛑 Release CHỈ thực hiện khi Sếp yêu cầu trực tiếp và rõ ràng**
   (VD: *"tag & release"*, *"release cho anh version 0.7.1"*).
   **KHÔNG** phải lệnh phát hành: vừa xong tính năng · CI đang xanh · commit đã lên `main` ·
   *"chuẩn bị bản mới"*. Không chắc chắn → **HỎI LẠI**, không tự chạy.

### 4.2 Hai cổng bắt buộc phải ĐẠT trước khi bump version

Chạy tuần tự, **cấm bỏ bước, cấm bỏ qua khi báo đỏ**:

```bash
npm run brand:gate     # selftest + status + check-brand + audit:check
npm run lint
npm run typecheck
npm test
```

- `brand:gate` đỏ → **DỪNG**, xử lý theo `WHITELABEL_STRATEGY.md §8`.
- Cấm vô hiệu hóa cổng, cấm thêm `continue-on-error`, cấm `--no-verify`.

### 4.3 Bảng kiểm 9 bước (chi tiết: `RELEASE_PROTOCOL.md §1`)

Xác nhận quyền → nhánh sạch → **cổng thương hiệu** → cổng chất lượng → bump version đồng bộ
ở CẢ `package.json` VÀ `apps/shell/package.json` → commit → tag & push → **theo dõi build tới
khi xong** → xác minh tên artifact. **Phải báo cáo kết quả từng bước cho Sếp.**

> ⚠️ Workflow `release.yml` xác thực tag khớp **chính xác** `apps/shell/package.json`.
> Lệch nhau là build hỏng ngay job đầu tiên.

### 4.4 Quy chuẩn đặt tên tệp release

Nguồn chân lý là `artifactName` trong `apps/shell/electron-builder.cjs`; bảng đầy đủ
ở [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md) §2.

- macOS: `VuaOffice-${version}-macOS-arm64.dmg` / `-macOS-x64.dmg` (kèm `.zip`)
- Windows: `VuaOffice-${version}-Windows-x64-Setup.exe` / `-Windows-ia32-Setup.exe`
  (và bản gộp `-Windows-Setup.exe`)
- Linux: `VuaOffice-${version}.AppImage` / `vuaoffice_${version}_amd64.deb`
  / `vuaoffice-${version}.x86_64.rpm`

### 4.5 Cấm tag lại cùng một số phiên bản

Build hỏng → sửa lỗi, bump số **mới**, tag mới. Người dùng có thể đã tải bản cũ.

---

## 5. Hạ tầng AI Settings & Developer Mode

- **Chế độ Tiêu chuẩn (Normal Mode)**: Kết nối qua Gateway **OmiRouter**
  (`https://api.omirouter.com/v1`) hoặc **9Router** (`https://api.9router.com/v1`).
- **Chế độ Nhà phát triển (Developer Mode)**: Bật/tắt qua
  `Help > Troubleshooting > Enable Developer Mode`, hỗ trợ Custom Endpoints và
  **Hermes Agent** (`https://hermes.vuahethong.com/v1`).

---

**Chủ quản**: 360 CORP  
**Trạng thái**: Đã phê duyệt (Approved)  
**Ngày cập nhật**: 2026-08-17
