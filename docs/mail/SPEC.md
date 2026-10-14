# SPEC.md — VuaOffice Whitelabel & Rebrand

> Sinh từ [REQUIREMENTS.md](REQUIREMENTS.md). Tham chiếu trực tiếp các mục yêu cầu.

## 1. Cấu trúc Thư mục Whitelabel

Toàn bộ các tài nguyên phục vụ whitelabel được lưu trữ trong thư mục `whitelabel/` ở root của dự án. Cấu trúc như sau:

```text
whitelabel/
├── brand-config.json       # File cấu hình biến số và luật thay thế text
└── assets/                 # Thư mục chứa tài nguyên đồ họa thay thế
    ├── logo.svg            # Logo VuaOffice định dạng vector SVG
    ├── icon.png            # Icon ứng dụng PNG
    ├── icon.icns           # Icon ứng dụng định dạng macOS (.icns)
    └── icon.ico            # Icon ứng dụng định dạng Windows (.ico)
```

## 2. Đặc tả File Cấu hình `brand-config.json`

File `brand-config.json` định nghĩa các tham số cấu hình tĩnh của thương hiệu.

```json
{
  "appName": "VuaOffice",
  "appId": "com.vuahethong.vuaoffice",
  "executableName": "vuaoffice",
  "author": "360 CORP",
  "defaultProvider": "vuaaipro",
  "vuaaiproUrl": "https://vuahethong.net",
  "ninerouterUrl": "https://api.9router.com/v1",
  "textReplacements": [
    {
      "files": [
        "apps/shell/src/renderer/src/strings.ts",
        "apps/shell/index.html",
        "apps/shell/src/renderer/index.html",
        "apps/shell/src/renderer/src/Home.tsx",
        "apps/shell/src/main/index.ts"
      ],
      "rules": [
        { "regex": "\\bGenOffice\\b", "to": "VuaOffice" },
        { "regex": "\\bGenspark\\b", "to": "360 CORP" }
      ]
    }
  ]
}
```

Các thuộc tính quan trọng:
- `appName`: Tên hiển thị của ứng dụng.
- `appId`: Application Bundle Identifier của Electron.
- `executableName`: Tên file thực thi sau khi build (`.app` hoặc `.exe`).
- `defaultProvider`: Provider mặc định cho AI (`vuaaipro` hoặc `ninerouter`...).
- `textReplacements`: Danh sách các file nguồn cần thay thế từ khóa thương hiệu dựa trên Regex.

## 3. Đặc tả CLI Script `scripts/whitelabel.js`

CLI Script được phát triển bằng NodeJS thuần (không dependency ngoài) để đảm bảo tốc độ và tính tương thích cao.

### 3.1 Luồng Xử lý của Lệnh `apply` (`node scripts/whitelabel.js apply`)
1. **Đọc Cấu hình**: Đọc file `whitelabel/brand-config.json`.
2. **Patch file `apps/shell/electron-builder.cjs`**:
   - Thay thế `productName` bằng `appName`.
   - Thay thế `appId` bằng `appId`.
   - Thay thế `executableName` bằng `executableName`.
3. **Patch file `apps/shell/package.json`**:
   - Cập nhật `productName` thành `appName`.
   - Cập nhật `desktopName` thành `${executableName}.desktop`.
   - Cập nhật `author` thành `author`.
4. **Patch module `@genoffice/ai-provider`**:
   - Thêm `vuaaipro` và `ninerouter` vào enum `AiProviderId` trong `packages/ai-provider/src/types.ts`.
   - Thêm metadata của `vuaaipro` và `ninerouter` vào mảng `AI_PROVIDERS` trong `packages/ai-provider/src/providers.ts`.
   - Cấu hình mặc định `baseUrl` và thiết lập default provider là `defaultProvider` trong `packages/ai-provider/src/providers.ts`.
   - Chèn logic xử lý router trong `packages/ai-provider/src/stream.ts`.
5. **Thay thế Text**: Duyệt qua danh sách `textReplacements` trong config, đọc từng file, áp dụng Regex để thay thế text và lưu lại.
6. **Sao chép Assets**:
   - Copy `whitelabel/assets/logo.svg` -> `apps/shell/src/renderer/src/assets/genoffice-logo.svg`.
   - Copy `whitelabel/assets/icon.png` -> `apps/shell/build/icon.png` và `apps/shell/build/icon-mac.png`.
   - Copy `whitelabel/assets/icon.icns` -> `apps/shell/build/icon.icns`.
   - Copy `whitelabel/assets/icon.ico` -> `apps/shell/build/icon.ico`.

### 3.2 Luồng Xử lý của Lệnh `restore` (`node scripts/whitelabel.js restore`)
1. Đọc danh sách file cần khôi phục bằng cách kết hợp:
   - Các file cấu hình tĩnh (`electron-builder.cjs`, `package.json`, `types.ts`, `providers.ts`, `stream.ts`, `genoffice-logo.svg`, các file icons).
   - Danh sách file động lấy từ `textReplacements` trong `brand-config.json`.
2. Duyệt qua danh sách file và thực hiện khôi phục về trạng thái sạch bằng Git:
   `git checkout -- "<file_path>"`
3. Nếu file không nằm trong Git tracker hoặc có lỗi, báo log warning thay vì làm crash script.

