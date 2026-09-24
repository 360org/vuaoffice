import re

# =====================================================================
# 1. apps/docs/src/renderer/i18n/strings-zotero.ts
# =====================================================================
p_zotero = "apps/docs/src/renderer/i18n/strings-zotero.ts"
with open(p_zotero, "r", encoding="utf-8") as f:
    c = f.read()

vi_zotero = """  vi: {
    zoteroCitation: 'Trích dẫn Zotero',
    zoteroCitationTip: 'Thêm trích dẫn bằng Zotero; đặt con trỏ vào trích dẫn hiện có để chỉnh sửa',
    zoteroBibliography: 'Thư mục tài liệu Zotero',
    zoteroBibliographyTip: 'Thêm hoặc chỉnh sửa danh mục tài liệu tham khảo bằng Zotero',
    zoteroRefresh: 'Làm mới',
    zoteroRefreshTip: 'Làm mới toàn bộ trích dẫn và thư mục tài liệu Zotero',
    zoteroDocumentSettings: 'Cài đặt tài liệu',
    zoteroDocumentSettingsTip: 'Cài đặt tài liệu Zotero',
    zoteroDocumentPreferences: 'Tùy chọn tài liệu',
    zoteroRemoveCodes: 'Xóa mã trường',
    zoteroConnectionError: 'Không thể kết nối với Zotero. Vui lòng khởi động Zotero và giữ ứng dụng luôn chạy.',
    zoteroOperationError: 'Thao tác Zotero thất bại.',
    zoteroNoteFieldsUnsupported:
      'Tài liệu này chứa trích dẫn Zotero trong chú thích cuối trang hoặc cuối tài liệu mà VuaOffice chưa thể cập nhật. Lệnh Zotero tạm tắt để giữ nguyên danh mục tài liệu tham khảo.',
    zoteroGroup: 'Zotero',
  },
})"""

if "vi: {" not in c:
    c = c.replace("})\n", vi_zotero + "\n")
    if not c.endswith("\n"): c += "\n"
    with open(p_zotero, "w", encoding="utf-8") as f:
        f.write(c)
    print("1. strings-zotero.ts updated with vi")

