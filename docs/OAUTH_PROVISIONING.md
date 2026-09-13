# Đăng ký OAuth Client cho VuaOffice Mail

> Tài liệu vận hành: các bước xin cấp OAuth Client ID chính chủ của 360 CORP cho
> Google Workspace / Gmail và Microsoft 365 / Outlook.com.

## 0. Vì sao bắt buộc làm việc này

Mã nguồn hiện đang dùng Client ID công khai của **Mozilla Thunderbird**:

| Nhà cung cấp | Client ID đang dùng | Chủ sở hữu thật |
| :--- | :--- | :--- |
| Google | `406964657835-aq8lmia8j95dhl1a2bvharmfk3t1hgqj.apps.googleusercontent.com` | Mozilla Thunderbird |
| Microsoft | `08162f7c-0fd2-4200-a50d-d4508ec32e36` | Mozilla Thunderbird |

Hậu quả nếu giữ nguyên:

1. **Màn hình đồng ý hiện tên "Thunderbird"**, không phải VuaOffice — người dùng
   thấy ứng dụng lạ xin quyền đọc toàn bộ hộp thư.
2. **Vi phạm điều khoản dịch vụ** của cả Google và Microsoft (cấm dùng
   credentials của bên thứ ba). Đây là rủi ro pháp lý, không chỉ kỹ thuật.
3. **Google gần như chắc chắn từ chối**: `redirect_uri` loopback động của
   VuaOffice không nằm trong danh sách đã đăng ký của Thunderbird →
   `redirect_uri_mismatch` hoặc `unauthorized_client`.
4. **Microsoft fail ở tenant doanh nghiệp**: client ID không thuộc tenant
   360 CORP nên chưa có admin consent → `AADSTS65001`.

Kết luận: **không có đường tắt**. Phải đăng ký ứng dụng chính chủ.

---

## 1. Microsoft 365 / Outlook.com

**Thời gian dự kiến: ~1 buổi làm việc.** Đây là phần làm được ngay.

### 1.1. Đăng ký ứng dụng trên Microsoft Entra ID

1. Vào <https://entra.microsoft.com> → **Applications** → **App registrations**
   → **New registration**.
2. Điền thông tin:
   - **Name**: `VuaOffice Mail`
   - **Supported account types**: chọn
     **Accounts in any organizational directory and personal Microsoft accounts**
     (multi-tenant + personal). Chọn đúng mục này thì một app phục vụ được cả
     tài khoản công ty lẫn Outlook.com cá nhân.
3. **Redirect URI**: chọn nền tảng **Mobile and desktop applications**, thêm:
   ```
   http://localhost
   ```
   > Entra ID cho phép loopback với **cổng động** khi đăng ký dạng public
   > client — không cần khai từng cổng. VuaOffice mở cổng ngẫu nhiên
   > (`server.listen(0)`) nên bắt buộc dùng cơ chế này.
4. Bấm **Register**, lưu lại **Application (client) ID**.

### 1.2. Bật Public Client Flow

1. Vào app vừa tạo → **Authentication**.
2. Kéo xuống **Advanced settings** → **Allow public client flows** → bật **Yes**.
   > Bắt buộc: VuaOffice là ứng dụng desktop, không giữ được `client_secret`.
   > Bảo mật dựa trên PKCE (đã triển khai, xem §4).

### 1.3. Khai báo quyền (API Permissions)

Vào **API permissions** → **Add a permission** → **APIs my organization uses**
→ tìm `Office 365 Exchange Online` → **Delegated permissions**, thêm:

| Quyền | Mục đích |
| :--- | :--- |
| `IMAP.AccessAsUser.All` | Đọc thư qua IMAP |
| `SMTP.Send` | Gửi thư qua SMTP |
| `offline_access` | Nhận refresh token (giữ đăng nhập quá 1 giờ) |
| `openid`, `profile`, `email` | Lấy địa chỉ và tên người dùng |

### 1.4. Admin Consent cho tenant 360 CORP

