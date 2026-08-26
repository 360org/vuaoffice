#!/usr/bin/env node
/**
 * VuaOffice 360 Brand Engine
 * ---------------------------------------------------------------------------
 * Nguồn chân lý DUY NHẤT: 360/brand-config.json
 * TUYỆT ĐỐI không hardcode quy tắc thương hiệu trong tệp này.
 *
 *   node scripts/360-brand.js apply     # upstream -> VuaOffice
 *   node scripts/360-brand.js restore   # VuaOffice -> upstream (để merge sạch)
 *   node scripts/360-brand.js status    # báo cáo, không ghi tệp, exit 1 nếu chưa sạch
 *
 * Zero-dependency: chỉ dùng module lõi Node, chạy được TRƯỚC `npm ci`.
 * Bắt buộc đọc docs/360_BRAND_STRATEGY.md trước khi sửa tệp này.
 */

const fs = require('fs')
const path = require('path')
const core = require('./lib/brand-core.cjs')

const { ROOT } = core

// ---------------------------------------------------------------------------
// Patch các tệp mục tiêu riêng (nằm ngoài phạm vi quét apps/**)
// ---------------------------------------------------------------------------

function patchElectronBuilder(cfg, direction, dryRun) {
  const rel = cfg.fileTargets?.electronBuilder
  if (!rel) return 0
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) return 0

  const appId = direction === 'apply' ? cfg.brand.appId : 'com.genspark.genoffice'
  const productName = direction === 'apply' ? cfg.brand.appName : cfg.upstream.productName

  const before = fs.readFileSync(full, 'utf8')
  // LƯU Ý: `\s*` — bản cũ viết nhầm `s*`, khiến patch này vô hiệu âm thầm suốt
  // nhiều bản phát hành. Đừng "tối giản" dấu gạch chéo ngược ở đây.
  const after = before
    .replace(/appId:\s*'[^']*'/, `appId: '${appId}'`)
    .replace(/productName:\s*'[^']*'/, `productName: '${productName}'`)

  if (after === before) return 0
  if (!dryRun) fs.writeFileSync(full, after, 'utf8')
  console.log(`  ${dryRun ? '·' : '✓'} ${rel} (appId, productName)`)
  return 1
}

function patchRootPackageJson(cfg, direction, dryRun) {
  const rel = cfg.fileTargets?.rootPackageJson
  if (!rel) return 0
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) return 0

  const from = direction === 'apply' ? cfg.upstream.repoSlug : cfg.brand.repoSlug
  const to = direction === 'apply' ? cfg.brand.repoSlug : cfg.upstream.repoSlug

  const before = fs.readFileSync(full, 'utf8')
  if (!before.includes(from)) return 0
  if (!dryRun) fs.writeFileSync(full, before.split(from).join(to), 'utf8')
  console.log(`  ${dryRun ? '·' : '✓'} ${rel} (repository URL)`)
  return 1
}

function copyAssets(cfg, dryRun) {
  if (dryRun) return 0
  let copied = 0

  for (const group of [cfg.assets?.icons, cfg.assets?.logos].filter(Boolean)) {
    const fromDir = path.join(ROOT, group.from)
    const toDir = path.join(ROOT, group.to)
    if (!fs.existsSync(fromDir) || !fs.existsSync(toDir)) continue

    for (const file of group.files) {
      const src = path.join(fromDir, file)
      if (!fs.existsSync(src)) continue
      fs.copyFileSync(src, path.join(toDir, file))
      copied++
      const alias = group.aliases?.[file]
      if (alias) fs.copyFileSync(src, path.join(toDir, alias))
    }
  }
  if (copied) console.log(`[Whitelabel] Đã sao chép ${copied} tài sản đồ họa`)
  return copied
}

// ---------------------------------------------------------------------------
// Lệnh chính
// ---------------------------------------------------------------------------

function run(direction, { dryRun }) {
  const cfg = core.loadConfig()
  const pairs = core.buildPairs(cfg, direction)
  const files = core.walkFiles(cfg)

  const label = direction === 'apply' ? 'ÁP DỤNG thương hiệu VuaOffice' : 'KHÔI PHỤC về upstream'
  console.log(`[Whitelabel] ${label}${dryRun ? ' (kiểm tra — không ghi tệp)' : ''}`)
  console.log(`[Whitelabel] Quét ${files.length} tệp, ${pairs.length} cặp quy tắc\n`)

  let filesChanged = 0
  let totalReplacements = 0

  for (const full of files) {
    const original = fs.readFileSync(full, 'utf8')
    const ranges = core.excludedRanges(original, cfg)

    let content = original
    let fileCount = 0
    for (const { from, to } of pairs) {
      const res = core.replaceOutsideExcluded(content, from, to, ranges)
      content = res.text
      fileCount += res.count
    }

    if (fileCount > 0) {
      if (!dryRun) fs.writeFileSync(full, content, 'utf8')
      console.log(`  ${dryRun ? '·' : '✓'} ${path.relative(ROOT, full)} (${fileCount})`)
      filesChanged++
      totalReplacements += fileCount
    }
  }

  const targetPatches =
    patchElectronBuilder(cfg, direction, dryRun) + patchRootPackageJson(cfg, direction, dryRun)

  if (direction === 'apply') copyAssets(cfg, dryRun)

  console.log(
    `\n[Whitelabel] ${dryRun ? 'Cần xử lý' : 'Hoàn tất'}: ` +
      `${totalReplacements} thay thế / ${filesChanged} tệp, ${targetPatches} tệp mục tiêu`,
  )

  if (dryRun && totalReplacements + targetPatches > 0) {
    console.error(
      `\n[Whitelabel] TRẠNG THÁI: CHƯA SẠCH — còn ${totalReplacements + targetPatches} điểm.\n` +
        `             Chạy: npm run whitelabel:apply`,
    )
    process.exit(1)
  }
  if (dryRun) console.log('\n[Whitelabel] TRẠNG THÁI: SẠCH — thương hiệu đã áp dụng đầy đủ.')
}

