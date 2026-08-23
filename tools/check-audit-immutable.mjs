// Cổng bất biến cho bản ghi kiểm toán.
// ---------------------------------------------------------------------------
// Báo cáo kiểm toán là ảnh chụp kho mã tại MỘT THỜI ĐIỂM. Giá trị của nó nằm ở
// chỗ phản ánh đúng những gì đã thấy lúc đó. Sửa hay ghi đè một bản đã tồn tại
// là làm hỏng bản ghi lịch sử — và điều đó ĐÃ XẢY RA: bản kiểm toán v0.7.0 cùng
// các cập nhật của maintainer từng bị một lượt ghi đè xoá mất, phải khôi phục
// lại từ lịch sử git.
//
// Cổng này chặn đúng lỗi đó:
//   • Tệp trong docs/audits/ đã có trong lịch sử  → CẤM sửa, CẤM xoá.
//   • Tệp mới                                     → phải đúng tên và có banner.
//
//   node tools/check-audit-immutable.mjs [--base <ref>]
//
// Diff-based: chỉ soi những gì thay đổi so với `base`, nên chạy nhanh và không
// bao giờ báo lỗi trên tệp mà thay đổi hiện tại không hề đụng tới.
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const AUDIT_DIR = 'docs/audits/'
// AUDIT-<YYYY-MM-DD>-<version>.md — ngày đứng trước để thư mục tự sắp theo thời gian
const NAME_RE = /^docs\/audits\/AUDIT-\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+\.md$/
const BANNER = '<!-- AUDIT-IMMUTABLE -->'

const args = process.argv.slice(2)
let baseRef = process.env.FORMAT_BASE_REF || ''
if (args[0] === '--base') {
  args.shift()
  baseRef = args.shift() || ''
}
if (/^0+$/.test(baseRef)) baseRef = ''

function git(...a) {
  const r = spawnSync('git', a, { encoding: 'utf8' })
  return r.status === 0 ? r.stdout : null
}

// Mốc so sánh: base được chỉ định, nếu không thì HEAD (tức là so với lần commit
// gần nhất — bắt được cả thay đổi đang nằm trong staging/working tree).
const base = baseRef || 'HEAD'
if (!git('rev-parse', '--verify', base)) {
  console.error(`[Audit] Không phân giải được mốc so sánh: ${base}`)
  process.exit(2)
}

const changed = (git('diff', '--name-status', base, '--') || '')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [status, ...rest] = l.split('\t')
    return { status: status[0], path: rest[rest.length - 1], orig: rest[0] }
  })
  .filter((c) => c.path.startsWith(AUDIT_DIR) || c.orig?.startsWith(AUDIT_DIR))

const violations = []

for (const c of changed) {
  const existedBefore = git('cat-file', '-e', `${base}:${c.orig}`) !== null

  if (c.status === 'M' && existedBefore) {
    violations.push({
      path: c.orig,
      why: 'SỬA một bản ghi kiểm toán đã tồn tại',
      fix: 'Tạo tệp mới docs/audits/AUDIT-<YYYY-MM-DD>-<version>.md thay vì sửa bản cũ.',
    })
  } else if (c.status === 'D') {
    violations.push({
      path: c.orig,
      why: 'XOÁ một bản ghi kiểm toán',
      fix: 'Bản ghi lịch sử không được xoá. Khôi phục: git checkout ' + base + ' -- ' + c.orig,
    })
  } else if (c.status === 'R') {
    violations.push({
      path: `${c.orig} → ${c.path}`,
      why: 'ĐỔI TÊN một bản ghi kiểm toán',
      fix: 'Giữ nguyên tên gốc; kiểm toán mới thì thêm tệp mới.',
    })
  } else if (c.status === 'A') {
    // Tệp mới: kiểm tra quy ước đặt tên và banner
    if (!NAME_RE.test(c.path)) {
      violations.push({
        path: c.path,
        why: 'Tên tệp sai quy ước',
        fix: 'Đặt tên docs/audits/AUDIT-<YYYY-MM-DD>-<version>.md, ví dụ AUDIT-2026-08-23-v1.0.12.md',
      })
    } else if (existsSync(c.path) && !readFileSync(c.path, 'utf8').includes(BANNER)) {
      violations.push({
        path: c.path,
        why: 'Thiếu banner bất biến',
        fix: `Thêm dòng ${BANNER} ngay sau tiêu đề để người đọc và cổng này nhận diện.`,
      })
    }
  }
}

if (violations.length === 0) {
  console.log('[Audit] ĐẠT — không bản ghi kiểm toán nào bị sửa, xoá hay đổi tên.')
  process.exit(0)
}

console.error(`[Audit] KHÔNG ĐẠT — ${violations.length} vi phạm tính bất biến của bản ghi\n`)
for (const v of violations) {
  console.error(`  ✗ ${v.path}`)
  console.error(`      ${v.why}`)
  console.error(`      → ${v.fix}\n`)
}
console.error('Vì sao có cổng này: báo cáo kiểm toán là ảnh chụp tại một thời điểm.')
console.error('Ghi đè bản cũ làm mất bằng chứng về tình trạng kho mã lúc đó.')
console.error('Chi tiết: docs/AUDIT_REPORT.md')
process.exit(1)
