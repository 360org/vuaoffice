import { useEffect, useState } from 'react'
import type { DiagnosticReportData } from '../../shared/home-api'
import { useI18n } from './locale'

interface DiagnosticReportModalProps {
  onClose: () => void
}

const LOCAL_STRINGS: Record<string, Record<string, string>> = {
  vi: {
    modalTitle: 'Báo cáo Chẩn đoán & Log Hệ thống',
    modalDesc:
      'Thu thập thông tin hệ thống, môi trường thực thi và log lỗi gần nhất đã được làm sạch bảo mật.',
    loading: 'Đang khởi tạo báo cáo và kiểm tra kết nối...',
    refId: 'Mã định danh báo cáo (Reference ID)',
    copyId: 'Sao chép mã',
    copied: 'Đã sao chép!',
    userNoteLabel: 'Mô tả thêm về sự cố (Tùy chọn)',
    userNotePlaceholder:
      'Vui lòng mô tả thao tác vừa thực hiện hoặc lỗi bạn gặp phải để đội ngũ phát triển hỗ trợ nhanh nhất...',
    systemInfo: 'Thông tin Hệ thống & Môi trường',
    networkStatus: 'Trạng thái Kết nối Máy chủ & AI Gateway',
    sanitizedLogs: 'Bản xem trước Log Lỗi (Đã làm sạch)',
    logSizeInfo: '{kb} KB ({chars} ký tự)',
    copyLogs: 'Sao chép toàn bộ log',
    online: 'Hoạt động',
    offline: 'Mất kết nối',
    exportFile: 'Xuất ra tệp (Export to file)',
    sendToVuaOffice: 'Gửi tới VuaOffice',
    sending: 'Đang gửi báo cáo...',
    sendSuccess: 'Đã gửi báo cáo thành công tới VuaOffice Issues!',
    viewIssue: 'Xem Issue',
    sendError: 'Không thể gửi trực tiếp, bạn có thể xuất file báo cáo.',
    close: 'Đóng',
    exportSuccess: 'Đã lưu file báo cáo thành công tại: {path}',
    exportFail: 'Xuất file thất bại hoặc bị hủy.',
  },
  en: {
    modalTitle: 'Diagnostic & Log Report',
    modalDesc:
      'Collects sanitized environment metrics, system runtime stats, and recent error logs for troubleshooting.',
    loading: 'Generating diagnostic report and probing network reachability...',
    refId: 'Reference ID',
    copyId: 'Copy ID',
    copied: 'Copied!',
    userNoteLabel: 'Issue Description / User Note (Optional)',
    userNotePlaceholder:
      'Describe what you were doing when the issue occurred to help our engineers investigate...',
    systemInfo: 'System & Runtime Environment',
    networkStatus: 'Server & AI Gateway Reachability',
    sanitizedLogs: 'Sanitized Diagnostic Log Preview',
    logSizeInfo: '{kb} KB ({chars} characters)',
    copyLogs: 'Copy raw log',
    online: 'Online',
    offline: 'Offline',
    exportFile: 'Export to file',
    sendToVuaOffice: 'Send to VuaOffice',
    sending: 'Submitting report...',
    sendSuccess: 'Diagnostic report successfully submitted to VuaOffice Issues!',
    viewIssue: 'View Issue',
    sendError: 'Could not submit directly. You can export to a file.',
    close: 'Close',
    exportSuccess: 'Diagnostic report saved to: {path}',
    exportFail: 'Export canceled or failed.',
  },
  zh: {
    modalTitle: '诊断与系统日志报告',
    modalDesc: '收集已脱敏的运行环境指标、系统状态和最近错误日志，用于故障排除与技术支持。',
    loading: '正在生成诊断数据并测试服务连通性...',
    refId: '诊断报告编号 (Reference ID)',
    copyId: '复制编号',
    copied: '已复制！',
    userNoteLabel: '问题描述与附加说明（可选）',
    userNotePlaceholder: '请简要说明发生问题时的操作，帮助技术支持快速定位原因...',
    systemInfo: '系统与运行环境信息',
    networkStatus: '服务与 AI 网关连通性',
    sanitizedLogs: '已脱敏日志预览',
    logSizeInfo: '{kb} KB ({chars} 字符)',
    copyLogs: '复制完整日志',
    online: '正常',
    offline: '异常',
    exportFile: '导出为文件',
    sendToVuaOffice: '发送到 VuaOffice',
    sending: '正在提交报告...',
    sendSuccess: '报告已成功提交至 VuaOffice Issues！',
    viewIssue: '查看 Issue',
    sendError: '提交失败，您可以导出为本地文件。',
    close: '关闭',
    exportSuccess: '报告已成功保存至：{path}',
    exportFail: '导出已取消或失败。',
  },
}