Sau khi thêm quyền, bấm **Grant admin consent for 360 CORP**.
Thiếu bước này thì nhân viên đăng nhập sẽ gặp `AADSTS65001`.

Khách hàng dùng tenant riêng phải tự cấp consent bằng URL:
```
https://login.microsoftonline.com/common/adminconsent?client_id=<CLIENT_ID>
```

### 1.5. Cập nhật mã nguồn

Thay `clientId` tại [`oauth-client.ts`](../apps/mail/src/main/auth/oauth-client.ts)
cho **cả hai** mục `microsoft` và `microsoft_personal`.
Giữ nguyên `authEndpoint` / `tokenEndpoint` — `/common` và `/consumers` đã đúng.

---

## 2. Google Workspace / Gmail

**Thời gian dự kiến: 4–8 tuần, có phí.** Đây là nút thắt thật sự của dự án.

Nguyên nhân: scope `https://mail.google.com/` thuộc nhóm **Restricted Scope**,
Google bắt buộc kiểm định bảo mật độc lập trước khi cấp.

### 2.1. Tạo dự án và OAuth Client

1. Vào <https://console.cloud.google.com> → tạo project `VuaOffice Mail`.
2. **APIs & Services** → **Library** → bật **Gmail API**.
3. **OAuth consent screen**:
   - **User Type**: `External`
   - **App name**: `VuaOffice`
   - **App logo**: tải lên từ `360/Logo/vuaoffice-icon.svg` (chuyển sang PNG 120×120)
   - **Application home page**: `https://vuaai.net`
   - **Privacy policy** và **Terms of service**: bắt buộc có URL công khai,
     hoạt động thật. Google sẽ kiểm tra thủ công.
   - **Authorized domains**: `vuaai.net`
4. **Credentials** → **Create Credentials** → **OAuth client ID**:
   - **Application type**: **Desktop app**
   - Lưu lại **Client ID** và **Client Secret**.

> ⚠️ **Lưu ý quan trọng**: Google cấp `client_secret` cho Desktop app và
> **yêu cầu gửi kèm** khi đổi token. Mã nguồn đã hỗ trợ sẵn qua trường
> `clientSecret` trong `OAuthProviderConfig` — chỉ cần điền vào.
> Với desktop app, `client_secret` không được coi là bí mật thật (RFC 8252 §8.5);
> bảo mật vẫn dựa trên PKCE.

### 2.2. Xin duyệt Restricted Scope + CASA

Đây là phần tốn thời gian nhất.

1. Tại **OAuth consent screen** → **Publishing status** → **Publish App**
   → **Prepare for verification**.
2. Chuẩn bị hồ sơ nộp Google:
   - **Video demo** (YouTube, không public): quay màn hình toàn bộ luồng đăng
     nhập OAuth, thể hiện rõ app xin quyền gì và dùng vào việc gì.
   - **Giải trình scope**: nêu rõ vì sao cần `https://mail.google.com/`
     (đáp: VuaOffice là ứng dụng mail client, cần IMAP/SMTP để đọc và gửi thư —
     Gmail API REST không thay thế được vì kiến trúc dùng giao thức chuẩn).
   - **Privacy policy** nêu rõ cách lưu trữ và xử lý dữ liệu thư.
3. **CASA Assessment (Cloud Application Security Assessment)**:
   - Google chỉ định đơn vị đánh giá độc lập (VD: Leviathan, Bishop Fox, TAC).
   - **Có phí**, do 360 CORP chi trả. Mức phí thay đổi theo Tier — hỏi báo giá
     trực tiếp khi Google gửi yêu cầu.
   - Nội dung đánh giá: mã hoá dữ liệu khi lưu và khi truyền, quản lý khoá,
     kiểm soát truy cập, quy trình xử lý sự cố.

### 2.3. Điểm mạnh sẵn có khi qua CASA

Các hạng mục dưới đây đã đạt chuẩn, nên đưa vào hồ sơ:

