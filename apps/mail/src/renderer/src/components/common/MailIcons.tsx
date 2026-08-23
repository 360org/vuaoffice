import React from 'react'

export interface IconProps {
  size?: number
  className?: string
  color?: string
  strokeWidth?: number
  fill?: string
  style?: React.CSSProperties
}

function Svg({
  size = 16,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.5,
  fill = 'none',
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Mail Core Icons
export const IconMail: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Svg>
)

export const IconMailPlus: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    <path d="M19 16v6" />
    <path d="M16 19h6" />
  </Svg>
)

export const IconMailOpen: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
    <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
  </Svg>
)

export const IconMailUnread: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
    <circle cx="18" cy="6" r="3" fill="#0077cd" stroke="none" />
  </Svg>
)

export const IconSend: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
)

export const IconInbox: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Svg>
)

export const IconArchive: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect width="22" height="5" x="1" y="3" rx="1" />
    <line x1="10" x2="14" y1="12" y2="12" />
  </Svg>
)

export const IconTrash: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </Svg>
)

export const IconJunk: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" x2="19.07" y1="4.93" y2="19.07" />
  </Svg>
)

export const IconReply: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </Svg>
)

export const IconReplyAll: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="7 17 2 12 7 7" />
    <polyline points="12 17 7 12 12 7" />
    <path d="M22 18v-2a4 4 0 0 0-4-4H7" />
  </Svg>
)

export const IconForward: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="15 17 20 12 15 7" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
  </Svg>
)

export const IconStar: React.FC<IconProps & { active?: boolean }> = ({ active, ...props }) => (
  <Svg
    {...props}
    fill={active ? '#f59e0b' : 'none'}
    color={active ? '#f59e0b' : (props.color || 'currentColor')}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
)

export const IconFlag: React.FC<IconProps & { active?: boolean }> = ({ active, ...props }) => (
  <Svg
    {...props}
    fill={active ? '#e11d48' : 'none'}
    color={active ? '#e11d48' : (props.color || 'currentColor')}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </Svg>
)

export const IconPaperclip: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Svg>
)

export const IconTag: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </Svg>
)

export const IconFolder: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </Svg>
)

export const IconFolderMove: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    <polyline points="12 11 12 17 15 14" />
  </Svg>
)

export const IconCalendar: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </Svg>
)

export const IconCalendarPlus: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M10 16h4" />
    <path d="M12 14v4" />
  </Svg>
)

export const IconClock: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Svg>
)

export const IconUser: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
)

export const IconUsers: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
)

export const IconCheck: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
)

export const IconCheckCircle: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
)

export const IconCheckSquare: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Svg>
)

export const IconSquare: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
  </Svg>
)

export const IconRefresh: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </Svg>
)

export const IconFilter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Svg>
)

export const IconSearch: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </Svg>
)

export const IconX: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
)

export const IconSparkles: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </Svg>
)

export const IconMapPin: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
)

export const IconLightning: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
)

export const IconBrain: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M12 5v13" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M6 15a6 6 0 0 0 12 0" />
  </Svg>
)

export const IconSettings: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconChevronDown: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const IconChevronRight: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
)

export const IconPlus: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Svg>
)

export const IconFileText: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </Svg>
)

export const IconPhone: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
)

export const IconBuilding: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </Svg>
)

export const IconBriefcase: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
)

export const IconLink: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
)

export const IconList: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </Svg>
)

export const IconListOrdered: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="10" x2="21" y1="6" y2="6" />
    <line x1="10" x2="21" y1="12" y2="12" />
    <line x1="10" x2="21" y1="18" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </Svg>
)

export const IconLock: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
)

export const IconKey: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </Svg>
)

export const IconBox: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </Svg>
)

export const IconKeyboard: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
    <path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" />
    <path d="M6 12h.001" /><path d="M18 12h.001" />
    <path d="M10 12h4" />
  </Svg>
)

export const IconEdit: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Svg>
)

export const IconGlobe: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </Svg>
)

export const IconMicrosoft: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="9" height="9" x="2" y="2" fill="#f25022" stroke="none" />
    <rect width="9" height="9" x="13" y="2" fill="#7fba00" stroke="none" />
    <rect width="9" height="9" x="2" y="13" fill="#00a4ef" stroke="none" />
    <rect width="9" height="9" x="13" y="13" fill="#ffb900" stroke="none" />
  </Svg>
)

