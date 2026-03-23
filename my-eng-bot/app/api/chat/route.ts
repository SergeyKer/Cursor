import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, TenseId } from '@/lib/types'
import { CHILD_TENSES } from '@/lib/constants'
import { DetectedLang, detectLangFromText } from '@/lib/detectLang'
import {
  getExpectedCommunicationReplyLang,
  isCommunicationDetailOnlyMessage,
  normalizeCommunicationDetailText,
} from '@/lib/communicationReplyLanguage'

// Важно для Vercel: роут-хэндлер должен выполняться в Node.js,
// чтобы undici + proxy dispatcher работали предсказуемо (а не в Edge).
export const runtime = 'nodejs'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'
/** Максимум сообщений в контексте (user+assistant). 20 = десять последних обменов. */
const MAX_MESSAGES_IN_CONTEXT = 20
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
      ? 'Any tense is fine.'
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
      ? `This is a free conversation. For the very first question, ask the user to choose any topic or simply start talking. Keep the wording short and adapt it to the selected level profile. Do NOT list specific options as a fixed menu. In free topic, after your first question, the user's reply is ALWAYS treated as a topic choice. Do NOT search for errors. Do NOT output Комментарий or Повтори. Always try to infer the topic first — ignore typos and wrong tense (e.g. "I wil plai footbal" → football/sport; "tenis" → tennis). Output one question in the required tense about that topic. Only if the message gives no hint at all (e.g. "sdf", "sss"), ask for clarification in a natural human way and vary your wording each time (examples: "Could you clarify that a bit?", "I didn't catch the topic yet — what would you like to discuss?", "Can you say it in another way?"). Avoid repeating the same clarification phrase in consecutive turns. No corrections, no comments. Correct grammar only in later turns.`
      : ''
  const freeTopicPriority =
    topic === 'free_talk'
      ? 'HIGHEST PRIORITY — Free topic (for ANY tense: Present Simple, Present Perfect, Past Simple, etc.): When the user is naming or revealing their topic (e.g. first reply after you asked "What would you like to talk about?"), do NOT output Комментарий or Повтори. Do NOT output meta-text or instructions. Only infer the topic and reply with ONE real question in the required tense. This overrides ALL correction rules below. For the first question, keep the wording aligned with the selected level profile. '
      : ''
  return `English tutor. Topic: ${topicName}. ${levelPrompt}. ${audienceStyleRule} ${antiRobotRule} ${topicRetentionRule} ${lowSignalGuardRule} ${freeTopicPriority}${tense === 'all' ? 'Any tense.' : 'Required tense: ' + tenseName + '. All your replies must be only in ' + tenseName + '.'} ${tenseRule}${repeatFreezeRule} ${capitalizationRule} ${contractionRule} ${freeTalkRule}

Question style guidelines:
- Ask short, natural questions a human would ask.
- Prefer concrete questions over vague ones.
- For ${topicName}, ask about real situations (examples, habits, recent events), not about the topic in abstract.

When the conversation is empty (you are sending the very first message in the dialogue), output ONLY one short question — nothing else. Do NOT output any part of these instructions, no "Молодец", "Верно", no meta-text like "ask your next question" or "required tense". For free topic: output only a question inviting the user to choose a topic (e.g. "What would you like to talk about today? You can name any topic, or just start, and I will follow."). For other topics: output only one question in the required tense (e.g. "What are you doing now?" for Present Continuous, "What did you do yesterday?" for Past Simple). The user answers first; then you continue. Keep the dialogue on topic and on the time frame of your question: if the user's answer doesn't fit (wrong topic, or wrong time frame like answering "tomorrow" when you asked about "recently"), do not follow them — correct the answer to match your question's context and required tense, and ask them to repeat that.

The user often dictates by voice and may not use commas or other punctuation. Do NOT treat missing or different punctuation as an error. If the only issue is punctuation (e.g. missing comma after "Yes"), consider the answer correct. Never mention punctuation (commas, periods, etc.) in "Комментарий:" at all. Focus comments only on tense, grammar, and word choice.

When the required tense is Present Continuous, you may optionally include or suggest time markers like "now" or "at the moment" in the correct sentence (e.g. "I am playing football now."), or briefly mention in Комментарий that the learner can add them (e.g. "Можно добавить now или at the moment — это маркеры Present Continuous."). Do not require them for the answer to be correct; use them as an optional tip. Prefer simple questions that translate clearly: e.g. ask "Where are you swimming?" or "What are you doing now?" rather than "What are you swimming in?" (the latter is ambiguous and translates poorly into Russian).

EXCEPTION for free topic (Свободная тема), for any tense: when the user is naming or revealing a topic (e.g. after you asked "What would you like to talk about?"), NEVER output Комментарий or Повтори. Always try to infer the topic first — ignore typos and wrong tense (e.g. "I wil plai footbal" → football, sport; "tenis", "vialint" → tennis, violin). Output exactly one question about that topic. Only if the message gives no hint at all (e.g. "sdf", random letters), ask for clarification in a natural human way and vary your wording across turns (do not repeat the same clarification sentence again and again). No error search, no corrections in that step.

CRITICAL — Context: Your correction (Комментарий/Говорится/Нужно слово/Повтори) must refer ONLY to the user's LAST message. Never output a correction about words or mistakes that are not in that message (e.g. if the user wrote "I usually swim in the pool", do NOT correct "movie" vs "move" — that is from another turn). If the last message has no errors, output only the next question in English.

This applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): you MUST correct the user's answer according to ALL applicable rules. Check every dimension: (1) required tense — if they used another tense, correct it; (2) grammar — word order, verb form, articles (a/an/the), plural/singular; (3) spelling — correct every misspelled word; (4) word choice — wrong word (e.g. "move" instead of "movie") must be fixed. The "Повтори:" sentence must fix ALL errors at once; the "Комментарий:" must briefly list ALL issues so the user sees what was wrong. Do not correct only one mistake and ignore others.

When there are grammar or spelling problems or the user used the wrong tense, respond ONLY in the short format below. Do NOT output long explanations of rules, lists of example questions (e.g. "Do you like pizza?", "What is your favorite color?"), or meta-instructions. Even if the user makes the same mistake again (e.g. wrong tense twice), reply only with Комментарий (1–2 short sentences in Russian) + Повтори: [correct sentence]. Keep the reply short. Do not use emojis, jokes, or playful tone in corrections — be neutral and clear (e.g. do not write "unless you're preparing for a spelling competition" or similar).

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
}): string {
  if (params.topic === 'free_talk') {
    if (params.isFirstTurn) {
      return params.audience === 'child' || params.level === 'starter' || params.level === 'a1'
        ? 'What do you want to talk about?'
        : 'What would you like to talk about today?'
    }
    if (params.isTopicChoiceTurn) {
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

  const praiseComment = /^\s*Комментарий\s*:\s*(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b/im
  if (!praiseComment.test(trimmed)) return content

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

function firstQuestionForTopicAndTense(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
}): string {
  const { topic, tense, level, audience } = params
  const isChild = audience === 'child'
  const isBasic = level === 'starter' || level === 'a1' || level === 'a2'

  const seed = stableHash32(`first_q|${topic}|${tense}|${level}|${audience}`)
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
      return pick([
        `${kidLead}Do you watch movies often?`,
        `${kidLead}What kind of movies do you like?`,
        `${kidLead}Do you watch series?`,
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
      return pick([
        `${kidLead}Do you like traveling?`,
        `${kidLead}Where do you usually go on trips?`,
        `${kidLead}What do you usually do on your trips?`,
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
    return pick([
      `${kidLead}What did you talk about ${t1} yesterday?`,
      `${kidLead}What did you talk about ${t1} last weekend?`,
      `${kidLead}What did you talk about ${t1} after school/work yesterday?`,
    ])
  }

  if (tense === 'future_simple') {
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
}): string {
  if (params.topic === 'free_talk') return defaultNextQuestion(params.tense)
  return firstQuestionForTopicAndTense({
    topic: params.topic,
    tense: params.tense,
    level: params.level,
    audience: params.audience,
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
  const praiseComment = /^\s*Комментарий\s*:\s*(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b/im
  if (!praiseComment.test(trimmed)) return text

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
}): string {
  if (params.mode !== 'dialogue') return content
  const trimmed = dropRussianMetaLinesOnPraise(content).trim()
  if (!trimmed) return content

  const praiseComment = /^\s*Комментарий\s*:\s*(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b/im
  if (!praiseComment.test(trimmed)) return content

  return fallbackNextQuestion(params)
}

function ensureNextQuestionWhenMissing(content: string, params: {
  mode: string
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
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

  return `${trimmed}\n${fallbackNextQuestion(params)}`
}

function extractLikelyEntityFromUserAnswer(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null
  const cleaned = raw.replace(/[.,!?;:]+$/g, '').replace(/\s+/g, ' ').trim()
  if (cleaned.length < 3 || cleaned.length > 60) return null
  if (!/[A-Za-zА-Яа-яЁё]/.test(cleaned)) return null

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

  const words = stripped.split(/\s+/).filter(Boolean)
  const tail = words.slice(-3).join(' ')
  if (!tail) return null
  if (!/^[A-Za-zА-Яа-яЁё'-]+(?:\s+[A-Za-zА-Яа-яЁё'-]+){0,2}$/.test(tail)) return null

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
}): string {
  if (params.topic === 'free_talk') return content
  if (!params.lastUserContent.trim()) return content
  if (params.tense === 'all') return content

  const entity = extractLikelyEntityFromUserAnswer(params.lastUserContent)
  if (!entity) return content

  const entityLower = entity.toLowerCase()
  const obj =
    params.topic === 'travel' || params.topic === 'culture' ? entityToPlaceNoun(entity) : entity.trim()

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
  if (questionLine.toLowerCase().includes(entityLower)) return content

  lines[qIdx] = replacement
  return lines.join('\n').trim()
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
}): boolean {
  const { content, mode, isFirstTurn } = params
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

  const hasComment = lines.some((l) => /^Комментарий\s*:/i.test(l))
  const hasRepeat = lines.some((l) => /^(Повтори|Repeat|Say)\s*:/i.test(l))

  // Первый ход диалога: только один вопрос (без Комментарий/Повтори).
  if (isFirstTurn) {
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
    if (word.length <= 2) return true
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

function getDialogueRepeatSentence(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  const repeatLine = lines.find((line) => /^(Повтори|Repeat|Say)\s*:/i.test(line))
  if (!repeatLine) return null
  const repeatText = repeatLine.replace(/^(Повтори|Repeat|Say)\s*:\s*/i, '').trim()
  return repeatText || null
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

function isUserLikelyCorrectForTense(userText: string, requiredTense: string): boolean {
  const lower = userText.trim().toLowerCase()
  if (!lower) return false

  switch (requiredTense) {
    case 'present_simple': {
      if (/\b(am|is|are)\s+[a-z]+ing\b/i.test(userText)) return false
      if (/\b(yesterday|ago|last|before|went|was|were|did|had|made|saw|took|came|got|gave|said|told|knew|thought|felt|left|kept|found|wrote|read|ran|drove|ate|drank|slept|spoke|bought|brought)\b/i.test(userText)) {
        return false
      }
      const lower = userText.trim().toLowerCase()

      // Agreement check for he/she/it at sentence start.
      const mPron = /^\s*(he|she|it)\s+([a-z]+)\b/i.exec(lower)
      if (mPron) {
        const verb = mPron[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      // Agreement check for "My/Your/His/Her + noun + verb".
      // Example: "My mother cooks ..." -> verb must be 3rd person singular.
      const mPoss = /^\s*(my|your|his|her)\s+[a-z]+\s+([a-z]+)\b/i.exec(lower)
      if (mPoss) {
        const verb = mPoss[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      // Agreement check for "a/an/the + noun + verb".
      const mDet = /^\s*(a|an|the)\s+[a-z]+\s+([a-z]+)\b/i.exec(lower)
      if (mDet) {
        const verb = mDet[2]
        if (/^(is|has|does)$/.test(verb)) return true
        return /(s|es)$/.test(verb)
      }

      // Для I/you/we/they в Present Simple не должны появляться 3rd person singular формы.
      const mPluralPron = /^\s*(i|you|we|they)\s+([a-z]+)\b/i.exec(lower)
      if (mPluralPron) {
        const verb = mPluralPron[2]
        if (/^(is|has|does)$/.test(verb)) return false
        if (/(s|es)$/.test(verb)) return false
        return true
      }

      // Fallback: if we can't infer 3rd-person singular, rely on tense markers only.
      return true
    }
    case 'present_continuous':
      return /\b(am|is|are)\s+[a-z]+ing\b/i.test(userText) && !/\b(was|were|did|had)\b/i.test(userText)
    case 'past_simple':
      return (
        /\b(went|was|were|did|had|made|saw|took|came|got|gave|said|told|knew|thought|felt|left|kept|found|wrote|read|ran|drove|ate|drank|slept|spoke|bought|brought)\b/i.test(
          userText
        ) || /\b[a-z]{3,}ed\b/i.test(userText)
      )
    case 'future_simple':
      return /\bwill\s+[a-z]/i.test(userText)
    case 'present_perfect':
      return /\b(have|has)\b/i.test(userText)
    case 'present_perfect_continuous':
      return /\b(have|has)\b.*\bbeen\b.*[a-z]+ing\b/i.test(userText)
    case 'past_perfect':
      return /\bhad\b/i.test(userText)
    case 'past_perfect_continuous':
      return /\bhad\b.*\bbeen\b.*[a-z]+ing\b/i.test(userText)
    case 'future_continuous':
      return /\bwill\s+be\b.*[a-z]+ing\b/i.test(userText)
    case 'future_perfect':
      return /\bwill\s+have\b/i.test(userText)
    case 'future_perfect_continuous':
      return /\bwill\s+have\s+been\b.*[a-z]+ing\b/i.test(userText)
    default:
      return true
  }
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

let cachedWindowsSystemProxyUrl: string | null | undefined

async function getWindowsSystemProxyUrl(): Promise<string | null> {
  // Cache to avoid registry reads on every request.
  if (cachedWindowsSystemProxyUrl !== undefined) return cachedWindowsSystemProxyUrl
  if (process.platform !== 'win32') {
    cachedWindowsSystemProxyUrl = null
    return null
  }

  try {
    const { execSync } = await import('child_process')
    const ps = [
      '$p=(Get-ItemProperty -Path \"HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\" -Name ProxyEnable,ProxyServer -ErrorAction SilentlyContinue);',
      'if(-not $p){\"\"} elseif($p.ProxyEnable -ne 1){\"\"} else {$p.ProxyServer}',
    ].join('')

    const out = execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, { encoding: 'utf8' }).trim()
    if (!out) {
      cachedWindowsSystemProxyUrl = null
      return null
    }

    // ProxyServer can be: "127.0.0.1:12334" or "http=127.0.0.1:12334;https=127.0.0.1:12334"
    const m = out.match(/([a-zA-Z0-9.\-]+):(\d{2,5})/)
    if (!m) {
      cachedWindowsSystemProxyUrl = null
      return null
    }
    const host = m[1]
    const port = m[2]
    cachedWindowsSystemProxyUrl = `http://${host}:${port}`
    return cachedWindowsSystemProxyUrl
  } catch {
    cachedWindowsSystemProxyUrl = null
    return null
  }
}

