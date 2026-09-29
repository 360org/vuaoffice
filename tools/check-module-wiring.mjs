#!/usr/bin/env node
/**
 * tools/check-module-wiring.mjs
 *
 * CỔNG KIỂM TRA ĐẤU NỐI MODULE & CHỐNG LỖI MÀN HÌNH TRẮNG (Anti-Blank-Screen Gate)
 *
 * Tự động rà soát toàn bộ các module trong `apps/*` (đặc biệt các module đặc thù của 360 như Mail)
 * để đảm bảo không bị merge từ upstream làm mất cấu hình nạp tại 6 điểm then chốt:
 * 1. apps/shell/electron-builder.cjs (extraResources)
 * 2. apps/shell/src/main/index.ts (installRendererProtocol)
 * 3. packages/electron-utils/src/renderer-scheme.ts (RendererHost)
 * 4. tools/build-stale-preloads.mjs (APPS)
 * 5. package.json (dev script concurrently)
 * 6. tools/check-renderer-boundary.mjs (RENDERER_DIRS)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

// Danh sách các module ứng dụng con độc lập cần giao diện riêng
const REQUIRED_MODULES = ['docs', 'sheets', 'slides', 'pdf', 'markdown', 'html', 'mail'];

let violations = [];

// 1. Kiểm tra apps/shell/electron-builder.cjs
const builderFile = resolve(ROOT, 'apps/shell/electron-builder.cjs');
const builderContent = readFileSync(builderFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const resourcePattern = `to: 'modules/${mod}'`;
  if (!builderContent.includes(resourcePattern)) {
    violations.push({
      file: 'apps/shell/electron-builder.cjs',
      desc: `Thiếu cấu hình extraResources cho module '${mod}' (phải có to: 'modules/${mod}'). Sẽ gây màn hình trắng khi đóng gói app!`,
    });
  }
}

// 2. Kiểm tra apps/shell/src/main/index.ts (installRendererProtocol)
const shellMainFile = resolve(ROOT, 'apps/shell/src/main/index.ts');
const shellMainContent = readFileSync(shellMainFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const protoPattern = `${mod}: join(`;
  if (!shellMainContent.includes(protoPattern)) {
    violations.push({
      file: 'apps/shell/src/main/index.ts',
      desc: `Thiếu đăng ký giao thức installRendererProtocol cho module '${mod}' (phải có ${mod}: join(..._OUT, 'renderer')). Sẽ không nạp được giao thức genoffice-app://${mod}/!`,
    });
  }
}

// 3. Kiểm tra packages/electron-utils/src/renderer-scheme.ts (RendererHost)
const schemeFile = resolve(ROOT, 'packages/electron-utils/src/renderer-scheme.ts');
const schemeContent = readFileSync(schemeFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const hostPattern = `'${mod}'`;
  if (!schemeContent.includes(hostPattern)) {
    violations.push({
      file: 'packages/electron-utils/src/renderer-scheme.ts',
      desc: `Thiếu '${mod}' trong kiểu dữ liệu RendererHost.`,
    });
  }
}

// 4. Kiểm tra tools/build-stale-preloads.mjs (APPS)
const preloadsFile = resolve(ROOT, 'tools/build-stale-preloads.mjs');
const preloadsContent = readFileSync(preloadsFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const appPattern = `'${mod}'`;
  if (!preloadsContent.includes(appPattern)) {
    violations.push({
      file: 'tools/build-stale-preloads.mjs',
      desc: `Thiếu '${mod}' trong mảng APPS để tự động build bundle preload.`,
    });
  }
}

// 5. Kiểm tra package.json (script "dev")
const packageJsonFile = resolve(ROOT, 'package.json');
const packageJsonContent = readFileSync(packageJsonFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const devPkgPattern = `@genoffice/${mod}`;
  if (!packageJsonContent.includes(devPkgPattern)) {
    violations.push({
      file: 'package.json',
      desc: `Thiếu script chạy dev cho module '@genoffice/${mod}' trong kịch bản 'dev' của package.json.`,
    });
  }
}

// 6. Kiểm tra tools/check-renderer-boundary.mjs (RENDERER_DIRS)
const boundaryFile = resolve(ROOT, 'tools/check-renderer-boundary.mjs');
const boundaryContent = readFileSync(boundaryFile, 'utf8');
for (const mod of REQUIRED_MODULES) {
  const dirPattern = `apps/${mod}/src/renderer`;
  if (!boundaryContent.includes(dirPattern)) {
    violations.push({
      file: 'tools/check-renderer-boundary.mjs',
      desc: `Thiếu 'apps/${mod}/src/renderer' trong danh sách kiểm tra ranh giới Node/Renderer.`,
    });
  }
}

// Báo cáo kết quả
console.log('🔍 [Module-Wiring] Đang kiểm tra 6 điểm đấu nối module chống lỗi màn hình trắng...');
if (violations.length > 0) {
  console.error('\n❌ PHÁT HIỆN LỖI ĐẤU NỐI MODULE GÂY MÀN HÌNH TRẮNG:');
  for (const v of violations) {
    console.error(` - [${v.file}] ${v.desc}`);
  }
  console.error('\n⚠️ Hãy sửa các điểm trên trước khi commit hoặc merge upstream!\n');
  process.exit(1);
} else {
  console.log('✅ [Module-Wiring] ĐẠT — Tất cả 7 module (docs, sheets, slides, pdf, markdown, html, mail) đã được đấu nối toàn diện 100%!');
}
