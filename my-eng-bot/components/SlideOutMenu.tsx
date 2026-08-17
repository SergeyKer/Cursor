'use client'

import React from 'react'
import type { Settings, UsageInfo } from '@/lib/types'
import MenuSectionPanels, {
  type LessonsPanel,
  type LessonMenuContext,
  type LearningLessonMenuMeta,
  type MenuView,
} from '@/components/MenuSectionPanels'
import { SLIDE_OUT_NEW_CHAT_BUTTON_CLASS } from '@/lib/homeCtaStyles'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode, ActivePracticeMenuSnapshot } from '@/types/practice'
import type {
  EngvoCefrLevel,
  EngvoProvider,
  EngvoRealtimeVoice,
  EngvoSpeechSpeedPresetId,
  EngvoXaiCallVoice,
  EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'
import type { EngvoVoiceSessionKind, EngvoTeacherDrillKind } from '@/lib/engvo/sessionKind'
import type { SentenceType, TenseId } from '@/lib/types'
import type { ChatPatternId } from '@/lib/chatPattern'
import type { ChatPatternTuning, ChatPatternTuningMap, TunableChatPatternId } from '@/lib/chatPatternTuning'
import type { RewardsState } from '@/lib/rewardsState'
import type { AdaptiveFooterView } from '@/types/adaptiveRetention'
import type { TutorFooterView } from '@/lib/tutor/tutorFooter'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { resolveAppPanelHorizontalLayout } from '@/lib/appPanelLayout'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
import {
  resolveLessonsRootEntryPanel,
  shouldForceLessonsSummaryOnRequest,
} from '@/lib/menu/lessonsEntry'

export type { LessonMenuContext, LearningLessonMenuMeta }

interface SlideOutMenuProps {
  open: boolean
  onToggle: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  rewardsState?: RewardsState
  onRewardsStateChange?: (state: RewardsState) => void
  onNewDialog?: () => void
  /** Не рендерить встроенную кнопку (кнопка вынесена в шапку страницы) */
  hideButton?: boolean
  /** Кнопка «Начать …» в «Чат с MyEng» (старт или новый диалог). */
  onStartChat?: () => void
  onStartCommunicationChat?: () => void
  onOpenEngvoVoiceChat?: () => void
  engvoProvider?: EngvoProvider
  engvoRealtimeVoice?: EngvoRealtimeVoice
  engvoXaiVoice?: EngvoXaiCallVoice
  engvoXaiVoiceRotationMode?: EngvoXaiVoiceRotationMode
  engvoCefrLevel?: EngvoCefrLevel
  engvoSpeechSpeedPreset?: EngvoSpeechSpeedPresetId
  engvoSessionKind?: EngvoVoiceSessionKind
  engvoTeacherTense?: TenseId
  engvoTeacherSentenceType?: SentenceType
  engvoTeacherDrillKind?: EngvoTeacherDrillKind
  engvoTeacherLessonId?: string | null
  engvoSettingsLocked?: boolean
  onEngvoProviderChange?: (provider: EngvoProvider) => void
  onEngvoVoiceChange?: (voice: EngvoRealtimeVoice) => void
  onEngvoXaiVoiceChange?: (voice: EngvoXaiCallVoice) => void
  onEngvoXaiVoiceRotationModeChange?: (mode: EngvoXaiVoiceRotationMode) => void
  onEngvoLevelChange?: (level: EngvoCefrLevel) => void
  onEngvoSpeechSpeedChange?: (preset: EngvoSpeechSpeedPresetId) => void
  onEngvoSessionKindChange?: (kind: EngvoVoiceSessionKind) => void
  onEngvoTeacherTenseChange?: (tense: TenseId) => void
  onEngvoTeacherSentenceTypeChange?: (sentenceType: SentenceType) => void
  onEngvoTeacherDrillKindChange?: (kind: EngvoTeacherDrillKind) => void
  onEngvoTeacherLessonIdChange?: (lessonId: string | null) => void
  practiceTtsSpeedDefaultIndex?: number
  onPracticeTtsSpeedDefaultChange?: (index: number) => void
  chatPatternId?: ChatPatternId
  onChatPatternChange?: (id: ChatPatternId) => void
  chatPatternTuningMap?: ChatPatternTuningMap
  onChatPatternTuningChange?: (id: TunableChatPatternId, patch: Partial<ChatPatternTuning>) => void
  onChatPatternTuningReset?: (id: TunableChatPatternId) => void
  /** Кнопка «домик»: на стартовый экран приложения. */
  onGoHome?: () => void
  /** Если чат уже идёт - при открытии меню сразу «Чат с MyEng»; если нет - корень списка разделов. */
  chatActive?: boolean
  /** Режим звонка Engvo: при открытии меню показать экран звонка (как при переходе к звонку). */
  engvoVoiceMode?: boolean
  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  /** Открыть шпаргалку справочника. */
  onOpenReferenceTopic?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  onOpenSyllabusTopic?: (topicKey: string) => void | Promise<void>
  onGenerateReferenceSheet?: (query: string) => void | Promise<void>
  onReferenceSearchSubmit?: (
    query: string
  ) => Promise<
    | { kind: 'opened' }
    | { kind: 'miss'; message: string }
    | { kind: 'choose'; candidates: import('@/lib/reference/resolveReferenceOpen').ReferenceCandidate[] }
  >
  onOpenReferenceSearchCandidate?: (
    candidate: import('@/lib/reference/resolveReferenceOpen').ReferenceCandidate
  ) => Promise<
    | { kind: 'opened' }
    | { kind: 'miss'; message: string }
    | { kind: 'choose'; candidates: import('@/lib/reference/resolveReferenceOpen').ReferenceCandidate[] }
  >
  /** Full-screen Progress space. */
  onOpenProgressSpace?: () => void
  /** Full-screen My Plan space. */
  onOpenMyPlanSpace?: () => void
  onOpenTutorChat?: (opts?: {
    prefill?: string
    returnTo?: 'reference'
    referenceSearchQuery?: string
  }) => void
  tutorChatPrefill?: string
  tutorChatMountKey?: number
  onPromoteTutorFromMenu?: () => void
  /** Сгенерировать новый вариант урока через LLM. */
  onGenerateLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => Promise<void> | void
  /** DEBUG: сразу к финалу выбранного structured-урока. Удалить после редактирования. */
  onDebugSkipToLessonFinale?: (lessonId: string, panel: LessonsPanel) => void
  /** DEBUG: сразу к финалу практики. Удалить после редактирования. */
  onDebugSkipToPracticeFinale?: (request?: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => void
  practiceSessionActiveForDebug?: boolean
  /** DEBUG: сразу к финалу быстрого теста. Удалить после редактирования. */
  onDebugSkipToQuickTestFinale?: () => void
  /** DEBUG: активная сессия quick test во время прогона. */
  quickTestSessionActiveForDebug?: boolean
  /** DEBUG: лобби/интро quick test на /test. */
  quickTestLobbyActiveForDebug?: boolean
  /** Активная сессия практики — синхронизация выбора в меню при reopen. */
  activePracticeMenuSnapshot?: ActivePracticeMenuSnapshot | null
  onOpenQuickTest?: () => void
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
  onOpenAccentTrainer?: (lessonId?: string) => void
  onOpenVocabularyWorlds?: () => Promise<void> | void
  onOpenVocabularyPhrasebook?: () => Promise<void> | void
  onOpenVocabularyByLevel?: () => Promise<void> | void
  onOpenVocabularyFeed?: () => Promise<void> | void
  onOpenTranslationVocabNag?: (spotId: string) => void | Promise<void>
  onOpenVocabCustomPack?: (packId: string) => void
  onOpenAdaptivePracticeTopic?: (topic: string) => void
  /** Сессия из «Мой план» — return loop. */
  onMarkOpenedFromMyPlan?: () => void
  onLaunchTarget?: (target: import('@/lib/progress/progressActions').ProgressLaunchTarget) => void | Promise<void>
  /** Футер приложения при «Мой путь» в меню уроков. */
  onAdaptiveFooterViewChange?: (view: AdaptiveFooterView | null) => void
  /** Футер Репетитора (menu idle). */
  onTutorFooterViewChange?: (view: TutorFooterView | null) => void
  /** Visit XP for tutor micro meter. */
  tutorSessionXp?: number
  onTutorExplainSuccess?: (canonicalKey: string) => void
  onTutorMicroFinale?: (canonicalKey: string) => void
  onPracticeTheoryTagFilterPersist?: (tagId: string | null) => void
  /** Контекст меню, из которого открыт урок. */
  lessonMenuContext?: LessonMenuContext | null
  /** Одноразовый флаг: при следующем открытии восстановить панель уроков (кнопка «Назад» в уроке). */
  restoreLessonMenuOnNextOpenRef?: React.MutableRefObject<boolean>
  /** Открыть меню сразу на стадии (Уроки/Практика/…). Сбрасывается через onRequestedMenuViewConsumed. */
  requestedMenuView?: MenuView | null
  onRequestedMenuViewConsumed?: () => void
  /** Верхний offset (шапка + safe-area), общий с основным layout. */
  topOffset?: string
  /** Нижний offset (футер + safe-area), чтобы панель не перекрывала низ. */
  bottomOffset?: string
  /** Границы колонки приложения (измеряются в шапке). */
  columnBounds?: AppColumnBounds | null
  practiceProgressRevision?: number
}

export default function SlideOutMenu({
  open,
  onToggle,
  settings,
  onSettingsChange,
  usage,
  dialogueCorrectAnswers,
  rewardsState,
  onRewardsStateChange,
  onNewDialog,
  hideButton = false,
  onStartChat,
  onStartCommunicationChat,
  onOpenEngvoVoiceChat,
  engvoProvider,
  engvoRealtimeVoice,
  engvoXaiVoice,
  engvoXaiVoiceRotationMode,
  engvoCefrLevel,
  engvoSpeechSpeedPreset,
  engvoSessionKind,
  engvoTeacherTense,
  engvoTeacherSentenceType,
  engvoTeacherDrillKind,
  engvoTeacherLessonId,
  engvoSettingsLocked,
  onEngvoProviderChange,
  onEngvoVoiceChange,
  onEngvoXaiVoiceChange,
  onEngvoXaiVoiceRotationModeChange,
  onEngvoLevelChange,
  onEngvoSpeechSpeedChange,
  onEngvoSessionKindChange,
  onEngvoTeacherTenseChange,
  onEngvoTeacherSentenceTypeChange,
  onEngvoTeacherDrillKindChange,
  onEngvoTeacherLessonIdChange,
  practiceTtsSpeedDefaultIndex,
  onPracticeTtsSpeedDefaultChange,
  chatPatternId,
  onChatPatternChange,
  chatPatternTuningMap,
  onChatPatternTuningChange,
  onChatPatternTuningReset,
  onGoHome,
  chatActive = false,
  engvoVoiceMode = false,
  onOpenLearningLesson,
  onOpenReferenceTopic,
  onOpenSyllabusTopic,
  onGenerateReferenceSheet,
  onReferenceSearchSubmit,
  onOpenReferenceSearchCandidate,
  onOpenProgressSpace,
  onOpenMyPlanSpace,
  onOpenTutorChat,
  tutorChatPrefill = '',
  tutorChatMountKey = 0,
  onPromoteTutorFromMenu,
  onGenerateLearningLesson,
  onDebugSkipToLessonFinale,
  onDebugSkipToPracticeFinale,
  practiceSessionActiveForDebug = false,
  onDebugSkipToQuickTestFinale,
  quickTestSessionActiveForDebug = false,
  quickTestLobbyActiveForDebug = false,
  activePracticeMenuSnapshot = null,
  onOpenQuickTest,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenAccentTrainer,
  onOpenVocabularyWorlds,
  onOpenVocabularyPhrasebook,
  onOpenVocabularyByLevel,
  onOpenVocabularyFeed,
  onOpenTranslationVocabNag,
  onOpenVocabCustomPack,
  onOpenAdaptivePracticeTopic,
  onMarkOpenedFromMyPlan,
  onLaunchTarget,
  onAdaptiveFooterViewChange,
  onTutorFooterViewChange,
  tutorSessionXp = 0,
  onTutorExplainSuccess,
  onTutorMicroFinale,
  onPracticeTheoryTagFilterPersist,
  lessonMenuContext,
  restoreLessonMenuOnNextOpenRef,
  requestedMenuView = null,
  onRequestedMenuViewConsumed,
  topOffset = 'calc(2.75rem + env(safe-area-inset-top, 0px))',
  bottomOffset = '0px',
  columnBounds = null,
  practiceProgressRevision = 0,
}: SlideOutMenuProps) {
  const [menuView, setMenuView] = React.useState<MenuView>('root')
  const [showSectionHints, setShowSectionHints] = React.useState(false)
  /** Восстановить подпанель уроков только при открытии меню из активного урока/практики, не при ручном «Уроки». */
  const [lessonsRestorePanel, setLessonsRestorePanel] = React.useState<LessonsPanel | undefined>(undefined)
  const [forceLessonsSummary, setForceLessonsSummary] = React.useState(false)
  const prevOpenRef = React.useRef(false)
  const panelPositioned = columnBounds != null
  const horizontalLayout = resolveAppPanelHorizontalLayout(columnBounds)
  const useFullWidthPanel = horizontalLayout != null && 'right' in horizontalLayout
  const panelContainerStyle = columnBounds
    ? horizontalLayout && 'right' in horizontalLayout
      ? {
          left: horizontalLayout.left,
          right: horizontalLayout.right,
          top: topOffset,
          bottom: bottomOffset,
        }
      : horizontalLayout
        ? {
            left: horizontalLayout.left,
            width: horizontalLayout.width,
            top: topOffset,
            bottom: bottomOffset,
          }
        : {
            left: 0,
            right: 0,
            top: topOffset,
            bottom: bottomOffset,
          }
    : undefined
  const panelBoxShadow =
    '4px 0 15px -3px rgba(0, 0, 0, 0.1), 2px 0 6px -4px rgba(0, 0, 0, 0.08)'
  const panelSurfaceClass = 'bg-[var(--menu-panel-bg)]'
  const panelOpenEdgeClass = 'border-r border-r-[var(--border)]'

  const handleMenuViewChange = React.useCallback(
    (v: MenuView, opts?: { lessonsEntry?: LessonsPanel }) => {
      if (v === 'root' || v === 'communication' || v === 'practice') {
        setLessonsRestorePanel(undefined)
        setForceLessonsSummary(false)
      } else if (v === 'lessons' && menuView === 'root') {
        setLessonsRestorePanel(opts?.lessonsEntry ?? resolveLessonsRootEntryPanel())
        setForceLessonsSummary(shouldForceLessonsSummaryOnRequest())
      }
      setMenuView(v)
    },
    [menuView]
  )

  React.useLayoutEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (!open) {
      setMenuView('root')
      setLessonsRestorePanel(undefined)
      setForceLessonsSummary(false)
      setShowSectionHints(false)
      if (requestedMenuView) onRequestedMenuViewConsumed?.()
      return
    }
    if (
      restoreLessonMenuOnNextOpenRef?.current &&
      lessonMenuContext?.menuView === 'lessons'
    ) {
      restoreLessonMenuOnNextOpenRef.current = false
      setForceLessonsSummary(false)
      setLessonsRestorePanel(lessonMenuContext.lessonsPanel)
      setMenuView('lessons')
      setShowSectionHints(false)
      if (requestedMenuView) onRequestedMenuViewConsumed?.()
      return
    }
    if (requestedMenuView) {
      if (requestedMenuView === 'lessons') {
        setForceLessonsSummary(shouldForceLessonsSummaryOnRequest())
        setLessonsRestorePanel(
          shouldForceLessonsSummaryOnRequest() ? undefined : resolveLessonsRootEntryPanel()
        )
      } else {
        setForceLessonsSummary(false)
        setLessonsRestorePanel(undefined)
      }
      setShowSectionHints(requestedMenuView === 'root')
      setMenuView(requestedMenuView)
      onRequestedMenuViewConsumed?.()
      return
    }
    // Defaults only when the panel just opened; ignore request-clear re-runs.
    if (wasOpen) return
    setShowSectionHints(false)
    if (chatActive && lessonMenuContext?.menuView === 'lessons') {
      setForceLessonsSummary(false)
      setLessonsRestorePanel(lessonMenuContext.lessonsPanel)
      setMenuView('lessons')
      return
    }
    setForceLessonsSummary(false)
    setLessonsRestorePanel(undefined)
    if (chatActive && engvoVoiceMode) {
      setMenuView('engvo')
      return
    }
    setMenuView(chatActive ? 'aiChat' : 'root')
  }, [
    open,
    chatActive,
    engvoVoiceMode,
    lessonMenuContext,
    restoreLessonMenuOnNextOpenRef,
    requestedMenuView,
    onRequestedMenuViewConsumed,
  ])

  const restorePending = Boolean(
    open && restoreLessonMenuOnNextOpenRef?.current && lessonMenuContext?.menuView === 'lessons'
  )
  const showSectionHintsNow = Boolean(
    open && !restorePending && (requestedMenuView === 'root' || showSectionHints)
  )

  const menuPanelPaddingClass = 'px-3 pb-3 pt-3'

  const menuPanelBody = (
    <div className={`flex h-full flex-col ${menuPanelPaddingClass}`}>
      {onNewDialog && (
        <button
          type="button"
          onClick={() => {
            onNewDialog()
            onToggle()
          }}
          className={SLIDE_OUT_NEW_CHAT_BUTTON_CLASS}
        >
          <NewChatIcon />
          <span>Новый чат</span>
        </button>
      )}

      <MenuSectionPanels
        menuView={menuView}
        onMenuViewChange={handleMenuViewChange}
        settings={settings}
        onSettingsChange={onSettingsChange}
        usage={usage}
        dialogueCorrectAnswers={dialogueCorrectAnswers}
        rewardsState={rewardsState}
        onRewardsStateChange={onRewardsStateChange}
        idPrefix="slide-"
        edgeToEdge={false}
        className="flex min-h-0 flex-1 flex-col"
        showSectionHints={showSectionHintsNow}
        onStartHomeChat={onStartChat}
        onStartCommunicationChat={onStartCommunicationChat}
        onOpenEngvoVoiceChat={onOpenEngvoVoiceChat}
        engvoProvider={engvoProvider}
        engvoRealtimeVoice={engvoRealtimeVoice}
        engvoXaiVoice={engvoXaiVoice}
        engvoXaiVoiceRotationMode={engvoXaiVoiceRotationMode}
        engvoCefrLevel={engvoCefrLevel}
        engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
        engvoSessionKind={engvoSessionKind}
        engvoTeacherTense={engvoTeacherTense}
        engvoTeacherSentenceType={engvoTeacherSentenceType}
        engvoTeacherDrillKind={engvoTeacherDrillKind}
        engvoTeacherLessonId={engvoTeacherLessonId}
        engvoSettingsLocked={engvoSettingsLocked}
        onEngvoProviderChange={onEngvoProviderChange}
        onEngvoVoiceChange={onEngvoVoiceChange}
        onEngvoXaiVoiceChange={onEngvoXaiVoiceChange}
        onEngvoXaiVoiceRotationModeChange={onEngvoXaiVoiceRotationModeChange}
        onEngvoLevelChange={onEngvoLevelChange}
        onEngvoSpeechSpeedChange={onEngvoSpeechSpeedChange}
        onEngvoSessionKindChange={onEngvoSessionKindChange}
        onEngvoTeacherTenseChange={onEngvoTeacherTenseChange}
        onEngvoTeacherSentenceTypeChange={onEngvoTeacherSentenceTypeChange}
        onEngvoTeacherDrillKindChange={onEngvoTeacherDrillKindChange}
        onEngvoTeacherLessonIdChange={onEngvoTeacherLessonIdChange}
        practiceTtsSpeedDefaultIndex={practiceTtsSpeedDefaultIndex}
        onPracticeTtsSpeedDefaultChange={onPracticeTtsSpeedDefaultChange}
        chatPatternId={chatPatternId}
        onChatPatternChange={onChatPatternChange}
        chatPatternTuningMap={chatPatternTuningMap}
        onChatPatternTuningChange={onChatPatternTuningChange}
        onChatPatternTuningReset={onChatPatternTuningReset}
        onGoHome={onGoHome}
        onCloseMenu={open ? () => onToggle() : undefined}
        onOpenLearningLesson={onOpenLearningLesson}
        onOpenReferenceTopic={onOpenReferenceTopic}
        onOpenSyllabusTopic={onOpenSyllabusTopic}
        onGenerateReferenceSheet={onGenerateReferenceSheet}
        onReferenceSearchSubmit={onReferenceSearchSubmit}
        onOpenReferenceSearchCandidate={onOpenReferenceSearchCandidate}
        onOpenProgressSpace={onOpenProgressSpace}
        onOpenMyPlanSpace={onOpenMyPlanSpace}
        onOpenTutorChat={onOpenTutorChat}
        tutorChatPrefill={tutorChatPrefill}
        tutorChatMountKey={tutorChatMountKey}
        onPromoteTutorFromMenu={onPromoteTutorFromMenu}
        onGenerateLearningLesson={onGenerateLearningLesson}
        onDebugSkipToLessonFinale={onDebugSkipToLessonFinale}
        onDebugSkipToPracticeFinale={onDebugSkipToPracticeFinale}
        practiceSessionActiveForDebug={practiceSessionActiveForDebug}
        onDebugSkipToQuickTestFinale={onDebugSkipToQuickTestFinale}
        quickTestSessionActiveForDebug={quickTestSessionActiveForDebug}
        quickTestLobbyActiveForDebug={quickTestLobbyActiveForDebug}
        activePracticeMenuSnapshot={activePracticeMenuSnapshot}
        onOpenQuickTest={onOpenQuickTest}
        onOpenPracticeSession={onOpenPracticeSession}
        onGeneratePracticeSession={onGeneratePracticeSession}
        onOpenAccentTrainer={onOpenAccentTrainer}
        onOpenVocabularyWorlds={onOpenVocabularyWorlds}
        onOpenVocabularyPhrasebook={onOpenVocabularyPhrasebook}
        onOpenVocabularyByLevel={onOpenVocabularyByLevel}
        onOpenVocabularyFeed={onOpenVocabularyFeed}
        onOpenTranslationVocabNag={onOpenTranslationVocabNag}
        onOpenVocabCustomPack={onOpenVocabCustomPack}
        onOpenAdaptivePracticeTopic={onOpenAdaptivePracticeTopic}
        onMarkOpenedFromMyPlan={onMarkOpenedFromMyPlan}
        onLaunchTarget={onLaunchTarget}
        onAdaptiveFooterViewChange={onAdaptiveFooterViewChange}
        onTutorFooterViewChange={onTutorFooterViewChange}
        tutorSessionXp={tutorSessionXp}
        onTutorExplainSuccess={onTutorExplainSuccess}
        onTutorMicroFinale={onTutorMicroFinale}
        onPracticeTheoryTagFilterPersist={onPracticeTheoryTagFilterPersist}
        practiceProgressRevision={practiceProgressRevision}
        initialLessonsPanel={
          menuView === 'lessons'
            ? forceLessonsSummary
              ? 'summary'
              : lessonsRestorePanel
            : undefined
        }
        initialLessonMenuContext={
          menuView === 'lessons' && lessonsRestorePanel && lessonMenuContext
            ? {
                activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
                activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
                theorySearchQuery: lessonMenuContext.theorySearchQuery,
                activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
                theoryLessonSource: lessonMenuContext.theoryLessonSource,
                theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
                practiceTheoryTagFilterId: lessonMenuContext.practiceTheoryTagFilterId,
                selectedLessonId: lessonMenuContext.selectedLessonId,
                practiceMode: lessonMenuContext.practiceMode,
                referenceExerciseType: lessonMenuContext.referenceExerciseType,
                catalogBrowseIntent: lessonMenuContext.catalogBrowseIntent,
              }
            : null
        }
      />
    </div>
  )

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={onToggle}
          className="btn-3d-menu fixed z-[60] flex h-14 w-14 min-w-[44px] min-h-[44px] items-center justify-center rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--menu-panel-bg)] text-[var(--text)] touch-manipulation left-0 top-0"
          style={{ marginLeft: 'env(safe-area-inset-left)', marginTop: 'env(safe-area-inset-top)' }}
          aria-label={open ? 'Меню, открыто' : 'Меню, закрыто'}
          aria-expanded={open}
          title={open ? 'Меню, открыто' : 'Меню, закрыто'}
        >
          <MenuToggleIcon />
        </button>
      )}

      {open ? (
        <div
          className="fixed left-0 right-0 bottom-0 z-[59] bg-black/20 transition-opacity duration-200"
          style={{ top: topOffset, bottom: bottomOffset }}
          aria-hidden
          onClick={onToggle}
        />
      ) : null}
      {open && panelPositioned ? (
        <div
          className="pointer-events-none fixed z-[61] overflow-x-hidden"
          style={panelContainerStyle}
        >
          <aside
            className={`pointer-events-auto h-full w-full ${panelSurfaceClass} transition-transform duration-200 ease-out translate-x-0${
              useFullWidthPanel ? '' : ` ${panelOpenEdgeClass}`
            }`}
            style={{ boxShadow: panelBoxShadow }}
            aria-label="Меню"
          >
            {menuPanelBody}
          </aside>
        </div>
      ) : null}
      {open && !panelPositioned ? (
        <aside
          className={`fixed left-0 z-[61] w-80 max-w-[85vw] ${panelSurfaceClass} ${panelOpenEdgeClass} pointer-events-auto transition-transform duration-200 ease-out translate-x-0`}
          style={{
            top: topOffset,
            bottom: bottomOffset,
            boxShadow: panelBoxShadow,
          }}
          aria-label="Меню"
        >
          {menuPanelBody}
        </aside>
      ) : null}
    </>
  )
}

export function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function NewChatIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
