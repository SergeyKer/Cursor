/**
 * Единая система CTA: синий primary / secondary + общее поведение нажатия.
 */

export const BTN_INTERACTION_BASE =
  'btn-3d-menu shadow-md transition-all duration-200 hover:shadow-lg touch-manipulation'

export const BTN_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-60'

const BTN_FONT_FAMILY =
  '[font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Noto_Sans",Arial,sans-serif]'

/** Типографика кнопок: medium вместо semibold - на синем градиенте читается легче. */
export const BTN_FONT_MENU = `text-[15px] font-medium leading-snug antialiased ${BTN_FONT_FAMILY}`
export const BTN_FONT_LARGE = `text-base font-medium leading-snug antialiased ${BTN_FONT_FAMILY}`
export const BTN_FONT_INLINE = `text-sm font-medium leading-snug antialiased ${BTN_FONT_FAMILY}`
export const BTN_FONT_COMPACT = `text-[11px] font-medium leading-snug antialiased sm:text-xs ${BTN_FONT_FAMILY}`
export const BTN_FONT_SMALL = `text-[13px] font-medium leading-snug antialiased ${BTN_FONT_FAMILY}`
/** Briefing: две строки в узкой кнопке - как меню по кеглю и плотности строк. */
export const BTN_FONT_DUAL_ROW = `text-[15px] font-medium leading-snug antialiased ${BTN_FONT_FAMILY}`

export const BLUE_PRIMARY_SKIN =
  'border border-[#2563eb] bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-white hover:brightness-105 active:brightness-95'

export const BLUE_SECONDARY_SKIN =
  'border border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white hover:brightness-105 active:brightness-95'

/** Меню и широкие primary CTA: «Начать урок», «Новый чат». */
export const APP_BTN_PRIMARY_MENU = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5',
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
].join(' ')

/** Практика, FlowInfoStep, крупные primary. */
export const APP_BTN_PRIMARY_LARGE = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center rounded-xl px-4 py-3 text-center',
  BTN_FONT_LARGE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Финал урока: сетка 2×2 primary. */
export const APP_BTN_PRIMARY_COMPACT = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center',
  BTN_FONT_COMPACT,
  BTN_DISABLED_CLASS,
].join(' ')

/** Intro/tips: «Начать урок» (сохраняем min-h-11 и px-5). */
export const APP_BTN_PRIMARY_LESSON_START = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'inline-flex min-h-11 w-full max-w-full items-center justify-center rounded-xl px-5 py-2.5 text-center',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Меню: secondary «Сгенерировать вариант». */
export const APP_BTN_SECONDARY_MENU = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5',
  BTN_FONT_MENU,
  BTN_DISABLED_CLASS,
].join(' ')

/** Меню: зафризенный «Новый вариант» - светло-синий, без сильного «серого» disabled. */
export const APP_BTN_SECONDARY_MENU_FROZEN = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5',
  BTN_FONT_MENU,
  'disabled:cursor-not-allowed disabled:opacity-90 disabled:hover:brightness-100 disabled:active:brightness-100',
].join(' ')

/** Briefing: две CTA в ряд, текст в две строки. */
export const APP_BTN_PRIMARY_DUAL_ROW = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'flex flex-1 min-w-0 min-h-[46px] items-center justify-center rounded-xl px-3 py-1.5 text-center whitespace-pre-line',
  BTN_FONT_DUAL_ROW,
  BTN_DISABLED_CLASS,
].join(' ')

export const APP_BTN_SECONDARY_DUAL_ROW = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex flex-1 min-w-0 min-h-[46px] items-center justify-center rounded-xl px-3 py-1.5 text-center whitespace-pre-line',
  BTN_FONT_DUAL_ROW,
  BTN_DISABLED_CLASS,
].join(' ')

/** Практика: secondary «Повторить», «Перегенерировать». */
export const APP_BTN_SECONDARY_LARGE = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center rounded-xl px-4 py-3 text-center',
  BTN_FONT_LARGE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Финал урока: сетка 2×2 secondary. */
