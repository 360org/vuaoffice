#!/usr/bin/env node
/**
 * Cổng kiểm tra ranh giới Renderer / Node.js (Browser Boundary Gate).
 *
 * Ngăn ngừa triệt để lỗi đưa module Node.js hoặc gói CLI vào Chromium Renderer
 * (nguyên nhân chính làm gãy cả 5 runner CI ở v1.0.49).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

// Các thư mục renderer chạy trong môi trường trình duyệt Chromium
const RENDERER_DIRS = [
  'apps/shell/src/renderer',
  'apps/shell/src/shared',
  'apps/docs/src/renderer',
  'apps/sheets/src/renderer',
  'apps/slides/src/renderer',
  'apps/pdf/src/renderer',
  'apps/markdown/src/renderer',
  'apps/html/src/renderer',
  'apps/mail/src/renderer',
];

const FORBIDDEN_NODE_MODULES = [
  'node:',
  'fs',
  'node:fs',
  'node:fs/promises',
  'path',
  'node:path',
  'child_process',
  'node:child_process',
  'crypto',
  'node:crypto',
  'os',
  'node:os',
  'net',
  'node:net',
  'stream',
  'node:stream',
  '@genoffice/cli',
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const fullPath = resolve(ROOT, dirPath);
  try {
    const files = readdirSync(fullPath);
    for (const file of files) {
      const filePath = join(fullPath, file);
      if (statSync(filePath).isDirectory()) {
        if (!file.includes('node_modules') && !file.startsWith('.') && file !== 'out' && file !== 'dist') {
          getAllFiles(join(dirPath, file), arrayOfFiles);
        }
      } else {
        const ext = extname(file);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !file.endsWith('.d.ts')) {
          arrayOfFiles.push(join(dirPath, file));
        }
      }
    }
  } catch (e) {}
  return arrayOfFiles;
}

/**
 * Kiểm tra xem một dòng import trong mã nguồn Renderer có vi phạm ranh giới Node.js không.
 * @param {string} line - Dòng code import
 * @returns {string|null} - Tên module vi phạm nếu có lỗi, null nếu hợp lệ
 */
export function checkImportViolation(line) {
  const trimmed = line.trim();

  // Bỏ qua type-only imports/exports vì Vite/Rollup loại bỏ hoàn toàn trong runtime
  if (trimmed.startsWith('import type ') || trimmed.startsWith('export type ')) {
    return null;
  }

  // Khớp cú pháp: import ... from '...' hoặc export ... from '...'
  const match = trimmed.match(/(?:import|export)\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/);
  if (!match) return null;

  const moduleName = match[1];

  for (const forbidden of FORBIDDEN_NODE_MODULES) {
    if (moduleName === forbidden || moduleName.startsWith(forbidden + '/') || (forbidden === 'node:' && moduleName.startsWith('node:'))) {
      return moduleName;
    }
  }

  return null;
}

function main() {
  console.log('🔍 [Boundary] Đang kiểm tra ranh giới Renderer / Node.js...');
  let totalViolations = 0;

  for (const dir of RENDERER_DIRS) {
    const files = getAllFiles(dir);
    for (const relFile of files) {
      const content = readFileSync(resolve(ROOT, relFile), 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import ') || line.startsWith('export ')) {
          const violation = checkImportViolation(line);
          if (violation) {
            console.error(`❌ Vi phạm ranh giới tại ${relFile}:${i + 1}`);
            console.error(`   Dòng: ${line}`);
            console.error(`   Lý do: Không được import runtime module Node.js "${violation}" vào Renderer!\n`);
            totalViolations++;
          }
        }
      }
    }
  }

  if (totalViolations > 0) {
    console.error(`[Boundary] THẤT BẠI: Phát hiện ${totalViolations} lỗi rò rỉ module Node.js vào Renderer.`);
    console.error('Khắc phục: Sử dụng "import type" nếu chỉ lấy kiểu dữ liệu, hoặc chuyển logic sang Main process.');
    process.exit(1);
  }

  console.log('✅ [Boundary] ĐẠT — Không có rò rỉ module Node.js nào trong toàn bộ giao diện Renderer.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
