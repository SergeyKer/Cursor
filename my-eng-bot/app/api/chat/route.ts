import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, TenseId } from '@/lib/types'
import { CHILD_TENSES } from '@/lib/constants'
import { DetectedLang, detectLangFromText } from '@/lib/detectLang'
import {
  getExpectedCommunicationReplyLang,
  isCommunicationDetailOnlyMessage,
  normalizeCommunicationDetailText,
} from '@/lib/communicationReplyLanguage'
import { buildProxyFetchExtra } from '@/lib/proxyFetch'
import {
  getDialogueRepeatSentence,
  inferLastKnownTenseFromHistory,
  inferTenseFromDialogueAssistantContent,
  isUserLikelyCorrectForTense,
} from '@/lib/dialogueTenseInference'
import { isDialogueOutputLikelyInRequiredTense, validateDialogueOutputTense } from '@/lib/dialogueOutputValidation'
import { buildAdultFullTensePool, pickWeightedFreeTalkTense } from '@/lib/freeTalkDialogueTense'
import { detectFreeTalkTopicChange, isFixedTopicSwitchRequest } from '@/lib/freeTalkTopicChange'
import { normalizeDialogueEntityForTopic } from '@/lib/dialogueEntityNormalization'
import { isNearDuplicateQuestion } from '@/lib/dialogueQuestionVariety'
import { buildFreeTalkTopicAnchorQuestion as buildFreeTalkTopicAnchorQuestionText } from '@/lib/freeTalkQuestionAnchor'
import {
  isKommentariyPurePraiseOnly,
  shouldStripRepeatOnPraise,
} from '@/lib/dialoguePraiseComment'

// Важно для Vercel: роут-хэндлер должен выполняться в Node.js,
// чтобы undici + proxy dispatcher работали предсказуемо (а не в Edge).
export const runtime = 'nodejs'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'
/** Максимум сообщений в контексте (user+assistant). 20 = десять последних обменов. */
const MAX_MESSAGES_IN_CONTEXT = 20
const DIALOGUE_POPULAR_TENSE_PRIORITY: TenseId[] = [
  'present_simple',
  'past_simple',
  'future_simple',
  'present_continuous',
]

/** Лимит токенов ответа. Запас увеличен, чтобы реже обрезать форматированные ответы. */
const MAX_RESPONSE_TOKENS = 512

const TENSE_NAMES: Record<string, string> = {
  all: 'any tense',
  present_simple: 'Present Simple',
  present_continuous: 'Present Continuous',
  present_perfect: 'Present Perfect',
  present_perfect_continuous: 'Present Perfect Continuous',
  past_simple: 'Past Simple',
  past_continuous: 'Past Continuous',
  past_perfect: 'Past Perfect',
  past_perfect_continuous: 'Past Perfect Continuous',
  future_simple: 'Future Simple',
  future_continuous: 'Future Continuous',
  future_perfect: 'Future Perfect',
  future_perfect_continuous: 'Future Perfect Continuous',
}

type LevelProfile = {
  displayName: string
  vocabulary: string
  grammar: string
  tenses: string
  questionStyle: string
  avoid: string
}

const LEVEL_PROFILES: Record<string, LevelProfile> = {
  starter: {
    displayName: 'Pre-A1',
    vocabulary: 'Use only the most basic child-friendly words for concrete things and actions.',
    grammar: 'Use very short simple clauses. Keep one idea per sentence.',
    tenses: 'Present Simple only.',
    questionStyle: 'Ask one short, direct question about something visible, familiar, or personal.',
    avoid: 'Avoid abstract ideas, long sentences, compound tenses, passive voice, and formal wording.',
  },
  a1: {
    displayName: 'A1',
    vocabulary: 'Use very common everyday words about family, school, home, food, hobbies, and routine.',
    grammar: 'Use simple sentence structure and short questions.',
    tenses: 'Present Simple and very basic Present Continuous.',
    questionStyle: 'Ask short questions about personal details, habits, daily routine, and simple facts.',
    avoid: 'Avoid complex clauses, advanced vocabulary, and multi-step questions.',
  },
  a2: {
    displayName: 'A2',
    vocabulary: 'Use everyday vocabulary plus simple descriptive words and basic opinion words.',
    grammar: 'Use short natural sentences with simple connectors like and, but, because.',
    tenses: 'Present Simple, Present Continuous, Past Simple, and basic Future Simple.',
    questionStyle: 'Ask about recent events, plans, preferences, and simple reasons.',
    avoid: 'Avoid heavy abstraction, long explanations, and overly advanced grammar.',
  },
  b1: {
    displayName: 'B1',
    vocabulary: 'Use broader everyday vocabulary for opinions, reasons, experiences, and common topics.',
    grammar: 'Use natural but still clear sentence patterns.',
    tenses: 'Use common simple and continuous forms, plus Present Perfect when needed.',
    questionStyle: 'Ask for reasons, opinions, examples, and short explanations.',
    avoid: 'Avoid unnecessarily formal language and overly complex wording.',
  },
  b2: {
    displayName: 'B2',
    vocabulary: 'Use richer and more precise vocabulary with natural topic-specific words.',
    grammar: 'Use flexible and natural sentence structures.',
    tenses: 'Use standard English tenses as needed by the topic and context.',
    questionStyle: 'Ask open-ended, nuanced, and conversational questions.',
    avoid: 'Avoid robotic wording, repetitive phrasing, and weak generic questions.',
  },
  c1: {
    displayName: 'C1',
    vocabulary: 'Use advanced, precise, and context-aware vocabulary.',
    grammar: 'Use varied sentence structures with natural complexity.',
    tenses: 'Use any standard tense or aspect that fits the context naturally.',
    questionStyle: 'Ask thoughtful, precise questions that invite reflection or detail.',
    avoid: 'Avoid childish or overly basic phrasing.',
  },
  c2: {
    displayName: 'C2',
    vocabulary: 'Use highly precise, natural, and idiomatic vocabulary when appropriate.',
    grammar: 'Use fluent, varied, and natural sentence structures.',
    tenses: 'Use any standard tense or aspect naturally and accurately.',
    questionStyle: 'Ask refined, natural questions that sound like a native speaker.',
    avoid: 'Avoid stiffness, repetition, and unnatural simplification.',
  },
}

function getLevelProfile(level: string): LevelProfile {
  return LEVEL_PROFILES[level] ?? LEVEL_PROFILES.a1
}

function buildLevelPrompt(level: string): string {
  const profile = getLevelProfile(level)
  return [
    `Level: ${profile.displayName}.`,
    `Vocabulary: ${profile.vocabulary}`,
    `Grammar: ${profile.grammar}`,
    `Tenses: ${profile.tenses}`,
    `Question style: ${profile.questionStyle}`,
    `Avoid: ${profile.avoid}`,
  ].join(' ')
}

const TOPIC_NAMES: Record<string, string> = {
  free_talk: 'Free talk (any topic)',
  business: 'Business',
  family_friends: 'Family and friends',
  hobbies: 'Hobbies and interests',
  movies_series: 'Movies and series',
  music: 'Music',
  sports: 'Sports and active lifestyle',
  food: 'Food',
  culture: 'Culture',
  daily_life: 'Daily life',
  travel: 'Travel',
  work: 'Work',
  technology: 'Technology',
}

const SENTENCE_TYPE_NAMES: Record<string, string> = {
  general: 'affirmative (declarative / narrative)',
  interrogative: 'interrogative (questions)',
  negative: 'negative',
  mixed: 'mixed (affirmative, interrogative, negative)',
}

