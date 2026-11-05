/**
 * End-to-end check of the Screenshots tab on the real built shell (23 cases:
 * every tool, undo/redo, crop, clipboard, PNG/JPEG save, close guard, theme,
 * hotkeys, IPC trust boundary). Run after `npm run build -w @genoffice/shell`:
 *   node 360/screenshots/tests/app.e2e.mjs
 * Exits non-zero when any case fails.
 */
import { _electron as electron } from 'playwright'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(import.meta.url)
import { mkdtempSync, writeFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const ud = mkdtempSync(join(tmpdir(), 'vo-ss-'))
const outDir = mkdtempSync(join(tmpdir(), 'vo-ss-out-'))
writeFileSync(join(ud, 'app-settings.json'), JSON.stringify({ onboardingSeen: true }))
const { ELECTRON_RUN_AS_NODE, ...env } = process.env
const app = await electron.launch({
  executablePath: require('electron'),
  args: [join(ROOT, 'apps/shell')],
  env: { ...env, GENOFFICE_USER_DATA: ud, GENOFFICE_NO_SPARE_VIEW: '1', GENOFFICE_LANG: 'vi' },
  timeout: 60000,
})
const errs = []
app.process().stderr.on('data', (d) => { const s = String(d); if (/Uncaught|TypeError|ReferenceError|screenshots/i.test(s) && !/chrome-pressed|EGL/.test(s)) errs.push(s.slice(0, 300)) })
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }

const home = await app.firstWindow({ timeout: 60000 })
await home.waitForSelector('.quick-cards', { timeout: 30000 })
await home.locator('.quick-card', { hasText: 'Screenshots' }).first().click()
const findSS = async () => { for (let i = 0; i < 80; i++) { for (const w of app.windows()) if ((await w.evaluate(() => location.href).catch(() => '')).includes('screenshots')) return w; await new Promise((r) => setTimeout(r, 250)) } return null }
const ss = await findSS()
check('1. Mở tab Screenshots từ thẻ Home', ss)
await ss.waitForSelector('.ss-root')
ss.on('pageerror', (e) => errs.push('pageerror ' + e.message))

// 2. single tab: clicking the card again focuses the same tab
await home.locator('.quick-card', { hasText: 'Screenshots' }).first().click().catch(() => {})
await home.waitForTimeout(400)
const tabCount = await home.evaluate(() => [...document.querySelectorAll('.tab-item')].filter((t) => /Chụp màn hình/.test(t.textContent)).length)
check('2. Mở lại không nhân đôi tab', tabCount === 1, `${tabCount} tab`)

// 3. paste an image (400x300 white with a black square) through a real paste event
await ss.bringToFront?.()
await ss.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 300
  const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 400, 300)
  g.fillStyle = '#000000'; g.fillRect(20, 20, 60, 60)
  g.fillStyle = '#123456'; g.font = '28px sans-serif'; g.fillText('SECRET 1234', 150, 250)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'p.png', { type: 'image/png' }))
  window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }))
})
await ss.waitForSelector('canvas.ss-canvas', { timeout: 10000 })
await ss.waitForTimeout(300)
const dims = await ss.evaluate(() => { const c = document.querySelector('canvas.ss-canvas'); return { w: c.width, h: c.height } })
check('3. Dán ảnh từ clipboard (⌘V) vào bàn vẽ', dims.w === 400 && dims.h === 300, `${dims.w}x${dims.h}`)

