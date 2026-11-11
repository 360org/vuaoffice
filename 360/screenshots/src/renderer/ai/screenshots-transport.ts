import { createIpcTransport, type AgentTransport } from '@genoffice/agent-core'

export function createScreenshotsTransport(getSettings: () => any): AgentTransport {
  return createIpcTransport<any>({
    onStream: (listener) => {
      const api = (window as any).screenshotsApi
      if (api?.onAiStream) {
        return api.onAiStream(listener)
      }
      return () => {}
    },
    start: async (request) => {
      const api = (window as any).screenshotsApi
      if (api?.aiStream) {
        await api.aiStream(request)
      }
    },
    cancel: async (requestId) => {
      const api = (window as any).screenshotsApi
      if (api?.aiStreamCancel) {
        await api.aiStreamCancel(requestId)
      }
    },
    getSettings,
    unknownErrorText: () => 'Đã có lỗi không xác định từ AI Gateway.',
    timeoutErrorText: () => 'Yêu cầu tới AI đã hết thời gian phản hồi.',
    creditsErrorText: () => 'Hạn mức token hoặc credit AI đã hết.',
    networkErrorText: () => 'Lỗi kết nối mạng tới AI Provider.',
    overloadedErrorText: () => 'Dịch vụ AI đang bận — vui lòng thử lại sau giây lát.',
    regionErrorText: () => 'Khu vực hiện tại không được hỗ trợ bởi model này.',
  })
}
