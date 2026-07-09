export type EngvoVoiceLabScriptLine = {
  en: string
  ru: string
}

/**
 * Conversational Engvo-style script (~90–120s calm reading).
 * Speak English aloud; Russian is a meaning hint only.
 */
export const ENGVO_VOICE_LAB_SCRIPT_LINES: EngvoVoiceLabScriptLine[] = [
  {
    en: 'Hi! Welcome back. How are you feeling today?',
    ru: 'Привет! С возвращением. Как ты себя чувствуешь сегодня?',
  },
  {
    en: 'Great. Let’s practice a little English together — slowly and clearly.',
    ru: 'Отлично. Давай немного попрактикуем английский — медленно и чётко.',
  },
  {
    en: 'Can you tell me about your morning? What did you do first?',
    ru: 'Расскажи про своё утро. Что ты сделал сначала?',
  },
  {
    en: 'Nice. If a word is hard, we can say it again. No rush.',
    ru: 'Хорошо. Если слово сложное — можем повторить. Без спешки.',
  },
  {
    en: 'Try this sentence: I would like a cup of tea, please.',
    ru: 'Попробуй фразу: I would like a cup of tea, please.',
  },
  {
    en: 'Good job. Now ask me a question about the weather or your plans.',
    ru: 'Молодец. Теперь задай мне вопрос про погоду или свои планы.',
  },
  {
    en: 'When you speak, keep your voice warm and friendly — like talking to a friend.',
    ru: 'Когда говоришь, держи голос тёплым и дружелюбным — как с другом.',
  },
  {
    en: 'Let’s pause for a second… and continue. What are you learning this week?',
    ru: 'Сделаем короткую паузу… и продолжим. Что ты учишь на этой неделе?',
  },
  {
    en: 'That sounds interesting. Could you explain it in one short sentence?',
    ru: 'Звучит интересно. Можешь объяснить это одним коротким предложением?',
  },
  {
    en: 'Perfect. Remember: clear words, soft tone, and a small smile in your voice.',
    ru: 'Отлично. Помни: чёткие слова, мягкий тон и лёгкая улыбка в голосе.',
  },
  {
    en: 'Thanks for practicing with me. See you next time — take care!',
    ru: 'Спасибо за практику. До следующего раза — береги себя!',
  },
]

export const ENGVO_VOICE_LAB_SCRIPT_HINT =
  'Читайте вслух английский текст мягким разговорным тоном (как учитель/друг). Русский — только подсказка смысла. Паузы между фразами. Не кричите в микрофон.'
