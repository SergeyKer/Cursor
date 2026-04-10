import type { MenuView } from '@/components/MenuSectionPanels'
import { AI_CHAT_PANEL_HINTS, type AiChatPanel } from '@/lib/aiChatPanel'

/** Инструкция в пузыре справа от робота на стартовом экране (не-root), без призывов к действию. */
const SECTION_INSTRUCTIONS: Record<Exclude<MenuView, 'root' | 'aiChat'>, string> = {
  lessons: 'Уроки: теория, произношение\nи новые слова.',
  settings: 'Провайдер ИИ и голос озвучки.',
  progress: 'Счётчики: диалог и запросы к ИИ.',
  profile: 'Профиль и аккаунт — позже.',
}

export function getHomeMenuInstruction(
  view: Exclude<MenuView, 'root'>,
  aiPanel: AiChatPanel
): string {
  if (view === 'aiChat') return AI_CHAT_PANEL_HINTS[aiPanel]
  return SECTION_INSTRUCTIONS[view]
}