function stableHash32(input: string): number {
  // FNV-1a 32-bit (детерминированно, без зависимостей)
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Префикс истории для выбора времени в мульти-tense диалоге: совпадает с состоянием чата
 * до генерации последнего сообщения ассистента (вопроса), чтобы хэш не «прыгал» при новом user.
 */
function getDialogueTenseSeedMessages(messages: ChatMessage[]): ChatMessage[] {
  const n = messages.length
  if (n >= 2 && messages[n - 1]?.role === 'user' && messages[n - 2]?.role === 'assistant') {
    return messages.slice(0, -2)
  }
  return messages
}

function buildSystemPrompt(params: {
  mode: string
  sentenceType?: string
  topic: string
  level: string
  tense: string
  audience?: 'child' | 'adult'
  praiseStyleVariant?: boolean
  forcedRepeatSentence?: string | null
  communicationDetailLevel?: 0 | 1 | 2
  communicationLanguageHint?: 'Russian' | 'English'
  communicationDetailOnly?: boolean
}): string {
  const {
    mode,
    sentenceType,
    topic,
    level,
    tense,
    audience = 'adult',
    praiseStyleVariant = false,
    forcedRepeatSentence = null,
    communicationDetailLevel = 0,
    communicationLanguageHint = 'Russian',
    communicationDetailOnly = false,
  } = params
  const levelPrompt = buildLevelPrompt(level)
  const tenseName = TENSE_NAMES[tense] ?? 'Present Simple'
  const topicName = TOPIC_NAMES[topic] ?? 'general'
  const sentenceTypeName = sentenceType ? SENTENCE_TYPE_NAMES[sentenceType] ?? 'mixed' : 'mixed'
  const audienceStyleRule = buildAudienceStyleRule(audience)
  const commentToneRule = mode === 'dialogue' ? buildCommentToneRule(audience, level) : ''
  const antiRobotRule =
    'Avoid robotic/formal connectors. NEVER use phrases like "related to", "when it comes to", "in terms of", or "regarding". Ask like a real person.'
  const topicRetentionRule =
    topic !== 'free_talk'
      ? `The conversation topic is ${topicName}. If the user's answer goes off this topic, do NOT follow their new topic. Ask the next question again about ${topicName} (or the subtopic they chose) and gently bring the conversation back.`
      : ''
  const lowSignalGuardRule =
    mode === 'dialogue' && topic !== 'free_talk'
      ? `If the user's reply is obvious nonsense, trolling, or low-signal input (for example random letters like "sdfsdf", "asdf", repeated characters, or a reply that clearly is not a real answer), do NOT treat it as progress. Stay in tutor mode, gently explain that the answer is invalid, and keep the user on the same question path. Do not praise the input and do not follow the user's fake topic or joke.`
      : ''

  if (mode === 'communication') {
    return `Communication chat mode (NOT a tutor).

Rules:
- Language: detect the user's language from their last message (Russian/English). Answer in the same language. If unclear, default to Russian.
- Language detection rule (must match app logic): if the user's last message has mixed Cyrillic + Latin, use current conversation language. Otherwise: any Cyrillic -> Russian, any Latin -> English. If no letters, use current conversation language.
- Mixed learner input rule: if the message contains both Latin and Cyrillic and current conversation language is English, treat this as an English attempt with Russian word substitutions. Infer intended meaning and CONTINUE the topic in English (1 short reaction + 1 short follow-up question). Do not default to "What do you mean?" if the core intent is understandable.
- Detail keywords are language-neutral: "Подробнее", "Ещё подробнее", "more details", and "even more details" only change depth, not language. If the last user message is only a detail keyword, keep the current conversation language.
- Current conversation language: ${communicationLanguageHint}. ${communicationDetailOnly ? 'The last user message is only a detail keyword, so preserve this language exactly.' : 'Preserve this language across follow-up detail requests.'}
- Translation-only rule: ONLY when the user explicitly asks to translate (for example: "переведи", "translate", "нужен перевод"), return ONLY the English translation of the requested phrase with no extra comments or follow-up questions.
- ${audienceStyleRule}
- ${buildCommunicationEnglishStyleRule(audience)}
- ${buildCommunicationLevelRules(level)}
- ${buildCommunicationDetailRule(communicationDetailLevel)}
- Conversational follow-up questions and brief natural reactions are encouraged when they fit the thread. This is not tutor feedback: stay in chat mode.
- Do NOT output any tutor/protocol markers: no "Комментарий:", no "Повтори:", no "Время:", no "Конструкция:", no "Переведи на английский", and no "RU:" / "Russian:" labels.
- Persona voice in Russian (communication mode only): use masculine self-reference forms only. Correct examples: "я понял", "я готов", "я рад", "я постараюсь помочь". Never use feminine variants or mixed forms like "понял(-а)", "готов(а)", "рад(а)".
- Allow both Russian and English conversation freely. You may vary length and detail for follow-ups, but you MUST keep the same Russian address register for the whole chat: CHILD audience -> always informal "ты" (never "вы"), and every Russian sentence must stay in correct singular second-person grammar like "ты пошёл", "ты спросил", "у тебя есть"; ADULT audience -> always "вы" (never informal "ты"). Do not change register because the user asked for steps, a task, or structured instructions, and do not compose the sentence in plural/formal form first.
- Clarification: use a clarifying question ONLY for truly unintelligible input (random/noise text, no recoverable intent). Do not use clarification for mixed learner input when meaning can be inferred.
- 18+ restriction: if the user requests sexual/erotic/pornographic content or any 18+ material, refuse politely and suggest a neutral, safe alternative (helpful general info or a topic change). Never provide explicit content.

When you are sending the very first assistant message:
- Output a friendly brief greeting + an invitation to ask a question or continue the conversation.
- For communication mode, the first assistant message must be in Russian.
- Use exactly one greeting only; do not stack multiple greetings or add extra filler before the invitation.
- Vary the wording across different conversations; do not reuse the same opening phrase every time.
- If you answer in English, keep the same opening logic and tone across the whole English conversation.
- Match the audience style exactly: CHILD -> only "ты" in Russian (simple, warm); ADULT -> only "вы" in Russian (respectful, natural). Never mix registers mid-conversation.

No other format. Output only the chat message text.`
  }

  if (mode === 'translation') {
    return `Translation training. Topic: ${topicName}, ${levelPrompt}, ${sentenceTypeName}. Required tense: ${tenseName}.

${audienceStyleRule}

When the conversation is empty (first assistant turn), output ONLY:
1) one Russian sentence to translate
2) on the next line: "Переведи на английский."
No extra lines.

When the user has already sent their translation, ALWAYS use this visual protocol (strict):
- Line 1: "Комментарий: " + short Russian feedback (what is wrong/right)
- Line 2: "Время: " + ${tenseName} + very short Russian hint why this tense is needed now
- Line 3: "Конструкция: " + very short tense pattern for learner (example for Present Simple: "Subject + V1(s/es)")
- If there is a mistake, add line 4: "Повтори: " + full corrected English sentence.
- Then provide the NEXT Russian sentence on a new line.
- Last line: "Переведи на английский."

Rules:
- Do not output markdown markers like **Correction** or **Comment**.
- Keep all explanations short and practical for learner.
- Do not skip "Время" and "Конструкция" lines.
- If user answer is correct, do not output "Повтори:".
- Never remove the final line "Переведи на английский."
- "Комментарий" must sound professional and pedagogical:
  - Start with exact error type in Russian (e.g. "Ошибка согласования подлежащего и сказуемого", "Ошибка формы глагола", "Ошибка времени", "Лексическая ошибка").
  - Then give one precise fix in one short sentence.
  - If there are several mistakes, list ALL key issues in one concise comment: tense, word choice, article, singular/plural.
  - Briefly explain why (for example: "look = смотреть, see = видеть"; "после a используем существительное в единственном числе").
  - Use Russian linguistic terms (say "согласование", not "agreeing").
  - No slang, jokes, filler, or casual tone.
  - Maximum 1-2 short sentences.`
  }
  const tenseRule =
    tense === 'all'
      ? 'You are practicing MULTIPLE tenses across turns. Each question you ask uses a specific tense. The user MUST answer in the SAME tense as YOUR question. If they answer in a different tense (e.g. Past Simple when your question was in Future Perfect), ALWAYS treat it as a tense error: give "Комментарий:" explaining which tense is required for this question, then "Повтори:" with the FULL corrected English sentence rewritten in the tense of YOUR question. Also correct any grammar, spelling, and vocabulary errors in the same Повтори sentence.'
      : `Strict: the user must answer in ${tenseName}. If they answer in another tense (e.g. Present Simple when ${tenseName} is required), ALWAYS treat it as an error: give "Комментарий: " with a short explanation in Russian that the answer must be in ${tenseName}, then "Повтори: " with the FULL corrected English sentence rewritten in ${tenseName}. Do NOT accept the answer and do NOT ask a new question until the user has repeated or answered in ${tenseName}. Do not praise a sentence that is in the wrong tense.

This rule applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): whatever tense is selected above is the ONLY tense you may use. You MUST use ONLY ${tenseName} in all your own sentences and questions. Never use any other tense in your replies. Reformulate any question so it uses ${tenseName} (e.g. for Present Continuous ask "What are you playing?" not "What do you like to play?"; for Past Simple ask "What did you do?" not "What do you usually do?"; and so on for any tense).

This applies to every tense: stick to the topic and time frame of YOUR question. Do NOT adopt the user's time frame if they answer with a different one (e.g. you asked about "recently" and they say "tomorrow"; you asked about "yesterday" and they say "next week"; you asked about "now" and they switch to the past). Your "Повтори:" sentence must be in ${tenseName} AND must match the context you asked about — never suggest a sentence in another tense or time frame. Examples: if you asked in Present Perfect about recent past, correct to "Yes, I have been to the cinema recently", not "I will go tomorrow"; if you asked in Past Simple about yesterday, correct to that context, not to "tomorrow" or "next week". Do not ask the user to repeat a sentence in a different tense or time frame than your question.`
  const repeatFreezeRule =
    mode === 'dialogue' && forcedRepeatSentence
      ? `\n\nRepeat freezing rule (anti-breaking UX): If you output "Повтори:" in this turn, you MUST reuse exactly the SAME sentence that was previously shown to the user.\nPrevious "Повтори:" sentence to reuse:\n"${forcedRepeatSentence}"\nDo NOT rewrite/modify it.`
      : ''
  const capitalizationRule =
    'Completely ignore capitalization and punctuation in the USER answer. If the only difference is capitalization or missing commas/periods (e.g. "yes I stayed" vs "Yes, I stayed"), treat the answer as correct and do NOT add any comment about it. Never mention capital letters, commas, periods, or any punctuation in "Комментарий:" — never write things like "нужна запятая", "comma after Yes", etc. Do not correct or explain punctuation. The user often dictates by voice; focus only on tense, grammar, and wording. Your OWN replies must use normal English capitalization and punctuation.';
  const contractionRule =
    "Contractions are always acceptable. Treat contracted and expanded forms as equivalent, and NEVER mark them as errors or ask the user to repeat only because of contractions or apostrophes. Examples of equivalent pairs: I'm/I am, you're/you are, he's/he is, she's/she is, it's/it is, we're/we are, they're/they are, I've/I have, you've/you have, we've/we have, they've/they have, I'd/I would or I had, you'd/you would or you had, we'd/we would or we had, they'd/they would or they had, I'll/I will, you'll/you will, he'll/he will, she'll/she will, it'll/it will, we'll/we will, they'll/they will, can't/cannot, don't/do not, doesn't/does not, didn't/did not, won't/will not, isn't/is not, aren't/are not, wasn't/was not, weren't/were not. This includes both apostrophe characters: ' and ’. If the only difference from your preferred form is contraction vs expansion, treat the user answer as correct and continue.";
  const freeTalkRule =
    topic === 'free_talk'
      ? `This is a free conversation. For the very first question, ask the user to choose any topic or simply start talking. Keep the wording short and adapt it to the selected level profile. Do NOT list specific options as a fixed menu. ONLY the very first user reply (right after you asked them to choose a topic) is treated as a topic choice — the user may write in English, Russian, or a mix of both (they are learning and may not know the English word). Infer the topic from it regardless of language (ignore typos and wrong tense, e.g. "I wil plai footbal" → football/sport; "tenis" → tennis; "река" → river; "I река" → river; "транзисторы" → transistors; "я люблю кошки" → cats), output one question in the required tense about that topic, and do NOT output Комментарий or Повтори for that first reply only. Only if the first reply gives no hint at all (e.g. "sdf", "sss"), ask for clarification in a natural human way and vary your wording each time (examples: "Could you clarify that a bit?", "I didn't catch the topic yet — what would you like to discuss?", "Can you say it in another way?"). From the second user reply onwards the topic is already established — apply ALL normal correction rules: output Комментарий and Повтори when the user makes a tense, grammar, or spelling error, exactly as described in the FORMAT section above.`
      : ''
  const freeTopicPriority =
    topic === 'free_talk'
      ? 'HIGHEST PRIORITY — Free topic (for ANY tense: Present Simple, Present Perfect, Past Simple, etc.): When the user is naming or revealing their topic for the first time (i.e. the very first reply after you asked "What would you like to talk about?"), do NOT output Комментарий or Повтори. Do NOT output meta-text or instructions. Only infer the topic and reply with ONE real question in the required tense. This override applies ONLY to that one topic-choice turn. For all subsequent user replies, apply normal correction rules. For the first question, keep the wording aligned with the selected level profile. '
      : ''
  const dialogueAllTenseAnchorRule =
    mode === 'dialogue' && tense === 'all'
      ? '\n\nALL-TENSES DIALOGUE (strict): When you output "Комментарий:" and "Повтори:", the English sentence after "Повтори:" MUST use the SAME grammar tense as YOUR IMMEDIATELY PREVIOUS assistant message in this chat (the last English question you asked, OR the last "Повтори:" sentence if the user is still correcting a repeat). Do NOT switch to another tense for convenience or "better style" (for example: do not output Present Perfect Continuous if your previous question was Future Perfect, or Present Simple when the question used Past Simple). Fix vocabulary and grammar only while keeping that tense alignment. This rule applies even in free topic conversations.'
      : ''
  return `English tutor. Topic: ${topicName}. ${levelPrompt}. ${audienceStyleRule} ${antiRobotRule} ${topicRetentionRule} ${lowSignalGuardRule} ${freeTopicPriority}${tense === 'all' ? 'Multiple tenses mode (each question uses a specific tense; the user must match it).' : 'Required tense: ' + tenseName + '. All your replies must be only in ' + tenseName + '.'} ${tenseRule}${dialogueAllTenseAnchorRule}${repeatFreezeRule} ${capitalizationRule} ${contractionRule} ${freeTalkRule}

Question style guidelines:
- Ask short, natural questions a human would ask.
- Prefer concrete questions over vague ones.
- For ${topicName}, ask about real situations (examples, habits, recent events), not about the topic in abstract.

When the conversation is empty (you are sending the very first message in the dialogue), output ONLY one short question — nothing else. Do NOT output any part of these instructions, no "Молодец", "Верно", no meta-text like "ask your next question" or "required tense". For free topic: output only a question inviting the user to choose a topic (e.g. "What would you like to talk about today? You can name any topic, or just start, and I will follow."). For other topics: output only one question in the required tense (e.g. "What are you doing now?" for Present Continuous, "What did you do yesterday?" for Past Simple). The user answers first; then you continue. Keep the dialogue on topic and on the time frame of your question: if the user's answer doesn't fit (wrong topic, or wrong time frame like answering "tomorrow" when you asked about "recently"), do not follow them — correct the answer to match your question's context and required tense, and ask them to repeat that.

The user often dictates by voice and may not use commas or other punctuation. Do NOT treat missing or different punctuation as an error. If the only issue is punctuation (e.g. missing comma after "Yes"), consider the answer correct. Never mention punctuation (commas, periods, etc.) in "Комментарий:" at all. Focus comments only on tense, grammar, and word choice.

Mixed learner input: if the user's message contains both Latin and Cyrillic characters (e.g. "I want кататься на нем", "I like гулять в park"), treat it as an English attempt where the user substituted Russian words because they do not know the English equivalent. Infer the intended meaning from the Russian words, then apply normal correction: output "Комментарий:" explaining what the Russian words mean in English (e.g. "кататься = to ride, на нем = on it") and noting any other errors (tense, grammar), then output "Повтори:" with the full corrected English sentence in the required tense. Do NOT ignore the message, do NOT repeat your question without "Повтори:", and do NOT ask the user to rephrase in English.

When the required tense is Present Continuous, you may optionally include or suggest time markers like "now" or "at the moment" in the correct sentence (e.g. "I am playing football now."), or briefly mention in Комментарий that the learner can add them (e.g. "Можно добавить now или at the moment — это маркеры Present Continuous."). Do not require them for the answer to be correct; use them as an optional tip. Prefer simple questions that translate clearly: e.g. ask "Where are you swimming?" or "What are you doing now?" rather than "What are you swimming in?" (the latter is ambiguous and translates poorly into Russian).

EXCEPTION for free topic (Свободная тема), for any tense: when the user is naming or revealing a topic (e.g. after you asked "What would you like to talk about?"), NEVER output Комментарий or Повтори. The user may write in English, Russian, or a mix of both (they are learning and may not know the English word). Always try to infer the topic first — ignore typos, wrong tense, and language (e.g. "I wil plai footbal" → football, sport; "tenis", "vialint" → tennis, violin; "река" → river; "транзисторы" → transistors; "я люблю кошки" → cats). Output exactly one question about that topic. Only if the message gives no hint at all (e.g. "sdf", random letters), ask for clarification in a natural human way and vary your wording across turns (do not repeat the same clarification sentence again and again). No error search, no corrections in that step.

CRITICAL — Context: Your correction (Комментарий/Говорится/Нужно слово/Повтори) must refer ONLY to the user's LAST message. Never output a correction about words or mistakes that are not in that message (e.g. if the user wrote "I usually swim in the pool", do NOT correct "movie" vs "move" — that is from another turn). If the last message has no errors, output only the next question in English.

This applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): you MUST correct the user's answer according to ALL applicable rules. Check every dimension: (1) required tense — if they used another tense, correct it; (2) grammar — word order, verb form, articles (a/an/the), plural/singular; (3) spelling — correct every misspelled word; (4) word choice — wrong word (e.g. "move" instead of "movie") must be fixed. The "Повтори:" sentence must fix ALL errors at once; the "Комментарий:" must briefly list ALL issues so the user sees what was wrong. Do not correct only one mistake and ignore others.

When there are grammar or spelling problems or the user used the wrong tense, respond ONLY in the short format below. Do NOT output long explanations of rules, lists of example questions (e.g. "Do you like pizza?", "What is your favorite color?"), or meta-instructions. Even if the user makes the same mistake again (e.g. wrong tense twice), reply only with Комментарий (1–2 short sentences in Russian) + Повтори: [correct sentence]. Keep the reply short. Do not use emojis or jokes in corrections (e.g. do not write "unless you're preparing for a spelling competition" or similar).

${commentToneRule}

FORMAT (strict):
1) When the user's answer has a real mistake (wrong tense, grammar, or wording): output ONLY two lines:
   - "Комментарий: " + a very short explanation in Russian (1–2 short sentences max). Briefly list ALL issues (tense, grammar, spelling, word choice). Do not mention capitalization or punctuation.
   - "Повтори: " + the FULL corrected English sentence (fixing all errors at once). Always write a complete sentence with normal punctuation.
   In this case do NOT add a follow‑up question — the user must repeat first.
2) When the user's answer is already correct: do NOT output "Комментарий:" at all. Accept a natural, grammatically correct reply even if it does not exactly repeat the wording of the question. Output only the next question in English, and make it the next sentence by the algorithm for this topic/tense. Do NOT output "Повтори:" for correct answers.${praiseStyleVariant ? ` If you need a human-sounding reaction, keep it implicit — do not add any extra visible line or comment.` : ''}

Never add raw markers like **Correction:**, **Comment:**, **Right:** or similar anywhere in the visible text. The user should never see those words with asterisks.

Your reply must contain ONLY the actual content the user should see: a question in English, or (when correcting) only Комментарий: [Russian text] and Повтори: [sentence]. Never output any instructions, format descriptions, or meta-text. Never output numbering or labels like "FORMAT". Output only real questions, Комментарий, and Повтори lines.

If the user clearly asks YOU a simple personal-style question about preferences or experience (e.g. "And you?", "What is your favorite food?", "Do you like tea?"), you may briefly answer in the first person (1 short sentence in English) BEFORE or AFTER the user's correction block, and then still ask them the next question. The goal is to keep the conversation natural and two‑sided, but remember: the main focus is always on the user's practice, not on talking about yourself.

Never use "Tell me" or other English instruction phrases. After a correction, you may optionally add a short Russian prompt like "Повтори: " + the correct English sentence so the user can repeat it, but keep it separate from the \"Комментарий\" line.

Do NOT add any extra \"RU:\" line or full Russian translation of the whole reply. All visible text must be in English EXCEPT: (1) the \"Комментарий:\" line — always in Russian when correcting mistakes, and absent for correct answers.`
}

/** Паттерны утечки инструкций: модель выводит описание шагов вместо ответа пользователю. */
const INSTRUCTION_LEAK_PATTERNS = [
  /then write the corrected sentence/i,
  /then give the corrected sentence/i,
  /and give the corrected sentence in English/i,
  /give a short comment in Russian/i,
  /give one very short explanation/i,
  /start a new line with/i,
  /start the next line with/i,
  /start with\s+["']?Комментарий\s*:/i,
  /start with\s+["']?Повтори\s*:/i,
  /spelling,\s*word choice/i,
  /^\s*(?:ai|assistant)\s*:\s*[,]*\s*spelling,\s*word choice/i,
  /^\s*["']?\s*then\s+(write|give)/i,
  /^\s*1\)\s*(If you want|If you want to)/im,
  /^\s*2\)\s*(Give|If you)/im,
  /^\s*3\)\s*(Use\s+"Повтори|If you want)/im,
  /^\s*4\)\s*When the user's answer/im,
  /If you want to ask the user to repeat/i,
  /If you want the user to repeat or answer again/i,
  // Утечки из системного промпта (new question, CRITICAL, output ONLY, wait until…)
  /wait until the user repeats/i,
  /new question\s*[—\-,\s]+\s*wait/i,
  /^\s*2\)\s*When the user's answer/im,
  /CRITICAL\s*:\s*If the user's answer/i,
  /output ONLY\s+["']?\s*Комментарий/i,
  // Утечки «протокола» (как на скрине: user's turn / Always ask the next question…)
  /\buser['’]s turn\b/i,
  /\btheir mistakes get corrected\b/i,
  /\bmistakes get corrected\b/i,
  /\balways ask\b/i,
  /\bnext question in English\b/i,
  /\bask the next question\b/i,
  /\bcorrect(?:ed)? first\b/i,
  // Мета-ответы вместо контента
  /^\s*(?:ai|assistant)\s*:\s*the user['’]s answers?/i,
  /\bthe user['’]s answers?\s+and\s+corrections\b/i,
  /\bthe user['’]s answer\s+and\s+corrections\b/i,
]

/**
 * Убирает из ответа фрагменты утечки инструкций. Если ответ целиком — инструкция, возвращает null.
 */
function sanitizeInstructionLeak(content: string): string | null {
  const trimmed = content.trim()
  if (!trimmed) return null
  for (const pat of INSTRUCTION_LEAK_PATTERNS) {
    const m = trimmed.match(pat)
    if (m && m.index !== undefined) {
      if (m.index === 0) return null
      const before = trimmed.slice(0, m.index).trim()
      if (before.length > 0) return before
      return null
    }
  }
  return trimmed
}

function isMetaGarbage(content: string): boolean {
  const s = content.trim()
  if (!s) return false
  const normalized = s.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
  if (!normalized) return false
  // Набор "пустых" служебных фраз, которые иногда присылает модель вместо ответа.
  return (
    /^the user['’]s answers?(?:\s+and\s+corrections)?\.?$/i.test(normalized) ||
    /^the user['’]s answers?\s+and\s+corrections\.?$/i.test(normalized) ||
    /^the user['’]s answer\s+and\s+corrections\.?$/i.test(normalized) ||
    /^user['’]s turn\s*[—–-]\s*their mistakes get corrected first\.?$/i.test(normalized) ||
    /^always ask the next question in English\.?$/i.test(normalized)
  )
}

function fallbackQuestionForContext(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  isFirstTurn?: boolean
  isTopicChoiceTurn?: boolean
  lastUserText?: string
}): string {
  if (params.topic === 'free_talk') {
    if (params.isFirstTurn) {
      return params.audience === 'child' || params.level === 'starter' || params.level === 'a1'
        ? 'What do you want to talk about?'
        : 'What would you like to talk about today?'
    }
    if (params.isTopicChoiceTurn) {
      if (params.lastUserText) {
        const { en, ru } = extractTopicChoiceKeywordsByLang(params.lastUserText)
        const keywords = en.length > 0 ? en : translateRuTopicKeywordsToEn(ru)
        if (keywords.length > 0) {
          return buildFreeTalkTopicAnchorQuestion({
            keywords,
            tense: params.tense,
            audience: params.audience,
            diversityKey: `topic-choice|${params.lastUserText}`,
          })
        }
      }
      return params.audience === 'child' ? 'What do you want to talk about?' : 'What would you like to talk about now?'
    }
    return defaultNextQuestion(params.tense)
  }
  return firstQuestionForTopicAndTense({
    topic: params.topic,
    tense: params.tense,
    level: params.level,
    audience: params.audience,
  })
}

function buildAudienceStyleRule(audience: 'child' | 'adult'): string {
  return audience === 'child'
    ? 'Audience style: CHILD. In Russian replies, use ONLY informal address: "ты", "тебе", "твой", "твои", "с тобой". Write every Russian sentence in natural second-person singular grammar: "ты пошёл", "ты спросил", "у тебя есть", "с тобой", "твой". Never use formal "вы", "вам", "вас", "ваш", "ваше", "ваши" — even if the user gives a task, steps, or sounds like an adult client. Do not switch to a polite-assistant or service-desk tone, and do not build the reply in plural/formal form first and then try to replace words afterward. Keep the tone warm, simple, encouraging, and concrete. In English replies, use short, friendly, child-appropriate wording. Avoid formal or overly serious language.'
    : 'Audience style: ADULT. In Russian replies, address the user with "вы". Keep the tone natural, respectful, and concise. In English replies, use natural adult-to-adult wording. Avoid childish wording or over-familiarity.'
}

function isSoftCommentTone(audience: 'child' | 'adult', level: string): boolean {
  return audience === 'child' || (audience === 'adult' && ['starter', 'a1', 'a2'].includes(level))
}

function softCommentPronoun(audience: 'child' | 'adult'): 'ты' | 'вы' {
  return audience === 'child' ? 'ты' : 'вы'
}

function buildCommentToneRule(audience: 'child' | 'adult', level: string): string {
  if (isSoftCommentTone(audience, level)) {
    const pronoun = softCommentPronoun(audience)
    return `Correction tone (Комментарий): Use simple, everyday language. Do NOT start with "Ошибка..." or use grammar terms like "согласование подлежащего и сказуемого", "форма глагола", "артикль". Instead, explain plainly what needs to change and why. Address the user as "${pronoun}". Examples of good style: "Тут мы говорим про то, что бывает обычно, поэтому нужно сказать plays." / "После he нужно добавить -s, потому что это он делает." / "Тут нужно другое слово — look значит смотреть, а see — видеть." Keep it to 1–2 short sentences.`
  }
  return 'Correction tone (Комментарий): Be concise and professional. You may use grammar term names (e.g. "Present Simple", "Past Perfect") when they help the learner understand the mistake. Address the user as "вы". Keep it to 1–2 short sentences.'
}

function buildCommunicationEnglishStyleRule(audience: 'child' | 'adult'): string {
  return audience === 'child'
    ? 'English-only communication style: If you answer in English, keep the voice warm, simple, friendly, and concrete across turns. Use one short greeting plus one invitation on the first English reply, and keep later English replies short and natural. Do not repeat the same opening phrase or add extra filler.'
    : 'English-only communication style: If you answer in English, keep the voice natural, respectful, and concise across turns. Use one short greeting plus one invitation on the first English reply, and keep later English replies short and natural. Do not repeat the same opening phrase or add extra filler.'
}

/** Только режим communication: потолок CEFR или динамика для level === 'all'. */
function buildCommunicationLevelRules(level: string): string {
  if (level === 'all') {
    return [
      'English level mode: adaptive ("all"). Infer the learner\'s approximate English level only from the user\'s messages in the current request context (the conversation history you see). Do not print CEFR labels in your reply.',
      'If the user\'s English stays simple (short sentences, basic vocabulary, limited tense variety), keep your English similarly simple; do not introduce noticeably heavier vocabulary, rare idioms, or complex syntax than they typically use in this thread.',
      'If the user writes fluent, accurate English with richer vocabulary and varied tenses, you may match that apparent level and stay natural—without sounding like an exam or a textbook. Re-evaluate as the conversation evolves.',
      'Russian replies: follow CHILD/ADULT register rules; keep Russian phrasing clear and natural. English complexity is what you align to the learner; Russian stays governed by audience style.',
    ].join(' ')
  }
  const ceiling = buildLevelPrompt(level)
  const lowRu = level === 'starter' || level === 'a1' || level === 'a2'
  const ruHint = lowRu
    ? 'For Russian replies: prefer short, clear sentences; avoid bureaucratic or overly formal phrasing. CHILD/ADULT register rules still apply.'
    : 'CHILD/ADULT register rules apply to Russian.'
  return [
    `Fixed learner English level (CEFR ceiling): ${ceiling}`,
    'Your English output must NOT exceed this profile: vocabulary, grammar, tense range, and sentence complexity must stay within the level described above. Do not use structures or idioms clearly above this level.',
    ruHint,
  ].join(' ')
}

function detectCommunicationDetailLevel(text: string): 0 | 1 | 2 {
  const normalized = normalizeCommunicationDetailText(text)

  if (normalized === 'еще подробнее') return 2
  if (normalized === 'even more detail' || normalized === 'even more details') return 2
  if (normalized === 'in even more detail' || normalized === 'in even more details') return 2

  if (normalized === 'подробнее') return 1
  if (normalized === 'more detail' || normalized === 'more details') return 1
  if (normalized === 'in more detail' || normalized === 'in more details') return 1

  return 0
}

function buildCommunicationDetailRule(detailLevel: 0 | 1 | 2): string {
  if (detailLevel === 2) {
    return 'If the user writes "Ещё подробнее", "Еще подробнее", "even more details", or "in even more detail", answer much more expansively than usual: give a fuller explanation, add relevant nuance, and use up to 2 short paragraphs if needed. Keep the same language, tone, and audience style. These keywords are language-neutral and only change depth.'
  }

  if (detailLevel === 1) {
    return 'If the user writes "Подробнее", "more details", or "in more detail", answer more expansively than usual: give a short but clearer explanation with a bit more context. Keep the same language, tone, and audience style. These keywords are language-neutral and only change depth.'
  }

  return 'Without a detail keyword, keep the reply short and focused (1–3 sentences).'
}

function buildCommunicationMaxTokens(detailLevel: 0 | 1 | 2): number {
  if (detailLevel === 2) return 1024
  if (detailLevel === 1) return 768
  return MAX_RESPONSE_TOKENS
}

function buildCommunicationFallbackMessage(params: {
  audience: 'child' | 'adult'
  language: 'ru' | 'en'
  firstTurn?: boolean
  seedText?: string | null
}): string {
  const { audience, language, firstTurn = false, seedText = '' } = params
  const isChild = audience === 'child'

  if (firstTurn) {
    const seed = stableHash32(`communication_first|${language}|${audience}|${seedText}`)
    const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''

    if (language === 'ru') {
      return isChild
        ? pick([
            'Привет! Как ты? Что хочешь обсудить?',
            'Привет! Как у тебя дела? О чём хочешь поговорить?',
            'Привет! Что нового? Что тебе сегодня интересно?',
            'Привет! Что ты хочешь обсудить сегодня?',
            'Привет! Давай поговорим. Что тебя сейчас интересует?',
            'Привет! О чём хочешь поговорить сегодня?',
          ])
        : pick([
            'Здравствуйте! Как вы? О чём хотите поговорить?',
            'Здравствуйте! Рад вас видеть. Чем займёмся сегодня?',
            'Здравствуйте! Что вам интересно обсудить?',
            'Здравствуйте! Готовы поговорить? Что интересного у вас сегодня?',
            'Здравствуйте! О чём хотите поговорить сегодня?',
            'Здравствуйте! Чем могу быть полезен?',
          ])
    }
    return isChild
      ? pick([
          'Hi! How are you? What would you like to talk about?',
          'Hi! What’s up? What would you like to chat about?',
          'Hi! Ready to talk? What would you like to discuss?',
          'Hi! How’s it going? What should we talk about?',
          'Hey! What would you like to practice today?',
          'Hi there! What’s on your mind today?',
        ])
      : pick([
          'Hello! How are you doing? What would you like to discuss?',
          'Hello! Good to see you. What would you like to talk about?',
          'Hello! What would you like to chat about today?',
          'Hello! What is on your mind today?',
          'Hello! What would you like to explore today?',
          'Hello! How can I help you today?',
        ])
  }

  if (language === 'ru') {
    return isChild
      ? 'Уточни, пожалуйста, что ты имеешь в виду.'
      : 'Уточните, пожалуйста, что вы имеете в виду.'
  }

  return isChild
    ? 'What do you mean? Could you say that another way?'
    : 'Could you clarify what you mean?'
}

function shouldPreferEnglishContinuationFallback(text: string, targetLang: DetectedLang): boolean {
  if (targetLang !== 'en') return false
  const t = text.trim()
  if (!t) return false
  const hasCyr = /[А-Яа-яЁё]/.test(t)
  const hasLat = /[A-Za-z]/.test(t)
  if (!(hasCyr && hasLat)) return false
  const latWords = t.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g) ?? []
  const cyrWords = t.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) ?? []
  return latWords.length + cyrWords.length >= 2
}

function buildCommunicationEnglishContinuationFallback(audience: 'child' | 'adult'): string {
  return audience === 'child'
    ? 'Got it. Let’s keep talking about this in English. What part interests you most?'
    : 'Got it. Let’s continue in English. What part would you like to discuss first?'
}

function fallbackTranslationSentenceForContext(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  seedText?: string | null
}): string {
  const { topic, tense, level, audience, seedText = '' } = params
  const isChild = audience === 'child'
  const seed = stableHash32(`translation_next|${topic}|${tense}|${level}|${audience}|${seedText}`)
  const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''
  const topicVariants: Record<string, string[]> = {
    food: ['Я люблю готовить дома.', 'Я часто пью чай вечером.', 'Мы обычно ужинаем вместе.'],
    family_friends: ['Я люблю свою семью.', 'У меня есть хорошие друзья.', 'Мы часто видимся по выходным.'],
    hobbies: ['Я люблю читать книги.', 'Я часто рисую вечером.', 'Я обычно играю в шахматы дома.'],
    movies_series: ['Я люблю смотреть фильмы.', 'Я часто смотрю сериалы вечером.', 'Мы обычно смотрим кино по выходным.'],
    music: ['Я люблю слушать музыку.', 'Я часто слушаю песни дома.', 'Мы обычно поём вместе.'],
    sports: ['Я люблю заниматься спортом.', 'Я часто бегаю по утрам.', 'Мы обычно играем в футбол после школы.'],
    daily_life: ['Я обычно встаю рано.', 'Я часто завтракаю дома.', 'Мы обычно ходим в школу пешком.'],
    travel: ['Я люблю путешествовать.', 'Я часто езжу в новые места.', 'Мы обычно планируем поездки заранее.'],
    work: ['Я работаю в офисе.', 'Я часто пишу письма по работе.', 'Мы обычно встречаемся утром.'],
    technology: ['Я люблю новые приложения.', 'Я часто пользуюсь телефоном.', 'Мы обычно работаем за компьютером.'],
    culture: ['Я люблю ходить в музеи.', 'Я часто читаю о культуре.', 'Мы обычно посещаем выставки.'],
    business: ['Я работаю с клиентами.', 'Я часто отвечаю на письма.', 'Мы обычно обсуждаем планы на встрече.'],
    free_talk: ['Я люблю читать книги.', 'Я часто гуляю вечером.', 'Мы обычно говорим по-английски дома.'],
  }
  const topicPool = topicVariants[topic] ?? topicVariants.free_talk
  const base = pick(topicPool)
  const basic = level === 'starter' || level === 'a1' || level === 'a2'

  if (tense === 'present_simple') return base
  if (tense === 'present_continuous') {
    return pick([
      'Я сейчас читаю книгу.',
      'Я сейчас готовлю ужин.',
      'Мы сейчас смотрим фильм.',
      basic ? 'Я сейчас учусь.' : 'Я сейчас работаю над проектом.',
    ])
  }
  if (tense === 'present_perfect') {
    return pick([
      'Я уже прочитал книгу.',
      'Я уже сделал домашнее задание.',
      'Мы уже поужинали.',
      basic ? 'Я уже увидел это.' : 'Я уже решил эту задачу.',
    ])
  }
  if (tense === 'present_perfect_continuous') {
    return pick([
      'Я уже давно читаю эту книгу.',
      'Я уже несколько часов работаю над проектом.',
      'Мы уже долго ждём тебя.',
      basic ? 'Я уже давно учусь английскому.' : 'Я уже давно занимаюсь этим проектом.',
    ])
  }
  if (tense === 'past_simple') {
    return pick([
      'Вчера я прочитал книгу.',
      'Вчера мы смотрели фильм.',
      'Я пришёл домой поздно.',
      basic ? 'Я вчера играл дома.' : 'Я вчера работал допоздна.',
    ])
  }
  if (tense === 'past_continuous') {
    return pick([
      'Я читал книгу, когда ты позвонил.',
      'Мы ужинали, когда начался дождь.',
      'Я смотрел фильм, когда пришёл друг.',
      basic ? 'Я играл, когда мама позвала меня.' : 'Я работал над проектом, когда пришло письмо.',
    ])
  }
  if (tense === 'past_perfect') {
    return pick([
      'Я уже прочитал книгу до ужина.',
      'Мы уже ушли, когда ты пришёл.',
      'Я уже сделал уроки к вечеру.',
      basic ? 'Я уже поел до прогулки.' : 'Я уже закончил работу до встречи.',
    ])
  }
  if (tense === 'past_perfect_continuous') {
    return pick([
      'Я уже давно читал эту книгу до ужина.',
      'Мы уже несколько часов ждали автобус.',
      'Я уже долго работал, когда ты позвонил.',
      basic ? 'Я уже долго играл, когда мама пришла.' : 'Я уже давно занимался этим проектом до звонка.',
    ])
  }
  if (tense === 'future_simple') {
    return pick([
      'Завтра я прочитаю книгу.',
      'Завтра мы пойдём в кино.',
      'Я скоро позвоню тебе.',
      basic ? 'Я завтра пойду гулять.' : 'Я на следующей неделе начну новый проект.',
    ])
  }
  if (tense === 'future_continuous') {
    return pick([
      'Завтра в это время я буду читать книгу.',
      'Завтра вечером мы будем ужинать.',
      'Я буду работать весь день.',
      basic ? 'Я буду учиться вечером.' : 'Я буду заниматься проектом завтра утром.',
    ])
  }
  if (tense === 'future_perfect') {
    return pick([
      'К завтрашнему утру я уже прочитаю книгу.',
      'К вечеру мы уже закончим работу.',
      'К тому времени я уже всё сделаю.',
      basic ? 'Я к вечеру уже вернусь домой.' : 'Я к понедельнику уже завершу задачу.',
    ])
  }
  if (tense === 'future_perfect_continuous') {
    return pick([
      'К вечеру я уже буду читать книгу два часа.',
      'К тому времени мы уже будем работать над проектом несколько часов.',
      'К завтрашнему утру я уже буду заниматься этим час.',
      basic ? 'К вечеру я уже буду играть несколько часов.' : 'К сроку я уже буду работать над задачей несколько часов.',
    ])
  }
  return isChild ? 'Я люблю читать книги.' : base
}

/** Паттерн: "Говорится X, не Y" или "Нужно слово X, не Y" — строка с другим контекстом, если ни X, ни Y нет в сообщении пользователя. */
const OFF_CONTEXT_CORRECTION = /(?:Говорится|Нужно слово)\s+(\w+)\s*,\s*не\s+(\w+)/i

/**
 * Удаляет из ответа строки с коррекциями, которые ссылаются на слова, отсутствующие в последнем сообщении пользователя.
 */
function stripOffContextCorrections(content: string, lastUserContent: string): string {
  if (!lastUserContent.trim()) return content
  const userLower = lastUserContent.toLowerCase()
  const lines = content.split(/\r?\n/)
  const kept = lines.filter((line) => {
    const m = line.match(OFF_CONTEXT_CORRECTION)
    if (!m) return true
    const w1 = (m[1] ?? '').toLowerCase()
    const w2 = (m[2] ?? '').toLowerCase()
    if (userLower.includes(w1) || userLower.includes(w2)) return true
    return false
  })
  return kept.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

/**
 * Модель иногда нарушает протокол и добавляет "Повтори:" даже в ответах-похвалах.
 * Это зацикливает UX (пользователь повторяет, а модель снова просит повторить).
 * Если есть похвала в "Комментарий:", удаляем строки "Повтори:".
 */
function stripRepeatOnPraise(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return content

  if (!shouldStripRepeatOnPraise(trimmed)) return content

  const lines = trimmed.split(/\r?\n/)
  const kept = lines.filter((line) => {
    const normalized = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    return !/^\s*(Повтори|Repeat|Say)\s*:/i.test(normalized)
  })
  return kept.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

function defaultNextQuestion(tense: string): string {
  switch (tense) {
    case 'present_continuous':
      return 'What are you doing right now?'
    case 'present_simple':
      return 'What do you usually do in your free time?'
    case 'present_perfect':
      return 'What have you done recently?'
    case 'present_perfect_continuous':
      return 'What have you been working on lately?'
    case 'past_simple':
      return 'What did you do yesterday?'
    case 'past_continuous':
      return 'What were you doing at this time yesterday?'
    case 'past_perfect':
      return 'What had you done before you went to bed yesterday?'
    case 'past_perfect_continuous':
      return 'What had you been doing for a long time before you stopped?'
    case 'future_simple':
      return 'What will you do tomorrow?'
    case 'future_continuous':
      return 'What will you be doing this time tomorrow?'
    case 'future_perfect':
      return 'What will you have done by this time tomorrow?'
    case 'future_perfect_continuous':
      return 'What will you have been doing for a while by the end of tomorrow?'
    default:
      return 'What would you like to talk about next?'
  }
}

/** Стоп-слова для шага free_talk topic choice (EN/RU). */
const TOPIC_CHOICE_SKIP_WORDS_EN = new Set([
  'the', 'and', 'but', 'for', 'with', 'about', 'from', 'into', 'that', 'this',
  'what', 'when', 'where', 'which', 'who', 'how', 'why', 'you', 'your', 'our',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would',
  'could', 'should', 'just', 'like', 'want', 'talk', 'some', 'any', 'all',
])
const TOPIC_CHOICE_SKIP_WORDS_RU = new Set([
  'и', 'а', 'но', 'или', 'про', 'о', 'об', 'в', 'на', 'с', 'по', 'для', 'это', 'эта',
  'этот', 'эти', 'что', 'где', 'когда', 'как', 'почему', 'кто', 'мне', 'меня', 'мой',
  'моя', 'мои', 'тема', 'хочу', 'хотел', 'хотела', 'говорить', 'поговорить',
])
const RU_TOPIC_KEYWORD_TO_EN: Record<string, string> = {
  солнце: 'sun',
  солнечный: 'sun',
  погода: 'weather',
  дождь: 'rain',
  снег: 'snow',
  море: 'sea',
  океан: 'ocean',
  река: 'river',
  озеро: 'lake',
  пляж: 'beach',
  гора: 'mountain',
  горы: 'mountains',
  лес: 'forest',
  природа: 'nature',
  спорт: 'sports',
  футбол: 'football',
  теннис: 'tennis',
  баскетбол: 'basketball',
  хоккей: 'hockey',
  плавание: 'swimming',
  бег: 'running',
  велосипед: 'bicycle',
  музыка: 'music',
  песня: 'song',
  песни: 'songs',
  гитара: 'guitar',
  пианино: 'piano',
  фильм: 'movie',
  фильмы: 'movies',
  кино: 'cinema',
  мультик: 'cartoon',
  мультики: 'cartoons',
  книга: 'book',
  книги: 'books',
  школа: 'school',
  урок: 'lesson',
  уроки: 'lessons',
  учёба: 'studies',
  работа: 'work',
  еда: 'food',
  готовка: 'cooking',
  кот: 'cat',
  кошка: 'cat',
  кошки: 'cats',
  собака: 'dog',
  собаки: 'dogs',
  животные: 'animals',
  семья: 'family',
  друзья: 'friends',
  друг: 'friend',
  путешествие: 'travel',
  путешествия: 'travel',
  город: 'city',
  страна: 'country',
  дом: 'home',
  машина: 'car',
  компьютер: 'computer',
  телефон: 'phone',
  игра: 'game',
  игры: 'games',
  лето: 'summer',
  зима: 'winter',
  весна: 'spring',
  осень: 'autumn',
  космос: 'space',
  динозавры: 'dinosaurs',
  робот: 'robot',
  роботы: 'robots',
}

function normalizeTopicToken(token: string): string {
  return token.toLowerCase().replace(/^[^a-zа-яё]+|[^a-zа-яё]+$/gi, '')
}

function extractTopicChoiceKeywordsByLang(userText: string): { en: string[]; ru: string[] } {
  const rawEn = userText.match(/\b[a-z][a-z']+\b/gi) ?? []
  const rawRu = userText.match(/[а-яё]+(?:-[а-яё]+)*/gi) ?? []
  const en: string[] = []
  const ru: string[] = []

  for (const t of rawEn) {
    const n = normalizeTopicToken(t)
    if (!n || n.length < 3) continue
    if (TOPIC_CHOICE_SKIP_WORDS_EN.has(n)) continue
    if (!en.includes(n)) en.push(n)
    if (en.length >= 8) break
  }
  for (const t of rawRu) {
    const n = normalizeTopicToken(t)
    if (!n || n.length < 3) continue
    if (TOPIC_CHOICE_SKIP_WORDS_RU.has(n)) continue
    if (!ru.includes(n)) ru.push(n)
    if (ru.length >= 8) break
  }

  return { en, ru }
}

function extractLastDialogueQuestionLine(content: string): string | null {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => stripLeadingAiPrefix(l).trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    if (/\?\s*$/.test(line) && /[A-Za-z]/.test(line)) return line
  }
  return null
}

/** Один вопрос в нужном времени, привязанный к теме пользователя (fallback для free_talk). */
function buildFreeTalkTopicAnchorQuestion(params: {
  keywords: string[]
  tense: string
  audience: 'child' | 'adult'
  diversityKey?: string
  recentAssistantQuestions?: string[]
}): string {
  return buildFreeTalkTopicAnchorQuestionText(params)
}

function translateRuTopicKeywordsToEn(keywords: string[]): string[] {
  const translated: string[] = []
  for (const keyword of keywords) {
    const normalized = normalizeTopicToken(keyword)
    if (!normalized) continue
    const mapped = RU_TOPIC_KEYWORD_TO_EN[normalized]
    if (!mapped) continue
    if (!translated.includes(mapped)) translated.push(mapped)
    if (translated.length >= 8) break
  }
  return translated
}

function ensureFreeTalkTopicChoiceQuestionAnchorsUser(params: {
  content: string
  userText: string
  tense: string
}): string {
  const qLine = extractLastDialogueQuestionLine(params.content)
  return qLine ?? params.content
}

function extractRecentAssistantQuestions(messages: ChatMessage[], limit = 3): string[] {
  const questions: string[] = []
  for (let i = messages.length - 1; i >= 0 && questions.length < limit; i--) {
    const msg = messages[i]
    if (msg?.role !== 'assistant') continue
    const q = extractLastDialogueQuestionLine(msg.content)
    if (q) questions.push(q)
  }
  return questions
}

function applyFreeTalkAntiRepeat(params: {
  content: string
  tense: string
  audience: 'child' | 'adult'
  recentMessages: ChatMessage[]
  lastUserText: string
}): string {
  const questionLine = extractLastDialogueQuestionLine(params.content)
  if (!questionLine) return params.content
  if (/(^|\n)\s*(Повтори|Repeat|Say)\s*:/im.test(params.content)) return params.content

  const recentQuestions = extractRecentAssistantQuestions(params.recentMessages, 3)
  const isRepeated = recentQuestions.some((q) => isNearDuplicateQuestion(q, questionLine))
  if (!isRepeated) return params.content

  const { en, ru } = extractTopicChoiceKeywordsByLang(params.lastUserText)
  const keywords = en.length > 0 ? en : translateRuTopicKeywordsToEn(ru)
  if (keywords.length === 0) return params.content

  const replacement = buildFreeTalkTopicAnchorQuestion({
    keywords,
    tense: params.tense,
    audience: params.audience,
    diversityKey: `${params.recentMessages.length}|${params.lastUserText}|anti-repeat`,
    recentAssistantQuestions: recentQuestions,
  })
  if (!replacement || isNearDuplicateQuestion(questionLine, replacement)) return params.content
  return params.content.replace(questionLine, replacement)
}

function firstQuestionForTopicAndTense(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  diversityKey?: string
}): string {
  const { topic, tense, level, audience, diversityKey = '' } = params
  const isChild = audience === 'child'
  const isBasic = level === 'starter' || level === 'a1' || level === 'a2'

  const seed = stableHash32(`first_q|${topic}|${tense}|${level}|${audience}|${diversityKey}`)
  const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''

  const byTopic = (t: string): Record<string, string[]> => {
    const common = {
      business: [
        'your job',
        'your work',
      ],
      family_friends: [
        'your family',
        'your friends',
      ],
      hobbies: [
        'your hobbies',
        'your free time',
      ],
      movies_series: [
        'movies',
        'series',
      ],
      music: [
        'music',
      ],
      sports: [
        'sports',
      ],
      food: [
        'food',
        'cooking',
      ],
      culture: [
        'culture',
      ],
      daily_life: [
        'your day',
        'your daily routine',
      ],
      travel: [
        'travel',
        'trips',
      ],
      work: [
        'work',
      ],
      technology: [
        'technology',
        'apps',
      ],
    } satisfies Record<string, string[]>
    return { ...common, [t]: common[t as keyof typeof common] ?? ['this topic'] }
  }

  const topics = byTopic(topic)[topic] ?? ['this topic']
  const t1 = topics[seed % topics.length] ?? topics[0] ?? 'this topic'

  const kidLead = isChild ? pick(['Hey!', 'Hi!', 'Okay!']) + ' ' : ''

  // Для начальных уровней избегаем абстракций и длинных конструкций.
  if (tense === 'present_simple') {
    if (topic === 'food') {
      return pick([
        `${kidLead}What do you usually eat for breakfast?`,
        `${kidLead}What do you usually eat for lunch?`,
        `${kidLead}Do you cook at home?`,
      ])
    }
    if (topic === 'culture') {
      return pick([
        `${kidLead}What do you usually do when you want to learn about culture?`,
        `${kidLead}How do you usually explore culture?`,
        `${kidLead}Do you often visit museums or exhibitions?`,
      ])
    }
    if (topic === 'sports') {
      return pick([
        `${kidLead}Do you play any sports?`,
        `${kidLead}What sport do you like?`,
        `${kidLead}How often do you exercise?`,
      ])
    }
    if (topic === 'movies_series') {
      return isChild
        ? pick([
            `${kidLead}Do you watch movies often?`,
            `${kidLead}What kind of movies do you like?`,
            `${kidLead}Do you watch series?`,
            `${kidLead}Who do you watch movies with?`,
            `${kidLead}What movie character do you like most?`,
          ])
        : pick([
            'What kind of movies do you usually watch?',
            'Why do you enjoy this type of movie?',
            'Which series are you following now, and why?',
            'What do you value most in a good movie: story, acting, or visuals?',
            'How has your movie taste changed in recent years?',
          ])
    }
    if (topic === 'music') {
      return isChild
        ? pick([
            `${kidLead}What music do you like?`,
            `${kidLead}Who is your favorite singer?`,
            `${kidLead}Do you listen to music every day?`,
            `${kidLead}What song makes you happy?`,
          ])
        : pick([
            'What music do you listen to most these days?',
            'Why does this music style resonate with you?',
            'Which artist has influenced your taste the most?',
            'Do you usually focus on lyrics, melody, or mood?',
          ])
    }
    if (topic === 'hobbies') {
      return pick([
        `${kidLead}What do you usually do in your free time?`,
        `${kidLead}What are your hobbies?`,
        `${kidLead}Do you have any hobbies?`,
      ])
    }
    if (topic === 'travel') {
      return isChild
        ? pick([
            `${kidLead}Do you like traveling?`,
            `${kidLead}Where do you usually go on trips?`,
            `${kidLead}What do you usually do on your trips?`,
            `${kidLead}What place do you want to visit with your family?`,
          ])
        : pick([
            'What type of trips do you enjoy most, and why?',
            'How do you usually choose your travel destinations?',
            'What makes a trip memorable for you?',
            'Do you prefer relaxed travel or active travel?',
          ])
    }
    return pick([
      `${kidLead}What do you think about ${t1}?`,
      `${kidLead}Do you like ${t1}?`,
    ])
  }

  if (tense === 'present_perfect') {
    if (topic === 'movies_series') {
      return pick([
        `${kidLead}What movie have you watched recently?`,
        `${kidLead}Have you watched any good series lately?`,
        `${kidLead}What new movie have you found recently?`,
      ])
    }
    if (topic === 'sports') {
      return pick([
        `${kidLead}Have you tried any new sport recently?`,
        `${kidLead}What sport have you played recently?`,
        `${kidLead}Have you exercised this week?`,
      ])
    }
    if (topic === 'food') {
      return pick([
        `${kidLead}What have you eaten today?`,
        `${kidLead}Have you cooked anything this week?`,
        `${kidLead}What new food have you tried recently?`,
      ])
    }
    return pick([
      `${kidLead}What have you talked about ${t1} recently?`,
      `${kidLead}Have you talked about ${t1} lately?`,
      `${kidLead}What have you learned recently about ${t1}?`,
    ])
  }

  if (tense === 'present_continuous') {
    return pick([
      `${kidLead}What are you talking about ${t1} right now?`,
      `${kidLead}What are you talking about ${t1} at the moment?`,
      isBasic ? `${kidLead}What are you talking about ${t1} now?` : `${kidLead}What are you thinking about ${t1} right now?`,
    ])
  }

  if (tense === 'past_simple') {
    if (topic === 'movies_series') {
      return isChild
        ? pick([
            `${kidLead}What movie did you watch last weekend?`,
            `${kidLead}Did you watch a funny movie yesterday?`,
            `${kidLead}What did you like most in that movie?`,
          ])
        : pick([
            'What movie did you watch recently, and what stood out?',
            'Did you watch any series episode this week?',
            'What did you think about the story and characters?',
          ])
    }
    return pick([
      `${kidLead}What did you talk about ${t1} yesterday?`,
      `${kidLead}What did you talk about ${t1} last weekend?`,
      `${kidLead}What did you talk about ${t1} after school/work yesterday?`,
    ])
  }

  if (tense === 'future_simple') {
    if (topic === 'movies_series') {
      return isChild
        ? pick([
            `${kidLead}What movie will you watch next?`,
            `${kidLead}Who will you watch a movie with next week?`,
            `${kidLead}What kind of movie will you choose next weekend?`,
          ])
        : pick([
            'What movie or series will you watch next, and why?',
            'What do you expect from your next movie night?',
            'Will you choose something familiar or try a new genre next week?',
          ])
    }
    if (topic === 'sports') {
      return isChild
        ? pick([
            `${kidLead}What sport will you play next week?`,
            `${kidLead}Who will you play sports with this weekend?`,
            `${kidLead}Where will you train next time?`,
          ])
        : pick([
            'What sport will you focus on next week?',
            'How will you plan your next training session?',
            'Will you try anything new in your sport routine soon?',
          ])
    }
    return pick([
      `${kidLead}What will you talk about ${t1} tomorrow?`,
      `${kidLead}What will you talk about ${t1} this weekend?`,
      `${kidLead}What will you talk about ${t1} next week?`,
    ])
  }

  if (tense === 'present_perfect_continuous') {
    return pick([
      `${kidLead}What have you been talking about ${t1} lately?`,
      `${kidLead}What have you been thinking about ${t1} for a while?`,
    ])
  }

  if (tense === 'past_continuous') {
    return pick([
      `${kidLead}What were you talking about ${t1} at this time yesterday?`,
      `${kidLead}What were you thinking about ${t1} at the moment yesterday?`,
    ])
  }

  if (tense === 'past_perfect') {
    return pick([
      `${kidLead}What had you talked about ${t1} before you went to bed yesterday?`,
      `${kidLead}What had you learned about ${t1} before last weekend?`,
    ])
  }

  if (tense === 'past_perfect_continuous') {
    return pick([
      `${kidLead}What had you been talking about ${t1} for a long time before you stopped?`,
      `${kidLead}What had you been thinking about ${t1} for a while before you decided?`,
    ])
  }

  if (tense === 'future_continuous') {
    return pick([
      `${kidLead}What will you be talking about ${t1} this time tomorrow?`,
      `${kidLead}What will you be thinking about ${t1} this time tomorrow?`,
    ])
  }

  if (tense === 'future_perfect') {
    return pick([
      `${kidLead}What will you have talked about ${t1} by this time tomorrow?`,
      `${kidLead}What will you have learned about ${t1} by this time tomorrow?`,
    ])
  }

  if (tense === 'future_perfect_continuous') {
    return pick([
      `${kidLead}What will you have been talking about ${t1} for a while by the end of tomorrow?`,
      `${kidLead}What will you have been thinking about ${t1} by the end of tomorrow?`,
    ])
  }

  // Остальные времена: оставляем нормальные общие вопросы без «related to».
  return defaultNextQuestion(tense)
}

/** Минимальная длина строки, чтобы считать её полноценным вопросом (не обрубок вроде "AI: T"). */
const MIN_QUESTION_LENGTH = 15

function fallbackNextQuestion(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  diversityKey?: string
}): string {
  if (params.topic === 'free_talk') return defaultNextQuestion(params.tense)
  return firstQuestionForTopicAndTense({
    topic: params.topic,
    tense: params.tense,
    level: params.level,
    audience: params.audience,
    diversityKey: params.diversityKey,
  })
}

function looksLikeRussianMetaLine(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  if (/\?\s*$/.test(s)) return false
  // не трогаем служебные строки
  if (/^\s*(Комментарий|Повтори)\s*:/i.test(s)) return false

  // Для мета-линии в нашем кейсе важно: кириллица + слова-оценки/времена/“использовали”.
  const hasCyrillic = /[А-Яа-яЁё]/.test(s)
  if (!hasCyrillic) return false

  const normalized = s.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
  return (
    /(вы\s+правильно|правильно\s+использ|использовал[аи]?|время\s+|present\s+(simple|continuous|perfect)|past\s+(simple|continuous|perfect)|future\s+(simple|continuous|perfect))/i.test(
      normalized
    ) || /(present\s+continuous|present\s+simple|present\s+perfect|past\s+simple|past\s+continuous|past\s+perfect|future\s+simple)/i.test(normalized)
  )
}

function dropRussianMetaLinesOnPraise(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return text
  if (!isKommentariyPurePraiseOnly(trimmed)) return text

  const lines = trimmed.split(/\r?\n/)
  const filtered = lines.filter((l) => !looksLikeRussianMetaLine(l))
  return filtered.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

/**
 * Удаляет из конца контента обрезанные строки вида "AI: T" или одиночный "T", чтобы не показывать мусор в UI.
 */
function dropTruncatedTrailingLines(text: string): string {
  const lines = text.split(/\r?\n/)
  while (lines.length > 1) {
    const last = lines[lines.length - 1].trim()
    const tooShort = last.length > 0 && last.length < MIN_QUESTION_LENGTH && !/\?\s*$/.test(last)
    const looksTruncated =
      tooShort &&
      (/^\s*(?:ai|assistant)\s*:\s*/i.test(last) || last.length < 5 || /^[A-Za-z]{1,6}$/.test(last))
    if (!looksTruncated) break
    lines.pop()
  }
  return lines.join('\n').replace(/\n+\s*$/, '\n').trim()
}

function normalizeAboutTodaySpacing(content: string): string {
  // Модель иногда сливает "about today" в "abouttoday" — восстанавливаем пробел.
  return content.replace(/\babout\s*today\b/gi, 'about today')
}

/**
 * Страховка UX: иногда модель, даже при корректном ответе, даёт похвалу/мета‑фразу,
 * но не задаёт следующий вопрос или обрезает ответ ("AI: T"). При верном ответе
 * скрываем комментарий и подставляем следующий вопрос по алгоритму.
 */
function ensureNextQuestionOnPraise(content: string, params: {
  mode: string
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  /** free_talk: время следующего вопроса (из pickWeighted), иначе подставится tense. */
  nextQuestionTense?: string | null
}): string {
  if (params.mode !== 'dialogue') return content
  const trimmed = dropRussianMetaLinesOnPraise(content).trim()
  if (!trimmed) return content

  // Пользователь ещё должен повторить исправление — не подменяем ответ следующим вопросом.
  if (/(^|\n)\s*(Повтори|Repeat|Say)\s*:/im.test(trimmed)) return content
  if (!isKommentariyPurePraiseOnly(trimmed)) return content

  const tenseForFallback =
    params.topic === 'free_talk' && params.nextQuestionTense ? params.nextQuestionTense : params.tense
  return fallbackNextQuestion({ ...params, tense: tenseForFallback })
}

function ensureNextQuestionWhenMissing(content: string, params: {
  mode: string
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  nextQuestionTense?: string | null
}): string {
  if (params.mode !== 'dialogue') return content
  const trimmed = content.trim()
  if (!trimmed) return content

  // Если есть "Повтори:", вопрос добавлять нельзя — пользователь должен повторить.
  if (/^\s*(?:ai|assistant)\s*:\s*/im.test(trimmed)) {
    // no-op; normalize happens elsewhere
  }
  if (/(^|\n)\s*(Повтори|Repeat|Say)\s*:/im.test(trimmed)) return content

  // Есть Комментарий (в любой строке), но нет ни одного вопроса.
  const hasComment = /(^|\n)\s*Комментарий\s*:/im.test(trimmed)
  const hasQuestionMark = /\?\s*$|[A-Za-z].*\?/m.test(trimmed)
  if (!hasComment || hasQuestionMark) return content

  const tenseForFallback =
    params.topic === 'free_talk' && params.nextQuestionTense ? params.nextQuestionTense : params.tense
  return `${trimmed}\n${fallbackNextQuestion({ ...params, tense: tenseForFallback })}`
}

function extractLikelyEntityFromUserAnswer(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null
  const cleaned = raw.replace(/[.,!?;:]+$/g, '').replace(/\s+/g, ' ').trim()
  if (cleaned.length < 3 || cleaned.length > 60) return null
  if (!/[A-Za-zА-Яа-яЁё]/.test(cleaned)) return null
  if (
    /\b(?:i|you|we|they|he|she|it)\s+(?:am|is|are|was|were|have|has|had|will|would|do|does|did|can|could|should|must)\b/i.test(
      cleaned
    )
  ) {
    return null
  }

  const allowedShortAnswers = new Set(['yes', 'no', 'ok', 'okay', 'sure', 'yeah', 'yep', 'nope', 'nah', 'hi', 'hello'])
  const short = cleaned.toLowerCase()
  if (allowedShortAnswers.has(short)) return null

  // Если пользователь ответил как фразой ("I like Turkey"), пытаемся выделить сущность справа.
  let stripped = cleaned
  stripped = stripped.replace(
    /^i\s+(?:like|love|enjoy|prefer|usually|often|always|want|go|visit|travel|play|watch|listen\s+to|eat|use|work|talk|meet|study)\s+/i,
    ''
  )
  stripped = stripped.replace(/^i\s+/i, '')
  stripped = stripped.replace(/^(?:my|your|our|their)\s+/i, '')
  stripped = stripped.replace(/^favorite\s+(?:place|thing|food|song|movie|hobby)\s+(?:is\s+)?/i, '')
  stripped = stripped.trim()
  if (!stripped) return null
  if (
    /\b(?:am|is|are|was|were|be|been|being|have|has|had|will|would|do|does|did|can|could|should|must)\b/i.test(
      stripped
    )
  ) {
    return null
  }

  const words = stripped.split(/\s+/).filter(Boolean)
  const tail = words.slice(-2).join(' ')
  if (!tail) return null
  if (!/^[A-Za-zА-Яа-яЁё'-]+(?:\s+[A-Za-zА-Яа-яЁё'-]+){0,2}$/.test(tail)) return null
  if (
    /\b(?:this|that|today|yesterday|tomorrow|tonight|now|moment|week|month|year|day)\b/i.test(tail)
  ) {
    return null
  }

  const normalizedTail = tail.replace(/\b(?:most|more|best|better|least)\b\s*$/i, '').trim()
  if (!normalizedTail) return null

  // Не принимаем, если внутри сохранились типичные глаголы/слова из шаблона ответа.
  if (
    /\b(like|love|enjoy|prefer|usually|often|always|want|go|visit|travel|play|watch|listen|eat|use|work|talk|meet|study|do|does|did|been)\b/i.test(
      normalizedTail
    )
  ) {
    return null
  }

  return normalizedTail
}

function entityToPlaceNoun(entity: string): string {
  // Если пользователь ввёл common noun вроде "forest" (с маленькой буквы) — добавляем "the".
  // Для proper noun вроде "Turkey" — "the" не нужен.
  return /^[a-z]/.test(entity.trim()) ? `the ${entity.trim()}` : entity.trim()
}

function contextualizeTopicNextQuestionForLastAnswer(content: string, params: {
  topic: string
  tense: string
  audience: 'child' | 'adult'
  lastUserContent: string
  contextMessages?: ChatMessage[]
}): string {
  if (params.topic === 'free_talk') return content
  if (params.tense === 'all') return content

  const weightedEntities = new Map<string, { original: string; score: number }>()
  const addEntity = (entityText: string, score: number) => {
    const normalized = entityText.trim().toLowerCase()
    if (!normalized) return
    const existing = weightedEntities.get(normalized)
    if (existing) {
      existing.score += score
      return
    }
    weightedEntities.set(normalized, { original: entityText.trim(), score })
  }

  const lastEntity = extractLikelyEntityFromUserAnswer(params.lastUserContent)
  if (lastEntity) addEntity(lastEntity, 12)

  const contextUserMessages = (params.contextMessages ?? []).filter((m) => m.role === 'user').slice(-MAX_MESSAGES_IN_CONTEXT)
  const total = contextUserMessages.length
  for (let i = 0; i < total; i++) {
    const message = contextUserMessages[i]
    const entity = extractLikelyEntityFromUserAnswer(message?.content ?? '')
    if (!entity) continue
    const recencyBoost = Math.max(1, total - i)
    addEntity(entity, recencyBoost)
  }

  const entity = Array.from(weightedEntities.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.original)[0] ?? null
  if (!entity) return content
  const normalizedEntity = normalizeDialogueEntityForTopic(entity, params.topic)
  if (!normalizedEntity) return content

  const entityLower = normalizedEntity.toLowerCase()
  const obj =
    params.topic === 'travel' || params.topic === 'culture'
      ? entityToPlaceNoun(normalizedEntity)
      : normalizedEntity.trim()

  type Action = 'visit' | 'like' | 'play' | 'watch' | 'listen' | 'eat' | 'use' | 'do' | 'talk' | 'work'
  const actionForTopic = (t: string): Action => {
    if (t === 'travel') return 'visit'
    if (t === 'culture') return 'like'
    if (t === 'sports') return 'play'
    if (t === 'movies_series') return 'watch'
    if (t === 'music') return 'listen'
    if (t === 'food') return 'eat'
    if (t === 'technology') return 'use'
    if (t === 'hobbies' || t === 'daily_life') return 'do'
    if (t === 'family_friends') return 'talk'
    if (t === 'business' || t === 'work') return 'work'
    return 'do'
  }

  const action = actionForTopic(params.topic)
  if (action === 'do' && /^\s*[a-z]+ing\b/i.test(entity.trim())) {
    return content
  }

  const templatesByAction: Record<Action, Record<string, string>> = {
    visit: {
      present_simple: `Do you usually visit ${obj}?`,
      present_continuous: `Are you visiting ${obj} now?`,
      present_perfect: `Have you visited ${obj} recently?`,
      present_perfect_continuous: `Have you been visiting ${obj} for a while?`,
      past_simple: `Did you visit ${obj} yesterday?`,
      past_continuous: `Were you visiting ${obj} at this time yesterday?`,
      past_perfect: `Had you visited ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been visiting ${obj} for a long time before you stopped?`,
      future_simple: `Will you visit ${obj} next week?`,
      future_continuous: `Will you be visiting ${obj} this time tomorrow?`,
      future_perfect: `Will you have visited ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been visiting ${obj} for a while by the end of tomorrow?`,
    },
    like: {
      present_simple: `What do you like most about ${obj}?`,
      present_continuous: `What are you liking most about ${obj} these days?`,
      present_perfect: `What have you liked most about ${obj} recently?`,
      present_perfect_continuous: `What have you been liking most about ${obj} lately?`,
      past_simple: `What did you like most about ${obj}?`,
      past_continuous: `What were you liking most about ${obj} at that time?`,
      past_perfect: `What had you liked most about ${obj} before then?`,
      past_perfect_continuous: `What had you been liking most about ${obj} for a while before that?`,
      future_simple: `What will you like most about ${obj}?`,
      future_continuous: `What will you be liking most about ${obj} this time tomorrow?`,
      future_perfect: `What will you have liked most about ${obj} by then?`,
      future_perfect_continuous: `What will you have been liking most about ${obj} for a while by then?`,
    },
    play: {
      present_simple: `Do you usually play ${obj}?`,
      present_continuous: `Are you playing ${obj} now?`,
      present_perfect: `Have you played ${obj} recently?`,
      present_perfect_continuous: `Have you been playing ${obj} for a while?`,
      past_simple: `Did you play ${obj} yesterday?`,
      past_continuous: `Were you playing ${obj} at this time yesterday?`,
      past_perfect: `Had you played ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been playing ${obj} for a long time before you stopped?`,
      future_simple: `Will you play ${obj} next week?`,
      future_continuous: `Will you be playing ${obj} this time tomorrow?`,
      future_perfect: `Will you have played ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been playing ${obj} for a while by the end of tomorrow?`,
    },
    watch: {
      present_simple: `Do you usually watch ${obj}?`,
      present_continuous: `Are you watching ${obj} now?`,
      present_perfect: `Have you watched ${obj} recently?`,
      present_perfect_continuous: `Have you been watching ${obj} for a while?`,
      past_simple: `Did you watch ${obj} yesterday?`,
      past_continuous: `Were you watching ${obj} at this time yesterday?`,
      past_perfect: `Had you watched ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been watching ${obj} for a long time before you stopped?`,
      future_simple: `Will you watch ${obj} next week?`,
      future_continuous: `Will you be watching ${obj} this time tomorrow?`,
      future_perfect: `Will you have watched ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been watching ${obj} for a while by the end of tomorrow?`,
    },
    listen: {
      present_simple: `Do you usually listen to ${obj}?`,
      present_continuous: `Are you listening to ${obj} now?`,
      present_perfect: `Have you listened to ${obj} recently?`,
      present_perfect_continuous: `Have you been listening to ${obj} for a while?`,
      past_simple: `Did you listen to ${obj} yesterday?`,
      past_continuous: `Were you listening to ${obj} at this time yesterday?`,
      past_perfect: `Had you listened to ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been listening to ${obj} for a long time before you stopped?`,
      future_simple: `Will you listen to ${obj} next week?`,
      future_continuous: `Will you be listening to ${obj} this time tomorrow?`,
      future_perfect: `Will you have listened to ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been listening to ${obj} for a while by the end of tomorrow?`,
    },
    eat: {
      present_simple: `Do you usually eat ${obj}?`,
      present_continuous: `Are you eating ${obj} now?`,
      present_perfect: `Have you eaten ${obj} recently?`,
      present_perfect_continuous: `Have you been eating ${obj} for a while?`,
      past_simple: `Did you eat ${obj} yesterday?`,
      past_continuous: `Were you eating ${obj} at this time yesterday?`,
      past_perfect: `Had you eaten ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been eating ${obj} for a long time before you stopped?`,
      future_simple: `Will you eat ${obj} next week?`,
      future_continuous: `Will you be eating ${obj} this time tomorrow?`,
      future_perfect: `Will you have eaten ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been eating ${obj} for a while by the end of tomorrow?`,
    },
    use: {
      present_simple: `Do you usually use ${obj}?`,
      present_continuous: `Are you using ${obj} now?`,
      present_perfect: `Have you used ${obj} recently?`,
      present_perfect_continuous: `Have you been using ${obj} for a while?`,
      past_simple: `Did you use ${obj} yesterday?`,
      past_continuous: `Were you using ${obj} at this time yesterday?`,
      past_perfect: `Had you used ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been using ${obj} for a long time before you stopped?`,
      future_simple: `Will you use ${obj} next week?`,
      future_continuous: `Will you be using ${obj} this time tomorrow?`,
      future_perfect: `Will you have used ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been using ${obj} for a while by the end of tomorrow?`,
    },
    do: {
      present_simple: `Do you usually do ${obj}?`,
      present_continuous: `Are you doing ${obj} now?`,
      present_perfect: `Have you done ${obj} recently?`,
      present_perfect_continuous: `Have you been doing ${obj} for a while?`,
      past_simple: `Did you do ${obj} yesterday?`,
      past_continuous: `Were you doing ${obj} at this time yesterday?`,
      past_perfect: `Had you done ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been doing ${obj} for a long time before you stopped?`,
      future_simple: `Will you do ${obj} next week?`,
      future_continuous: `Will you be doing ${obj} this time tomorrow?`,
      future_perfect: `Will you have done ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been doing ${obj} for a while by the end of tomorrow?`,
    },
    talk: {
      present_simple: `Do you usually talk to ${obj}?`,
      present_continuous: `Are you talking to ${obj} now?`,
      present_perfect: `Have you talked to ${obj} recently?`,
      present_perfect_continuous: `Have you been talking to ${obj} for a while?`,
      past_simple: `Did you talk to ${obj} yesterday?`,
      past_continuous: `Were you talking to ${obj} at this time yesterday?`,
      past_perfect: `Had you talked to ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been talking to ${obj} for a long time before you stopped?`,
      future_simple: `Will you talk to ${obj} next week?`,
      future_continuous: `Will you be talking to ${obj} this time tomorrow?`,
      future_perfect: `Will you have talked to ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been talking to ${obj} for a while by the end of tomorrow?`,
    },
    work: {
      present_simple: `Do you usually work on ${obj}?`,
      present_continuous: `Are you working on ${obj} now?`,
      present_perfect: `Have you worked on ${obj} recently?`,
      present_perfect_continuous: `Have you been working on ${obj} for a while?`,
      past_simple: `Did you work on ${obj} yesterday?`,
      past_continuous: `Were you working on ${obj} at this time yesterday?`,
      past_perfect: `Had you worked on ${obj} before you went to bed yesterday?`,
      past_perfect_continuous: `Had you been working on ${obj} for a long time before you stopped?`,
      future_simple: `Will you work on ${obj} next week?`,
      future_continuous: `Will you be working on ${obj} this time tomorrow?`,
      future_perfect: `Will you have worked on ${obj} by this time tomorrow?`,
      future_perfect_continuous: `Will you have been working on ${obj} for a while by the end of tomorrow?`,
    },
  }

  const replacement = templatesByAction[action]?.[params.tense]
  if (!replacement) return content
  if (
    /\bthis\s+time\s+yesterday\b.*\bthis\s+time\s+yesterday\b/i.test(replacement) ||
    /\bnow\b.*\bnow\b/i.test(replacement) ||
    /\b(?:are|were)\s+you\s+doing\s+[a-z]+ing\b/i.test(replacement)
  ) {
    return content
  }

  const lines = content.split(/\r?\n/)
  let qIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? ''
    const s = line.trim()
    if (s.endsWith('?') && /[A-Za-z]/.test(s)) {
      qIdx = i
      break
    }
  }
  if (qIdx === -1) return content

  const questionLine = lines[qIdx] ?? ''
  const lastAssistantQuestion = extractLastAssistantQuestionSentence(params.contextMessages ?? [])
  const buildOpenVariants = (): string[] => {
    if (params.tense === 'present_simple') {
      switch (action) {
        case 'watch':
          return params.audience === 'child'
            ? [`Why do you like watching ${obj}?`, `Who do you usually watch ${obj} with?`]
            : [`Why do you usually choose ${obj}?`, `What do you value most when watching ${obj}?`]
        case 'play':
          return params.audience === 'child'
            ? [`Why do you like playing ${obj}?`, `Who do you usually play ${obj} with?`]
            : [`What motivates you to play ${obj} regularly?`, `How does ${obj} affect your mood?`]
        case 'listen':
          return params.audience === 'child'
            ? [`What song about ${obj} do you like most?`, `When do you like listening to ${obj}?`]
            : [`What do you usually look for in ${obj}?`, `Why does ${obj} work for you right now?`]
        case 'eat':
          return params.audience === 'child'
            ? [`Why do you like eating ${obj}?`, `Who do you usually eat ${obj} with?`]
            : [`What makes ${obj} your choice most days?`, `How does ${obj} fit your routine?`]
        case 'visit':
          return params.audience === 'child'
            ? [`Why do you want to visit ${obj}?`, `Who do you want to visit ${obj} with?`]
            : [`What attracts you to ${obj} most?`, `How would you plan a visit to ${obj}?`]
        case 'use':
          return params.audience === 'child'
            ? [`Why do you like using ${obj}?`, `What do you use ${obj} for most?`]
            : [`What is the main benefit of ${obj} for you?`, `How often do you rely on ${obj}?`]
        case 'do':
          return params.audience === 'child'
            ? [`Why do you like ${obj}?`, `Who do you do ${obj} with?`]
            : [`What part of ${obj} is most interesting for you?`, `How does ${obj} help your day?`]
        case 'talk':
          return params.audience === 'child'
            ? [`What do you like talking to ${obj} about?`, `When do you talk to ${obj} most?`]
            : [`What topics do you usually discuss with ${obj}?`, `Why are those talks important to you?`]
        case 'work':
          return params.audience === 'child'
            ? [`What do you like doing when you work on ${obj}?`, `Who helps you with ${obj}?`]
            : [`What outcome do you want from working on ${obj}?`, `What is the hardest part of ${obj}?`]
        case 'like':
          return params.audience === 'child'
            ? [`Why do you like ${obj}?`, `What do you like most about ${obj}?`]
            : [`Why does ${obj} matter to you?`, `What is most meaningful to you in ${obj}?`]
      }
    }
    if (params.tense === 'future_simple') {
      switch (action) {
        case 'watch':
          return [`What do you want to watch next week?`, `Who will you watch ${obj} with next week?`]
        case 'play':
          return [`Who will you play ${obj} with next week?`, `Why will you choose ${obj} next week?`]
        case 'listen':
          return [`What will you listen to with ${obj} next week?`, `When will you listen to ${obj}?`]
        case 'eat':
          return [`When will you eat ${obj} next week?`, `Who will you eat ${obj} with next week?`]
        case 'visit':
          return [`Who will you visit ${obj} with next week?`, `What will you do when you visit ${obj}?`]
        case 'use':
          return [`How will you use ${obj} next week?`, `Why will you use ${obj} next week?`]
        case 'do':
          return [`How will you do ${obj} next week?`, `Who will you do ${obj} with next week?`]
        case 'talk':
          return [`What will you talk to ${obj} about next week?`, `Why will you talk to ${obj} next week?`]
        case 'work':
          return [`What will you work on in ${obj} next week?`, `Why will you focus on ${obj} next week?`]
        case 'like':
          return [`What will you like most about ${obj} next week?`, `Why will ${obj} be important for you next week?`]
      }
    }
    return []
  }

  const candidates = [replacement, ...buildOpenVariants()]
  const nextQuestion =
    candidates.find((candidate) => {
      if (!candidate) return false
      if (questionLine.toLowerCase().includes(entityLower) && isNearDuplicateQuestion(questionLine, candidate)) {
        return false
      }
      return !isNearDuplicateQuestion(lastAssistantQuestion, candidate)
    }) ?? replacement

  lines[qIdx] = nextQuestion
  return lines.join('\n').trim()
}

function alignDialogueArticleCommentWithRepeat(params: {
  content: string
  userText: string
  audience: 'child' | 'adult'
  level: string
}): string {
  const { content, userText, audience, level } = params
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  const repeatLine = lines.find((line) => /^(?:\s*)(Повтори|Repeat|Say)\s*:/i.test(line.trim()))
  if (commentIndex === -1 || !repeatLine) return content

  const commentText = lines[commentIndex].replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!commentText) return content
  const saysMissingArticle = /(не\s*хвата\w*\s+артикл|нужен\s+артикл|добав(ь|ить)\s+артикл)/i.test(commentText)
  const saysExtraArticle = /(лишн\w*\s+артикл|артикл\w*\s+не\s+нужен|убра(ть|л)\s+артикл)/i.test(commentText)
  if (!saysMissingArticle && !saysExtraArticle) return content

  const repeatText = repeatLine.replace(/^(?:\s*)(Повтори|Repeat|Say)\s*:\s*/i, '').trim()
  if (!repeatText) return content
  const userLower = userText.toLowerCase()
  const repeatLower = repeatText.toLowerCase()
  const tokens = Array.from(new Set(tokenizeEnglishWords(repeatText).filter((t) => t.length >= 3)))

  let removedArticleToken: string | null = null
  let addedArticleToken: string | null = null
  let addedArticle: string | null = null

  for (const token of tokens) {
    const escaped = escapeRegExp(token)
    const articleBeforeTokenInUser = new RegExp(`\\b(a|an|the)\\s+${escaped}\\b`, 'i').test(userLower)
    const articleMatchInRepeat = new RegExp(`\\b(a|an|the)\\s+${escaped}\\b`, 'i').exec(repeatLower)
    const articleBeforeTokenInRepeat = Boolean(articleMatchInRepeat)

    if (articleBeforeTokenInUser && !articleBeforeTokenInRepeat && !removedArticleToken) {
      removedArticleToken = token
    }
    if (!articleBeforeTokenInUser && articleBeforeTokenInRepeat && !addedArticleToken) {
      addedArticleToken = token
      addedArticle = articleMatchInRepeat?.[1] ?? null
    }
  }

  const soft = isSoftCommentTone(audience, level)
  if (removedArticleToken && saysMissingArticle) {
    lines[commentIndex] = soft
      ? `Комментарий: Перед ${removedArticleToken} артикль не нужен.`
      : `Комментарий: Ошибка артикля: перед ${removedArticleToken} артикль не нужен.`
    return lines.join('\n')
  }
  if (addedArticleToken && saysExtraArticle) {
    const articleHint = addedArticle ? ` ${addedArticle}` : ''
    lines[commentIndex] = soft
      ? `Комментарий: Перед ${addedArticleToken} нужно поставить артикль${articleHint}.`
      : `Комментарий: Ошибка артикля: перед ${addedArticleToken} нужен артикль${articleHint}.`
    return lines.join('\n')
  }

  return content
}

function isEnglishQuestionLine(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  if (!/\?\s*$/.test(s)) return false
  // Линия должна быть на английском (латиница); допускаем цифры/пунктуацию.
  return /[A-Za-z]/.test(s)
}

function stripLeadingAiPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

function hasLeakMarkers(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return INSTRUCTION_LEAK_PATTERNS.some((p) => p.test(t))
}

function hasRobotPhrasing(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return /\brelated to\b|\bwhen it comes to\b|\bin terms of\b|\bregarding\b/i.test(t)
}

function isValidTutorOutput(params: {
  content: string
  mode: string
  isFirstTurn: boolean
  isTopicChoiceTurn?: boolean
  requiredTense?: string
  /** Предыдущее сообщение ассистента (вопрос), для проверки «Повтори» при requiredTense === 'all'. */
  priorAssistantContent?: string | null
  /** free_talk: следующий вопрос после похвалы должен быть в этом времени (не в requiredTense). */
  expectedNextQuestionTense?: string | null
  /** Незакрытая фраза «Повтори» из предыдущего хода. Если задана и ответ её не снимает — ответ ИИ обязан содержать «Повтори:». */
  forcedRepeatSentence?: string | null
  /** Последний текст пользователя — используется для проверки, снял ли он незакрытый «Повтори». */
  lastUserText?: string
}): boolean {
  const { content, mode, isFirstTurn, isTopicChoiceTurn, requiredTense, priorAssistantContent, expectedNextQuestionTense, forcedRepeatSentence, lastUserText } =
    params
  if (mode !== 'dialogue') return true

  const raw = content.trim()
  if (!raw) return false
  if (hasLeakMarkers(raw)) return false
  if (hasRobotPhrasing(raw)) return false

  const lines = raw
    .split(/\r?\n/)
    .map((l) => stripLeadingAiPrefix(l))
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return false
  if (lines.some((l) => hasLeakMarkers(l))) return false
  if (lines.some((l) => hasRobotPhrasing(l))) return false
  if (
    !isDialogueOutputLikelyInRequiredTense({
      content: raw,
      requiredTense,
      priorAssistantContent,
      expectedNextQuestionTense,
    })
  ) {
    return false
  }

  const hasComment = lines.some((l) => /^Комментарий\s*:/i.test(l))
  const hasRepeat = lines.some((l) => /^(Повтори|Repeat|Say)\s*:/i.test(l))

  // Если есть незакрытое «Повтори» из предыдущего хода и ответ пользователя его не снял —
  // ответ ИИ обязан содержать «Повтори:». Без этого триггерим repair.
  if (
    !isFirstTurn &&
    !isTopicChoiceTurn &&
    forcedRepeatSentence &&
    lastUserText &&
    !isDialogueAnswerEffectivelyCorrect(lastUserText, forcedRepeatSentence, requiredTense ?? 'present_simple') &&
    !hasRepeat
  ) {
    return false
  }

  // Первый ход диалога: только один вопрос (без Комментарий/Повтори).
  if (isFirstTurn) {
    if (hasComment || hasRepeat) return false
    if (lines.length !== 1) return false
    return isEnglishQuestionLine(lines[0] ?? '')
  }

  // Свободная тема, первый ответ пользователя (выбор темы): только один вопрос.
  if (isTopicChoiceTurn) {
    if (hasComment || hasRepeat) return false
    if (lines.length !== 1) return false
    return isEnglishQuestionLine(lines[0] ?? '')
  }

  // Ошибка пользователя: строго 2 строки (Комментарий + Повтори), без вопроса.
  if (hasRepeat) {
    if (lines.length !== 2) return false
    const c = lines[0] ?? ''
    const r = lines[1] ?? ''
    if (!/^Комментарий\s*:/i.test(c)) return false
    if (!/^(Повтори|Repeat|Say)\s*:/i.test(r)) return false
    // В Повтори должен быть английский текст.
    const after = r.replace(/^(Повтори|Repeat|Say)\s*:\s*/i, '')
    return /[A-Za-z]/.test(after)
  }

  // Комментарий без Повтори: допустим только если ответ пользователя по времени верен.
  // Если время неверно — ИИ обязан выдать Повтори, а не переходить к следующему вопросу.
  // В режиме requiredTense === 'all' ориентируемся на время предыдущего вопроса ассистента.
  if (hasComment && !hasRepeat) {
    const effectiveRequiredTense =
      requiredTense === 'all'
        ? (priorAssistantContent ? inferTenseFromDialogueAssistantContent(priorAssistantContent) : null)
        : (requiredTense ?? null)
    if (
      effectiveRequiredTense &&
      lastUserText &&
      !isFirstTurn &&
      !isTopicChoiceTurn &&
      !isUserLikelyCorrectForTense(lastUserText, effectiveRequiredTense)
    ) {
      return false
    }
  }

  // Корректный ответ: Комментарий + следующий вопрос.
  if (hasComment) {
    // Поддерживаем 2 формата:
    // - 2 строки: Комментарий + вопрос
    // - 3 строки: Комментарий + Возможный вариант + вопрос (модель иногда выносит вариант на отдельную строку)
    if (lines.length !== 2 && lines.length !== 3) return false
    const c = lines[0] ?? ''
    if (!/^Комментарий\s*:/i.test(c)) return false

    if (lines.length === 2) {
      const q = lines[1] ?? ''
      return isEnglishQuestionLine(q)
    }

    const v = lines[1] ?? ''
    const q = lines[2] ?? ''
    if (!/^\*?\s*Возможный\s+вариант\s*:/i.test(v)) return false
    return isEnglishQuestionLine(q)
  }

  // Обычный ход (если модель вдруг не дала Комментарий): допускаем один вопрос.
  if (lines.length === 1) return isEnglishQuestionLine(lines[0] ?? '')
  return false
}

/**
 * Убирает ведущий "AI:"/"Assistant:" у служебных строк (Комментарий/Повтори),
 * чтобы UI и дальнейшие фильтры работали одинаково.
 */
function normalizeAssistantPrefixForControlLines(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return content
  const lines = trimmed.split(/\r?\n/)
  const out = lines.map((line) => {
    const stripped = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '')
    const normalized = stripped.trim()
    if (/^(Комментарий|Повтори|Repeat|Say)\s*:/i.test(normalized)) return normalized
    return line
  })
  return out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

/**
 * Модель иногда склеивает "Комментарий:" и "Повтори:" в одну строку.
 * Для UI это плохо (теряется структура), поэтому разносит их на 2 строки.
 */
function splitCommentAndRepeatSameLine(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return content
  const lines = trimmed.split(/\r?\n/)
  const out: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    // уже нормализованные префиксы AI:/Assistant: могли быть сняты выше,
    // но на всякий случай снимаем их и тут.
    const noPrefix = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()

    const hasComment = /^\s*Комментарий\s*:/i.test(noPrefix)
    if (!hasComment) {
      out.push(rawLine)
      continue
    }

    const idxRepeat = noPrefix.search(/\b(Повтори|Repeat|Say)\s*:/i)
    if (idxRepeat === -1) {
      out.push(noPrefix)
      continue
    }

    // "Комментарий: ... Повтори: ..." -> 2 строки
    const commentPart = noPrefix.slice(0, idxRepeat).trimEnd().replace(/\s+[—–-]\s*$/g, '').trimEnd()
    const repeatPart = noPrefix.slice(idxRepeat).trimStart()
    out.push(commentPart)
    out.push(repeatPart)
  }

  return out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

/**
 * Если модель в "Комментарий:" просит пояснить (непонятно / объясни),
 * то "Повтори:" быть не должно: UI использует "Повтори" только для корректировок,
 * а здесь нужен обычный следующий вопрос.
 *
 * Превращаем:
 * - "Комментарий: Непонятно... Объясни."
 * - "Повтори: What ...?"
 * в:
 * - "Комментарий: Непонятно... Объясни."
 * - "What ...?"
 */
function stripRepeatWhenAskingToExplain(content: string): string {
  const rawLines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const commentLines = rawLines.filter((l) => /^Комментарий\s*:/i.test(l))
  const repeatLines = rawLines.filter((l) => /^(Повтори|Repeat|Say)\s*:/i.test(l))
  const otherLines = rawLines.filter((l) => !commentLines.includes(l) && !repeatLines.includes(l))

  if (commentLines.length !== 1 || repeatLines.length !== 1 || otherLines.length !== 0) return content

  const commentText = commentLines[0].replace(/^Комментарий\s*:\s*/i, '')
  const asksExplain = /\b(Непонятно|непонятно|Не понимаю|не понимаю|Не понял|не понял|Поясни|объясни|объясните|имеешь\s+в\s+виду)\b/i.test(
    commentText
  )

  if (!asksExplain) return content

  const m = /^(?:Повтори|Repeat|Say)\s*:\s*(.+)$/i.exec(repeatLines[0])
  const question = m?.[1]?.trim() ?? ''
  const looksLikeQuestion = /[A-Za-z]/.test(question) && /\?\s*$/.test(question)
  if (!looksLikeQuestion) return content

  return `${commentLines[0]}\n${question}`
}

function normalizeVariantFormatting(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return content

  const lines = trimmed.split(/\r?\n/)
  const out: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Не трогаем служебные строки коррекции.
    if (/^\s*(Повтори|Repeat|Say)\s*:/i.test(line)) {
      out.push(rawLine)
      continue
    }

    // Отдельная строка варианта:
    // "Вариант: ..." или "Возможный вариант: ..." -> "Возможный вариант: ..."
    const separate = /^\s*(?:\*+\s*)?(Вариант|Возможный\s+вариант)\s*:\s*(.+?)(?:\s*\*+)?\s*$/i.exec(line)
    if (separate?.[2]) {
      const text = separate[2].trim()
      out.push(`Возможный вариант: ${text}`)
      continue
    }

    // Вариант внутри строки Комментария:
    // "Комментарий: ... Вариант: ..." -> "Комментарий: ... Возможный вариант: ..."
    if (/^\s*Комментарий\s*:/i.test(line) && /\bВариант\s*:/i.test(line)) {
      const replaced = rawLine.replace(/\*+\s*/g, '').replace(/\bВариант\s*:\s*/i, 'Возможный вариант: ')
      out.push(replaced.trim())
      continue
    }

    // "Комментарий: ... Возможный вариант: ..." -> оставляем без Markdown.
    if (
      /^\s*Комментарий\s*:/i.test(line) &&
      /\bВозможный\s+вариант\s*:/i.test(line) &&
      !/\*Возможный\s+вариант\s*:/i.test(line)
    ) {
      const replaced = rawLine.replace(/\*+\s*/g, '').replace(/\bВозможный\s+вариант\s*:\s*/i, 'Возможный вариант: ')
      out.push(replaced.trim())
      continue
    }

    out.push(rawLine)
  }

  return out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

/**
 * Гарантированно убирает "Правильно:" из ответа модели.
 * - "Правильно: X" -> "Повтори: X"
 * - "AI: Правильно: X" -> "Повтори: X"
 * - Если уже есть "Повтори:" с таким же текстом, строку "Правильно:" удаляем как дубль.
 */
function stripPravilnoEverywhere(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return content

  const lines = trimmed.split(/\r?\n/)
  const repeatTexts = new Set<string>()

  for (const line of lines) {
    const normalized = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const mRepeat = /^\s*(?:Повтори|Repeat|Say)\s*:\s*(.+)$/i.exec(normalized)
    if (mRepeat?.[1]) {
      repeatTexts.add(mRepeat[1].trim())
    }
  }

  const out: string[] = []
  for (const line of lines) {
    const normalized = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const mPrav = /^\s*Правильно\s*:\s*(.+)$/i.exec(normalized)
    if (mPrav?.[1]) {
      const text = mPrav[1].trim()
      if (repeatTexts.has(text)) continue
      out.push(`Повтори: ${text}`)
      continue
    }
    out.push(line)
  }

  return out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^\s*\n+|\n+\s*$/g, '').trim()
}

function normalizeKey(key: string): string {
  const k = key.trim()
  if (k.toLowerCase().startsWith('bearer ')) return k.slice(7).trim()
  return k
}

type Provider = 'openrouter' | 'openai'

function ensureSentence(text: string): string {
  const t = text.trim()
  if (!t) return ''
  return /[.!?]$/.test(t) ? t : `${t}.`
}

function inferCommentErrorType(raw: string): string {
  const s = raw.toLowerCase()
  if (/(врем|tense|present|past|future)/i.test(s)) return 'Ошибка времени.'
  if (/(согласован|agree|subject|подлежащ|has\b|have\b|does\b|do\b)/i.test(s)) {
    return 'Ошибка согласования подлежащего и сказуемого.'
  }
  if (/(форм[аы]\s+глагол|verb form|v1|v2|v3|неверн\w*\s+форм\w*\s+глагол)/i.test(s)) {
    return 'Ошибка формы глагола.'
  }
  // Важно: матчим и "лексическая ошибка", и случаи где модель пишет "Лексическая ..." с разной пунктуацией.
  if (/(лексическ|лексик|word choice|не то слово|неподходящее слово|словар)/i.test(s)) return 'Лексическая ошибка.'
  if (/(артикл|a\/an| a | an | the )/i.test(s)) return 'Ошибка употребления артикля.'
  if (/(предлог|preposition)/i.test(s)) return 'Ошибка в выборе предлога.'
  if (/(порядок слов|word order)/i.test(s)) return 'Ошибка порядка слов.'
  return 'Грамматическая ошибка.'
}

function normalizeTranslationCommentStyle(content: string): string {
  const lines = content.split(/\r?\n/)
  const out = lines.map((line) => {
    const m = /^\s*Комментарий\s*:\s*(.+)$/i.exec(line.trim())
    if (!m?.[1]) return line

    const raw = m[1]
      .replace(/\bagreeing\b/gi, 'согласовании')
      .replace(/\bagreement\b/gi, 'согласовании')
      .replace(/\s+/g, ' ')
      .trim()
    // Важно: не "схлопываем" комментарий ИИ до одной категории.
    // Просто нормализуем известные слова и пробелы, сохраняя все ошибки, которые модель указала.
    return `Комментарий: ${raw}`
  })
  return out.join('\n')
}

function translationConstructionHint(tense: string): string {
  switch (tense) {
    case 'present_simple':
      return 'Subject + V1(s/es).'
    case 'present_continuous':
      return 'Subject + am/is/are + V-ing.'
    case 'present_perfect':
      return 'Subject + have/has + V3.'
    case 'present_perfect_continuous':
      return 'Subject + have/has been + V-ing.'
    case 'past_simple':
      return 'Subject + V2.'
    case 'past_continuous':
      return 'Subject + was/were + V-ing.'
    case 'past_perfect':
      return 'Subject + had + V3.'
    case 'past_perfect_continuous':
      return 'Subject + had been + V-ing.'
    case 'future_simple':
      return 'Subject + will + V1.'
    case 'future_continuous':
      return 'Subject + will be + V-ing.'
    case 'future_perfect':
      return 'Subject + will have + V3.'
    case 'future_perfect_continuous':
      return 'Subject + will have been + V-ing.'
    default:
      return 'Subject + Verb + Object.'
  }
}

/** Примеры для блока "Конструкция" (сокращаем подсказку до примеров). */
const CONSTRUCTION_EXAMPLES_BY_TENSE: Record<string, string> = {
  present_simple: [
    'Примеры:',
    'I like interesting books.',
    'We read at the library.',
    'I usually read on Sundays.',
    'I read every morning.',
  ].join('\n'),
  present_continuous: [
    'Примеры:',
    'I am reading an interesting book.',
    'We are reading at the library.',
    'I am usually reading on Sundays.',
    'I am reading every morning.',
  ].join('\n'),
  present_perfect: [
    'Примеры:',
    'I have read an interesting book.',
    'We have read at the library.',
    'I have usually read on Sundays.',
    'I have read every morning.',
  ].join('\n'),
  present_perfect_continuous: [
    'Примеры:',
    'I have been reading an interesting book.',
    'We have been reading at the library.',
    'I have usually been reading on Sundays.',
    'I have been reading every morning.',
  ].join('\n'),
  past_simple: [
    'Примеры:',
    'I read an interesting book.',
    'We read at the library.',
    'I usually read on Sundays.',
    'I read every morning.',
  ].join('\n'),
  past_continuous: [
    'Примеры:',
    'I was reading an interesting book.',
    'We were reading at the library.',
    'I was usually reading on Sundays.',
    'I was reading every morning.',
  ].join('\n'),
  past_perfect: [
    'Примеры:',
    'I had read an interesting book.',
    'We had read at the library.',
    'I had usually read on Sundays.',
    'I had read every morning.',
  ].join('\n'),
  past_perfect_continuous: [
    'Примеры:',
    'I had been reading an interesting book.',
    'We had been reading at the library.',
    'I had usually been reading on Sundays.',
    'I had been reading every morning.',
  ].join('\n'),
  future_simple: [
    'Примеры:',
    'I will read an interesting book.',
    'We will read at the library.',
    'I will usually read on Sundays.',
    'I will read every morning.',
  ].join('\n'),
  future_continuous: [
    'Примеры:',
    'I will be reading an interesting book.',
    'We will be reading at the library.',
    'I will be reading on Sundays.',
    'I will be reading every morning.',
  ].join('\n'),
  future_perfect: [
    'Примеры:',
    'I will have read an interesting book.',
    'We will have read at the library.',
    'I will have often read on Sundays.',
    'I will have read every morning.',
  ].join('\n'),
  future_perfect_continuous: [
    'Примеры:',
    'I will have been reading an interesting book.',
    'We will have been reading at the library.',
    'I will have been reading on Sundays.',
    'I will have been reading every morning.',
  ].join('\n'),
}

function buildTranslationConstructionCoachText(tense: string, repeatSentence: string): string {
  const example = repeatSentence.trim()
  const preset = CONSTRUCTION_EXAMPLES_BY_TENSE[tense]
  if (preset) return preset

  // Универсальный fallback: если времени нет в словаре (например, `all`),
  // сохраняем формат "Примеры:" и добавляем пример пользователя.
  return ['Примеры:', example].filter(Boolean).join('\n')
}

function replaceTranslationConstructionLine(content: string, coachText: string): string {
  const lines = content.split(/\r?\n/)
  let changed = false
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Конструкция\s*:/i.test(lines[i])) {
      lines[i] = `Конструкция: ${coachText}`
      changed = true
    }
  }
  return changed ? lines.join('\n') : content
}

function translationTimeHint(tense: string): string {
  const tenseName = TENSE_NAMES[tense] ?? 'Present Simple'
  if (tense === 'all') return 'Any tense. Выберите одно время и соблюдайте его в ответе.'
  return `${tenseName}. Используйте это время в полном английском предложении.`
}

function isLowSignalTranslationInput(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  const letters = t.match(/[A-Za-zА-Яа-яЁё]/g)?.length ?? 0
  if (letters < 3) return true
  const hasLatin = /[A-Za-z]/.test(t)
  const words = t.split(/\s+/).filter(Boolean)
  // Для перевода ожидаем английское предложение; короткий/неанглийский шум считаем невалидным.
  if (!hasLatin && words.length <= 2) return true
  if (hasLatin && words.length === 1 && t.length < 5) return true
  // Простая эвристика для "ааа", "вавы", "zzz" и т.п.
  if (/^(.)\1{2,}$/i.test(t.replace(/\s+/g, ''))) return true
  return false
}

function isLowSignalDialogueInput(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  const compact = t.replace(/\s+/g, '')
  const letters = compact.match(/[A-Za-zА-Яа-яЁё]/g)?.length ?? 0
  const words = t.split(/\s+/).filter(Boolean)
  const normalized = t.toLowerCase()
  const allowedShortAnswers = new Set(['yes', 'no', 'ok', 'okay', 'yeah', 'yep', 'nope', 'sure', 'nah', 'hi', 'hello'])

  if (/^(?:a|as|asd|asdf|sdf|sdfsdf|qwerty|zxcv|hjkl|fdsa)+$/i.test(compact)) return true
  if (/^(.)\1{3,}$/i.test(compact)) return true
  if (/^[^A-Za-zА-Яа-яЁё]+$/.test(t)) return true
  if (words.length === 1 && allowedShortAnswers.has(normalized)) return false

  // Слишком короткие или очевидно шумовые ответы.
  if (letters < 3) return true

  // Один длинный "сухой" токен без гласных обычно означает шум вроде sdfsdf / qwrty.
  if (words.length === 1) {
    const word = normalized.replace(/[^a-z']/g, '')
    if (word.length >= 4 && !/[aeiouy]/.test(word)) return true
    // Важно: это правило только для латиницы; для чисто русских токенов
    // (например "ужасы") не считаем ввод шумом автоматически.
    if (word.length > 0 && word.length <= 2) return true
  }

  // Длинная строка из почти одних согласных без явного смысла часто бывает мусором.
  const alphaOnly = normalized.replace(/[^a-z\s]/g, ' ')
  const tokens = alphaOnly.split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    const word = tokens[0]
    const vowels = (word.match(/[aeiouy]/g)?.length ?? 0)
    const consonants = (word.match(/[bcdfghjklmnpqrstvwxz]/g)?.length ?? 0)
    if (word.length >= 4 && vowels === 0 && consonants >= 3) return true
  }

  return false
}

function buildTranslationRetryFallback(params: { tense: string; includeRepeat: boolean }): string {
  const { tense, includeRepeat } = params
  void tense
  void includeRepeat
  const lines = [
    'Комментарий: Некорректный ввод. Введите полное предложение на английском языке.',
  ]
  return lines.join('\n')
}

function extractLastTranslationPrompt(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    const lines = msg.content
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
      .filter(Boolean)
    for (const rawLine of lines) {
      if (/^Комментарий\s*:/i.test(rawLine)) continue
      if (/^Время\s*:/i.test(rawLine)) continue
      if (/^Конструкция\s*:/i.test(rawLine)) continue
      if (/^(Повтори|Repeat|Say)\s*:/i.test(rawLine)) continue
      if (/^(?:Переведи|Переведите)\b/i.test(rawLine)) continue
      const stripped = rawLine
        .replace(/\s+(?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.\s*$/i, '')
        .replace(/^\d+\)\s*/i, '')
        .trim()
      if (/[А-Яа-яЁё]/.test(stripped) && stripped.length > 2) return stripped
    }
  }
  return null
}

function ensureTranslationProtocolBlocks(
  content: string,
  params: { tense: string; topic: string; level: string; audience: 'child' | 'adult'; fallbackPrompt: string | null }
): string {
  const { tense, topic, level, audience, fallbackPrompt } = params
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  let comment: string | null = null
  let timeLine: string | null = null
  let construction: string | null = null
  let repeat: string | null = null
  let hasPraise = false
  let hasInvitation = false
  const nextSentenceLines: string[] = []
  let collectingConstruction = false

  for (const line of lines) {
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(line)) {
      const c = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:\s*/i, '').trim()
      comment = `Комментарий: ${c}`
      hasPraise = /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b/i.test(c)
      collectingConstruction = false
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:/i.test(line)) {
      timeLine = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:\s*/i, 'Время: ').trim()
      collectingConstruction = false
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:/i.test(line)) {
      construction = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:\s*/i, 'Конструкция: ').trim()
      collectingConstruction = true
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:/i.test(line)) {
      repeat = line.replace(
        /^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:\s*/i,
        'Повтори: '
      ).trim()
      collectingConstruction = false
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(?:Переведи|Переведите)\b/i.test(line)) {
      hasInvitation = true
      collectingConstruction = false
      continue
    }
    const inlineInvitation = /(.*?)(?:\s+(?:\d+\)\s*)?((?:Переведи|Переведите)[^.]*\.)\s*)$/i.exec(line)
    if (inlineInvitation?.[1]) {
      const before = inlineInvitation[1].trim()
      hasInvitation = true
      if (before) nextSentenceLines.push(before)
      collectingConstruction = false
      continue
    }

    if (collectingConstruction && construction) {
      // Подхватываем многострочные варианты "Конструкция: ...", чтобы примеры не терялись.
      construction = `${construction}\n${line}`
      continue
    }

    // Для translation не пропускаем "диалоговые" реплики.
    if (/\?\s*$/.test(line) && /[A-Za-z]/.test(line)) continue
    nextSentenceLines.push(line)
  }

  if (!comment) {
    comment = 'Комментарий: Грамматическая ошибка. Исправьте ответ по образцу в блоке «Повтори».'
  }
  if (!timeLine || /^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:\s*[-–—]\s*$/i.test(timeLine)) {
    timeLine = `Время: ${translationTimeHint(tense)}`
  }
  if (
    !construction ||
    /^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:\s*[-–—]\s*$/i.test(construction)
  ) {
    construction = `Конструкция: ${translationConstructionHint(tense)}`
  }
  if (
    !hasPraise &&
    (!repeat || /^[\s\-•]*(?:\d+[\.)]\s*)*Повтори\s*:\s*[-–—]\s*$/i.test(repeat))
  ) {
    repeat = 'Повтори: Write one complete English sentence for the same Russian phrase.'
  }

  const out = [comment, timeLine, construction]
  if (repeat) out.push(repeat)
  if (nextSentenceLines.length > 0) {
    out.push(nextSentenceLines.join(' '))
    if (!hasInvitation) out.push('Переведи на английский.')
  } else {
    out.push(
      fallbackTranslationSentenceForContext({
        topic,
        tense,
        level,
        audience,
        seedText: fallbackPrompt,
      })
    )
    out.push('Переведи на английский.')
  }
  return out.join('\n').trim()
}

