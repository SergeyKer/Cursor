'use client'

import React from 'react'
import { formatCallDuration } from '@/lib/engvo/formatCallDuration'

type EngvoCallTimerProps = {
  startedAt: number | null
  running: boolean
}

export default function EngvoCallTimer({ startedAt, running }: EngvoCallTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

  React.useEffect(() => {
    if (!running || startedAt === null) {
      setElapsedSeconds(0)
      return
    }

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [running, startedAt])

  const label = formatCallDuration(elapsedSeconds)

  return (
    <span
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      className="shrink-0 min-w-[3rem] text-center text-[15px] font-medium tabular-nums text-[color-mix(in_srgb,var(--text)_68%,var(--text-muted))] sm:text-base"
    >
      {label}
    </span>
  )
}
