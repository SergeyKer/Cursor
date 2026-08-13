/**
 * Vocab cards — visual parity with ProgressCard v1.
 * Intentional fork: do not import Progress / MyPlan cards or APP_BTN_CARD_* from homeCtaStyles.
 */

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'

const BTN_INTERACTION_BASE =
  'btn-3d-menu shadow-md transition-all duration-200 hover:shadow-lg touch-manipulation'

const BTN_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-60'

const BTN_FONT_INLINE =
  'text-sm font-medium leading-snug antialiased [font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Noto_Sans",Arial,sans-serif]'

const LAUNCH_SKIN =
  'border border-[#93c5fd] bg-gradient-to-b from-[#dbeafe] to-[#93c5fd] text-[#1e40af] hover:brightness-105 active:brightness-95'

const EXPAND_SKIN =
  'border border-[#5eead4] bg-gradient-to-b from-[#ccfbf1] to-[#99f6e4] text-[#115e59] hover:brightness-105 active:brightness-95'

export const VOCAB_CARD_SURFACE = [
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]',
  LESSON_CARD_RADIUS_CLASS,
  'overflow-hidden',
].join(' ')

export const VOCAB_CARD_HEADER = 'bg-[var(--chat-section-slate)] px-4 py-3'

export const VOCAB_CARD_HEADER_TITLE =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

export const VOCAB_CARD_BODY =
  'space-y-1.5 border-t border-[var(--chat-section-card-divider)] bg-white px-4 py-2.5'

/** Body when inset CTA follows: no py-2.5 — pb-0 cannot override py in Tailwind. */
export const VOCAB_CARD_BODY_BEFORE_INSET =
  'space-y-1.5 border-t border-[var(--chat-section-card-divider)] bg-white px-4 pt-2.5'

/** Streak-tile inset: px-2.5 sm:px-3, bottom 0.625rem. No border-t above the button. */
export const VOCAB_INSET_CTA_WRAP = 'bg-white px-2.5 pb-2.5 sm:px-3'

export const VOCAB_CARD_BODY_TITLE =
  'break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]'

export const VOCAB_CARD_BODY_REASON =
  'break-words text-[14px] leading-snug text-[var(--text-muted)]'

export const VOCAB_CARD_FOOTER_WRAP =
  'border-t border-[var(--chat-section-neutral-border)] bg-white'

export const VOCAB_CARD_FOOTER_LAUNCH = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

const VOCAB_INSET_BTN_BOX =
  'flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center'

/** Progress streak STATUS_INSET_LAUNCH_BTN — copy, do not import Progress. */
export const VOCAB_INSET_LAUNCH_BTN = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  `mt-3 ${VOCAB_INSET_BTN_BOX}`,
].join(' ')

/** Inset launch without mt-3 — for a grid row of two CTAs. */
export const VOCAB_INSET_LAUNCH_BTN_FLUSH = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  VOCAB_INSET_BTN_BOX,
].join(' ')

export const VOCAB_CARD_FOOTER_EXPAND = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Same geometry as VOCAB_INSET_LAUNCH_BTN; expand skin. */
export const VOCAB_INSET_EXPAND_BTN = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  `mt-3 ${VOCAB_INSET_BTN_BOX}`,
].join(' ')

export const VOCAB_INSET_EXPAND_BTN_FLUSH = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  VOCAB_INSET_BTN_BOX,
].join(' ')

export const VOCAB_CARD_FOOTER_ACTION = [
  BTN_INTERACTION_BASE,
  'flex w-full min-h-11 items-center justify-center rounded-none border border-[var(--border)] bg-white px-4 py-2.5 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const VOCAB_STATUS_TILE =
  'chat-section-surface glass-surface min-w-0 overflow-hidden rounded-[var(--bubble-radius-assistant,1rem)] border border-[var(--chat-section-neutral-border)] bg-white px-3 py-2.5 text-center'

export const VOCAB_SHELF_CHIP =
  'btn-3d-menu chat-section-surface glass-surface inline-flex min-w-0 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap rounded-[var(--bubble-radius-assistant,1rem)] border border-[var(--chat-section-neutral-border)] bg-white px-2 py-1.5 text-center text-[13px] font-semibold leading-tight text-[var(--text-muted)] hover:bg-slate-50 active:bg-slate-100'

export const VOCAB_SHELF_CHIP_ACTIVE =
  'border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] text-[var(--text)] hover:bg-[var(--chat-shell-bg)] active:bg-[var(--chat-shell-bg)]'

export const VOCAB_COMPOSER_SECONDARY = [
  BTN_INTERACTION_BASE,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
].join(' ')
