import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Screenshots AI Assistant Parity with VuaAI Pro (Word/Docs, Excel, PDF)', () => {
  const panelPath = join(__dirname, '../src/renderer/ai/ScreenshotsAiPanel.tsx')
  const cssPath = join(__dirname, '../src/renderer/screenshots.css')
  const mainPath = join(__dirname, '../src/renderer/main.tsx')

  const panelCode = readFileSync(panelPath, 'utf8')
  const cssCode = readFileSync(cssPath, 'utf8')
  const mainCode = readFileSync(mainPath, 'utf8')

  it('Case 1 (Initial Chat State): Starts with empty chat array, eliminating unwanted greeting bubble', () => {
    expect(panelCode).toContain('const [chat, setChat] = useState<ChatEntry[]>([])')
    expect(panelCode).not.toContain("text: 'Xin chào Sếp!")
  })

  it('Case 2 (Icon Parity - NewChat): Uses exact Docs IconNewChat SVG path (16x16, stroke 1.25)', () => {
    expect(panelCode).toContain('function IconNewChat({ size = 16 }')
    expect(panelCode).toContain('M 12.68 7.32 v -2.55 A 1.44 1.44 0 0 0 11.23 3.33 H 4.77')
    expect(panelCode).toContain('M 11.57 9.19 v 3.4 M 9.87 10.89 h 3.4')
  })

  it('Case 3 (Icon Parity - Collapse): Uses exact Docs IconSidebarCollapse SVG path (16x16, stroke 1.2)', () => {
    expect(panelCode).toContain('function IconSidebarCollapse({ size = 15 }')
    expect(panelCode).toContain('<rect x="1.5" y="2.5" width="13" height="11" rx="1" />')
    expect(panelCode).toContain('M12.5 8H8.1M9.8 5.9 7.7 8l2.1 2.1')
  })

  it('Case 4 (Header Action Gating): IconNewChat only renders when chat has turns (chat.length > 0)', () => {
    expect(panelCode).toMatch(/\{chat\.length\s*>\s*0\s*&&\s*\(\s*<button[\s\S]*?<IconNewChat/)
  })

  it('Case 5 (Empty State Architecture): Renders .ai-chat-empty with title, body, and starter list', () => {
    expect(panelCode).toContain('chat.length === 0 ? (')
    expect(panelCode).toContain('className="ai-chat-empty"')
    expect(panelCode).toContain('className="ai-chat-empty-title"')
    expect(panelCode).toContain('className="ai-chat-empty-body"')
    expect(panelCode).toContain('className="ai-starter-list"')
  })

  it('Case 6 (Empty State Starter Prompts): Clicking starter fills composer and focuses inputRef', () => {
    expect(panelCode).toContain('setInput(p.prompt)')
    expect(panelCode).toContain('inputRef.current?.focus()')
    expect(panelCode).toContain('inputRef = useRef<HTMLTextAreaElement>(null)')
    expect(panelCode).toContain('textareaRef={inputRef}')
  })

  it('Case 7 (Unified Tooltips): Uses data-tip with installScreenTips instead of native browser title', () => {
    expect(mainCode).toContain('installScreenTips()')
    expect(panelCode).toContain('data-tip="Cuộc trò chuyện mới"')
    expect(panelCode).toContain('data-tip="Thu gọn bảng điều khiển"')
    expect(panelCode).toContain('data-tip="Sao chép câu trả lời"')
    expect(panelCode).toContain('data-tip="Tạo lại câu trả lời"')
  })

  it('Case 8 (Design Tokens in CSS): .ai-chat padding and empty-state typography match Docs standards', () => {
    expect(cssCode).toContain('padding: 32px 16px;')
    expect(cssCode).toContain('margin-top: 36px;')
    expect(cssCode).toContain('font-size: var(--text-body-lg, 18px);')
    expect(cssCode).toContain('font-size: var(--text-small, 14px);')
  })

  it('Case 9 (Composer Textarea Metrics): Matches 14px/24px line height and 48px min-height of Docs', () => {
    expect(cssCode).toContain('font-size: 14px;')
    expect(cssCode).toContain('line-height: 24px;')
    expect(cssCode).toContain('min-height: 48px;')
    expect(cssCode).toContain('max-height: 168px;')
    expect(cssCode).toContain('padding: 0 14px;')
  })

  it('Case 10 (Track Changes Button): Uses semantic CSS variables without raw hex colors', () => {
    expect(cssCode).toContain('.ai-track-btn.on {')
    expect(cssCode).toContain('background: var(--color-bg-subtle);')
    expect(cssCode).toContain('color: var(--color-text-primary);')
    expect(cssCode).not.toMatch(/\.ai-track-btn\.on\s*\{[^}]*#0077cd/)
  })

  it('Case 11 (Main Entrypoint UI Stylesheets): Imports all canonical @genoffice/ui CSS stylesheets', () => {
    expect(mainCode).toContain("@genoffice/ui/tokens.css")
    expect(mainCode).toContain("@genoffice/ui/screentip.css")
    expect(mainCode).toContain("@genoffice/ui/ai-model-picker.css")
    expect(mainCode).toContain("@genoffice/ui/ai-usage.css")
    expect(mainCode).toContain("@genoffice/ui/markdown.css")
    expect(mainCode).toContain("@genoffice/ui/ai-panel-prefs.css")
    expect(mainCode).toContain("@genoffice/ui/ai-scope-quote.css")
  })
})
