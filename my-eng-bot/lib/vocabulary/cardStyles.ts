/**
 * Vocab hub cards — one surface, no Progress/MyPlan chrome.
 * Do not import Progress / MyPlan cards or APP_BTN_CARD_* from homeCtaStyles.
 */

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { BTN_FONT_MENU } from '@/lib/homeCtaStyles'

const BTN_INTERACTION_BASE =
  'btn-3d-menu shadow-md transition-all duration-200 [@media(hover:hover)]:hover:shadow-lg touch-manipulation'

const BTN_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-60'

const LAUNCH_SKIN =
  'border border-[#93c5fd] bg-gradient-to-b from-[#dbeafe] to-[#93c5fd] text-[#1e40af] [@media(hover:hover)]:hover:brightness-105 active:brightness-95'

const EXPAND_SKIN =
  'border border-[#5eead4] bg-gradient-to-b from-[#ccfbf1] to-[#99f6e4] text-[#115e59] [@media(hover:hover)]:hover:brightness-105 active:brightness-95'

/** Hover/press shared with inset CTA brightness — no 3D, no shadow. */
export const VOCAB_TAP_INTERACTION =
  'cursor-pointer touch-manipulation transition-all duration-200 [@media(hover:hover)]:hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]'

export const VOCAB_CARD_SURFACE = [
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white',
  LESSON_CARD_RADIUS_CLASS,
  'overflow-hidden',
].join(' ')

export const VOCAB_CARD_HEADER = 'px-4 pt-3 pb-1'

export const VOCAB_CARD_HEADER_TITLE =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

/** Hub nav rows — body, not card header. */
export const VOCAB_NAV_TITLE = 'break-words text-[15px] font-normal leading-[1.45] text-[var(--text)]'

export const VOCAB_SCREEN_TITLE = 'text-[15px] font-semibold text-[var(--text)]'

export const VOCAB_CARD_BODY = 'space-y-1.5 px-4 py-2.5'

/** Body when inset CTA follows: no py-2.5 — pb-0 cannot override py in Tailwind. */
export const VOCAB_CARD_BODY_BEFORE_INSET = 'space-y-1.5 px-4 pt-2.5'

/** Inset CTA: padding on the wrap so button margin cannot collapse. */
export const VOCAB_INSET_CTA_WRAP = 'px-2.5 pt-3 pb-2.5 sm:px-3'

export const VOCAB_CARD_BODY_TITLE =
  'break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]'

export const VOCAB_CARD_BODY_REASON =
  'break-words text-[14px] leading-snug text-[var(--text-muted)]'

export const VOCAB_PAIR_LINE = 'break-words text-[15px] leading-[1.45] text-[var(--text)]'
export const VOCAB_PAIR_EN = 'font-semibold text-[var(--chat-label-main)]'
export const VOCAB_PAIR_RU = 'font-normal text-[var(--text)]'

export const VOCAB_LEMMA_EN_DRILL = 'font-semibold text-[var(--chat-label-main)]'
export const VOCAB_LEMMA_RU = 'text-[15px] leading-[1.45] text-[var(--text)]'

export const VOCAB_CARD_FOOTER_WRAP =
  'border-t border-[var(--chat-section-neutral-border)] bg-white'

export const VOCAB_CARD_FOOTER_LAUNCH = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
].join(' ')

const VOCAB_INSET_BTN_BOX =
  'flex w-full min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-center'

export const VOCAB_INSET_LAUNCH_BTN = [
  BTN_INTERACTION_BASE,
  LAUNCH_SKIN,
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
  VOCAB_INSET_BTN_BOX,
].join(' ')

export const VOCAB_CARD_FOOTER_EXPAND = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  'flex w-full min-h-11 items-center justify-center rounded-none px-4 py-2.5 text-center',
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
].join(' ')

export const VOCAB_INSET_EXPAND_BTN = [
  BTN_INTERACTION_BASE,
  EXPAND_SKIN,
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
  VOCAB_INSET_BTN_BOX,
].join(' ')

export const VOCAB_CARD_FOOTER_ACTION = [
  BTN_INTERACTION_BASE,
  'flex w-full min-h-11 items-center justify-center rounded-none border border-[var(--border)] bg-white px-4 py-2.5 text-center text-[var(--text)] [@media(hover:hover)]:hover:brightness-95 active:brightness-90',
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
].join(' ')

export const VOCAB_FUNNEL_CELL = [
  'min-h-11 min-w-0 overflow-hidden rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/80 px-2 py-2 text-center',
  VOCAB_TAP_INTERACTION,
].join(' ')

export const VOCAB_FUNNEL_CELL_MUTED = 'opacity-55'

export const VOCAB_FUNNEL_EXCEPTION = [
  'inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-1.5 text-center text-[13px] font-semibold leading-tight text-[var(--text-muted)]',
  VOCAB_TAP_INTERACTION,
].join(' ')

export const VOCAB_SHELF_CHIP =
  'btn-3d-menu chat-section-surface glass-surface inline-flex min-w-0 min-h-8 cursor-pointer touch-manipulation items-center justify-center whitespace-normal rounded-[var(--bubble-radius-assistant,1rem)] border border-[var(--chat-section-neutral-border)] bg-white px-2 py-1 text-center text-[13px] font-semibold leading-tight text-[var(--text-muted)] hover:bg-slate-50 active:bg-slate-100'

export const VOCAB_SHELF_CHIP_ACTIVE =
  'border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] text-[var(--text)] hover:bg-[var(--chat-shell-bg)] active:bg-[var(--chat-shell-bg)]'
