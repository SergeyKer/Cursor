'use client'

import * as React from 'react'
import AccentProgressBadge from '@/components/accent/AccentProgressBadge'
import BlockRecorder from '@/components/accent/BlockRecorder'
import FeedbackPanel from '@/components/accent/FeedbackPanel'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { ChatBubbleFrame } from '@/components/chat/ChatBubble'
import { useAccentBlockStateMachine } from '@/hooks/useAccentBlockStateMachine'
import { useAccentSpeechRecognition } from '@/hooks/useAccentSpeechRecognition'
import { useAudioPreview } from '@/hooks/useAudioPreview'
import { analyzeAccentAttempt } from '@/lib/accent/phoneticFeedback'
import { recordAccentBlockFeedback, subscribeAccentProgress, summarizeAccentProgress } from '@/lib/accent/progressStorage'
import { RUSSIAN_SPEAKER_GROUPS, ACCENT_SECTIONS, getAccentLessonById } from '@/lib/accent/soundCatalog'
import { ACCENT_SESSION_PLANS, buildAccentLessonBlocks, getDefaultAccentMode } from '@/lib/accent/sessionPlan'
import { ALL_ACCENT_LESSONS } from '@/lib/accent/staticContent'
import type {
  AccentAudience,
  AccentBlockFeedback,
  AccentBlockType,
  AccentLesson,
  AccentLessonSessionKind,
  AccentSessionMode,
} from '@/types/accent'
import type { Bubble } from '@/types/lesson'

export interface AccentFooterView {
  dynamicText: string
  staticText: string
  typingKey: string
  tone: 'neutral' | 'support' | 'thinking' | 'celebrate' | 'hint'
  emphasis: 'none' | 'pulse'
}

interface AccentTrainerProps {
  audience: AccentAudience
  onClose: () => void
  onFooterViewChange?: (view: AccentFooterView | null) => void
  initialLessonId?: string | null
  initialSessionKind?: AccentLessonSessionKind | null
  initialSessionBlockType?: AccentBlockType | null
  initialLessonRequestKey?: number
}

type AccentLessonSession = { kind: 'full' } | { kind: 'single'; blockType: AccentBlockType }

const BLOCK_ORDER: AccentBlockType[] = ['words', 'pairs', 'progressive']

const blockLabels: Record<AccentBlockType, string> = {
  words: 'Слова',
  pairs: 'Пары',
  progressive: 'Цепочка',
}

function speak(text: string, rate: 0.75 | 1 = 0.75): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
}

function buildIntroBubbles(lesson: AccentLesson, audience: AccentAudience): Bubble[] {
  return [
    {
      type: 'positive',
      content: audience === 'child' ? lesson.childMarker : lesson.marker,
    },
    {
      type: 'info',
      content: `${lesson.targetSound}: сначала читаем весь блок одним заходом, потом проверяем распознанный текст.`,
    },
    {
      type: 'task',
      content: lesson.teacherNote,
    },
  ]
}

function blockInstruction(blockType: AccentBlockType): string {
  if (blockType === 'pairs') return 'Читай пары подряд: целевое слово, короткая пауза, контрастное слово.'
  if (blockType === 'progressive') return 'Читай всю цепочку сверху вниз одним заходом, не ускоряйся на длинной строке.'
  return 'Читай все слова подряд одним заходом. Скорость не важна, важна ясность.'
}

