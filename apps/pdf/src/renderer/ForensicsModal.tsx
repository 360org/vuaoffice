import type { ReactElement } from 'react'
import type { PdfForensicsReport } from '../shared/ipc'
import type { TFunc } from './i18n/locale'

export function ForensicsModal({
  report,
  fileName,
  t,
  onClose,
  onGotoPage,
}: {
  report: PdfForensicsReport
  fileName: string
  t: TFunc
  onClose: () => void
  onGotoPage?: (page: number) => void
}): ReactElement {
  const isOriginal = report.isOriginal

  return (
    <div className="pdf-modal-mask" onClick={onClose}>
      <div className="pdf-modal pdf-modal-wide pdf-forensics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-title">
          <span className={`forensics-modal-badge ${isOriginal ? 'original' : 'modified'}`}>
            {isOriginal ? '✓ ' + t('forensicsOriginalTitle') : '⚠️ ' + t('forensicsModifiedTitle')}
          </span>
        </div>

        <div className="pdf-forensics-summary">
          <p className="forensics-summary-desc">
            {isOriginal
              ? t('forensicsOriginalDesc')
              : t('forensicsModifiedDesc', { count: report.revisionCount })}
          </p>
          <div className="pdf-prop-table">
            <div className="pdf-prop-row">
              <span>{t('propFileName')}</span>
              <em>{fileName}</em>
            </div>
            <div className="pdf-prop-row">
              <span>{t('forensicsRevisions')}</span>
              <em>{t('forensicsRevisionsCount', { count: report.revisionCount })}</em>
            </div>
            {report.producer && (
              <div className="pdf-prop-row">
                <span>{t('propProducer')}</span>
                <em>{report.producer}</em>
              </div>
            )}
            {report.creator && (
              <div className="pdf-prop-row">
                <span>{t('propAuthor')}</span>
                <em>{report.creator}</em>
              </div>
            )}
            {report.creationDate && (
              <div className="pdf-prop-row">
                <span>{t('propCreated')}</span>
                <em>{report.creationDate}</em>
              </div>
            )}
            {report.modDate && (
              <div className="pdf-prop-row">
                <span>{t('propModified')}</span>
                <em style={{ color: report.datesDiffer ? 'var(--pdf-error)' : 'inherit', fontWeight: report.datesDiffer ? 600 : 'normal' }}>
                  {report.modDate} {report.datesDiffer ? `(${t('forensicsDatesMismatch')})` : ''}
                </em>
              </div>
            )}
          </div>
        </div>

        {!isOriginal && (
          <div className="pdf-forensics-details">
            <h4 className="forensics-section-title">{t('forensicsChangesDetected')} ({report.modifiedItems.length})</h4>
            <div className="forensics-list">
              {report.modifiedItems.length === 0 ? (
                <div className="forensics-item">
                  <div className="forensics-item-title">
                    {t('forensicsIncrementalUpdateNotice', { count: report.revisionCount })}
                  </div>
                </div>
              ) : (
                report.modifiedItems.map((item, idx) => (
                  <div key={idx} className="forensics-item">
                    <div className="forensics-item-header">
                      <span className="forensics-item-type">
                        {item.type === 'page_content' && '📝 ' + t('forensicsTypeContent')}
                        {item.type === 'annotation' && '✏️ ' + t('forensicsTypeAnnot')}
                        {item.type === 'page_added' && '➕ ' + t('forensicsTypePageAdd')}
                        {item.type === 'page_removed' && '➖ ' + t('forensicsTypePageRemove')}
                        {item.type === 'form_field' && '📋 ' + t('forensicsTypeForm')}
                        {item.type === 'metadata' && 'ℹ️ ' + t('forensicsTypeMeta')}
                      </span>
                      {item.pageNumber && (
                        <button
                          className="forensics-goto-btn"
                          onClick={() => {
                            if (item.pageNumber && onGotoPage) {
                              onGotoPage(item.pageNumber)
                              onClose()
                            }
                          }}
                        >
                          {t('forensicsGotoPage', { page: item.pageNumber })}
                        </button>
                      )}
                    </div>
                    <div className="forensics-item-desc">{item.description}</div>
                    {item.details && <div className="forensics-item-details">{item.details}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="pdf-modal-actions">
          <button className="pdf-modal-btn primary" onClick={onClose}>
            {t('ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
