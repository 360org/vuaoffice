export interface EmailSignature {
  id: string
  name: string
  contentHtml: string
  isDefault?: boolean
}

export interface EmailTemplate {
  id: string
  title: string
  subject: string
  bodyHtml: string
  category?: string
}

const DEFAULT_SIGNATURES: EmailSignature[] = [
  {
    id: 'sig-default',
    name: 'Chữ ký công việc chuẩn (360 CORP)',
    contentHtml: `<p style="margin-top: 16px; font-family: Segoe UI, sans-serif; font-size: 13px; color: #232425; line-height: 1.6;">
--<br/>
<strong>Châu Lê</strong><br/>
<span style="color: #0077cd; font-weight: 600;">360 CORP | VuaOffice Suite Team</span><br/>
<span style="color: #606366; font-size: 12px;">Email: support@360.org.vn | Hotline: 1900 xxxx<br/>Website: <a href="https://360.org.vn" style="color: #0077cd; text-decoration: none;">https://360.org.vn</a></span>
</p>`,
    isDefault: true,
  },
  {
    id: 'sig-simple',
    name: 'Chữ ký ngắn gọn',
    contentHtml: `<p style="margin-top: 12px; font-family: Segoe UI, sans-serif; font-size: 12.5px; color: #606366;">
Trân trọng,<br/>
<strong>Châu Lê</strong> (VuaOffice)
</p>`,
    isDefault: false,
  },
]

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-meeting',
    title: 'Thư mời họp / Lịch làm việc',
    subject: '[Thư mời họp] Trao đổi kế hoạch triển khai dự án',
    category: 'Công việc',
    bodyHtml: `<p>Kính gửi Anh/Chị và Quý đối tác,</p>
<p>Ban dự án xin trân trọng kính mời Anh/Chị tham dự buổi họp trao đổi kế hoạch triển khai công việc sắp tới.</p>
<p><strong>Thông tin chi tiết buổi họp:</strong></p>
<ul>
  <li><strong>Thời gian:</strong> 09:30 - 10:30, Thứ Hai</li>
  <li><strong>Hình thức:</strong> Trực tuyến qua VuaOffice Meeting / Văn phòng 360 CORP</li>
  <li><strong>Nội dung chính:</strong> Rà soát tiến độ, thống nhất giải pháp và phân công nhiệm vụ.</li>
</ul>
<p>Kính đề nghị Anh/Chị chuẩn bị trước các tài liệu liên quan để buổi làm việc đạt hiệu quả cao nhất.</p>
<p>Trân trọng cảm ơn,</p>`,
  },
  {
    id: 'tpl-quotation',
    title: 'Gửi báo giá & Đề xuất giải pháp',
    subject: 'Gửi Báo giá & Đề xuất giải pháp VuaOffice Suite - 360 CORP',
    category: 'Kinh doanh',
    bodyHtml: `<p>Kính gửi Quý khách hàng / Đối tác,</p>
<p>Lời đầu tiên, <strong>360 CORP</strong> xin gửi lời chào trân trọng và lời chúc sức khỏe - thành công đến Quý đơn vị.</p>
<p>Theo trao đổi trước đó, chúng tôi xin trân trọng gửi bảng đề xuất chi phí và lộ trình triển khai chi tiết giải pháp <strong>VuaOffice Suite</strong> như đính kèm.</p>
<p>Nếu có bất kỳ thắc mắc hoặc cần tùy biến thêm tính năng, Quý khách vui lòng liên hệ lại để được hỗ trợ giải đáp nhanh nhất.</p>
<p>Rất mong có cơ hội đồng hành và hợp tác cùng Quý khách!</p>
<p>Trân trọng,</p>`,
  },
  {
    id: 'tpl-leave-request',
    title: 'Đơn xin nghỉ phép',
    subject: '[Nghỉ phép] Đơn xin nghỉ phép - [Họ và tên]',
    category: 'Nhân sự',
    bodyHtml: `<p>Kính gửi Trưởng bộ phận và Phòng Nhân sự,</p>
<p>Tôi tên là: <strong>[Họ và tên]</strong> - Vị trí: <strong>[Chức danh / Bộ phận]</strong>.</p>
<p>Tôi viết email này để xin phép được nghỉ phép trong thời gian:</p>
<ul>
  <li><strong>Từ ngày:</strong> [DD/MM/YYYY]</li>
  <li><strong>Đến hết ngày:</strong> [DD/MM/YYYY] (Tổng cộng: [X] ngày làm việc)</li>
  <li><strong>Lý do:</strong> Giải quyết công việc gia đình cá nhân</li>
</ul>
<p>Trong thời gian nghỉ, tôi đã bàn giao các đầu việc khẩn cấp cho đồng nghiệp <strong>[Tên người nhận bàn giao]</strong> và vẫn duy trì kiểm tra email/điện thoại khi cần thiết.</p>
<p>Kính mong Ban Giám đốc và Trưởng bộ phận phê duyệt.</p>
<p>Trân trọng cảm ơn,</p>`,
  },
  {
    id: 'tpl-thankyou',
    title: 'Thư cảm ơn đối tác sau sự kiện',
    subject: 'Thư cảm ơn sự tham gia và đồng hành của Quý đối tác',
    category: 'Quan hệ đối ngoại',
    bodyHtml: `<p>Kính gửi Quý đối tác,</p>
<p>Thay mặt <strong>360 CORP / VuaOffice Team</strong>, chúng tôi xin gửi lời cảm ơn chân thành nhất đến Quý đơn vị đã dành thời gian quý báu tham dự sự kiện vừa qua.</p>
<p>Sự hiện diện và những ý kiến đóng góp quý báu của Quý vị là nguồn động viên to lớn cho sự phát triển của sản phẩm.</p>
<p>Chúng tôi sẽ sớm gửi tài liệu tổng kết và biên bản thảo luận trong email tiếp theo.</p>
<p>Kính chúc Quý đối tác luôn phát triển và gặt hái nhiều thành công mới!</p>
<p>Trân trọng,</p>`,
  },
]

const SIGNATURES_STORAGE_KEY = 'vuaoffice_mail_signatures'
const TEMPLATES_STORAGE_KEY = 'vuaoffice_mail_templates'

export function getStoredSignatures(): EmailSignature[] {
  try {
    const raw = localStorage.getItem(SIGNATURES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_SIGNATURES
}

export function saveStoredSignatures(signatures: EmailSignature[]): void {
  try {
    localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(signatures))
  } catch (err) {
    console.error('Failed to save signatures', err)
  }
}

export function getDefaultSignature(): EmailSignature | undefined {
  const list = getStoredSignatures()
  return list.find((s) => s.isDefault) || list[0]
}

export function getStoredTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_TEMPLATES
}

export function saveStoredTemplates(templates: EmailTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch (err) {
    console.error('Failed to save templates', err)
  }
}
