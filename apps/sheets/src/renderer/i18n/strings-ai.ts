import { defineStrings } from '@genoffice/i18n'
import { zh } from './ai/zh'
import { en } from './ai/en'
import { ja } from './ai/ja'
import { ko } from './ai/ko'
import { fr } from './ai/fr'
import { de } from './ai/de'
import { es } from './ai/es'
import { th } from './ai/th'
import { id } from './ai/id'
import { ru } from './ai/ru'
import { ar } from './ai/ar'
import { pt } from './ai/pt'
import { it } from './ai/it'
import { pl } from './ai/pl'
import { cs } from './ai/cs'
import { nl } from './ai/nl'
import { ms } from './ai/ms'
import { he } from './ai/he'
import { hi } from './ai/hi'
import { zhTW } from './ai/zh-TW'

/** User-visible copy for the ai/ panel and tool feedback (LLM prompts excluded) */
export const aiStrings = defineStrings({
  zh,
  en,
  ja,
  ko,
  fr,
  de,
  es,
  th,
  id,
  ru,
  ar,
  pt,
  it,
  pl,
  cs,
  nl,
  ms,
  he,
  hi,
  'zh-TW': zhTW,
  // Vietnamese is VuaOffice's own locale: upstream ships no vi/ shard, so the
  // dictionary lives inline here instead of in a ./*/vi.ts sibling.
  vi: {
    aiComposerPlaceholderBuild: 'Mô tả bảng, dữ liệu hoặc biểu đồ cần tạo…',
    aiEmptyBuildTitle: 'Để AI dựng sổ làm việc này cho bạn',
    aiEmptyBuildBody:
      'Mô tả bảng, dữ liệu hoặc biểu đồ bạn cần — AI sẽ tạo trực tiếp vào trang tính.',
    aiGskLoginBtn: 'Đăng nhập Genspark',
    aiUndelivered: 'Chưa gửi',
    aiRetry: 'Thử lại',
    aiOpenAssistant: 'Mở trợ lý AI',
    aiAskBtn: 'Hỏi AI',
    aiCheckBtn: 'AI Kiểm tra',
    aiCheckPrompt:
      'Kiểm tra trang tính này để tìm các vấn đề: 1) lỗi công thức (#REF!, #DIV/0!, v.v.), vùng chọn không bao phủ hết dữ liệu, hàng tổng cộng thiếu cột; 2) số và văn bản lẫn lộn trong một cột, định dạng ngày không nhất quán, giá trị ngoại lai rõ ràng và các hàng trùng lặp; 3) tổng cộng không khớp với các hàng chi tiết, cột phần trăm không có tổng bằng 100%. Liệt kê các vấn đề tìm thấy và đề xuất cách khắc phục',
    aiAnalyzeBtn: 'AI Phân tích',
    aiAnalyzePrompt:
      'Phân tích dữ liệu trong trang tính này và tóm tắt các phát hiện chính, xu hướng và điểm bất thường',
    aiSettingsTitle: 'Cài đặt AI',
    aiSetUp: 'Thiết lập AI',
    aiNewChat: 'Cuộc trò chuyện mới',
    aiCollapsePanel: 'Thu gọn bảng AI',
    aiHistorySep: '—— Cuộc trò chuyện trước đó ——',
    aiEmptyTitle: 'Hỏi AI về sổ làm việc này',
    aiEmptyBodyLine1: 'Mô tả thay đổi hoặc hỏi về dữ liệu.',
    aiThinkingAria: 'Đang suy nghĩ',
    aiThinking: 'Đang suy nghĩ…',
    aiWorkedSteps: 'Đã xử lý · {n} bước',
    aiGroupWorking: 'Đang xử lý…',
    aiWorking: 'Đang xử lý…',
    aiAutoApplied: 'Đã áp dụng {count} thay đổi',
    aiUndoTitle: 'Hoàn tác thay đổi AI này (tương tự ⌘Z)',
    aiUndo: 'Hoàn tác',
    aiPreviewAria: 'Xem trước thay đổi',
    aiProposedChanges: 'Các thay đổi đề xuất',
    aiChangeStructure: 'Cấu trúc',
    aiChangeFormat: 'Định dạng',
    aiChangeSheet: 'Trang tính',
    aiMoreCells: 'và thêm {count} ô nữa',
    aiCellEmpty: 'trống',
    aiRemoveAttachment: 'Xóa tệp đính kèm',
    aiAttachTitle: 'Đính kèm tệp cục bộ (hoặc kéo thả vào bảng)',
    aiComposerPlaceholder: 'Yêu cầu AI phân tích hoặc cập nhật sổ làm việc này…',
    aiHintIdle: 'Enter để gửi',
    aiHintBusy: 'Esc để dừng',
    aiHintIdleTitle: 'Enter để gửi · Shift+Enter để xuống dòng',
    aiSend: 'Gửi',
    aiStop: 'Dừng',
    aiInstructionAria: 'Chỉ dẫn AI',
    aiFileTooltip:
      'SHA-256 {sha}\\nKhi lưu chỉ ghi lại các mục đã chỉnh sửa; mọi thứ khác được giữ nguyên.',
    aiFileMeta: '{sheets} trang tính · {entries} mục',
    aiGensparkAccount: 'Tài khoản Genspark',
    aiAccountChecking: 'Đang kiểm tra…',
    aiLoggedIn: 'Đã đăng nhập',
    aiLoggedInAs: 'Đã đăng nhập: {email}',
    aiNotLoggedIn: 'Chưa đăng nhập (các tính năng AI yêu cầu tài khoản Genspark)',
    aiWaitingBrowserLogin: 'Đang chờ đăng nhập trên trình duyệt…',
    aiLoginGenspark: 'Đăng nhập Genspark',
    aiModel: 'Mô hình',
    aiCancel: 'Hủy',
    aiSave: 'Lưu',
    aiUnknownError: 'Lỗi không xác định',
    aiOverloadedError: 'Dịch vụ AI đang bận — vui lòng thử lại sau ít phút.',
    aiToolCreateDocument: 'Tạo tệp mới',
    aiToolCreatedDocument: 'Đã tạo {name}',
    aiTimeoutError:
      'Yêu cầu AI đã hết thời gian chờ: không có phản hồi từ mạng nên quá trình xử lý đã dừng. Vui lòng kiểm tra kết nối mạng và thử lại',
    aiNetworkError:
      'Sự cố mạng: không thể kết nối tới dịch vụ AI. Vui lòng kiểm tra kết nối mạng và thử lại',
    aiCreditsExhausted:
      'Tín dụng Genspark của bạn đã hết. Truy cập genspark.ai/pricing để nạp thêm, sau đó thử lại',
    aiToolWorkbookContext: 'Đọc thông tin sổ làm việc',
    aiToolReadRange: 'Đọc vùng dữ liệu',
    aiToolReadRangeOf: 'Đọc vùng dữ liệu {range}',
    aiToolAggregate: 'Tổng hợp vùng dữ liệu',
    aiToolAggregateOf: 'Tổng hợp vùng dữ liệu {range}',
    aiToolLoadGuide: 'Tải hướng dẫn',
    aiToolLoadGuideOf: 'Tải hướng dẫn {names}',
    aiToolReadFormats: 'Đọc định dạng',
    aiToolReadFormatsOf: 'Đọc định dạng {range}',
    aiToolSheetFeatures: 'Đọc trạng thái tính năng trang tính',
    aiToolReadCells: 'Đọc các ô',
    aiToolReadCellsCount: 'Đọc {count} ô',
    aiToolPropose: 'Lập kế hoạch thay đổi',
    aiToolReadAttachment: 'Đọc tệp đính kèm',
    aiToolReadAttachmentOf: 'Đọc tệp đính kèm {name}',
    aiToolImageAttachment: 'Đính kèm hình ảnh {name}',
    aiToolReadFile: 'Đọc {name}',
    aiToolWebSearch: 'Tìm kiếm web',
    aiToolWebSearchDone: 'Đã tìm kiếm "{query}" ({count} kết quả)',
    aiToolFindCells: 'Tìm ô',
    aiToolFindCellsOf: 'Đã tìm thấy "{query}" ({count} khớp)',
    aiToolFindErrors: 'Đã quét tìm lỗi công thức (tìm thấy {count})',
    aiToolSelectRange: 'Chọn vùng dữ liệu',
    aiToolSelectRangeOf: 'Đã chọn {range}',
    aiToolImageSearch: 'Tìm kiếm hình ảnh',
    aiToolImageSearchDone: 'Đã tìm hình ảnh "{query}" ({count} kết quả)',
    aiToolGenImage: 'Tạo hình ảnh',
    aiToolGenImageDone: 'Đã tạo hình ảnh',
    aiToolTracePrecedents: 'Dò tìm ô tiền đề',
    aiToolTracePrecedentsOf: 'Đã dò tìm ô tiền đề của {address}',
    aiToolTraceDependents: 'Dò tìm ô phụ thuộc',
    aiToolTraceDependentsOf: 'Đã dò tìm ô phụ thuộc của {address} ({count})',
    aiScopeRange: 'Đã chọn {range}',
    aiScopeColumn: 'Đã chọn cột "{name}"',
    aiScopeColumns: 'Đã chọn {names} — {count} cột',
    aiScopeRangeTip:
      'AI hiểu "cột này / các hàng này / phần được chọn" là vùng dữ liệu này và giữ cố định trong suốt lượt chạy sau khi bạn gửi',
    aiScopeClearTitle: 'Bỏ giới hạn vùng chọn và áp dụng cho toàn bộ trang tính',
  },
})
