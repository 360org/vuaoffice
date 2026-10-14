
/**
 * Rút gọn định danh gói AI: chau-le-ba/pack/premium -> premium
 */
export function formatModelDisplayName(model: string): string {
  if (!model) return ''
  if (model.includes('/pack/')) {
    return model.split('/pack/').pop() || model
  }
  if (model.includes('/')) {
    return model.split('/').pop() || model
  }
  return model
}
import {
  AI_PROVIDERS,
  activeProvider,
  customEndpointLabel,
  resolveCustomEndpoints,
  upsertCustomEndpoint,
  type AiProviderId,
  type AiSettings,
} from '@genoffice/ai-provider/browser'

export interface AiModelPickerGroup {
  readonly id: AiProviderId
  /** set on custom groups: one group per saved endpoint */
  readonly endpoint?: string | undefined
  readonly label: string
  readonly models: readonly string[]
}

export interface AiModelPickerSelection {
  readonly provider: AiProviderId
  readonly endpoint?: string | undefined
  readonly model: string
}

/**
 * Providers the composer chip may switch to: Genspark while signed in, every
 * other vendor once its settings pass the same usability test the chat path
 * applies (`activeProvider`), so picking a row never lands on a 401. A model
 * typed into the settings page that is not in the catalog is listed first.
 */
export function aiModelPickerGroups(input: AiSettings, gskLoggedIn: boolean): AiModelPickerGroup[] {
  const settings = resolveCustomEndpoints(input)
  const groups: AiModelPickerGroup[] = []

  // VuaOffice: Chỉ hiển thị VuaAI Pro và danh sách các gói (pack) cấp phép từ vuahethong.net
  const vuaMeta = AI_PROVIDERS.find((m) => m.id === 'vuaaipro')
  if (vuaMeta) {
    const config = (settings.providers?.vuaaipro || {}) as any
    const stored = config?.model?.trim() ?? ''
    const serverPacks: string[] = Array.isArray(config?.models) ? config.models : []
    const rawList = stored && !serverPacks.includes(stored) ? [stored, ...serverPacks] : (serverPacks.length > 0 ? serverPacks : (stored ? [stored] : []))
    // Lọc bỏ hoàn toàn các model lẻ hardcoded nếu có
    const filteredPacks = rawList.filter((m) => !['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro', 'deepseek-chat', 'default_model'].includes(m))
    const displayPacks = filteredPacks.length > 0 ? filteredPacks : (stored ? [stored] : ['premium'])

    groups.push({
      id: 'vuaaipro',
      label: 'VuaAI Pro',
      models: displayPacks,
    })
  }

  return groups
}

export function aiModelPickerSelection(input: AiSettings): AiModelPickerSelection {
  const settings = resolveCustomEndpoints(input)
  const provider = activeProvider(settings)
  const meta = AI_PROVIDERS.find((m) => m.id === provider)
  const model = settings.providers?.[provider]?.model?.trim() || meta?.defaultModel || ''
  if (provider === 'custom' && settings.customEndpoint) {
    return { provider, endpoint: settings.customEndpoint, model }
  }
  return { provider, model }
}

export function withAiModelSelection(input: AiSettings, pick: AiModelPickerSelection): AiSettings {
  const settings = resolveCustomEndpoints(input)
  if (pick.provider === 'custom' && pick.endpoint) {
    const ep = settings.customEndpoints?.find((e) => e.id === pick.endpoint)
    if (ep) {
      return {
        ...upsertCustomEndpoint(settings, { ...ep, model: pick.model }, true),
        provider: 'custom',
      }
    }
  }
  const config = settings.providers[pick.provider] ?? { apiKey: '', model: '' }
  return {
    ...settings,
    provider: pick.provider,
    providers: { ...settings.providers, [pick.provider]: { ...config, model: pick.model } },
  }
}