// helpers: image px -> screen px, read a pixel of the live canvas
const toScreen = async (x, y) => ss.evaluate(([x, y]) => { const c = document.querySelector('canvas.ss-canvas'); const r = c.getBoundingClientRect(); return [r.left + (x * r.width) / c.width, r.top + (y * r.height) / c.height] }, [x, y])
const px = async (x, y) => ss.evaluate(([x, y]) => [...document.querySelector('canvas.ss-canvas').getContext('2d').getImageData(x, y, 1, 1).data], [x, y])
const drag = async (a, b, steps = 8) => { const [x1, y1] = await toScreen(...a); const [x2, y2] = await toScreen(...b); await ss.mouse.move(x1, y1); await ss.mouse.down(); await ss.mouse.move(x2, y2, { steps }); await ss.mouse.up(); await ss.waitForTimeout(120) }
const tool = async (label) => { await ss.click(`.ss-toolbar button[aria-label="${label}"]`); await ss.waitForTimeout(60) }
const shapesCount = () => ss.evaluate(() => document.querySelector('.ss-root') && window.__ssShapes?.())
const isRed = ([r, g, b]) => r > 180 && g < 90 && b < 90

// 4. arrow
await tool('Mũi tên'); await drag([120, 60], [300, 140])
const arrowPx = await px(210, 100)
check('4. Vẽ mũi tên (A)', isRed(arrowPx), JSON.stringify(arrowPx))

// 5. rectangle outline (edge red, inside untouched)
await tool('Khung chữ nhật'); await drag([40, 120], [140, 200])
const rectEdge = await px(90, 120), rectIn = await px(90, 160)
check('5. Vẽ khung chữ nhật (R): viền đỏ, ruột giữ nguyên', isRed(rectEdge) && rectIn[0] > 240 && rectIn[1] > 240, `${rectEdge} / ${rectIn}`)

// 6. ellipse
await tool('Hình elip'); await drag([200, 150], [300, 210])
check('6. Vẽ hình elip (O)', isRed(await px(250, 150)) || isRed(await px(250, 151)))

// 7. color switch via keyboard digit 5 (360 blue) + line
await ss.keyboard.press('5'); await tool('Đường thẳng'); await drag([10, 290], [390, 290])
const linePx = await px(200, 290)
check('7. Phím số đổi màu + vẽ đường thẳng (L)', linePx[2] > 150 && linePx[0] < 60, JSON.stringify(linePx))

// 8. pen freehand
await ss.keyboard.press('1'); await tool('Bút vẽ'); await drag([330, 30], [390, 90], 15)
check('8. Bút vẽ tự do (P)', isRed(await px(360, 60)))

// 9. highlighter semi-transparent over the black square
await ss.keyboard.press('3'); await tool('Bút dạ quang'); await drag([15, 50], [85, 50], 10)
const hl = await px(50, 50)
check('9. Bút dạ quang bán trong suốt (H)', hl[0] > 40 && hl[0] < 200 && hl[2] < 60, JSON.stringify(hl))

// 10. step numbers 1 and 2
await ss.keyboard.press('1'); await tool('Đánh số bước')
for (const [x, y] of [[350, 200], [380, 230]]) { const [sx, sy] = await toScreen(x, y); await ss.mouse.click(sx, sy) }
await ss.waitForTimeout(150)
check('10. Đánh số bước tự tăng (N)', isRed(await px(342, 192)) && isRed(await px(372, 222)))

// 11. text
await tool('Chữ'); { const [sx, sy] = await toScreen(150, 20); await ss.mouse.click(sx, sy) }
await ss.waitForSelector('.ss-text-input'); await ss.keyboard.type('Ghi chú'); await ss.keyboard.press('Enter'); await ss.waitForTimeout(150)
const textPainted = await ss.evaluate(() => { const g = document.querySelector('canvas.ss-canvas').getContext('2d'); const d = g.getImageData(150, 20, 140, 30).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 90) red++; return red })
check('11. Chèn chữ (T) có viền tương phản', textPainted > 30, `${textPainted} px đỏ`)

// 12. pixelate: the dark text pixels are gone (blocks average them with the white page)
const darkest = () => ss.evaluate(() => { const d = document.querySelector("canvas.ss-canvas").getContext("2d").getImageData(150, 225, 200, 35).data; let m = 255; for (let i = 0; i < d.length; i += 4) m = Math.min(m, 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); return Math.round(m) })
const darkBefore = await darkest()
await tool("Làm mờ"); await drag([145, 220], [355, 262])
const darkAfter = await darkest()
check("12. Làm mờ pixelate che chữ nhạy cảm (B)", darkBefore < 80 && darkAfter > 120, `độ tối nhất ${darkBefore} → ${darkAfter}`)

