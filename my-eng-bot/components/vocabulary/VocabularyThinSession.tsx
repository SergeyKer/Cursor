'use client'

import React, { type CSSProperties } from 'react'
import AudioDeck, { type AudioDeckHandle } from '@/components/audio/AudioDeck'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import ReadingDetachedCard from '@/components/ReadingDetachedCard'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import VoiceMicButton, { TextEditIcon } from '@/components/voice/VoiceMicButton'
import { useVocabularyThinSession } from '@/hooks/useVocabularyThinSession'
import { VOCAB_LEMMA_EN_DRILL, VOCAB_LEMMA_RU } from '@/lib/vocabulary/cardStyles'
import {
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_INPUT_ROW_CLASS,
  CHAT_COMPOSER_TYPO_CLASS,
  getChatComposerOverlayVerticalClass,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import {
  DIALOG_SESSION_FEED_INNER_CLASS,
  DIALOG_SESSION_FRAME_CLASS,
  DIALOG_SESSION_GUTTER_CLASS,
} from '@/lib/dialogSessionChrome'
import { isIosChromeBrowser, needsVoiceComposerWebMetrics } from '@/lib/sttClient'
import type { Audience } from '@/lib/types'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import {
  isVocabSpeakFieldFrozen,
  isVocabSpeakFieldReadOnly,
  resolveVocabSpeakInputMode,
  vocabSpeakMicTitle,
} from '@/lib/vocabulary/vocabSpeakComposer'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import { useAutoGrowTextarea } from '@/lib/voice/useAutoGrowTextarea'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'
import {
  showVoiceComposerOverlay,
  voiceComposerOverlayText,
} from '@/lib/voice/voiceComposerStatus'
import type {
  NecessaryWord,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
} from '@/types/vocabulary'

const COMPOSER_GLASS_SHADOW = { boxShadow: 'var(--chat-composer-shadow)' } as const
const VOCAB_INPUT_MAX_HEIGHT_PX = 260

const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

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

  const [voiceHint, setVoiceHint] = React.useState<string | null>(null)
  const [textEditUnlocked, setTextEditUnlocked] = React.useState(false)
  /** Default 0.6× (index 2) — slower first listen for word form. */
  const [ttsSpeedIndex, setTtsSpeedIndex] = React.useState(2)
  const [voiceWebMetricsClient, setVoiceWebMetricsClient] = React.useState(false)
  const [isIosChromeClient, setIsIosChromeClient] = React.useState(false)
  const startedRef = React.useRef(false)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const audioDeckRef = React.useRef<AudioDeckHandle | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const isVoiceStep = session.step === 'check_fail_say' || session.step === 'speak_en'
  const isFinale = session.status === 'completed'
  const handingOff = isFinale && session.finaleStats.banked > 0
  const etalonText = session.currentWord?.en ?? ''
  const audioPlaybackKey = `${session.currentWord?.id ?? 'word'}-${session.step}`
  const voiceInviteKey =
    isVoiceStep && !isFinale && session.currentWord
      ? `${session.currentWord.id}:${session.step}`
      : null

  const voice = useLessonVoiceInput({
    inviteKey: voiceInviteKey,
    speechMode: 'en',
  })

  React.useEffect(() => {
    if (startedRef.current) return
    if (words.length === 0) return
    startedRef.current = true
    session.start({ words, route, tempo })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount
  }, [words, route, tempo])

  const handedOffRef = React.useRef(false)
  React.useEffect(() => {
    if (session.status !== 'completed' || handedOffRef.current) return
    if (session.finaleStats.banked === 0) return
    handedOffRef.current = true
    writeVocabTranslationHandoff({
      lemmas: session.words.map((word) => ({
        en: word.en,
        ru: word.ru,
        wordId: word.id,
        lemmaKey: lemmaKeyFromEn(word.en),
      })),
      source: 'vocab_finale',
      loadStudying: false,
    })
    onHandoffTranslation(session.words)
  }, [onHandoffTranslation, session.finaleStats.banked, session.status, session.words])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = window.navigator.userAgent
    setIsIosChromeClient(isIosChromeBrowser(ua))
    setVoiceWebMetricsClient(needsVoiceComposerWebMetrics(ua))
  }, [])

  React.useLayoutEffect(() => {
    setVoiceHint(null)
    setTextEditUnlocked(false)
    voice.resetVoiceInput()
    // Layout: must run before useLessonVoiceInput invite effect, else mic stays idle.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on word/step change
  }, [session.step, session.wordIndex])

  React.useEffect(() => {
    if (voice.voicePhase !== 'error') return
    setTextEditUnlocked(true)
    if (voice.voiceStatusMessage) setVoiceHint(voice.voiceStatusMessage)
  }, [voice.voicePhase, voice.voiceStatusMessage])

  const composerText = voice.isVoiceActive ? '' : voice.draftText
  const inputValue = composerText
  const showVoiceOverlay = showVoiceComposerOverlay(voice.voicePhase)
  const voiceWebMetricsActive = voice.isVoiceActive && voiceWebMetricsClient
  const iosChromeVoiceStatusMessage = !isIosChromeClient
    ? null
    : voice.voicePhase === 'error'
      ? voice.voiceStatusMessage
      : null

  useAutoGrowTextarea({
    textareaRef,
    value: inputValue,
    maxHeightPx: VOCAB_INPUT_MAX_HEIGHT_PX,
    minHeightPx: 44,
    isVoiceActive: voice.isVoiceActive,
    showVoiceOverlay,
    voiceWebMetricsActive,
  })

  const inputMode = resolveVocabSpeakInputMode({
    isTextEditUnlocked: textEditUnlocked,
    voiceListening: voice.listening || voice.isVoiceActive,
  })
  const fieldReadOnly = isVocabSpeakFieldReadOnly(inputMode) || voice.isInputLocked
  const fieldFrozen = isVocabSpeakFieldFrozen({
    isTextEditUnlocked: textEditUnlocked,
    inputMode,
  })
  const showTextEditButton =
    Boolean(voice.draftText.trim()) && !textEditUnlocked && !voice.isVoiceActive
  const micTitle = vocabSpeakMicTitle(voice.listening, voice.voicePhase === 'finalizing')
  const sendEnabled =
    Boolean(voice.draftText.trim()) && !voice.isInputLocked && !voice.listening

  const handleSendVoice = React.useCallback(() => {
    if (!sendEnabled) return
    const ok = session.acceptVoice(voice.draftText)
    if (!ok) {
      setVoiceHint('Не удалось продолжить. Попробуй ещё раз.')
      return
    }
    voice.setDraftText('')
    setVoiceHint(null)
    setTextEditUnlocked(false)
  }, [sendEnabled, session, voice])

  const handleMicClick = React.useCallback(() => {
    audioDeckRef.current?.stopTts()
    voice.resetMicAnimation()
    if (voice.listening) {
      voice.stopListening()
      return
    }
    setVoiceHint(null)
    void voice.startListening()
  }, [voice])

  const handleRevealNext = React.useCallback(() => {
    audioDeckRef.current?.stopTts()
    session.goNextReveal()
  }, [session])

  const word = session.currentWord

  const audioDeck = word ? (
    <div className={CHAT_COMPOSER_FORM_CLASS} style={COMPOSER_GLASS_SHADOW}>
      <AudioDeck
        ref={audioDeckRef}
        text={etalonText}
        voiceId=""
        ttsMode="vocab"
        playbackKey={audioPlaybackKey}
        speedIndex={ttsSpeedIndex}
        onSpeedIndexChange={setTtsSpeedIndex}
        disabled={isVoiceStep ? voice.isVoiceActive : false}
      />
    </div>
  ) : null

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className={DIALOG_SESSION_GUTTER_CLASS}>
          <div className={DIALOG_SESSION_FRAME_CLASS}>
            <DialogGlassScrollHost>
              <div
                ref={scrollRef}
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper`}
              >
                <div className={DIALOG_SESSION_FEED_INNER_CLASS}>
            {handingOff ? (
              <ReadingDetachedCard label="Сессия">
                <p className="text-[15px] text-[var(--text-muted)]">Дальше — перевод.</p>
              </ReadingDetachedCard>
            ) : isFinale ? (
              <ReadingDetachedCard label="Сессия слов завершена" className="lesson-enter">
                <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
                  {session.finaleStats.banked} сказать Engvo · {session.finaleStats.stillLearning} ещё
                </p>
              </ReadingDetachedCard>
            ) : word && session.step === 'reveal_en' ? (
              <ReadingDetachedCard key={`card-${word.id}-reveal`} label="Слово" className="lesson-enter">
                <p className={VOCAB_LEMMA_RU}>{word.ru}</p>
                <p className={`mt-2 text-[28px] ${VOCAB_LEMMA_EN_DRILL}`}>{word.en}</p>
                {word.transcription.trim() ? (
                  <p className="mt-1 text-[14px] text-[var(--text-muted)]">{word.transcription}</p>
                ) : null}
              </ReadingDetachedCard>
            ) : word && session.step === 'check' ? (
              <ReadingDetachedCard key={`card-${word.id}-check`} label="Проверка" className="lesson-enter">
                <p className={`text-[28px] ${VOCAB_LEMMA_EN_DRILL}`}>{word.en}</p>
              </ReadingDetachedCard>
            ) : word && session.step === 'produce' ? (
              <ReadingDetachedCard key={`card-${word.id}-produce`} label="Собери слово" className="lesson-enter">
                <p className={VOCAB_LEMMA_RU}>{word.ru}</p>
                <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Слоты слова">
                  {Array.from({ length: word.en.trim().length }, (_, index) => {
                    const letter = session.produceSelected[index]
                    return (
                      <button
                        key={`produce-slot-${word.id}-${index}`}
                        type="button"
                        disabled={!letter}
                        onClick={() => session.returnProduceSlot(index)}
                        className={`lesson-puzzle-chip inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[16px] font-bold transition ${
                          letter
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                        }`}
                        aria-label={letter ? `Убрать букву ${letter === ' ' ? 'пробел' : letter}` : `Пустой слот ${index + 1}`}
                      >
                        {letter === ' ' ? '␣' : letter ?? '...'}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Доступные буквы">
                  {session.produceTiles.map((letter, index) => (
                    <button
                      key={`tile-${index}-${letter}`}
                      type="button"
                      disabled={session.produceFilled}
                      onClick={() => session.tapProduceTile(letter, index)}
                      className="lesson-puzzle-chip inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[16px] font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
                      aria-label={`Добавить букву ${letter === ' ' ? 'пробел' : letter}`}
                    >
                      {letter === ' ' ? '␣' : letter}
                    </button>
                  ))}
                  {Array.from(
                    { length: Math.max(0, word.en.trim().length - session.produceTiles.length) },
                    (_, index) => (
                      <div
                        key={`tile-empty-${index}`}
                        aria-hidden="true"
                        className="lesson-puzzle-chip inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[16px] font-bold text-slate-400"
                      >
                        ...
                      </div>
                    )
                  )}
                </div>
                {session.lastProduceOk === false ? (
                  <p className="mt-3 text-[13px] text-[var(--text-muted)]">Не то — собери ещё раз.</p>
                ) : null}
              </ReadingDetachedCard>
            ) : word && isVoiceStep ? (
              <ReadingDetachedCard
                key={`card-${word.id}-${session.step}`}
                label={session.step === 'check_fail_say' ? 'Скажи правильно' : 'Произнеси'}
                className="lesson-enter"
              >
                <p className={`text-[24px] ${VOCAB_LEMMA_EN_DRILL}`}>{word.en}</p>
                {word.transcription ? (
                  <p className="mt-1 text-[14px] text-[var(--text-muted)]">{word.transcription}</p>
                ) : null}
                {voiceHint ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--status-warning-text)]">{voiceHint}</p>
                ) : null}
                {session.lastVoiceOk === false ? (
                  <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                    Не совпало — можно поправить или идти дальше.
                  </p>
                ) : null}
              </ReadingDetachedCard>
            ) : (
              <ReadingDetachedCard label="Сессия">
                <p className="text-[15px] text-[var(--text-muted)]">Готовлю сессию…</p>
              </ReadingDetachedCard>
            )}
                </div>
          </div>
        </DialogGlassScrollHost>

        <DialogComposerStack>
          {handingOff ? null : isFinale ? (
            <div className="flex w-full flex-col gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={onAgain}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
              >
                Ещё раз
              </button>
              <button
                type="button"
                onClick={() => {
                  session.abort()
                  onExit()
                }}
                className="w-full px-4 py-2 text-[14px] text-[var(--text-muted)]"
              >
                К словам
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
                disabled={!session.produceFilled}
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
          ) : session.step === 'reveal_en' ? (
            <div className="flex w-full flex-col gap-1">
              {audioDeck}
              <div className="px-1 pb-1">
                <button
                  type="button"
                  onClick={handleRevealNext}
                  className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-semibold text-[var(--text)]"
                >
                  Дальше
                </button>
              </div>
            </div>
          ) : isVoiceStep ? (
            <div className="flex w-full flex-col gap-1">
              {audioDeck}
              <div className={`${CHAT_COMPOSER_FORM_CLASS} px-2`} style={COMPOSER_GLASS_SHADOW}>
                <div className={CHAT_COMPOSER_INPUT_ROW_CLASS}>
                  <VoiceMicButton
                    listening={voice.listening}
                    finalizing={voice.voicePhase === 'finalizing'}
                    disabled={voice.voicePhase === 'finalizing'}
                    micVisualState={voice.micVisualState}
                    onClick={handleMicClick}
                    title={micTitle}
                    ariaLabel={
                      voice.listening
                        ? 'Остановить запись'
                        : voice.voicePhase === 'finalizing'
                          ? 'Распознаю речь'
                          : 'Голосовой ввод'
                    }
                  />
                  <div className="relative min-w-0 flex-1">
                    {showVoiceOverlay ? (
                      <VoiceComposerOverlay
                        statusText={voiceComposerOverlayText(voice.voicePhase)}
                        webTextMetricsFix={voiceWebMetricsClient}
                      />
                    ) : null}
                    {iosChromeVoiceStatusMessage ? (
                      <>
                        <span role="status" aria-live="polite" style={SR_ONLY_STYLE}>
                          {iosChromeVoiceStatusMessage}
                        </span>
                        <div
                          aria-hidden="true"
                          className={`ios-chrome-voice-status-overlay pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl px-4 font-sans text-[14px] italic leading-snug ${
                            voiceWebMetricsActive
                              ? getChatComposerOverlayVerticalClass(true)
                              : getChatComposerOverlayVerticalClass(false)
                          }`}
                          style={{
                            color:
                              voice.voicePhase === 'error'
                                ? 'var(--status-danger-text, #dc2626)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {iosChromeVoiceStatusMessage}
                        </div>
                      </>
                    ) : null}
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      readOnly={fieldReadOnly}
                      onChange={(event) => {
                        if (fieldReadOnly) return
                        voice.setDraftText(event.target.value)
                      }}
                      rows={1}
                      placeholder={textEditUnlocked ? 'Поправь и отправь' : ''}
                      className={`chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(voiceWebMetricsActive)} outline-none ${
                        voice.isVoiceActive
                          ? 'text-transparent caret-transparent placeholder:text-transparent'
                          : fieldFrozen
                            ? 'text-[var(--text-muted)]'
                            : 'text-[var(--text)]'
                      } ${showTextEditButton ? 'pr-12' : ''}`}
                      style={{ maxHeight: VOCAB_INPUT_MAX_HEIGHT_PX }}
                    />
                    {showTextEditButton ? (
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
            </div>
          ) : null}
        </DialogComposerStack>
          </div>
      </div>
    </div>
  )
}