## 4. Tích hợp AI Provider trong Codebase

### 4.1 Thêm AI Provider IDs
Trong `packages/ai-provider/src/types.ts`:
```typescript
export type AiProviderId = 'genspark' | 'anthropic' | 'gemini' | 'deepseek' | 'openai' | 'openrouter' | 'custom' | 'vuaaipro' | 'ninerouter' | 'hermes'
```

### 4.2 Cấu hình AI Provider Metadata
Trong `packages/ai-provider/src/providers.ts`:
Bổ sung `hermes` với endpoint mặc định `https://hermes.vuahethong.com/v1`, đồng thời tích hợp `vuaaipro` và `ninerouter`.

## 5. Đặc tả Tính năng Kiểm tra Cập nhật Thủ công (Manual Check for Updates)

### 5.1 Main Process (`apps/shell/src/main/updater.ts`)
- Hàm `checkForUpdatesManual()`:
  - **Dev Mode**: Hiển thị native dialog thông báo ứng dụng đang chạy ở môi trường phát triển (Development Mode).
  - **Packaged Release**: Gọi `autoUpdater.checkForUpdates()`. Bật cờ `isManualCheck = true` để hiển thị hộp thoại native khi đã ở bản mới nhất (`updAlreadyLatest`) hoặc khi gặp lỗi kết nối (`updFailed`), đồng thời giữ im lặng khi kiểm tra ngầm định kỳ.
- Menu Application macOS & Help Menu: Thêm mục `Check for Updates…` ngay dưới `About VuaOffice` trên macOS và trong menu `Help` trên Windows/Linux.

### 5.2 Renderer Process (`apps/shell/src/renderer/src/Home.tsx`)
- Tích hợp mục "Check for Updates…" vào Account dropdown menu tại màn hình chính, gọi `window.aiOffice.checkForUpdates()` qua IPC.

## 6. Đặc tả Module VuaMail (`apps/mail`)

### 6.1 Kiến trúc Cơ sở dữ liệu SQLite
- **`accounts`**: Quản lý tài khoản kết nối.
- **`emails`**: Danh sách thư gồm metadata chính (`id`, `subject`, `from`, `to`, `snippet`, `is_read`, `date_ms`, `folder_id`).
- **`email_bodies`**: Nội dung `html` và `plain_text` được nạp theo cơ chế lazy-load khi chọn thư.
- **`op_queue`**: Ghi nhận các thao tác `mark_read`, `delete`, `move_folder`, `send_draft` khi mất kết nối mạng.

### 6.2 Giao diện Người dùng Outlook Clone (React 19)
- **AppRail**: Thanh bên trái điều hướng chuyển đổi tab `Mail`, `Calendar`, `Contacts`, `To-Do`.
- **Top Ribbon Toolbar**: Nút *New Email* (kèm split menu), *Delete*, *Archive*, *Reply*, *Reply All*, *Forward*, *AI Tools*.
- **Folders Pane**: Phân nhóm *Favorites* (Inbox, Sent, Drafts, Deleted Items, Archive).
- **Message List**: Danh sách thư hỗ trợ phân loại *Focused* và *Other*, tìm kiếm từ khóa, unread indicator.
- **Reading Pane**: Xem thư, avatar người gửi, danh sách file đính kèm với nút xem trước Docx/PDF trực tiếp.
- **AI Assist Card**: Tóm tắt nội dung email quan trọng trong 2-3 gạch đầu dòng và gợi ý câu trả lời tự động.
- Bổ sung định nghĩa `vuaaipro` và `ninerouter` vào `AI_PROVIDERS`:
```typescript
  {
    id: 'vuaaipro',
    label: 'VuaAI Pro AI',
    models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro', 'deepseek-chat'],
    defaultModel: 'claude-3-5-sonnet',
    keyPlaceholder: 'sk-or-...',
    needsBaseUrl: true,
  },
  {
    id: 'ninerouter',
    label: '9Router AI',
    models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro', 'deepseek-chat'],
    defaultModel: 'claude-3-5-sonnet',
    keyPlaceholder: 'sk-or-...',
    needsBaseUrl: true,
  }
```
- Khởi tạo mặc định `baseUrl` cho hai nhà cung cấp này dựa trên config:
```typescript
baseUrl: meta.needsBaseUrl ? (meta.id === 'vuaaipro' ? 'https://vuahethong.net' : (meta.id === 'ninerouter' ? 'https://api.9router.com/v1' : '')) : undefined
```
- Thay đổi giá trị trả về trong `defaultAiSettings`:
```typescript
return { provider: 'vuaaipro', providers }
```

### 4.3 Định tuyến Stream AI
Trong `packages/ai-provider/src/stream.ts`:
- Định nghĩa switch-case cho `vuaaipro` và `ninerouter` gọi `streamOpenAiCompatible`:
```typescript
    case 'vuaaipro':
    case 'ninerouter':
      if (!config.baseUrl) throw new Error('A Base URL is required')
      return streamOpenAiCompatible(config.baseUrl, config, system, messages, tools, maxTokens, cb)
```

---

**Nguồn:** [REQUIREMENTS.md](REQUIREMENTS.md)
**Người duyệt:** Sếp (Product Owner)
**Trạng thái:** Approved
**Ngày duyệt:** 2026-08-10