| Hạng mục CASA | Hiện trạng VuaOffice |
| :--- | :--- |
| Mã hoá khi lưu | Token lưu qua Electron `safeStorage` (Apple Keychain / Windows DPAPI) |
| Mã hoá khi truyền | TLS `rejectUnauthorized: true` + STARTTLS/STLS bắt buộc cho IMAP/SMTP/POP3 |
| Chống CSRF | Kiểm tra `state` nghiêm ngặt (thiếu `state` cũng bị chặn) |
| Chuẩn OAuth | PKCE S256 + loopback `127.0.0.1` theo RFC 8252 |
| Cô lập nội dung | HTML thư render trong iframe `sandbox`, không có `allow-scripts` |

### 2.4. Phương án tạm trong lúc chờ duyệt

Trước khi Google duyệt, app ở trạng thái **Testing** — chỉ đăng nhập được bằng
tài khoản trong danh sách **Test users** (tối đa 100), và refresh token **hết hạn
sau 7 ngày**. Không dùng cho khách hàng thật được.

**Giải pháp cho bản phát hành hiện tại**: người dùng Gmail đăng nhập bằng
**App Password** qua IMAP/SMTP (đường này đã hoạt động và đã vá bảo mật).
Hướng dẫn người dùng bật xác thực 2 bước rồi tạo App Password tại
<https://myaccount.google.com/apppasswords>.

---

## 3. Bảng tổng hợp công việc

| # | Việc | Phụ trách | Thời gian | Phụ thuộc |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Đăng ký app Entra ID + admin consent | DevOps | ~1 buổi | — |
| 2 | Thay Client ID Microsoft trong mã nguồn | Dev | 15 phút | #1 |
| 3 | Kiểm thử đăng nhập Microsoft thật | QA | 1 buổi | #2 |
| 4 | Dựng trang Privacy Policy + Terms công khai | Marketing | 2–3 ngày | — |
| 5 | Tạo Google Cloud project + OAuth client | DevOps | ~1 buổi | #4 |
| 6 | Quay video demo + viết giải trình scope | Dev + PO | 1–2 ngày | #5 |
| 7 | Nộp hồ sơ xin duyệt Restricted Scope | PO | 1 ngày | #6 |
| 8 | CASA Assessment | Đơn vị độc lập | **4–8 tuần** | #7 |
| 9 | Thay Client ID + Secret Google | Dev | 15 phút | #8 |

**Đường găng**: mục #8. Nên khởi động #4 → #7 càng sớm càng tốt để chạy song
song với các việc khác.

---

## 4. Hiện trạng mã nguồn

Luồng OAuth đã hoàn chỉnh về kỹ thuật, chỉ chờ Client ID chính chủ:

- ✅ Authorization Code Flow + PKCE S256 (RFC 7636 / 8252)
- ✅ Loopback server `127.0.0.1` cổng ngẫu nhiên, timeout 3 phút
- ✅ Kiểm tra `state` chống CSRF (chặn cả trường hợp thiếu `state`)
- ✅ Tự động làm mới access token, giữ refresh token xoay vòng
- ✅ Phân biệt lỗi vĩnh viễn (`invalid_grant`) với lỗi tạm thời
- ✅ Báo lỗi ngay khi nhà cung cấp không cấp refresh token
- ✅ Tài khoản Outlook.com cá nhân refresh đúng endpoint `/consumers`
- ✅ Escape HTML cho chuỗi từ nhà cung cấp trên trang callback

Sau khi có Client ID mới, chỉ cần sửa **2 chỗ** trong
[`oauth-client.ts`](../apps/mail/src/main/auth/oauth-client.ts):
`OAUTH_CONFIGS.google.clientId` (+ `clientSecret`) và
`OAUTH_CONFIGS.microsoft.clientId` (dùng chung cho `microsoft_personal`).

Kiểm thử hồi quy: `apps/mail/tests/oauth-token-lifecycle.test.ts` (11 case).