function ensureFirstTranslationInvitation(content: string): string {
  const cleanedLines = content
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*(?:ai|assistant)\s*:\s*/i, '')
        .replace(/\s*(?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)

  if (cleanedLines.length === 0) return 'Переведи на английский.'
  return `${cleanedLines.join('\n')}\nПереведи на английский.`
}

function keepOnlyCommentAndRepeatOnInvalidTranslationInput(content: string, includeRepeat: boolean): string {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  const commentLine = lines.find((line) => /^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(line))
  if (!commentLine) return content

  const commentText = commentLine.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:\s*/i, '')
  const isInvalidInputCase =
    /\b(Некорректн|непонятн|не распознан|не понимаю|не понял|поясни|объясни|уточни)\b/i.test(commentText)
  if (!isInvalidInputCase) return content

  const repeatLine = lines.find((line) => /^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:/i.test(line))
  if (!includeRepeat) return commentLine

  const normalizedRepeat = repeatLine
    ? repeatLine
        .replace(/^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:\s*/i, 'Повтори: ')
        .trim()
    : 'Повтори: Write one complete English sentence for the same Russian phrase.'
  return `${commentLine}\n${normalizedRepeat}`
}

function isUnrecognizedTranslationContext(content: string): boolean {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  const commentLine = lines.find((line) => /^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(line))
  if (!commentLine) return false
  const commentText = commentLine.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:\s*/i, '')
  return /\b(Некорректн|непонятн|не распознан|не понимаю|не понял|уточни|объясни|введите полное предложение|переведите предложение|что вы хотите сказать)\b/i.test(
    commentText
  )
}

