type MenuToggleIconProps = {
  className?: string
}

export function MenuToggleIcon({ className = 'h-5 w-5' }: MenuToggleIconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
