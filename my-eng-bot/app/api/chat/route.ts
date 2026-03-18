import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage } from '@/lib/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'
/** Максимум сообщений в контексте (user+assistant). 6 = три последних обмена. */
const MAX_MESSAGES_IN_CONTEXT = 6
/** Лимит токенов ответа. Запас увеличен, чтобы реже обрезать форматированные ответы. */
const MAX_RESPONSE_TOKENS = 512

const LEVEL_PROMPTS: Record<string, string> = {
  all: 'Adapt your language to the learner. Keep it clear and natural. Prefer simple wording unless the learner clearly uses more advanced English.',
  starter:
    'Use only very simple words and short sentences. Suitable for first-year learners or children.',
  a1: 'Use vocabulary and grammar appropriate for A1 (beginner).',
  a2: 'Use vocabulary and grammar appropriate for A2 (elementary).',
  b1: 'Use vocabulary and grammar appropriate for B1 (intermediate).',
  b2: 'Use vocabulary and grammar appropriate for B2 (upper intermediate).',
  c1: 'Use vocabulary and grammar appropriate for C1 (advanced).',
  c2: 'Use vocabulary and grammar appropriate for C2 (proficient).',
}

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

const FREE_TOPIC_INVITATIONS: string[] = [
  "What would you like to talk about today?",
  "What shall we talk about today?",
  "What's on your mind right now?",
  "What do you feel like chatting about?",
  "We can talk about anything — what topic do you want?",
  "Choose any topic you like — what would you like to discuss?",
  "Is there anything you'd like to talk about today?",
  "What would you like to discuss right now?",
  "Let's talk — what topic do you want?",
  "Pick a topic for today — what would you like to talk about?",
]

const TOPIC_SUBTOPICS: Record<string, string[]> = {
  business: ['meetings', 'clients', 'emails', 'your goals'],
  family_friends: ['your family', 'your friends', 'plans together', 'a recent conversation'],
  hobbies: ['your hobbies', 'how you spend free time', 'something new you tried', 'what you enjoy most'],
  movies_series: ['a movie you watched', 'a series you like', 'your favorite genre', 'what you watched recently'],
  music: ['your favorite music', 'a song you like', 'concerts', 'what you listen to lately'],
  sports: ['team sports', 'fitness', 'your workouts', 'something you did recently'],
  food: ['breakfast', 'cooking at home', 'restaurants', 'a new food you tried'],
  culture: ['books', 'art', 'traditions', 'events in your city'],
  daily_life: ['your routine', 'your day today', 'home chores', 'how you relax'],
  travel: ['a past trip', 'a place you want to visit', 'planning a trip', 'travel tips'],
  work: ['your tasks', 'projects', 'colleagues', 'what you do at work'],
  technology: ['apps you use', 'your phone/computer', 'AI tools', 'a tech problem you had'],
}