function getTranslationRepeatSentence(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  const repeatLine = lines.find((line) => /^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:/i.test(line))
  if (!repeatLine) return null
  const repeatText = repeatLine
    .replace(/^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:\s*/i, '')
    .trim()
  return repeatText || null
}

function normalizeEnglishSentenceForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isTranslationAnswerEffectivelyCorrect(userText: string, repeatSentence: string): boolean {
  const userNorm = normalizeEnglishSentenceForComparison(userText)
  const repeatNorm = normalizeEnglishSentenceForComparison(repeatSentence)
  if (!userNorm || !repeatNorm) return false
  return userNorm === repeatNorm
}

function replaceFalsePositiveTranslationErrorWithPraise(params: {
  content: string
  userText: string
}): string {
  const { content, userText } = params
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex === -1) return content

  const commentText = lines[commentIndex].replace(/^Комментарий\s*:\s*/i, '').trim()
  const looksLikeError = /^(Ошибка\b|Лексическая ошибка\b|Грамматическая ошибка\b)/i.test(commentText)
  if (!looksLikeError) return content

  const repeatSentence = getTranslationRepeatSentence(content)
  if (!repeatSentence) return content
  if (!isTranslationAnswerEffectivelyCorrect(userText, repeatSentence)) return content

  lines[commentIndex] = 'Комментарий: Отлично!'
  return stripRepeatOnPraise(lines.join('\n'))
}

