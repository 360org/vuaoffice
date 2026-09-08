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
const changelogPath = resolve(ROOT, 'docs', 'changelog.html');
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

function renderTimelineItems(items) {
  return items.map((item, idx) => {
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
}

// 1. Cập nhật docs/index.html (Giới hạn 6 phiên bản mới nhất, kèm nút Xem toàn bộ lịch sử)
const HOME_TIMELINE_LIMIT = 6;
const homeUpdates = updates.slice(0, HOME_TIMELINE_LIMIT);
let homeTimelineHtml = renderTimelineItems(homeUpdates);

if (updates.length > HOME_TIMELINE_LIMIT) {
  homeTimelineHtml += `\n\n        <div style="text-align: center; margin-top: 36px;">
          <a href="changelog.html" class="btn-main" style="display: inline-flex; padding: 12px 28px; font-size: 15px;">
            Xem toàn bộ lịch sử cập nhật (${updates.length} phiên bản) →
          </a>
        </div>`;
}

// Replace inside <div class="timeline"> ... </div>
const timelineRegex = /(<div class="timeline">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>\s*<!-- Download)/;
if (timelineRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(timelineRegex, `$1\n${homeTimelineHtml}\n      $3`);
}

writeFileSync(indexPath, indexHtml, 'utf8');
console.log(`[Sync-Site] ✓ Đã đồng bộ docs/index.html (Top bar: v${currentVersion}, Timeline: ${homeUpdates.length}/${updates.length} phiên bản)`);

// 2. Tạo hoặc cập nhật trang docs/changelog.html hiển thị đầy đủ toàn bộ lịch sử
const fullTimelineHtml = renderTimelineItems(updates);

// Build changelog.html based on index.html structure & styles
let changelogHtml = indexHtml;

// Cập nhật thẻ canonical và title
changelogHtml = changelogHtml.replace(
  /<title>[^<]*<\/title>/,
  '<title>Lịch Sử Cập Nhật & Ghi Chú Phát Hành — VuaOffice</title>'
);
changelogHtml = changelogHtml.replace(
  /<link rel="canonical" href="[^"]*">/,
  '<link rel="canonical" href="https://vuaoffice.com/changelog.html">'
);
changelogHtml = changelogHtml.replace(
  /<meta property="og:url" content="[^"]*">/,
  '<meta property="og:url" content="https://vuaoffice.com/changelog.html">'
);

// Bỏ hero, feature, apps, compare, testimonials, download, faq... chỉ giữ Header, Section Changelog đầy đủ và Footer
const headerMatch = changelogHtml.match(/(<header[\s\S]*?<\/header>)/);
const headerHtml = headerMatch ? headerMatch[1] : '';

// Sửa menu nav trong header để liên kết chuẩn về trang chủ
const adjustedHeaderHtml = headerHtml
  .replace(/href="#apps"/g, 'href="index.html#apps"')
  .replace(/href="#compare"/g, 'href="index.html#compare"')
  .replace(/href="#changelog"/g, 'href="#changelog"')
  .replace(/href="#download"/g, 'href="index.html#download"')
  .replace(/href="#faq"/g, 'href="index.html#faq"');

const footerMatch = changelogHtml.match(/(<!-- Footer & 360 Ecosystem -->[\s\S]*?<\/body>)/);
const footerHtml = footerMatch ? footerMatch[1] : '</body>';

const changelogContent = `
  <div class="top-bar">
    ⚡ <strong>VuaOffice v${currentVersion}:</strong> Toàn bộ lịch sử nâng cấp và cải tiến sản phẩm. <a href="index.html">← Quay lại Trang Chủ</a>
  </div>

  ${adjustedHeaderHtml}

  <!-- Changelog Full Page -->
  <section id="changelog" style="padding: 60px 0 90px; min-height: 70vh;">
    <div class="container">
      <div style="margin-bottom: 24px;">
        <a href="index.html" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--accent-light);">
          ← Quay lại Trang chủ
        </a>
      </div>

      <div class="section-head" style="text-align: left; margin-bottom: 40px;">
        <div class="badge" style="margin-bottom: 14px;">Changelog & Release Notes</div>
        <h1 style="font-size: 36px; font-weight: 800; color: #fff; margin-bottom: 12px;">Lịch Sử Cập Nhật VuaOffice</h1>
        <p style="font-size: 16px; color: var(--text-muted); max-width: 800px;">
          Theo dõi toàn bộ quá trình phát triển, các tính năng mới và bản vá lỗi được phát hành qua từng phiên bản của bộ ứng dụng văn phòng AI VuaOffice.
        </p>
      </div>

      <div class="timeline">
${fullTimelineHtml}
      </div>

      <div style="text-align: center; margin-top: 50px;">
        <a href="index.html#download" class="btn-main" style="display: inline-flex; padding: 14px 32px; font-size: 16px;">
          Tải VuaOffice Phiên Bản Mới Nhất
        </a>
      </div>
    </div>
  </section>

  ${footerHtml}`;

// Tách lấy <head>...</head> từ indexHtml
const headMatch = changelogHtml.match(/(<!DOCTYPE html>[\s\S]*?<head>[\s\S]*?<\/head>)/);
const headHtml = headMatch ? headMatch[1] : '<!DOCTYPE html><html><head></head>';

const finalChangelogHtml = `${headHtml}\n<body>${changelogContent}</html>`;
writeFileSync(changelogPath, finalChangelogHtml, 'utf8');
console.log(`[Sync-Site] ✓ Đã tạo docs/changelog.html (${updates.length} phiên bản đầy đủ)`);

// 3. Cập nhật sitemap.xml (bổ sung changelog.html nếu chưa có)
let sitemapXml = readFileSync(sitemapPath, 'utf8');
const today = new Date().toISOString().slice(0, 10);
sitemapXml = sitemapXml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

if (!sitemapXml.includes('https://vuaoffice.com/changelog.html')) {
  sitemapXml = sitemapXml.replace(
    '</urlset>',
    `  <url>\n    <loc>https://vuaoffice.com/changelog.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>`
  );
}

writeFileSync(sitemapPath, sitemapXml, 'utf8');
console.log(`[Sync-Site] ✓ Đã đồng bộ docs/sitemap.xml (<lastmod>${today}</lastmod>)`);
