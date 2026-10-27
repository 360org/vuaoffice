import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@genoffice/ui/tokens.css'
import type { ScreenshotsApi } from '../shared/channels'
import { ScreenshotsEditor } from './ScreenshotsEditor'

interface ScreenshotsHost {
  getLanguage(): Promise<string>
  getTheme(): Promise<string>
  onLanguageChanged(handler: (lang: string) => void): () => void
  onThemeChanged(handler: (theme: string) => void): () => void
}

declare global {
  interface Window {
    screenshotsApi: ScreenshotsApi
    screenshotsHost: ScreenshotsHost
  }
}

function applyTheme(theme: string) {
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme)
  else document.documentElement.removeAttribute('data-theme')
}

function App({ initialLang }: { initialLang: string }) {
  const [lang, setLang] = useState(initialLang)
  useEffect(() => {
    const offTheme = window.screenshotsHost.onThemeChanged(applyTheme)
    const offLang = window.screenshotsHost.onLanguageChanged((next) => {
      setLang(next)
      document.documentElement.lang = next
    })
    return () => {
      offTheme()
      offLang()
    }
  }, [])
  return <ScreenshotsEditor api={window.screenshotsApi} lang={lang} />
}

void Promise.all([
  window.screenshotsHost.getLanguage().catch(() => 'en'),
  window.screenshotsHost.getTheme().catch(() => 'system'),
]).then(([lang, theme]) => {
  applyTheme(theme)
  document.documentElement.lang = lang
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialLang={lang} />
    </StrictMode>,
  )
})
