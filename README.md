# VuaOffice (Bộ ứng dụng văn phòng AI 360 CORP)

> **Tài liệu chính thức dành cho Dự án VuaOffice (360 CORP)**  
> VuaOffice là bộ ứng dụng văn phòng tích hợp Trí tuệ nhân tạo (AI-Native Office Suite) dành cho macOS, Windows và Linux, được phát triển dựa trên dự án mã nguồn mở GenOffice theo Giấy phép Apache License 2.0.

---

## 🚀 Giới thiệu VuaOffice

VuaOffice bao gồm các ứng dụng làm việc cốt lõi trên nền tảng Electron với kiến trúc chia sẻ chung tầng Engine:

1. **VuaOffice Docs**: Trình soạn thảo văn bản `.docx` hỗ trợ AI patch theo đoạn, giữ nguyên bố cục ban đầu của tệp Word.
2. **VuaOffice Sheets**: Trình quản lý bảng tính `.xlsx` mở rộng trên nhân Univer, tích hợp engine Rust sidecar (calamine + IronCalc), biểu đồ Konva, Pivot Table và Slicer.
3. **VuaOffice Slides**: Trình trình chiếu `.pptx` hỗ trợ thiết kế slide, HarfBuzz text shaping và công cụ AI tạo nội dung.
4. **VuaOffice PDF**: Trình xem & chỉnh sửa tệp `.pdf` hỗ trợ chú thích, biểu mẫu, chữ ký số, chỉnh sửa văn bản thực tế trong luồng trang giữ nguyên phông chữ gốc, chuyển đổi PDF sang Word/Excel/PowerPoint cục bộ (pdf2docx) và phân tích nội dung qua AI.
5. **VuaOffice Markdown**: Trình soạn thảo định dạng `.md` khối Tiptap đồng bộ thời gian thực.
6. **VuaOffice Shell**: Khung ứng dụng trung tâm quản lý tab, cài đặt tài khoản 360 CORP, AI Router và tự động cập nhật (Auto-Update).
7. **VuaOffice Mail**: Trình quản lý Email & Lịch tích hợp AI (thay thế Microsoft Office 365 Outlook).

---

## 📦 Tải về phiên bản mới nhất (Releases)

Tất cả các bản build phát hành được đóng gói và kiểm tra tự động qua GitHub Actions:

