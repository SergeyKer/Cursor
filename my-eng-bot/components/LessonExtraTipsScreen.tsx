'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import { resyncIosWebKitDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'
import { estimateIntroComposerMinHeight, LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { resolveLessonIntroPrimaryCtaLabel } from '@/lib/lessonIntroCtaCopy'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from '@/lib/lessonVariantCtaCopy'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import {
  buildFallbackLessonExtraTips,
  buildTipsStorageKey,
  detectNativeSpeechSwapAxis,
  getNativeSpeechSwapLabels,
  isValidCachedLessonExtraTips,
  toCachedLessonExtraTips,
  type CachedLessonExtraTips,
  type LessonExtraTips,
  type LessonTipCategory,
} from '@/lib/lessonExtraTips'
import type { AiProvider, Audience, LevelId, OpenAiChatPreset } from '@/lib/types'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { LessonIntro } from '@/types/lesson'

export type LessonExtraTipsFooterStatus =
  | 'idle'
  | 'cached'
  | 'fallback'
  | 'ready'
  | 'error'
  | 'more-loading'
  | 'more-ready'
  | 'quiz-correct'
  | 'quiz-error'

export type LessonExtraTipsSavedState = {
  lessonKey: string
  tips: LessonExtraTips | null
  expandedCategories: LessonTipCategory[]
  quizAnswers: Record<string, string>
  generated: boolean
}

type LessonExtraTipsScreenProps = {
  lessonKey: string
  intro: LessonIntro
  /** Фоновая подмена варианта structured-урока: блокируем CTA до готовности. */
  footerVariantRegenerating?: boolean
  variantPrepareProgress?: number
  variantPrepareLabel?: string
  intent?: TutorLearningIntent | null
  provider: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience: Audience
  level: LevelId
  lessonCefrLevel?: LessonCatalogLevel
  savedState: LessonExtraTipsSavedState | null
  onSavedStateChange: (state: LessonExtraTipsSavedState) => void
  onFooterStatusChange: (status: LessonExtraTipsFooterStatus) => void
  onBack: () => void
  onStartLesson: () => void
}

type TipsApiResponse = {
  tips?: LessonExtraTips
  generated?: boolean
  fallback?: boolean
  tooSimilar?: boolean
}

function emphasisBoostersLabel(
  examples: LessonExtraTips['cards'][number]['examples'],
  lessonCefrLevel?: LessonCatalogLevel
): string {
  const blob = examples.flatMap((ex) => [ex.wrong ?? '', ex.right, ex.note]).join(' ')
  const found = [...blob.matchAll(/\b(really|very|so|definitely|please)\b/gi)].map((m) => m[1].toLowerCase())
  const unique = [...new Set(found)]
  if (unique.length > 0) return unique.slice(0, 3).join(', ')
  return lessonCefrLevel === 'A1' ? 'really, very' : 'really, so'
}

function buildTrapDistractorAnswer(answer: string): string {
  const trimmed = answer.trim()
  const toInfinitiveMatch = trimmed.match(/\bto\s+([A-Za-z]+)([.!?])?$/)
  if (toInfinitiveMatch) {
    const [, verb, punctuation = ''] = toInfinitiveMatch
    if (verb.endsWith('s')) return trimmed
    return trimmed.replace(/\bto\s+[A-Za-z]+([.!?])?$/, `to ${verb}s${punctuation}`)
  }

  // who-questions: make a common agreement mistake instead of broken punctuation
  const whoLikesMatch = trimmed.match(/^Who\s+([A-Za-z]+)s(\b.*)$/i)
  if (whoLikesMatch) {
    const [, verbBase, tail] = whoLikesMatch
    return `Who ${verbBase}${tail}`
  }

  const punctuationMatch = trimmed.match(/^(.+?)([.!?])$/)
  if (punctuationMatch) {
    const [, base, punctuation] = punctuationMatch
    return `${base}s${punctuation}`
  }

  return `${trimmed}s`
}

function getInitialExpanded(categories: LessonTipCategory[]): Set<LessonTipCategory> {
  return new Set(categories.slice(0, 1))
}

function flattenTipItems(tips: LessonExtraTips): string[] {
  return tips.cards.flatMap((card) => [card.rule, ...card.examples.flatMap((example) => [example.wrong ?? '', example.right, example.note])])
}

function readCachedTips(storageKey: string): CachedLessonExtraTips | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidCachedLessonExtraTips(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedTips(storageKey: string, tips: LessonExtraTips, generated = true) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(toCachedLessonExtraTips(tips, generated)))
  } catch {
    // localStorage может быть недоступен в приватном режиме; UI всё равно работает через state.
  }
}

