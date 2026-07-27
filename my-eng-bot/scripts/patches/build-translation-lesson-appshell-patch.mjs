import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, 'translation-lesson-appshell.json')

const pairs = [
  [
    `  SentenceType,
  Settings,
  TenseId,
  TopicId,
  UsageInfo,
} from '@/lib/types'`,
    `  SentenceType,
  Settings,
  TenseId,
  TopicId,
  TranslationDrillKind,
  UsageInfo,
} from '@/lib/types'`,
  ],
  [
    `import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'`,
    `import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'
import { TRANSLATION_MENU_COPY } from '@/lib/uiCopy/translationMenu'`,
  ],
  [
    `type MenuOpenSnapshot = {
  mode: AppMode
  audience: Audience
  topic?: TopicId
  tensesKey?: string
  sentenceType?: SentenceType
}

type LessonOverlayState = {
  title: string
  lines: string[]
}

function tensesToKey(tenses: TenseId[]): string {
  return [...tenses].sort().join(',')
}

function normalizeSingleTense(tenses: TenseId[], allowedTenses: TenseId[], fallback: TenseId): Settings['tenses'] {
  const allowedSet = new Set<TenseId>(allowedTenses)
  const picked = tenses.find((tense) => allowedSet.has(tense)) ?? fallback
  return [picked]
}

function buildMenuOpenSnapshot(s: Settings): MenuOpenSnapshot {
  if (s.mode === 'communication') {
    return { mode: s.mode, audience: s.audience }
  }
  return {
    mode: s.mode,
    audience: s.audience,
    topic: s.topic,
    tensesKey: tensesToKey(s.tenses),
    sentenceType: s.sentenceType,
  }
}

/** Режим не менялся; нужен ли перезапуск из‑за темы/времён/типа/аудитории (без уровня). */
function menuSettingsRestartNeeded(snap: MenuOpenSnapshot, current: Settings): boolean {
  if (current.mode === 'communication') {
    return snap.audience !== current.audience
  }
  if (current.mode === 'dialogue' || current.mode === 'translation') {
    return (
      snap.topic !== current.topic ||
      snap.tensesKey !== tensesToKey(current.tenses) ||
      snap.sentenceType !== current.sentenceType ||
      snap.audience !== current.audience
    )
  }
  return false
}`,
    `type MenuOpenSnapshot = {
  mode: AppMode
  audience: Audience
  topic?: TopicId
  tensesKey?: string
  sentenceType?: SentenceType
  translationDrillKind?: TranslationDrillKind
  translationLessonId?: string | null
}

type LessonOverlayState = {
  title: string
  lines: string[]
}

function tensesToKey(tenses: TenseId[]): string {
  return [...tenses].sort().join(',')
}

function normalizeSingleTense(tenses: TenseId[], allowedTenses: TenseId[], fallback: TenseId): Settings['tenses'] {
  const allowedSet = new Set<TenseId>(allowedTenses)
  const picked = tenses.find((tense) => allowedSet.has(tense)) ?? fallback
  return [picked]
}

function buildMenuOpenSnapshot(s: Settings): MenuOpenSnapshot {
  if (s.mode === 'communication') {
    return { mode: s.mode, audience: s.audience }
  }
  if (s.mode === 'translation') {
    return {
      mode: s.mode,
      audience: s.audience,
      topic: s.topic,
      tensesKey: tensesToKey(s.tenses),
      sentenceType: s.sentenceType,
      translationDrillKind: s.translationDrillKind ?? 'tense_drill',
      translationLessonId: s.translationLessonId ?? null,
    }
  }
  return {
    mode: s.mode,
    audience: s.audience,
    topic: s.topic,
    tensesKey: tensesToKey(s.tenses),
    sentenceType: s.sentenceType,
  }
}

/** Режим не менялся; нужен ли перезапуск из‑за темы/времён/типа/аудитории (без уровня). */
function menuSettingsRestartNeeded(snap: MenuOpenSnapshot, current: Settings): boolean {
  if (current.mode === 'communication') {
    return snap.audience !== current.audience
  }
  if (current.mode === 'dialogue' || current.mode === 'translation') {
    const baseChanged =
      snap.topic !== current.topic ||
      snap.tensesKey !== tensesToKey(current.tenses) ||
      snap.sentenceType !== current.sentenceType ||
      snap.audience !== current.audience
    if (current.mode === 'translation') {
      return (
        baseChanged ||
        (snap.translationDrillKind ?? 'tense_drill') !== (current.translationDrillKind ?? 'tense_drill') ||
        (snap.translationLessonId ?? null) !== (current.translationLessonId ?? null)
      )
    }
    return baseChanged
  }
  return false
}`,
  ],
  [
    `  /** Настройки при открытии меню: режим + поля для сравнения при закрытии (без уровня). */
  const menuOpenSnapshotRef = React.useRef<MenuOpenSnapshot | null>(null)`,
    `  /** Настройки при открытии меню: режим + поля для сравнения при закрытии (без уровня). */
  const menuOpenSnapshotRef = React.useRef<MenuOpenSnapshot | null>(null)
  /** Pin урока для ERROR-freeze при translationLessonId === 'all'. */
  const translationEffectiveLessonIdRef = React.useRef<string | null>(null)`,
  ],
  [
    `                dialogSeed: dialogSeedRef.current,
                ...(freeTalkTopicSelection ? { freeTalkTopicSuggestions: freeTalkTopicSelection.topics } : {}),
                ...(settings.mode === 'communication'
                  ? {
                      communicationInputExpectedLang:
                        communicationInputExpectedLangRef.current === 'en' ||
                        communicationInputExpectedLangRef.current === 'ru'
                          ? communicationInputExpectedLangRef.current
                          : 'ru',
                      communicationVoiceInputMode:
                        communicationVoiceInputMode === 'ru' ||
                        communicationVoiceInputMode === 'en' ||
                        communicationVoiceInputMode === 'mix'
                          ? communicationVoiceInputMode
                          : 'en',
                    }
                  : {}),
              }),`,
    `                dialogSeed: dialogSeedRef.current,
                ...(freeTalkTopicSelection ? { freeTalkTopicSuggestions: freeTalkTopicSelection.topics } : {}),
                ...(settings.mode === 'communication'
                  ? {
                      communicationInputExpectedLang:
                        communicationInputExpectedLangRef.current === 'en' ||
                        communicationInputExpectedLangRef.current === 'ru'
                          ? communicationInputExpectedLangRef.current
                          : 'ru',
                      communicationVoiceInputMode:
                        communicationVoiceInputMode === 'ru' ||
                        communicationVoiceInputMode === 'en' ||
                        communicationVoiceInputMode === 'mix'
                          ? communicationVoiceInputMode
                          : 'en',
                    }
                  : {}),
                ...(settings.mode === 'translation'
                  ? {
                      translationDrillKind: settings.translationDrillKind ?? 'tense_drill',
                      translationLessonId: settings.translationLessonId ?? null,
                      ...((settings.translationDrillKind ?? 'tense_drill') === 'lesson_topic' &&
                      settings.translationLessonId === 'all' &&
                      translationEffectiveLessonIdRef.current
                        ? { translationEffectiveLessonId: translationEffectiveLessonIdRef.current }
                        : {}),
                    }
                  : {}),
              }),`,
  ],
  [
    `              webSearchSources?: ChatMessage['webSearchSources']
              webSearchSourcesRequested?: boolean
              webSearchSourcesHiddenCount?: number
              webSearchTriggered?: boolean
            }
            try {
              data = (await res.json()) as {
                content?: string
                error?: string
                errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
                provider?: 'openrouter' | 'openai'
                dialogueCorrect?: boolean
                webSearchSources?: ChatMessage['webSearchSources']
                webSearchSourcesRequested?: boolean
                webSearchSourcesHiddenCount?: number
                webSearchTriggered?: boolean
              }`,
    `              webSearchSources?: ChatMessage['webSearchSources']
              webSearchSourcesRequested?: boolean
              webSearchSourcesHiddenCount?: number
              webSearchTriggered?: boolean
              translationEffectiveLessonId?: string
            }
            try {
              data = (await res.json()) as {
                content?: string
                error?: string
                errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
                provider?: 'openrouter' | 'openai'
                dialogueCorrect?: boolean
                webSearchSources?: ChatMessage['webSearchSources']
                webSearchSourcesRequested?: boolean
                webSearchSourcesHiddenCount?: number
                webSearchTriggered?: boolean
                translationEffectiveLessonId?: string
              }`,
  ],
  [
    `            if (text) {
              if (freeTalkTopicSelection) {
                saveFreeTalkTopicRotationState(freeTalkTopicSelection.nextState)
              }
              return {
                content: text,
                dialogueCorrect,
                webSearchSources: data.webSearchSources,
                webSearchSourcesRequested: data.webSearchSourcesRequested,
                webSearchSourcesHiddenCount: data.webSearchSourcesHiddenCount,
                webSearchTriggered: data.webSearchTriggered,
              }
            }`,
    `            if (text) {
              if (freeTalkTopicSelection) {
                saveFreeTalkTopicRotationState(freeTalkTopicSelection.nextState)
              }
              const effectiveLessonId =
                typeof data.translationEffectiveLessonId === 'string'
                  ? data.translationEffectiveLessonId.trim()
                  : ''
              if (effectiveLessonId) {
                translationEffectiveLessonIdRef.current = effectiveLessonId
              }
              return {
                content: text,
                dialogueCorrect,
                webSearchSources: data.webSearchSources,
                webSearchSourcesRequested: data.webSearchSourcesRequested,
                webSearchSourcesHiddenCount: data.webSearchSourcesHiddenCount,
                webSearchTriggered: data.webSearchTriggered,
                ...(effectiveLessonId ? { translationEffectiveLessonId: effectiveLessonId } : {}),
              }
            }`,
  ],
  [
    `  const restartChatForNewModeFromMenu = useCallback(() => {
    suppressSettingsChangeBannerRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = true
    setMessages([])
    setSettingsAtLastSend(null)`,
    `  const restartChatForNewModeFromMenu = useCallback(() => {
    suppressSettingsChangeBannerRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    dialogSeedRef.current = createDialogSeed()
    translationEffectiveLessonIdRef.current = null
    newDialogRef.current = true
    setMessages([])
    setSettingsAtLastSend(null)`,
  ],
  [
    `  function settingsDiffersFromLastSendForBanner(current: Settings, last: Settings | null): boolean {
    if (!last) return false
    const sameTenses =
      current.tenses.length === last.tenses.length &&
      current.tenses.every((t, i) => t === last.tenses[i])

    if (
      (current.mode === 'dialogue' && last.mode === 'dialogue') ||
      (current.mode === 'translation' && last.mode === 'translation')
    ) {
      const onlyLevelChanged =
        current.topic === last.topic &&
        sameTenses &&
        current.audience === last.audience &&
        current.sentenceType === last.sentenceType &&
        current.level !== last.level
      return onlyLevelChanged
    }

    if (current.topic !== last.topic || !sameTenses || current.level !== last.level) return true
    if (current.mode === 'translation' && last.mode === 'translation' && current.sentenceType !== last.sentenceType)
      return true
    return false
  }`,
    `  function settingsDiffersFromLastSendForBanner(current: Settings, last: Settings | null): boolean {
    if (!last) return false
    const sameTenses =
      current.tenses.length === last.tenses.length &&
      current.tenses.every((t, i) => t === last.tenses[i])
    const sameTranslationFocus =
      (current.translationDrillKind ?? 'tense_drill') === (last.translationDrillKind ?? 'tense_drill') &&
      (current.translationLessonId ?? null) === (last.translationLessonId ?? null)

    if (
      (current.mode === 'dialogue' && last.mode === 'dialogue') ||
      (current.mode === 'translation' && last.mode === 'translation')
    ) {
      const onlyLevelChanged =
        current.topic === last.topic &&
        sameTenses &&
        current.audience === last.audience &&
        current.sentenceType === last.sentenceType &&
        sameTranslationFocus &&
        current.level !== last.level
      return onlyLevelChanged
    }

    if (current.topic !== last.topic || !sameTenses || current.level !== last.level) return true
    if (current.mode === 'translation' && last.mode === 'translation' && current.sentenceType !== last.sentenceType)
      return true
    return false
  }`,
  ],
  [
    [
      "    const modeLabel =",
      "      settings.mode === 'dialogue' ? 'Диалог' : settings.mode === 'translation' ? 'Перевод' : 'Общение'",
      "    const selectedTense = settings.tenses[0] ?? 'present_simple'",
      "    const tenseLabel =",
      "      selectedTense === 'all'",
      "        ? 'Любое время'",
      "        : (TENSES.find((t) => t.id === selectedTense)?.label ?? selectedTense)",
      "    const levelEntry = LEVELS.find((l) => l.id === settings.level)",
      "    const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level",
      "    const normalizedLevelShort = settings.level === 'all' ? 'Все уровни' : levelShort",
      "    const topicLabel = TOPICS.find((t) => t.id === settings.topic)?.label",
      "    const shouldShowTopic =",
      "      includeTopic &&",
      "      Boolean(topicLabel) &&",
      "      !(settings.mode === 'dialogue' && settings.topic === 'free_talk')",
      "    if (shouldShowTopic && topicLabel) {",
      "      return `${modeLabel} - ${topicLabel}, ${tenseLabel}, ${normalizedLevelShort}`",
      "    }",
      "    return `${modeLabel} - ${tenseLabel}, ${normalizedLevelShort}`",
      "  }",
    ].join('\n'),
    [
      "    const modeLabel =",
      "      settings.mode === 'dialogue' ? 'Диалог' : settings.mode === 'translation' ? 'Перевод' : 'Общение'",
      "    const selectedTense = settings.tenses[0] ?? 'present_simple'",
      "    const tenseLabel =",
      "      selectedTense === 'all'",
      "        ? 'Любое время'",
      "        : (TENSES.find((t) => t.id === selectedTense)?.label ?? selectedTense)",
      "    const isTranslationLessonTopic =",
      "      settings.mode === 'translation' &&",
      "      (settings.translationDrillKind ?? 'tense_drill') === 'lesson_topic'",
      "    const translationLessonId = settings.translationLessonId ?? null",
      "    const translationFocusLabel = isTranslationLessonTopic",
      "      ? translationLessonId === 'all'",
      "        ? TRANSLATION_MENU_COPY.anyLesson",
      "        : translationLessonId",
      "          ? (getLessonTopicById(translationLessonId)?.title ?? TRANSLATION_MENU_COPY.lessonNotSelected)",
      "          : TRANSLATION_MENU_COPY.lessonNotSelected",
      "      : tenseLabel",
      "    const levelEntry = LEVELS.find((l) => l.id === settings.level)",
      "    const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level",
      "    const normalizedLevelShort = settings.level === 'all' ? 'Все уровни' : levelShort",
      "    const topicLabel = TOPICS.find((t) => t.id === settings.topic)?.label",
      "    const shouldShowTopic =",
      "      includeTopic &&",
      "      Boolean(topicLabel) &&",
      "      !(settings.mode === 'dialogue' && settings.topic === 'free_talk')",
      "    if (shouldShowTopic && topicLabel) {",
      "      return `${modeLabel} - ${topicLabel}, ${translationFocusLabel}, ${normalizedLevelShort}`",
      "    }",
      "    return `${modeLabel} - ${translationFocusLabel}, ${normalizedLevelShort}`",
      "  }",
    ].join('\n'),
  ],
]

