'use client'

import { useEffect, useState } from 'react'

type RewardPopupProps = {
  text: string
  visible: boolean
}

type RewardLayer = { text: string; state: 'in' | 'shown' | 'out' }

const EXIT_ANIM_MS = 320

export default function RewardPopup({ text, visible }: RewardPopupProps) {
  const [layer, setLayer] = useState<RewardLayer | null>(null)

  useEffect(() => {
    if (visible && text.trim()) {
      setLayer({ text: text.trim(), state: 'in' })
    }
  }, [visible, text])

  useEffect(() => {
    if (visible) return
    setLayer((prev) => (prev && prev.state !== 'out' ? { ...prev, state: 'out' } : prev))
  }, [visible])

  useEffect(() => {
    if (!layer || layer.state !== 'out') return
    const id = window.setTimeout(() => setLayer(null), EXIT_ANIM_MS)
    return () => window.clearTimeout(id)
  }, [layer])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName !== 'rewardPopupIn') return
    setLayer((prev) => (prev && prev.state === 'in' ? { ...prev, state: 'shown' } : prev))
  }

  if (!layer) return null

  /** Инлайн: в Tailwind `bottom-[calc(...,0px)]` запятая в `var(..., fallback)` ломает разбор класса. */
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[70] w-full max-w-[28rem] -translate-x-1/2 px-3"
      style={{
        bottom:
          'calc(var(--chat-composer-top-from-bottom, calc(var(--app-bottom-offset) + var(--chat-composer-stack-height, 0px))) + 0.625rem)',
      }}
    >
      <div
        data-reward-state={layer.state}
        onAnimationEnd={handleAnimationEnd}
        className="reward-popup-pill rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/95 px-4 py-2 text-center text-[13px] font-semibold text-[var(--text)] shadow-lg backdrop-blur"
      >
        {layer.text}
      </div>
    </div>
  )
}
