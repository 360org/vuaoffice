#!/usr/bin/env node
/**
 * Synchronize VuaOffice Documentation & Landing Page Updates
 * ---------------------------------------------------------------------------
 * Đọc phiên bản từ package.json và danh sách cập nhật hướng người dùng từ docs/updates.json
 * Tự động cập nhật:
 *   1. docs/index.html: Top announcement bar (#top-bar-version), #changelog timeline items, JSON-LD Schema softwareVersion
 *   2. docs/sitemap.xml: Cập nhật thẻ <lastmod> ngày hiện tại
 *
 * Usage:
 *   node tools/sync-site-updates.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const pkgPath = resolve(ROOT, 'package.json');
const updatesJsonPath = resolve(ROOT, 'docs', 'updates.json');
const indexPath = resolve(ROOT, 'docs', 'index.html');
const sitemapPath = resolve(ROOT, 'docs', 'sitemap.xml');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const updates = JSON.parse(readFileSync(updatesJsonPath, 'utf8'));
const currentVersion = pkg.version;
const latestUpdate = updates[0] || {};

console.log(`[Sync-Site] Đồng bộ phiên bản VuaOffice v${currentVersion} lên website...`);

// 1. Cập nhật docs/index.html
let indexHtml = readFileSync(indexPath, 'utf8');

// Top announcement bar version
indexHtml = indexHtml.replace(
  /<span id="top-bar-version">[^<]*<\/span>/g,
  `<span id="top-bar-version">v${currentVersion}</span>`
);

// Top announcement bar highlight text
if (latestUpdate.highlight) {
  indexHtml = indexHtml.replace(
    /(<div class="top-bar">\s*⚡ <strong>VuaOffice <span id="top-bar-version">[^<]*<\/span> đã ra mắt:<\/strong> )([^<]*)( <a href="#changelog">)/,
    `$1${latestUpdate.highlight}$3`
  );
}

// Structured Data / JSON-LD Schema: inject softwareVersion if not present or update it
if (indexHtml.includes('"softwareVersion"')) {
  indexHtml = indexHtml.replace(
    /"softwareVersion":\s*"[^"]*"/,
    `"softwareVersion": "${currentVersion}"`
  );
} else {
  indexHtml = indexHtml.replace(
    /("applicationCategory":\s*"BusinessApplication,\s*OfficeApplication",)/,
    `$1\n        "softwareVersion": "${currentVersion}",`
  );
}

// Render Timeline items from docs/updates.json
const checkIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
const versionIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

const timelineHtml = updates.map((item, idx) => {
  const isLatest = idx === 0;
  const label = isLatest ? `Phiên bản v${item.version} (Mới nhất)` : `Phiên bản v${item.version}`;
  const listItems = item.features.map(f => `            <li>
              ${checkIconSvg}
              <span><strong>${f.title}:</strong> ${f.desc}</span>
            </li>`).join('\n');

  return `        <!-- v${item.version} -->
        <div class="timeline-item">
          <div class="timeline-header">
            <span class="timeline-ver">
              ${versionIconSvg}
              ${label}
            </span>
            <span class="timeline-date">${item.date}</span>
          </div>
          <ul>
${listItems}
          </ul>
        </div>`;
}).join('\n\n');

// Replace inside <div class="timeline"> ... </div>
const timelineRegex = /(<div class="timeline">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>\s*<!-- Download)/;
if (timelineRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(timelineRegex, `$1\n${timelineHtml}\n      $3`);
}

writeFileSync(indexPath, indexHtml, 'utf8');
console.log(`[Sync-Site] ✓ Đã đồng bộ docs/index.html (Top bar: v${currentVersion}, Timeline: ${updates.length} phiên bản)`);

// 2. Cập nhật sitemap.xml
let sitemapXml = readFileSync(sitemapPath, 'utf8');
const today = new Date().toISOString().slice(0, 10);
sitemapXml = sitemapXml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
writeFileSync(sitemapPath, sitemapXml, 'utf8');
console.log(`[Sync-Site] ✓ Đã đồng bộ docs/sitemap.xml (<lastmod>${today}</lastmod>)`);
