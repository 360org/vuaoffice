# VuaOffice Screenshots (`360/screenshots`)

Mô-đun chụp ảnh màn hình và chỉnh sửa ảnh chuyên nghiệp (Photo Annotation Editor) độc quyền của **360 CORP** cho bộ ứng dụng văn phòng **VuaOffice**.

Được thiết kế và phát triển độc lập (Cleanroom Architecture) phục vụ trọn vẹn nhu cầu chụp ảnh màn hình, biên tập vector và ghi chú tài liệu văn phòng trực tiếp bên trong VuaOffice.

---

## 🛡️ Tiêu Chuẩn Cách Ly Upstream (Upstream Protection)

Theo luật thép của VuaOffice:
- Mọi module độc quyền của 360 CORP **BẮT BUỘC nằm trong thư mục `360/`** (`360/brand-config.json`, `360/ocr/`, `360/tunnel/`, `360/screenshots/`).
- **100% Tài sản đồ họa tự vẽ**: Toàn bộ icon công cụ được thiết kế dạng vector SVG nội bộ, đồng bộ hoàn hảo với Semantic Tokens của VuaOffice (hỗ trợ Light / Dark / System mode), không phụ thuộc vào bất kỳ tài nguyên bên thứ ba nào.
- **Không xâm lấn vào cây thư mục `apps/`** của upstream `genspark-ai/genoffice` để tránh bị xung đột mã nguồn hoặc bị ghi đè mất tính năng khi thực hiện `git merge upstream/main`.
- Được bảo vệ và kiểm soát tự động qua cổng kiểm tra `tools/check-360-features.mjs`.

---

## 🎨 Tính Năng & Công Cụ Biên Tập Đồ Họa Vector

| Nhóm Tính Năng | Công Cụ & Thao Tác | Chi Tiết Kỹ Thuật |
|---|---|---|
| **Chế độ chụp** | `Area`, `Window`, `Fullscreen` | Tích hợp `/usr/sbin/screencapture` trên macOS và desktopCapturer trên Windows/Linux |
| **Mũi tên (Arrow)** | `ToolArrow` | Vẽ vector mũi tên nhọn với đầu mũi tên đối xứng, mượt mà |
| **Hình khối (Shapes)** | `ToolRect`, `ToolEllipse`, `ToolLine` | Khung viền chỉ dẫn chữ nhật, elip/tròn và đường kẻ thẳng |
| **Bút dạ quang (Marker)** | `ToolMarker` | Bút đánh dấu văn bản bán trong suốt (`rgba`, `alpha 0.4`, nét dày) |
| **Vẽ tự do (Pen)** | `ToolPen` | Nét vẽ tự do mượt mà cho ghi chú tay hoặc chữ ký |
| **Làm mờ / Che tin (Blur)** | `ToolBlur` | Thuật toán Pixelate không thể đảo ngược giúp bảo vệ dữ liệu nhạy cảm |
| **Văn bản (Text)** | `ToolText` | Chèn văn bản trực tiếp với đường viền tương phản cao đọc được trên mọi nền |
| **Đánh số thứ tự (Step)** | `ToolStep` (1, 2, 3...) | Huy hiệu số tròn tự động tăng số bước, tối ưu cho tài liệu hướng dẫn |
| **Cắt ảnh (Crop)** | `ToolCrop` | Khung cắt xén kích thước ảnh linh hoạt |
| **Xuất & Tác vụ** | `Save`, `Copy to Clipboard`, `Undo/Redo` | Sao chép 1-click vào Clipboard (PNG) hoặc lưu file ra đĩa (PNG/JPEG) |

---

## ⌨️ Bảng Phím Tắt Toàn Diện (Keyboard Shortcuts)

### 1. Phím tắt Chụp Màn Hình Toàn Hệ Thống (Global Hotkeys)
- `⌥⇧⌘1` (hoặc `Ctrl+Alt+Shift+1`): **Chụp vùng chọn (Area Selection)** — Kéo chọn vùng cần chụp.
- `⌥⇧⌘2` (hoặc `Ctrl+Alt+Shift+2`): **Chụp cửa sổ (Window Capture)** — Bắt trọn cửa sổ ứng dụng được trỏ.
- `⌥⇧⌘3` (hoặc `Ctrl+Alt+Shift+3`): **Chụp toàn màn hình (Fullscreen Capture)** — Chụp nhanh toàn bộ màn hình chính.

*(Phím tắt sử dụng tổ hợp kèm `Option/Alt` để tránh xung đột với phím tắt chụp màn hình mặc định của hệ điều hành macOS).*

### 2. Phím tắt Biên Tập Ảnh (In-App Photo Editor)
- **Tác vụ chung**:
  - `⌘C` / `Ctrl+C`: Sao chép ảnh đã vẽ vào Clipboard.
  - `⌘S` / `Ctrl+S`: Lưu ảnh ra file trên ổ đĩa.
  - `⌘V` / `Ctrl+V`: Dán ảnh từ Clipboard trực tiếp vào bàn vẽ.
  - `⌘Z` / `Ctrl+Z`: Hoàn tác (Undo).
  - `⇧⌘Z` / `Ctrl+Y`: Làm lại (Redo).
  - `Escape`: Hủy thao tác vẽ dở hoặc thoát hộp nhập văn bản.
- **Chọn nhanh công cụ (Single-key Tools)**:
  - `A`: Mũi tên (Arrow).
  - `R`: Khung chữ nhật (Rectangle).
  - `O`: Hình elip / tròn (Ellipse).
  - `L`: Đường thẳng (Line).
  - `P`: Bút vẽ tự do (Pen).
  - `H`: Bút dạ quang (Highlighter).
  - `T`: Chèn văn bản (Text).
  - `N`: Đánh số thứ tự các bước (Step Counter).
  - `B`: Làm mờ / Pixelate che thông tin nhạy cảm.
  - `C`: Cắt ảnh (Crop).
- **Màu sắc & Nét vẽ**:
  - Phím số `1` đến `8`: Chọn nhanh 8 màu preset tương ứng trên bảng màu.
  - Enter: Áp dụng cắt ảnh (khi đang ở chế độ Crop).

  - Phím số `1` đến `8`: Chọn nhanh 8 màu preset tương ứng.
  - `[`: Giảm độ dày nét vẽ (Mảnh hơn).
  - `]`: Tăng độ dày nét vẽ (Dày hơn).
- **Thu phóng (Zoom)**:
  - `⌘+` / `Ctrl++`: Phóng to.
  - `⌘-` / `Ctrl+-`: Thu nhỏ.
  - `⌘0` / `Ctrl+0`: Khôi phục tỷ lệ 100%.

---

## 🧪 Kiểm Thử

```bash
# Kiểm tra bảo toàn tính năng 360 CORP
node tools/check-360-features.mjs

# Chạy unit tests cho Screenshots module
npx vitest run --config 360/screenshots/vitest.config.ts
```
