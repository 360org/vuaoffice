import React, { useState } from 'react'

export interface BrainFact {
  id: string
  category: string
  title: string
  content: string
}

const DEMO_FACTS = [
  'BSR-2025 (Việt Á Châu)',
  'New-hire onboarding (Thanh Nhàn Nguyễn)',
  'siec-star.edu.vn tenant administration',
  'VCloud Mobile 2.4 TestFlight',
  'OneDrive storage crisis',
]

const IDENTITY_FIELDS = [
  {
    label: 'Tên / Name',
    value: 'Chau Le',
  },
  {
    label: 'Vai trò / Role',
    value: 'CEO / founder-operator, 360 CORP (Công ty Cổ phần Đầu tư Phát triển Công nghệ 360)',
  },
  {
    label: 'Thương hiệu trực thuộc / Also operates',
    value: 'W360S CORP — adjacent brand, publisher of VCloud Mobile on TestFlight',
  },
  {
    label: 'Tổ chức / Organization',
    value: '360 CORP — Agentic AI, Cloud ERP/CRM (Odoo-based), Growth Ops for Vietnamese businesses',
  },
  {
    label: 'Trụ sở / HQ',
    value: 'Lầu 6, VCCI Tower, 155 Nguyễn Thái Học, Vũng Tàu',
  },
  {
    label: 'Địa điểm làm việc / Office location',
    value: '155 Nguyễn Thái Học, TP.HCM & Vũng Tàu',
  },
  {
    label: 'Ngôn ngữ / Languages',
    value: 'Vietnamese (primary), English (fluent-utilitarian; grammar loosens on mobile / low-stakes threads)',
  },
  {
    label: 'Giai đoạn phát triển / Life stage',
    value: 'Active operator/CEO of a growing SME; hiring cycle in progress; VCloud Mobile in intensive iteration',
  },
  {
    label: 'Nhịp làm việc / Working rhythm',
    value: 'Office 8:00–17:00 Mon–Sat; weekend-active — mailbox shows Saturday activity 11:00–17:00 ICT',
  },
]

export const BrainView: React.FC = () => {
  const [facts] = useState<string[]>(DEMO_FACTS)
  const [identities] = useState(IDENTITY_FIELDS)

  return (
    <div className="brain-container">
      <div className="brain-scroll-area">
        {/* Header Hero Section */}
        <div className="brain-header">
          <div className="brain-header-main">
            <h1 className="brain-title">Email Brain</h1>
            <div className="brain-subtitle">
              Trí tuệ nhân tạo VuaOffice phân tích & học hỏi từ hộp thư của Sếp Chau Le
            </div>
          </div>
          <div className="brain-badge-group">
            <span className="brain-badge highlight">55 facts learned</span>
            <span className="brain-badge">updated 3h ago</span>
          </div>
        </div>

        {/* Brain Quick Facts Card */}
        <div className="brain-card hero-card">
          <div className="brain-card-title">Chủ đề & Dự án nổi bật gần đây</div>
          <ul className="brain-facts-list">
            {facts.map((fact, idx) => (
              <li key={idx} className="brain-fact-item">
                <span className="brain-bullet">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          <div className="brain-card-footer">
            <span className="brain-read-count">Đã đọc và đồng bộ 35 emails mới nhất</span>
          </div>
        </div>

        {/* Identity Section */}
        <div className="brain-section-title">Identity & Profile (Hồ sơ Sếp & Tổ chức)</div>
        <div className="brain-identity-grid">
          {identities.map((item, idx) => (
            <div key={idx} className="brain-card identity-card">
              <div className="identity-label">{item.label}</div>
              <div className="identity-value">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