const SENTENCE_TYPE_NAMES: Record<string, string> = {
  general: 'affirmative (general)',
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

function firstMessageInviteSubtopic(params: { topic: string; audience: 'child' | 'adult' }): string {
  const { topic, audience } = params
  const topicName = TOPIC_NAMES[topic] ?? 'this topic'
  const subtopics = TOPIC_SUBTOPICS[topic] ?? ['something you like', 'something you did recently', 'your opinion']
  const seed = stableHash32(`first_subtopic_invite|${topic}|${audience}`)
  const pick = <T,>(variants: T[]) => variants[seed % variants.length] ?? variants[0]

  const a = subtopics[seed % subtopics.length] ?? subtopics[0] ?? 'something'
  const b = subtopics[(seed + 1) % subtopics.length] ?? subtopics[1] ?? a
  const c = subtopics[(seed + 2) % subtopics.length] ?? subtopics[2] ?? b

  if (audience === 'child') {
    return pick([
      `Let's talk about ${topicName}. What do you want: ${a}, ${b}, or ${c}?`,
      `We chose ${topicName}. What should we talk about: ${a}, ${b}, or ${c}?`,
      `Okay, ${topicName}! What do you want to focus on: ${a}, ${b}, or ${c}?`,
    ])
  }

  return pick([
    `We're talking about ${topicName}. What would you like to focus on — ${a}, ${b}, or ${c}?`,
    `Let's stick to ${topicName}. Which part do you want — ${a}, ${b}, or ${c}?`,
    `Topic today is ${topicName}. What do you want to talk about — ${a}, ${b}, or ${c}?`,
  ])
}

function buildSystemPrompt(params: {
  mode: string
  sentenceType?: string
  topic: string
  level: string
  tense: string
  audience?: 'child' | 'adult'
  praiseStyleVariant?: boolean
}): string {
  const { mode, sentenceType, topic, level, tense, audience = 'adult', praiseStyleVariant = false } = params
  const levelPrompt = LEVEL_PROMPTS[level] ?? LEVEL_PROMPTS.a1
  const tenseName = TENSE_NAMES[tense] ?? 'Present Simple'
  const topicName = TOPIC_NAMES[topic] ?? 'general'
  const sentenceTypeName = sentenceType ? SENTENCE_TYPE_NAMES[sentenceType] ?? 'mixed' : 'mixed'
  const audienceRule =
    audience === 'child'
      ? 'Audience: CHILD. Use friendly, simple, everyday English. Keep questions short and clear. Prefer concrete topics (school, friends, games, food). Avoid abstract wording.'
      : 'Audience: ADULT. Use natural conversational English. Keep questions clear and not overly formal.'
  const antiRobotRule =
    'Avoid robotic/formal connectors. NEVER use phrases like "related to", "when it comes to", "in terms of", or "regarding". Ask like a real person.'
  const topicRetentionRule =
    topic !== 'free_talk'
      ? `The conversation topic is ${topicName}. If the user's answer goes off this topic, do NOT follow their new topic. Ask the next question again about ${topicName} (or the subtopic they chose) and gently bring the conversation back.`
      : ''

  if (mode === 'translation') {
    return `Translation training. Topic: ${topicName}, ${levelPrompt}, ${sentenceTypeName}.

When the conversation is empty (you are sending the first message): output ONLY one Russian sentence and "Переведи на английский." Do NOT add praise, commentary, or the correct English translation. The user must answer first.

When the user has already sent their translation (there is a user message after your last one): reply with short praise or a correction tip, then give the NEXT Russian sentence and "Переведи на английский." Do not repeat the correct English for the previous sentence. Keep very short.`
  }
  const tenseRule =
    tense === 'all'
      ? 'Any tense is fine.'
      : `Strict: the user must answer in ${tenseName}. If they answer in another tense (e.g. Present Simple when ${tenseName} is required), ALWAYS treat it as an error: give "Комментарий: " with a short explanation in Russian that the answer must be in ${tenseName}, then "Повтори: " with the FULL corrected English sentence rewritten in ${tenseName}. Do NOT accept the answer and do NOT ask a new question until the user has repeated or answered in ${tenseName}. Do not praise a sentence that is in the wrong tense.

This rule applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): whatever tense is selected above is the ONLY tense you may use. You MUST use ONLY ${tenseName} in all your own sentences and questions. Never use any other tense in your replies. Reformulate any question so it uses ${tenseName} (e.g. for Present Continuous ask "What are you playing?" not "What do you like to play?"; for Past Simple ask "What did you do?" not "What do you usually do?"; and so on for any tense).

This applies to every tense: stick to the topic and time frame of YOUR question. Do NOT adopt the user's time frame if they answer with a different one (e.g. you asked about "recently" and they say "tomorrow"; you asked about "yesterday" and they say "next week"; you asked about "now" and they switch to the past). Your "Повтори:" sentence must be in ${tenseName} AND must match the context you asked about — never suggest a sentence in another tense or time frame. Examples: if you asked in Present Perfect about recent past, correct to "Yes, I have been to the cinema recently", not "I will go tomorrow"; if you asked in Past Simple about yesterday, correct to that context, not to "tomorrow" or "next week". Do not ask the user to repeat a sentence in a different tense or time frame than your question.`
  const capitalizationRule =
    'Completely ignore capitalization and punctuation in the USER answer. If the only difference is capitalization or missing commas/periods (e.g. "yes I stayed" vs "Yes, I stayed"), treat the answer as correct and do NOT add any comment about it. Never mention capital letters, commas, periods, or any punctuation in "Комментарий:" — never write things like "нужна запятая", "comma after Yes", etc. Do not correct or explain punctuation. The user often dictates by voice; focus only on tense, grammar, and wording. Your OWN replies must use normal English capitalization and punctuation.';
  const contractionRule =
    "Contractions are always acceptable. Treat contracted and expanded forms as equivalent, and NEVER mark them as errors or ask the user to repeat only because of contractions or apostrophes. Examples of equivalent pairs: I'm/I am, you're/you are, he's/he is, she's/she is, it's/it is, we're/we are, they're/they are, I've/I have, you've/you have, we've/we have, they've/they have, I'd/I would or I had, you'd/you would or you had, we'd/we would or we had, they'd/they would or they had, I'll/I will, you'll/you will, he'll/he will, she'll/she will, it'll/it will, we'll/we will, they'll/they will, can't/cannot, don't/do not, doesn't/does not, didn't/did not, won't/will not, isn't/is not, aren't/are not, wasn't/was not, weren't/were not. This includes both apostrophe characters: ' and ’. If the only difference from your preferred form is contraction vs expansion, treat the user answer as correct and continue.";
  const freeTalkRule =
    topic === 'free_talk'
      ? `This is a free conversation. For your very first question, invite the user to choose any topic or to just start talking. Vary the wording each time — use different phrasings, for example: "What would you like to talk about today? You can name any topic, or just start, and I will follow." / "What shall we talk about? Pick any topic or simply start — I'll join in." / "What's on your mind today? Any topic works, or just begin and I'll keep up." / "What would you like to discuss? Name a topic or start talking, and I'll follow." / "We can talk about anything. Name a topic or start, and I'll go with you." Do NOT list specific options as a fixed menu. In free topic, after your first question ("What would you like to talk about?"), the user's reply is ALWAYS treated as topic choice. Do NOT search for errors. Do NOT output Комментарий or Повтори. Always try to infer the topic first — ignore typos and wrong tense (e.g. "I wil plai footbal" → football/sport; "tenis" → tennis). Output one question in the required tense about that topic. Only if the message gives no hint at all (e.g. "sdf", "sss"), ask what they mean. No corrections, no comments. Correct grammar only in later turns.`
      : ''
  const freeTopicPriority =
    topic === 'free_talk'
      ? 'HIGHEST PRIORITY — Free topic (for ANY tense: Present Simple, Present Perfect, Past Simple, etc.): When the user is naming or revealing their topic (e.g. first reply after you asked "What would you like to talk about?"), do NOT output Комментарий or Повтори. Do NOT output meta-text or instructions. Only infer the topic and reply with ONE real question in the required tense. This overrides ALL correction rules below. '
      : ''
  return `English tutor. Topic: ${topicName}. ${levelPrompt}. ${audienceRule} ${antiRobotRule} ${topicRetentionRule} ${freeTopicPriority}${tense === 'all' ? 'Any tense.' : 'Required tense: ' + tenseName + '. All your replies must be only in ' + tenseName + '.'} ${tenseRule} ${capitalizationRule} ${contractionRule} ${freeTalkRule}

Question style guidelines:
- Ask short, natural questions a human would ask.
- Prefer concrete questions over vague ones.
- For ${topicName}, ask about real situations (examples, habits, recent events), not about the topic in abstract.

When the conversation is empty (you are sending the very first message in the dialogue), output ONLY one short question — nothing else. Do NOT output any part of these instructions, no "Молодец", "Верно", no meta-text like "ask your next question" or "required tense". For free topic: output only a question inviting the user to choose a topic (e.g. "What would you like to talk about today? You can name any topic, or just start, and I will follow."). For other topics: output only one question in the required tense (e.g. "What are you doing now?" for Present Continuous, "What did you do yesterday?" for Past Simple). The user answers first; then you continue. Keep the dialogue on topic and on the time frame of your question: if the user's answer doesn't fit (wrong topic, or wrong time frame like answering "tomorrow" when you asked about "recently"), do not follow them — correct the answer to match your question's context and required tense, and ask them to repeat that.

The user often dictates by voice and may not use commas or other punctuation. Do NOT treat missing or different punctuation as an error. If the only issue is punctuation (e.g. missing comma after "Yes"), consider the answer correct. Never mention punctuation (commas, periods, etc.) in "Комментарий:" at all. Focus comments only on tense, grammar, and word choice.

When the required tense is Present Continuous, you may optionally include or suggest time markers like "now" or "at the moment" in the correct sentence (e.g. "I am playing football now."), or briefly mention in Комментарий that the learner can add them (e.g. "Можно добавить now или at the moment — это маркеры Present Continuous."). Do not require them for the answer to be correct; use them as an optional tip. Prefer simple questions that translate clearly: e.g. ask "Where are you swimming?" or "What are you doing now?" rather than "What are you swimming in?" (the latter is ambiguous and translates poorly into Russian).

EXCEPTION for free topic (Свободная тема), for any tense: when the user is naming or revealing a topic (e.g. after you asked "What would you like to talk about?"), NEVER output Комментарий or Повтори. Always try to infer the topic first — ignore typos and wrong tense (e.g. "I wil plai footbal" → football, sport; "tenis", "vialint" → tennis, violin). Output exactly one question about that topic. Only if the message gives no hint at all (e.g. "sdf", random letters), ask what they mean. No error search, no corrections in that step.

CRITICAL — Context: Your correction (Комментарий/Говорится/Нужно слово/Повтори) must refer ONLY to the user's LAST message. Never output a correction about words or mistakes that are not in that message (e.g. if the user wrote "I usually swim in the pool", do NOT correct "movie" vs "move" — that is from another turn). If the last message has no errors, output only praise (Комментарий: Отлично! etc.) and the next question in English.

This applies to every tense (Present Simple, Present Continuous, Past Simple, Future Perfect, etc.): you MUST correct the user's answer according to ALL applicable rules. Check every dimension: (1) required tense — if they used another tense, correct it; (2) grammar — word order, verb form, articles (a/an/the), plural/singular; (3) spelling — correct every misspelled word; (4) word choice — wrong word (e.g. "move" instead of "movie") must be fixed. The "Повтори:" sentence must fix ALL errors at once; the "Комментарий:" must briefly list ALL issues so the user sees what was wrong. Do not correct only one mistake and ignore others.

When there are grammar or spelling problems or the user used the wrong tense, respond ONLY in the short format below. Do NOT output long explanations of rules, lists of example questions (e.g. "Do you like pizza?", "What is your favorite color?"), or meta-instructions. Even if the user makes the same mistake again (e.g. wrong tense twice), reply only with Комментарий (1–2 short sentences in Russian) + Повтори: [correct sentence]. Keep the reply short. Do not use emojis, jokes, or playful tone in corrections — be neutral and clear (e.g. do not write "unless you're preparing for a spelling competition" or similar).

FORMAT (strict):
1) When the user's answer has a real mistake (wrong tense, grammar, or wording): output ONLY two lines:
   - "Комментарий: " + a very short explanation in Russian (1–2 short sentences max). Briefly list ALL issues (tense, grammar, spelling, word choice). Do not mention capitalization or punctuation.
   - "Повтори: " + the FULL corrected English sentence (fixing all errors at once). Always write a complete sentence with normal punctuation.
   In this case do NOT add a follow‑up question — the user must repeat first.
2) When the user's answer is already correct: output "Комментарий: " + brief praise in Russian (e.g. "Комментарий: Отлично!") and then on the next line ask the next question in English. Do NOT output "Повтори:" for correct answers.${praiseStyleVariant ? ` Sometimes (not always) make the praise sound more human by adding ONE short extra clause to the SAME "Комментарий:" line (still in Russian), e.g. mention that the tense/grammar sounded natural. Optionally, in that same "Комментарий:" line, you may add one alternative version of the user's sentence with ONE extra adjective or adverb (keep it simple, level-appropriate), prefixed by "Вариант: ". Do NOT add extra lines for this; it must stay inside the same single "Комментарий:" line.` : ''}
2) When the user's answer is already correct: output "Комментарий: " + brief praise in Russian (e.g. "Комментарий: Отлично!") and then on the next line ask the next question in English. Do NOT output "Повтори:" for correct answers.${praiseStyleVariant ? ` Sometimes (not always) make the praise sound more human by adding ONE short extra clause to the SAME "Комментарий:" line (still in Russian), e.g. mention that the tense/grammar sounded natural. Optionally, you may add one alternative version of the user's sentence with ONE extra adjective or adverb (keep it simple, level-appropriate), prefixed by "*Возможный вариант: ...*". The whole "Возможный вариант" sentence MUST be in italics using asterisks. The variant can be on the same line as "Комментарий:" or on its own line, but do NOT add any other extra lines.` : ''}

Never add raw markers like **Correction:**, **Comment:**, **Right:** or similar anywhere in the visible text. The user should never see those words with asterisks.

Your reply must contain ONLY the actual content the user should see: a question in English, or (when correcting) only Комментарий: [Russian text] and Повтори: [sentence]. Never output any instructions, format descriptions, or meta-text. Never output numbering or labels like "FORMAT". Output only real questions, Комментарий, and Повтори lines.

If the user clearly asks YOU a simple personal-style question about preferences or experience (e.g. "And you?", "What is your favorite food?", "Do you like tea?"), you may briefly answer in the first person (1 short sentence in English) BEFORE or AFTER the user's correction block, and then still ask them the next question. The goal is to keep the conversation natural and two‑sided, but remember: the main focus is always on the user's practice, not on talking about yourself.

Never use "Tell me" or other English instruction phrases. After a correction, you may optionally add a short Russian prompt like "Повтори: " + the correct English sentence so the user can repeat it, but keep it separate from the \"Комментарий\" line.

Do NOT add any extra \"RU:\" line or full Russian translation of the whole reply. All visible text must be in English EXCEPT: (1) the \"Комментарий:\" line — always in Russian (including when the answer is correct: use \"Комментарий: Отлично!\" or \"Комментарий: Молодец!\" etc., then the next question in English).`
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
}): string {
  return params.topic === 'free_talk'
    ? defaultNextQuestion(params.tense)
    : firstQuestionForTopicAndTense({
        topic: params.topic,
        tense: params.tense,
        level: params.level,
        audience: params.audience,
      })
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
    return pick([
      `${kidLead}What do you usually do in your free time?`,
      `${kidLead}What do you usually do with ${t1}?`,
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
      `${kidLead}What have you done recently?`,
      `${kidLead}What new things have you tried recently?`,
      `${kidLead}What have you learned recently about ${t1}?`,
    ])
  }

  if (tense === 'present_continuous') {
    return pick([
      `${kidLead}What are you doing right now?`,
      `${kidLead}What are you doing at the moment?`,
      isBasic ? `${kidLead}What are you doing now?` : `${kidLead}What are you working on right now?`,
    ])
  }

  if (tense === 'past_simple') {
    return pick([
      `${kidLead}What did you do yesterday?`,
      `${kidLead}What did you do last weekend?`,
      `${kidLead}What did you do after school/work yesterday?`,
    ])
  }

  if (tense === 'future_simple') {
    return pick([
      `${kidLead}What will you do tomorrow?`,
      `${kidLead}What will you do this weekend?`,
      `${kidLead}What will you do next week?`,
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

/**
 * Страховка UX: иногда модель, даже при корректном ответе, даёт похвалу/мета‑фразу,
 * но не задаёт следующий вопрос или обрезает ответ ("AI: T"). По протоколу следующий вопрос обязателен.
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

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const hasRealQuestion = lines.some(
    (l) => l.length >= MIN_QUESTION_LENGTH && /\?\s*$/.test(l) && /[A-Za-z]/.test(l)
  )
  if (hasRealQuestion) return trimmed

  const withoutTruncated = dropTruncatedTrailingLines(trimmed)
  return `${withoutTruncated}\n${fallbackNextQuestion(params)}`
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
}): Promise<{ ok: true; content: string } | { ok: false; status: number; errText: string }> {
  const { provider, req, apiMessages } = params

  if (provider === 'openai') {
    const key = normalizeKey(process.env.OPENAI_API_KEY ?? '')
    if (!key) return { ok: false, status: 500, errText: 'Missing OPENAI_API_KEY' }
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: apiMessages,
        max_tokens: MAX_RESPONSE_TOKENS,
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
      max_tokens: MAX_RESPONSE_TOKENS,
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
    'Output only one of: (A) a single English question; (B) two lines: "Комментарий: ..." (Russian) + "Повтори: ..." (English); ' +
    '(C) two lines: "Комментарий: ..." (Russian) + next question in English.\n\n'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
    const provider: Provider = body.provider === 'openai' ? 'openai' : 'openrouter'
    const topic = body.topic ?? 'free_talk'
    let level = body.level ?? 'a1'
    const tense = body.tense ?? 'present_simple'
    const mode = body.mode ?? 'dialogue'
    const sentenceType = body.sentenceType ?? 'mixed'
    const audience: 'child' | 'adult' = body.audience === 'child' ? 'child' : 'adult'

    // Страховка: для "Ребёнок" в Свободной теме уровень не выше A2.
    // UI уже ограничивает это, но на сервере тоже фиксируем на случай старого localStorage/ручных запросов.
    if (audience === 'child' && topic === 'free_talk') {
      const allowed = new Set(['all', 'starter', 'a1', 'a2'])
      if (!allowed.has(String(level))) level = 'all'
    }

    // Страховка: для "Ребёнок" не допускаем Perfect Continuous (их нет в UI).
    // Если прилетело — мягко переводим на Present Simple.
    const disallowedTensesForChild = new Set([
      'present_perfect_continuous',
      'past_perfect_continuous',
      'future_perfect_continuous',
    ])
    const normalizedTense =
      audience === 'child' && disallowedTensesForChild.has(String(tense)) ? 'present_simple' : tense

    const recentMessages = messages
      .filter((m: ChatMessage) => m.role !== 'system')
      .slice(-MAX_MESSAGES_IN_CONTEXT)
    const lastUserText = recentMessages.filter((m) => m.role === 'user').pop()?.content ?? ''
    // Вариант 2 должен быть предсказуемым (не Math.random), чтобы баги воспроизводились и не "прыгали".
    const praiseStyleVariant =
      mode === 'dialogue' && (stableHash32(`${topic}|${level}|${tense}|${lastUserText}`) % 100) < 45

    const systemPrompt = buildSystemPrompt({
      mode,
      sentenceType,
      topic,
      level,
      tense: normalizedTense,
      audience,
      praiseStyleVariant,
    })

    // Жёсткая гарантия UX: если тема выбрана (не free_talk) и диалог пустой,
    // первая реплика ВСЕГДА должна удерживать выбранную тему.
    if (mode === 'dialogue' && topic !== 'free_talk' && recentMessages.length === 0) {
      return NextResponse.json({ content: firstMessageInviteSubtopic({ topic, audience }) })
    }

    // UX/perf: первый вопрос в режиме "Диалог" должен приходить мгновенно.
    // Для free_talk нет смысла ждать модель (может быть медленно/429), поэтому стартуем локальным вопросом.
    if (mode === 'dialogue' && topic === 'free_talk' && recentMessages.length === 0) {
      const idx = Math.floor(Math.random() * FREE_TOPIC_INVITATIONS.length)
      return NextResponse.json({ content: FREE_TOPIC_INVITATIONS[idx] ?? FREE_TOPIC_INVITATIONS[0] ?? 'What would you like to talk about today?' })
    }

    const isTopicChoiceTurn =
      topic === 'free_talk' &&
      recentMessages.length === 2 &&
      recentMessages[1]?.role === 'user'
    const topicChoicePrefix = isTopicChoiceTurn
      ? 'This turn only: the user is naming their topic. Output ONLY one question in English — nothing else. Do NOT output "Комментарий:", "Отлично", "Молодец", "Верно", or any praise. Do NOT output "Правильно:" or "Повтори:". Infer the topic from their words (e.g. "I played tennis" → tennis; "i swam" → swimming) and ask exactly ONE question in the required tense. If the message gives no hint (e.g. "sdf"), ask what they mean. Your reply must be ONLY that one question, no other lines. Ignore all correction rules below for this turn.\n\n'
      : ''
    const systemContent = topicChoicePrefix + systemPrompt

    // При пустом диалоге добавляем одно сообщение пользователя: часть провайдеров требует хотя бы один user turn
    const userTurnMessages =
      recentMessages.length > 0
        ? recentMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content }))
        : [{ role: 'user' as const, content: 'Start the conversation.' }]
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemContent },
      ...userTurnMessages,
    ]
    const res1 = await callProviderChat({ provider, req, apiMessages })
    if (!res1.ok) {
      const errText = res1.errText
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
          classifyOpenAiForbidden(errText) === 'unsupported_region'
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
    // Делаем мягкий fallback на следующий вопрос, чтобы UX не ломался.
    if (isMetaGarbage(sanitized)) {
      return NextResponse.json({ content: fallbackQuestionForContext({ topic, tense, level, audience }) })
    }
    const lastUserContentForResponse = recentMessages.filter((m: ChatMessage) => m.role === 'user').pop()?.content ?? ''
    sanitized = stripOffContextCorrections(sanitized, lastUserContentForResponse)
    sanitized = normalizeAssistantPrefixForControlLines(sanitized)
    sanitized = splitCommentAndRepeatSameLine(sanitized)
    sanitized = normalizeVariantFormatting(sanitized)
    sanitized = stripPravilnoEverywhere(sanitized)
    sanitized = stripRepeatOnPraise(sanitized)
    sanitized = ensureNextQuestionOnPraise(sanitized, { mode, topic, tense, level, audience })
    sanitized = ensureNextQuestionWhenMissing(sanitized, { mode, topic, tense, level, audience })
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Модель вернула некорректный ответ. Попробуйте отправить сообщение ещё раз.' },
        { status: 502 }
      )
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

    const isFirstTurn = recentMessages.length === 0
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

      const res2 = await callProviderChat({ provider, req, apiMessages: repairMessages })
      if (res2.ok) {
        let repaired = sanitizeInstructionLeak(res2.content)
        if (repaired) {
          if (isMetaGarbage(repaired)) {
            return NextResponse.json({ content: fallbackQuestionForContext({ topic, tense, level, audience }) })
          }
          repaired = stripOffContextCorrections(repaired, lastUserContentForResponse)
          repaired = normalizeAssistantPrefixForControlLines(repaired)
          repaired = splitCommentAndRepeatSameLine(repaired)
          repaired = normalizeVariantFormatting(repaired)
          repaired = stripPravilnoEverywhere(repaired)
          repaired = stripRepeatOnPraise(repaired)
          repaired = ensureNextQuestionOnPraise(repaired, { mode, topic, tense, level, audience })
          repaired = ensureNextQuestionWhenMissing(repaired, { mode, topic, tense, level, audience })
          const repairedValid = isValidTutorOutput({ content: repaired, mode, isFirstTurn })
          if (repairedValid) return NextResponse.json({ content: repaired })
        }
      }

      // Если repair не помог — безопасный fallback, чтобы не показывать мусор.
      return NextResponse.json({ content: fallbackQuestionForContext({ topic, tense, level, audience }) })
    }

    return NextResponse.json({ content: sanitized })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
