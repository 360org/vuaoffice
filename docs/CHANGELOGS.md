# CHANGELOGS.md — Nhật ký Phát triển VuaOffice Whitelabel

Tất cả các thay đổi đáng chú ý đối với dự án whitelabel VuaOffice sẽ được ghi lại trong tài liệu này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.10] - 2026-08-23

### Core & Document Routing
- **Hỗ trợ toàn diện định dạng Word 97-2003 (`.doc`) song song với `.docx`**:
  - Bổ sung adapter chuyển đổi `docToDocx` trong `@genoffice/file-parse` sử dụng `word-extractor` và `@genoffice/docx-engine`.
  - Cập nhật router tài liệu trong `apps/shell/src/main/index.ts` và `apps/docs/src/main/docs-main.ts` để nhận diện và mở trực tiếp các tệp tin `.doc` vào tab Docs.
  - Cập nhật bộ lọc tệp tin Open Dialog và giao diện Quick Cards Home để người dùng mở cả 2 định dạng `.docx` và `.doc`.

### Mail & UI Optimization
- **Đồng bộ hiển thị phiên bản Mail tự động**:
  - Bổ sung IPC `vua-mail:get-app-version` trong `apps/mail` đọc trực tiếp từ version thực tế của ứng dụng (`app.getVersion()`), loại bỏ hardcode `v1.0.8` ở thanh trạng thái sidebar Settings & Profile.
- **Tối ưu trải nghiệm soạn thư (ComposeModal)**:
  - Cải tiến chế độ phóng to / toàn màn hình: nội dung soạn thảo căn full-width co giãn linh hoạt, padding chuẩn công thái học văn bản, loại bỏ khoảng xám trống thừa và tình trạng co cụm như tờ giấy hẹp.

### Whitelabel & Build System
- Cập nhật cấu hình bảo vệ định danh font (`Gothic KR`, `Tamil`) trong `whitelabel/brand-config.json`.
- Hoàn thiện toàn bộ các gói Rollup cross-platform trong `package-lock.json` cho hạ tầng CI multi-runner.

## [1.0.9] - 2026-08-22

### UI & Architecture
- **Tái thiết kế giao diện Cài đặt & Hồ sơ (Settings & Profile View)**:
  - Chuyển đổi toàn diện sang bố cục 2 cột tiêu chuẩn Microsoft Outlook 365 / macOS Settings (Left Sidebar 250px + Right Scrollable Content Pane).
  - Tích hợp Toggle Switch CSS (`.switch-slider`), Form controls đồng bộ Semantic Tokens (`var(--surface)`, `var(--border)`, `var(--mail-primary-blue)`).
  - Tích hợp Lưới đăng nhập nhanh 1-Click thông minh cho Microsoft 365, Google Workspace, 360 CORP SSO và IMAP/SMTP.
  - Quản lý danh mục chữ ký HTML và thư mẫu Quick Parts trực quan.

## [1.0.8] - 2026-08-22

### Upstream Sync & Core Architecture
- **Đồng bộ toàn diện Upstream 2026-08-22 (`genspark-ai/genoffice`)**:
  - Tích hợp 21 tệp tin thay đổi thuộc Shell, Docs, Sheets, Slides, PDF, Markdown, UI, Agent Core và AI Provider.
  - Khắc phục xung đột merge, bảo toàn cơ chế Whitelabel độc quyền VuaOffice và vượt qua bộ 3 cổng kiểm soát `brand:gate`.
- **Chuẩn hóa Kiến trúc VuaOffice Mail AI (`AgentLoop` & Tool Calling)**:
  - Tái cấu trúc phân hệ Mail AI đồng bộ hoàn toàn với Docs/Sheets/Slides theo kiến trúc `@genoffice/agent-core`.
  - Triển khai `mail-skill.ts` hỗ trợ Tool Calling chuyên biệt: `get_current_email`, `draft_reply`, `create_todo_task`, `schedule_calendar_event`.
  - Tích hợp bộ UI Component chuẩn VuaOffice Suite (`@genoffice/ui`: `AiComposer`, `Markdown`, `AiTypingIndicator`), hỗ trợ Markdown rendering, auto-scroll, stop streaming và phím tắt Enter/Shift+Enter.
  - Sửa lỗi Quick Question suggestion chips không bị che bởi composer bằng cách đưa trực tiếp vào luồng cuộn tin nhắn (`.ai-starter-list`).
