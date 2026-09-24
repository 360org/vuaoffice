import re

# 1. apps/pdf/src/renderer/i18n/strings.ts
p_pdf = "apps/pdf/src/renderer/i18n/strings.ts"
with open(p_pdf, "r", encoding="utf-8") as f: c = f.read()
c = c.replace(
    "  ocrNoText: 'Không tìm thấy chữ',\n",
    "  ocrNoText: 'Không tìm thấy chữ',\n  outlineGenerated: 'Tự động tạo từ tiêu đề',\n"
)
with open(p_pdf, "w", encoding="utf-8") as f: f.write(c)
print("1. apps/pdf/src/renderer/i18n/strings.ts patched")

# 2. apps/html/src/renderer/i18n/ai/vi.ts
p_html_ai = "apps/html/src/renderer/i18n/ai/vi.ts"
with open(p_html_ai, "r", encoding="utf-8") as f: c = f.read()
html_ai_extra = """  aiClarifyPrev: 'Câu trước',
  aiToolPlanFailed: 'Soạn thảo bản tóm tắt thất bại',
  aiDraftingBrief: 'Đang soạn thảo bản tóm tắt…',
"""
c = c.replace("export const vi = {\n", "export const vi = {\n" + html_ai_extra)
with open(p_html_ai, "w", encoding="utf-8") as f: f.write(c)
print("2. apps/html/src/renderer/i18n/ai/vi.ts patched")

# 3. apps/html/src/renderer/i18n/app/vi.ts
p_html_app = "apps/html/src/renderer/i18n/app/vi.ts"
with open(p_html_app, "r", encoding="utf-8") as f: c = f.read()
html_app_extra = """  elementPath: 'Đường dẫn phần tử',
  saveAs: 'Lưu thành…',
  ribbonGroupInsert: 'Chèn',
  insertMenu: 'Chèn',
  insertHeading: 'Tiêu đề',
  insertParagraph: 'Đoạn văn',
  insertList: 'Danh sách',
  insertButton: 'Nút',
  insertImage: 'Hình ảnh',
  insertSection: 'Khối nội dung',
  insertDivider: 'Đường phân cách',
  insertPlaceholderHeading: 'Tiêu đề mới',
  insertPlaceholderParagraph: 'Nhập văn bản tại đây.',
  insertPlaceholderListItem: 'Mục danh sách',
  insertPlaceholderButton: 'Nút',
  insertNoBody: 'Trang không có thẻ <body>, không thể chèn phần tử',
  insertTable: 'Bảng',
  insertImageUrl: 'Liên kết hình ảnh…',
  insertConfirm: 'Chèn',
  insertMore: 'Xem thêm',
  insertTableSize: 'Bảng {r}×{c}',
  insertTablePickSize: 'Chọn kích thước bảng',
  insertPlaceholderTableHeader: 'Tiêu đề {n}',
  insertPlaceholderTableCell: 'Nội dung',
  lockAspect: 'Khóa tỷ lệ khung hình',
"""
c = c.replace("export const vi = {\n", "export const vi = {\n" + html_app_extra)
with open(p_html_app, "w", encoding="utf-8") as f: f.write(c)
print("3. apps/html/src/renderer/i18n/app/vi.ts patched")

