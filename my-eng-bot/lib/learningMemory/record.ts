import { shouldSaveLanguageNoteSignal } from '@/lib/learningMemory/filter'
import { hashUtterance } from '@/lib/learningMemory/hash'
import { mapLearningSource } from '@/lib/learningMemory/mapSource'
import {
  clearSkillResolved,
  markSkillsResolved,
  saveLearningSignal,
} from '@/lib/learningMemory/storage'
import { RESOLVE_COOLDOWN_MS } from '@/lib/learningMemory/types'
import { extractTranslationErrorBlocks } from '@/lib/learningMemory/translationErrors'
import type { LanguageNote } from '@/lib/languageNote/types'
import type { AppMode, CommunicationVoiceInputMode } from '@/lib/types'
import { getLessonTopicCatalog } from '@/lib/lessonCatalog'

function scheduleIdle(fn: () => void): void {
  if (typeof window === 'undefined') return
  const run = () => {
    try {
      fn()
    } catch {
      /* never break UX */
    }
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => run())
    return
  }
  setTimeout(run, 0)
}

export function recordPracticeWrongSignal(params: {
  lessonId: string
  userAnswer: string
  targetAnswer?: string
  tagIds?: string[]
}): void {
  scheduleIdle(() => {
    const catalog = getLessonTopicCatalog().find((c) => c.id === params.lessonId)
    const skillTagIds = params.tagIds?.length
      ? params.tagIds
      : catalog?.tagIds?.length
        ? catalog.tagIds
        : [`lesson-${params.lessonId}`]
    saveLearningSignal({
      source: 'practice',
      detector: 'practice',
      utteranceHash: hashUtterance(`practice:${params.lessonId}:${params.userAnswer}`),
      rawTopicIds: skillTagIds,
      rawTopicTitles: skillTagIds.map((id) => catalog?.title ?? id),
      lessonIdHint: params.lessonId,
      skillTagIds,
      snippet: {
        original: params.userAnswer.slice(0, 120),
        corrected: params.targetAnswer?.slice(0, 120),
      },
    })
  })
}

export function recordDialogueWrongSignal(params: {
  userText: string
  tenses?: string[]
  topic?: string
}): void {
  scheduleIdle(() => {
    const skillTagIds =
      params.tenses && params.tenses.length > 0
        ? params.tenses.map((t) => t.replace(/_/g, '-'))
        : params.topic
          ? [params.topic]
          : ['guided-dialogue']
    saveLearningSignal({
      source: 'guided_dialogue',
      detector: 'dialogue_flag',
      utteranceHash: hashUtterance(params.userText),
      rawTopicIds: skillTagIds,
      rawTopicTitles: skillTagIds,
      lessonIdHint: null,
      skillTagIds,
      snippet: { original: params.userText.slice(0, 120) },
    })
  })
}

export function recordTranslationErrorSignal(params: {
  userText: string
  errorsBlock: string
  sayBlock?: string | null
}): void {
  const errors = params.errorsBlock.trim()
  if (!errors || errors === '-' || errors === '—') return
  scheduleIdle(() => {
    saveLearningSignal({
      source: 'translation',
      detector: 'translation_parse',
      utteranceHash: hashUtterance(params.userText),
      rawTopicIds: ['translation-errors'],
      rawTopicTitles: ['Перевод'],
      lessonIdHint: null,
      skillTagIds: ['translation-errors'],
      snippet: {
        original: params.userText.slice(0, 120),
        corrected: params.sayBlock?.slice(0, 120),
      },
    })
  })
}

export function recordLanguageNoteSignal(params: {
  note: LanguageNote
  mode: AppMode
  engvoVoiceMode?: boolean
  voiceMode?: CommunicationVoiceInputMode | null
}): void {
  const { note } = params
  if (
    !shouldSaveLanguageNoteSignal(
      note.status,
      note.original,
      params.voiceMode
    )
  ) {
    return
  }
  scheduleIdle(() => {
    const skillTagIds =
      note.reviewTopics.length > 0
        ? note.reviewTopics.map((t) => t.id)
        : note.lessonId
          ? [`lesson-${note.lessonId}`]
          : ['language-note']
    const source =
      params.engvoVoiceMode || params.mode === 'communication'
        ? mapLearningSource({
            mode: params.mode === 'communication' ? 'communication' : 'dialogue',
            engvoVoiceMode: params.engvoVoiceMode,
          })
        : 'language_note'
    // Prefer chat/call source when note comes from those modes
    const resolvedSource =
      params.engvoVoiceMode
        ? 'call'
        : params.mode === 'communication'
          ? 'chat'
          : 'language_note'
    saveLearningSignal({
      source: resolvedSource === 'language_note' ? source : resolvedSource,
      detector: 'language_note',
      utteranceHash: hashUtterance(note.original),
      rawTopicIds: note.reviewTopics.map((t) => t.id),
      rawTopicTitles: note.reviewTopics.map((t) => t.title),
      lessonIdHint: note.lessonId,
      skillTagIds,
      snippet: {
        original: note.original.slice(0, 120),
        corrected: note.correct.slice(0, 120),
      },
    })
    clearSkillResolved(skillTagIds)
  })
}

export function recordSilentAssessSignal(params: {
  note: LanguageNote
  source: 'chat' | 'call'
  voiceMode?: CommunicationVoiceInputMode | null
}): void {
  const { note } = params
  if (!shouldSaveLanguageNoteSignal(note.status, note.original, params.voiceMode)) return
  scheduleIdle(() => {
    const skillTagIds =
      note.reviewTopics.length > 0
        ? note.reviewTopics.map((t) => t.id)
        : ['spoken-fluency']
    saveLearningSignal({
      source: params.source,
      detector: 'silent_assess',
      utteranceHash: hashUtterance(note.original),
      rawTopicIds: note.reviewTopics.map((t) => t.id),
      rawTopicTitles: note.reviewTopics.map((t) => t.title),
      lessonIdHint: note.lessonId,
      skillTagIds,
      snippet: {
        original: note.original.slice(0, 120),
        corrected: note.correct.slice(0, 120),
      },
    })
    clearSkillResolved(skillTagIds)
  })
}

export function recordLessonOrPracticeResolved(params: {
  lessonId: string
  tagIds?: string[]
}): void {
  scheduleIdle(() => {
    const catalog = getLessonTopicCatalog().find((c) => c.id === params.lessonId)
    const skills = params.tagIds?.length
      ? params.tagIds
      : catalog?.tagIds ?? [`lesson-${params.lessonId}`]
    markSkillsResolved(skills, RESOLVE_COOLDOWN_MS)
  })
}

export function recordAssistantTurnLearningSignal(params: {
  mode: AppMode
  engvoVoiceMode?: boolean
  tenses?: string[]
  topic?: string
  lastUserText: string
  assistantContent: string
  dialogueCorrect?: boolean
}): void {
  if (params.mode === 'dialogue' && params.dialogueCorrect === false && params.lastUserText.trim()) {
    recordDialogueWrongSignal({
      userText: params.lastUserText,
      tenses: params.tenses,
      topic: params.topic,
    })
  }
  if (params.mode === 'translation' && params.lastUserText.trim()) {
    const { errorsBlock, sayBlock } = extractTranslationErrorBlocks(params.assistantContent)
    if (errorsBlock) {
      recordTranslationErrorSignal({
        userText: params.lastUserText,
        errorsBlock,
        sayBlock,
      })
    }
  }
}