- **Đồng bộ hóa Giao diện & Bộ Biểu tượng Mail Ribbon theo Chuẩn VuaOffice Suite**:
  - Chuẩn hóa toàn bộ icon SVG theo khung hình học 24x24 / 16x16 với nét vẽ `strokeWidth={1.5}`, `strokeLinecap="round"`, `strokeLinejoin="round"`.
  - Tích hợp bộ icon chuẩn hóa (`MailIcons.tsx`) vào toàn bộ các tab của Mail Ribbon (`Home`, `Send/Receive`, `Folder & Rules`, `View & Layout`), loại bỏ hoàn toàn các thẻ `<svg>` inline viết tay.
  - Chuẩn hóa nút Soạn thư (`.rb-big.rb-primary`) về màu sắc monochrome tối giản của VuaOffice Suite, loại bỏ background gradient xanh lá tự do.

### Fixed & Core
- **Tách biệt Hồ sơ (Profile) và Trí tuệ AI (Brain) trong phân hệ Mail**:
  - Trả AppRail tab Brain về component `BrainView` (phân tích thông tin học hỏi từ email).
  - Đưa trigger mở `ProfileView` lên góc trên bên phải header/ribbon của Mail dưới dạng cụm Icon đại diện (User & Settings + Status Dot), loại bỏ hiển thị text email theo yêu cầu UI.
- **Tích hợp Real AI Stream IPC cho Chat Mail**:
  - Kết nối `AiPanel.tsx` trực tiếp với luồng IPC streaming `ai:stream`, `ai:stream-chunk`, `ai:get-settings`.
  - Thay thế toàn bộ phản hồi mock giả lập `setTimeout` bằng kết nối AI Vendor thực tế của VuaOffice Suite.
- **Loại bỏ triệt để từ khóa "Copilot" trong phân hệ Mail**:
  - Chuẩn hóa toàn bộ nhãn hiển thị nút Ribbon, tooltip và placeholder khung chat từ "Copilot" / "AI Copilot" sang "VuaOffice AI".
- **Khắc phục hiển thị Multi-Provider trong AI Settings Modal**:
  - Truyền `initialDevMode` từ trạng thái `Home.tsx` vào `AiSettingsModal.tsx` để danh sách Multi-Endpoint hiển thị ngay khi mở modal mà không cần tắt/bật lại.
- **Tích hợp trọn vẹn Mail Engine & Chuẩn hóa cổng Developer Mode cho AI Mail**:
  - Đồng bộ toàn bộ tính năng hoàn chỉnh từ nhánh `origin/VuaMail` (EML parser/builder, PST/MBOX, Rules, Threading, OAuth2 PKCE, SASL XOAUTH2, Calendar, People, To-Do, Brain, Profile Views).
  - Tích hợp `@genoffice/mail-engine` và cấu hình module alias trong Rollup/Vite.
  - Phân hệ AI Mail mặc định bị vô hiệu hóa (`pointer-events: none`, opacity mờ, chip "SOON", subtitle "Coming Soon") đối với người dùng thông thường.
  - Phân hệ AI Mail chỉ mở khóa và cho phép click truy cập khi bật **Developer Mode** trong Help Menu.
  - Chuyển đổi engine lưu trữ `SQLiteMailStorage` từ native C++ binary sang Pure JS JSON (`mail-local.json`) tránh crash native binding khi đóng gói app.
  - Cấu hình đầy đủ `configureMailRuntime` và `MAIL_OUT` trong `apps/shell/src/main/index.ts`.

### Changed & Whitelabel
- **Đồng bộ biểu tượng thương hiệu VuaOffice SVG chính thức**:
  - Tích hợp vector SVG từ `whitelabel/Logo/icon/icon.svg` vào component `GensparkMark` tại toàn bộ 5 ứng dụng (Docs, Sheets, Slides, PDF, Markdown).
  - Cập nhật tài sản `vuaoffice-icon.svg` tại `apps/shell/src/renderer/src/assets/`.