// 13. undo / redo: the whole region goes back and forth
const regionHash = () => ss.evaluate(() => { const d = document.querySelector("canvas.ss-canvas").getContext("2d").getImageData(140, 215, 220, 50).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h })
const hBlur = await regionHash()
await ss.keyboard.press("Meta+z"); await ss.waitForTimeout(150)
const hUndo = await regionHash()
await ss.keyboard.press("Meta+Shift+z"); await ss.waitForTimeout(150)
const hRedo = await regionHash()
check("13. Hoàn tác ⌘Z / làm lại ⇧⌘Z", hUndo !== hBlur && hRedo === hBlur)

// 14. copy to the real system clipboard
await ss.keyboard.press('Meta+c'); await ss.waitForTimeout(500)
const clip = await app.evaluate(({ clipboard }) => { const i = clipboard.readImage(); return i.isEmpty() ? null : i.getSize() })
const toast = await ss.evaluate(() => document.querySelector('.ss-toast')?.textContent)
check('14. Sao chép ⌘C vào clipboard hệ thống', clip && clip.width === 400 && clip.height === 300, `${JSON.stringify(clip)} · "${toast}"`)

// 15. save PNG + JPEG through the real IPC (dialog stubbed to a temp path)
const pngPath = join(outDir, 'shot.png'), jpgPath = join(outDir, 'shot.jpg')
await tool('Bút vẽ'); await drag([300, 150], [330, 170])   // make it dirty again
await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }) }, pngPath)
await ss.keyboard.press('Meta+s'); await ss.waitForTimeout(800)
const pngOk = existsSync(pngPath) && readFileSync(pngPath).subarray(0, 4).toString('hex') === '89504e47'
await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }) }, jpgPath)
await ss.click('.ss-toolbar button[aria-label="Lưu…"]'); await ss.waitForTimeout(800)
const jpgOk = existsSync(jpgPath) && readFileSync(jpgPath).subarray(0, 3).toString('hex') === 'ffd8ff'
check('15. Lưu ⌘S ra PNG và JPEG', pngOk && jpgOk, `png ${pngOk ? statSync(pngPath).size : 0}B, jpg ${jpgOk ? statSync(jpgPath).size : 0}B`)

// 16. crop
await ss.keyboard.press('c'); await ss.waitForSelector('.ss-cropbar'); await drag([10, 10], [210, 110]); await ss.keyboard.press('Enter'); await ss.waitForTimeout(500)
const cropDims = await ss.evaluate(() => { const c = document.querySelector('canvas.ss-canvas'); return { w: c.width, h: c.height } })
check('16. Cắt ảnh (C + Enter)', Math.abs(cropDims.w - 200) <= 2 && Math.abs(cropDims.h - 100) <= 2, `${cropDims.w}x${cropDims.h}`)
await ss.keyboard.press('Meta+z'); await ss.waitForTimeout(400)
const uncrop = await ss.evaluate(() => { const c = document.querySelector('canvas.ss-canvas'); return { w: c.width, h: c.height } })
check('17. Hoàn tác phép cắt khôi phục ảnh gốc', uncrop.w === 400 && uncrop.h === 300, `${uncrop.w}x${uncrop.h}`)