let cachedProxyUrlForAgent: string | null = null
let cachedProxyDispatcher: unknown = null

async function buildProxyFetchExtra(): Promise<Record<string, unknown>> {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    ''
  const resolvedProxyUrl = proxyUrl || (await getWindowsSystemProxyUrl())
  if (!resolvedProxyUrl) return {}

  // Кэшируем dispatcher, чтобы не создавать ProxyAgent на каждый запрос.
  if (resolvedProxyUrl === cachedProxyUrlForAgent && cachedProxyDispatcher) {
    return { dispatcher: cachedProxyDispatcher }
  }

  try {
    const undici = (await import('undici')) as unknown as {
      ProxyAgent: new (proxy: string) => unknown
    }
    cachedProxyDispatcher = new undici.ProxyAgent(resolvedProxyUrl)
    cachedProxyUrlForAgent = resolvedProxyUrl
    return { dispatcher: cachedProxyDispatcher }
  } catch {
    return {}
  }
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
}): string {
  const lastRepeat = extractLastAssistantRepeatSentence(params.messages)
  if (lastRepeat) {
    // Если ранее мы уже просили "Повтори:" и пользователь снова прислал шум,
    // считаем это провокацией и просим повторить ту же целевую фразу.
    return [
      'Комментарий: Некорректный ввод. Ответьте полным английским предложением.',
      `Повтори: ${lastRepeat}`,
    ].join('\n')
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

  // Для первого "низкосигнального" ввода UX: показываем комментарий + обычный следующий вопрос,
  // чтобы пользователь продолжал диалог, а не зацикливался на "Повтори:".
  return `Комментарий: Некорректный ввод. Ответьте полным английским предложением.\n${nextQuestion}`
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
    const tenseForTurn =
      isAnyTense || rawTenses.length === 0
        ? 'all'
        : rawTenses[stableHash32(JSON.stringify(recentMessages)) % rawTenses.length]
    const normalizedTense =
      audience === 'child' && !childAllowedTenses.has(tenseForTurn as TenseId) ? 'present_simple' : tenseForTurn
    if (mode === 'dialogue' && topic !== 'free_talk' && !isFirstTurn && isLowSignalDialogueInput(lastUserText)) {
      return NextResponse.json({
        content: buildDialogueLowSignalFallback({
          messages: recentMessages,
          topic,
          tense: normalizedTense,
          level,
          audience,
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
      tense: normalizedTense,
      audience,
      praiseStyleVariant,
      forcedRepeatSentence,
      communicationDetailLevel,
      communicationLanguageHint,
      communicationDetailOnly,
    })

    const topicChoicePrefix = mode === 'dialogue' && isTopicChoiceTurn
      ? 'This turn only: the user is naming their topic. Output ONLY one question in English — nothing else. Do NOT output "Комментарий:", "Отлично", "Молодец", "Верно", or any praise. Do NOT output "Правильно:" or "Повтори:". Infer the topic from their words (e.g. "I played tennis" → tennis; "i swam" → swimming) and ask exactly ONE question in the required tense. If the message gives no hint (e.g. "sdf"), ask what they mean. Your reply must be ONLY that one question, no other lines. Ignore all correction rules below for this turn.\n\n'
      : ''
    const systemContent = topicChoicePrefix + systemPrompt

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
        content: fallbackQuestionForContext({ topic, tense: normalizedTense, level, audience, isFirstTurn, isTopicChoiceTurn }),
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
        requiredTense: normalizedTense,
        topic,
        level,
        audience,
      })
    }
    sanitized = stripRepeatOnPraise(sanitized)
    sanitized = ensureNextQuestionOnPraise(sanitized, { mode, topic, tense: normalizedTense, level, audience })
    sanitized = ensureNextQuestionWhenMissing(sanitized, { mode, topic, tense: normalizedTense, level, audience })
    if (mode === 'dialogue') {
      sanitized = normalizeAboutTodaySpacing(sanitized)
      sanitized = contextualizeTopicNextQuestionForLastAnswer(sanitized, {
        topic,
        tense: normalizedTense,
        audience,
        lastUserContent: lastUserContentForResponse,
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

    const valid = isValidTutorOutput({ content: sanitized, mode, isFirstTurn })
    if (!valid) {
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
              content: fallbackQuestionForContext({ topic, tense: normalizedTense, level, audience, isFirstTurn, isTopicChoiceTurn }),
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
              requiredTense: normalizedTense,
              topic,
              level,
              audience,
            })
          }
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
          const repairedValid = isValidTutorOutput({ content: repaired, mode, isFirstTurn })
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
                requiredTense: normalizedTense,
              }),
            })
          }
        }
      }

      // Если repair не помог — безопасный fallback, чтобы не показывать мусор.
      return NextResponse.json({
        content: fallbackQuestionForContext({ topic, tense: normalizedTense, level, audience, isFirstTurn, isTopicChoiceTurn }),
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
        requiredTense: normalizedTense,
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

