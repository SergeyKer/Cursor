'use client'

import { useEffect, useRef } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import LessonFeedbackStatusBubble from '@/components/lesson/LessonFeedbackStatusBubble'
import LessonStepBubble from '@/components/lesson/LessonStepBubble'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { QuickTestProgressBar } from '@/components/quickTest/QuickTestProgressBar'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import type { QuickTestQuestion } from '@/lib/quickTest/types'

type QuickTestQuestionViewProps = {
  step: number
  total: number
  question: QuickTestQuestion
  phase: 'question' | 'feedback'
  selectedIndex: number | null
  onChoose: (index: number) => void
  onNext: () => void
  isLast: boolean
}

export function QuickTestQuestionView({
  step,
  total,
  question,
  phase,
  selectedIndex,
  onChoose,
  onNext,
  isLast,
}: QuickTestQuestionViewProps) {
  const promptRef = useRef<HTMLDivElement>(null)
  const frozen = phase === 'feedback'
  const correct = selectedIndex !== null && selectedIndex === question.correctIndex
  const wrongText =
    selectedIndex !== null && !correct ? question.options[selectedIndex] ?? null : null

  useEffect(() => {
    if (phase === 'question') {
      promptRef.current?.focus()
    }
  }, [phase, question.id])

  return (
    <DialogGlassScrollHost>
      <QuickTestProgressBar
        current={step}
        total={total}
        label={QUICK_TEST_COPY.stepLabel(step, total)}
      />
      <div className="chat-shell-x mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-3 py-3">
        <div ref={promptRef} tabIndex={-1} className="outline-none">
          <LessonStepBubble
            bubbles={[{ type: 'task', content: question.prompt }]}
            preferUnifiedLayout
          />
        </div>

        <LessonChoiceChips
          choices={question.options.map((text, index) => ({
            text,
            isCorrect: index === question.correctIndex,
          }))}
          onChoose={(text) => {
            const index = question.options.findIndex((option) => option === text)
            if (index >= 0) onChoose(index)
          }}
          disabled={frozen}
          frozen={frozen}
          wrongChoiceText={wrongText}
          resetKey={question.id}
          suppressEnterAnimation
        />

        {phase === 'feedback' ? (
          <div aria-live="polite">
            <LessonFeedbackStatusBubble
              hintText={
                correct
                  ? `${QUICK_TEST_COPY.feedbackCorrect}. ${question.explanationRu}`
                  : `${QUICK_TEST_COPY.feedbackWrong}. ${question.explanationRu}`
              }
            />
            <button
              type="button"
              onClick={onNext}
              className="mt-3 min-h-[44px] w-full rounded-xl bg-[var(--text-accent,#4f8fe8)] px-4 py-2.5 text-[15px] font-semibold text-white touch-manipulation"
            >
              {isLast ? QUICK_TEST_COPY.result : QUICK_TEST_COPY.next}
            </button>
          </div>
        ) : null}
      </div>
    </DialogGlassScrollHost>
  )
}