function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export default function LessonExtraTipsScreen({
  lessonKey,
  intro,
  footerVariantRegenerating = false,
  variantPrepareProgress = 0,
  variantPrepareLabel = LESSON_VARIANT_PREPARE_LOADING_LABEL,
  intent,
  provider,
  openAiChatPreset,
  audience,
  level,
  lessonCefrLevel,
  savedState,
  onSavedStateChange,
  onFooterStatusChange,
  onBack,
  onStartLesson,
}: LessonExtraTipsScreenProps) {
  const tipsPrimaryCtaLabel = footerVariantRegenerating
    ? variantPrepareLabel
    : resolveLessonIntroPrimaryCtaLabel({
        loadingLesson: false,
        footerVariantRegenerating,
      })

  const fallbackTips = useMemo(
    () => buildFallbackLessonExtraTips(intro, intent, lessonCefrLevel),
    [intent, intro, lessonCefrLevel]
  )
  const storageKey = useMemo(
    () => buildTipsStorageKey({ lessonKey, audience, level }),
    [audience, lessonKey, level]
  )
  const initialStateMatchesLesson = savedState?.lessonKey === lessonKey
  const [tips, setTips] = useState<LessonExtraTips>(() => (initialStateMatchesLesson && savedState?.tips ? savedState.tips : fallbackTips))
  const [tipsGenerated, setTipsGenerated] = useState<boolean>(() => (initialStateMatchesLesson ? Boolean(savedState?.generated) : false))
  const [expandedCategories, setExpandedCategories] = useState<Set<LessonTipCategory>>(() =>
    initialStateMatchesLesson && savedState?.expandedCategories.length
      ? new Set(savedState.expandedCategories)
      : getInitialExpanded(fallbackTips.cards.map((card) => card.category))
  )
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>(() =>
    initialStateMatchesLesson ? (savedState?.quizAnswers ?? {}) : {}
  )
  const [revealedTipAnswers, setRevealedTipAnswers] = useState<Set<LessonTipCategory>>(() => new Set())
  const [selectedTipAnswers, setSelectedTipAnswers] = useState<Record<string, string>>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshMarker, setRefreshMarker] = useState<string | null>(null)
  const [moreTipsNotice, setMoreTipsNotice] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const composerStackRef = useRef<HTMLDivElement>(null)
  const isIosWebKitClient = useMemo(
    () => typeof navigator !== 'undefined' && isIosWebKitBrowser(navigator.userAgent),
    []
  )
  const tipsComposerMinHeight = useMemo(() => {
    if (!isIosWebKitClient) return undefined
    return estimateIntroComposerMinHeight({ hasSecondaryChips: true })
  }, [isIosWebKitClient])

  useLayoutEffect(() => {
    if (!isIosWebKitClient) return
    return resyncIosWebKitDialogComposerStackHeight(composerStackRef.current)
  }, [footerVariantRegenerating, isIosWebKitClient, loadingMore, tips.cards.length, variantPrepareLabel])
  const quizRowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pendingQuizScrollRef = useRef<string | null>(null)
  const refreshMarkerTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (refreshMarkerTimeoutRef.current !== null) {
        window.clearTimeout(refreshMarkerTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const cached = readCachedTips(storageKey)
    if (savedState?.lessonKey === lessonKey && savedState.tips) {
      setTips(savedState.tips)
      setTipsGenerated(Boolean(savedState.generated))
      setExpandedCategories(
        savedState.expandedCategories.length
          ? new Set(savedState.expandedCategories)
          : getInitialExpanded(savedState.tips.cards.map((card) => card.category))
      )
      setQuizAnswers(savedState.quizAnswers)
      onFooterStatusChange(savedState.generated ? 'ready' : 'fallback')
      return
    }

    if (cached?.generated) {
      setTips(cached.tips)
      setTipsGenerated(true)
      setExpandedCategories(getInitialExpanded(cached.tips.cards.map((card) => card.category)))
      setQuizAnswers({})
      onFooterStatusChange('cached')
      return
    }

    setTips(fallbackTips)
    setTipsGenerated(false)
    setExpandedCategories(getInitialExpanded(fallbackTips.cards.map((card) => card.category)))
    setQuizAnswers({})
    onFooterStatusChange('fallback')
    // Синхронизируемся только при смене урока/ключа кэша; иначе parent-state будет перезапускать экран на каждый ответ quiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackTips, lessonKey, storageKey])

  useEffect(() => {
    onSavedStateChange({
      lessonKey,
      tips,
      expandedCategories: Array.from(expandedCategories),
      quizAnswers,
      generated: tipsGenerated,
    })
  }, [expandedCategories, lessonKey, onSavedStateChange, quizAnswers, tips, tipsGenerated])

  useEffect(() => {
    const pendingQuestionId = pendingQuizScrollRef.current
    if (!pendingQuestionId || !quizAnswers[pendingQuestionId]) return

    const frameId = window.requestAnimationFrame(() => {
      quizRowRefs.current[pendingQuestionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
      pendingQuizScrollRef.current = null
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [quizAnswers])

  const handleToggleCategory = (category: LessonTipCategory) => {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleQuizAnswer = (questionId: string, answer: string, correctAnswer: string) => {
    pendingQuizScrollRef.current = questionId
    setQuizAnswers((current) => ({ ...current, [questionId]: answer }))
    onFooterStatusChange(normalizeAnswer(answer) === normalizeAnswer(correctAnswer) ? 'quiz-correct' : 'quiz-error')
  }

  const handleToggleTipAnswer = (category: LessonTipCategory) => {
    setRevealedTipAnswers((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleSelectTipAnswer = (category: LessonTipCategory, answer: string) => {
    setSelectedTipAnswers((current) => ({ ...current, [category]: answer }))
    setRevealedTipAnswers((current) => new Set(current).add(category))
  }

  const handleGenerateMore = async () => {
    if (loadingMore) return
    const requestId = ++requestIdRef.current
    setLoadingMore(true)
    setMoreTipsNotice(null)
    onFooterStatusChange('more-loading')
    try {
      const response = await fetch('/api/lesson-extra-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          openAiChatPreset,
          audience,
          level,
          lessonCefrLevel,
          intro,
          intent,
          mode: 'refresh',
          previousItems: flattenTipItems(tips),
          currentTips: tips,
        }),
      })
      const data = (await response.json()) as TipsApiResponse
      if (requestId !== requestIdRef.current) return
      if (response.ok && data.tips && data.generated && !data.fallback) {
        setTips(data.tips)
        setTipsGenerated(true)
        setQuizAnswers({})
        writeCachedTips(storageKey, data.tips, true)
        setRefreshMarker('Новый ракурс по теме')
        setMoreTipsNotice(null)
        if (refreshMarkerTimeoutRef.current !== null) {
          window.clearTimeout(refreshMarkerTimeoutRef.current)
        }
        refreshMarkerTimeoutRef.current = window.setTimeout(() => {
          setRefreshMarker(null)
          refreshMarkerTimeoutRef.current = null
        }, 2600)
        onFooterStatusChange('more-ready')
        window.requestAnimationFrame(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = 0
          }
        })
        return
      }
      if (response.ok && data.tooSimilar) {
        setMoreTipsNotice('Новый набор слишком похож на текущий. Попробуйте ещё раз через минуту.')
        onFooterStatusChange('more-ready')
        return
      }
      setMoreTipsNotice('Не удалось обновить фишки. Попробуйте ещё раз.')
      onFooterStatusChange('error')
    } catch {
      if (requestId === requestIdRef.current) {
        onFooterStatusChange('error')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false)
      }
    }
  }

  return (
    <LessonReadingShell
      scrollRef={scrollAreaRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} scroll-smooth chat-feed-wallpaper py-2.5 sm:py-3`}
      composerStackRef={composerStackRef}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{
        paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
        ...(tipsComposerMinHeight != null ? { minHeight: tipsComposerMinHeight } : {}),
      }}
      composer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:from-white hover:to-sky-100"
            >
              К уроку
            </button>
            <button
              type="button"
              onClick={handleGenerateMore}
              disabled={loadingMore}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--chat-control-hover)] bg-[var(--chat-control-bg)] px-3 py-2 text-sm font-semibold text-[var(--chat-control-text)] shadow-sm transition hover:bg-[var(--chat-control-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Генерирую...' : 'Ещё фишки'}
            </button>
          </div>
          <ProgressCtaButton
            onClick={onStartLesson}
            disabled={loadingMore || footerVariantRegenerating}
            busy={footerVariantRegenerating}
            progress={footerVariantRegenerating ? variantPrepareProgress : null}
            ghostLabel={footerVariantRegenerating ? variantPrepareLabel : undefined}
          >
            {tipsPrimaryCtaLabel}
          </ProgressCtaButton>
        </div>
      }
    >
              <div className="lesson-enter mb-2.5 flex items-center gap-2 rounded-[1.25rem] border border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-slate)] px-3 py-2 shadow-sm">
                <span className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-600">Фишки</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
                <h2 className="min-w-0 truncate text-[15px] font-semibold leading-tight text-[var(--text)]">{tips.topic}</h2>
              </div>
              {refreshMarker && (
                <div className="lesson-enter mb-2 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm">
                  {refreshMarker}
                </div>
              )}
              {moreTipsNotice && (
                <div className="lesson-enter mb-2 rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm">
                  {moreTipsNotice}
                </div>
              )}

              <div className="space-y-2.5">
                {tips.cards.map((card, index) => {
                  const expanded = expandedCategories.has(card.category)
                  const visibleExamples = expanded ? card.examples : card.examples.slice(0, 2)
                  const nativeSpeechSwap = card.examples[0]
                  const nativeSpeechTip = card.examples[1] ?? nativeSpeechSwap
                  const russianTrapCalque = card.examples[0]
                  const russianTrapCheck = card.examples[1] ?? russianTrapCalque
                  const questionMistake = card.examples[0]
                  const questionFix = card.examples[1] ?? questionMistake
                  const emphasisBoost = card.examples[0]
                  const emphasisExamples = card.examples.slice(0, 2)
                  const contextStylePair = card.examples[0]
                  const contextStyleRule = card.examples[1] ?? contextStylePair
                  const isNativeSpeech = card.category === 'native_speech'
                  const isRussianTraps = card.category === 'russian_traps'
                  const isQuestionMistakes = card.category === 'questions_negatives'
                  const isEmphasisEmotion = card.category === 'emphasis_emotion'
                  const isContextCulture = card.category === 'context_culture'
                  const nativeSpeechSwapLabels =
                    isNativeSpeech && nativeSpeechSwap
                      ? getNativeSpeechSwapLabels(detectNativeSpeechSwapAxis(nativeSpeechSwap, intro, tips.topic))
                      : null
                  const isStructuredTip = isNativeSpeech || isRussianTraps || isQuestionMistakes || isEmphasisEmotion || isContextCulture
                  const tipAnswerRevealed = revealedTipAnswers.has(card.category)
                  const selectedTipAnswer = selectedTipAnswers[card.category]
                  const selectedTrapAnswerCorrect = normalizeAnswer(selectedTipAnswer ?? '') === normalizeAnswer(russianTrapCheck?.right ?? '')
                  return (
                    <section
                      key={card.category}
                      className="lesson-enter chat-section-surface glass-surface overflow-hidden rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(card.category)}
                        className="flex w-full items-start justify-between gap-3 bg-white px-3 py-2.5 text-left"
                      >
                        <span className="flex min-w-0 gap-2">
                          {!isStructuredTip && (
                            <span
                              className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--chat-section-neutral)] text-[13px] shadow-sm"
                              aria-hidden
                            >
                              {card.icon}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold leading-tight text-[var(--text)]">
                              {isNativeSpeech
                                ? `🎧 ${card.title}`
                                : isRussianTraps
                                  ? `🪤 ${card.title}`
                                  : isQuestionMistakes
                                    ? `❌ ${card.title}`
                                    : isEmphasisEmotion
                                      ? `✨ ${card.title}`
                                      : isContextCulture
                                        ? `📍 ${card.title}`
                                      : card.title}
                            </span>
                            {!isStructuredTip && <span className="mt-1 block text-[13px] leading-[1.35] text-slate-600">{card.rule}</span>}
                          </span>
                        </span>
                        {!isStructuredTip && (
                          <span
                            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50 text-sm font-semibold text-slate-600 shadow-sm transition ${
                              expanded ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                          >
                            ⌄
                          </span>
                        )}
                      </button>
                      <div className="divide-y divide-slate-200 border-t border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)] px-3">
                        {isNativeSpeech && nativeSpeechSwap ? (
                          <div className="space-y-2 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">🔁 Живая подмена</p>
                              <div className="mt-1 space-y-1.5 break-words">
                                {nativeSpeechSwap.wrong ? (
                                  <p>
                                    <span className="font-semibold text-slate-700">
                                      {nativeSpeechSwapLabels?.wrongLabel ?? 'Так чаще в учебнике / длиннее:'}
                                    </span>{' '}
                                    {nativeSpeechSwap.wrong}
                                  </p>
                                ) : null}
                                <p>
                                  <span className="font-semibold text-slate-700">
                                    {nativeSpeechSwapLabels?.rightLabel ?? 'Так чаще вслух / короче:'}
                                  </span>{' '}
                                  {nativeSpeechSwap.right}
                                </p>
                                {nativeSpeechSwap.note ? (
                                  <p className="mt-1 break-words text-slate-600">{nativeSpeechSwap.note}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">💡 Логика носителя</p>
                              <p className="mt-1 break-words">{card.rule}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">⚡ Быстрый приём</p>
                              {nativeSpeechTip.wrong && <p className="mt-1 break-words text-slate-600">Попробуй заменить: {nativeSpeechTip.wrong}</p>}
                              <button
                                type="button"
                                onClick={() => handleToggleTipAnswer(card.category)}
                                className={`mt-2 rounded-xl border text-left transition hover:bg-white ${
                                  tipAnswerRevealed
                                    ? 'w-full border-dashed border-slate-300 bg-slate-50 px-3 py-2'
                                    : 'inline-flex items-center rounded-full border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm'
                                }`}
                              >
                                {tipAnswerRevealed ? (
                                  <>
                                    <span className="block break-words font-semibold text-slate-800">{nativeSpeechTip.right}</span>
                                    <span className="mt-1 block break-words text-sm text-slate-600">{nativeSpeechTip.note}</span>
                                  </>
                                ) : (
                                  <span>✓ Открыть вариант</span>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : isRussianTraps && russianTrapCalque ? (
                          <div className="space-y-2 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">🪤 Классическая калька</p>
                              {russianTrapCalque.wrong && (
                                <p className="mt-1 break-words">
                                  <span className="font-semibold text-slate-700">Ошибочно:</span> {russianTrapCalque.wrong}
                                </p>
                              )}
                              <p className="mt-1 break-words">
                                <span className="font-semibold text-slate-700">Правильно:</span> {russianTrapCalque.right}
                              </p>
                              <p className="mt-1 break-words text-slate-600">{russianTrapCalque.note}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">🔄 Как переключить мышление</p>
                              <p className="mt-1 break-words">{card.rule}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">⚡ Проверка за 3 секунды - выбери</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[russianTrapCheck.right, buildTrapDistractorAnswer(russianTrapCheck.right)].map((option) => {
                                  const isSelected = selectedTipAnswer === option
                                  const isCorrect = normalizeAnswer(option) === normalizeAnswer(russianTrapCheck.right)
                                  return (
                                    <button
                                      type="button"
                                      key={option}
                                      onClick={() => handleSelectTipAnswer(card.category, option)}
                                      className={`rounded-xl border px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 ${
                                        isSelected
                                          ? isCorrect
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-amber-300 bg-amber-50 text-amber-800'
                                          : 'border-slate-200 bg-white text-slate-700'
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  )
                                })}
                              </div>
                              {tipAnswerRevealed && selectedTipAnswer && (
                                <p className={`mt-2 text-sm leading-5 ${selectedTrapAnswerCorrect ? 'text-emerald-700' : 'text-amber-800'}`}>
                                  {selectedTrapAnswerCorrect ? '✅' : '❌'} {russianTrapCheck.note}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : isQuestionMistakes && questionMistake ? (
                          <div className="space-y-2 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">❌ Типичный промах</p>
                              {questionMistake.wrong && <p className="mt-1 break-words">{questionMistake.wrong}</p>}
                              <p className="mt-1 break-words font-semibold text-slate-800">{questionMistake.right}</p>
                              <p className="mt-1 break-words text-slate-600">{questionMistake.note}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">🔍 Почему так выходит</p>
                              <p className="mt-1 break-words">{card.rule}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">✅ Фикс за 5 секунд</p>
                              {tipAnswerRevealed ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white"
                                >
                                  <p className="break-words font-semibold text-slate-800">Сначала проверь: нужен ли do/does/did?</p>
                                  <p className="mt-1 break-words text-slate-600">{questionFix.right}</p>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                >
                                  ✓ Показать фикс
                                </button>
                              )}
                            </div>
                          </div>
                        ) : isEmphasisEmotion && emphasisBoost ? (
                          <div className="space-y-2 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="emoji-line font-bold text-slate-800">🔥 Усилители для этой темы</p>
                              <p className="mt-1 break-words">
                                <span className="font-semibold text-slate-700">Слова:</span>{' '}
                                {emphasisBoostersLabel(card.examples, lessonCefrLevel)}
                              </p>
                              <p className="mt-1 break-words text-slate-600">{emphasisBoost.note}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">💬 Живые примеры</p>
                              {emphasisExamples.map((example, exampleIndex) => (
                                <div key={`${card.category}-emphasis-${exampleIndex}-${example.right}`} className="mt-2 first:mt-0">
                                  {example.wrong && (
                                    <p className="break-words">
                                      <span className="font-semibold text-slate-700">Фраза:</span> {example.wrong}
                                    </p>
                                  )}
                                  <p className="mt-1 break-words font-semibold text-slate-800">{example.right}</p>
                                  <p className="mt-1 break-words text-slate-600">{example.note}</p>
                                </div>
                              ))}
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">⚡ Быстрый приём</p>
                              {tipAnswerRevealed ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white"
                                >
                                  <p className="break-words text-slate-800">
                                    Добавь really для мягкой оценки, so для живой реакции, definitely для уверенности.
                                  </p>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                >
                                  ✓ Показать приём
                                </button>
                              )}
                            </div>
                          </div>
                        ) : isContextCulture && contextStylePair ? (
                          <div className="space-y-2 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">📱 Чат и работа</p>
                              {contextStylePair.wrong && (
                                <p className="mt-1 break-words">
                                  <span className="font-semibold text-slate-700">Чат:</span> {contextStylePair.wrong}
                                </p>
                              )}
                              <p className="mt-1 break-words">
                                <span className="font-semibold text-slate-700">Работа:</span> {contextStylePair.right}
                              </p>
                              <p className="mt-1 break-words text-slate-600">{contextStylePair.note}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">🌍 Культурный нюанс</p>
                              <p className="mt-1 break-words">{card.rule}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                              <p className="font-bold text-slate-800">✅ Правило выбора</p>
                              {tipAnswerRevealed ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white"
                                >
                                  <p className="break-words text-slate-800">
                                    {contextStyleRule.note}
                                  </p>
                                  <p className="mt-1 break-words text-slate-600">{contextStyleRule.right}</p>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleTipAnswer(card.category)}
                                  className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                                >
                                  ✓ Показать правило
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          visibleExamples.map((example, exampleIndex) => (
                            <div
                              key={`${card.category}-${exampleIndex}-${example.right}`}
                              className="py-2.5 text-[15px] leading-[1.45] text-[var(--text)]"
                            >
                              <>
                                <p className="break-words rounded-2xl bg-white px-3 py-2 text-[15px] leading-[1.45] text-[var(--text)] shadow-sm">
                                  {example.right}
                                </p>
                                <p className="mt-1.5 px-1 text-[15px] leading-[1.45] text-[var(--text)]">{example.note}</p>
                                {example.wrong && (
                                  <p className="mt-1 px-1 text-[15px] leading-[1.45] text-[var(--text)]">
                                    <span className="font-semibold text-slate-700">Не так:</span> {example.wrong}
                                  </p>
                                )}
                              </>
                            </div>
                          ))
                        )}
                        {card.category !== 'native_speech' && card.examples.length > 2 && (
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(card.category)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              {expanded ? 'Свернуть примеры ↑' : `Показать ещё ${card.examples.length - 2} ↓`}
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>

              <section className="lesson-enter chat-section-surface glass-surface mt-2.5 overflow-hidden rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]">
                <div className="border-b border-[var(--chat-section-neutral-border)] bg-[#F0FDF4] px-3 py-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-700">Проверь себя</h3>
                </div>
                <div className="divide-y divide-slate-200 bg-white px-3">
                  {tips.quiz.map((question, index) => {
                    const selected = quizAnswers[question.id]
                    const answered = Boolean(selected)
                    const correct = answered && normalizeAnswer(selected) === normalizeAnswer(question.correctAnswer)
                    return (
                      <div
                        key={question.id}
                        className="py-2.5"
                        ref={(node) => {
                          quizRowRefs.current[question.id] = node
                        }}
                        style={{ scrollMarginBottom: '0.625rem' }}
                      >
                        <p className="text-[15px] font-semibold leading-[1.45] text-[var(--text)]">
                          {index + 1}. {question.question}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <button
                              type="button"
                              key={option}
                              onClick={() => handleQuizAnswer(question.id, option, question.correctAnswer)}
                              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                                selected === option
                                  ? correct
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-300 bg-amber-50 text-amber-800'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {answered && (
                          <p className={`mt-2 text-sm leading-5 ${correct ? 'text-emerald-700' : 'text-amber-800'}`}>
                            {correct ? '✅' : '❌'} {question.explanation}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
    </LessonReadingShell>
  )
}