// ---------------------------------------------------------------------------
// selftest — kiểm chứng TÍNH SONG ÁNH của bộ quy tắc (chỉ đọc, không ghi tệp)
// ---------------------------------------------------------------------------

/**
 * Bất biến bắt buộc:  apply(restore(apply(x)))  ===  apply(x)
 *
 * Vì sao phải có kiểm thử này: một quy tắc trong `protected` chỉ chặn MỘT
 * CHIỀU sẽ làm hỏng mã nguồn VĨNH VIỄN sau đúng một chu kỳ restore→apply.
 * Ví dụ có thật đã bị bắt: `VuaOfficeIcon` --restore--> `GenOfficeIcon`, rồi
 * apply KHÔNG đổi ngược được vì mẫu `GenOffice[A-Za-z]` đang được bảo vệ.
 * Lỗi này im lặng, không cảnh báo, và chỉ lộ ra khi ứng dụng chạy hỏng.
 */
function transform(text, cfg, direction) {
  let out = text
  for (const { from, to } of core.buildPairs(cfg, direction)) {
    out = core.replaceOutsideExcluded(out, from, to, core.excludedRanges(out, cfg)).text
  }
  return out
}

function selftest() {
  const cfg = core.loadConfig()
  const files = core.walkFiles(cfg)
  const broken = []

  const SYNTHETIC = [
    "import { VuaOfficeIcon } from './VuaOfficeIcon'",
    'const x = handleVuaOfficeUrl(u)',
    "font-family: 'GenOffice Sans KR';",
    "src: url('./GenOfficeSansKR-Regular-subset.woff2')",
    "PDFName.of('GenOfficeFormField')",
    "licenseNotice: 'VuaOffice dựa trên dự án mã nguồn mở GenOffice.'",
    "aiGskLoginBtn: 'Sign in to Genspark'",
    '<div className="ribbon-group-label">Genspark AI</div>',
    "document.title = 'GenOffice Docs'",
  ]

  for (const [i, sample] of SYNTHETIC.entries()) {
    const once = transform(sample, cfg, 'apply')
    const twice = transform(transform(once, cfg, 'restore'), cfg, 'apply')
    if (once !== twice) broken.push({ rel: `<mẫu #${i + 1}>`, once, twice, src: sample })
  }

  for (const full of files) {
    const text = fs.readFileSync(full, 'utf8')
    const once = transform(text, cfg, 'apply')
    const twice = transform(transform(once, cfg, 'restore'), cfg, 'apply')
    if (once !== twice) {
      const at = [...once].findIndex((ch, k) => ch !== twice[k])
      broken.push({
        rel: path.relative(ROOT, full),
        once: once.slice(Math.max(0, at - 40), at + 40),
        twice: twice.slice(Math.max(0, at - 40), at + 40),
      })
    }
  }

  if (broken.length === 0) {
    console.log(
      `[Whitelabel] SELFTEST ĐẠT — bộ quy tắc song ánh trên ${SYNTHETIC.length} mẫu ` +
        `và ${files.length} tệp thật.`,
    )
    return
  }

  console.error(`[Whitelabel] SELFTEST KHÔNG ĐẠT — ${broken.length} điểm mất đối xứng\n`)
  console.error('  Nguyên nhân thường gặp: một mẫu trong `protected` chặn một chiều mà')
  console.error('  thiếu cặp đối xứng cho chiều còn lại. Xem WHITELABEL_STRATEGY.md §6.4.\n')
  for (const b of broken.slice(0, 10)) {
    console.error(`  ${b.rel}`)
    if (b.src) console.error(`     gốc      : ${b.src}`)
    console.error(`     apply    : ${JSON.stringify(b.once)}`)
    console.error(`     lặp lại  : ${JSON.stringify(b.twice)}\n`)
  }
  process.exit(1)
}

// ---------------------------------------------------------------------------

const command = process.argv[2] || 'apply'
const MODES = { apply: ['apply', false], restore: ['restore', false], status: ['apply', true] }

try {
  if (command === 'selftest') {
    selftest()
  } else if (MODES[command]) {
    const [direction, dryRun] = MODES[command]
    run(direction, { dryRun })
  } else {
    console.error(
      `[Whitelabel] Lệnh không hợp lệ: "${command}"\nDùng: apply | restore | status | selftest`,
    )
    process.exit(1)
  }
} catch (e) {
  console.error(`[Whitelabel] LỖI: ${e.message}`)
  process.exit(1)
}
