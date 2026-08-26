# CLAUDE.md

Guidance for AI agents and human contributors working in this repo.

## Theming rules (mandatory)

The suite supports light / dark / system UI themes. The switching mechanism is a
`data-theme` attribute on `<html>` plus CSS custom properties defined once in
`packages/ui/src/tokens.css` (light defaults in `:root`, overrides in
`[data-theme='dark']`, and a `prefers-color-scheme` media-query fallback for
system mode).

1. **UI chrome colors must use semantic tokens.** Never write raw `#hex` /
   `rgb()` in renderer CSS rules or chrome-related inline styles — reference
   `var(--surface)`, `var(--text)`, `var(--hover)`, etc. from
   `packages/ui/src/tokens.css`. Raw values are allowed only on custom-property
   definition lines (`--x: #...;` — token, accent, or app-scoped variable
   definitions). CI enforces this for new/changed renderer CSS lines
   (`tools/check-theme-colors.mjs`).
2. **Every new token gets both values.** Adding a token means adding it to all
   three blocks in `tokens.css` (light, dark, system-dark fallback).
3. **Accent colors stay per-app.** Each app defines `--accent` /
   `--accent-dark` / `--accent-soft` (and its dark-adjusted values) in its own
   `styles.css`. Shared rules reference `var(--accent)` and inherit the app's
   brand color.
4. **Document content never follows the theme.** Page surfaces, cell fills,
   slide content, PDF page bitmaps, export/print stylesheets, chart palettes,
   highlight color maps, stamps, and WordArt presets are document data: they
   stay hardcoded, must not reference chrome tokens, and must render/export
   identically in both themes. (Word-style "dark chrome, white paper".)
5. **Canvas-drawn UI affordances go through a constants table.** Konva/canvas
   editing chrome (selection frames, guides, handles) reads from the app's
   canvas color table (e.g. `canvas-colors.ts`) keyed by the current theme —
   no inline hex in draw calls.

## Build gotchas

- App main-process code (`apps/*/src/main`) is compiled into the **shell**
  build. After changing it, rebuild the shell or the change silently does not
  run.
- In dev mode, preload changes require a rebuild — a stale preload leaves the
  renderer blank.
- Workspace packages listed in an app's `dependencies` must also be added to
  the `externalizeDepsPlugin` `exclude` list, or the packaged app crashes on
  launch.
- `useI18n()`'s `t` is not referentially stable; never put it in a hook
  dependency array. Store the key and translate at render time.
## 360 Brand & Whitelabel Rules (mandatory)

> 📕 **Quy chế đầy đủ, bắt buộc đọc: [`docs/360_BRAND_STRATEGY.md`](docs/360_BRAND_STRATEGY.md)**
> Phần dưới chỉ là bản rút gọn. Khi có mâu thuẫn, tài liệu quy chế là chuẩn.

VuaOffice là bản phái sinh whitelabel của dự án mã nguồn mở `genspark-ai/genoffice`.
Nguyên tắc nền tảng:

> **Thương hiệu là DỮ LIỆU CẤU HÌNH, không phải mã nguồn.**
> Mọi thay đổi thương hiệu đi qua `360/brand-config.json`. Không có ngoại lệ.

1. **KHÔNG hardcode chuỗi thương hiệu vào mã nguồn.** Không sửa tay
   `'GenOffice Docs'` → `'VuaOffice Docs'` trong `.ts`/`.tsx`/`.html`. Thay vào
   đó thêm cặp vào `replacements` trong `brand-config.json` rồi chạy
   `npm run brand:apply`.
2. **`360/brand-config.json` là nguồn chân lý DUY NHẤT.** Cấm hardcode
   quy tắc thương hiệu trong `scripts/360-brand.js`, `tools/check-brand.mjs`
   hay bất kỳ đâu khác. (Đây chính là khiếm khuyết đã giết chết cơ chế cũ.)
3. **KHÔNG đổi tên định danh kỹ thuật.** `@genoffice/*` (299 tệp import), alias
   font (`GenOffice Sans KR`…), tên tệp font trên đĩa, khóa từ điển PDF
   (`GenOfficeFormField`), thư mục `~/.genoffice`. Đổi chúng gây thiệt hại lớn
   hơn nhiều so với lợi ích thương hiệu — xem quy chế §5.
4. **KHÔNG sửa ghi công giấy phép.** Chuỗi `Copyright`, `Original Work`,
   `licenseNotice` là nghĩa vụ pháp lý theo Apache License 2.0 §4. ⚖️
5. **Quy luật phân biệt nhanh**: `GenOffice` **liền chữ** = định danh kỹ thuật
   (miễn trừ) · `GenOffice` **có dấu cách/dấu câu ngay sau** = chữ hiển thị
   (phải whitelabel). Chú thích mã nguồn luôn được miễn trừ.
6. **Genspark là nhà cung cấp AI hợp lệ.** Các chuỗi như `Sign in to Genspark`,
   `genspark.ai/pricing` nói về **dịch vụ có thật** — đổi thành "VuaOffice" là
   nói dối người dùng. Chỉ whitelabel chỗ sản phẩm **tự xưng** sai thương hiệu.
7. **Luật song ánh**: `apply(restore(apply(x))) === apply(x)`. Mọi mẫu
   `protected` chặn một chiều PHẢI có cặp đối xứng. Sau mọi thay đổi config,
   bắt buộc chạy `npm run brand:selftest`.
8. **Trước mọi commit**: `npm run brand:gate` phải ĐẠT (selftest + status +
   check-brand + audit:check). Cấm vô hiệu hóa cổng, cấm `continue-on-error`,
   cấm `--no-verify`.