- **Hoàn thiện tên thương hiệu macOS Application Menu**:
  - Gán `app.name = "VuaOffice"` trong `apps/shell/src/main/index.ts` để hiển thị chính xác "About VuaOffice", "Hide VuaOffice", "Quit VuaOffice" trên menu native của macOS.
  - Đồng bộ `productName: "VuaOffice"` tại toàn bộ cấu hình `package.json`.

## [1.0.7] - 2026-08-19

### Changed
- **Chuẩn hóa phụ đề định dạng AI Mail**:
  - Cập nhật định dạng phụ đề của thẻ AI Mail từ "Outlook UI" thành ".pst" đồng bộ với các ứng dụng khác (.docx, .xlsx, .pptx, .md).

### Fixed & Packaging
- **Tích hợp & Đóng gói Phân hệ AI Mail vào Bộ Cài Đặt**:
  - Bổ sung cấu hình đóng gói `modules/mail` (`../mail/out` ➔ `modules/mail`) vào `extraResources` trong `apps/shell/electron-builder.cjs`.
  - Khai báo dependency `@genoffice/mail` trong `apps/shell/package.json`.
  - Khắc phục lỗi không mở được AI Mail khi kích hoạt Developer Mode trên bản đóng gói.

## [1.0.6] - 2026-08-19

### Changed & Assets
- **Cập nhật Bộ Icon Thương hiệu VuaOffice Mới**:
  - Chuyển đổi và đồng bộ icon vector chính thức sang toàn bộ định dạng đóng gói: macOS (`icon.icns`, `app.icns`), Windows (`icon.ico`, `app.ico`), Linux (`icon.png`) và updater modal asset (`app-icon.png`).

## [1.0.5] - 2026-08-19

### Changed
- **Chuẩn hóa nhãn & Điều kiện truy cập AI Mail**:
  - Đổi tên hiển thị từ "Vua Mail" / "VuaMail" thành "AI Mail" đồng bộ trên 19 ngôn ngữ trong strings i18n (`newMail`).
  - Gắn badge ribbon "Soon" màu hổ phách và hiển thị phụ đề "Coming Soon" khi ở chế độ người dùng bình thường.
  - Khóa truy cập click vào thẻ AI Mail, chỉ cho phép mở khi kích hoạt Developer Mode (`isDevMode` = true).

## [1.0.4] - 2026-08-19
- **Chuẩn hóa nhãn & Điều kiện truy cập AI Mail**:
  - Đổi tên hiển thị từ "Vua Mail" / "VuaMail" thành "AI Mail" đồng bộ trên 19 ngôn ngữ trong strings i18n (`newMail`).
  - Gắn badge ribbon "Soon" màu hổ phách và hiển thị phụ đề "Coming Soon" khi ở chế độ người dùng bình thường.
  - Khóa truy cập click vào thẻ AI Mail, chỉ cho phép mở khi kích hoạt Developer Mode (`isDevMode` = true).


### Fixed
- **Hợp nhất Feed Cập nhật Đa Kiến trúc macOS (`latest-mac.yml`)**:
  - Khắc phục lỗi `Update download failed. Check your network and try again` trên macOS Intel (`x86_64`) do artifact `latest-mac.yml` bị ghi đè bởi job build Apple Silicon (`arm64`).
  - Bổ sung công cụ [`scripts/merge-mac-feed.js`](/Volumes/DATA/DEV/vuaoffice/scripts/merge-mac-feed.js) trong pipeline GitHub Actions release để hợp nhất danh sách phân phối của cả hai kiến trúc (`arm64` và `x64`) vào một file `latest-mac.yml` chuẩn duy nhất.

## [1.0.3] - 2026-08-19

