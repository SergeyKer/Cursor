'use client'

import { useEffect, useRef, useState } from 'react'
import {
  POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS,
  POST_LESSON_NEUTRAL_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import type { PostLessonAction, PostLessonOption } from '@/types/lesson'

interface Props {
  options: PostLessonOption[]
  onSelect: (action: PostLessonAction) => void
  disabled?: boolean
  navigationDisabled?: boolean
  blueActionsFrozen?: boolean
  optionHints?: Partial<Record<PostLessonAction, string>>
  selectionResetKey?: number
  className?: string
  onBackToLessonList?: () => void
  backToLessonListLabel?: string
  onOpenTips?: () => void
  tipsLabel?: string
}

const SELECT_DELAY_MS = 200
const DEFAULT_BACK_TO_LESSON_LIST_LABEL = 'К списку уроков'
const DEFAULT_TIPS_LABEL = 'Фишки'
/** Сразу открывают оверлей — без задержки и без промежуточного «синего» состояния. */
const INSTANT_OVERLAY_ACTIONS: PostLessonAction[] = ['independent_practice', 'myeng_training']

export default function PostLessonMenu({
  options,
  onSelect,
  disabled = false,
  navigationDisabled = false,
  blueActionsFrozen = false,
  optionHints,
  selectionResetKey = 0,
  className = '',
  onBackToLessonList,
  backToLessonListLabel = DEFAULT_BACK_TO_LESSON_LIST_LABEL,
  onOpenTips,
  tipsLabel = DEFAULT_TIPS_LABEL,
}: Props) {
  const [selectedAction, setSelectedAction] = useState<PostLessonAction | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSelectedAction(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [selectionResetKey])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSelect = (action: PostLessonAction) => {
    if (disabled || blueActionsFrozen || selectedAction) return
    setSelectedAction(action)
    if (INSTANT_OVERLAY_ACTIONS.includes(action)) {
      onSelect(action)
      return
    }
    timeoutRef.current = setTimeout(() => {
      onSelect(action)
      setSelectedAction(null)
      timeoutRef.current = null
    }, SELECT_DELAY_MS)
  }

  const hasPendingSelection = selectedAction !== null
  const showBlueFrozen = blueActionsFrozen || hasPendingSelection
  const navigationActionsDisabled = navigationDisabled || hasPendingSelection

  const extraActions: Array<{
    key: string
    label: string
    onClick: () => void
    animationIndex: number
  }> = []

  if (onBackToLessonList) {
    extraActions.push({
      key: 'back-to-lesson-list',
      label: backToLessonListLabel,
      onClick: onBackToLessonList,
      animationIndex: options.length,
    })
  }

  if (onOpenTips) {
    extraActions.push({
      key: 'open-tips',
      label: tipsLabel,
      onClick: onOpenTips,
      animationIndex: options.length + (onBackToLessonList ? 1 : 0),
    })
  }

  return (
    <div className={`mx-auto grid w-full grid-cols-2 gap-2 ${className}`.trim()}>
      {options.map((option, index) => {
        const hint = optionHints?.[option.action]
        const blueSurfaceClass = showBlueFrozen
          ? `${POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS} pointer-events-none cursor-not-allowed opacity-60`
          : POST_LESSON_BLUE_PRIMARY_BUTTON_CLASS
        const blueDisabled = disabled || showBlueFrozen

        return (
          <div
            key={option.action}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <button
              type="button"
              onClick={() => handleSelect(option.action)}
              disabled={blueDisabled}
              aria-disabled={blueDisabled}
              className={`group ${blueSurfaceClass}`}
            >
              <span className="min-w-0 flex flex-col items-center leading-tight">
                <span>{option.label}</span>
                {hint ? (
                  <span className="text-[9px] leading-tight text-white/90 sm:text-[10px]">{hint}</span>
                ) : null}
              </span>
            </button>
          </div>
        )
      })}
      {extraActions.map((action) => (
        <div
          key={action.key}
          className="animate-fade-in-up"
          style={{ animationDelay: `${action.animationIndex * 100}ms`, animationFillMode: 'both' }}
        >
          <button
            type="button"
            onClick={action.onClick}
            disabled={navigationActionsDisabled}
            className={POST_LESSON_NEUTRAL_BUTTON_CLASS}
          >
            <span className="min-w-0 text-center leading-tight">{action.label}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