| Nền tảng                          | Yêu cầu hệ thống    | Tệp cài đặt                                                                                                         |
| :-------------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------ |
| **macOS** (Apple Silicon `arm64`) | macOS 11+           | [VuaOffice-1.0.8-macOS-arm64.dmg](https://github.com/360org/vuaoffice/releases/latest) |
| **macOS** (Intel `x64`)           | macOS 11+           | [VuaOffice-1.0.8-macOS-x64.dmg](https://github.com/360org/vuaoffice/releases/latest)     |
| **Windows** (x64)                 | Windows 10 / 11     | [VuaOffice-1.0.8-Windows-x64-Setup.exe](https://github.com/360org/vuaoffice/releases/latest) |
| **Linux** (Debian / Ubuntu)       | x86_64, glibc 2.34+ | [vuaoffice_1.0.8_amd64.deb](https://github.com/360org/vuaoffice/releases/latest) |
| **Linux** (AppImage)              | x86_64, FUSE 2      | [VuaOffice-1.0.8.AppImage](https://github.com/360org/vuaoffice/releases/latest)   |

---

## 🔄 Quy trình Đồng bộ & Xử lý Conflict khi Pull từ Official Upstream

Để đảm bảo bộ ứng dụng **VuaOffice** luôn cập nhật các tính năng và bản sửa lỗi mới nhất từ dự án gốc (`genspark-ai/genoffice`) mà **KHÔNG BỊ ĐÈ** hoặc làm mất các tùy chỉnh thương hiệu & AI Provider của 360 CORP, nhà phát triển BẮT BUỘC tuân thủ quy trình sau:

### 1. Cơ chế Whitelabel độc lập (`scripts/whitelabel.js`)

Mọi cấu hình thương hiệu VuaOffice được lưu tập trung tại `whitelabel/brand-config.json`.

- Lệnh áp dụng branding: `npm run whitelabel:apply`
- Lệnh hoàn tác về codebase gốc: `npm run whitelabel:restore`
- Lệnh kiểm tra trạng thái: `npm run whitelabel:status`
- Lệnh kiểm tra cổng: `npm run brand:gate`

### 2. Các bước Pull & Merge không conflict

Khi cần đồng bộ code mới nhất từ upstream:

```bash
# Bước 1: Khai báo upstream (nếu chưa có) và fetch code mới nhất
npm run upstream:setup
git fetch upstream main

# Bước 2: Tạo nhánh sync riêng biệt và restore về chuỗi gốc upstream
git checkout -b sync/upstream-YYYYMMDD
npm run whitelabel:restore

# Bước 3: Tiến hành 3-way merge
git merge upstream/main

# Bước 4: Giải quyết xung đột và áp dụng lại nhận diện VuaOffice
npm run whitelabel:apply
npm run brand:gate

# Bước 5: Kiểm tra và hoàn tất merge vào main
npm run typecheck
git commit
```

<<<<<<< HEAD
---

## 🧠 Cấu hình AI Provider (OmiRouter / 9Router / Hermes / Custom)

VuaOffice hỗ trợ kết nối trực tiếp đến các AI Gateway của 360 CORP hoặc nhà cung cấp tùy chỉnh mà không phụ thuộc vào tài khoản Genspark mặc định:

- **OmiRouter AI**: Cấu hình mặc định với Base URL `https://api.omirouter.com/v1`
- **9Router AI**: Cấu hình với Base URL `https://api.9router.com/v1`
- **Hermes Agent**: Cấu hình với Base URL `https://hermes.vuahethong.com/v1`
- **Custom Provider**: Cho phép người dùng tự nhập OpenAI-compatible Endpoint & API Key tùy chọn ngay tại màn hình **AI Settings** trong menu tài khoản.

---

## 🛠️ Hướng dẫn Phát triển Local (Development)
=======
On Fedora / RHEL-family / openSUSE, install the rpm instead:

```bash
sudo dnf install ./genoffice-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./genoffice-<version>.x86_64.rpm  # openSUSE
```

The AppImage instead runs in place: install the FUSE 2 runtime
(`sudo apt install libfuse2`; on Ubuntu 24.04 the package is `libfuse2t64`),
make the file executable, then run it:

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

## Apps

| App             | Product                | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs`     | **GenOffice Docs**     | `.docx` word processor. Byte-preserving round trip: only dirty paragraphs are regenerated (paragraph patch), everything else in the original file is kept byte-for-byte, so opening and saving never breaks layout in Word. Paginated view whose line metrics reproduce the original document's layout, tracked changes, comments, styles, equations, ink.                                                                                                                                                                                                                                                                                                                                                                               |
| `apps/sheets`   | **GenOffice Sheets**   | `.xlsx` spreadsheet. UI built on the open-source [Univer](https://github.com/dream-num/univer) core (Apache-2.0) with a large layer of in-house extensions; `.xlsx` import/export runs through an in-house Rust sidecar (calamine + IronCalc), charts are rendered in-house (Konva), plus pivot tables, slicers, conditional formatting, and formula tracing.                                                                                                                                                                                                                                                                                                                                                                            |
| `apps/slides`   | **GenOffice Slides**   | `.pptx` presentations. In-house `.pptx` parse/render/edit engine with masters, charts, cropping, ink, and text shaping (HarfBuzz metrics).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `apps/pdf`      | **GenOffice PDF**      | `.pdf` viewer/editor on [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) + [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT): annotations, forms, outlines, stamps, signatures, page operations, and printing support. True text editing — paragraph selection with in-block reflow, alignment restoration, original-font preservation — and content-stream image insert/edit, all rewriting page content streams through [PDFium](https://pdfium.googlesource.com/pdfium/) wasm (BSD-3-Clause) with subset-embedded fonts — no cover-up annotations. Converts PDFs into editable Word, PowerPoint, and Excel files fully locally (`packages/pdf2docx`), with OCR support for scanned pages (system OCR on macOS and Windows). |
| `apps/markdown` | **GenOffice Markdown** | `.md` / `.markdown` editor: Tiptap block editor over plain Markdown files — headings, lists, tables, images, code blocks — saved back as plain Markdown, hosted in shell tabs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `apps/shell`    | **GenOffice**          | The suite shell: home screen, tabbed hosting of the five editors, light/dark/system theme, auto-update.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Every app embeds the same AI panel: block-granular AI editing with version
snapshots and diffs in docs, a tool-calling agent over workbook/slide/PDF
state in the others.

The whole suite ships light / dark / system UI themes built on shared design
tokens (`packages/ui`), with a CI guard that keeps chrome colors on the token
system. Document surfaces stay light in dark mode — Word-style dark chrome
around white paper — so files render and export identically in both themes.

**AI backends — Genspark sign-in or bring your own key.** By default the
apps sign in to a Genspark account through a device-code flow — no model API
key to enter — and model calls route through the Genspark proxy (Claude,
GPT, and Gemini families). Or bring your own key (BYOK) in the AI settings:
Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao, MiniMax, Grok,
Mistral, and OpenRouter are built in, plus a custom provider slot for any
OpenAI-compatible endpoint (base URL + key), local servers included. A
Genspark account also unlocks the Genspark ("gsk") tool endpoints the agents
build on — web and image search, image generation and editing,
image/audio/video analysis, and audio transcription — all reachable through
`packages/ai-search` for anyone extending the agent layer.

## Engine packages

All pure TypeScript, no Electron dependency, unit-tested (except the UI kit):

- `packages/docx-engine` — docx parsing → block tree (with `docxIndex`
  anchors and passthrough), OOXML fragment generation, byte-level paragraph
  patching.
- `packages/pptx-engine` / `packages/pptx-render` — pptx model and rendering.
- `packages/pdf2docx` — local PDF → DOCX conversion: PDFium character-level
  extraction, pure-geometry layout analysis, rebuild through `docx-engine`;
  the same analysis drives the PDF app's PowerPoint and Excel exports.
- `packages/file-parse` — text extraction for AI attachments (office formats,
  text formats).
- `packages/agent-core` — the AI agent loop and skill composition shared by
  every app.
- `packages/ai-provider` — provider abstraction and streaming for the model
  backends.
- `packages/ai-search` — Genspark auth + web/image search tools.
- `packages/i18n`, `packages/ui`, `packages/project-store`,
  `packages/electron-utils` — shared i18n core, React UI kit, recent-files
  store, and Electron main-process helpers.

## Development
>>>>>>> upstream/main

```bash
# Cài đặt phụ thuộc
npm install

# Tạo dữ liệu test .docx fixtures
npm run fixtures

# Kiểm tra TypeScript & Unit test
npm run typecheck
npm test

# Chạy ứng dụng dev ở môi trường local
npm run dev

# Đóng gói sản phẩm cho macOS / Windows / Linux
npm run dist:mac
npm run dist:win
npm run dist:linux
```

---

## 📚 Cấu trúc Tài liệu Dự án (Documentation)

Toàn bộ tài liệu kiến trúc, đặc tả và hướng dẫn kỹ thuật của VuaOffice được tổ chức tập trung trong thư mục [`docs/`](docs/):

- **Tài liệu hệ thống cốt lõi**:
  - [Ý tưởng & Định hướng (`IDEA.md`)](docs/IDEA.md)
  - [Kiến trúc Tổng thể (`ARCH.md`)](docs/ARCH.md)
  - [Đặc tả Kỹ thuật (`SPEC.md`)](docs/SPEC.md)
  - [Yêu cầu Chức năng (`REQUIREMENTS.md`)](docs/REQUIREMENTS.md)
  - [Hướng dẫn Triển khai & Build (`DEPLOY_GUIDE.md`)](docs/DEPLOY_GUIDE.md)
  - [Nhật ký Phát triển (`CHANGELOGS.md`)](docs/CHANGELOGS.md)
  - [Chính sách Bảo mật (`SECURITY.md`)](docs/SECURITY.md)
  - [Hướng dẫn Đóng góp (`CONTRIBUTING.md`)](docs/CONTRIBUTING.md)
  - [Cấu hình AI Agent (`AGENTS.md`)](docs/AGENTS.md)
- **Tài liệu chi tiết theo từng Ứng dụng**:
  - [VuaOffice Docs](docs/docs/architecture.md)
  - [VuaOffice Sheets](docs/sheets/architecture.md)
  - [VuaOffice Slides](docs/slides/architecture.md)
  - [VuaOffice PDF](docs/pdf/architecture.md)
  - [VuaOffice Markdown](docs/markdown/architecture.md)
  - [VuaOffice Mail](docs/mail/architecture.md)
  - [VuaOffice Shell](docs/shell/architecture.md)

---

## ⚖️ Bản quyền & Ghi nhận (Attribution & License)

<<<<<<< HEAD
- **Mã nguồn**: VuaOffice được phát triển dựa trên dự án mã nguồn mở **GenOffice** tuân thủ theo [Apache License 2.0](LICENSE).
- **Ghi nhận tác giả (Attribution Notice)**:
  - **Original Work**: Copyright 2026 Mainfunc, Inc. (GenOffice).
  - **Derivative Work & Customizations**: Copyright 2026 360 CORP (VuaOffice).
- **Thương hiệu**: Nhãn hiệu "VuaOffice" và "360 CORP" thuộc sở hữu của 360 CORP. Nhãn hiệu "GenOffice" và "Genspark" thuộc sở hữu của Mainfunc, Inc.
=======
**Is GenOffice free?**
Yes. GenOffice is free and open-source under the Apache-2.0 license — no
trial, no paid tier for the apps themselves.

**Can GenOffice open Microsoft Word, Excel, and PowerPoint files?**
Yes. GenOffice opens and saves native `.docx`, `.xlsx`, and `.pptx` files.
Saving is byte-preserving: parts of the file you didn't touch are written
back byte-for-byte, so documents keep working in Microsoft Office.

**Does GenOffice work offline?**
Document editing is fully local — files never leave your machine to be
opened, edited, or saved. The AI features (agents, search, image tools) need
a network connection, with either a Genspark sign-in or your own model API
key (BYOK).

**Can GenOffice edit PDF files?**
Yes — real PDF text and image editing that rewrites the page content stream
with the original fonts preserved, not cover-up annotations.

**Can GenOffice convert PDF to Word, Excel, or PowerPoint?**
Yes — GenOffice converts PDFs into editable `.docx`, `.xlsx`, and `.pptx`
files entirely on-device: PDFium character-level extraction plus
geometry-based layout analysis, no cloud service, no upload. Scanned pages are
covered too — on macOS and Windows the system OCR reads them, so they convert
to editable text rather than a page image.

**Can I use my own AI model or API key?**
Yes. Besides the keyless Genspark sign-in, GenOffice supports bring your own
key (BYOK) for Claude, OpenAI, Gemini, DeepSeek, Kimi, GLM, Qwen, Doubao,
MiniMax, Grok, Mistral, and OpenRouter, plus any OpenAI-compatible endpoint
— including local model servers.

**Does GenOffice collect any data?**
Official packaged builds send limited usage analytics by default, and you can
disable reporting at any time under Settings → General. Analytics never sends
document content, file names, file paths, account identity, or email addresses.
See [GenOffice Privacy](PRIVACY.md) for the complete event and data disclosures.

## Security

See [SECURITY.md](SECURITY.md) for the process security posture (renderer
sandboxing, IPC validation, external-link gating) and the threat models for
AI-generated content.

## Acknowledgements

GenOffice would not be possible without these open-source projects:

- [Electron](https://www.electronjs.org/) — the desktop runtime for every app.
- [Univer](https://github.com/dream-num/univer) (Apache-2.0) — the spreadsheet
  UI core that Sheets extends.
- [PDFium](https://pdfium.googlesource.com/pdfium/) (BSD-3-Clause, bundled via
  [@embedpdf/pdfium](https://github.com/embedpdf/embed-pdf-viewer)) — the
  content-stream engine behind true PDF text and image editing.
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) and
  [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT) — PDF rendering and
  document assembly.
- [Tiptap](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/) —
  the block editors in Docs and Markdown.
- [Konva](https://konvajs.org/) — canvas rendering for Slides and Sheets
  charts.
- [HarfBuzz](https://github.com/harfbuzz/harfbuzz) (wasm) — text-shaping
  metrics for complex scripts.
- [calamine](https://github.com/tafia/calamine) and
  [IronCalc](https://github.com/ironcalc/IronCalc) — the read and calc layers
  of the Rust xlsx sidecar.
- Liberation, Carlito, Caladea, and Noto CJK fonts (OFL/Apache-2.0) — bundled
  document fonts.

## Third-party notices

`npm run notices` regenerates the bundled third-party license summary
(`tools/gen-third-party-notices.mjs`); all runtime dependencies are
MIT/Apache-2.0/BSD-3-Clause/OFL, and the bundled fonts (Liberation, Carlito,
Caladea, Noto CJK subsets) are OFL/Apache.

## License

GenOffice is licensed under the [Apache License 2.0](LICENSE), with one
exception: the `ee/` directory is reserved for future enterprise modules and
is covered by the [GenOffice Enterprise License](ee/LICENSE).

The GenOffice and Genspark names and logos are trademarks of Mainfunc, Inc.
The Apache-2.0 license does not grant permission to use them (see section 6);
forks should use their own branding.
>>>>>>> upstream/main