### Changed & Whitelabel
- **Tự động hóa Cơ chế Whitelabel ("Một lần và mãi mãi")**:
  - Bổ sung cấu hình pre-hooks (`predev`, `prebuild`, `prebuild:all`, `predist:mac`, `predist:mac:x64`, `predist:mac:arm64`, `predist:all`, `predist:win`, `predist:linux`) vào `/Volumes/DATA/DEV/vuaoffice/package.json` để tự động thực thi `npm run whitelabel:apply` trước mọi lượt build/run.
  - Đồng bộ nhận diện thương hiệu Icon, Logo VuaOffice chính thức của 360 CORP trên toàn bộ hệ thống packaging và UI.
  - Vượt qua 100% cổng kiểm tra thương hiệu `npm run brand:gate` (selftest + status + check-brand).

## [1.0.2] - 2026-08-19

### Changed & Whitelabel
- **Chuẩn hóa Header Sidebar AI trên Toàn bộ 5 Ứng dụng (Docs, Sheets, Slides, PDF, Markdown)**:
  - Bổ sung cấu hình thay thế song ánh vào nguồn chân lý duy nhất `/Volumes/DATA/DEV/vuaoffice/whitelabel/brand-config.json` theo đúng `/Volumes/DATA/DEV/vuaoffice/docs/WHITELABEL_STRATEGY.md`.
  - Thay thế chuỗi `aiPanelTitle` trong i18n của Docs và Slides trên 19 ngôn ngữ thành `VuaOffice AI`.
  - Chuẩn hóa span tiêu đề `.ai-panel-title` trong Sheets, PDF và Markdown hiển thị đồng bộ `VuaOffice AI`.
  - Vượt qua 100% cổng kiểm tra thương hiệu `npm run brand:gate` và toàn bộ test suites.

### Fixed
- **Luồng Đăng nhập 360 CORP Web-to-Desktop**: Chuyển hướng callback đăng nhập qua endpoint landing trung gian `/vuaoffice/auth/desktop_callback` trên server Odoo (`vuahethong.net`) để tự động bắn custom protocol scheme `vuaoffice://auth/callback` chuyển quyền đăng nhập về Desktop app mượt mà và hiển thị trạng thái đăng nhập thành công.
- **AI Provider mặc định VuaAi Provider**: Chuẩn hóa provider mặc định là `VuaAi Provider` (`ninerouter`), Base URL `https://ai-router.vuahethong.com/v1` và model `vuaai-daily`. Gỡ bỏ hardcode ép provider sang `genspark` trong các IPC handler `ai:get-settings` (`docs-main.ts`, `sheets-main.ts`, `ai-ipc.ts`). Ẩn danh sách vendor trong modal Cài đặt AI khi ở Normal Mode và chỉ hiển thị khi bật Developer Mode.
- **Manual Update Check**: Hiển thị popup `You are up to date, no update available.` khi người dùng kiểm tra thủ công và app đã ở bản mới nhất.
- **macOS Auto Update Install Fallback**: Khi `quitAndInstall(true, true)` hoặc lỗi Squirrel.Mac apply/signing fail, UI chuyển sang chế độ cài đặt thủ công thay vì im lặng sau khi tải xong.
- **Manual Download URL**: Fallback manual page trỏ về `https://vuahethong.net/#download-desktop-app`, không trỏ GitHub release page.
- **Onboarding Star CTA**: Welcome/Onboarding hiển thị `If you like VuaOffice, give us a star on Vua Office.` và mở `https://vuahethong.net` qua IPC main-side cố định.

### Security
- **Gỡ hardcoded GitLab report token**: Token GitLab API trong diagnostic-report.ts chuyển sang đọc từ biến môi trường `VUAOFFICE_GITLAB_REPORT_TOKEN`; nếu chưa cấu hình thì trả lỗi rõ ràng thay vì gửi với token rỗng.

## [1.0.1] - 2026-08-18

### Added & Upstream Sync
- **Đồng bộ toàn diện Upstream Engine (`genspark-ai/genoffice` ➔ `main`)**:
  - **VuaOffice Docs**: Nâng cấp bộ phân tích và hiển thị DOCX (Metafile render, WMF/EMF conversion, SmartArt/WordArt VML, Page note areas, Paragraph border merge, Table handle selection).
  - **VuaOffice Sheets**: Tích hợp Rust sidecar engine thế hệ mới, thanh công cụ Formula Audit, Workbook Search, Goal Seek Dialog, Page Break Preview, Range Protection và Theme engine.
  - **VuaOffice Slides**: Thêm Format Background Pane, điều khiển màu sắc chi tiết, hỗ trợ cover-crop và nhận diện hệ thống phông chữ tài liệu.
  - **Shared UI**: Bổ sung bộ chọn màu chuyên sâu và Popover dismiss trong `@genoffice/ui`.