# =====================================================================
# 2. apps/docs/src/renderer/i18n/ribbon/vi.ts
# =====================================================================
p_rb_vi = "apps/docs/src/renderer/i18n/ribbon/vi.ts"
with open(p_rb_vi, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("ribbonGroupFont: 'Phông chữ',", "ribbonGrowFont: 'Tăng cỡ chữ',\n  ribbonFontEastAsia: 'Phông chữ Đông Á',\n  ribbonFontLatin: 'Phông chữ Latinh',")
with open(p_rb_vi, "w", encoding="utf-8") as f:
    f.write(c)
print("2. ribbon/vi.ts fixed typo and added font keys")

# =====================================================================
# 3. apps/docs/src/renderer/i18n/strings-ai.ts
# =====================================================================
p_ai_docs = "apps/docs/src/renderer/i18n/strings-ai.ts"
with open(p_ai_docs, "r", encoding="utf-8") as f:
    c = f.read()

docs_ai_extra = """    aiSumAcceptChanges: 'Chấp nhận sửa đổi',
    aiSumRejectChanges: 'Từ chối sửa đổi',
    aiSumInsertFootnote: 'Chèn chú thích cuối trang',
    aiSumInsertEndnote: 'Chèn chú thích cuối tài liệu',
    aiSumDeleteNote: 'Xóa chú thích cuối trang/cuối tài liệu',
    aiSumEditNote: 'Sửa chú thích cuối trang/cuối tài liệu',
    aiSumReadNotes: 'Đọc chú thích cuối trang/cuối tài liệu',
    aiSumAddComment: 'Thêm nhận xét mới',
    aiSumDeleteComment: 'Xóa nhận xét',
    aiSumAnalyzeMedia: 'Phân tích phương tiện',
    aiSumAnalyzeMediaDone: 'Đã phân tích phương tiện',
    aiSumWriteDocument: 'Soạn thảo tài liệu',
    aiSumWriteDocumentFailed: 'Soạn thảo tài liệu thất bại',
    aiSumWriteDocumentPartial: 'Tài liệu chỉ được soạn thảo một phần',
    aiWritingDocument: 'Đang soạn thảo tài liệu · {blocks} khối',
    aiPartialTitle: 'Nội dung chỉ được tạo một phần',
    aiPartialBody: 'Đã nhận {blocks} khối nội dung nhưng quá trình tạo bị ngắt. Bạn muốn giữ lại phần này hay hủy bỏ?',
    aiPartialAdopt: 'Giữ lại',
    aiPartialDiscard: 'Hủy bỏ',
    aiSumDefineStyle: 'Định nghĩa kiểu',
    aiSumSetWatermark: 'Thiết lập hình mờ',
    aiSumInsertTextBox: 'Chèn hộp văn bản',
    aiSumInsertPicture: 'Chèn hình ảnh',
    aiSumListStyles: 'Danh sách kiểu',
    aiSumSetPageSetup: 'Cập nhật thiết lập trang',
    aiSumInsertSectionBreak: 'Chèn dấu ngắt phần',
    aiCmdNoneUnchanged: '{count} khối khớp không có thay đổi, tài liệu được giữ nguyên.',
"""
c = c.replace("  vi: {\n", "  vi: {\n" + docs_ai_extra)
with open(p_ai_docs, "w", encoding="utf-8") as f:
    f.write(c)
print("3. strings-ai.ts updated with 27 missing keys")

# =====================================================================
# 4. apps/docs/src/renderer/i18n/strings-app.ts
# =====================================================================
p_app_docs = "apps/docs/src/renderer/i18n/strings-app.ts"
with open(p_app_docs, "r", encoding="utf-8") as f:
    c = f.read()

docs_app_extra = """    appDocTooLargeBlocks: '{name}: Tài liệu quá lớn ({blocks} đoạn, {chars} ký tự), không thể mở',
    appDocLargeReadOnly: 'Tài liệu rất lớn ({blocks} đoạn), đã mở ở chế độ chỉ đọc; nhấn Esc để bắt đầu chỉnh sửa',
    appDocLargeSpellOff: 'Tài liệu rất lớn ({blocks} đoạn), đã tắt kiểm tra chính tả khi nhập; có thể bật lại trong «Đánh giá › Chính tả»',
    appExportingImages: 'Đang xuất hình ảnh…',
    appExportImagesProgress: 'Đang xuất {count} hình ảnh…',
    appExportImagesDone: 'Đã xuất {count} hình ảnh vào {dir}',
    appExportImagesFailed: 'Xuất hình ảnh thất bại: {error}',
    appNavOutline: 'Mục lục',
    appPasteOptions: 'Tùy chọn dán',
    appPasteKeepSource: 'Giữ nguyên định dạng nguồn',
    appPasteMergeFormat: 'Hòa trộn định dạng',
    appPasteTextOnly: 'Chỉ giữ văn bản thuần',
    appPasteRememberDefault: 'Luôn sử dụng tùy chọn này',
    appViewImage: 'Xem hình ảnh',
    appSaveImageAs: 'Lưu hình ảnh thành…',
    appImgActualSize: 'Kích thước thực tế',
    appImgFitWindow: 'Vừa với cửa sổ',
"""
c = c.replace("  vi: {\n", "  vi: {\n" + docs_app_extra)
with open(p_app_docs, "w", encoding="utf-8") as f:
    f.write(c)
print("4. strings-app.ts updated with 17 missing keys")

# =====================================================================
# 5. apps/markdown/src/renderer/i18n/strings.ts
# =====================================================================
p_md_strings = "apps/markdown/src/renderer/i18n/strings.ts"
with open(p_md_strings, "r", encoding="utf-8") as f:
    c = f.read()

md_extra = """    aiPartialAdopt: 'Giữ lại',
    aiPartialBody: 'Đã nhận {blocks} khối nội dung nhưng quá trình tạo bị ngắt. Bạn muốn giữ lại phần này hay hủy bỏ?',
    aiPartialDiscard: 'Hủy bỏ',
    aiPartialTitle: 'Nội dung chỉ được tạo một phần',
    aiToolWriteDoc: 'Soạn thảo tài liệu',
    aiToolWriteDocFailed: 'Soạn thảo tài liệu thất bại',
    aiToolWriteDocPartial: 'Tài liệu chỉ được soạn thảo một phần',
    aiWritingDocument: 'Đang soạn thảo tài liệu · {blocks} khối',
    appExportImagesDone: 'Đã xuất {count} hình ảnh vào {dir}',
    appExportImagesFailed: 'Xuất hình ảnh thất bại: {error}',
    appExportImagesProgress: 'Đang xuất {count} hình ảnh…',
    appExportingImages: 'Đang xuất hình ảnh…',
    imageActualSize: 'Kích thước thực tế',
    imageFitWindow: 'Vừa với cửa sổ',
    insertWaveform: 'Biểu đồ thời gian',
    outlineResize: 'Điều chỉnh độ rộng mục lục',
    saveAs: 'Lưu thành…',
    saveImageAs: 'Lưu hình ảnh thành…',
    spellcheck: 'Kiểm tra chính tả',
    viewImage: 'Xem hình ảnh',
"""
c = c.replace("  vi: {\n", "  vi: {\n" + md_extra)
with open(p_md_strings, "w", encoding="utf-8") as f:
    f.write(c)
print("5. markdown strings.ts updated with 20 missing keys")

print("All i18n files patched successfully!")
