import type { Audience } from '@/lib/types'

/**
 * Translation-mode only for now. Same helpers can be reused in dialogue / communication / lesson prompts later.
 */

/** ERROR protocol: CEFR tense name and "why this tense" only on the standalone `Время:` line after `Ошибки:`. */
export function buildTranslationSingleTenseExplanationRule(): string {
  return [
    'Tense explanation rule (ERROR protocol only): Exactly ONE place may state the CEFR tense name (Present Perfect, Past Simple, etc.) and explain WHY it fits the Russian task: the standalone line starting with "Время: " immediately AFTER the "Ошибки:" block.',
    '- In "Комментарий_перевод:" (supportive line): NEVER use CEFR labels or Russian school tense names; do NOT say the answer "needs" or "requires" a named tense. Praise concrete English pieces (auxiliaries, question shape, word order, articles, missing words) without naming the tense.',
    '- Inside "Ошибки:" subsections (only grammar, spelling, vocabulary, and optional meaning-unclear lines as in the protocol): do NOT repeat the CEFR tense name or duplicate the tense rationale. Stay concrete (missing word, question form, negation, spelling, article, etc.).',
    '- Do NOT output any extra time-explanation line inside "Ошибки:" (no tense rationale there). Only the following standalone protocol line "Время: ..." explains tense.',
    '- Line "Комментарий:" (diagnostic): give error type in Russian plus at most one concrete fix. For tense problems do NOT spell out the CEFR tense or a long tense lesson here — that belongs only in the next "Время:" line.',
  ].join('\n')
}

/** Strategic emoji guide for CHILD audience in supportive translation lines (Комментарий_перевод, SUCCESS Комментарий). */
export function buildTranslationChildStrategicEmojiRule(): string {
  return [
    'CHILD — strategic emoji (do NOT spam; at most 1 emoji per supportive line, rarely 2 if two short clauses; prefer start or end of the sentence):',
    '\u{1F4A1} hint / insight',
    '\u{1F3AF} goal / focus',
    '\u{1F525} progress / success',
    '\u{1F31F} praise for effort',
    '\u{1F5E3}\u{FE0F} speaking / pronunciation angle',
    '\u{1F3A7} listening angle',
    '\u{2728} “aha” moment of understanding',
    '\u{1F680} growth / leveling up',
    '\u{1F4AA} encouragement / motivation',
    '\u{1F504} repetition / practice',
    'You may also use \u{1F64C} for celebration when it truly fits; skip emoji if the line is already strong without it.',
  ].join('\n')
}

/** Warm, human voice for translation SUCCESS/ERROR supportive lines; register matches audience. */
export function buildTranslationWarmVoiceRule(audience: Audience): string {
  if (audience === 'child') {
    return [
      'Warm voice (translation mode, Russian text in Комментарий_перевод: and SUCCESS Комментарий: only):',
      '- Address the learner as informal "ты" only; never "вы".',
      '- Vary supportive openings across turns, e.g.: "Круто, что…", "Здорово, что…", "Отлично, что…", "Вижу, что ты…", "Замечаю, что ты…", "Ловлю, что ты…", "Ты молодец, потому что…", "Так держать, ведь…".',
      '- Sometimes use light conversational openers when natural: "Слушай…", "Знаешь…", "Кстати…", "Между прочим…" — not every turn.',
      '- Occasionally a short rhetorical question or reaction ("Правда же звучит лучше?", "Вау!", "Класс!", "Супер!") if it fits; stay concrete and tied to their answer.',
      '- Motivational one-liner at the END of the same supportive line only sometimes (not every SUCCESS or ERROR), e.g. "Ты справишься! \u{1F4AA}", "Продолжай в том же духе! \u{1F680}", "Следующий уровень уже близко! \u{1F31F}" — use at most one such phrase and do not stack several.',
      '- Keep supportive lines max 1–2 short sentences; supportive energy never on the diagnostic Комментарий: line in ERROR protocol.',
    ].join('\n')
  }
  return [
    'Warm voice (translation mode, Russian text in Комментарий_перевод: and SUCCESS Комментарий: only):',
    '- Address the learner as polite "вы" only; never informal "ты".',
    '- Vary supportive openings across turns, e.g.: "Отлично, что вы…", "Здорово, что вы…", "Классно, что вы…", "Вижу, что вы…", "Замечаю, что вы…", "Хорошо получается: вы…", "Так держите, ведь…".',
    '- Sometimes use light conversational openers when natural: "Слушайте…", "Знаете…", "Кстати…", "Между прочим…" — not every turn; stay respectful, not slang-heavy (avoid "Респект за" unless the user clearly prefers very informal chat).',
    '- Occasionally a short rhetorical question or restrained reaction tied to their answer; avoid childish "Вау/Супер" unless the learner\'s tone is very informal.',
    '- Optional brief motivational closing on the same supportive line only sometimes, e.g. "У вас получится! \u{1F4AA}", "Продолжайте в том же духе! \u{1F680}", "Вы уже близко к следующему уровню! \u{1F31F}" — at most one phrase, not every turn.',
    '- Keep supportive lines max 1–2 short sentences; supportive energy never on the diagnostic Комментарий: line in ERROR protocol.',
  ].join('\n')
}
