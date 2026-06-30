'use client'

import { START_RUNTIME_COPY } from '@/lib/uiCopy/startRuntimeCopy'

export type RuntimeLoadingVariant = 'appShell' | 'branch'

type RuntimeLoadingOverlayProps = {
  variant?: RuntimeLoadingVariant
  className?: string
}

export default function RuntimeLoadingOverlay({
  variant = 'branch',
  className = '',
}: RuntimeLoadingOverlayProps) {
  const label =
    variant === 'appShell' ? START_RUNTIME_COPY.appShellLoading : START_RUNTIME_COPY.branchLoading

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full justify-center px-4 py-6 ${className}`}
    >
      <p className="text-center text-[14px] font-medium leading-relaxed text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  )
}
