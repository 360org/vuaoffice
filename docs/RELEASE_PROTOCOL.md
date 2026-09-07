# RELEASE_PROTOCOL.md — Quy chế Bắt buộc khi Tag & Release

> **LOẠI TÀI LIỆU: QUY CHẾ BẮT BUỘC (MANDATORY POLICY) — KHÔNG PHẢI KHUYẾN NGHỊ**
> **Chủ quản**: 360 CORP
> **Đối tượng áp dụng**: MỌI AI agent và MỌI lập trình viên thực hiện phát hành
> **Tài liệu bắt buộc đọc kèm**: [`WHITELABEL_STRATEGY.md`](./WHITELABEL_STRATEGY.md)

---

## §0. QUY TẮC SỐ MỘT — ĐIỀU KIỆN KÍCH HOẠT

> ## 🛑 AGENT KHÔNG BAO GIỜ ĐƯỢC TỰ Ý PHÁT HÀNH
>
> Quy trình release **CHỈ** được bắt đầu khi Sếp yêu cầu **trực tiếp và rõ ràng**.

**Câu lệnh hợp lệ để kích hoạt** (ví dụ):
- *"tag & release"*
- *"release cho anh version 0.7.1"*
- *"tạo release v0.7.1"*
- *"build bản phát hành"*

**KHÔNG phải là lệnh kích hoạt** — tuyệt đối không được tự suy diễn:
- ❌ *"code xong rồi đấy"* / *"merge vào main đi"*
- ❌ *"chuẩn bị cho bản mới"* / *"bump version lên"*
- ❌ Việc vừa hoàn thành một tính năng
- ❌ Việc CI đang xanh
- ❌ Suy luận rằng "chắc Sếp muốn release"

**Nếu không chắc chắn → HỎI LẠI, không được tự chạy.**

Đẩy commit lên `main` **chỉ để lưu lịch sử mã nguồn**. Việc đó **không bao giờ** kéo theo build. Workflow `ci.yml` chỉ chạy thủ công; `release.yml` chỉ chạy khi có tag `v*`.

---

## §1. Bảng Kiểm Bắt buộc — 9 Bước, Không Được Bỏ Bước

Agent **phải** thực hiện tuần tự và **phải báo cáo kết quả từng bước** cho Sếp. Cấm gộp bước, cấm bỏ qua bước vì "chắc là ổn".

### ☑️ Bước 1 — Xác nhận quyền phát hành

Xác nhận Sếp đã yêu cầu rõ ràng (§0) và **số phiên bản cụ thể**. Nếu Sếp không nêu số phiên bản → hỏi lại, không tự chọn.

### ☑️ Bước 2 — Xác nhận nhánh và trạng thái sạch

```bash
git branch --show-current     # phải là main
git status --porcelain        # phải rỗng
git pull origin main
```

Cấm phát hành từ nhánh khác. Cấm phát hành khi còn thay đổi chưa commit.

### ☑️ Bước 3 — CỔNG THƯƠNG HIỆU (bắt buộc, không được bỏ)

```bash
npm run brand:gate
```

Gồm ba tầng: `selftest` (luật song ánh) + `status` (đã apply đầy đủ) + `check-brand` (không rò rỉ).

> 🚫 Cổng này báo đỏ → **DỪNG PHÁT HÀNH**. Xử lý theo `WHITELABEL_STRATEGY.md §8`, tuyệt đối không bỏ qua.

### ☑️ Bước 4 — Cổng chất lượng mã

```bash
npm run lint
npm run typecheck
npm test
```

Cả ba phải đạt. Cấm phát hành khi có bài kiểm thử đỏ.

### ☑️ Bước 5 — Bump version ĐỒNG BỘ & Cập nhật Website Docs

```bash
# 1. BẮT BUỘC cả hai, cùng một số phiên bản
package.json              → "version": "0.7.1"
apps/shell/package.json   → "version": "0.7.1"

# 2. Cập nhật tính năng mới hướng người dùng vào docs/updates.json (không viết thuật ngữ kỹ thuật)
# 3. Chạy lệnh tự động đồng bộ lên giao diện website và sitemap:
npm run site:sync
```

> ⚠️ Workflow `release.yml` **xác thực tag khớp chính xác `apps/shell/package.json`**. Lệch nhau → build thất bại ở job đầu tiên.

Xác minh:
```bash
node -p "require('./package.json').version"
node -p "require('./apps/shell/package.json').version"
# Hai giá trị phải GIỐNG HỆT nhau
```

### ☑️ Bước 6 — Commit thay đổi version

```bash
git add package.json apps/shell/package.json
git commit -m "chore(release): bump version to v0.7.1"
git push -u origin main
```

Theo đúng quy ước commit của kho mã (`Authored-By: 360org <support@360.org.vn>`).

### ☑️ Bước 7 — Tạo và đẩy tag

```bash
git tag v0.7.1
git push origin v0.7.1
```

Nếu kho mã có cấu hình đa remote (`origin` GitLab + `github` GitHub) thì đẩy tag lên **cả hai**.

> 🚫 Cấm dùng `--no-verify` để bỏ qua `.git/hooks/pre-push`, trừ khi đang thực hiện đúng luồng publish được ủy quyền.

### ☑️ Bước 8 — Theo dõi build cho tới khi kết thúc

Tag `v*` kích hoạt `release.yml` với 6 job build song song. Agent **phải theo dõi tới khi có kết quả**, không được đẩy tag rồi bỏ đó.

Nếu build đỏ → báo cáo Sếp kèm log lỗi cụ thể. Cấm im lặng.

### ☑️ Bước 9 — Xác minh tên tệp artifact

