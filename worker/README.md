# VuaOffice Feedback Worker

## Triển khai

1. Sao chép `wrangler.toml.example` thành `wrangler.toml` và thay ID namespace KV.
2. Tạo bucket R2 và namespace KV như trong cấu hình.
3. Thêm token GitHub bằng Secret, không đưa token vào repository:

```bash
wrangler secret put GITHUB_TOKEN
```

4. Triển khai từ thư mục này bằng `wrangler deploy`.
5. Trong Cloudflare DNS, chuyển zone `vuaoffice.com` sang **Proxied** (đám mây màu cam). DNS hiện tại đang trỏ thẳng vào GitHub Pages nên Worker route sẽ không được gọi.
6. Cấu hình route Cloudflare `vuaoffice.com/api/feedback*` trỏ vào Worker; kiểm tra cả `OPTIONS` và `POST` đều trả JSON/CORS từ Worker.
7. Bật Issues cho repository và tạo các nhãn `bug` và `enhancement`.

Token chỉ cần quyền tạo Issue trong `360org/vuaoffice`. Tuyệt đối không dán token vào `docs/index.html`.

## Kiểm tra cục bộ

```bash
node --check index.js
```

Biểu mẫu công khai chưa hoạt động cho đến khi route và các Secret/binding của Worker được cấu hình.

## Lưu trữ ảnh

Ảnh được cung cấp qua URL công khai để GitHub Issue có thể hiển thị. Hãy đặt lifecycle rule trên R2 để xoá ảnh cũ và chỉ tải ảnh đã che dữ liệu bí mật.

## Ghi chú an toàn

Worker kiểm tra origin, độ dài nội dung, MIME/signature ảnh, dung lượng, honeypot và giới hạn tần suất qua KV trước khi tạo Issue. Hãy cấu hình binding `FEEDBACK_RATE_LIMIT` khi đưa vào sử dụng thật.

## Route cần cấu hình

Worker phục vụ cả `POST /api/feedback` và `GET /api/feedback/images/<key>`. Cả hai đường dẫn phải trỏ vào Worker để ảnh trong Issue tiếp tục hiển thị.

## Kiểm thử

Dùng `wrangler dev` với binding thử nghiệm hoặc một Worker harness cục bộ. Không gửi POST tới môi trường thật nếu không muốn tạo Issue công khai.

Frontend sử dụng `https://vuaoffice.com/api/feedback`; nếu dùng hostname khác, phải đổi đồng thời route và URL trong `docs/index.html`.
