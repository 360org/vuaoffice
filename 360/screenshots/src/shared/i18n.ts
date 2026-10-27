/**
 * Strings of the Screenshots module. Vietnamese and English ship here; every
 * other UI language falls back to English (same degrade rule as @genoffice/i18n).
 */
const en = {
  title: 'Screenshots',
  homeSub: 'Capture & annotate',
  captureArea: 'Area',
  captureWindow: 'Window',
  captureFullscreen: 'Full screen',
  openImage: 'Open image',
  toolArrow: 'Arrow',
  toolRect: 'Rectangle',
  toolEllipse: 'Ellipse',
  toolLine: 'Line',
  toolPen: 'Pen',
  toolMarker: 'Highlighter',
  toolText: 'Text',
  toolStep: 'Step number',
  toolBlur: 'Pixelate',
  toolCrop: 'Crop',
  undo: 'Undo',
  redo: 'Redo',
  copy: 'Copy',
  save: 'Save…',
  zoomFit: 'Fit',
  zoomActual: '100%',
  color: 'Color',
  stroke: 'Stroke',
  applyCrop: 'Apply crop',
  cancel: 'Cancel',
  copied: 'Copied to clipboard',
  savedTo: 'Saved to {path}',
  copyFailed: 'Could not copy the image',
  textPlaceholder: 'Type, then Enter',
  emptyTitle: 'Capture your screen, then annotate it',
  emptyHint:
    'Use the buttons above, paste an image with {paste}, or press {area} anywhere — even while VuaOffice is in the background.',
  permissionHint:
    'macOS has not allowed VuaOffice to record the screen, so captures show only the desktop. Allow it in System Settings, then restart VuaOffice.',
  permissionOpen: 'Open System Settings',
  captureFailed: 'Screen capture failed: {error}',
  cropHint: 'Drag to choose the area to keep, then press Enter.',
  unsavedTitle: 'Save the annotated screenshot?',
  unsavedDetail: 'Your annotations will be lost if you close without saving.',
  unsavedSave: 'Save…',
  unsavedDiscard: "Don't Save",
  saveDialogTitle: 'Save screenshot',
  openDialogTitle: 'Open image',
  imageTooLarge: 'The image is too large to open (over 100 MB).',
  imageUnreadable: 'That file is not an image VuaOffice can read.',
}

export type ScreenshotsStrings = typeof en

const vi: ScreenshotsStrings = {
  title: 'Chụp màn hình',
  homeSub: 'Chụp & chú thích ảnh',
  captureArea: 'Vùng chọn',
  captureWindow: 'Cửa sổ',
  captureFullscreen: 'Toàn màn hình',
  openImage: 'Mở ảnh',
  toolArrow: 'Mũi tên',
  toolRect: 'Khung chữ nhật',
  toolEllipse: 'Hình elip',
  toolLine: 'Đường thẳng',
  toolPen: 'Bút vẽ',
  toolMarker: 'Bút dạ quang',
  toolText: 'Chữ',
  toolStep: 'Đánh số bước',
  toolBlur: 'Làm mờ',
  toolCrop: 'Cắt ảnh',
  undo: 'Hoàn tác',
  redo: 'Làm lại',
  copy: 'Sao chép',
  save: 'Lưu…',
  zoomFit: 'Vừa khung',
  zoomActual: '100%',
  color: 'Màu',
  stroke: 'Nét',
  applyCrop: 'Áp dụng cắt',
  cancel: 'Huỷ',
  copied: 'Đã sao chép vào bộ nhớ tạm',
  savedTo: 'Đã lưu vào {path}',
  copyFailed: 'Không sao chép được ảnh',
  textPlaceholder: 'Gõ chữ rồi nhấn Enter',
  emptyTitle: 'Chụp màn hình rồi chú thích ngay',
  emptyHint:
    'Dùng các nút phía trên, dán ảnh bằng {paste}, hoặc nhấn {area} ở bất kỳ đâu — kể cả khi VuaOffice đang chạy nền.',
  permissionHint:
    'macOS chưa cho phép VuaOffice ghi màn hình nên ảnh chụp chỉ thấy hình nền. Hãy cấp quyền trong Cài đặt hệ thống rồi khởi động lại VuaOffice.',
  permissionOpen: 'Mở Cài đặt hệ thống',
  captureFailed: 'Chụp màn hình thất bại: {error}',
  cropHint: 'Kéo để chọn vùng cần giữ, rồi nhấn Enter.',
  unsavedTitle: 'Lưu ảnh chụp đã chú thích?',
  unsavedDetail: 'Các chú thích sẽ mất nếu đóng mà không lưu.',
  unsavedSave: 'Lưu…',
  unsavedDiscard: 'Không lưu',
  saveDialogTitle: 'Lưu ảnh chụp màn hình',
  openDialogTitle: 'Mở ảnh',
  imageTooLarge: 'Ảnh quá lớn để mở (trên 100 MB).',
  imageUnreadable: 'Tệp này không phải ảnh mà VuaOffice đọc được.',
}

export const SCREENSHOTS_STRINGS = { en, vi } as const

export function screenshotsStrings(lang: string): ScreenshotsStrings {
  return lang === 'vi' ? vi : en
}

export function fill(text: string, params: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m)
}
