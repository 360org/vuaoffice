import { useEffect, useState } from 'react'
import { AI_PROVIDERS } from '@genoffice/ai-provider/browser'
import type { AiSettings, AiProviderId, AiProviderConfig } from '@genoffice/ai-provider/browser'
import { useI18n } from './locale'

interface AiSettingsModalProps {
  onClose: () => void
  initialDevMode?: boolean
}

export function AiSettingsModal({ onClose, initialDevMode = false }: AiSettingsModalProps) {
  const { lang, t } = useI18n()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [isDeveloperMode, setIsDeveloperMode] = useState(initialDevMode)
  // Chỉ còn 1 state string cho custom model thay cho isCustomModelActive/Overrides phức tạp
  const [customModel, setCustomModel] = useState('')

  useEffect(() => {
    const unsub = window.aiOffice.onDeveloperModeChanged?.((isDevMode) => {
      setIsDeveloperMode(isDevMode)
    })

    window.aiOffice
      .getAiSettings()
      .then((res) => {
        setSettings(res)
        setIsDeveloperMode(!!res.developerMode)
        // Lấy model hiện tại của vuaaipro
        const currentModel = res.providers?.['vuaaipro']?.model || ''
        setCustomModel(currentModel)
      })
      .catch((err) => {
        console.error('Failed to load AI settings', err)
      })

    return () => {
      unsub?.()
    }
  }, [])

  if (!settings) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal ai-settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-loading">Đang tải...</div>
        </div>
      </div>
    )
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    const finalizedProviders = { ...settings.providers }
    // Ép cứng chỉ dùng vuaaipro
    finalizedProviders['vuaaipro'] = {
      ...(finalizedProviders['vuaaipro'] || { apiKey: '' }),
      model: customModel,
    }

    const nextSettings: AiSettings = {
      provider: 'vuaaipro',
      providers: finalizedProviders,
      developerMode: isDeveloperMode,
    }

    window.aiOffice
      .setAiSettings(nextSettings)
      .then(() => {
        onClose()
      })
      .catch((err) => {
        console.error('Failed to save AI settings', err)
      })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal ai-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('aiSettingsTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: 0 }}>Cấu hình AI Pack định tuyến</h3>
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

        <form className="ai-settings-form" onSubmit={handleSave}>
          <div className="ai-settings-group" style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              GenOffice tự động đồng bộ tài khoản AI của bạn qua vuahethong.net. Nhập mã định tuyến
              AI Pack của bạn vào ô dưới đây để sử dụng mô hình tùy chỉnh.
            </p>
          </div>

          <div className="ai-settings-group">
            <label htmlFor="ai-model-input">Mã định tuyến AI Pack</label>
            <input
              id="ai-model-input"
              className="ai-settings-input"
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="pack/u-..."
              required
            />
          </div>

          <div className="modal-buttons" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
