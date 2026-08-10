'use client'

import React from 'react'
import { ChatBubbleFrame } from '@/components/chat/ChatBubble'
import SpeakerIcon from '@/components/chat/SpeakerIcon'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import VoiceMicButton, { TextEditIcon } from '@/components/voice/VoiceMicButton'
import { useVocabSpeakAttempt } from '@/hooks/useVocabSpeakAttempt'
import { useVocabularyThinSession } from '@/hooks/useVocabularyThinSession'
import { CHAT_COMPOSER_FORM_CLASS, CHAT_COMPOSER_INPUT_ROW_CLASS } from '@/lib/chatComposerMetrics'
import { featureFlags } from '@/lib/featureFlags'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { speak, stopSpeaking } from '@/lib/speech'
import type { Audience } from '@/lib/types'
import {
  createVocabAttemptId,
  type VocabHeardAttempt,
} from '@/lib/vocabulary/vocabSpeakAttemptState'
import {
  isVocabSpeakFieldFrozen,
  isVocabSpeakFieldReadOnly,
  resolveVocabSpeakInputMode,
  vocabHeardBubbleLabel,
  vocabSpeakMicTitle,
} from '@/lib/vocabulary/vocabSpeakComposer'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type {
  NecessaryWord,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
} from '@/types/vocabulary'

type VocabularyThinSessionProps = {
  words: NecessaryWord[]
  distractorPool: NecessaryWord[]
  route: VocabularySessionRoute
  tempo: VocabularyTempo
  routeTitle: string
  audience?: Audience
  setProgress: React.Dispatch<React.SetStateAction<VocabularyProgressState>>
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
  onSessionActiveChange?: (active: boolean) => void
  onHandoffTranslation: (bankedWords: NecessaryWord[]) => void
  onHandoffCall?: (bankedWords: NecessaryWord[]) => void
  onAgain: () => void
  onExit: () => void
}

