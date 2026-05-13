'use client'

type RewardPopupProps = {
  text: string
  visible: boolean
}

export default function RewardPopup({ text, visible }: RewardPopupProps) {
  if (!visible || !text.trim()) return null
  /** Инлайн: в Tailwind `bottom-[calc(...,0px)]` запятая в `var(..., fallback)` ломает разбор класса. */
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[70] w-full max-w-[28rem] -translate-x-1/2 px-3"
      style={{
        bottom:
          'calc(var(--chat-composer-top-from-bottom, calc(var(--app-bottom-offset) + var(--chat-composer-stack-height, 0px))) + 0.625rem)',
      }}
    >
      <div className="rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/95 px-4 py-2 text-center text-[13px] font-semibold text-[var(--text)] shadow-lg backdrop-blur">
        {text}
      </div>
    </div>
  )
}