- **Bảo toàn cơ chế Whitelabel Config-Driven**:
  - Đảm bảo 100% luật song ánh qua `npm run brand:gate` trên toàn bộ 470 tệp workspace.
  - Loại bỏ hoàn toàn mọi xung đột mã nguồn mà vẫn giữ nguyên nhận diện thương hiệu VuaOffice và hệ thống Gateway AI 360 CORP.

## [1.0.0] - 2026-08-17

### Added
- **Phát hành Chính thức VuaOffice v1.0.0 (All in One Free, AI-Native Office Suite)**:
  - Tích hợp trọn bộ 6 ứng dụng văn phòng cốt lõi: VuaOffice Docs (.docx), Sheets (.xlsx), Slides (.pptx), PDF, Markdown (.md), và VuaMail.
  - Hạ tầng định tuyến AI 360 Gateway hoàn chỉnh: OmiRouter, 9Router, Hermes Agent (`https://hermes.vuahethong.com/v1`) và Custom OpenAI-compatible Endpoints.
  - Hệ thống đăng nhập tài khoản 360 CORP qua Deep Link Web-to-Desktop callback flow (`vuaoffice://auth/callback`).
  - Hệ thống Báo cáo Chẩn đoán lỗi tự động (Diagnostic Report Modal) kết nối trực tiếp GitLab Issues API với cơ chế scrubber bảo mật.
  - Bộ máy Whitelabel & Brand Gate Config-Driven chuẩn mực theo `/Volumes/DATA/DEV/vuaoffice/docs/WHITELABEL_STRATEGY.md`, đảm bảo 100% luật song ánh.
  - Thông điệp Onboarding đầu tiên chuẩn hóa: "The first All in One Free, AI-native office suite".

