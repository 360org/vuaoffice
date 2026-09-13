#!/usr/bin/env node
/**
 * Cổng chặn website lệch phiên bản.
 *
 * `docs/index.html` và `docs/changelog.html` là SẢN PHẨM SINH RA từ
 * `package.json` + `docs/updates.json` qua `tools/sync-site-updates.mjs`.
 * Sửa dữ liệu mà quên chạy generator thì trang chủ vẫn quảng cáo bản cũ —
 * đúng lỗi đã xảy ra ở v1.0.40 (trang ghi "v1.0.38 (Mới nhất)").
 *
 * Cổng này chạy generator lên một bản sao trong bộ nhớ rồi so sánh; lệch là
 * chặn. Không ghi tệp nào.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['docs/index.html', 'docs/changelog.html', 'docs/sitemap.xml'];

const before = TARGETS.map((p) => readFileSync(resolve(ROOT, p), 'utf8'));

// Generator là idempotent: chạy trên cây đã đồng bộ thì không đổi byte nào.
execFileSync(process.execPath, [resolve(ROOT, 'tools/sync-site-updates.mjs')], {
  cwd: ROOT,
  stdio: 'ignore',
});

const after = TARGETS.map((p) => readFileSync(resolve(ROOT, p), 'utf8'));

// sitemap ghi <lastmod> theo ngày hiện tại, đổi mỗi ngày mà không phải lỗi đồng bộ.
const normalize = (s) => s.replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod/>');

const stale = TARGETS.filter((_, i) => normalize(before[i]) !== normalize(after[i]));

if (stale.length) {
  console.error('[Site] HỎNG — website lệch với package.json / docs/updates.json:');
  stale.forEach((p) => console.error(`  • ${p}`));
  console.error('\nChạy `npm run site:sync` rồi commit lại các tệp trên.');
  console.error('(Generator vừa ghi đè chúng cho Sếp — kiểm tra `git diff` là thấy.)');
  process.exit(1);
}

const version = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;
console.log(`[Site] ĐẠT — trang chủ và changelog khớp v${version}.`);