export default function VocabularyThinSession({
  words,
  distractorPool,
  route,
  tempo,
  routeTitle,
  audience = 'adult',
  setProgress,
  onFooterViewChange,
  onSessionActiveChange,
  onHandoffTranslation,
  onHandoffCall,
  onAgain,
  onExit,
}: VocabularyThinSessionProps) {
  const session = useVocabularyThinSession({
    setProgress,
    distractorPool,
    routeTitle,
    audience,
    onFooterViewChange,
    onSessionActiveChange,
  })

  const [draft, setDraft] = React.useState('')
  const [voiceHint, setVoiceHint] = React.useState<string | null>(null)
  const [attempts, setAttempts] = React.useState<VocabHeardAttempt[]>([])
  const [textEditUnlocked, setTextEditUnlocked] = React.useState(false)
  const [hasCompletedPreview, setHasCompletedPreview] = React.useState(false)
  const startedRef = React.useRef(false)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const attemptsRef = React.useRef(attempts)
  const speakAttemptCancelRef = React.useRef<(() => void) | null>(null)
  attemptsRef.current = attempts

  const isVoiceStep =
    session.step === 'check_fail_say' || session.step === 'speak_en' || session.step === 'say_phrase'
  const isRevealStep = session.step === 'show_ru' || session.step === 'reveal_en'
  const isFinale = session.status === 'completed'
  const etalonText =
    session.step === 'say_phrase' ? session.phraseTarget : session.currentWord?.en ?? ''

  const revokeAttempts = React.useCallback((list: VocabHeardAttempt[]) => {
    for (const item of list) {
      if (item.audioUrl) URL.revokeObjectURL(item.audioUrl)
    }
  }, [])

  React.useEffect(() => {
    if (startedRef.current) return
    if (words.length === 0) return
    startedRef.current = true
    session.start({ words, route, tempo })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount
  }, [words, route, tempo])

  React.useEffect(() => {
    revokeAttempts(attemptsRef.current)
    setAttempts([])
    setDraft('')
    setVoiceHint(null)
    setTextEditUnlocked(false)
    setHasCompletedPreview(false)
    speakAttemptCancelRef.current?.()
  }, [session.step, session.wordIndex, revokeAttempts])

  React.useEffect(() => {
    return () => {
      revokeAttempts(attemptsRef.current)
    }
  }, [revokeAttempts])

  const handlePreview = React.useCallback((result: { transcript: string; audioUrl: string | null }) => {
    const next: VocabHeardAttempt = {
      id: createVocabAttemptId(),
      transcript: result.transcript,
      audioUrl: result.audioUrl,
    }
    setAttempts((prev) => [...prev, next])
    setDraft(result.transcript)
    setHasCompletedPreview(true)
    setTextEditUnlocked(false)
    setVoiceHint(null)
  }, [])

  const speakAttempt = useVocabSpeakAttempt({
    etalonText,
    enabled: isVoiceStep && !isFinale,
    onPreview: handlePreview,
    onCapabilityBlocked: (message) => {
      setVoiceHint(message)
      setTextEditUnlocked(true)
      setHasCompletedPreview(true)
    },
  })

  speakAttemptCancelRef.current = speakAttempt.cancel

  React.useEffect(() => {
    if (attempts.length === 0) return
    const root = scrollRef.current
    if (!root) return
    root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' })
  }, [attempts.length])

  const inputMode = resolveVocabSpeakInputMode({
    isTextEditUnlocked: textEditUnlocked,
    voiceListening: speakAttempt.isRecording,
  })
  const fieldReadOnly = isVocabSpeakFieldReadOnly(inputMode)
  const fieldFrozen = isVocabSpeakFieldFrozen({
    isTextEditUnlocked: textEditUnlocked,
    inputMode,
  })

  const handleSendVoice = React.useCallback(() => {
    if (!hasCompletedPreview && !draft.trim() && !textEditUnlocked) return
    const ok = session.acceptVoice(draft)
    if (!ok) {
      setVoiceHint('Не удалось продолжить. Попробуй ещё раз.')
      return
    }
    setDraft('')
    setVoiceHint(null)
  }, [draft, hasCompletedPreview, session, textEditUnlocked])

  const handleHandoff = React.useCallback(() => {
    const banked = session.bankedWords
    if (banked.length === 0) return
    writeVocabTranslationHandoff({
      lemmas: banked.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      })),
      source: 'vocab_finale',
      loadStudying: true,
    })
    onHandoffTranslation(banked)
  }, [onHandoffTranslation, session.bankedWords])

  const handleHandoffCall = React.useCallback(() => {
    const banked = session.bankedWords
    if (banked.length === 0 || !onHandoffCall) return
    writeVocabTranslationHandoff({
      lemmas: banked.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      })),
      source: 'vocab_finale',
      loadStudying: true,
    })
    onHandoffCall(banked)
  }, [onHandoffCall, session.bankedWords])

  const playAttemptAudio = React.useCallback((url: string) => {
    try {
      const audio = new Audio(url)
      void audio.play()
    } catch {
      // ignore
    }
  }, [])

  const word = session.currentWord
  const heardLabel = vocabHeardBubbleLabel(audience)
  const micTitle = vocabSpeakMicTitle(speakAttempt.phase, speakAttempt.isRecording)
  const sendEnabled = hasCompletedPreview || Boolean(draft.trim())

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col">
      <div
        className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
        style={{ boxShadow: 'var(--chat-shell-shadow)' }}
      >
        <DialogGlassScrollHost>
          <div
            ref={scrollRef}
            className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper p-3 sm:p-3.5`}
          >
            {isFinale ? (
              <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm">
                <p className="text-[20px] font-bold text-[var(--text)]">Сессия слов завершена</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">
                  {session.finaleStats.banked} в деле · {session.finaleStats.stillLearning} ещё
                </p>
              </div>
            ) : word && session.step === 'show_ru' ? (
              <div
                key={`card-${word.id}-show`}
                className="lesson-enter rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Смысл</p>
                <p className="mt-3 text-[28px] font-bold text-[var(--text)]">{word.ru}</p>
              </div>
            ) : word && session.step === 'reveal_en' ? (
              <div
                key={`card-${word.id}-reveal`}
                className="lesson-enter rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Форма</p>
                <p className="mt-3 text-[28px] font-bold text-[var(--text)]">{word.en}</p>
                {word.transcription ? (
                  <p className="mt-1 text-[14px] text-[var(--text-muted)]">{word.transcription}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => speak(word.en, '')}
                  className="btn-3d-menu mt-4 rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                >
                  Слушать
                </button>
              </div>
            ) : word && session.step === 'check' ? (
              <div
                key={`card-${word.id}-check`}
                className="lesson-enter rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Проверка</p>
                <p className="mt-3 text-[28px] font-bold text-[var(--text)]">{word.en}</p>
              </div>
            ) : word && session.step === 'produce' ? (
              <div
                key={`card-${word.id}-produce`}
                className="lesson-enter rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Собери слово</p>
                <p className="mt-2 text-[15px] text-[var(--text-muted)]">{word.ru}</p>
                <p className="mt-4 min-h-[2.5rem] rounded-xl border border-dashed border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[24px] font-bold tracking-wider text-[var(--text)]">
                  {session.produceBuilt || '…'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.produceTiles.map((letter, index) => (
                    <button
                      key={`tile-${index}-${letter}`}
                      type="button"
                      onClick={() => session.tapProduceTile(letter, index)}
                      className="btn-3d-menu min-w-[2.5rem] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[18px] font-bold text-[var(--text)]"
                    >
                      {letter === ' ' ? '␣' : letter}
                    </button>
                  ))}
                </div>
                {session.lastProduceOk === false ? (
                  <p className="mt-3 text-[13px] text-[var(--text-muted)]">Не то — собери ещё раз.</p>
                ) : null}
              </div>
            ) : word && isVoiceStep ? (
              <>
                <div
                  key={`card-${word.id}-${session.step}`}
                  className="lesson-enter rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
                >
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {session.step === 'say_phrase'
                      ? 'Фраза'
                      : session.step === 'check_fail_say'
                        ? 'Скажи правильно'
                        : 'Произнеси'}
                  </p>
                  <p className="mt-3 text-[24px] font-bold text-[var(--text)]">
                    {session.step === 'say_phrase' ? session.phraseTarget : word.en}
                  </p>
                  {session.step !== 'say_phrase' && word.transcription ? (
                    <p className="mt-1 text-[14px] text-[var(--text-muted)]">{word.transcription}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (speakAttempt.isBusy) return
                      stopSpeaking()
                      speak(etalonText, '')
                    }}
                    disabled={speakAttempt.isBusy}
                    className="btn-3d-menu mt-4 rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)] disabled:opacity-50"
                  >
                    Слушать
                  </button>
                  {voiceHint ? (
                    <p className="mt-3 text-[13px] leading-relaxed text-[var(--status-warning-text)]">{voiceHint}</p>
                  ) : null}
                  {session.lastVoiceOk === false ? (
                    <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                      Не совпало — можно поправить или идти дальше.
                    </p>
                  ) : null}
                </div>
                {attempts.map((attempt) => (
                  <ChatBubbleFrame
                    key={attempt.id}
                    role="assistant"
                    position="solo"
                    className="lesson-enter"
                    rowClassName="mb-2.5"
                  >
                    <div className="flex items-center gap-2 px-1 py-0.5 text-[15px] leading-relaxed text-[var(--text)]">
                      <span className="min-w-0">
                        {heardLabel} {attempt.transcript || '…'}
                      </span>
                      {attempt.audioUrl ? (
                        <button
                          type="button"
                          onClick={() => playAttemptAudio(attempt.audioUrl!)}
                          className="chat-input-inline-speaker-button chat-action-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] text-[var(--chat-speaker-text)]"
                          title="Прослушать себя"
                          aria-label="Прослушать свою запись"
                        >
                          <SpeakerIcon />
                        </button>
                      ) : null}
                    </div>
                  </ChatBubbleFrame>
                ))}
              </>
            ) : (
              <div className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 text-[15px] text-[var(--text-muted)] shadow-sm">
                Готовлю сессию…
              </div>
            )}
          </div>
        </DialogGlassScrollHost>

        <DialogComposerStack>
          {isFinale ? (
            <div className="flex w-full flex-col gap-2 px-1 pb-1">
              {session.finaleStats.banked > 0 ? (
                <button
                  type="button"
                  onClick={handleHandoff}
                  className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
                >
                  Закрепить в переводе
                </button>
              ) : null}
              {session.finaleStats.banked > 0 && featureFlags.engvoVoiceV1 && onHandoffCall ? (
                <button
                  type="button"
                  onClick={handleHandoffCall}
                  className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                >
                  В звонок
                </button>
              ) : null}
              <button
                type="button"
                onClick={onAgain}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
              >
                Ещё
              </button>
              <button
                type="button"
                onClick={() => {
                  session.abort()
                  onExit()
                }}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
              >
                К списку
              </button>
            </div>
          ) : session.step === 'check' ? (
            <LessonChoiceChips
              key={`vocab-check-${session.sessionId}-${session.wordIndex}`}
              resetKey={`vocab-check-${session.sessionId}-${session.wordIndex}`}
              choices={session.quizOptions}
              onChoose={(text) => session.acceptChip(text)}
            />
          ) : session.step === 'produce' ? (
            <div className="flex w-full flex-col gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={session.submitProduce}
                disabled={!session.produceBuilt.trim()}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)] disabled:opacity-50"
              >
                Готово
              </button>
              <button
                type="button"
                onClick={session.clearProduce}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
              >
                Сбросить
              </button>
            </div>
          ) : isRevealStep ? (
            <div className="px-1 pb-1">
              <button
                type="button"
                onClick={session.goNextReveal}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
              >
                Дальше
              </button>
            </div>
          ) : isVoiceStep ? (
            <div className={`${CHAT_COMPOSER_FORM_CLASS} px-2`} style={{ boxShadow: 'var(--chat-composer-shadow)' }}>
              <div className={CHAT_COMPOSER_INPUT_ROW_CLASS}>
                <VoiceMicButton
                  listening={speakAttempt.isRecording}
                  finalizing={speakAttempt.isFinalizing}
                  disabled={speakAttempt.phase === 'playing' || speakAttempt.phase === 'cueStart'}
                  micVisualState={
                    speakAttempt.isRecording
                      ? 'wait'
                      : speakAttempt.phase === 'idle' || speakAttempt.phase === 'preview'
                        ? 'invite'
                        : 'idle'
                  }
                  onClick={speakAttempt.startCycle}
                  title={micTitle}
                  ariaLabel={micTitle}
                />
                <div className="relative min-w-0 flex-1">
                  <textarea
                    value={draft}
                    readOnly={fieldReadOnly}
                    onChange={(event) => {
                      if (fieldReadOnly) return
                      setDraft(event.target.value)
                    }}
                    rows={1}
                    placeholder={textEditUnlocked ? 'Поправь и отправь' : 'Повтори после сигнала…'}
                    className={`chat-input-field min-w-0 w-full resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2.5 text-base outline-none ${
                      fieldFrozen ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'
                    } ${hasCompletedPreview && !textEditUnlocked ? 'pr-12' : ''}`}
                  />
                  {hasCompletedPreview && !textEditUnlocked ? (
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        setTextEditUnlocked(true)
                      }}
                      className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] touch-manipulation hover:bg-[var(--chat-control-hover)] hover:text-[var(--text)]"
                      aria-label="Ввести ответ текстом"
                      title="Редактировать"
                    >
                      <TextEditIcon />
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleSendVoice}
                  disabled={!sendEnabled}
                  aria-label="Отправить ответ"
                  title="Отправить"
                  className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--chat-send-bg)' }}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                    <path
                      d="M21.4 11.6C21.7 11.8 21.7 12.2 21.4 12.4L5.9 19.4C5.2 19.7 4.4 19.2 4.5 18.4L5.3 14.2C5.4 13.9 5.6 13.6 5.9 13.5L12.8 12L5.9 10.5C5.6 10.4 5.4 10.1 5.3 9.8L4.5 5.6C4.4 4.8 5.2 4.3 5.9 4.6L21.4 11.6Z"
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </DialogComposerStack>
      </div>
    </div>
  )
}