function forcePraiseIfRepeatMatchesUser(params: { content: string; userText: string }): string {
  const { content, userText } = params
  const repeatSentence = getTranslationRepeatSentence(content)
  if (!repeatSentence) return content
  if (!isTranslationAnswerEffectivelyCorrect(userText, repeatSentence)) return content

  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex === -1) return content
  lines[commentIndex] = 'Комментарий: Отлично!'
  return stripRepeatOnPraise(lines.join('\n'))
}

// Диалоговый sanity-check: ловим очевидно кривые фразы вида "to sea" / "to park"
// и не засчитываем их как финально корректные ответы для любых времён.
const ARTICLE_REQUIRED_PLACE_WORDS = new Set([
  'sea',
  'beach',
  'park',
  'museum',
  'cinema',
  'restaurant',
  'airport',
  'station',
  'city',
  'town',
  'village',
  'country',
])

function hasLikelyMissingArticleAfterPreposition(text: string): boolean {
  const lower = text.trim().toLowerCase()
  if (!lower) return false

  const placeAlternatives = Array.from(ARTICLE_REQUIRED_PLACE_WORDS).join('|')
  const prepositionPattern = new RegExp(
    `\\b(?:to|in|on|at|from|into|onto)\\s+(?:[a-z]+\\s+){0,2}(?:${placeAlternatives})\\b`,
    'i'
  )
  if (!prepositionPattern.test(lower)) return false

  const articlePattern = new RegExp(
    `\\b(?:the|a|an)\\s+(?:[a-z]+\\s+){0,2}(?:${placeAlternatives})\\b`,
    'i'
  )
  return !articlePattern.test(lower)
}

function isDialogueAnswerLikelyCorrect(userText: string, requiredTense: string): boolean {
  if (!isUserLikelyCorrectForTense(userText, requiredTense)) return false
  if (hasLikelyMissingArticleAfterPreposition(userText)) return false
  return true
}

function isDialogueAnswerEffectivelyCorrect(userText: string, repeatSentence: string, requiredTense: string): boolean {
  const userNorm = normalizeEnglishSentenceForComparison(userText)
  const repeatNorm = normalizeEnglishSentenceForComparison(repeatSentence)
  if (!userNorm || !repeatNorm) return false
  if (!isDialogueAnswerLikelyCorrect(userText, requiredTense)) return false
  // Считаем false-positive только почти точное совпадение с фразой, которую бот просил повторить.
  // Это не даёт скрывать реальные ошибки по слову/форме, когда ответ лишь "похож" на правильный.
  return userNorm === repeatNorm
}

function replaceFalsePositiveDialogueRepeatWithPraise(params: {
  content: string
  userText: string
  requiredTense: string
  topic: string
  level: string
  audience: 'child' | 'adult'
}): string {
  const { content, userText, requiredTense, topic, level, audience } = params
  const repeatSentence = getDialogueRepeatSentence(content)
  if (!repeatSentence) return content
  if (!isDialogueAnswerEffectivelyCorrect(userText, repeatSentence, requiredTense)) return content
  // Для корректного ответа в dialogue мы должны выходить без "Комментарий" и без "Повтори":
  // сразу следующий вопрос (это соответствует протоколу диалога в system prompt).
  return fallbackNextQuestion({ topic, tense: requiredTense, level, audience })
}

function getLastAssistantContent(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') return messages[i]?.content ?? null
  }
  return null
}

function isDialogueFinalCorrectResponse(params: {
  content: string
  userText: string
  requiredTense: string
}): boolean {
  const { content, userText, requiredTense } = params
  const trimmed = content.trim()
  if (!trimmed) return false
  if (/(^|\n)\s*(Повтори|Repeat|Say)\s*:/im.test(trimmed)) return false

  const hasQuestionMark = /\?\s*$|[A-Za-z].*\?/m.test(trimmed)
  if (!hasQuestionMark) return false

  return isDialogueAnswerLikelyCorrect(userText, requiredTense)
}

function replaceGenericRepeatFallbackWithPraiseIfUserLikelyCorrect(params: {
  content: string
  userText: string
  requiredTense: string
}): string {
  const { content, userText, requiredTense } = params
  const repeatSentence = getTranslationRepeatSentence(content)
  if (!isGenericTranslationRepeatFallback(repeatSentence)) return content
  if (!isUserLikelyCorrectForTense(userText, requiredTense)) return content

  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex !== -1) lines[commentIndex] = 'Комментарий: Отлично!'

  const placeholderLower = GENERIC_TRANSLATION_REPEAT_FALLBACK.toLowerCase()
  const filtered = lines.filter((line) => {
    const cleaned = line.trim()
    const isRepeatLine = /^(Повтори|Repeat|Say)\s*:/i.test(cleaned)
    if (!isRepeatLine) return true
    return !cleaned.toLowerCase().includes(placeholderLower)
  })

  return stripRepeatOnPraise(filtered.join('\n'))
}

const GENERIC_TRANSLATION_REPEAT_FALLBACK = 'Write one complete English sentence for the same Russian phrase.'

function isGenericTranslationRepeatFallback(text: string | null): boolean {
  if (!text) return false
  return text.trim().toLowerCase() === GENERIC_TRANSLATION_REPEAT_FALLBACK.toLowerCase()
}

function buildTranslationMissingRepeatRepairInstruction(params: {
  tenseName: string
  fallbackPrompt: string | null
}): string {
  const { tenseName, fallbackPrompt } = params
  return [
    'TRANSLATION REPEAT REPAIR:',
    'Your last output missed the actual corrected sentence.',
    `Required tense remains "${tenseName}".`,
    'In the line "Повтори:" you MUST write the real full corrected English sentence for the same Russian phrase.',
    'Never write placeholders like "Write one complete English sentence for the same Russian phrase."',
    fallbackPrompt ? `The Russian phrase to correct is: "${fallbackPrompt}"` : null,
    'Keep the visible protocol only: Комментарий / Время / Конструкция / Повтори / next Russian sentence / Переведи на английский.',
  ]
    .filter(Boolean)
    .join(' ')
}

function extractTranslationTimeValue(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  const timeLine = lines.find((line) => /^Время\s*:/i.test(line))
  if (!timeLine) return null
  return timeLine.replace(/^Время\s*:\s*/i, '').trim() || null
}

function extractEnglishTenseNameFromTimeValue(timeValue: string): string | null {
  const lower = timeValue.toLowerCase()
  // Сопоставляем по вхождению английского названия времени из TENSE_NAMES.
  for (const tenseName of Object.values(TENSE_NAMES)) {
    if (!tenseName) continue
    if (tenseName.toLowerCase() === 'any tense') continue
    if (lower.includes(tenseName.toLowerCase())) return tenseName
  }
  return null
}

function isRepeatSentenceCompatibleWithRequiredTense(params: {
  repeatSentence: string
  requiredTense: string
}): boolean {
  const { repeatSentence, requiredTense } = params
  if (!repeatSentence) return false

  const isAmIsAreIng = /\b(am|is|are)\s+[a-z]+ing\b/i.test(repeatSentence)

  if (requiredTense === 'present_simple') {
    // Простая эвристика: Present Simple НЕ содержит "am/is/are + V-ing".
    return !isAmIsAreIng
  }

  if (requiredTense === 'present_continuous') {
    // Для Present Continuous ожидаем "am/is/are + V-ing".
    return isAmIsAreIng
  }

  // Для прочих времён сейчас не проверяем жёстко, чтобы не вводить ложные срабатывания.
  return true
}