// Clear pin when drill kind leaves lesson_topic / becomes tense_drill — insert near restart helper usage via a small effect after menuOpenSnapshotRef is awkward;
// instead patch ensureFirstMessage start and handleStartChatFromMenu / retryFirstMessage.
pairs.push([
  `  const ensureFirstMessage = useCallback(async () => {
    if (firstMessageInFlightRef.current) return
    firstMessageInFlightRef.current = true
    const requestId = ++firstMessageRequestIdRef.current
    const isNewDialog = newDialogRef.current
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })`,
  `  React.useEffect(() => {
    if ((settings.translationDrillKind ?? 'tense_drill') !== 'lesson_topic') {
      translationEffectiveLessonIdRef.current = null
    }
  }, [settings.translationDrillKind])

  const ensureFirstMessage = useCallback(async () => {
    if (firstMessageInFlightRef.current) return
    firstMessageInFlightRef.current = true
    const requestId = ++firstMessageRequestIdRef.current
    const isNewDialog = newDialogRef.current
    if (isNewDialog) {
      translationEffectiveLessonIdRef.current = null
    }
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })`,
])

pairs.push([
  `  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(true)
    setRetryMessage(null)`,
  `  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    translationEffectiveLessonIdRef.current = null
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(true)
    setRetryMessage(null)`,
])

fs.writeFileSync(outPath, JSON.stringify(pairs, null, 2), 'utf8')
console.log('Wrote', outPath, 'pairs:', pairs.length)
