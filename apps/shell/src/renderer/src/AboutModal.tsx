import { useState } from 'react'
import { useI18n } from './locale'

const LOCAL_STRINGS: Record<string, Record<string, string>> = {
  zh: {
    aboutTitle: '关于 GenOffice',
    appName: 'GenOffice Suite',
    copyright: '© 2026 360 CORP. 保留所有权利。',
    licenseTitle: '软件许可与说明',
    licenseNotice: 'VuaOffice 是由 360 CORP 开发的企业级办公套件，集成了第三方开源组件，并作为专有免费软件（Proprietary Freeware）向最终用户免费分发。',
    thirdPartyNotice: '查看第三方开源组件与著作权声明',
    close: '关闭',
  },
  'zh-TW': {
    aboutTitle: '關於 GenOffice',
    appName: 'GenOffice Suite',
    copyright: '© 2026 360 CORP. 保留所有權利。',
    licenseTitle: '軟體許可與說明',
    licenseNotice: 'VuaOffice 是由 360 CORP 開發的企業級辦公軟體，整合了第三方開源組件，並作為專有免費軟體（Proprietary Freeware）向最終用戶免費分發。',
    thirdPartyNotice: '檢視第三方開源組件與著作權聲明',
    close: '關閉',
  },
  vi: {
    aboutTitle: 'Về GenOffice',
    appName: 'Bộ ứng dụng văn phòng GenOffice',
    copyright: '© 2026 360 CORP. Bảo lưu mọi quyền (All rights reserved).',
    licenseTitle: 'Giấy phép sử dụng & Bản quyền',
    licenseNotice: 'VuaOffice là bộ ứng dụng văn phòng được phát triển bởi 360 CORP, tích hợp các thành phần mã nguồn mở bên thứ ba và được phát hành dưới dạng Phần mềm độc quyền miễn phí (Proprietary Freeware) cho người dùng cuối.',
    thirdPartyNotice: 'Xem danh sách thư viện mã nguồn mở & Bản quyền bên thứ ba',
    close: 'Đóng',
  },
  en: {
    aboutTitle: 'About GenOffice',
    appName: 'GenOffice Suite',
    copyright: '© 2026 360 CORP. All rights reserved.',
    licenseTitle: 'License & Legal Notices',
    licenseNotice: 'VuaOffice is developed by 360 CORP, incorporating third-party open-source components and distributed as Proprietary Freeware for end users.',
    thirdPartyNotice: 'View Third-Party Open Source Components & Notices',
    close: 'Close',
  },
}

interface AboutModalProps {
  appVersion: string
  onClose: () => void
}

export function AboutModal({ appVersion, onClose }: AboutModalProps) {
  const { lang } = useI18n()
  const loc = LOCAL_STRINGS[lang] || LOCAL_STRINGS.en
  const [showFullNotice, setShowFullNotice] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-label={loc.aboutTitle}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '90%' }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{loc.aboutTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="about-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text)' }}>
          <div>
            <strong>{loc.appName}</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
              Version {appVersion || '0.6.0'}
            </div>
          </div>

          <div style={{ color: 'var(--text-secondary)' }}>
            {loc.copyright}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{loc.licenseTitle}</div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
              {loc.licenseNotice}
            </p>
          </div>

          <div style={{ marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowFullNotice(!showFullNotice)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
                textDecoration: 'underline',
              }}
            >
              {loc.thirdPartyNotice}
            </button>
          </div>

          {showFullNotice && (
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              Original Work: Copyright 2026 Mainfunc, Inc. (GenOffice){'\n'}
              Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);{'\n'}
              you may not use this file except in compliance with the License.{'\n'}
              You may obtain a copy of the License at:{'\n'}
              http://www.apache.org/licenses/LICENSE-2.0{'\n\n'}
              Derivative Work &amp; Customizations: Copyright 2026 360 CORP (https://github.com/360org/vuaoffice).{'\n'}
              Distributed as Proprietary Freeware for end users under 360 CORP terms of service, with original open-source copyright notices strictly preserved.{'\n\n'}
              Third-party dependency notices and license text files are bundled in the application installation package under Resources/THIRD-PARTY-NOTICES.txt and Resources/LICENSES.chromium.html.
            </div>
          )}

          <div className="modal-buttons" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {loc.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
