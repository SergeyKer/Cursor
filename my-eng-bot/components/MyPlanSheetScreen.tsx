'use client'

import { useEffect, useMemo, useRef } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import MyPlanPanel from '@/components/MyPlanPanel'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { canUseAiReinforce } from '@/lib/entitlements'
import { featureFlags } from '@/lib/featureFlags'
import {
  APP_BTN_TERTIARY_BACK,
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import {
  detectModeGap,
  getAttentionZones,
  listLearningSignals,
  loadSkillMasteryMap,
} from '@/lib/learningMemory'
import { trackMyPlanEvent } from '@/lib/myPlan/analytics'
import { buildMyPlanLiveInput } from '@/lib/myPlan/buildInput'
import { getMyPlanRecommendations, selectNowGoal } from '@/lib/myPlan/selectNowGoal'
import { readRecentSoftKeys } from '@/lib/myPlan/softFocusRotation'
import type { RewardsState } from '@/lib/rewardsState'
import type { Settings } from '@/lib/types'
import { myPlanCopy, type MyPlanAudience } from '@/lib/uiCopy/myPlan'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'

export type MyPlanSheetScreenProps = {
  settings: Settings
  rewardsState: RewardsState | undefined
  onBack: () => void
  onOpenProgressSpace?: () => void
  onOpenLessons?: () => void
  onOpenLearningLesson?: (lessonId: string) => void
  onOpenReferenceTopic?: (lessonId: string) => void
  onOpenPracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => Promise<void> | void
  onGeneratePracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => Promise<void> | void
  onOpenVocabularyWorlds?: () => void | Promise<void>
  onMarkOpenedFromMyPlan?: () => void
}

const COMPOSER_PROGRESS = [
  BTN_INTERACTION_BASE,
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-[var(--text)] hover:brightness-95 active:brightness-90',
].join(' ')

export default function MyPlanSheetScreen({
  settings,
  rewardsState,
  onBack,
  onOpenProgressSpace,
  onOpenLessons,
  onOpenLearningLesson,
  onOpenReferenceTopic,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenVocabularyWorlds,
  onMarkOpenedFromMyPlan,
}: MyPlanSheetScreenProps) {
  const audience: MyPlanAudience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const scrollRef = useRef<HTMLDivElement>(null)

  const attentionZones = useMemo(
    () => getAttentionZones(listLearningSignals(), loadSkillMasteryMap()),
    [rewardsState, settings]
  )
  const modeGap = useMemo(() => detectModeGap(listLearningSignals()), [rewardsState, settings])

  const planNow = useMemo(() => {
    const input = buildMyPlanLiveInput(settings, rewardsState ?? null, {
      attentionZones,
      canUseAiReinforce: canUseAiReinforce(),
      recentSoftKeys: readRecentSoftKeys(),
    })
    const now = selectNowGoal(input)
    if (!featureFlags.myPlanNowGoalV1) {
      const flat = getMyPlanRecommendations(input)
      return {
        mainTask: flat[0] ?? null,
        secondary: flat.slice(1),
        status: {
          dailyStreak: input.rewards.dailyStreak,
          level: input.rewards.level ?? rewardsState?.progress.level ?? 1,
          totalXP: input.rewards.totalXP ?? rewardsState?.progress.totalXP ?? 0,
        },
        programTask: now.programTask,
        programStatus: now.programStatus,
        unstartedCount: now.unstartedCount,
        flat,
      }
    }
    return { ...now, flat: [] as ReturnType<typeof getMyPlanRecommendations> }
  }, [settings, rewardsState, attentionZones])

  useEffect(() => {
    trackMyPlanEvent('my_plan_space_opened', { audience })
  }, [audience])

  const handleBack = () => {
    trackMyPlanEvent('my_plan_space_back', { audience })
    onBack()
  }

  const goProgress = () => {
    trackMyPlanEvent('my_plan_progress_link', { audience })
    onOpenProgressSpace?.()
  }

  return (
    <LessonReadingShell
      scrollRef={scrollRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
      composer={
        <div className="flex w-full items-center gap-1.5">
          <button type="button" onClick={handleBack} className={APP_BTN_TERTIARY_BACK}>
            {copy.back}
          </button>
          {onOpenProgressSpace ? (
            <button type="button" onClick={goProgress} className={COMPOSER_PROGRESS}>
              {copy.progressButton}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="w-full min-w-0 space-y-2.5">
        <MyPlanPanel
          mainTask={planNow.mainTask}
          secondary={planNow.secondary}
          recommendations={featureFlags.myPlanNowGoalV1 ? undefined : planNow.flat}
          status={planNow.status}
          programTask={planNow.programTask}
          programStatus={planNow.programStatus}
          unstartedCount={planNow.unstartedCount}
          anchorLevel={settings.level}
          attentionZones={attentionZones}
          modeGap={modeGap}
          settings={settings}
          nowGoalLayout={featureFlags.myPlanNowGoalV1}
          showAdultPaywallHint={!canUseAiReinforce()}
          onOpenLearningLesson={onOpenLearningLesson}
          onOpenReferenceTopic={onOpenReferenceTopic}
          onOpenPracticeSession={onOpenPracticeSession}
          onGeneratePracticeSession={onGeneratePracticeSession}
          onOpenVocabularyWorlds={onOpenVocabularyWorlds}
          onMenuViewChange={
            onOpenLessons
              ? (view) => {
                  if (view === 'lessons') onOpenLessons()
                  if (view === 'progress') onOpenProgressSpace?.()
                }
              : undefined
          }
          onOpenProgressSpace={onOpenProgressSpace}
          onMarkOpenedFromMyPlan={onMarkOpenedFromMyPlan}
        />
      </div>
    </LessonReadingShell>
  )
}