export const APP_BTN_SECONDARY_COMPACT = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center',
  BTN_FONT_COMPACT,
  BTN_DISABLED_CLASS,
].join(' ')

/** Меню: мелкие secondary («Изменить запрос»). */
export const APP_BTN_SECONDARY_SMALL = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex w-full min-h-[44px] items-center justify-center rounded-lg px-3 py-2',
  BTN_FONT_SMALL,
  BTN_DISABLED_CLASS,
].join(' ')

/** Inline secondary для disabled-состояния в чате. */
export const APP_BTN_SECONDARY_INLINE_MUTED = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'inline-flex w-fit max-w-full min-h-[44px] cursor-default items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 opacity-95',
  BTN_FONT_INLINE,
].join(' ')

/** Inline primary на главной и в чате. */
export const APP_BTN_PRIMARY_INLINE = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'inline-flex w-fit max-w-full min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Submit в вопросах практики. */
export const APP_BTN_SECONDARY_SUBMIT = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'min-h-[44px] rounded-xl px-3 py-2',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

/** Серые action-кнопки (цвет сохраняем, поведение унифицируем). */
export const APP_BTN_NEUTRAL_LARGE = [
  BTN_INTERACTION_BASE,
  'w-full rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-4 py-3 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
  BTN_FONT_LARGE,
  BTN_DISABLED_CLASS,
].join(' ')

export const APP_BTN_NEUTRAL_WHITE_LARGE = [
  BTN_INTERACTION_BASE,
  'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

/** AccentTrainer: secondary large, выравнивание через className на кнопке. */
export const APP_BTN_SECONDARY_LARGE_BLOCK = [
  BTN_INTERACTION_BASE,
  BLUE_SECONDARY_SKIN,
  'flex min-h-[44px] w-full items-center rounded-xl px-4 py-3',
  BTN_FONT_LARGE,
  BTN_DISABLED_CLASS,
].join(' ')

/** --- Алиасы (обратная совместимость) --- */

export const MENU_PRIMARY_CTA_CLASS = APP_BTN_PRIMARY_MENU

export const PAGE_HOME_START_PRIMARY_BUTTON_CLASS = APP_BTN_PRIMARY_INLINE

export const PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS = [
  BTN_INTERACTION_BASE,
  'inline-flex w-fit max-w-full min-h-[44px] items-center justify-center rounded-xl border border-[var(--text)]/[0.18] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--accent)] hover:brightness-95 active:brightness-90',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS = [
  BTN_INTERACTION_BASE,
  'inline-flex w-fit max-w-full min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-[var(--invitation)] to-[#0f766e] px-4 py-2.5 text-white hover:brightness-105 active:brightness-95',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS = [
  BTN_INTERACTION_BASE,
  'inline-flex w-fit max-w-full min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-b from-[#39649c] to-[#305789] px-4 py-2.5 text-white hover:brightness-105 active:brightness-95',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const SLIDE_OUT_NEW_CHAT_BUTTON_CLASS = [
  BTN_INTERACTION_BASE,
  BLUE_PRIMARY_SKIN,
  'group mb-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

export const POST_LESSON_BLUE_BUTTON_CLASS = APP_BTN_SECONDARY_COMPACT

export const POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS = APP_BTN_PRIMARY_COMPACT

/** Финал урока: нейтральные CTA в сетке 2×2 (меню, фишки). */
export const POST_LESSON_NEUTRAL_BUTTON_CLASS = [
  BTN_INTERACTION_BASE,
  'flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-2 py-2 text-center text-[var(--text-muted)] hover:brightness-95 active:brightness-90',
  BTN_FONT_COMPACT,
  BTN_DISABLED_CLASS,
].join(' ')

/** @deprecated use APP_BTN_SECONDARY_MENU */
export const MENU_BLUE_CTA_CLASS = APP_BTN_SECONDARY_MENU

/** @deprecated use APP_BTN_PRIMARY_MENU */
export const MENU_BLUE_PRIMARY_CTA_CLASS = APP_BTN_PRIMARY_MENU
