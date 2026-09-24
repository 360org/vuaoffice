import re

# 1. apps/sheets/src/renderer/i18n/app/vi.ts
p_app = "apps/sheets/src/renderer/i18n/app/vi.ts"
with open(p_app, "r", encoding="utf-8") as f:
    c = f.read()

# Xóa appNameBoxTitle và appDuplicateNeedsFullLoad
c = re.sub(r"^\s*appNameBoxTitle:.*?\n", "", c, flags=re.MULTILINE)
c = re.sub(r"^\s*appDuplicateNeedsFullLoad:.*?\n", "", c, flags=re.MULTILINE)

sheets_app_extra = """  appPrintPreparing: 'Đang chuẩn bị in…',
  appPrintSent: 'Đã gửi đến máy in.',
  appPrintCanceled: 'Đã hủy lệnh in.',
  appPrintFailed: 'Không thể in.',
  appPrintNeedsFullLoad: 'Quá trình in cần tải toàn bộ sổ làm việc — vui lòng chờ tải xong.',
  appCopyLoadingRange: 'Đang tải {range} để sao chép…',
  appCopyValuesOnly: '{range} đã sao chép dưới dạng giá trị thuần ({cells} ô): vượt quá {max} ô không giữ kiểu dáng.',
  appAutoFitRowHeight: 'Tự động chỉnh độ cao hàng',
  appAutoFitColWidth: 'Tự động chỉnh độ rộng cột',
"""

c = c.replace("export const vi = {\n", "export const vi = {\n" + sheets_app_extra)
with open(p_app, "w", encoding="utf-8") as f:
    f.write(c)
print("1. sheets app/vi.ts updated")

# 2. apps/sheets/src/renderer/i18n/dialogs/vi.ts
p_dlg = "apps/sheets/src/renderer/i18n/dialogs/vi.ts"
with open(p_dlg, "r", encoding="utf-8") as f:
    c = f.read()

sheets_dlg_extra = """  dlgFnCatDatabase: 'Cơ sở dữ liệu',
  dlgFnCatInformation: 'Thông tin',
  dlgFnCatEngineering: 'Kỹ thuật',
  dlgFnCatCube: 'Khối đa chiều',
  dlgFnCatCompatibility: 'Tương thích',
  dlgFnCatWeb: 'Web',
  dlgFnCatArray: 'Mảng',
  dlgFnCatOther: 'Khác',
"""

c = c.replace("export const vi = {\n", "export const vi = {\n" + sheets_dlg_extra)
with open(p_dlg, "w", encoding="utf-8") as f:
    f.write(c)
print("2. sheets dialogs/vi.ts updated")
