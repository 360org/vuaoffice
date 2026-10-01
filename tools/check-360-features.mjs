import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

console.log('🔍 [360-Features] Đang kiểm tra tính vẹn toàn của 10 tính năng độc quyền 360 CORP...');

const checks = [
  {
    name: '1. Module VuaOffice Mail (apps/mail)',
    test: () => fs.existsSync(path.join(ROOT, 'apps/mail/src/main/mail-main.ts')) &&
                fs.existsSync(path.join(ROOT, 'apps/mail/src/renderer/src/App.tsx')),
  },
  {
    name: '2. Cấu hình AI Provider 360 Gateway / OmiRouter',
    test: () => {
      const brandCfg = JSON.parse(fs.readFileSync(path.join(ROOT, '360/brand-config.json'), 'utf8'));
      return brandCfg.brand?.vendor === '360 CORP' &&
             brandCfg.brand?.defaultProvider === 'vuaairouter' &&
             brandCfg.brand?.vuaairouterUrl?.includes('vuahethong.com');
    }
  },
  {
    name: '3. Bản quyền AboutModal 360 CORP & Apache 2.0 Attribution',
    test: () => {
      const code = fs.readFileSync(path.join(ROOT, 'apps/shell/src/renderer/src/AboutModal.tsx'), 'utf8');
      return code.includes('360 CORP') && code.includes('Original Work: Copyright 2026 Mainfunc, Inc. (GenOffice)');
    }
  },
  {
    name: '4. Sửa tiêu đề Tab tài liệu (Tab Rename)',
    test: () => {
      const code = fs.readFileSync(path.join(ROOT, 'apps/shell/src/main/tab-manager.ts'), 'utf8');
      return code.includes('renameTab') || code.includes('customTitle') || code.includes('tabTitle');
    }
  },
  {
    name: '5. Tìm kiếm Font tiếng Việt gập dấu (Diacritic-Folding Font Search)',
    test: () => {
      const code = fs.readFileSync(path.join(ROOT, 'packages/ui/src/dropdown.tsx'), 'utf8');
      return code.includes('searchable') && (code.includes('removeAccents') || code.includes('normalize') || code.includes('toLowerCase'));
    }
  },
  {
    name: '6. Offline Apple Vision OCR (macOS Native OCR)',
    test: () => fs.existsSync(path.join(ROOT, 'packages/pdf2docx/ocr-helper/vision-ocr.swift')) ||
                fs.existsSync(path.join(ROOT, 'packages/pdf2docx/src/ocr-vision.ts')),
  },
  {
    name: '7. PDF Forensics Alteration Inspector',
    test: () => fs.existsSync(path.join(ROOT, 'apps/pdf/tests/pdf-forensics.test.ts')),
  },
  {
    name: '8. Cổng tải về vuahethong.net & Update Landing Page',
    test: () => {
      const code = fs.readFileSync(path.join(ROOT, 'apps/shell/src/main/updater.ts'), 'utf8');
      return code.includes('DOWNLOAD_PAGE_URL = \'https://vuahethong.net/#download-desktop-app\'') &&
             code.includes('void shell.openExternal(DOWNLOAD_PAGE_URL)');
    }
  },
  {
    name: '9. Động cơ Whitelabel Song Ánh (360/brand-config.json)',
    test: () => fs.existsSync(path.join(ROOT, '360/brand-config.json')) &&
                fs.existsSync(path.join(ROOT, 'scripts/360-brand.js')),
  },
  {
    name: '10. Website VuaOffice & Trình sinh Changelog tự động',
    test: () => fs.existsSync(path.join(ROOT, 'tools/sync-site-updates.mjs')) &&
                fs.existsSync(path.join(ROOT, 'docs/updates.json')),
  }
];

let allPassed = true;
for (const item of checks) {
  try {
    if (item.test()) {
      console.log(`  ✅ ${item.name}`);
    } else {
      console.error(`  ❌ THẤT BẠI: ${item.name} đã bị mất hoặc bị ghi đè!`);
      allPassed = false;
    }
  } catch (err) {
    console.error(`  ❌ LỖI KIỂM TRA: ${item.name} (${err.message})`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('\n🚨 CẢNH BÁO: Phát hiện tính năng 360 CORP bị thất lạc sau merge hoặc cập nhật! Vui lòng khôi phục trước khi release.');
  process.exit(1);
}

console.log('\n🎉 [360-Features] ĐẠT — Toàn bộ 10/10 tính năng độc quyền của 360 CORP được bảo toàn đầy đủ 100%!\n');
