type MenuToggleIconProps = {
  open?: boolean
  className?: string
}

export function MenuToggleIcon({ open = false, className = 'h-5 w-5' }: MenuToggleIconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
      />
    </svg>
  )
}
