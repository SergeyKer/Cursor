type SessionExitIconProps = {
  className?: string
}

/** Крестик выхода из mid-cycle задания (stroke как MenuToggleIcon). */
export function SessionExitIcon({ className = 'h-5 w-5' }: SessionExitIconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
