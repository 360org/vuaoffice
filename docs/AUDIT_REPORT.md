# AUDIT_REPORT.md — Mục lục Báo cáo Kiểm toán Mã nguồn

> **Chủ quản**: 360 CORP
> **Tệp này là MỤC LỤC, không phải nội dung kiểm toán.**
> Từng bản kiểm toán nằm trong [`docs/audits/`](./audits/), mỗi bản một tệp riêng theo ngày.

---

## 🔒 Quy tắc bất biến (bắt buộc)

Báo cáo kiểm toán là **ảnh chụp kho mã tại một thời điểm**. Giá trị của nó nằm ở chỗ phản ánh đúng những gì đã thấy **lúc đó**.

> **CẤM sửa, ghi đè, đổi tên hay xoá một bản kiểm toán đã tồn tại.**
> Kiểm toán mới → **tạo tệp mới**: `docs/audits/AUDIT-<YYYY-MM-DD>-<version>.md`

### Vì sao có quy tắc này

Ngày 2026-08-23, một lượt cập nhật đã **ghi đè toàn bộ** tệp này bằng nội dung kiểm toán mới, xoá mất bản kiểm toán v0.7.0 cùng các cập nhật của maintainer ở commit `bf51b87`. Nội dung phải khôi phục lại từ lịch sử git.

Ghi đè làm mất hai thứ không lấy lại được bằng bản mới:

- **Bằng chứng về tình trạng kho mã lúc đó** — không còn đối chiếu được vấn đề nào có từ bao giờ.
- **Dấu vết xử lý của maintainer** — các ghi chú “đã vá”, “đã xác nhận” trên bản cũ biến mất.

### Cơ chế cưỡng chế

Quy tắc này **không dựa vào trí nhớ hay kỷ luật**. Nó được một cổng tự động chặn:

```bash
npm run audit:check
```

Cổng `tools/check-audit-immutable.mjs` sẽ **báo đỏ và chặn** nếu phát hiện:

| Hành vi                                          | Kết quả    |
| :----------------------------------------------- | :--------- |
| Sửa một tệp trong `docs/audits/` đã tồn tại      | ❌ Chặn    |
| Xoá một bản kiểm toán                            | ❌ Chặn    |
| Đổi tên một bản kiểm toán                        | ❌ Chặn    |
| Thêm tệp sai quy ước tên                         | ❌ Chặn    |
| Thêm tệp thiếu banner `<!-- AUDIT-IMMUTABLE -->` | ❌ Chặn    |
| Thêm bản kiểm toán mới đúng quy ước              | ✅ Cho qua |

Cổng chạy trong CI và nằm trong `npm run brand:gate`, nên mọi agent đều gặp nó trước khi commit.

---

## Danh sách bản kiểm toán

Sắp theo thời gian, mới nhất ở trên.

| Ngày       | Phiên bản | Bản ghi                                                             | Tóm tắt                                                                                                                                                                                                                                         |
| :--------- | :-------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-25 | `v1.0.16` | [AUDIT-2026-08-25-v1.0.16.md](./audits/AUDIT-2026-08-25-v1.0.16.md) | Cơ chế bất biến đã đứng vững qua merge upstream + 4 lần phát hành. Cả 3 tồn đọng của v1.0.12 đã vá. Mới: 1 Nghiêm trọng (deep link SSO không xác thực), 3 Cao (mất hỗ trợ `.doc`, đăng nhập lệch giữa các app, `main` đỏ lint khi tag v1.0.16). |
| 2026-08-23 | `v1.0.12` | [AUDIT-2026-08-23-v1.0.12.md](./audits/AUDIT-2026-08-23-v1.0.12.md) | Lớp cưỡng chế whitelabel sống sót qua merge upstream; XSS Mail và namespace font đã vá. Còn 1 Nghiêm trọng (bộ lọc MathML vượt qua được) và 2 Cao (allowlist IPC tự nạp, đường dẫn hỏng trên Windows).                                          |
| 2026-08-16 | `v0.7.0`  | [AUDIT-2026-08-16-v0.7.0.md](./audits/AUDIT-2026-08-16-v0.7.0.md)   | Kiểm toán nền đầu tiên: 2 Nghiêm trọng, 5 Cao, 10 Trung bình. Có cập nhật trạng thái của maintainer tại `bf51b87`.                                                                                                                              |

---

## Cách thực hiện một đợt kiểm toán mới

```bash
# 1. Đồng bộ và cài đặt sạch
git pull origin main && npm ci

# 2. Chạy các cổng để lấy số liệu thật
npm run brand:gate
npm run typecheck
npm run lint
npm test

# 3. Tạo tệp MỚI — không đụng vào bản cũ
#    Đặt tên theo ngày để thư mục tự sắp xếp theo thời gian
touch docs/audits/AUDIT-$(date +%F)-v$(node -p "require('./package.json').version").md

# 4. Thêm banner bất biến ngay sau dòng tiêu đề:
#    <!-- AUDIT-IMMUTABLE -->

# 5. Thêm một dòng vào bảng "Danh sách bản kiểm toán" ở trên

# 6. Cổng phải ĐẠT trước khi commit
npm run audit:check
```

### Yêu cầu về chất lượng nội dung

- **Mọi phát hiện bảo mật phải kèm mã tái hiện chạy được** — không suy đoán.
- **Phân loại rõ test đỏ**: lỗi thật · test cũ · môi trường · có sẵn từ trước. Nêu rõ cái nào chưa xác minh được trên máy khác.
- **Ghi nhận cả phần đã cải thiện**, không chỉ liệt kê lỗi.
- **Nêu rõ mốc kiểm toán**: commit hash và phiên bản, để đối chiếu sau này.

---

## Tài liệu Liên quan

- [`WHITELABEL_STRATEGY.md`](./WHITELABEL_STRATEGY.md) — Quy chế whitelabel & đồng bộ upstream
- [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md) — Bảng kiểm 9 bước khi phát hành
- [`AGENTS.md`](./AGENTS.md) — Quy chuẩn cho AI agent
- [`SECURITY.md`](./SECURITY.md) — Chính sách bảo mật
