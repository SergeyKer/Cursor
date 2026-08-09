'use client'

import React from 'react'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import VoiceMicButton from '@/components/voice/VoiceMicButton'
import { useVocabularyThinSession } from '@/hooks/useVocabularyThinSession'
import { CHAT_COMPOSER_FORM_CLASS, CHAT_COMPOSER_INPUT_ROW_CLASS } from '@/lib/chatComposerMetrics'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { speak } from '@/lib/speech'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import { writeVocabTranslationHandoff } from '@/lib/vocabulary/translationHandoff'
import type {
  NecessaryWord,
  VocabularyFooterView,
  VocabularyProgressState,
  VocabularySessionRoute,
  VocabularyTempo,
} from '@/types/vocabulary'

type BrowserSpeechRecognition = SpeechRecognition & {
  maxAlternatives?: number
}

type VocabularyThinSessionProps = {
  words: NecessaryWord[]
  distractorPool: NecessaryWord[]
  route: VocabularySessionRoute
  tempo: VocabularyTempo
  routeTitle: string
  setProgress: React.Dispatch<React.SetStateAction<VocabularyProgressState>>
  onFooterViewChange?: (view: VocabularyFooterView | null) => void
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
  setProgress,
  onFooterViewChange,
  onHandoffTranslation,
  onAgain,
  onExit,
}: VocabularyThinSessionProps) {
  const session = useVocabularyThinSession({
    setProgress,
    distractorPool,
    routeTitle,
    onFooterViewChange,
  })

  const [draft, setDraft] = React.useState('')
  const [listening, setListening] = React.useState(false)
  const [voiceHint, setVoiceHint] = React.useState<string | null>(null)
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null)
  const startedRef = React.useRef(false)

  React.useEffect(() => {
    if (startedRef.current) return
    if (words.length === 0) return
    startedRef.current = true
    session.start({ words, route, tempo })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount
  }, [words, route, tempo])

  React.useEffect(() => {
    setDraft('')
    setVoiceHint(null)
    recognitionRef.current?.stop?.()
    setListening(false)
  }, [session.step, session.wordIndex])

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.()
    }
  }, [])

  const isVoiceStep =
    session.step === 'check_fail_say' || session.step === 'speak_en' || session.step === 'say_phrase'
  const isRevealStep = session.step === 'show_ru' || session.step === 'reveal_en'
  const isFinale = session.status === 'completed'

  const handleMic = React.useCallback(() => {
    const RecognitionCtor =
      typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined

    if (!RecognitionCtor) {
      setVoiceHint('Микрофон недоступен. Введи слово или нажми «Я повторил вслух».')
      return
    }

    if (listening) {
      recognitionRef.current?.stop?.()
      setListening(false)
      return
    }

    recognitionRef.current?.stop?.()
    const recognition = new RecognitionCtor() as BrowserSpeechRecognition
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    setVoiceHint(null)
    setListening(true)

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      setDraft(transcript)
    }
    recognition.onerror = () => {
      setListening(false)
      setVoiceHint('Не удалось распознать речь. Попробуй ещё раз или введи текст.')
    }
    recognition.onend = () => {
      setListening(false)
    }
    recognition.start()
  }, [listening])

  const handleSendVoice = React.useCallback(() => {
    const ok = session.acceptVoice(draft)
    if (!ok) {
      setVoiceHint('Почти. Скажи или введи ближе к образцу.')
      return
    }
    setDraft('')
    setVoiceHint(null)
  }, [draft, session])

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

  const word = session.currentWord

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col">
      <div
        className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
        style={{ boxShadow: 'var(--chat-shell-shadow)' }}
      >
        <DialogGlassScrollHost>
          <div className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper p-3 sm:p-3.5`}>
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
                className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Смысл</p>
                <p className="mt-3 text-[28px] font-bold text-[var(--text)]">{word.ru}</p>
              </div>
            ) : word && session.step === 'reveal_en' ? (
              <div
                key={`card-${word.id}-reveal`}
                className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
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
                className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Проверка</p>
                <p className="mt-3 text-[28px] font-bold text-[var(--text)]">{word.en}</p>
              </div>
            ) : word && isVoiceStep ? (
              <div
                key={`card-${word.id}-${session.step}`}
                className="rounded-[1rem] border border-[var(--chat-shell-border)] bg-white px-4 py-5 shadow-sm"
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
                  onClick={() => speak(session.step === 'say_phrase' ? session.phraseTarget : word.en, '')}
                  className="btn-3d-menu mt-4 rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-3 text-base font-semibold text-[var(--text)]"
                >
                  Слушать
                </button>
                {voiceHint ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--status-warning-text)]">{voiceHint}</p>
                ) : null}
                {session.lastVoiceOk === false ? (
                  <p className="mt-2 text-[13px] text-[var(--text-muted)]">Не совпало — попробуй ещё раз.</p>
                ) : null}
              </div>
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
            <div className="flex w-full flex-col gap-2 px-1 pb-1">
              <div className={`${CHAT_COMPOSER_FORM_CLASS} px-2`}>
                <div className={CHAT_COMPOSER_INPUT_ROW_CLASS}>
                  <VoiceMicButton
                    listening={listening}
                    micVisualState={listening ? 'wait' : 'idle'}
                    onClick={handleMic}
                    title={listening ? 'Остановить' : 'Голосовой ввод'}
                    ariaLabel={listening ? 'Остановить запись' : 'Голосовой ввод'}
                  />
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={1}
                    placeholder="Скажи или введи…"
                    className="chat-input-field min-w-0 w-full flex-1 resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2.5 text-base text-[var(--text)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendVoice}
                    disabled={!draft.trim()}
                    className="btn-3d-menu shrink-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--text)] disabled:opacity-50"
                  >
                    Отправить
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  session.skipSpeakAccessibility()
                  setDraft('')
                  setVoiceHint(null)
                }}
                className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-control-bg)] px-4 py-2.5 text-[14px] font-semibold text-[var(--text)]"
              >
                Я повторил вслух
              </button>
            </div>
          ) : null}
        </DialogComposerStack>
      </div>
    </div>
  )
}
