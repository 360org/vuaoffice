const ALLOWED_ORIGINS = new Set([
  'https://vuaoffice.com',
  'https://www.vuaoffice.com',
]);
const ALLOWED_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);
const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = 14 * 1024 * 1024;
const MAX_TEXT_LENGTHS = {
  title: 120,
  version: 40,
  os: 80,
  description: 5000,
  expected: 3000,
};
const APPS = new Set([
  'Docs',
  'Sheets',
  'Slides',
  'PDF',
  'Markdown',
  'Mail & Calendar',
  'AI',
  'other',
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return originResponse(origin);
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ message: 'Yêu cầu không hợp lệ.' }, 403, origin);
    }

    if (url.pathname.startsWith('/api/feedback/images/')) {
      return serveImage(request, env, url.pathname, origin);
    }

    if (url.pathname !== '/api/feedback' || request.method !== 'POST') {
      return json({ message: 'Không tìm thấy đường dẫn.' }, 404, origin);
    }

    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.FEEDBACK_IMAGES) {
      return json({ message: 'Biểu mẫu tạm thời chưa sẵn sàng.' }, 503, origin);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return json({ message: 'Tổng dung lượng tệp vượt quá giới hạn.' }, 413, origin);
    }
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data')) {
      return json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, 415, origin);
    }

    if (await isRateLimited(request, env)) {
      return json({ message: 'Bạn đã gửi quá nhiều phản hồi. Vui lòng thử lại sau ít phút.' }, 429, origin);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, 400, origin);
    }

    const values = readValues(form);
    const validationMessage = validate(values);
    if (validationMessage) {
      return json({ message: validationMessage }, 400, origin);
    }

    const files = form.getAll('images').filter((value) => value instanceof File && value.size > 0);
    if (files.length > MAX_FILES) {
      return json({ message: 'Bạn chỉ có thể đính kèm tối đa 3 ảnh.' }, 400, origin);
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
        return json({ message: 'Ảnh không hợp lệ hoặc vượt quá dung lượng cho phép.' }, 400, origin);
      }
      if (!(await hasExpectedSignature(file))) {
        return json({ message: 'Một trong các tệp đính kèm không phải là ảnh hợp lệ.' }, 400, origin);
      }
    }

    const uploadedKeys = [];
    try {
      const imageUrls = [];
      for (const file of files) {
        const extension = ALLOWED_TYPES.get(file.type);
        const key = `images/${crypto.randomUUID()}.${extension}`;
        await env.FEEDBACK_IMAGES.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });
        uploadedKeys.push(key);
        imageUrls.push(`${url.origin}/api/feedback/images/${key}`);
      }

      const issue = await createIssue(values, imageUrls, env);
      return json({ message: 'Đã ghi nhận phản hồi.', issueUrl: issue.html_url }, 201, origin);
    } catch {
      await Promise.all(uploadedKeys.map((key) => env.FEEDBACK_IMAGES.delete(key)));
      return json({ message: 'Chưa thể ghi nhận phản hồi. Vui lòng thử lại sau.' }, 502, origin);
    }
  },
};

function readValues(form) {
  return {
    kind: String(form.get('kind') || '').trim(),
    app: String(form.get('app') || '').trim(),
    title: String(form.get('title') || '').trim(),
    version: String(form.get('version') || '').trim(),
    os: String(form.get('os') || '').trim(),
    description: String(form.get('description') || '').trim(),
    expected: String(form.get('expected') || '').trim(),
    consent: String(form.get('consent') || '').trim(),
    website: String(form.get('website') || '').trim(),
  };
}

function validate(values) {
  if (!['bug', 'feature'].includes(values.kind) || !APPS.has(values.app)) {
    return 'Vui lòng chọn loại phản hồi và phần liên quan.';
  }
  if (!values.title || !values.description) {
    return 'Vui lòng điền tiêu đề và mô tả.';
  }
  for (const [field, maxLength] of Object.entries(MAX_TEXT_LENGTHS)) {
    if (values[field].length > maxLength) return 'Một số nội dung vượt quá độ dài cho phép.';
  }
  if (values.consent !== 'on' && values.consent !== 'true') {
    return 'Vui lòng xác nhận nội dung không chứa dữ liệu nhạy cảm.';
  }
  if (values.website) return 'Yêu cầu không hợp lệ.';
  return '';
}

async function createIssue(values, imageUrls, env) {
  const typeLabel = values.kind === 'bug' ? 'Bug' : 'Feature';
  const body = [
    `## ${typeLabel} từ biểu mẫu VuaOffice`,
    '',
    `**Phần liên quan:** ${escapeInline(values.app)}`,
    `**Phiên bản:** ${escapeInline(values.version || 'Chưa cung cấp')}`,
    `**Hệ điều hành:** ${escapeInline(values.os || 'Chưa cung cấp')}`,
    '',
    '### Mô tả',
    textBlock(values.description),
    '',
    '### Kết quả mong đợi / nhu cầu',
    textBlock(values.expected || 'Chưa cung cấp'),
    '',
    imageUrls.length ? '### Ảnh chụp màn hình\n' + imageUrls.map((url, index) => `![Ảnh ${index + 1}](${url})`).join('\n') : '',
    '',
    '<sub>Phản hồi được gửi qua biểu mẫu trên vuaoffice.com. Không đưa dữ liệu nhạy cảm vào phản hồi công khai.</sub>',
  ].filter(Boolean).join('\n');

  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/issues`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'VuaOffice-feedback-form',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[${typeLabel}] ${values.title}`,
      body,
      labels: [values.kind === 'bug' ? 'bug' : 'enhancement'],
    }),
  });

  if (!response.ok) throw new Error('github-request-failed');
  return response.json();
}

async function isRateLimited(request, env) {
  if (!env.FEEDBACK_RATE_LIMIT) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const window = Math.floor(Date.now() / 60000);
  const key = `feedback:${ip}:${window}`;
  const count = Number(await env.FEEDBACK_RATE_LIMIT.get(key) || 0);
  if (count >= 5) return true;
  await env.FEEDBACK_RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 120 });
  return false;
}

async function hasExpectedSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/png') {
    return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  }
  if (file.type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

async function serveImage(request, env, pathname, origin) {
  if (!['GET', 'HEAD'].includes(request.method)) return json({ message: 'Phương thức không được hỗ trợ.' }, 405, origin);
  if (!env.FEEDBACK_IMAGES) return json({ message: 'Không tìm thấy ảnh.' }, 404, origin);
  const key = decodeURIComponent(pathname.slice('/api/feedback/images/'.length));
  if (!/^images\/[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) return json({ message: 'Không tìm thấy ảnh.' }, 404, origin);
  const object = await env.FEEDBACK_IMAGES.get(key);
  if (!object) return json({ message: 'Không tìm thấy ảnh.' }, 404, origin);
  const headers = new Headers({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

function textBlock(value) {
  return `<pre>${escapeHtml(value)}</pre>`;
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeInline(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('*', '\\*');
}

function originResponse(origin) {
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

function corsHeaders(origin) {
  return origin && ALLOWED_ORIGINS.has(origin)
    ? {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
      }
    : {};
}