Kiểm tra artifact phát hành đúng quy ước đặt tên (§2). Sai tên → người dùng tải nhầm bản.

---

## §2. Quy ước Tên Artifact — Bắt buộc

> **Nguồn chân lý DUY NHẤT của tên tệp là `apps/shell/electron-builder.cjs`**
> (các khóa `artifactName`). Bảng dưới là ảnh chụp đúng những gì cấu hình đó
> sinh ra — đã đối chiếu với tài sản thực tế của bản phát hành v0.7.0 và v1.0.0.
> Bước 9 xác minh tên tệp **so với bảng này**; muốn đổi tên thì sửa
> `electron-builder.cjs` trước, rồi cập nhật bảng.

| Nền tảng | Tên tệp thực tế |
| :--- | :--- |
| macOS Apple Silicon | `VuaOffice-${version}-macOS-arm64.dmg` / `.zip` |
| macOS Intel | `VuaOffice-${version}-macOS-x64.dmg` / `.zip` |
| Windows 64-bit | `VuaOffice-${version}-Windows-x64-Setup.exe` |
| Windows 32-bit | `VuaOffice-${version}-Windows-ia32-Setup.exe` |
| Windows gộp 2 kiến trúc | `VuaOffice-${version}-Windows-Setup.exe` |
| Linux AppImage | `VuaOffice-${version}.AppImage` |
| Linux deb | `vuaoffice_${version}_amd64.deb` |
| Linux rpm | `vuaoffice-${version}.x86_64.rpm` |

> ⚠️ **Lưu ý cho người rà soát**: bảng này từng ghi `macOS-Apple-Silicon`,
> `macOS-Intel`, `Windows-x86` — những tên **chưa bao giờ được build sinh ra**.
> Sai lệch đó biến Bước 9 thành bước luôn-luôn-trượt, và hệ quả là nó bị bỏ qua.
> Nếu Sếp muốn dùng bộ tên thân thiện hơn (`Apple-Silicon` / `Intel` / `x86`),
> đó là thay đổi **một dòng** trong `electron-builder.cjs` cho mỗi nền tảng —
> nhưng phải là quyết định có chủ đích, vì nó đổi tên tệp người dùng tải về và
> mọi liên kết trỏ tới bản phát hành cũ.
>
> Riêng `VuaOffice-${version}-Windows-Setup.exe` (bản gộp, ~249 MB) không nêu
> kiến trúc. Người dùng Windows nhìn thấy **ba** tệp `.exe` cùng lúc — đây là
> điểm dễ gây nhầm lẫn, nên cân nhắc bỏ bản gộp hoặc đặt tên rõ hơn.

---

## §3. Những Điều CẤM trong Quy trình Phát hành

### 🚫 CẤM 1 — Tự ý phát hành
Xem §0. Không có lệnh trực tiếp của Sếp thì không phát hành.

### 🚫 CẤM 2 — Bỏ qua cổng kiểm tra
Cấm bỏ Bước 3 và Bước 4. Cấm thêm `continue-on-error`. Cấm dùng `--no-verify`.

### 🚫 CẤM 3 — Bump version lệch giữa hai tệp
`package.json` và `apps/shell/package.json` phải luôn cùng số. Workflow sẽ chặn, nhưng agent không được để lỗi này xảy ra ngay từ đầu.

### 🚫 CẤM 4 — Phát hành khi cổng thương hiệu báo đỏ
Rò rỉ thương hiệu lọt vào bản phát hành là lỗi nghiêm trọng nhất của sản phẩm whitelabel — người dùng cuối nhìn thấy tên thương hiệu của dự án gốc.

### 🚫 CẤM 5 — Tạo tag rồi bỏ mặc
Đẩy tag là hành động khó đảo ngược, kích hoạt build và tạo bản phát hành công khai. Phải theo dõi tới khi có kết quả (Bước 8).

### 🚫 CẤM 6 — Tag lại cùng một số phiên bản
Nếu build hỏng: sửa lỗi, bump lên số **mới**, tag mới. Cấm xóa tag đã đẩy rồi tạo lại cùng số — người dùng có thể đã tải bản cũ.

---

## §4. Mẫu Báo cáo Bắt buộc gửi Sếp

Sau khi hoàn tất, agent phải báo cáo theo đúng khung sau:

```
PHÁT HÀNH v0.7.1

Bước 1 Xác nhận quyền        ✅ Sếp yêu cầu: "..."
Bước 2 Nhánh & trạng thái     ✅ main, working tree sạch
Bước 3 Cổng thương hiệu       ✅ selftest + status + check-brand ĐẠT
Bước 4 Cổng chất lượng        ✅ lint / typecheck / test ĐẠT
Bước 5 Bump version           ✅ package.json + apps/shell/package.json = 0.7.1
Bước 6 Commit                 ✅ <hash>
Bước 7 Tag & push             ✅ v0.7.1 -> origin
Bước 8 Build                  ✅ 6/6 job thành công
Bước 9 Tên artifact           ✅ đúng quy ước

Liên kết bản phát hành: <url>
```

Bất kỳ bước nào **không đạt** → ghi ❌ kèm nguyên nhân cụ thể và **dừng lại chờ chỉ đạo**.

---

## §5. Tài liệu Liên quan

- [`WHITELABEL_STRATEGY.md`](./WHITELABEL_STRATEGY.md) — **Quy chế whitelabel & đồng bộ upstream**
- [`DEPLOY_GUIDE.md`](./DEPLOY_GUIDE.md) — Chi tiết kỹ thuật đóng gói
- [`CHANGELOGS.md`](./CHANGELOGS.md) — Nhật ký phát hành
- [`../CLAUDE.md`](../CLAUDE.md) — Quy tắc tổng cho AI agent
