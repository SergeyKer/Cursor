/** Общая типографика композера (font-size / line-height не меняем). */
export const CHAT_COMPOSER_TYPO_CLASS = 'min-h-[44px] text-base leading-[1.45rem]'

/** Стеклянная форма композера: одна строка mic | textarea | send (как в Chat). */
export const CHAT_COMPOSER_FORM_CLASS =
  'glass-surface flex w-full items-center gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1.5 sm:px-3'

/** Обёртка нижней панели над fixed-футером (верхний padding — отдельно: `pt-2.5` или `pt-1`). */
export const CHAT_COMPOSER_STACK_CLASS =
  'shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 sm:px-3'

/** Стандартный верхний отступ обёртки композера (симметричен `CHAT_COMPOSER_PADDING_BOTTOM`). */
export const CHAT_COMPOSER_STACK_TOP_CLASS = 'pt-2.5'

/** Симметричный вертикальный отступ для панелей с чипами выбора (без safe-area — его даёт футер). */
export const CHAT_COMPOSER_STACK_COMPACT_CLASS = 'py-1'

/** Нижний padding chip-панели: симметричен `py-1` / `pt-1`. */
export const CHAT_COMPOSER_PADDING_BOTTOM_COMPACT = '0.25rem'

/**
 * База 0.625rem (как `pt-2.5`) + только safe-area.
 * Клавиатурный inset (`--vv-bottom-inset`) учитывается на уровне fixed-футера в page.tsx.
 */
export const CHAT_COMPOSER_PADDING_BOTTOM = 'calc(0.625rem + env(safe-area-inset-bottom, 0px))'

export type ChatComposerStackLayout = {
  verticalClass: string
  style?: { paddingBottom: string }
}

/** Compact — chip-панели; standard — поле ввода и прочие композеры. */
export function getChatComposerStackLayout(compact: boolean): ChatComposerStackLayout {
  if (compact) {
    return { verticalClass: CHAT_COMPOSER_STACK_COMPACT_CLASS }
  }
  return {
    verticalClass: CHAT_COMPOSER_STACK_TOP_CLASS,
    style: { paddingBottom: CHAT_COMPOSER_PADDING_BOTTOM },
  }
}

/** Строка ввода внутри flex-col формы (когда над полем есть helper-текст). */
export const CHAT_COMPOSER_INPUT_ROW_CLASS = 'flex w-full items-center gap-2'

/** Оболочка с вертикальным стеком helper + строка ввода. */
export const CHAT_COMPOSER_COLUMN_SHELL_CLASS =
  'glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-1.5 sm:px-3'

/** Вертикальные метрики textarea: симметричный padding; при STT — web-metrics. */
export function getChatComposerTextareaVerticalClass(webTextMetrics: boolean): string {
  if (webTextMetrics) {
    return 'chat-composer-vertical-align chat-input-voice-web-metrics'
  }
  return 'chat-composer-vertical-align'
}

/** Вертикальные метрики абсолютного оверлея поверх поля (диктовка / подсказки). */
export function getChatComposerOverlayVerticalClass(webTextMetrics: boolean): string {
  if (webTextMetrics) {
    return 'voice-composer-web-metrics'
  }
  return 'chat-composer-vertical-align'
}
