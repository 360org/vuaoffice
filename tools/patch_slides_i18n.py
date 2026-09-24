import re

# 1. ai/vi.ts
p_ai = "apps/slides/src/renderer/i18n/ai/vi.ts"
with open(p_ai, "r", encoding="utf-8") as f: c = f.read()
c = c.replace("export const vi = {\n", "export const vi = {\n  aiClarifyPrev: 'Câu trước',\n")
with open(p_ai, "w", encoding="utf-8") as f: f.write(c)

# 2. app/vi.ts
p_app = "apps/slides/src/renderer/i18n/app/vi.ts"
with open(p_app, "r", encoding="utf-8") as f: c = f.read()
c = re.sub(r"^\s*appZoomButtonText:.*?\n", "", c, flags=re.MULTILINE)
app_extra = """  appStatusSlidesHidden: 'Đã ẩn {count} trang (bỏ qua khi trình chiếu)',
  appStatusSlidesUnhidden: 'Đã bỏ ẩn {count} trang',
  appStatusSectionsRemoved: 'Đã xóa tất cả các phần (giữ nguyên trang)',
  appStatusSectionSlidesRemoved: 'Đã xóa phần và các trang bên trong',
  appCtxRemoveAllSections: 'Xóa tất cả các phần',
  appCtxRemoveSectionSlides: 'Xóa phần và trang chiếu',
  appCtxCollapseAll: 'Thu gọn tất cả',
  appCtxExpandAll: 'Mở rộng tất cả',
  appCtxSelectAll: 'Chọn tất cả',
  appCtxResetSlide: 'Đặt lại trang chiếu',
  appCtxSizePosition: 'Kích thước và vị trí…',
  appCtxSetDefaultShape: 'Đặt làm hình dạng mặc định',
  appCtxEditPoints: 'Chỉnh sửa điểm đỉnh',
  appCtxSaveAsPicture: 'Lưu dưới dạng hình ảnh…',
  appStatusPictureSaved: 'Đã lưu hình ảnh vào {path}',
  appStatusPictureSaveFailed: 'Lưu hình ảnh thất bại: {error}',
  appCtxRegroup: 'Nhóm lại',
  appStatusZoomsInserted: 'Đã chèn {count} điểm thu phóng: bấm khi trình chiếu để chuyển đến trang tương ứng',
  appStatusSummaryZoomInserted: 'Đã chèn trang thu phóng tóm tắt ({count} ảnh thu nhỏ)',
  appSectionSummary: 'Phần tóm tắt',
  appSectionN: 'Phần {n}',
"""
c = c.replace("export const vi = {\n", "export const vi = {\n" + app_extra)
with open(p_app, "w", encoding="utf-8") as f: f.write(c)

# 3. panes/vi.ts
p_panes = "apps/slides/src/renderer/i18n/panes/vi.ts"
with open(p_panes, "r", encoding="utf-8") as f: c = f.read()
panes_extra = """  paneAnimEffMediaPlay: 'Phát',
  paneAnimEffMediaPause: 'Tạm dừng',
  paneAnimEffMediaStop: 'Dừng',
  paneShowMenuNext: 'Trang kế tiếp',
  paneShowMenuPrev: 'Trang trước',
  paneShowMenuLastViewed: 'Đã xem gần nhất',
  paneShowMenuSeeAll: 'Xem tất cả trang chiếu',
  paneShowMenuScreen: 'Màn hình',
  paneShowMenuBlack: 'Màn hình đen',
  paneShowMenuWhite: 'Màn hình trắng',
  paneShowMenuEnd: 'Kết thúc trình chiếu',
  panePresenterWhiteOn: 'Đang màn hình trắng (nhấn phím W để trở lại)',
"""
c = c.replace("export const vi = {\n", "export const vi = {\n" + panes_extra)
with open(p_panes, "w", encoding="utf-8") as f: f.write(c)

# 4. ribbon/vi.ts
p_ribbon = "apps/slides/src/renderer/i18n/ribbon/vi.ts"
with open(p_ribbon, "r", encoding="utf-8") as f: c = f.read()
c = re.sub(r"^\s*ribbonZoomJumpItem:.*?\n", "", c, flags=re.MULTILINE)
ribbon_extra = """  ribbonNumberStyle: 'Kiểu đánh số',
  ribbonNumberStartAt: 'Số bắt đầu',
  ribbonNumberStartAtTip: 'Giá trị số bắt đầu (nhấn Enter để áp dụng)',
  ribbonBulletCustom: 'Ký hiệu tùy chỉnh',
  ribbonBulletCustomTip: 'Nhập ký tự bất kỳ, nhấn Enter để áp dụng',
  ribbonBulletPicture: 'Hình ảnh…',
  ribbonTableInsertDialog: 'Chèn bảng…',
  ribbonTableColsLabel: 'Số cột',
  ribbonTableRowsLabel: 'Số hàng',
  ribbonAnimMedia: 'Phương tiện',
  ribbonAnimMediaPlay: 'Phát',
  ribbonAnimMediaPause: 'Tạm dừng',
  ribbonAnimMediaStop: 'Dừng',
  ribbonZoomSummary: 'Thu phóng tóm tắt',
  ribbonZoomSection: 'Thu phóng phần',
  ribbonZoomSlide: 'Thu phóng trang chiếu',
  ribbonZoomSectionItem: 'Trang {n}　Phần {k}: {name}',
  ribbonZoomSelectedSlides: 'Đã chọn {n} trang chiếu',
  ribbonZoomSelectedSections: 'Đã chọn {n} phần',
"""
c = c.replace("export const vi = {\n", "export const vi = {\n" + ribbon_extra)
with open(p_ribbon, "w", encoding="utf-8") as f: f.write(c)

print("Slides i18n patched successfully")