function createFooterView(params: {
  lesson: AccentLesson | null
  session: AccentLessonSession | null
  blockType: AccentBlockType
  blockIndex: number
  state: string
  mode: AccentSessionMode
}): AccentFooterView {
  if (!params.lesson) {
    return {
      dynamicText: 'Выбери быстрый старт или сложный звук для русскоговорящих.',
      staticText: `Произношение | ${ALL_ACCENT_LESSONS.length} уроков`,
      typingKey: 'accent-hub',
      tone: 'neutral',
      emphasis: 'none',
    }
  }

  if (!params.session) {
    return {
      dynamicText: 'Выбери формат: полный урок, слова, пары или предложение.',
      staticText: `${params.lesson.shortTitle} | Выбор формата`,
      typingKey: `accent-${params.lesson.id}-mode-picker`,
      tone: 'neutral',
      emphasis: 'none',
    }
  }

  const progress = summarizeAccentProgress(params.lesson.id)
  const blockProgress = progress.progress.segmentSuccessfulAttempts[params.blockType]
  const stepLabel = params.session.kind === 'full' ? `${params.blockIndex + 1}/3` : '1/1'
  const dynamicText =
    params.state === 'recording'
      ? 'Запись идёт локально. Читай спокойно, без спешки.'
      : params.state === 'preview'
        ? 'Прослушай себя или поправь текст вручную, потом нажми «Проверить».'
        : params.state === 'feedback'
          ? 'Смотри не на процент как на оценку, а на слова для следующего подхода.'
          : blockInstruction(params.blockType)

  return {
    dynamicText,
    staticText: `${params.lesson.shortTitle} | ${blockLabels[params.blockType]} ${stepLabel} | ${blockProgress}/20`,
    typingKey: `accent-${params.lesson.id}-${params.blockType}-${params.state}-${params.mode}`,
    tone: params.state === 'feedback' ? 'support' : params.state === 'recording' ? 'thinking' : 'neutral',
    emphasis: 'none',
  }
}