8b. **Bản ghi kiểm toán BẤT BIẾN**: cấm sửa/ghi đè/xoá tệp trong `docs/audits/`.
   Kiểm toán mới → tạo tệp mới `AUDIT-<YYYY-MM-DD>-<version>.md` kèm banner
   `<!-- AUDIT-IMMUTABLE -->`. Cổng `audit:check` sẽ chặn nếu vi phạm.
9. **Đồng bộ upstream**: chạy `npm run upstream:setup` một lần mỗi máy (Git
   KHÔNG tự kích hoạt merge driver `ours` khi clone — thiếu bước này thì
   `.gitattributes` im lặng vô tác dụng). Luôn merge qua nhánh
   `sync/upstream-YYYYMMDD` + Pull Request, **cấm merge thẳng vào `main`**.
   Quy trình đầy đủ: quy chế §7.
10. **Branding assets**: Nguồn logo là `360/Logo/` (**chữ `L` hoa**) — đây là
    thư mục `brand-config.json` sao chép vào `apps/shell/src/renderer/src/assets/` và
    là tệp app thực sự import: `vuaoffice-logo.svg` (lockup, dùng ở Home) và
    `vuaoffice-icon.svg` (icon 28x28px, dùng ở Onboarding). Thư mục
    `360/logo/` chữ thường **không được mã nguồn nào tham chiếu** — sửa tệp
    trong đó không có tác dụng gì.

### Lệnh thương hiệu 360

| Lệnh | Tác dụng |
| :--- | :--- |
| `npm run brand:apply` (alias: `whitelabel:apply`) | upstream → VuaOffice |
| `npm run brand:restore` (alias: `whitelabel:restore`) | VuaOffice → upstream (trước khi merge) |
| `npm run brand:status` (alias: `whitelabel:status`) | Báo cáo, không ghi tệp, exit 1 nếu chưa sạch |
| `npm run brand:selftest` (alias: `whitelabel:selftest`) | Kiểm chứng luật song ánh |
| `npm run brand:check` | Cổng phát hiện rò rỉ (2 tầng) |
| `npm run audit:check` | Chặn sửa/xoá/đổi tên bản ghi kiểm toán |
| `npm run brand:gate` | Gộp cả bốn cổng — chạy trước mọi commit |
| `npm run upstream:setup` | Cấu hình remote upstream + merge driver |

## Release Rules (mandatory)

> 📕 **Quy chế đầy đủ, bắt buộc đọc: [`docs/RELEASE_PROTOCOL.md`](docs/RELEASE_PROTOCOL.md)**
> Bảng kiểm 9 bước, mẫu báo cáo và danh sách điều cấm nằm trong tài liệu đó.

1. **Tuyệt đối KHÔNG tự động build khi commit/push lên `main`**: Mọi commit đẩy
   lên `main` chỉ để lưu lịch sử mã nguồn. CI/Build runner tuyệt đối KHÔNG được
   phép tự động chạy trừ khi Sếp yêu cầu trực tiếp.
2. **🛑 Release CHỈ thực hiện khi Sếp yêu cầu trực tiếp và rõ ràng** (VD: *"tag &
   release"*, *"release cho anh version 0.7.1"*). Việc vừa xong tính năng, CI
   đang xanh, hay commit đã lên `main` **KHÔNG** phải là lệnh phát hành. Không
   chắc chắn → **HỎI LẠI**, không tự chạy.
3. **Bảng kiểm 9 bước bắt buộc, không được bỏ bước** (chi tiết: quy chế §1):
   xác nhận quyền → nhánh sạch → **cổng thương hiệu** → cổng chất lượng
   (lint/typecheck/test) → bump version đồng bộ → commit → tag & push → theo dõi
   build tới khi xong → xác minh tên artifact. Phải báo cáo kết quả từng bước.
4. **Synchronized version bumping**: Luôn bump version ở CẢ `package.json` VÀ
   `apps/shell/package.json`. Workflow xác thực tag khớp chính xác
   `apps/shell/package.json`; lệch nhau là build hỏng ngay job đầu.
5. **Release artifact naming**: Tên tệp phải nêu rõ nền tảng và kiến trúc:
   Nguồn chân lý là các khóa `artifactName` trong `apps/shell/electron-builder.cjs`;
   bảng đầy đủ và ghi chú ở `docs/RELEASE_PROTOCOL.md` §2.
   - macOS: `VuaOffice-${version}-macOS-arm64.dmg` / `-macOS-x64.dmg` (kèm `.zip`)
   - Windows: `VuaOffice-${version}-Windows-x64-Setup.exe` / `-Windows-ia32-Setup.exe`
     (và bản gộp `-Windows-Setup.exe`)
   - Linux: `VuaOffice-${version}.AppImage` / `vuaoffice_${version}_amd64.deb`
     / `vuaoffice-${version}.x86_64.rpm`
6. **Dual-remote Git push**: Đẩy commit và tag lên cả `origin` và `github` nếu
   kho mã cấu hình đa remote. Không dùng `--no-verify` để bỏ qua
   `.git/hooks/pre-push` trừ khi đang thực hiện luồng publish được ủy quyền.
7. **Cấm tag lại cùng một số phiên bản.** Build hỏng → sửa lỗi, bump số mới, tag
   mới. Người dùng có thể đã tải bản cũ.

## AI Settings & Provider Modes

- Normal Mode: Kết nối trực tiếp qua 360 CORP Gateway (`vuahethong.net` / `OmiRouter`).
- Developer Mode: Hỗ trợ chọn đa endpoint, gồm Hermes Agent (`https://hermes.vuahethong.com/v1`).
