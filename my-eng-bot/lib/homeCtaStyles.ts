/**
 * Общие классы для основных CTA «Начать …».
 * Градиент через `--accent` / `--accent-hover` из globals.css: взрослый — :root, ребёнок — [data-audience='child'].
 */

/** Меню: сводка «Чат с MyEng», primary MenuNavRow. */
export const MENU_PRIMARY_CTA_CLASS =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2.5 text-[15px] font-semibold leading-normal text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]'

/** Главная: «Начать Чат с MyEng», «Начать делать Уроки». */
export const PAGE_HOME_START_PRIMARY_BUTTON_CLASS =
  'btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]'

/** Стартовый выбор аудитории: «Я - взрослый» (бирюзовая палитра из цветовой схемы). */
export const PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS =
  'btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-gradient-to-b from-[var(--invitation)] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]'

/** Стартовый выбор аудитории: «Я - ребёнок» — тот же градиент, что у CTA «Чат» при [data-audience='child'] в globals.css. */
export const PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS =
  'btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#39649c] to-[#305789] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]'

/** Выезжающее меню: «Новый чат». */
export const SLIDE_OUT_NEW_CHAT_BUTTON_CLASS =
  'group mb-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] py-2.5 px-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95'