export const IconGoogle: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="#ea4335" strokeWidth={1.5} />
    <path d="M12 7v5l3 3" stroke="#4285f4" />
  </Svg>
)

export const IconApple: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 20.94c1.88 0 2.93-.87 4.31-.87 1.34 0 2.22.84 4.09.84 1.94 0 3.34-1.81 4.56-3.66-1.53-.87-2.53-2.47-2.53-4.31 0-2.81 2.31-4.16 2.41-4.22-1.31-1.91-3.34-2.12-4.06-2.16-1.72-.19-3.41 1.03-4.28 1.03-.91 0-2.28-.97-3.75-.97-2.75 0-5.31 2.19-5.31 6.5 0 2.44.97 4.97 2.16 6.69 1.13 1.62 2.19 3.16 3.63 3.16M15.53 5.34c.75-.94 1.25-2.22 1.12-3.53-1.12.06-2.47.75-3.25 1.69-.69.81-1.31 2.12-1.16 3.38 1.25.09 2.53-.63 3.29-1.54z" />
  </Svg>
)

export const IconYahoo: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M4 4l6 8v8h4v-8l6-8h-4.2l-3.8 5.6-3.8-5.6H4z" />
  </Svg>
)

export const IconServer: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  </Svg>
)

export const IconDatabase: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Svg>
)

export const IconLayoutSidebarRight: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="15" x2="15" y1="3" y2="21" />
  </Svg>
)

export const IconImportExport: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
)

export const IconSendReceive: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Svg>
)

export const IconPin: React.FC<IconProps & { active?: boolean }> = ({ active, ...props }) => (
  <Svg
    {...props}
    fill={active ? '#0077cd' : 'none'}
    color={active ? '#0077cd' : (props.color || 'currentColor')}
  >
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-2l-2-2V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v8l-2 2v2z" />
  </Svg>
)

export const IconCalendarCheck: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </Svg>
)

export const IconExternalLink: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </Svg>
)

export const IconMaximize: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </Svg>
)

export const IconMinimize: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </Svg>
)

export const IconAlignLeft: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="17" x2="3" y1="10" y2="10" />
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="3" y1="14" y2="14" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </Svg>
)

export const IconAlignCenter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="18" x2="6" y1="10" y2="10" />
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="3" y1="14" y2="14" />
    <line x1="18" x2="6" y1="18" y2="18" />
  </Svg>
)

export const IconAlignRight: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="21" x2="7" y1="10" y2="10" />
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="3" y1="14" y2="14" />
    <line x1="21" x2="7" y1="18" y2="18" />
  </Svg>
)

export const IconAlignJustify: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="3" y1="10" y2="10" />
    <line x1="21" x2="3" y1="14" y2="14" />
    <line x1="21" x2="3" y1="18" y2="18" />
  </Svg>
)

export const IconQuote: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
  </Svg>
)

export const IconCode: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Svg>
)

export const IconUndo: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </Svg>
)

export const IconRestore: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
)

export const IconRedo: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </Svg>
)

export const IconImage: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Svg>
)

export const IconTable: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="3" x2="21" y1="15" y2="15" />
    <line x1="9" x2="9" y1="3" y2="21" />
    <line x1="15" x2="15" y1="3" y2="21" />
  </Svg>
)

export const IconSignature: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88" />
    <path d="M19 21h4" />
  </Svg>
)

export const IconTemplate: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="9" x2="9" y1="21" y2="9" />
  </Svg>
)

export const IconBell: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
)

export const IconType: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" x2="15" y1="20" y2="20" />
    <line x1="12" x2="12" y1="4" y2="20" />
  </Svg>
)

export const IconSliders: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="1" x2="7" y1="14" y2="14" />
    <line x1="9" x2="15" y1="8" y2="8" />
    <line x1="17" x2="23" y1="16" y2="16" />
  </Svg>
)

export const IconShield: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
)

export const IconPrinter: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect width="12" height="8" x="6" y="14" />
  </Svg>
)

export const IconDownload: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
)

export const IconContact: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <line x1="8" x2="8" y1="2" y2="4" />
    <line x1="16" x2="16" y1="2" y2="4" />
  </Svg>
)