function buildTranslationTenseDriftRepairInstruction(params: {
  expectedTenseName: string
  expectedConstruction: string
  gotTenseName?: string | null
}): string {
  const { expectedTenseName, expectedConstruction, gotTenseName } = params
  return [
    'TRANSLATION TENSE DRIFT REPAIR:',
    `Required tense is "${expectedTenseName}".`,
    gotTenseName && gotTenseName !== expectedTenseName ? `Your last output used "${gotTenseName}" in "Время:" — fix it.` : null,
    `Rewrite the line that starts with "Время:" so it starts with "${expectedTenseName}".`,
    `Rewrite the line that starts with "Конструкция:" so it matches "${expectedConstruction}".`,
    'Rewrite the full corrected sentence in the line that starts with "Повтори:" using ONLY the required tense.',
    'Keep the same Russian context and keep the final line "Переведи на английский."',
    'No meta, no markdown, no numbering. Output only the user-visible protocol text.',
  ]
    .filter(Boolean)
    .join(' ')
}

function buildDialogueAllTenseRepeatRepairInstruction(params: {
  expectedTenseName: string
  lastAssistantSnippet: string
}): string {
  const snippet = params.lastAssistantSnippet.replace(/\s+/g, ' ').slice(0, 600)
  return [
    'DIALOGUE REPEAT TENSE REPAIR:',
    `The previous assistant message in this chat used approximately "${params.expectedTenseName}" for the main English question or the previous "Повтори:" line.`,
    snippet ? `Context from that message: ${snippet}` : null,
    'Rewrite ONLY your reply so it has exactly two lines: "Комментарий:" (Russian; keep the same issues/feedback intent) and "Повтори:" (English).',
    `The "Повтори:" sentence MUST be in ${params.expectedTenseName} and fix the user\'s mistake — do NOT change to another tense.`,
    'No markdown, no numbering, no extra lines.',
  ]
    .filter(Boolean)
    .join(' ')
}

function buildDialogueBlindTenseRepairInstruction(lastAssistant: string): string {
  const snippet = lastAssistant.replace(/\s+/g, ' ').slice(0, 900)
  return [
    'DIALOGUE REPEAT TENSE REPAIR (context-only):',
    `Previous assistant message — find the English QUESTION in it: ${snippet}`,
    'The user\'s last answer was wrong. Output ONLY two lines:',
    'Комментарий: short Russian about the mistake in the user\'s LAST message only.',
    'Повтори: one FULL corrected English sentence in the SAME grammar tense as that English question.',
    'Do NOT use a different tense than the question (e.g. Present Simple question requires Present Simple in Повтори).',
    'No markdown, no extra lines.',
  ].join(' ')
}

async function repairDialogueAllTenseRepeatMismatch(params: {
  content: string
  recentMessages: ChatMessage[]
  /** Tense для этого хода (free_talk: совпадает с последним вопросом или «все»). */
  dialogueTenseForTurn: string
  forcedRepeatSentence: string | null
  lastUserText: string
  systemContent: string
  apiMessages: { role: string; content: string }[]
  provider: Provider
  req: NextRequest
  maxTokens: number
}): Promise<string> {
  const {
    content,
    recentMessages,
    dialogueTenseForTurn,
    forcedRepeatSentence,
    lastUserText,
    systemContent,
    apiMessages,
    provider,
    req,
    maxTokens,
  } = params
  const repeatSentence = getDialogueRepeatSentence(content)
  if (!repeatSentence) return content
  if (forcedRepeatSentence && repeatSentence.trim() === forcedRepeatSentence.trim()) return content

  const lastAssistant = getLastAssistantContent(recentMessages)
  if (!lastAssistant) return content
  let expectedTense = inferTenseFromDialogueAssistantContent(lastAssistant)
  if (!expectedTense && dialogueTenseForTurn !== 'all') {
    expectedTense = dialogueTenseForTurn
  }
  if (!expectedTense && dialogueTenseForTurn === 'all') {
    const blindBlock = buildDialogueBlindTenseRepairInstruction(lastAssistant)
    const blindMessages = [...apiMessages]
    if (blindMessages[0]?.role === 'system') {
      blindMessages[0] = {
        role: 'system',
        content: `${systemContent}\n\n${blindBlock}`,
      }
    } else {
      blindMessages.unshift({ role: 'system', content: `${systemContent}\n\n${blindBlock}` })
    }
    const resBlind = await callProviderChat({ provider, req, apiMessages: blindMessages, maxTokens })
    if (resBlind.ok) {
      const repairedRaw = sanitizeInstructionLeak(resBlind.content)
      if (repairedRaw && !isMetaGarbage(repairedRaw)) {
        let repaired = stripOffContextCorrections(repairedRaw, lastUserText)
        repaired = normalizeAssistantPrefixForControlLines(repaired)
        repaired = splitCommentAndRepeatSameLine(repaired)
        repaired = stripRepeatWhenAskingToExplain(repaired)
        repaired = normalizeVariantFormatting(repaired)
        repaired = stripPravilnoEverywhere(repaired)
        const lines = repaired.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        const rr = getDialogueRepeatSentence(repaired)
        const inferredAfter = inferTenseFromDialogueAssistantContent(lastAssistant)
        const formatOk =
          lines.length === 2 &&
          /^Комментарий\s*:/i.test(lines[0] ?? '') &&
          /^(Повтори|Repeat|Say)\s*:/i.test(lines[1] ?? '') &&
          Boolean(rr) &&
          /[A-Za-z]/.test(rr ?? '')
        if (formatOk) {
          if (!inferredAfter || isUserLikelyCorrectForTense(rr!, inferredAfter)) {
            return repaired.trim()
          }
        }
      }
    }
    return content
  }
  if (!expectedTense) return content
  if (isUserLikelyCorrectForTense(repeatSentence, expectedTense)) return content

  const expectedTenseName = TENSE_NAMES[expectedTense] ?? expectedTense
  const repairBlock = buildDialogueAllTenseRepeatRepairInstruction({
    expectedTenseName,
    lastAssistantSnippet: lastAssistant,
  })

  const repairApiMessages = [...apiMessages]
  if (repairApiMessages[0]?.role === 'system') {
    repairApiMessages[0] = {
      role: 'system',
      content: `${systemContent}\n\n${repairBlock}`,
    }
  } else {
    repairApiMessages.unshift({ role: 'system', content: `${systemContent}\n\n${repairBlock}` })
  }

  const res = await callProviderChat({ provider, req, apiMessages: repairApiMessages, maxTokens })
  if (!res.ok) return content
  const repairedRaw = sanitizeInstructionLeak(res.content)
  if (!repairedRaw || isMetaGarbage(repairedRaw)) return content
  let repaired = stripOffContextCorrections(repairedRaw, lastUserText)
  repaired = normalizeAssistantPrefixForControlLines(repaired)
  repaired = splitCommentAndRepeatSameLine(repaired)
  repaired = stripRepeatWhenAskingToExplain(repaired)
  repaired = normalizeVariantFormatting(repaired)
  repaired = stripPravilnoEverywhere(repaired)
  const repairedRepeat = getDialogueRepeatSentence(repaired)
  if (!repairedRepeat || !isUserLikelyCorrectForTense(repairedRepeat, expectedTense)) return content
  const lines = repaired
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length !== 2) return content
  if (!/^Комментарий\s*:/i.test(lines[0] ?? '') || !/^(Повтори|Repeat|Say)\s*:/i.test(lines[1] ?? '')) return content
  return repaired.trim()
}

function normalizeEnglishToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z']/g, '')
}

function isLikelyPluralNoun(word: string): boolean {
  if (!word) return false
  if (/(?:ss|us|is)$/.test(word)) return false
  return /s$/.test(word)
}

const ENGLISH_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'from',
  'into',
  'onto',
  'over',
  'under',
  'about',
  'after',
  'before',
  'during',
  'between',
  'among',
  'within',
  'without',
  'up',
  'down',
  'out',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
  'every',
  'day',
  'days',
  'now',
  'then',
  'here',
  'there',
  'very',
  'much',
  'more',
  'most',
])

function tokenizeEnglishWords(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.map((token) => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean) ?? []
}

function isContentWord(token: string): boolean {
  if (!token) return false
  if (!/[a-z]/i.test(token)) return false
  if (token.length < 3) return false
  return !ENGLISH_STOP_WORDS.has(token.toLowerCase())
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length

  let prev = Array.from({ length: right.length + 1 }, (_, i) => i)
  let curr = new Array<number>(right.length + 1).fill(0)
  for (let i = 1; i <= left.length; i++) {
    curr[0] = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[right.length] ?? Math.max(left.length, right.length)
}

function findClosestWordMatch(target: string, candidates: string[]): { token: string; distance: number } | null {
  let best: { token: string; distance: number } | null = null
  for (const candidate of candidates) {
    if (!candidate || candidate === target) continue
    const distance = levenshteinDistance(target, candidate)
    if (!best || distance < best.distance) {
      best = { token: candidate, distance }
    }
  }
  return best
}

function pushUniqueReason(parts: string[], reason: string): void {
  if (!reason) return
  if (parts.includes(reason)) return
  parts.push(reason)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const COMMON_IRREGULAR_PAST_TO_BASE: Record<string, string> = {
  went: 'go',
  was: 'be',
  were: 'be',
  did: 'do',
  had: 'have',
  made: 'make',
  saw: 'see',
  took: 'take',
  came: 'come',
  got: 'get',
  gave: 'give',
  knew: 'know',
  thought: 'think',
  felt: 'feel',
  left: 'leave',
  kept: 'keep',
  found: 'find',
  wrote: 'write',
  ran: 'run',
  drove: 'drive',
  ate: 'eat',
  drank: 'drink',
  slept: 'sleep',
  spoke: 'speak',
  bought: 'buy',
  brought: 'bring',
  read: 'read',
  said: 'say',
  told: 'tell',
}

function enrichTranslationCommentQuality(params: {
  content: string
  userText: string
  repeatSentence: string | null
  tense: string
}): string {
  const { content, userText, repeatSentence, tense } = params
  if (!repeatSentence) return content

  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex === -1) return content
  const rawComment = lines[commentIndex].replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!rawComment) return content

  const userLower = userText.toLowerCase()
  const repeatLower = repeatSentence.toLowerCase()
  const reasonParts: string[] = []
  const prepositionHintParts: string[] = []

  const userTokens = userLower.split(/\s+/).map(normalizeEnglishToken).filter(Boolean)
  const repeatTokens = repeatLower.split(/\s+/).map(normalizeEnglishToken).filter(Boolean)
  const userSet = new Set(userTokens)
  const repeatSet = new Set(repeatTokens)

  const repeatContentTokens = tokenizeEnglishWords(repeatSentence).filter(isContentWord)
  const userContentTokens = tokenizeEnglishWords(userText).filter(isContentWord)

  const repeatHasSee = repeatSet.has('see') || repeatSet.has('sees')
  const userHasLook = userSet.has('look') || userSet.has('looks') || userSet.has('looking')
  const userHasSee = userSet.has('see') || userSet.has('sees')
  if (repeatHasSee && userHasLook && !userHasSee) {
    pushUniqueReason(reasonParts, 'Лексическая ошибка: здесь нужно see (видеть), а look означает «смотреть».')
  }

  const articleNounMatch = /\b(a|an)\s+([a-z]+)\b/i.exec(repeatLower)
  const hasArticleNounMatch = Boolean(articleNounMatch?.[2])
  if (articleNounMatch?.[2]) {
    const singularNoun = normalizeEnglishToken(articleNounMatch[2])
    const pluralCandidate = `${singularNoun}s`
    const userHasPlural = userSet.has(pluralCandidate) || userTokens.some((t) => t === pluralCandidate)
    const userHasArticleBeforeSingular =
      new RegExp(`\\b(a|an|the)\\s+${singularNoun}\\b`, 'i').test(userLower)
    const userHasBareSingular = new RegExp(`\\b${singularNoun}\\b`, 'i').test(userLower)
    const closestUserToNoun = findClosestWordMatch(singularNoun, userTokens)

    if (userHasPlural) {
      pushUniqueReason(reasonParts, `Ошибка числа: после артикля используйте единственное число — ${singularNoun}, не ${pluralCandidate}.`)
    } else if (userHasBareSingular && !userHasArticleBeforeSingular) {
      pushUniqueReason(reasonParts, `Ошибка артикля: перед ${singularNoun} нужен артикль ${articleNounMatch[1].toLowerCase()}.`)
    } else if (closestUserToNoun && closestUserToNoun.distance <= 2) {
      pushUniqueReason(
        reasonParts,
        `Ошибка артикля: перед ${singularNoun} нужен артикль ${articleNounMatch[1].toLowerCase()}.`
      )
    }
  }

  for (const token of repeatContentTokens) {
    if (!token || token.length < 3) continue
    const articleBeforeTokenInUser = new RegExp(`\\b(a|an|the)\\s+${escapeRegExp(token)}\\b`, 'i').test(userLower)
    const articleBeforeTokenInRepeat = new RegExp(`\\b(a|an|the)\\s+${escapeRegExp(token)}\\b`, 'i').test(repeatLower)
    if (articleBeforeTokenInUser && !articleBeforeTokenInRepeat) {
      pushUniqueReason(reasonParts, `Ошибка артикля: перед ${token} артикль не нужен.`)
    }
  }

  if (tense === 'present_simple') {
    const hasPresentContinuous = /\b(am|is|are)\s+[a-z]+ing\b/i.test(userText)
    const hasPastTenseSignal =
      /\b(went|was|were|did|had|made|saw|took|came|got|gave|said|told|knew|thought|felt|left|kept|found|wrote|read|ran|drove|ate|drank|slept|spoke|bought|brought)\b/i.test(
        userText
      ) || /\b[a-z]{3,}ed\b/i.test(userText)
    if (hasPresentContinuous || hasPastTenseSignal) {
      pushUniqueReason(reasonParts, 'Ошибка времени: используйте Present Simple для обычного действия.')
    }
  }

  for (const [pastForm, baseForm] of Object.entries(COMMON_IRREGULAR_PAST_TO_BASE)) {
    if (!userSet.has(pastForm)) continue
    if (!repeatSet.has(baseForm)) continue
    if (userSet.has(baseForm)) continue
    pushUniqueReason(reasonParts, `Ошибка формы глагола: нужно ${baseForm}, не ${pastForm}.`)
    if (tense === 'present_simple') {
      pushUniqueReason(reasonParts, 'Ошибка времени: здесь нужно Present Simple, а не форма прошедшего времени.')
    }
  }

  // Если пользователь использовал множественное число, а эталон — единственное, но без явного артикля.
  // Важно: даже если уже есть другая ошибка (например, лексическая), мы должны продолжать проверять число,
  // чтобы не терять подсказки вроде "cat/cats".
  if (!hasArticleNounMatch) {
    const repeatNouns = repeatTokens.filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'you', 'are', 'is'].includes(w))
    const singularFromRepeat = repeatNouns.find((w) => !isLikelyPluralNoun(w))
    if (singularFromRepeat && userSet.has(`${singularFromRepeat}s`)) {
      pushUniqueReason(reasonParts, `Ошибка числа: используйте ${singularFromRepeat} в единственном числе.`)
    }
  }

  // Более широкая проверка: сравниваем ключевые слова из пользовательской фразы и эталона по позиции.
  // Так мы видим несколько ошибок сразу: лексика, орфография, замена слов.
  const maxAligned = Math.min(userContentTokens.length, repeatContentTokens.length)
  for (let i = 0; i < maxAligned; i++) {
    const userToken = userContentTokens[i] ?? ''
    const repeatToken = repeatContentTokens[i] ?? ''
    if (!userToken || !repeatToken) continue
    if (userToken === repeatToken) continue
    if (userSet.has(`${repeatToken}s`) || repeatSet.has(`${userToken}s`)) continue

    const distance = levenshteinDistance(userToken, repeatToken)
    if (distance <= 2) {
      pushUniqueReason(reasonParts, `Орфографическая ошибка: ${userToken} нужно исправить на ${repeatToken}.`)
      continue
    }

    if (
      userToken.length >= 3 &&
      repeatToken.length >= 3 &&
      !/^(?:a|an|the)$/i.test(userToken) &&
      !/^(?:a|an|the)$/i.test(repeatToken)
    ) {
      pushUniqueReason(reasonParts, `Лексическая ошибка: ${userToken} нужно заменить на ${repeatToken}.`)
    }
  }

  const unmatchedUserTokens = [...userContentTokens]
  const unmatchedRepeatTokens = [...repeatContentTokens]
  for (const userToken of userContentTokens) {
    const bestIndex = unmatchedRepeatTokens.findIndex((repeatToken) => {
      const distance = levenshteinDistance(userToken, repeatToken)
      if (distance <= 2) return true
      if (userToken === `${repeatToken}s` || repeatToken === `${userToken}s`) return true
      return false
    })
    if (bestIndex !== -1) {
      unmatchedRepeatTokens.splice(bestIndex, 1)
      const userIndex = unmatchedUserTokens.indexOf(userToken)
      if (userIndex !== -1) unmatchedUserTokens.splice(userIndex, 1)
    }
  }

  if (unmatchedUserTokens.length > 0 && unmatchedRepeatTokens.length > 0) {
    const userToken = unmatchedUserTokens[0]
    const repeatToken = unmatchedRepeatTokens[0]
    if (userToken && repeatToken && userToken !== repeatToken) {
      const distance = levenshteinDistance(userToken, repeatToken)
      if (distance <= 3) {
        pushUniqueReason(reasonParts, `Орфографическая ошибка: ${userToken} нужно исправить на ${repeatToken}.`)
      } else if (!COMMON_IRREGULAR_PAST_TO_BASE[userToken]) {
        pushUniqueReason(reasonParts, `Лексическая ошибка: ${userToken} нужно заменить на ${repeatToken}.`)
      }
    }
  }

  // Путаница предлогов.
  // Ожидаемый предлог берём из repeatSentence, а пользовательский — из userText.
  // Если ожидаемый предлог не найден у пользователя, но в userText найден другой базовый предлог — подсказка в комментарий.
  const BASIC_PREPOSITIONS = [
    'to',
    'in',
    'on',
    'at',
    'by',
    'with',
    'for',
    'from',
    'into',
    'onto',
    'over',
    'under',
    'about',
    'of',
    'off',
    'through',
    'during',
    'before',
    'after',
    'between',
    'among',
    'within',
    'without',
    'up',
    'down',
    'out',
  ]
  const prepositionRe = new RegExp(`\\b(${BASIC_PREPOSITIONS.join('|')})\\b`, 'gi')
  const extractPrepositions = (s: string): string[] => {
    const matches = s.match(prepositionRe)
    if (!matches) return []
    return matches.map((m) => m.toLowerCase())
  }

  const expectedPreps = extractPrepositions(repeatLower)
  const usedPreps = extractPrepositions(userLower)

  if (expectedPreps.length > 0 && usedPreps.length > 0) {
    const expectedSet = new Set(expectedPreps)
    const otherUsed = usedPreps.find((p) => !expectedSet.has(p))
    const expectedFirst = expectedPreps[0]
    if (expectedFirst && otherUsed && expectedFirst !== otherUsed) {
      prepositionHintParts.push(`И ещё: здесь нужен ${expectedFirst}, а у тебя ${otherUsed}.`)
    }
  }

  const mergedReasonParts = [
    ...reasonParts,
    ...(prepositionHintParts.length > 0 ? prepositionHintParts : []),
  ].join(' ')

  if (mergedReasonParts.length === 0) return content

  // Когда других причин нет, а только предлог — дополняем текущий комментарий, не перезаписывая его целиком.
  if (reasonParts.length === 0 && prepositionHintParts.length > 0) {
    lines[commentIndex] = `${lines[commentIndex]} ${prepositionHintParts.join(' ')}`
    return lines.join('\n')
  }

  // Сохраняем исходный комментарий ИИ и дополняем его нашими обнаруженными причинами.
  lines[commentIndex] = `Комментарий: ${rawComment} ${mergedReasonParts}`.trim()
  return lines.join('\n')
}

function applyTranslationCommentCoachVoice(params: {
  content: string
  audience: 'child' | 'adult'
  requiredTense: string
}): string {
  const { content, audience, requiredTense } = params
  if (!content) return content

  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex === -1) return content

  const originalLine = lines[commentIndex]
  const commentText = originalLine.replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!commentText) return content

  const errorType = inferCommentErrorType(commentText)
  const errorTypeClean = errorType.replace(/\.\s*$/, '')
  const commentTextLower = commentText.toLowerCase()
  const errorTypeLower = errorType.toLowerCase()
  const errorTypeLowerBase = errorTypeLower.endsWith('.') ? errorTypeLower.slice(0, -1) : errorTypeLower

  let prefixLen = -1
  if (commentTextLower.startsWith(errorTypeLower)) {
    prefixLen = errorType.length
  } else if (commentTextLower.startsWith(errorTypeLowerBase)) {
    prefixLen = errorTypeLowerBase.length
  }
  if (prefixLen === -1) return content

  const rest = commentText
    .slice(prefixLen)
    .trimStart()
    // Убираем возможные двоеточия/тире после типа ошибки.
    .replace(/^[:\-–—]\s*/, '')
    // Если модель вставила "Смотри/Смотрите —", убираем это.
    .replace(/^(Смотри|Смотрите)\s*[-–—:]\s*/i, '')
  if (!rest) {
    lines[commentIndex] = `Комментарий: ${errorTypeClean}`
    return lines.join('\n')
  }

  if (errorTypeClean === 'Ошибка времени') {
    let timeReason = 'потому что нужно строго нужное время.'
    switch (requiredTense) {
      case 'present_simple':
        timeReason = 'но ведь ты идешь в школу (это привычка/факт).'
        break
      case 'present_continuous':
        timeReason = 'потому что это происходит прямо сейчас.'
        break
      case 'past_simple':
        timeReason = 'потому что речь про прошлое.'
        break
    }

    lines[commentIndex] = `Комментарий: ${errorTypeClean} — ${timeReason} ${rest}`
    return lines.join('\n')
  }

  lines[commentIndex] = `Комментарий: ${errorTypeClean} — ${rest}`
  return lines.join('\n')
}

function classifyOpenAiForbidden(errText: string): 'unsupported_region' | 'other' {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: string } }
    if (parsed?.error?.code === 'unsupported_country_region_territory') return 'unsupported_region'
  } catch {
    // ignore
  }
  if (/unsupported_country_region_territory/i.test(errText)) return 'unsupported_region'
  return 'other'
}

async function callProviderChat(params: {
  provider: Provider
  req: NextRequest
  apiMessages: { role: string; content: string }[]
  maxTokens?: number
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, req, apiMessages, maxTokens = MAX_RESPONSE_TOKENS } = params

  if (provider === 'openai') {
    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }
    const proxyFetchExtra = await buildProxyFetchExtra()
    let res: Response
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: apiMessages,
          max_tokens: maxTokens,
        }),
        ...(proxyFetchExtra as RequestInit),
      } as RequestInit)
    } catch (e) {
      return { ok: false, status: 502, errText: 'OpenAI fetch failed' }
    }
    if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>
    }
    const first = data.choices?.[0]
    const content = (first?.message?.content ?? first?.text ?? '').trim()
    return { ok: true, content }
  }

  const key = normalizeKey(process.env.OPENROUTER_API_KEY ?? '')
  if (!key) return { ok: false, status: 500, errText: 'Missing OPENROUTER_API_KEY' }
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': req.nextUrl?.origin ?? '',
    },
    body: JSON.stringify({
      model: FREE_MODEL,
      messages: apiMessages,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) return { ok: false, status: res.status, errText: await res.text() }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }
  const first = data.choices?.[0]
  const content = (first?.message?.content ?? first?.text ?? '').trim()
  return { ok: true, content }
}

function buildRepairSystemPrefix(): string {
  return (
    'REPAIR MODE: Your last output was invalid (it contained meta/instructions). ' +
    'Rewrite the reply so it follows the required protocol EXACTLY and contains only user-visible text. ' +
    'No explanations, no meta, no bullet lists, no quotes of rules. ' +
    'Output only one of: (A) a single English question; (B) two lines: "Комментарий: ..." (Russian) + "Повтори: ..." (English).\n\n'
  )
}

function extractLastAssistantRepeatSentence(messages: ChatMessage[]): string | null {
  let last: string | null = null
  const markerRe = /(?:^|\n)\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*(.+)$/im
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    const match = markerRe.exec(m.content)
    if (match?.[1]) last = match[1].trim()
  }
  if (!last) return last
  // Иногда в истории уже попадает "Повтори: Повтори: ...", и тогда next "Повтори:" дублируется.
  // Нормализуем: если извлеченная фраза начинается с маркера — убираем его.
  return last.replace(/^\s*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '').trim() || null
}

function extractLastAssistantQuestionSentence(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    const lines = msg.content
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
      .filter(Boolean)
    for (let j = lines.length - 1; j >= 0; j--) {
      const line = lines[j] ?? ''
      if (isEnglishQuestionLine(line)) return line
    }
  }
  return null
}