// 17b. a new image (hotkey/paste/open) is undoable: annotations are never wiped
await tool('Mũi tên'); await drag([60, 200], [160, 240])
const hBefore = await ss.evaluate(() => { const d = document.querySelector('canvas.ss-canvas').getContext('2d').getImageData(0, 0, 400, 300).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h })
await ss.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 120; c.height = 80
  const g = c.getContext('2d'); g.fillStyle = '#00aa00'; g.fillRect(0, 0, 120, 80)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'n.png', { type: 'image/png' }))
  window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }))
})
await ss.waitForTimeout(500)
const replaced = await ss.evaluate(() => document.querySelector('canvas.ss-canvas').width)
await ss.keyboard.press('Meta+z'); await ss.waitForTimeout(500)
const hBack = await ss.evaluate(() => { const c = document.querySelector('canvas.ss-canvas'); if (c.width !== 400) return c.width; const d = c.getContext('2d').getImageData(0, 0, 400, 300).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h })
check('17b. Ảnh mới không xoá chú thích cũ: ⌘Z khôi phục ảnh + chú thích', replaced === 120 && hBack === hBefore, `thay=${replaced}px`)

// 18. close guard: dirty tab prompts; Cancel keeps it
await tool('Mũi tên'); await drag([50, 250], [150, 280])
let prompted = null
await app.evaluate(({ dialog }) => { globalThis.__prompts = []; dialog.showMessageBox = async (...a) => { const o = a.length > 1 ? a[1] : a[0]; globalThis.__prompts.push(o.message); return { response: 2, checkboxChecked: false } } })
await home.evaluate(() => { const t = [...document.querySelectorAll('.tab-item')].find((x) => /Chụp màn hình/.test(x.textContent)); t?.querySelector('.tab-close, button[aria-label]')?.click() })
await home.waitForTimeout(600)
prompted = await app.evaluate(() => globalThis.__prompts)
const stillOpen = await home.evaluate(() => [...document.querySelectorAll('.tab-item')].some((t) => /Chụp màn hình/.test(t.textContent)))
check('18. Đóng tab chưa lưu hỏi xác nhận, Huỷ giữ tab', prompted.length === 1 && stillOpen, JSON.stringify(prompted))

// 19. "Don't Save" closes
await app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }) })
await home.evaluate(() => { const t = [...document.querySelectorAll('.tab-item')].find((x) => /Chụp màn hình/.test(x.textContent)); t?.querySelector('.tab-close, button[aria-label]')?.click() })
await home.waitForTimeout(600)
const closed = !(await home.evaluate(() => [...document.querySelectorAll('.tab-item')].some((t) => /Chụp màn hình/.test(t.textContent))))
check('19. Chọn "Không lưu" thì đóng tab', closed)

// 20. dark theme follows the shell
await home.locator('.quick-card', { hasText: 'Screenshots' }).first().click()
const ss2 = await findSS()
await ss2.waitForSelector('.ss-root')
await home.evaluate(() => window.aiOffice.setTheme('dark'))
await ss2.waitForTimeout(500)
const dark = await ss2.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.querySelector('.ss-toolbar')).backgroundColor }))
await home.evaluate(() => window.aiOffice.setTheme('system'))
check('20. Theme tối áp dụng ngay cho tab', dark.attr === 'dark' && /rgb\((\d+)/.exec(dark.bg) && Number(/rgb\((\d+)/.exec(dark.bg)[1]) < 80, JSON.stringify(dark))

// 21. hotkeys registered
const hk = await app.evaluate(({ globalShortcut }) => ['CommandOrControl+Alt+Shift+1', 'CommandOrControl+Alt+Shift+2', 'CommandOrControl+Alt+Shift+3'].map((a) => globalShortcut.isRegistered(a)))
check('21. Đăng ký phím tắt toàn cục ⌥⇧⌘1/2/3', hk.every(Boolean), JSON.stringify(hk))

// 22. IPC rejects non-PNG payloads (trust boundary)
const bad = await ss2.evaluate(() => window.screenshotsApi.copy(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])))
check('22. IPC từ chối dữ liệu không phải PNG', bad === false)

check('23. Không có lỗi JS trong renderer/main', errs.length === 0, errs.join(' | ').slice(0, 300))
console.log('SUMMARY', results.filter((r) => r.ok).length + '/' + results.length)
await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
process.exit(results.every((r) => r.ok) ? 0 : 1)
