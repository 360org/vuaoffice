# VuaOffice Feedback Worker

Nhận biểu mẫu góp ý từ `docs/index.html` (trang `vuaoffice.com`) và tạo GitHub
Issue trong `360org/vuaoffice`.

## Triển khai

1. Sao chép `wrangler.toml.example` thành `wrangler.toml` và thay ID namespace KV.
2. Tạo namespace KV `FEEDBACK_RATE_LIMIT` như trong cấu hình.
3. Thêm token GitHub bằng Secret, không đưa token vào repository:

```bash
wrangler secret put GITHUB_TOKEN
```

4. Triển khai từ thư mục này bằng `wrangler deploy`.
5. Bật Issues cho repository và tạo các nhãn `bug` và `enhancement`.

Token cần quyền tạo Issue **và** ghi nội dung (`contents:write`) trong
`360org/vuaoffice` — ảnh đính kèm được commit vào chính repo. Tuyệt đối không
dán token vào `docs/index.html`.

## Điểm cuối (endpoint)

Frontend gọi thẳng địa chỉ `workers.dev`:

```
https://vuaoffice-feedback.shy-hat-1c4f.workers.dev/api/feedback
```

Không dùng `vuaoffice.com/api/feedback`: bản ghi DNS của `vuaoffice.com` trỏ
thẳng vào GitHub Pages ở chế độ **DNS-only**, nên Cloudflare route
`vuaoffice.com/api/*` không bao giờ được gọi. Muốn chuyển sang tên miền riêng
thì phải bật **Proxied** (đám mây cam) trước, rồi đổi đồng thời route Cloudflare
và hằng `endpoint` trong `docs/index.html`.

## Kiểm tra cục bộ

```bash
node --check index.js
```

## Lưu trữ ảnh

Ảnh đính kèm được tải lên qua GitHub contents API vào nhánh `GITHUB_BRANCH`
(mặc định `main`) và nhúng vào Issue bằng liên kết `raw.githubusercontent.com`.
Ảnh nằm vĩnh viễn trong lịch sử Git — chỉ nhận ảnh đã che dữ liệu bí mật.

`GET /api/feedback/images/<key>` là đường đọc cũ qua R2, giữ lại để ảnh của các
Issue tạo trước đây không hỏng liên kết. Bỏ binding `FEEDBACK_IMAGES` thì đường
này trả 404, đường tạo Issue mới vẫn chạy bình thường.

## Ghi chú an toàn

Worker kiểm tra origin, độ dài nội dung, MIME/signature ảnh, dung lượng,
honeypot và giới hạn tần suất qua KV trước khi tạo Issue. Hãy cấu hình binding
`FEEDBACK_RATE_LIMIT` khi đưa vào sử dụng thật.

## Kiểm thử

Dùng `wrangler dev` với binding thử nghiệm hoặc một Worker harness cục bộ.
Không gửi POST tới môi trường thật nếu không muốn tạo Issue công khai.