function buildDialogueLowSignalFallback(params: {
  messages: ChatMessage[]
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  forcedRepeatSentence?: string | null
  lastUserText?: string
}): string {
  const soft = isSoftCommentTone(params.audience, params.level)
  const invalidInputComment = soft
    ? params.audience === 'child'
      ? 'Комментарий: Напиши полное предложение на английском.'
      : 'Комментарий: Напишите полное предложение на английском.'
    : 'Комментарий: Некорректный ввод. Ответьте полным английским предложением.'

  const lastRepeat = params.forcedRepeatSentence ?? extractLastAssistantRepeatSentence(params.messages)
  const hasActiveRepeat =
    Boolean(lastRepeat) &&
    Boolean(params.lastUserText) &&
    !isDialogueAnswerEffectivelyCorrect(params.lastUserText!, lastRepeat!, params.tense)
  if (hasActiveRepeat && lastRepeat) {
    return [invalidInputComment, `Повтори: ${lastRepeat}`].join('\n')
  }

  const lastQuestion = extractLastAssistantQuestionSentence(params.messages)
  const nextQuestion =
    lastQuestion ??
    fallbackNextQuestion({
      topic: params.topic,
      tense: params.tense,
      level: params.level,
      audience: params.audience,
    })

  return `${invalidInputComment}\n${nextQuestion}`
}

