/**
 * My Plan card styles — visual parity with ProgressCard v1.
 * Intentional fork: do not import ProgressCard / APP_BTN_CARD_* from homeCtaStyles.
 */

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'

const BTN_INTERACTION_BASE =
  'btn-3d-menu shadow-md transition-all duration-200 hover:shadow-lg touch-manipulation'

const BTN_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-60'

const BTN_FONT_INLINE =
  'text-sm font-medium leading-snug antialiased [font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Noto_Sans",Arial,sans-serif]'

const LAUNCH_SKIN =
  'border border-[#93c5fd] bg-gradient-to-b from-[#dbeafe] to-[#93c5fd] text-[#1e40af] hover:brightness-105 active:brightness-95'

/** Parity with CARD_EXPAND_SKIN — copy, do not import from homeCtaStyles. */
const EXPAND_SKIN =
  'border border-[#5eead4] bg-gradient-to-b from-[#ccfbf1] to-[#99f6e4] text-[#115e59] hover:brightness-105 active:brightness-95'

export const MY_PLAN_CARD_SURFACE = [
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]',
  LESSON_CARD_RADIUS_CLASS,
  'overflow-hidden',
].join(' ')

export const MY_PLAN_CARD_HEADER = 'bg-[var(--chat-section-slate)] px-4 py-3'

export const MY_PLAN_CARD_HEADER_TITLE =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

export const MY_PLAN_CARD_BODY =
  'space-y-1.5 border-t border-[var(--chat-section-neutral-border)] bg-white px-4 py-2.5'

export const MY_PLAN_CARD_BODY_TITLE =
  'break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]'

export const MY_PLAN_CARD_BODY_REASON =
  'break-words text-[14px] leading-snug text-[var(--text-muted)]'

export const MY_PLAN_CARD_FOOTER_WRAP =
  'border-t border-[var(--chat-section-neutral-border)] bg-white'

export const MY_PLAN_CARD_FOOTER_LAUNCH = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const MY_PLAN_CARD_FOOTER_EXPAND = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const MY_PLAN_CARD_FOOTER_ACTION = [
  BTN_INTERACTION_BASE,
  'flex w-full min-h-11 items-center justify-center rounded-none border border-[var(--border)] bg-white px-4 py-2.5 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')