### Security & Hardening (Priority Roadmap Remediation)
- **Cô lập XSS Renderer Email trong VuaMail**: Render toàn bộ nội dung HTML email người gửi trong `<iframe sandbox="allow-same-origin">` (`EmailHtmlFrame.tsx`).
- **Làm sạch MathML & HTML trong VuaOffice Docs**: Loại bỏ triệt để các thẻ nguy hiểm (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>`, `<svg>`), thuộc tính sự kiện inline (`on*`) và giao thức `javascript:` trong pipeline chuyển đổi OOXML OMML (`math.ts`), `DocInlineMath`, `buildProtectedDom`, và view `splitHtml`.
- **Kiểm soát ranh giới đường dẫn IPC Shell**: Thiết lập hàm xác thực an toàn `assertSafeUserPath()` so khớp thư mục người dùng (`home`, `documents`, `downloads`, `desktop`, `temp`, `defaultSaveDir` và các tệp gần đây/đã đánh dấu sao) ngăn chặn triệt để path traversal đối với các IPC handlers tệp tin.
- **Chuẩn hóa Semantic UI Tokens cho Mail Theme**: Đồng bộ toàn diện `mail-theme.css` sang hệ thống biến CSS Design Tokens ngữ nghĩa (`--accent`, `--surface`, `--hover`, `--border`), hỗ trợ đầy đủ Light/Dark mode.
- **Cơ chế Retry Exponential Backoff cho AI Provider**: Bổ sung tự động thử lại khi gặp lỗi tạm thời (HTTP 429, 502, 503, 504) kèm jitter và xử lý header `Retry-After`.
- **Bổ sung Dark Theme Tokens cho Màu Lỗi**: Bổ sung `--color-error` (`#f87171`) và `--color-error-hover` (`#ef4444`) trong cả hai khối `[data-theme='dark']` và `@media (prefers-color-scheme: dark)` tại `packages/ui/src/tokens.css`.

## [0.7.0] - 2026-08-16

### Added
- **Triển khai Chuẩn Whitelabel & Upstream Sync Engine Config-Driven**:
  - Tích hợp chuẩn quy chế bắt buộc `/Volumes/DATA/DEV/vuaoffice/docs/WHITELABEL_STRATEGY.md` và `/Volumes/DATA/DEV/vuaoffice/docs/RELEASE_PROTOCOL.md`.
  - Thiết lập nguồn chân lý duy nhất `/Volumes/DATA/DEV/vuaoffice/whitelabel/brand-config.json` và module lõi `/Volumes/DATA/DEV/vuaoffice/scripts/lib/brand-core.cjs`.
  - Cung cấp bộ lệnh `npm run whitelabel:apply`, `whitelabel:restore`, `whitelabel:status`, `whitelabel:selftest` và Brand Gate `npm run brand:gate` (`tools/check-brand.mjs`).
  - Đảm bảo 100% luật song ánh (Bijectivity Law: `apply(restore(apply(x))) === apply(x)`) trên toàn bộ 447 tệp của dự án.
- **Triển khai Hệ thống Đăng nhập 360 CORP qua Deep Link Callback Flow (`vuaoffice://`)**:
  - Hỗ trợ luồng đăng nhập/đăng ký hoàn chỉnh: Desktop App ➔ Trình duyệt xác thực trên `https://vuahethong.net/web/login?redirect_uri=vuaoffice://auth/callback` ➔ Trả kết quả về Desktop qua Custom Protocol Scheme `vuaoffice://auth/callback`.
  - Đăng ký hệ điều hành `protocols: [{ name: 'VuaOffice Deep Link', schemes: ['vuaoffice'] }]` trong `apps/shell/electron-builder.cjs` và `app.setAsDefaultProtocolClient('vuaoffice')`.
  - Xử lý mượt mà trên cả 3 nền tảng: macOS (`open-url`, `pendingProtocolUrl` khi cold start), Windows/Linux (`second-instance`, `requestSingleInstanceLock`).
  - Tự động trích xuất `token`, `email`, `name`, lưu an toàn vào `~/.genoffice/auth.json` và đồng bộ tức thì trạng thái Đã đăng nhập trên toàn bộ giao diện (Avatar, Email, Sign out).
- **Cập nhật Thông điệp Chào mừng Onboarding**:
  - Chuẩn hoá thông điệp Onboarding đầu tiên theo định vị bộ công cụ đầy đủ: "The first All in One Free, AI-native office suite" và bao quát đầy đủ Docs, Sheets, Slides, Markdown, Mail, PDF.

## [0.6.9] - 2026-08-16

### Added
- **Tích hợp gửi trực tiếp GitLab Issues API v4 cho Báo cáo Chẩn đoán**:
  - Gửi log chẩn đoán lỗi trực tiếp từ Desktop app lên GitLab Issues (`360org/vuaoffice`) qua REST API chính thức.
  - Tự động tạo Issue với nhãn `diagnostic-report`, `user-report` và trả về liên kết xem ticket.
  - Chuẩn hoá toàn bộ thông điệp giao diện người dùng theo thương hiệu VuaOffice ("Gửi tới VuaOffice", "Đã gửi báo cáo thành công tới VuaOffice Issues!").

## [0.6.8] - 2026-08-16

### Added
- **Tính năng Thu thập Log & Báo cáo Lỗi Hệ thống (Generate Log, Diagnostic Report)**:
    - Tích hợp gửi trực tiếp GitLab Issues API v4 với xác thực phân quyền an toàn, tự động tạo Issue và trả về liên kết xem ticket cho người dùng.
  - Bổ sung menu `Help > Troubleshooting > Generate Log, Diagnostic Report…` trên macOS/Windows/Linux (hỗ trợ đầy đủ đa ngôn ngữ qua `tMain`).
  - Xây dựng modal `DiagnosticReportModal.tsx` hiển thị mã định danh duy nhất (Reference ID: `VUA-DIAG-YYYYMMDD-XXXXX`), thông số phần cứng/hệ điều hành/Electron/Node.js, kiểm tra kết nối mạng song song (GitLab API, OmiRouter, 9Router, Hermes).
  - Tích hợp bộ lọc làm sạch dữ liệu nhạy cảm (`scrubSensitiveText`): xoá đường dẫn thư mục cá nhân (`~`), làm mờ Bearer token, API keys (`sk-...`, `glpat-...`, `ghp_...`), email và IPv4.
  - Hỗ trợ xuất báo cáo ra file cục bộ (`.txt` / `.json`) qua native Save Dialog và gửi trực tiếp báo cáo Markdown lên GitLab Issues (`360org/vuaoffice`).
- **Kiểm tra Cập nhật Thủ công (Manual Check for Updates)**:
  - Bổ sung hàm `checkForUpdatesManual()` trong `apps/shell/src/main/updater.ts` với hộp thoại phản hồi trực quan (phân biệt bản dev và production release, thông báo khi đã ở bản mới nhất hoặc lỗi mạng).
  - Tích hợp mục "Check for Updates…" vào Menu hệ thống: macOS Application Menu (ngay dưới `About VuaOffice`) và menu `Help` trên Windows/Linux.
  - Tích hợp nút "Check for Updates…" vào Account dropdown menu tại màn hình chính `Home.tsx`.
- **Hỗ trợ Nhà cung cấp AI Hermes Agent**:
  - Bổ sung provider `hermes` với endpoint mặc định `https://hermes.vuahethong.com/v1` trong `@genoffice/ai-provider`.

### Changed
- **Vô hiệu hoá Popup yêu cầu Star GitHub**:
  - Gỡ bỏ toàn bộ việc hiển thị component `StarPromptCard` và vô hiệu hoá handler `HOME_CHANNELS.starPromptShouldShow` trong main process.
- **Cập nhật Logo Sidebar và Tái cấu trúc Tài liệu Dự án**:
  - Thay thế icon tại góc trên bên trái Sidebar Home bằng Logo thương hiệu VuaOffice chính thức (`vuaoffice-logo.svg`).
  - Tái cấu trúc toàn bộ tài liệu dự án (`IDEA.md`, `ARCH.md`, `SPEC.md`, `REQUIREMENTS.md`, `DEPLOY_GUIDE.md`, `CHANGELOGS.md`, `SECURITY.md`, `CONTRIBUTING.md`, `AGENTS.md`) vào thư mục `/Volumes/DATA/DEV/vuaoffice/docs/`.
  - Phân bổ tài liệu module độc lập theo các thư mục con: `docs/docs/`, `docs/sheets/`, `docs/slides/`, `docs/pdf/`, `docs/markdown/`, `docs/mail/`, `docs/shell/`.
- **Đồng bộ Tài nguyên Icon & Logo Thương hiệu VuaOffice**:
  - Chuẩn hoá toàn bộ icon ứng dụng từ `whitelabel/Logo/vuaoffice-icon.svg` và `whitelabel/Logo/Vua Office Icon.png`.
  - Tạo lại bộ icon native macOS đa độ phân giải (`whitelabel/assets/icon.icns`), Windows (`whitelabel/assets/icon.ico`) và PNG assets (`whitelabel/assets/icon.png`, `whitelabel/assets/app-icon.png`).
  - Đồng bộ icon vector và raster sang toàn bộ các app con (`apps/docs`, `apps/sheets`, `apps/slides`, `apps/pdf`, `apps/markdown`, `apps/shell`).
- **Tối ưu Cấu hình Developer Mode**:
  - Di chuyển tuỳ chọn "Enable Developer Mode" sang menu `Help > Troubleshooting > Enable Developer Mode` dạng checkbox.
  - Đồng bộ trạng thái developer mode theo thời gian thực giữa Main process và Renderer qua IPC (`app:developer-mode-changed`).

### Fixed
- Sửa lỗi thiếu import biến toàn cục `webContents` trong `apps/docs/src/main/docs-main.ts`, `apps/sheets/src/main/sheets-main.ts` và `apps/slides/src/main/ai-ipc.ts`.
- Sửa URL auto-update fallback download từ `genspark-ai/genoffice` sang `360org/vuaoffice`.

## [0.6.6] - 2026-08-15

### Fixed
- Sửa URL auto-update fallback download từ `genspark-ai/genoffice` sang `360org/vuaoffice` — app cũ đang tải bản cập nhật từ repo sai.
- Sửa URL repository trong root `package.json` về đúng `360org/vuaoffice`.
- Thêm rule whitelabel tự động vá URL updater và repository khi chạy `whitelabel apply`.

## [0.6.5] - 2026-08-14

### Changed
- Sửa slogan welcome màn hình chính thành "The 100% Free Office Suite with Native AI & Agentic Workflows".
- Di chuyển nút "Enable Developer Mode" sang menu Help > Troubleshooting.
- Cập nhật quy chuẩn đồng bộ git-sync: Tự động hoá việc tạo Publish Release và push tag lên GitHub.

### Fixed
- Sửa lỗi không lưu được cài đặt AI do thiếu thuộc tính `developerMode` trong Zod validation schema của backend.
- Sửa lỗi Settings modal không tự động đóng sau khi bấm Save.
- Sửa lỗi CI/CD build fail do thiếu `npm ci` trước khi chạy whitelabel verify trong GitHub Actions.

## [0.6.1] - 2026-08-11

### Fixed
- Sửa lỗi khởi động app (IPC handler exception) do thiếu channel `HOME_CHANNELS`.
- Cập nhật chứng chỉ Apple Codesign & Notarization chính thức cho bản build macOS.
- Đổi tên mục Cài đặt AI thành **Settings** với icon bánh răng.

## [0.6.0] - 2026-08-11

### Changed
- Cập nhật toàn bộ giao diện Ribbon UI (Docs, Sheets, Slides, Markdown) từ "Genspark AI" thành "VuaOffice AI".
- Thêm VuaOffice Mail (thay thế Microsoft Office 365 Outlook) vào lộ trình sản phẩm trong `README.md`.
- Sửa lỗi đặt tên file gói Linux `.deb` và `packageName` trong `electron-builder.cjs` và `whitelabel.js` từ `genoffice` thành `vuaoffice`.

## [0.1.0] - 2026-08-10

### Added
- Khởi tạo thư mục `whitelabel` chứa file cấu hình `brand-config.json` và các assets logo, icon thương hiệu VuaOffice.
- Thêm CLI script `scripts/whitelabel.js` quản lý chu kỳ rebrand:
  - `apply`: Vá các file cấu hình build, thay thế text strings bằng regex, copy assets.
  - `restore`: Khôi phục codebase gốc qua git.
- Tích hợp 2 nhà cung cấp AI mới `omirouter` và `ninerouter` vào hệ thống core `@genoffice/ai-provider`:
  - Định nghĩa ID trong `packages/ai-provider/src/types.ts`.
  - Cấu hình metadata, default model, default Base URL, và đặt default provider là `omirouter` trong `packages/ai-provider/src/providers.ts`.
  - Định tuyến stream AI qua chuẩn OpenAI tương thích trong `packages/ai-provider/src/stream.ts`.
- Tạo 7 tài liệu kỹ thuật bắt buộc theo chuẩn dev software:
  - `IDEA.md`: Mô tả ý tưởng rebrand VuaOffice và AI Router.
  - `REQUIREMENTS.md`: Yêu cầu chi tiết chức năng và phi chức năng.
  - `SPEC.md`: Đặc tả kỹ thuật chi tiết của engine và API integration.
  - `ARCH.md`: Sơ đồ kiến trúc Mermaid và Git workflow.
  - `DEPLOY_GUIDE.md`: Hướng dẫn thiết lập, dev, build và update code.
  - `CHANGELOGS.md`: Nhật ký phát triển này.

### Changed
- Sửa đổi CLI script `scripts/whitelabel.js` để tự động khôi phục (restore) toàn bộ các file được cấu hình động trong danh sách `textReplacements` thay vì chỉ khôi phục các file được định nghĩa tĩnh.

### Fixed
- Sửa lỗi thiếu module `@tiptap/extension-highlight` trong môi trường phát triển bằng cách chạy cài đặt node_modules và cấu hình import chính xác cho module Markdown.

---

**Trạng thái phiên bản:** Hoàn thành & Xác minh
**Ngày phát hành:** 2026-08-10