function extractExplicitTranslateTarget(lastUserText: string): string | null {
  const text = lastUserText.trim()
  if (!text) return null
  const hasExplicitTranslateIntent = /нужен\s+перевод/i.test(text) ||
    /перевед(и|ите)/gi.test(text) ||
    /перевод/gi.test(text) ||
    /\btranslate\b/i.test(text) ||
    /\btranslation\b/i.test(text)

  if (!hasExplicitTranslateIntent) return null

  // Убираем намерение перевода и "технический" префикс (переведи/перевод/нужен перевод/и т.п.)
  // Важно: не используем `\b` для кириллицы — оно нестабильно для unicode-границ.
  const withoutIntent = text
    .replace(/нужен\s+перевод\s*[:\-]?\s*/gi, ' ')
    .replace(/перевед(и|ите)\s*(?:на\s+английский)?\s*[:\-]?\s*/gi, ' ')
    .replace(/перевод\s*[:\-]?\s*/gi, ' ')
    .replace(/translate\s*[:\-]?\s*/gi, ' ')
    .replace(/translation\s*[:\-]?\s*/gi, ' ')
    .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
    .trim()

  return withoutIntent || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const provider: Provider = body.provider === 'openai' ? 'openai' : 'openrouter'
    let topic = body.topic ?? 'free_talk'
    let level = body.level ?? 'a1'
    const mode = body.mode ?? 'dialogue'
    if (mode === 'communication') topic = 'free_talk'
    const sentenceType = body.sentenceType ?? 'mixed'
    const audience: 'child' | 'adult' = body.audience === 'child' ? 'child' : 'adult'
    const dialogSeed = typeof body.dialogSeed === 'string' ? body.dialogSeed : ''

    // Страховка: для "Ребёнок" в Свободной теме уровень не выше A2.
    if (audience === 'child' && topic === 'free_talk') {
      const allowed = new Set(['all', 'starter', 'a1', 'a2'])
      if (!allowed.has(String(level))) level = 'all'
    }

    const nonSystemMessages = messages.filter((m: ChatMessage) => m.role !== 'system')
    const translationUserTurns = nonSystemMessages.filter((m: ChatMessage) => m.role === 'user').length
    const isFirstTranslationUserTurn = mode === 'translation' && translationUserTurns === 1
    const recentMessages = nonSystemMessages.slice(-MAX_MESSAGES_IN_CONTEXT)
    const lastUserText = recentMessages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const explicitTranslateTarget =
      mode === 'communication' ? extractExplicitTranslateTarget(lastUserText) : null
    const isFirstTurn = recentMessages.length === 0
    const isTopicChoiceTurn = topic === 'free_talk' && recentMessages.length === 2 && recentMessages[1]?.role === 'user'
    const forcedRepeatSentence =
      mode === 'dialogue' ? extractLastAssistantRepeatSentence(recentMessages) : null
    const lastTranslationPrompt = mode === 'translation' ? extractLastTranslationPrompt(nonSystemMessages) : null

    // Массив времён: из body.tenses или body.tense (обратная совместимость). На каждый запрос выбираем одно.
    let rawTenses: string[] = Array.isArray(body.tenses)
      ? body.tenses
      : body.tense != null
        ? [body.tense]
        : ['present_simple']
    const childAllowedTenses = new Set(CHILD_TENSES)
    if (audience === 'child') {
      rawTenses = rawTenses.filter((t) => childAllowedTenses.has(t as TenseId))
      if (rawTenses.length === 0) rawTenses = ['present_simple']
    }
    const isAnyTense = rawTenses.includes('all')
    const normalizedRawTenses = Array.from(new Set(rawTenses.filter((t) => t !== 'all')))
    const prioritizedDialogueTenses =
      mode === 'dialogue' && normalizedRawTenses.length > 1
        ? normalizedRawTenses.sort((a, b) => {
            const aIdx = DIALOGUE_POPULAR_TENSE_PRIORITY.indexOf(a as TenseId)
            const bIdx = DIALOGUE_POPULAR_TENSE_PRIORITY.indexOf(b as TenseId)
            const aRank = aIdx === -1 ? 100 : aIdx
            const bRank = bIdx === -1 ? 100 : bIdx
            if (aRank !== bRank) return aRank - bRank
            return a.localeCompare(b)
          })
        : normalizedRawTenses
    const dialogueTenseSeedMessages =
      mode === 'dialogue' ? getDialogueTenseSeedMessages(recentMessages) : recentMessages
    const tenseForTurn =
      isAnyTense || rawTenses.length === 0
        ? 'all'
        : prioritizedDialogueTenses[
            stableHash32(JSON.stringify(dialogueTenseSeedMessages)) % prioritizedDialogueTenses.length
          ]
    const normalizedTense =
      audience === 'child' && !childAllowedTenses.has(tenseForTurn as TenseId) ? 'present_simple' : tenseForTurn

    const lastAssistantForInference = getLastAssistantContent(recentMessages)
    const inferredLastAssistantTense = lastAssistantForInference
      ? (inferTenseFromDialogueAssistantContent(lastAssistantForInference)
          ?? inferLastKnownTenseFromHistory(recentMessages))
      : inferLastKnownTenseFromHistory(recentMessages)

    const adultTensePool = buildAdultFullTensePool()
    const tensePoolForFreeTalkWeighted: string[] = (() => {
      let pool =
        prioritizedDialogueTenses.length > 0 ? [...prioritizedDialogueTenses] : [...adultTensePool]
      if (audience === 'child') {
        pool = pool.filter((t) => childAllowedTenses.has(t as TenseId))
        if (pool.length === 0) pool = [...CHILD_TENSES]
      }
      return pool
    })()

    let dialogueEffectiveTense = normalizedTense
    if (mode === 'dialogue' && topic === 'free_talk') {
      if (isTopicChoiceTurn) {
        dialogueEffectiveTense = pickWeightedFreeTalkTense({
          candidates: tensePoolForFreeTalkWeighted,
          seed: `${dialogSeed}|tc|${recentMessages.length}|${lastUserText}`,
          excludeTense: null,
        })
      } else if (!isFirstTurn && inferredLastAssistantTense) {
        dialogueEffectiveTense = inferredLastAssistantTense
      }
    }
    if (
      mode === 'dialogue' &&
      topic === 'free_talk' &&
      audience === 'child' &&
      !childAllowedTenses.has(dialogueEffectiveTense as TenseId)
    ) {
      dialogueEffectiveTense = 'present_simple'
    }

    const tenseForDialogueOps =
      mode === 'dialogue' && topic === 'free_talk' ? dialogueEffectiveTense : normalizedTense
    let tutorGradingTense = mode === 'dialogue' ? tenseForDialogueOps : normalizedTense

    if (mode === 'dialogue' && forcedRepeatSentence) {
      const inferredRepeatTense = inferTenseFromDialogueAssistantContent(
        getLastAssistantContent(recentMessages) ?? ''
      )
      if (inferredRepeatTense) {
        tutorGradingTense = inferredRepeatTense
      }
    }

    const topicChangeDetection =
      mode === 'dialogue' && topic === 'free_talk' && !isFirstTurn && !isTopicChoiceTurn
        ? detectFreeTalkTopicChange(lastUserText)
        : { isTopicChange: false, topicHintText: null as string | null, needsClarification: false }

    if (topicChangeDetection.isTopicChange) {
      if (topicChangeDetection.needsClarification) {
        return NextResponse.json({
          content: audience === 'child' ? 'What do you want to talk about now?' : 'What would you like to talk about now?',
          dialogueCorrect: true,
        })
      }

      const topicHintText = topicChangeDetection.topicHintText ?? lastUserText
      const { en, ru } = extractTopicChoiceKeywordsByLang(topicHintText)
      const keywords = en.length > 0 ? en : translateRuTopicKeywordsToEn(ru)

      if (keywords.length > 0) {
        return NextResponse.json({
          content: buildFreeTalkTopicAnchorQuestion({
            keywords,
            tense: tutorGradingTense,
            audience,
            diversityKey: `${recentMessages.length}|${lastUserText}|topic-change`,
            recentAssistantQuestions: extractRecentAssistantQuestions(recentMessages, 3),
          }),
          dialogueCorrect: true,
        })
      }

      return NextResponse.json({
        content: audience === 'child' ? 'What do you want to talk about now?' : 'What would you like to talk about now?',
        dialogueCorrect: true,
      })
    }

    if (mode === 'dialogue' && topic !== 'free_talk' && !isFirstTurn && isFixedTopicSwitchRequest(lastUserText)) {
      return NextResponse.json({
        content:
          audience === 'child'
            ? 'Great idea! In this lesson we stay on the current topic. Please answer about this topic, or switch to Free Topic to change it.'
            : 'Good idea. In this lesson we stay on the current topic. Please answer about this topic, or switch to Free Topic to change it.',
        dialogueCorrect: true,
      })
    }

    if (mode === 'dialogue' && topic !== 'free_talk' && !isFirstTurn && isLowSignalDialogueInput(lastUserText)) {
      return NextResponse.json({
        content: buildDialogueLowSignalFallback({
          messages: recentMessages,
          topic,
          tense: tutorGradingTense,
          level,
          audience,
          forcedRepeatSentence,
          lastUserText: lastUserContentForResponse,
        }),
      })
    }
    if (mode === 'translation' && !isFirstTurn && isLowSignalTranslationInput(lastUserText)) {
      const base = buildTranslationRetryFallback({
        tense: normalizedTense,
        includeRepeat: !isFirstTranslationUserTurn,
      })
      return NextResponse.json({ content: base })
    }
    if (mode === 'communication' && explicitTranslateTarget) {
      const translateSystem =
        'Translate the user text to natural English. Output ONLY the translated English text. No comments, no prefixes, no quotes.'
      const translateMessages = [
        { role: 'system', content: translateSystem },
        { role: 'user', content: explicitTranslateTarget },
      ]
      const translated = await callProviderChat({
        provider,
        req,
        apiMessages: translateMessages,
        maxTokens: 220,
      })
      if (translated.ok) {
        const raw = translated.content?.trim() ?? ''
        const firstNonEmptyLine =
          raw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .find(Boolean)
            ?.replace(/^\s*(?:translation|перевод)\s*:\s*/i, '') ?? ''
        if (firstNonEmptyLine) return NextResponse.json({ content: firstNonEmptyLine })
      }
    }

    // Вариант 2 должен быть предсказуемым (не Math.random), чтобы баги воспроизводились и не "прыгали".
    const praiseStyleVariant =
      mode === 'dialogue' && (stableHash32(`${topic}|${level}|${normalizedTense}|${lastUserText}`) % 100) < 45
    const communicationDetailLevel =
      mode === 'communication' ? detectCommunicationDetailLevel(lastUserText) : 0
    const communicationMaxTokens =
      mode === 'communication' ? buildCommunicationMaxTokens(communicationDetailLevel) : MAX_RESPONSE_TOKENS
    const lastUserContentForResponse = lastUserText
    const lastAssistantContentForLangTie = recentMessages.filter((m: ChatMessage) => m.role === 'assistant').pop()?.content ?? ''
    const lastAssistantLang = detectLangFromText(lastAssistantContentForLangTie, 'ru')
    const rawInputLang = body.communicationInputExpectedLang
    const communicationInputExpectedLang: 'ru' | 'en' =
      rawInputLang === 'en' || rawInputLang === 'ru' ? rawInputLang : 'ru'
    const hasAssistantInThread = recentMessages.some((m: ChatMessage) => m.role === 'assistant')
    const communicationDetailOnly =
      mode === 'communication' ? isCommunicationDetailOnlyMessage(lastUserContentForResponse) : false
    const detectedUserLang =
      mode === 'communication'
        ? getExpectedCommunicationReplyLang(recentMessages, { inputPreference: communicationInputExpectedLang })
        : detectLangFromText(lastUserContentForResponse, lastAssistantLang)
    const communicationLanguageHint: 'Russian' | 'English' =
      mode === 'communication' && !hasAssistantInThread
        ? 'Russian'
        : lastAssistantLang === 'en'
          ? 'English'
          : 'Russian'

    const systemPrompt = buildSystemPrompt({
      mode,
      sentenceType,
      topic,
      level,
      tense: tutorGradingTense,
      audience,
      praiseStyleVariant,
      forcedRepeatSentence,
      communicationDetailLevel,
      communicationLanguageHint,
      communicationDetailOnly,
    })

    const topicChoicePrefix = mode === 'dialogue' && isTopicChoiceTurn
      ? 'This turn only: the user is naming their topic. Output ONLY one question in English — nothing else. Do NOT output "Комментарий:", "Отлично", "Молодец", "Верно", or any praise. Do NOT output "Правильно:" or "Повтори:". The user may write in English, Russian, or a mix of both (they are learning and may not know the English word). Infer the topic from their words regardless of language (e.g. "I played tennis" → tennis; "i swam" → swimming; "река" → river; "I река" → river; "транзисторы" → transistors; "я люблю кошки" → cats). Ask exactly ONE question in the required tense about the inferred topic. The question must sound natural, as if asked by a professional English tutor in a real lesson. Relate the topic to the learner\'s personal experience, feelings, or everyday life. Do NOT mechanically combine the topic word with a generic verb — think about what aspect of the topic a real person would discuss. Good examples: topic "sun" + Past Simple → "Did you spend time outside in the sun yesterday?"; topic "cats" + Present Simple → "Do you have a cat at home?". Bad examples: "What did you do with the sun?" (nonsensical); "What do you usually do involving cats?" (robotic). If the message gives absolutely no hint (e.g. "sdf"), ask what they mean. Your reply must be ONLY that one question, no other lines. Ignore all correction rules below for this turn.\n\n'
      : ''
    const dialogueInferredTenseHint =
      mode === 'dialogue' &&
      normalizedTense === 'all' &&
      !isFirstTurn &&
      !isTopicChoiceTurn &&
      !(topic === 'free_talk' && inferredLastAssistantTense)
        ? (() => {
            const lastAst = getLastAssistantContent(recentMessages)
            if (!lastAst) return ''
            const inferred = inferTenseFromDialogueAssistantContent(lastAst)
            if (!inferred) return ''
            const name = TENSE_NAMES[inferred] ?? inferred
            return `\n\nIMPORTANT: Your last question was in ${name}. The user MUST answer in ${name}. If their answer uses a different tense, treat it as a tense error: explain in Комментарий that ${name} is required, and write the corrected sentence in ${name} after "Повтори:".`
          })()
        : ''
    const freeTalkExpectedNextQuestionTense: string | null =
      mode === 'dialogue' &&
      topic === 'free_talk' &&
      !isFirstTurn &&
      !isTopicChoiceTurn &&
      inferredLastAssistantTense
        ? pickWeightedFreeTalkTense({
            candidates: tensePoolForFreeTalkWeighted,
            seed: `${dialogSeed}|nextQ|${recentMessages.length}|${lastUserText}`,
            excludeTense: inferredLastAssistantTense,
          })
        : null
    const freeTalkPromptSuffix =
      mode === 'dialogue' &&
      topic === 'free_talk' &&
      !isFirstTurn &&
      !isTopicChoiceTurn &&
      inferredLastAssistantTense &&
      freeTalkExpectedNextQuestionTense
        ? (() => {
            const lastName = TENSE_NAMES[inferredLastAssistantTense] ?? inferredLastAssistantTense
            const nextName = TENSE_NAMES[freeTalkExpectedNextQuestionTense] ?? freeTalkExpectedNextQuestionTense
            return `\n\nFREE-TALK: After a fully correct answer, your next English question MUST be entirely in ${nextName}. Vary wording; do NOT reuse the same template every time (e.g. avoid "What will you have done..." on every turn). If the user made mistakes, Комментарий + Повтори must use ${lastName} for the corrected English sentence.`
          })()
        : ''
    const freeTalkTopicHint: string = (() => {
      if (topic !== 'free_talk' || isFirstTurn || isTopicChoiceTurn) return ''
      const firstUserMsg = nonSystemMessages.find((m) => m.role === 'user')
      if (!firstUserMsg) return ''
      const { en, ru } = extractTopicChoiceKeywordsByLang(firstUserMsg.content)
      const keywords = en.length > 0 ? en : translateRuTopicKeywordsToEn(ru)
      if (keywords.length === 0) return ''
      return `\n\nFREE-TALK ESTABLISHED TOPIC: The user chose the topic earlier. Key topic words: ${keywords.slice(0, 3).join(', ')}. Continue asking questions about this topic.

Topic change rule (free talk only): The user may change the topic at any time. Recognize these patterns as a topic change request:
- A single word or short phrase naming a new topic (English or Russian): "река", "cats", "space", "музыка"
- Explicit English request: "Let's talk about ...", "I want to talk about ...", "Can we talk about ...?", "Something else"
- Explicit Russian request: "Давай поговорим о ...", "Давай сменим тему", "Другая тема", "Хочу поговорить о ..."
- Mixed request: "Let's talk давай о реках"
When you detect a topic change: do NOT output "Комментарий:" or "Повтори:". If a new topic is named, ask one question about it in the required tense (follow the same natural question style). If no specific topic is named, ask "What would you like to talk about now?". This rule overrides the mixed-input correction rule and topic retention for this message only.`
    })()
    const systemContent = topicChoicePrefix + systemPrompt + dialogueInferredTenseHint + freeTalkPromptSuffix + freeTalkTopicHint

    // При пустом диалоге добавляем одно сообщение пользователя: часть провайдеров требует хотя бы один user turn
    const userTurnMessages =
      recentMessages.length > 0
        ? recentMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content }))
        : [
            {
              role: 'user' as const,
              content: mode === 'communication' ? 'Пользователь скоро задаст вопрос.' : 'Start the conversation.',
            },
          ]
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemContent },
      ...userTurnMessages,
    ]
    const res1 = await callProviderChat({ provider, req, apiMessages, maxTokens: communicationMaxTokens })
    if (!res1.ok) {
      const errText = res1.errText
      const forbiddenType =
        res1.status === 403 && provider === 'openai' ? classifyOpenAiForbidden(errText) : null
      let userMessage: string
      let errorCode: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined
      if (res1.status === 401) {
        errorCode = 'unauthorized'
        userMessage =
          provider === 'openai'
            ? 'Неверный ключ OpenAI. Проверьте OPENAI_API_KEY.'
            : 'Неверный ключ OpenRouter. Проверьте OPENROUTER_API_KEY.'
      } else if (res1.status === 403 && provider === 'openai') {
        errorCode = 'forbidden'
        userMessage =
          forbiddenType === 'unsupported_region'
            ? 'OpenAI недоступен из вашего региона (403 unsupported_country_region_territory). Переключитесь на OpenRouter или используйте деплой (например, Vercel) в поддерживаемом регионе.'
            : 'Доступ к OpenAI запрещён (403). Проверьте доступность сервиса в вашем регионе и права проекта/аккаунта.'
      } else if (res1.status === 429) {
        errorCode = 'rate_limit'
        userMessage = 'Слишком много запросов к ИИ. Подождите немного и попробуйте ещё раз.'
      } else {
        errorCode = 'upstream_error'
        userMessage = 'Сейчас ИИ недоступен. Подождите немного и попробуйте ещё раз.'
      }
      return NextResponse.json(
        { error: userMessage, errorCode, provider, details: errText },
        { status: res1.status }
      )
    }
    const content = res1.content

    if (!content) {
      const errorMessage = 'Модель вернула пустой ответ. Попробуйте отправить сообщение ещё раз.'
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      )
    }

    let sanitized = sanitizeInstructionLeak(content)
    if (sanitized === null) {
      console.warn('[chat] Ответ содержит утечку инструкций, отбрасываем:', content.slice(0, 120))
      return NextResponse.json(
        { error: 'Модель вернула некорректный ответ. Попробуйте отправить сообщение ещё раз.' },
        { status: 502 }
      )
    }

    // Если модель вернула мета-фразу вместо ответа — не показываем её пользователю.
    // Делаем мягкий fallback на следующий интент, чтобы UX не ломался.
    if (isMetaGarbage(sanitized)) {
      if (mode === 'communication') {
        const preferEnContinuation = shouldPreferEnglishContinuationFallback(
          lastUserContentForResponse,
          detectedUserLang
        )
        return NextResponse.json({
          content: preferEnContinuation
            ? buildCommunicationEnglishContinuationFallback(audience)
            : buildCommunicationFallbackMessage({
                audience,
                language: detectedUserLang,
                firstTurn: isFirstTurn,
                seedText: dialogSeed,
              }),
        })
      }

      return NextResponse.json({
        content: fallbackQuestionForContext({ topic, tense: tutorGradingTense, level, audience, isFirstTurn, isTopicChoiceTurn, lastUserText: lastUserContentForResponse }),
      })
    }
    sanitized = stripOffContextCorrections(sanitized, lastUserContentForResponse)
    sanitized = normalizeAssistantPrefixForControlLines(sanitized)
    sanitized = splitCommentAndRepeatSameLine(sanitized)
    sanitized = stripRepeatWhenAskingToExplain(sanitized)
    sanitized = normalizeVariantFormatting(sanitized)
    sanitized = stripPravilnoEverywhere(sanitized)
    if (mode === 'dialogue') {
      sanitized = replaceFalsePositiveDialogueRepeatWithPraise({
        content: sanitized,
        userText: lastUserContentForResponse,
        requiredTense: tutorGradingTense,
        topic,
        level,
        audience,
      })
      sanitized = alignDialogueArticleCommentWithRepeat({
        content: sanitized,
        userText: lastUserContentForResponse,
        audience,
        level,
      })
    }
    sanitized = stripRepeatOnPraise(sanitized)
    sanitized = ensureNextQuestionOnPraise(sanitized, {
      mode,
      topic,
      tense: tutorGradingTense,
      level,
      audience,
      nextQuestionTense: freeTalkExpectedNextQuestionTense,
    })
    sanitized = ensureNextQuestionWhenMissing(sanitized, {
      mode,
      topic,
      tense: tutorGradingTense,
      level,
      audience,
      nextQuestionTense: freeTalkExpectedNextQuestionTense,
    })
    if (mode === 'dialogue') {
      sanitized = normalizeAboutTodaySpacing(sanitized)
      sanitized = contextualizeTopicNextQuestionForLastAnswer(sanitized, {
        topic,
        tense: tutorGradingTense,
        audience,
        lastUserContent: lastUserContentForResponse,
        contextMessages: recentMessages,
      })
      if (topic === 'free_talk' && isTopicChoiceTurn) {
        sanitized = ensureFreeTalkTopicChoiceQuestionAnchorsUser({
          content: sanitized,
          userText: lastUserContentForResponse,
          tense: tutorGradingTense,
        })
      }
      if (topic === 'free_talk') {
        const freeTalkTense = freeTalkExpectedNextQuestionTense ?? tutorGradingTense
        sanitized = applyFreeTalkAntiRepeat({
          content: sanitized,
          tense: freeTalkTense,
          audience,
          recentMessages,
          lastUserText: lastUserContentForResponse,
        })
      }
      sanitized = await repairDialogueAllTenseRepeatMismatch({
        content: sanitized,
        recentMessages,
        dialogueTenseForTurn: tutorGradingTense,
        forcedRepeatSentence,
        lastUserText: lastUserContentForResponse,
        systemContent,
        apiMessages,
        provider,
        req,
        maxTokens: communicationMaxTokens,
      })
    }
    if (mode === 'translation') {
      sanitized = normalizeTranslationCommentStyle(sanitized)
      if (isFirstTurn) {
        sanitized = ensureFirstTranslationInvitation(sanitized)
      } else {
        sanitized = ensureTranslationProtocolBlocks(sanitized, {
          tense: normalizedTense,
          topic,
          level,
          audience,
          fallbackPrompt: lastTranslationPrompt,
        })
        const repeatSentence = getTranslationRepeatSentence(sanitized)
        if (repeatSentence && isTranslationAnswerEffectivelyCorrect(lastUserContentForResponse, repeatSentence)) {
          // Fast-path: модель фактически попросила пользователя повторить его же ответ — значит, ответ корректный.
          sanitized = forcePraiseIfRepeatMatchesUser({ content: sanitized, userText: lastUserContentForResponse })
        } else {
          sanitized = enrichTranslationCommentQuality({
            content: sanitized,
            userText: lastUserContentForResponse,
            repeatSentence,
            tense: normalizedTense,
          })
          sanitized = replaceFalsePositiveTranslationErrorWithPraise({
            content: sanitized,
            userText: lastUserContentForResponse,
          })
          sanitized = keepOnlyCommentAndRepeatOnInvalidTranslationInput(sanitized, !isFirstTranslationUserTurn)
          if (isUnrecognizedTranslationContext(sanitized)) {
            sanitized =
              'Комментарий: Некорректный ввод. Введите правильный перевод полным предложением на английском языке.'
          }
        }

        // Coach-текст для блока "Конструкция" (привязываем правило к текущему "Повтори").
        const repeatSentenceForConstruction = getTranslationRepeatSentence(sanitized)
        if (repeatSentenceForConstruction && !isGenericTranslationRepeatFallback(repeatSentenceForConstruction)) {
          const coachText = buildTranslationConstructionCoachText(normalizedTense, repeatSentenceForConstruction)
          sanitized = replaceTranslationConstructionLine(sanitized, coachText)
        }
      }
    }

    if (mode === 'translation' && !isFirstTurn) {
      const repeatSentence = getTranslationRepeatSentence(sanitized)
      if (isGenericTranslationRepeatFallback(repeatSentence)) {
        const userLikelyCorrect = isUserLikelyCorrectForTense(lastUserContentForResponse, normalizedTense)
        if (userLikelyCorrect) {
          sanitized = replaceGenericRepeatFallbackWithPraiseIfUserLikelyCorrect({
            content: sanitized,
            userText: lastUserContentForResponse,
            requiredTense: normalizedTense,
          })
        } else {
          const repairApiMessages = [...apiMessages]
          repairApiMessages[0] = {
            role: 'system',
            content:
              `${systemContent}\n\n` +
              buildTranslationMissingRepeatRepairInstruction({
                tenseName: TENSE_NAMES[normalizedTense] ?? 'Present Simple',
                fallbackPrompt: lastTranslationPrompt,
              }),
          }

          const resRepeatRepair = await callProviderChat({ provider, req, apiMessages: repairApiMessages, maxTokens: communicationMaxTokens })
          if (resRepeatRepair.ok) {
            const repairedSanitizedRaw = sanitizeInstructionLeak(resRepeatRepair.content)
            if (repairedSanitizedRaw && !isMetaGarbage(repairedSanitizedRaw)) {
              let repaired = stripOffContextCorrections(repairedSanitizedRaw, lastUserContentForResponse)
              repaired = normalizeAssistantPrefixForControlLines(repaired)
              repaired = splitCommentAndRepeatSameLine(repaired)
              repaired = stripRepeatWhenAskingToExplain(repaired)
              repaired = normalizeVariantFormatting(repaired)
              repaired = stripPravilnoEverywhere(repaired)
              repaired = stripRepeatOnPraise(repaired)
              repaired = normalizeTranslationCommentStyle(repaired)
            repaired = ensureTranslationProtocolBlocks(repaired, {
              tense: normalizedTense,
              topic,
              level,
              audience,
              fallbackPrompt: lastTranslationPrompt,
            })

              const repairedRepeatSentence = getTranslationRepeatSentence(repaired)
              repaired = enrichTranslationCommentQuality({
                content: repaired,
                userText: lastUserContentForResponse,
                repeatSentence: repairedRepeatSentence,
                tense: normalizedTense,
              })
              repaired = replaceFalsePositiveTranslationErrorWithPraise({
                content: repaired,
                userText: lastUserContentForResponse,
              })
              repaired = keepOnlyCommentAndRepeatOnInvalidTranslationInput(repaired, !isFirstTranslationUserTurn)
              if (isUnrecognizedTranslationContext(repaired)) {
                repaired =
                  'Комментарий: Некорректный ввод. Введите правильный перевод полным предложением на английском языке.'
              }

              if (repairedRepeatSentence && !isGenericTranslationRepeatFallback(repairedRepeatSentence)) {
                const coachText = buildTranslationConstructionCoachText(normalizedTense, repairedRepeatSentence)
                repaired = replaceTranslationConstructionLine(repaired, coachText)
                sanitized = repaired
              }
            }
          }

          if (isGenericTranslationRepeatFallback(getTranslationRepeatSentence(sanitized))) {
            sanitized = 'Комментарий: Не удалось сформировать исправленное предложение. Попробуйте ещё раз.'
          }
        }
      }
    }

    // TENSE DRIFT: иногда модель в режиме тренировки по переводу "съезжает" на другое время.
    // Исправляем это одним repair-запросом, чтобы "Время/Конструкция/Повтори" совпали с выбранным tense.
    if (
      mode === 'translation' &&
      !isFirstTurn &&
      (normalizedTense === 'present_simple' || normalizedTense === 'present_continuous')
    ) {
      const expectedTenseName = TENSE_NAMES[normalizedTense] ?? null
      if (expectedTenseName) {
        const timeValue = extractTranslationTimeValue(sanitized)
        const gotTenseName = timeValue ? extractEnglishTenseNameFromTimeValue(timeValue) : null
        const repeatSentence = getTranslationRepeatSentence(sanitized)

        const timeMismatch = timeValue ? !timeValue.toLowerCase().includes(expectedTenseName.toLowerCase()) : false
        const repeatMismatch =
          repeatSentence != null
            ? !isRepeatSentenceCompatibleWithRequiredTense({ repeatSentence, requiredTense: normalizedTense })
            : false

        if ((timeMismatch || repeatMismatch) && repeatSentence) {
          const expectedConstruction = translationConstructionHint(normalizedTense)
          const repairSystemContent = `${systemContent}\n\n${buildTranslationTenseDriftRepairInstruction({
            expectedTenseName,
            expectedConstruction,
            gotTenseName,
          })}`

          const repairApiMessages = [...apiMessages]
          repairApiMessages[0] = { role: 'system', content: repairSystemContent }

          const res2 = await callProviderChat({ provider, req, apiMessages: repairApiMessages, maxTokens: communicationMaxTokens })
          if (res2.ok) {
            const repairedSanitizedRaw = sanitizeInstructionLeak(res2.content)
            if (repairedSanitizedRaw && !isMetaGarbage(repairedSanitizedRaw)) {
              let repaired = stripOffContextCorrections(repairedSanitizedRaw, lastUserContentForResponse)
              repaired = normalizeAssistantPrefixForControlLines(repaired)
              repaired = splitCommentAndRepeatSameLine(repaired)
              repaired = stripRepeatWhenAskingToExplain(repaired)
              repaired = normalizeVariantFormatting(repaired)
              repaired = stripPravilnoEverywhere(repaired)
              repaired = stripRepeatOnPraise(repaired)
              repaired = ensureNextQuestionOnPraise(repaired, { mode, topic, tense: normalizedTense, level, audience })
              repaired = ensureNextQuestionWhenMissing(repaired, { mode, topic, tense: normalizedTense, level, audience })
              if (mode === 'dialogue') {
                repaired = normalizeAboutTodaySpacing(repaired)
              }

              if (mode === 'translation') {
                repaired = normalizeTranslationCommentStyle(repaired)
                if (isFirstTurn) {
                  repaired = ensureFirstTranslationInvitation(repaired)
                } else {
                  repaired = ensureTranslationProtocolBlocks(repaired, {
                    tense: normalizedTense,
                    topic,
                    level,
                    audience,
                    fallbackPrompt: lastTranslationPrompt,
                  })
                  const repeatSentence2 = getTranslationRepeatSentence(repaired)
                  repaired = enrichTranslationCommentQuality({
                    content: repaired,
                    userText: lastUserContentForResponse,
                    repeatSentence: repeatSentence2,
                    tense: normalizedTense,
                  })
                  repaired = keepOnlyCommentAndRepeatOnInvalidTranslationInput(repaired, !isFirstTranslationUserTurn)
                  if (isUnrecognizedTranslationContext(repaired)) {
                    repaired =
                      'Комментарий: Некорректный ввод. Введите правильный перевод полным предложением на английском языке.'
                  }

                  const repeatSentenceForConstruction = getTranslationRepeatSentence(repaired)
                  if (repeatSentenceForConstruction && !isGenericTranslationRepeatFallback(repeatSentenceForConstruction)) {
                    const coachText = buildTranslationConstructionCoachText(normalizedTense, repeatSentenceForConstruction)
                    repaired = replaceTranslationConstructionLine(repaired, coachText)
                  }
                }
              }

              if (repaired) sanitized = repaired
            }
          }
        }
      }
    }

    if (mode === 'translation') {
      sanitized = applyTranslationCommentCoachVoice({
        content: sanitized,
        audience,
        requiredTense: normalizedTense,
      })
    }
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Модель вернула некорректный ответ. Попробуйте отправить сообщение ещё раз.' },
        { status: 502 }
      )
    }

    if (mode === 'communication') {
      const targetLang = detectedUserLang

      const normalizeOutput = (raw: string): string => {
        return raw
          .split(/\r?\n/)
          .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
          .filter(Boolean)
          // Убираем возможные протокольные/служебные строки, если модель всё же их вывела.
          .filter((l) => !/^\s*(RU|Russian|Перевод)\s*:?/i.test(l.trim()))
          .filter((l) => !/^\s*(Комментарий|Повтори|Время|Конструкция)\s*:/i.test(l.trim()))
          .filter((l) => !/^\s*(Repeat|Say)\s*:/i.test(l.trim()))
          .join('\n')
          .trim()
      }
      const collapseDuplicateLeadingGreetings = (text: string, lang: DetectedLang): string => {
        if (!text) return text
        if (lang === 'ru') {
          // Убираем повторы приветствия в начале: "Здравствуйте! Здравствуйте! ..."
          // -> "Здравствуйте! ..."
          return text.replace(
            /^\s*((?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)(?:(?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)+/i,
            '$1'
          )
        }
        return text.replace(
          /^\s*((?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)(?:(?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)+/i,
          '$1'
        )
      }
      const stripLeadingConversationFillers = (text: string): string => {
        if (!text) return text
        let out = text
        // Удаляем только стартовые "разговорные" вводные и только в начале реплики.
        // Примеры: "Хорошо, ...", "Ладно... ", "Okay, ...", "Well, ...".
        const leadingFillers =
          /^\s*(?:(?:Хорошо|Ладно|Окей|Ну\s+что|Итак|Okay|Ok|Well|So|Alright)\b[\s,!.?:;-]*)+/i
        out = out.replace(leadingFillers, '')
        return out.replace(/^\s+/, '').trim()
      }
      const stripPostGreetingFillers = (text: string, lang: DetectedLang): string => {
        if (!text) return text
        if (lang === 'ru') {
          return text.replace(
            /^(\s*(?:Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b[!,.?\s]*)\s*(?:(?:Хорошо|Ладно|Окей|Ну\s+что|Итак)\b[\s,!.?:;-]*)+/i,
            '$1'
          ).trim()
        }
        return text.replace(
          /^(\s*(?:Hi|Hello|Hey|Greetings)\b[!,.?\s]*)\s*(?:(?:Okay|Ok|Well|So|Alright)\b[\s,!.?:;-]*)+/i,
          '$1'
        ).trim()
      }

      let cleaned = normalizeOutput(sanitized)
      if (isFirstTurn) {
        cleaned = stripLeadingConversationFillers(cleaned)
        cleaned = collapseDuplicateLeadingGreetings(cleaned, targetLang)
        cleaned = stripPostGreetingFillers(cleaned, targetLang)
        cleaned = buildCommunicationFallbackMessage({
          audience,
          language: targetLang,
          firstTurn: true,
          seedText: dialogSeed,
        })
      }

      const preferEnContinuation = shouldPreferEnglishContinuationFallback(
        lastUserContentForResponse,
        targetLang
      )
      const fallback = preferEnContinuation
        ? buildCommunicationEnglishContinuationFallback(audience)
        : buildCommunicationFallbackMessage({
            audience,
            language: targetLang,
            firstTurn: isFirstTurn,
            seedText: dialogSeed,
          })

      if (!cleaned) cleaned = fallback

      let responseLang = detectLangFromText(cleaned, targetLang)
      if (responseLang !== targetLang) {
        // Repair: принудительно просим вернуть ответ на нужном языке (RU/EN) и без протокольных маркеров.
        const repairApiMessages = [...apiMessages]
        const targetLabel = targetLang === 'ru' ? 'Russian' : 'English'
        repairApiMessages[0] = {
          role: 'system',
          content:
            systemContent +
            `\n\nIMPORTANT LANGUAGE FIX: You MUST reply ONLY in ${targetLabel} (no switching languages). Keep it short (1–3 sentences). No "Комментарий/Повтори", no tutor/protocol markers, no "RU:/Russian:/Перевод".`,
        }

        const res2 = await callProviderChat({ provider, req, apiMessages: repairApiMessages, maxTokens: communicationMaxTokens })
        if (res2.ok) {
          const repairedRaw = sanitizeInstructionLeak(res2.content)
          if (repairedRaw) {
            cleaned = normalizeOutput(repairedRaw)
            if (isFirstTurn) {
              cleaned = stripLeadingConversationFillers(cleaned)
              cleaned = collapseDuplicateLeadingGreetings(cleaned, targetLang)
              cleaned = stripPostGreetingFillers(cleaned, targetLang)
              cleaned = buildCommunicationFallbackMessage({
                audience,
                language: targetLang,
                firstTurn: true,
                seedText: dialogSeed,
              })
            }
            if (!cleaned) cleaned = fallback
            responseLang = detectLangFromText(cleaned, targetLang)
            if (responseLang !== targetLang) cleaned = fallback
          } else {
            cleaned = fallback
          }
        } else {
          cleaned = fallback
        }
      }

      const minimal = cleaned.trim()
      const looksTruncated = /^(что|почему|как|когда|где|кто|what|why|how|when|where|who)\??\.?$/i.test(minimal)
      if (looksTruncated) cleaned = fallback

      // Гарантия приветствия на первом ассистентском сообщении в `communication`.
      // Модель иногда выдаёт сразу вопрос без "Привет"/"Hello", и вы это заметили на UI.
      if (isFirstTurn) {
        // Расширяем проверку на приветствия: модель иногда выдает опечатку
        // вроде "Здраствуй" вместо "Здравствуй", из-за чего авто-добавление
        // приветствия раньше срабатывало повторно (получалось "двойное приветствие").
        const hasRuGreeting = /^(Привет|Здравствуй|Здраствуй|Здравствуйте|Добрый\s+день|Приветик|Хай)\b/i.test(cleaned)
        const hasEnGreeting = /^(Hi|Hello|Hey|Greetings)\b/i.test(cleaned)
        const hasGreeting = targetLang === 'ru' ? hasRuGreeting : hasEnGreeting
        if (!hasGreeting) {
          cleaned = fallback
        }
      }

      return NextResponse.json({ content: cleaned })
    }

    // Защита от “обрубков” вида "What" / "Yes" и т.п.: считаем это некорректным ответом и просим повтор.
    const minimal = sanitized.trim()
    const looksTruncated =
      minimal.length < 12 ||
      /^(what|why|how|when|where|who|yes|no)\??\.?$/i.test(minimal)
    if (looksTruncated) {
      return NextResponse.json(
        { error: 'Модель вернула пустой ответ. Попробуйте отправить сообщение ещё раз.' },
        { status: 502 }
      )
    }

    const tenseValidation = validateDialogueOutputTense({
      content: sanitized,
      requiredTense: tutorGradingTense,
      priorAssistantContent: getLastAssistantContent(recentMessages),
      expectedNextQuestionTense: topic === 'free_talk' ? freeTalkExpectedNextQuestionTense : null,
    })
    const userClosedForcedRepeat =
      !forcedRepeatSentence ||
      isDialogueAnswerEffectivelyCorrect(lastUserContentForResponse, forcedRepeatSentence, tutorGradingTense)
    const canUseSoftNextQuestionFallback =
      mode === 'dialogue' &&
      topic === 'free_talk' &&
      !isFirstTurn &&
      !isTopicChoiceTurn &&
      Boolean(freeTalkExpectedNextQuestionTense) &&
      tenseValidation.reason === 'next_question_tense_mismatch' &&
      isUserLikelyCorrectForTense(lastUserContentForResponse, tutorGradingTense) &&
      userClosedForcedRepeat

    const valid = isValidTutorOutput({
      content: sanitized,
      mode,
      isFirstTurn,
      isTopicChoiceTurn: mode === 'dialogue' && isTopicChoiceTurn,
      requiredTense: tutorGradingTense,
      priorAssistantContent: getLastAssistantContent(recentMessages),
      expectedNextQuestionTense: topic === 'free_talk' ? freeTalkExpectedNextQuestionTense : null,
      forcedRepeatSentence,
      lastUserText: lastUserContentForResponse,
    })
    if (!valid) {
      if (canUseSoftNextQuestionFallback) {
        return NextResponse.json({
          content: fallbackNextQuestion({
            topic,
            tense: freeTalkExpectedNextQuestionTense!,
            level,
            audience,
            diversityKey: `${recentMessages.length}|${lastUserContentForResponse}`,
          }),
          dialogueCorrect: true,
        })
      }

      // Одна попытка repair/retry. Для OpenRouter это наиболее актуально.
      // UI и сценарии не меняем: просто не пропускаем служебный текст.
      const repairMessages = [...apiMessages]
      if (repairMessages[0]?.role === 'system') {
        repairMessages[0] = {
          role: 'system',
          content: buildRepairSystemPrefix() + (repairMessages[0].content ?? ''),
        }
      } else {
        repairMessages.unshift({ role: 'system', content: buildRepairSystemPrefix() + systemContent })
      }

      const res2 = await callProviderChat({ provider, req, apiMessages: repairMessages, maxTokens: communicationMaxTokens })
      if (res2.ok) {
        let repaired = sanitizeInstructionLeak(res2.content)
        if (repaired) {
          if (isMetaGarbage(repaired)) {
            return NextResponse.json({
              content: fallbackQuestionForContext({ topic, tense: tutorGradingTense, level, audience, isFirstTurn, isTopicChoiceTurn, lastUserText: lastUserContentForResponse }),
            })
          }
          repaired = stripOffContextCorrections(repaired, lastUserContentForResponse)
          repaired = normalizeAssistantPrefixForControlLines(repaired)
          repaired = splitCommentAndRepeatSameLine(repaired)
          repaired = normalizeVariantFormatting(repaired)
          repaired = stripPravilnoEverywhere(repaired)
          if (mode === 'dialogue') {
            repaired = replaceFalsePositiveDialogueRepeatWithPraise({
              content: repaired,
              userText: lastUserContentForResponse,
              requiredTense: tutorGradingTense,
              topic,
              level,
              audience,
            })
            repaired = alignDialogueArticleCommentWithRepeat({
              content: repaired,
              userText: lastUserContentForResponse,
              audience,
              level,
            })
          }
          repaired = stripRepeatOnPraise(repaired)
          repaired = ensureNextQuestionOnPraise(repaired, {
            mode,
            topic,
            tense: tutorGradingTense,
            level,
            audience,
            nextQuestionTense: freeTalkExpectedNextQuestionTense,
          })
          repaired = ensureNextQuestionWhenMissing(repaired, {
            mode,
            topic,
            tense: tutorGradingTense,
            level,
            audience,
            nextQuestionTense: freeTalkExpectedNextQuestionTense,
          })
          if (mode === 'dialogue') {
            repaired = normalizeAboutTodaySpacing(repaired)
            repaired = contextualizeTopicNextQuestionForLastAnswer(repaired, {
              topic,
              tense: tutorGradingTense,
              audience,
              lastUserContent: lastUserContentForResponse,
              contextMessages: recentMessages,
            })
            if (topic === 'free_talk' && isTopicChoiceTurn) {
              repaired = ensureFreeTalkTopicChoiceQuestionAnchorsUser({
                content: repaired,
                userText: lastUserContentForResponse,
                tense: tutorGradingTense,
              })
            }
            if (topic === 'free_talk') {
              const freeTalkTense = freeTalkExpectedNextQuestionTense ?? tutorGradingTense
              repaired = applyFreeTalkAntiRepeat({
                content: repaired,
                tense: freeTalkTense,
                audience,
                recentMessages,
                lastUserText: lastUserContentForResponse,
              })
            }
            repaired = await repairDialogueAllTenseRepeatMismatch({
              content: repaired,
              recentMessages,
              dialogueTenseForTurn: tutorGradingTense,
              forcedRepeatSentence,
              lastUserText: lastUserContentForResponse,
              systemContent,
              apiMessages,
              provider,
              req,
              maxTokens: communicationMaxTokens,
            })
          }
          if (mode === 'translation') {
            repaired = normalizeTranslationCommentStyle(repaired)
            if (isFirstTurn) {
              repaired = ensureFirstTranslationInvitation(repaired)
            } else {
              repaired = ensureTranslationProtocolBlocks(repaired, {
                tense: normalizedTense,
                topic,
                level,
                audience,
                fallbackPrompt: lastTranslationPrompt,
              })
              const repeatSentence = getTranslationRepeatSentence(repaired)
              repaired = enrichTranslationCommentQuality({
                content: repaired,
                userText: lastUserContentForResponse,
                repeatSentence,
                tense: normalizedTense,
              })
              repaired = replaceFalsePositiveTranslationErrorWithPraise({
                content: repaired,
                userText: lastUserContentForResponse,
              })
              repaired = keepOnlyCommentAndRepeatOnInvalidTranslationInput(repaired, !isFirstTranslationUserTurn)
              if (isUnrecognizedTranslationContext(repaired)) {
                repaired = 'Комментарий: Некорректный ввод. Введите правильный перевод полным предложением на английском языке.'
              }

              const repeatSentenceForConstruction = getTranslationRepeatSentence(repaired)
              if (repeatSentenceForConstruction && !isGenericTranslationRepeatFallback(repeatSentenceForConstruction)) {
                const coachText = buildTranslationConstructionCoachText(normalizedTense, repeatSentenceForConstruction)
                repaired = replaceTranslationConstructionLine(repaired, coachText)
              }
            }
          }
          const repairedValid = isValidTutorOutput({
            content: repaired,
            mode,
            isFirstTurn,
            isTopicChoiceTurn: mode === 'dialogue' && isTopicChoiceTurn,
            requiredTense: tutorGradingTense,
            priorAssistantContent: getLastAssistantContent(recentMessages),
            expectedNextQuestionTense: topic === 'free_talk' ? freeTalkExpectedNextQuestionTense : null,
            forcedRepeatSentence,
            lastUserText: lastUserContentForResponse,
          })
          if (repairedValid) {
            if (mode === 'translation') {
              repaired = applyTranslationCommentCoachVoice({
                content: repaired,
                audience,
                requiredTense: normalizedTense,
              })
              return NextResponse.json({ content: repaired })
            }
            return NextResponse.json({
              content: repaired,
              dialogueCorrect: isDialogueFinalCorrectResponse({
                content: repaired,
                userText: lastUserContentForResponse,
                requiredTense: tutorGradingTense,
              }),
            })
          }
        }
      }

      // Если repair не помог — безопасный fallback, чтобы не показывать мусор.
      if (canUseSoftNextQuestionFallback) {
        return NextResponse.json({
          content: fallbackNextQuestion({
            topic,
            tense: freeTalkExpectedNextQuestionTense!,
            level,
            audience,
          }),
          dialogueCorrect: true,
        })
      }
      if (mode === 'dialogue' && !isFirstTurn && !isTopicChoiceTurn && !isLowSignalDialogueInput(lastUserContentForResponse)) {
        if (userClosedForcedRepeat && isUserLikelyCorrectForTense(lastUserContentForResponse, tutorGradingTense)) {
          return NextResponse.json({
            content: fallbackNextQuestion({
              topic,
              tense: tutorGradingTense,
              level,
              audience,
              diversityKey: `${recentMessages.length}|${lastUserContentForResponse}`,
            }),
            dialogueCorrect: true,
          })
        }
        const inferredTense = getLastAssistantContent(recentMessages)
          ? inferTenseFromDialogueAssistantContent(getLastAssistantContent(recentMessages)!)
          : null
        const tenseName = inferredTense ? (TENSE_NAMES[inferredTense] ?? inferredTense) : null
        const lastQ = extractLastAssistantQuestionSentence(recentMessages)
        const soft = isSoftCommentTone(audience, level)
        const tryAgain = audience === 'child' ? 'Попробуй ещё раз!' : 'Попробуйте ещё раз.'
        const comment = tenseName
          ? soft
            ? `Комментарий: Тут нужно ответить в ${tenseName}. ${tryAgain}`
            : `Комментарий: Ответ нужно дать в ${tenseName}. Исправьте время и грамматику.`
          : soft
            ? `Комментарий: Тут что-то не так. ${tryAgain}`
            : 'Комментарий: Ошибка в грамматике или времени. Попробуйте ещё раз.'
        const nextQuestion = lastQ ?? fallbackNextQuestion({
          topic,
          tense: tutorGradingTense,
          level,
          audience,
          diversityKey: `${recentMessages.length}|${lastUserContentForResponse}`,
        })
        return NextResponse.json({ content: `${comment}\n${nextQuestion}` })
      }
      return NextResponse.json({
        content:
          mode === 'dialogue'
            ? (isFirstTurn || isTopicChoiceTurn)
              ? fallbackQuestionForContext({ topic, tense: tutorGradingTense, level, audience, isFirstTurn, isTopicChoiceTurn, lastUserText: lastUserContentForResponse })
              : buildDialogueLowSignalFallback({
                  messages: recentMessages,
                  topic,
                  tense: tutorGradingTense,
                  level,
                  audience,
                  forcedRepeatSentence,
                  lastUserText: lastUserContentForResponse,
                })
            : fallbackQuestionForContext({ topic, tense: normalizedTense, level, audience, isFirstTurn, isTopicChoiceTurn, lastUserText: lastUserContentForResponse }),
      })
    }

    if (mode === 'translation') {
      return NextResponse.json({ content: sanitized })
    }

    return NextResponse.json({
      content: sanitized,
      dialogueCorrect: isDialogueFinalCorrectResponse({
        content: sanitized,
        userText: lastUserContentForResponse,
        requiredTense: tutorGradingTense,
      }),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

