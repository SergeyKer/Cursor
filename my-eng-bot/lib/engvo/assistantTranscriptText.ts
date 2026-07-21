/** Пробел на границе Latin/Cyrillic после пунктуации или между скриптами. */
export function normalizeScriptBoundarySpaces(text: string): string {
  return text
    .replace(/([.!?])(\p{Script=Cyrillic})/gu, '$1 $2')
    .replace(/(\p{Script=Latin})(\p{Script=Cyrillic})/gu, '$1 $2')
}

/** Единая подготовка сырого транскрипта ассистента перед guard/commit. */
export function prepareEngvoAssistantRawText(text: string): string {
  return normalizeScriptBoundarySpaces(text.replace(/\\n/g, '\n').trim())
}
