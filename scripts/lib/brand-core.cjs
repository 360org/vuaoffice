/**
 * Lõi whitelabel dùng chung.
 * ---------------------------------------------------------------------------
 * Được dùng bởi:
 *   - scripts/whitelabel.js   (engine apply/restore/status)
 *   - tools/check-brand.mjs   (cổng kiểm tra CI)
 *
 * Cả hai công cụ BẮT BUỘC đọc quy tắc từ whitelabel/brand-config.json thông
 * qua module này. Không công cụ nào được hardcode quy tắc thương hiệu riêng —
 * đó chính là khiếm khuyết đã khiến bản whitelabel cũ thất bại.
 *
 * Zero-dependency: chỉ dùng module lõi Node, chạy được TRƯỚC `npm ci`.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '../..')
const CONFIG_PATH = path.join(ROOT, '360/brand-config.json')

// ---------------------------------------------------------------------------
// Cấu hình
// ---------------------------------------------------------------------------

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Không tìm thấy brand-config.json tại ${CONFIG_PATH}`)
  }
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch (e) {
    throw new Error(`brand-config.json không phải JSON hợp lệ: ${e.message}`, { cause: e })
  }
  for (const key of ['brand', 'upstream', 'scan', 'replacements']) {
    if (!cfg[key]) throw new Error(`brand-config.json thiếu khối bắt buộc: "${key}"`)
  }
  return cfg
}

// ---------------------------------------------------------------------------
// Duyệt tệp (thay cho `glob` — giữ công cụ không phụ thuộc npm install)
// ---------------------------------------------------------------------------

function walkFiles(cfg) {
  const { roots, includeDirs, extensions, excludeDirs } = cfg.scan
  const out = []

  const collect = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue
        collect(full)
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(full)
      }
    }
  }

  for (const root of roots) {
    let apps
    try {
      apps = fs.readdirSync(path.join(ROOT, root), { withFileTypes: true })
    } catch {
      continue
    }
    for (const app of apps) {
      if (!app.isDirectory()) continue
      for (const sub of includeDirs) collect(path.join(ROOT, root, app.name, sub))
    }
  }

  // Tệp lẻ nằm ngoài cây includeDirs nhưng vẫn sinh chuỗi người dùng thấy
  // (điển hình: cấu hình đóng gói đặt tên tệp cài đặt).
  for (const rel of cfg.scan.extraFiles || []) {
    const full = path.join(ROOT, rel)
    if (fs.existsSync(full)) out.push(full)
  }
  return out
}

// ---------------------------------------------------------------------------
// Vùng loại trừ
// ---------------------------------------------------------------------------

/**
 * Khoảng ký tự thuộc CHÚ THÍCH — không bao giờ thay thế, không bao giờ báo lỗi.
 *
 * Lý do bắt buộc (WHITELABEL_STRATEGY.md §6.1):
 *  1. Chú thích không hiển thị cho người dùng ⇒ sửa chúng không mang lại giá
 *     trị thương hiệu nào, chỉ làm phình bề mặt xung đột khi merge upstream.
 *  2. Nguy hiểm hơn: chú thích thường chứa liên kết tới issue/PR của upstream
 *     (vd `// See https://github.com/genspark-ai/genoffice/issues/15`). Thay
 *     slug kho mã trong đó tạo ra liên kết TRỎ SAI tới issue không tồn tại.
 *
 * Chú thích dòng chỉ được nhận diện khi dòng (sau trim) BẮT ĐẦU bằng `//`.
 * Không dò `//` giữa dòng, để tránh cắt nhầm phần sau của `https://...`.
 */
function commentRanges(text) {
  const ranges = []

  const scan = (re) => {
    let m
    while ((m = re.exec(text)) !== null) {
      ranges.push([m.index, m.index + m[0].length])
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }

  scan(/\/\*[\s\S]*?\*\//g) // khối /* ... */ (gồm JSDoc và chú thích CSS)
  scan(/<!--[\s\S]*?-->/g) // chú thích HTML

  let offset = 0
  for (const line of text.split('\n')) {
    const indent = line.length - line.trimStart().length
    if (line.trimStart().startsWith('//')) ranges.push([offset + indent, offset + line.length])
    offset += line.length + 1
  }
  return ranges
}

/** Chú thích + định danh kỹ thuật được miễn trừ tuyệt đối (brand-config.protected). */
function excludedRanges(text, cfg) {
  const ranges = commentRanges(text)
  for (const p of cfg.protected || []) {
    if (!p.pattern) continue
    const re = new RegExp(p.pattern, 'g')
    let m
    while ((m = re.exec(text)) !== null) {
      ranges.push([m.index, m.index + m[0].length])
      if (m.index === re.lastIndex) re.lastIndex++ // chống vòng lặp vô hạn
    }
  }
  return ranges
}

function overlaps(start, end, ranges) {
  return ranges.some(([a, b]) => start < b && end > a)
}

// ---------------------------------------------------------------------------
// Thay thế
// ---------------------------------------------------------------------------

/** Thay `from` -> `to`, bỏ qua mọi lần xuất hiện nằm trong vùng loại trừ. */
function replaceOutsideExcluded(text, from, to, ranges) {
  if (!text.includes(from)) return { text, count: 0 }

  let result = ''
  let cursor = 0
  let count = 0

  for (;;) {
    const idx = text.indexOf(from, cursor)
    if (idx === -1) break
    const end = idx + from.length
    result += text.slice(cursor, idx)
    if (overlaps(idx, end, ranges)) {
      result += from // trong chú thích hoặc định danh được bảo vệ — giữ nguyên
    } else {
      result += to
      count++
    }
    cursor = end
  }
  return { text: result + text.slice(cursor), count }
}

/**
 * Cặp thay thế theo chiều yêu cầu.
 * Sắp xếp chuỗi dài trước để tránh khớp lồng nhau (vd "VuaOffice AI" phải
 * được xử lý trước "VuaOffice").
 */
function buildPairs(cfg, direction) {
  return cfg.replacements
    .filter((r) => r.from && r.to)
    .map((r) => (direction === 'apply' ? { from: r.from, to: r.to } : { from: r.to, to: r.from }))
    .sort((a, b) => b.from.length - a.from.length)
}

/** Vị trí dòng/cột của một offset ký tự — dùng để báo lỗi có thể click được. */
function locate(text, index) {
  const before = text.slice(0, index)
  const line = before.split('\n').length
  const column = index - before.lastIndexOf('\n')
  return { line, column }
}

module.exports = {
  ROOT,
  CONFIG_PATH,
  loadConfig,
  walkFiles,
  commentRanges,
  excludedRanges,
  overlaps,
  replaceOutsideExcluded,
  buildPairs,
  locate,
}
