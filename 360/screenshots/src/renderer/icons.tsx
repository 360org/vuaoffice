import type { ReactElement } from 'react'

/**
 * Toolbar glyphs, drawn for VuaOffice (24×24, stroke = currentColor so they
 * follow the theme's text token). No third-party artwork.
 */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const ICONS: Record<string, ReactElement> = {
  area: (
    <svg {...base}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    </svg>
  ),
  window: (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6.5" cy="6.5" r=".6" fill="currentColor" />
    </svg>
  ),
  fullscreen: (
    <svg {...base}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  open: (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  ),
  arrow: (
    <svg {...base}>
      <path d="M5 19 19 5M10 5h9v9" />
    </svg>
  ),
  rect: (
    <svg {...base}>
      <rect x="4" y="6" width="16" height="12" rx="1" />
    </svg>
  ),
  ellipse: (
    <svg {...base}>
      <ellipse cx="12" cy="12" rx="9" ry="6.5" />
    </svg>
  ),
  line: (
    <svg {...base}>
      <path d="M5 19 19 5" />
    </svg>
  ),
  pen: (
    <svg {...base}>
      <path d="M4 20c3-1 4-4 7-4s3 3 6 2 3-6 3-6" />
      <path d="M16 4l4 4-9 9H7v-4z" />
    </svg>
  ),
  marker: (
    <svg {...base}>
      <path d="m15 5 4 4-8 8H7v-4z" />
      <path d="M4 21h16" strokeWidth="3" opacity=".45" />
    </svg>
  ),
  text: (
    <svg {...base}>
      <path d="M5 6V4h14v2M12 4v16M9 20h6" />
    </svg>
  ),
  step: (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.5 9 12.5 7.5V16.5" />
    </svg>
  ),
  blur: (
    <svg {...base} fill="currentColor" stroke="none">
      <rect x="3" y="3" width="5" height="5" opacity=".9" />
      <rect x="9.5" y="3" width="5" height="5" opacity=".45" />
      <rect x="16" y="3" width="5" height="5" opacity=".75" />
      <rect x="3" y="9.5" width="5" height="5" opacity=".5" />
      <rect x="9.5" y="9.5" width="5" height="5" opacity=".85" />
      <rect x="16" y="9.5" width="5" height="5" opacity=".35" />
      <rect x="3" y="16" width="5" height="5" opacity=".7" />
      <rect x="9.5" y="16" width="5" height="5" opacity=".4" />
      <rect x="16" y="16" width="5" height="5" opacity=".9" />
    </svg>
  ),
  crop: (
    <svg {...base}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  ),
  undo: (
    <svg {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  ),
  redo: (
    <svg {...base}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  ),
  copy: (
    <svg {...base}>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  save: (
    <svg {...base}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
}
