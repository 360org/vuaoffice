import { useEffect, useState } from 'react'
import { AI_PROVIDERS } from '@genoffice/ai-provider'
import type { AiSettings, AiProviderId, AiProviderConfig } from '@genoffice/ai-provider'
import { useI18n } from './locale'

const LOCAL_STRINGS: Record<string, Record<string, string>> = {
  zh: {
    aiProvider: 'AI 服务商',
    apiKey: 'API 密钥',
    baseUrl: '接口地址 (Base URL)',
    model: '模型 (Model)',
    save: '保存',
    cancel: '取消',
    loading: '加载中...',
    customModel: '自定义模型...',
    customModelPlaceholder: '输入自定义模型名称',
    show: '显示',
    hide: '隐藏',
  },
  'zh-TW': {
    aiProvider: 'AI 服務商',
    apiKey: 'API 金鑰',
    baseUrl: '介面位址 (Base URL)',
    model: '模型 (Model)',
    save: '儲存',
    cancel: '取消',
    loading: '載入中...',
    customModel: '自訂模型...',
    customModelPlaceholder: '輸入自訂模型名稱',
    show: '顯示',
    hide: '隱藏',
  },
  ja: {
    aiProvider: 'AI プロバイダー',
    apiKey: 'API キー',
    baseUrl: 'ベース URL (Base URL)',
    model: 'モデル (Model)',
    save: '保存',
    cancel: 'キャンセル',
    loading: '読み込み中...',
    customModel: 'カスタムモデル...',
    customModelPlaceholder: 'カスタムモデル名を入力',
    show: '表示',
    hide: '非表示',
  },
  ko: {
    aiProvider: 'AI 제공자',
    apiKey: 'API 키',
    baseUrl: '기본 URL (Base URL)',
    model: '모델 (Model)',
    save: '저장',
    cancel: '취소',
    loading: '로딩 중...',
    customModel: '사용자 정의 모델...',
    customModelPlaceholder: '사용자 정의 모델 이름 입력',
    show: '표시',
    hide: '숨기기',
  },
  en: {
    aiProvider: 'AI Provider',
    apiKey: 'API Key',
    baseUrl: 'Base URL',
    model: 'Model',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    customModel: 'Custom Model...',
    customModelPlaceholder: 'Enter custom model name',
    show: 'Show',
    hide: 'Hide',
    devMode: 'Developer Mode (Multi-Endpoint)',
    normalModeHint: 'Normal mode: Connects directly via 360 CORP Gateway (vuahethong.net / OmiRouter). Enable Developer Mode to configure custom API endpoints & models.',
  },
}

interface AiSettingsModalProps {
  onClose: () => void
  initialDevMode?: boolean
}

