/** Общая типографика композера (font-size / line-height не меняем). */
export const CHAT_COMPOSER_TYPO_CLASS = 'min-h-[44px] text-base leading-[1.45rem]'

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