export function DiagnosticReportModal({ onClose }: DiagnosticReportModalProps) {
  const { lang } = useI18n()
  const loc = LOCAL_STRINGS[lang] || LOCAL_STRINGS.en

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<DiagnosticReportData | null>(null)
  const [userNote, setUserNote] = useState('')
  const [copiedId, setCopiedId] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    issueUrl?: string
    error?: string
  } | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [showFullLogs, setShowFullLogs] = useState(false)

  useEffect(() => {
    let mounted = true
    void window.aiOffice.generateDiagnosticReport?.().then((data) => {
      if (mounted && data) {
        setReport(data)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleCopyId = () => {
    if (!report) return
    void navigator.clipboard.writeText(report.reportId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleCopyLogs = () => {
    if (!report) return
    void navigator.clipboard.writeText(report.rawText)
    setCopiedLogs(true)
    setTimeout(() => setCopiedLogs(false), 2000)
  }

  const handleExportFile = async () => {
    if (!report || !window.aiOffice.exportDiagnosticReport) return
    setExportNotice(null)
    const result = await window.aiOffice.exportDiagnosticReport(report)
    if (result.success && result.filePath) {
      setExportNotice(loc.exportSuccess.replace('{path}', result.filePath))
    } else if (result.error) {
      setExportNotice(result.error)
    }
  }

  const handleSendToVuaOffice = async () => {
    if (!report || sending || !window.aiOffice.sendDiagnosticReport) return
    setSending(true)
    setSubmitResult(null)
    try {
      const res = await window.aiOffice.sendDiagnosticReport(report, userNote)
      setSubmitResult(res)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setSubmitResult({ success: false, error: message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal diagnostic-modal"
        role="dialog"
        aria-modal="true"
        aria-label={loc.modalTitle}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden',
          borderRadius: '12px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--hover)',
                  color: 'var(--accent)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6 2h4M7 4h2M4 7a4 4 0 0 0 8 0V4H4v3zM2 7h2M12 7h2M3 11l2-1M13 11l-2-1M4 14l1.5-2M12 14l-1.5-2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>
                {loc.modalTitle}
              </h3>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              {loc.modalDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '0 4px',
            }}
            aria-label={loc.close}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingRight: '4px',
          }}
        >
          {loading || !report ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div className="load-more-spinner" style={{ width: '28px', height: '28px' }} />
              <span style={{ fontSize: '13px' }}>{loc.loading}</span>
            </div>
          ) : (
            <>
              {/* Reference ID Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {loc.refId}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--text)',
                      marginTop: '2px',
                    }}
                  >
                    {report.reportId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path
                      d="M3 10.5H2.5A1.5 1.5 0 0 1 1 9V2.5A1.5 1.5 0 0 1 2.5 1H9a1.5 1.5 0 0 1 1.5 1.5V3"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  {copiedId ? loc.copied : loc.copyId}
                </button>
              </div>

              {/* System & Runtime Metrics */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {loc.systemInfo}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '8px 12px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>App Version: </span>
                    <strong>v{report.system.appVersion}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Platform: </span>
                    <strong>
                      {report.system.osPlatform} ({report.system.osArch})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Electron / Node: </span>
                    <span>
                      v{report.system.electronVersion} / v{report.system.nodeVersion}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Memory: </span>
                    <span>
                      {report.system.freeMemoryMB}MB / {report.system.totalMemoryMB}MB
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Dev Mode: </span>
                    <span>{report.system.developerMode ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Language / Theme: </span>
                    <span>
                      {report.system.language} / {report.system.theme}
                    </span>
                  </div>
                </div>
              </div>

              {/* Server & AI Gateway Reachability */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                    <path
                      d="M2.5 8h11M8 2.5a9 9 0 0 1 2.5 5.5 9 9 0 0 1-2.5 5.5 9 9 0 0 1-2.5-5.5A9 9 0 0 1 8 2.5z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  {loc.networkStatus}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {report.networkReachability.map((ep) => (
                    <div
                      key={ep.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ color: 'var(--text)' }}>{ep.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ep.latencyMs !== undefined && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            {ep.latencyMs}ms
                          </span>
                        )}
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: ep.reachable ? 'rgba(46, 160, 67, 0.15)' : 'rgba(235, 87, 87, 0.15)',
                            color: ep.reachable ? '#2ea043' : '#eb5757',
                          }}
                        >
                          {ep.reachable ? loc.online : loc.offline}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Note Textarea */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--text)',
                  }}
                >
                  {loc.userNoteLabel}
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder={loc.userNotePlaceholder}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Sanitized Log Preview */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--hover)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowFullLogs((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                      style={{
                        transform: showFullLogs ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    {loc.sanitizedLogs}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                      ({loc.logSizeInfo
                        .replace('{kb}', String(Math.round(report.rawText.length / 1024) || 1))
                        .replace('{chars}', String(report.rawText.length))})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      color: 'var(--accent)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {copiedLogs ? loc.copied : loc.copyLogs}
                  </button>
                </div>
                {showFullLogs && (
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px 12px',
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, monospace',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: 'var(--text)',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    {report.rawText}
                  </pre>
                )}
              </div>

              {/* Status and Notifications */}
              {exportNotice && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: 'var(--hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  {exportNotice}
                </div>
              )}

              {submitResult && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    backgroundColor: submitResult.success ? 'rgba(46, 160, 67, 0.12)' : 'rgba(235, 87, 87, 0.12)',
                    border: `1px solid ${submitResult.success ? '#2ea043' : '#eb5757'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <span style={{ color: 'var(--text)' }}>
                    {submitResult.success ? loc.sendSuccess : submitResult.error || loc.sendError}
                  </span>
                  {submitResult.issueUrl && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '3px 8px', flexShrink: 0 }}
                      onClick={() => void window.aiOffice.openCloudProject?.(submitResult.issueUrl!)}
                    >
                      {loc.viewIssue}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportFile}
            disabled={loading || !report}
            style={{ fontSize: '12.5px' }}
          >
            {loc.exportFile}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '12.5px' }}
            >
              {loc.close}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSendToVuaOffice}
              disabled={loading || !report || sending}
              style={{
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {sending ? (
                <>
                  <div
                    className="load-more-spinner"
                    style={{ width: '12px', height: '12px', borderWidth: '2px' }}
                  />
                  {loc.sending}
                </>
              ) : (
                loc.sendToVuaOffice
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