export function AiSettingsModal({ onClose, initialDevMode = false }: AiSettingsModalProps) {
  const { lang, t } = useI18n()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [activeTab, setActiveTab] = useState<AiProviderId>('vuaairouter')
  const [customModelOverrides, setCustomModelOverrides] = useState<Record<AiProviderId, string>>({} as Record<AiProviderId, string>)
  const [isCustomModelActive, setIsCustomModelActive] = useState<Record<AiProviderId, boolean>>({} as Record<AiProviderId, boolean>)
  const [showPassword, setShowPassword] = useState(false)

  const [isDeveloperMode, setIsDeveloperMode] = useState(initialDevMode)

  const loc = LOCAL_STRINGS[lang] || LOCAL_STRINGS.en

  useEffect(() => {
    const unsub = window.aiOffice.onDeveloperModeChanged?.((isDevMode) => {
      setIsDeveloperMode(isDevMode)
    })

    window.aiOffice
      .getAiSettings()
      .then((res) => {
        setSettings(res)
        setIsDeveloperMode(!!res.developerMode)
        if (res.provider) {
          setActiveTab(res.provider)
        }

        const initialCustomModelActive = {} as Record<AiProviderId, boolean>
        const initialCustomModelOverrides = {} as Record<AiProviderId, string>

        for (const meta of AI_PROVIDERS) {
          const config = res.providers?.[meta.id]
          if (config) {
            const hasPredefinedModels = meta.models && meta.models.length > 0
            if (hasPredefinedModels) {
              const isPredefined = meta.models.includes(config.model)
              if (!isPredefined && config.model) {
                initialCustomModelActive[meta.id] = true
                initialCustomModelOverrides[meta.id] = config.model
              } else {
                initialCustomModelActive[meta.id] = false
                initialCustomModelOverrides[meta.id] = ''
              }
            } else {
              initialCustomModelActive[meta.id] = true
              initialCustomModelOverrides[meta.id] = config.model
            }
          }
        }

        setIsCustomModelActive(initialCustomModelActive)
        setCustomModelOverrides(initialCustomModelOverrides)
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
          <div className="settings-loading">{loc.loading}</div>
        </div>
      </div>
    )
  }

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.target.value as AiProviderId
    setSettings((prev) => {
      if (!prev) return null
      return {
        ...prev,
        provider: nextProvider,
      }
    })
    setActiveTab(nextProvider)
  }

  const handleConfigChange = (providerId: AiProviderId, key: keyof AiProviderConfig, value: string) => {
    setSettings((prev) => {
      if (!prev) return null
      const currentProviderConfig = prev.providers[providerId] || { apiKey: '', model: '' }
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...currentProviderConfig,
            [key]: value,
          },
        },
      }
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    const finalizedProviders = { ...settings.providers }
    for (const meta of AI_PROVIDERS) {
      if (isCustomModelActive[meta.id] && customModelOverrides[meta.id]) {
        finalizedProviders[meta.id] = {
          ...finalizedProviders[meta.id],
          model: customModelOverrides[meta.id],
        }
      }
    }

    const nextSettings: AiSettings = {
      provider: isDeveloperMode ? activeTab : 'vuaairouter',
      providers: finalizedProviders,
      developerMode: isDeveloperMode,
    }

    window.aiOffice
      .setAiSettings(nextSettings)
      .then(() => {
        onClose() // Close the modal on successful save
      })
      .catch((err) => {
        console.error('Failed to save AI settings', err)
        // Optionally, show an error message to the user here
      })
  }

  const currentMeta = AI_PROVIDERS.find((p) => p.id === activeTab) || AI_PROVIDERS[0]!
  const currentConfig = settings.providers[activeTab] || { apiKey: '', model: '' }
  const hasPredefinedModels = currentMeta.models && currentMeta.models.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal ai-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('aiSettingsTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t('aiSettingsTitle')}</h3>
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
          {isDeveloperMode && (
            <div className="ai-settings-group">
              <label htmlFor="ai-provider-select">{loc.aiProvider}</label>
              <select
                id="ai-provider-select"
                className="ai-settings-select"
                value={activeTab}
                onChange={handleProviderChange}
              >
                {AI_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(isDeveloperMode && currentMeta.needsBaseUrl) && (
            <div className="ai-settings-group">
              <label htmlFor="ai-base-url-input">{loc.baseUrl}</label>
              <input
                id="ai-base-url-input"
                className="ai-settings-input"
                type="text"
                value={currentConfig.baseUrl || ''}
                onChange={(e) => handleConfigChange(activeTab, 'baseUrl', e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
          )}

          <div className="ai-settings-group">
            <label htmlFor="ai-api-key-input">{loc.apiKey}</label>
            <div className="input-password-wrap">
              <input
                id="ai-api-key-input"
                className="ai-settings-input"
                type={showPassword ? 'text' : 'password'}
                value={currentConfig.apiKey || ''}
                onChange={(e) => handleConfigChange(activeTab, 'apiKey', e.target.value)}
                placeholder={currentMeta.keyPlaceholder}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? loc.hide : loc.show}
              </button>
            </div>
          </div>

          <div className="ai-settings-group">
            <label htmlFor="ai-model-select-or-input">{loc.model}</label>
            {hasPredefinedModels ? (
              <>
                <select
                  id="ai-model-select-or-input"
                  className="ai-settings-select"
                  value={isCustomModelActive[activeTab] ? 'custom-model-override' : (currentConfig.model || currentMeta.defaultModel)}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'custom-model-override') {
                      setIsCustomModelActive((prev) => ({ ...prev, [activeTab]: true }))
                      if (!customModelOverrides[activeTab]) {
                        setCustomModelOverrides((prev) => ({ ...prev, [activeTab]: currentConfig.model || currentMeta.defaultModel }))
                      }
                    } else {
                      setIsCustomModelActive((prev) => ({ ...prev, [activeTab]: false }))
                      handleConfigChange(activeTab, 'model', val)
                    }
                  }}
                >
                  {currentMeta.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                  <option value="custom-model-override">{loc.customModel}</option>
                </select>

                {isCustomModelActive[activeTab] && (
                  <input
                    type="text"
                    className="ai-settings-input"
                    style={{ marginTop: '8px' }}
                    value={customModelOverrides[activeTab] || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomModelOverrides((prev) => ({ ...prev, [activeTab]: val }))
                    }}
                    placeholder={loc.customModelPlaceholder}
                    required
                  />
                )}
              </>
            ) : (
              <input
                id="ai-model-select-or-input"
                className="ai-settings-input"
                type="text"
                value={currentConfig.model || ''}
                onChange={(e) => handleConfigChange(activeTab, 'model', e.target.value)}
                placeholder="gpt-4o, claude-3-5-sonnet, etc."
                required
              />
            )}
          </div>

          <div className="modal-buttons" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {loc.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {loc.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
