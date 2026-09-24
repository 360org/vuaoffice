import React from 'react'
import iconUrl from '../../assets/vuaoffice-icon.svg'

export function GensparkMark({ size = 18 }: { size?: number }): React.JSX.Element {
  return (
    <img
      src={iconUrl}
      width={size}
      height={size}
      alt="VuaOffice AI"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        flexShrink: 0,
      }}
      aria-hidden
    />
  )
}