export default function AccentTrainer({
  audience,
  onClose,
  onFooterViewChange,
  initialLessonId = null,
  initialSessionKind = null,
  initialSessionBlockType = null,
  initialLessonRequestKey = 0,
}: AccentTrainerProps) {
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(initialLessonId)
  const [mode, setMode] = React.useState<AccentSessionMode>(() => getDefaultAccentMode(audience))
  const [selectedSession, setSelectedSession] = React.useState<AccentLessonSession | null>(() => {
    if (!initialSessionKind) return null
    if (initialSessionKind === 'single' && initialSessionBlockType) return { kind: 'single', blockType: initialSessionBlockType }
    return { kind: 'full' }
  })
  const [blockIndex, setBlockIndex] = React.useState(0)
  const [lessonVariantSeed, setLessonVariantSeed] = React.useState(0)
  const [lastFeedback, setLastFeedback] = React.useState<AccentBlockFeedback | null>(null)
  const [manualTranscript, setManualTranscript] = React.useState('')
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const previousInitialLessonRequestKeyRef = React.useRef(initialLessonRequestKey)

  const stateMachine = useAccentBlockStateMachine()
  const speech = useAccentSpeechRecognition()
  const audio = useAudioPreview()
  const lesson = selectedLessonId ? getAccentLessonById(selectedLessonId) : null
  const blockType = selectedSession?.kind === 'single' ? selectedSession.blockType : BLOCK_ORDER[blockIndex] ?? 'words'

  const blocks = React.useMemo(() => {
    if (!lesson) return null
    return buildAccentLessonBlocks(lesson, mode, { variantSeed: lessonVariantSeed })
  }, [lesson, lessonVariantSeed, mode])

  React.useEffect(() => {
    onFooterViewChange?.(
      createFooterView({
        lesson,
        session: selectedSession,
        blockType,
        blockIndex,
        state: stateMachine.runtime.state,
        mode,
      })
    )
    return () => onFooterViewChange?.(null)
  }, [blockIndex, blockType, lesson, mode, onFooterViewChange, selectedSession, stateMachine.runtime.state])

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [selectedLessonId, blockIndex, stateMachine.runtime.state, lastFeedback])

  const resetBlock = React.useCallback(() => {
    stateMachine.reset()
    speech.resetTranscript()
    audio.clear()
    setManualTranscript('')
    setLastFeedback(null)
  }, [audio, speech, stateMachine])

  React.useEffect(() => {
    if (previousInitialLessonRequestKeyRef.current === initialLessonRequestKey) return
    previousInitialLessonRequestKeyRef.current = initialLessonRequestKey
    setSelectedLessonId(initialLessonId)
    setSelectedSession(() => {
      if (!initialSessionKind) return null
      if (initialSessionKind === 'single' && initialSessionBlockType) return { kind: 'single', blockType: initialSessionBlockType }
      return { kind: 'full' }
    })
    setBlockIndex(0)
    setLessonVariantSeed(0)
    resetBlock()
  }, [initialLessonId, initialLessonRequestKey, initialSessionBlockType, initialSessionKind, resetBlock])

  const openLesson = React.useCallback(
    (lessonId: string) => {
      setSelectedLessonId(lessonId)
      setSelectedSession(null)
      setBlockIndex(0)
      setLessonVariantSeed(0)
      resetBlock()
    },
    [resetBlock]
  )

  const selectSession = React.useCallback(
    (session: AccentLessonSession) => {
      setSelectedSession(session)
      setBlockIndex(session.kind === 'single' ? BLOCK_ORDER.indexOf(session.blockType) : 0)
      resetBlock()
    },
    [resetBlock]
  )

  const startRecording = React.useCallback(async () => {
    stateMachine.startRecording()
    speech.start()
    await audio.start()
  }, [audio, speech, stateMachine])

  const stopRecording = React.useCallback(() => {
    speech.stop()
    audio.stop()
    stateMachine.finalizeRecording()
  }, [audio, speech, stateMachine])

  const submitPreview = React.useCallback(() => {
    if (!lesson || !blocks) return
    stateMachine.submitPreview()
    const transcript = (manualTranscript || speech.transcript).trim()
    const feedback = analyzeAccentAttempt({
      lessonId: lesson.id,
      blockType,
      transcript,
      expectedWords: blocks.words,
      expectedPairs: blocks.pairs,
      progressiveLines: blocks.progressiveLines,
      knownSubstitutions: lesson.knownSubstitutions,
    })
    recordAccentBlockFeedback(feedback)
    setLastFeedback(feedback)
    stateMachine.showFeedback(feedback)
  }, [blockType, blocks, lesson, manualTranscript, speech.transcript, stateMachine])

  const goNext = React.useCallback(() => {
    stateMachine.completeBlock()
    if (selectedSession?.kind === 'full' && blockIndex < BLOCK_ORDER.length - 1) {
      setBlockIndex((value) => value + 1)
      resetBlock()
    }
  }, [blockIndex, resetBlock, selectedSession?.kind, stateMachine])

  const regenerateCurrentBlock = React.useCallback(() => {
    setLessonVariantSeed((value) => value + 1)
    resetBlock()
  }, [resetBlock])

  const isLastBlock = selectedSession?.kind === 'single' || blockIndex >= BLOCK_ORDER.length - 1
  const canAdvance = selectedSession?.kind === 'full'
  const showRegenerate = selectedSession?.kind === 'single'
  const transcriptValue = manualTranscript || speech.transcript
  const canCheck = transcriptValue.trim().length > 0
  const isPracticeReady = Boolean(lesson && blocks && selectedSession)
  const progressSummary = lesson ? summarizeAccentProgress(lesson.id) : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col">
          <div
            className="glass-surface flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3">
              {lesson && blocks && selectedSession ? (
                <div>
                  <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                    <UnifiedLessonBubble bubbles={buildIntroBubbles(lesson, audience)} animateSections />
                  </ChatBubbleFrame>
                  <div className="lesson-enter mb-2.5 flex justify-start px-1">
                    <p dir="ltr" className="w-fit italic typing-indicator-text-shimmer">
                      {blockInstruction(blockType)}
                    </p>
                  </div>
                  <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                    <section className="chat-section-surface glass-surface rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/95 px-3 py-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{blockLabels[blockType]}</p>
                          <h2 className="text-base font-semibold text-[var(--text)]">{lesson.title}</h2>
                        </div>
                        <button type="button" onClick={() => speak(blockType === 'progressive' ? blocks.progressiveLines.at(-1) ?? lesson.title : blocks.words.slice(0, 6).join(', '), 0.75)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          Послушать
                        </button>
                      </div>
                      <BlockRecorder blockType={blockType} words={blocks.words} pairs={blocks.pairs} progressiveLines={blocks.progressiveLines} targetSound={lesson.targetSound} />
                    </section>
                  </ChatBubbleFrame>
                  {stateMachine.runtime.state === 'recording' && (
                    <ChatBubbleFrame role="user" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                      <p className="text-[15px] leading-[1.45]">Я записываю блок: {blockLabels[blockType].toLowerCase()}.</p>
                    </ChatBubbleFrame>
                  )}
                  {(stateMachine.runtime.state === 'preview' || stateMachine.runtime.state === 'submitting' || stateMachine.runtime.state === 'feedback') && (
                    <ChatBubbleFrame role="user" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                      <div className="space-y-2">
                        {audio.audioUrl && <audio src={audio.audioUrl} controls className="w-full" />}
                        <textarea
                          value={transcriptValue}
                          onChange={(event) => {
                            setManualTranscript(event.target.value)
                            speech.setManualTranscript(event.target.value)
                          }}
                          rows={3}
                          placeholder="Здесь появится распознанный текст. Если браузер не распознал речь, можно ввести вручную."
                          className="w-full rounded-xl border border-[var(--border)] bg-white/95 px-3 py-2 text-[14px] text-[var(--text)]"
                        />
                      </div>
                    </ChatBubbleFrame>
                  )}
                  {stateMachine.runtime.state === 'feedback' && lastFeedback && (
                    <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                      <FeedbackPanel feedback={lastFeedback} />
                    </ChatBubbleFrame>
                  )}
                  {stateMachine.runtime.state === 'complete' && isLastBlock && (
                    <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                      <section className="chat-section-surface glass-surface rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-green-800">
                        Урок завершён. Для реального сдвига возвращайся к этому звуку 5-10 успешных раз, затем закрепляй до 20.
                      </section>
                    </ChatBubbleFrame>
                  )}
                  {stateMachine.runtime.state === 'complete' && isLastBlock && selectedSession.kind === 'full' && progressSummary && (
                    <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
                      <section className="chat-section-surface glass-surface rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/95 px-3 py-3 text-[var(--text)]">
                        <h3 className="text-sm font-semibold">Прогресс по блокам</h3>
                        <p className="mt-1 text-sm">Слова: {progressSummary.progress.segmentSuccessfulAttempts.words}/20</p>
                        <p className="text-sm">Пары: {progressSummary.progress.segmentSuccessfulAttempts.pairs}/20</p>
                        <p className="text-sm">Предложение: {progressSummary.progress.segmentSuccessfulAttempts.progressive}/20</p>
                      </section>
                    </ChatBubbleFrame>
                  )}
                </div>
              ) : lesson ? (
                <AccentLessonModePicker
                  lesson={lesson}
                  onSelectFull={() => selectSession({ kind: 'full' })}
                  onSelectSingle={(type) => selectSession({ kind: 'single', blockType: type })}
                />
              ) : (
                <AccentHub onOpenLesson={openLesson} onClose={onClose} mode={mode} onModeChange={setMode} audience={audience} />
              )}
            </div>
            <AccentActionBar
              selectedLesson={Boolean(lesson)}
              interactive={isPracticeReady}
              state={stateMachine.runtime.state}
              canCheck={canCheck}
              isLastBlock={isLastBlock}
              allowNext={Boolean(canAdvance)}
              showRegenerate={Boolean(showRegenerate)}
              onBack={() => {
                setSelectedLessonId(null)
                setSelectedSession(null)
                setLessonVariantSeed(0)
                resetBlock()
              }}
              onClose={onClose}
              onStart={startRecording}
              onStop={stopRecording}
              onCheck={submitPreview}
              onRepeat={resetBlock}
              onRegenerate={regenerateCurrentBlock}
              onNext={goNext}
              speechSupported={speech.supported}
              speechMessage={speech.constructiveMessage}
              audioMessage={audio.constructiveMessage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AccentHub({
  onOpenLesson,
  onClose,
  mode,
  onModeChange,
  audience,
}: {
  onOpenLesson: (lessonId: string) => void
  onClose: () => void
  mode: AccentSessionMode
  onModeChange: (mode: AccentSessionMode) => void
  audience: AccentAudience
}) {
  const defaultLesson = audience === 'child' ? 'w-v-contrast' : 'th-think'

  return (
    <div className="space-y-3">
      <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
        <UnifiedLessonBubble
          bubbles={[
            { type: 'positive', content: 'Произношение работает локально: запись, preview и проверка не уходят на сервер.' },
            { type: 'info', content: 'Выбери быстрый старт, сложный звук для русскоговорящих или полный список звуков.' },
            { type: 'task', content: 'Цель — 5-10 успешных проходов для первых сдвигов и до 20 для закрепления.' },
          ]}
          animateSections
        />
      </ChatBubbleFrame>

      <section className="lesson-enter rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/90 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--text)]">Режим</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--text-muted)]">
            Закрыть
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(ACCENT_SESSION_PLANS).map((plan) => (
            <button
              key={plan.mode}
              type="button"
              onClick={() => onModeChange(plan.mode)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                mode === plan.mode ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-[var(--border)] bg-white text-[var(--text)]'
              }`}
            >
              {plan.label} · {plan.timeLabel}
            </button>
          ))}
        </div>
      </section>

      <section className="lesson-enter rounded-2xl border border-blue-200 bg-blue-50/95 p-3 text-blue-900">
        <h2 className="mb-2 text-base font-semibold">Быстрый старт</h2>
        <button type="button" onClick={() => onOpenLesson(defaultLesson)} className="btn-3d-menu w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-left font-semibold">
          Начать с {defaultLesson === 'th-think' ? 'TH think' : 'W/V contrast'}
        </button>
      </section>

      <section className="lesson-enter rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/90 p-3">
        <h2 className="mb-2 text-base font-semibold text-[var(--text)]">Сложные звуки для русскоговорящих</h2>
        <div className="space-y-2">
          {RUSSIAN_SPEAKER_GROUPS.map((group) => (
            <details key={group.id} className="rounded-xl border border-[var(--border)] bg-white/80 p-2">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{group.title}</summary>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{group.subtitle}</p>
              <div className="mt-2 space-y-1.5">
                {group.lessonIds.map((lessonId) => {
                  const item = getAccentLessonById(lessonId)
                  if (!item) return null
                  return (
                    <button key={lessonId} type="button" onClick={() => onOpenLesson(lessonId)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-blue-50/70 px-2.5 py-2 text-left text-sm text-blue-900">
                      <span>{item.title}</span>
                      <AccentProgressBadge lessonId={lessonId} />
                    </button>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="lesson-enter rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/90 p-3">
        <h2 className="mb-2 text-base font-semibold text-[var(--text)]">Все звуки</h2>
        <div className="space-y-2">
          {ACCENT_SECTIONS.map((section) => (
            <details key={section.id} className="rounded-xl border border-[var(--border)] bg-white/80 p-2">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{section.title}</summary>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{section.subtitle}</p>
              <div className="mt-2 grid gap-1.5">
                {section.lessonIds.map((lessonId) => {
                  const item = getAccentLessonById(lessonId)
                  if (!item) return null
                  return (
                    <button key={lessonId} type="button" onClick={() => onOpenLesson(lessonId)} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-sm text-[var(--text)]">
                      <span>{item.shortTitle}</span>
                      <AccentProgressBadge lessonId={lessonId} />
                    </button>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function AccentLessonModePicker({
  lesson,
  onSelectFull,
  onSelectSingle,
}: {
  lesson: AccentLesson
  onSelectFull: () => void
  onSelectSingle: (blockType: AccentBlockType) => void
}) {
  const [summary, setSummary] = React.useState(() => summarizeAccentProgress(lesson.id))

  React.useEffect(() => {
    const refresh = () => setSummary(summarizeAccentProgress(lesson.id))
    refresh()
    const unsubscribe = subscribeAccentProgress(refresh)
    return unsubscribe
  }, [lesson.id])

  const segment = summary.progress.segmentSuccessfulAttempts

  return (
    <div className="space-y-3">
      <ChatBubbleFrame role="assistant" position="solo" className="lesson-enter" rowClassName="mb-2.5">
        <UnifiedLessonBubble
          bubbles={[
            { type: 'positive', content: lesson.marker },
            { type: 'info', content: 'Выбери формат: полный урок, слова, пары или предложение.' },
          ]}
          animateSections
        />
      </ChatBubbleFrame>
      <section className="chat-section-surface glass-surface rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/95 px-3 py-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{lesson.title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          С {segment.words}/20 · П {segment.pairs}/20 · Ц {segment.progressive}/20
        </p>
        <div className="mt-3 space-y-2">
          <button type="button" onClick={onSelectFull} className="btn-3d-menu w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-left font-semibold text-blue-800">
            Полный урок (1→2→3)
          </button>
          <button type="button" onClick={() => onSelectSingle('words')} className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-left font-semibold text-[var(--text)]">
            Слова
          </button>
          <button type="button" onClick={() => onSelectSingle('pairs')} className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-left font-semibold text-[var(--text)]">
            Пары
          </button>
          <button type="button" onClick={() => onSelectSingle('progressive')} className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-left font-semibold text-[var(--text)]">
            Предложение
          </button>
        </div>
      </section>
    </div>
  )
}

function AccentActionBar({
  selectedLesson,
  interactive,
  state,
  canCheck,
  isLastBlock,
  allowNext,
  showRegenerate,
  onBack,
  onClose,
  onStart,
  onStop,
  onCheck,
  onRepeat,
  onRegenerate,
  onNext,
  speechSupported,
  speechMessage,
  audioMessage,
}: {
  selectedLesson: boolean
  interactive: boolean
  state: string
  canCheck: boolean
  isLastBlock: boolean
  allowNext: boolean
  showRegenerate: boolean
  onBack: () => void
  onClose: () => void
  onStart: () => void
  onStop: () => void
  onCheck: () => void
  onRepeat: () => void
  onRegenerate: () => void
  onNext: () => void
  speechSupported: boolean
  speechMessage: string | null
  audioMessage: string | null
}) {
  return (
    <div className="shrink-0 border-t border-[var(--chat-shell-border)] bg-transparent px-2.5 sm:px-3" style={{ paddingTop: 'calc(var(--app-bottom-inset) + 0.625rem)', paddingBottom: 'calc(var(--app-bottom-inset) + 0.625rem)' }}>
      {(speechMessage || audioMessage || !speechSupported) && interactive && (
        <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-[1.35] text-amber-800">
          {speechMessage ?? audioMessage ?? 'Распознавание недоступно в этом браузере. Используй ручной ввод после записи.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!selectedLesson ? (
          <button type="button" onClick={onClose} className="btn-3d-menu flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-center font-semibold text-[var(--text)]">
            На главную
          </button>
        ) : !interactive ? (
          <>
            <button type="button" onClick={onBack} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-muted)]">
              К звукам
            </button>
            <p className="flex flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-muted)]">
              Выбери формат урока
            </p>
          </>
        ) : (
          <>
            <button type="button" onClick={onBack} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-muted)]">
              К звукам
            </button>
            {(state === 'idle' || state === 'complete') && !isLastBlock && (
              <button type="button" onClick={onStart} className="btn-3d-menu flex-1 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-800">
                Записать
              </button>
            )}
            {state === 'idle' && isLastBlock && (
              <button type="button" onClick={onStart} className="btn-3d-menu flex-1 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-800">
                Записать
              </button>
            )}
            {state === 'recording' && (
              <button type="button" onClick={onStop} className="btn-3d-menu flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center font-semibold text-red-700">
                Остановить
              </button>
            )}
            {state === 'preview' && (
              <button type="button" onClick={onCheck} disabled={!canCheck} className="btn-3d-menu flex-1 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-center font-semibold text-green-800 disabled:opacity-50">
                Проверить
              </button>
            )}
            {state === 'feedback' && (
              <>
                <button type="button" onClick={onRepeat} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]">
                  Повторить
                </button>
                {showRegenerate && (
                  <button type="button" onClick={onRegenerate} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]">
                    Новый набор
                  </button>
                )}
                {allowNext && (
                  <button type="button" onClick={onNext} className="btn-3d-menu flex-1 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-800">
                    {isLastBlock ? 'Завершить' : 'Далее'}
                  </button>
                )}
              </>
            )}
            {state === 'complete' && isLastBlock && (
              <>
                <button type="button" onClick={onRepeat} className="btn-3d-menu flex-1 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-800">
                  Ещё подход
                </button>
                {showRegenerate && (
                  <button type="button" onClick={onRegenerate} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]">
                    Новый набор
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
