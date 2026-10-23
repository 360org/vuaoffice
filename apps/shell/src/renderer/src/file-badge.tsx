import iconDocx from './assets/file-docx.svg'
import iconXlsx from './assets/file-xlsx.svg'
import iconPptx from './assets/file-pptx.svg'
import iconPdf from './assets/file-pdf.svg'
import iconMd from './assets/file-md.svg'
import iconHtml from './assets/file-html.svg'

const FILE_ICONS: Record<string, string> = {
  docx: iconDocx,
  odt: iconDocx,
  ott: iconDocx,
  xlsx: iconXlsx,
  xlsm: iconXlsx,
  ods: iconXlsx,
  ots: iconXlsx,
  pptx: iconPptx,
  odp: iconPptx,
  otp: iconPptx,
  pdf: iconPdf,
  md: iconMd,
  markdown: iconMd,
  html: iconHtml,
  htm: iconHtml,
}

export function FileBadge({ ext, size }: { ext: string; size: number }) {
  // 360: VuaOffice Mail .eml badge
  if (ext === 'eml') {
    return (
      <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden="true">
        <rect width="240" height="240" rx="48" fill="#0078D4" />
        <path
          d="M52 76L120 128L188 76"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="52" y="76" width="136" height="88" rx="8" stroke="#ffffff" strokeWidth="14" fill="none" />
      </svg>
    )
  }
  const icon = FILE_ICONS[ext]
  if (icon) {
    return <img src={icon} width={size} height={size} alt="" aria-hidden="true" />
  }
  const label = ext ? ext[0].toUpperCase() : '?'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7.5" fill="#98a2b3" />
      <text
        x="16"
        y="16.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={17}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
    </svg>
  )
}
