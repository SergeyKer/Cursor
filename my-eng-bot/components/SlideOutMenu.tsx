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
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode, ActivePracticeMenuSnapshot } from '@/types/practice'
import type {
  EngvoCefrLevel,
  EngvoProvider,
  EngvoRealtimeVoice,
  EngvoSpeechSpeedPresetId,
  EngvoXaiCallVoice,
  EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'
import type { EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import type { SentenceType, TenseId } from '@/lib/types'
import type { ChatPatternId } from '@/lib/chatPattern'
import type { ChatPatternTuning, ChatPatternTuningMap, TunableChatPatternId } from '@/lib/chatPatternTuning'
import type { RewardsState } from '@/lib/rewardsState'
import type { AdaptiveFooterView } from '@/types/adaptiveRetention'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { resolveAppPanelHorizontalLayout } from '@/lib/appPanelLayout'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'

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
  /** Режим звонка Engvo: при открытии меню показать «Позвонить» (как при переходе к звонку). */
  engvoVoiceMode?: boolean
  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
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
  onOpenVocabularyByLevel?: () => Promise<void> | void
  onOpenAdaptivePracticeTopic?: (topic: string) => void
  /** Футер приложения при «Мой путь» в меню уроков. */
  onAdaptiveFooterViewChange?: (view: AdaptiveFooterView | null) => void
  /** Открыть урок из ветки «Репетитор». */
  onOpenTutorLesson?: (request: {
    requestedTopic: string
    originalQuery?: string
    selectedIntent?: TutorLearningIntent
    analysisSummary?: string
    catalogLessonId?: string
  }) => Promise<void> | void
  onPracticeTheoryTagFilterPersist?: (tagId: string | null) => void
  /** Контекст меню, из которого открыт урок. */
  lessonMenuContext?: LessonMenuContext | null
  /** Одноразовый флаг: при следующем открытии восстановить панель уроков (кнопка «Назад» в уроке). */
  restoreLessonMenuOnNextOpenRef?: React.MutableRefObject<boolean>
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
  onOpenVocabularyByLevel,
  onOpenAdaptivePracticeTopic,
  onAdaptiveFooterViewChange,
  onOpenTutorLesson,
  onPracticeTheoryTagFilterPersist,
  lessonMenuContext,
  restoreLessonMenuOnNextOpenRef,
  topOffset = 'calc(2.75rem + env(safe-area-inset-top, 0px))',
  bottomOffset = '0px',
  columnBounds = null,
  practiceProgressRevision = 0,
}: SlideOutMenuProps) {
  const [menuView, setMenuView] = React.useState<MenuView>('root')
  /** Восстановить подпанель уроков только при открытии меню из активного урока/практики, не при ручном «Уроки». */
  const [lessonsRestorePanel, setLessonsRestorePanel] = React.useState<LessonsPanel | undefined>(undefined)
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
    (v: MenuView) => {
      if (v === 'root') {
        setLessonsRestorePanel(undefined)
      } else if (v === 'lessons' && menuView === 'root') {
        setLessonsRestorePanel(undefined)
      }
      setMenuView(v)
    },
    [menuView]
  )

  React.useLayoutEffect(() => {
    if (!open) {
      setMenuView('root')
      setLessonsRestorePanel(undefined)
      return
    }
    if (
      restoreLessonMenuOnNextOpenRef?.current &&
      lessonMenuContext?.menuView === 'lessons'
    ) {
      restoreLessonMenuOnNextOpenRef.current = false
      setLessonsRestorePanel(lessonMenuContext.lessonsPanel)
      setMenuView('lessons')
      return
    }
    if (chatActive && lessonMenuContext?.menuView === 'lessons') {
      setLessonsRestorePanel(lessonMenuContext.lessonsPanel)
      setMenuView('lessons')
      return
    }
    setLessonsRestorePanel(undefined)
    if (chatActive && engvoVoiceMode) {
      setMenuView('engvo')
      return
    }
    setMenuView(chatActive ? 'aiChat' : 'root')
  }, [open, chatActive, engvoVoiceMode, lessonMenuContext, restoreLessonMenuOnNextOpenRef])

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
        onStartHomeChat={onStartChat}
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
        onOpenVocabularyByLevel={onOpenVocabularyByLevel}
        onOpenAdaptivePracticeTopic={onOpenAdaptivePracticeTopic}
        onAdaptiveFooterViewChange={onAdaptiveFooterViewChange}
        onOpenTutorLesson={onOpenTutorLesson}
        onPracticeTheoryTagFilterPersist={onPracticeTheoryTagFilterPersist}
        practiceProgressRevision={practiceProgressRevision}
        initialLessonsPanel={menuView === 'lessons' ? lessonsRestorePanel : undefined}
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
          className="fixed left-0 right-0 bottom-0 z-40 bg-black/20 transition-opacity duration-200"
          style={{ top: topOffset, bottom: bottomOffset }}
          aria-hidden
          onClick={onToggle}
        />
      ) : null}
      {open && panelPositioned ? (
        <div
          className="pointer-events-none fixed z-50 overflow-x-hidden"
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
          className={`fixed left-0 z-50 w-80 max-w-[85vw] ${panelSurfaceClass} ${panelOpenEdgeClass} pointer-events-auto transition-transform duration-200 ease-out translate-x-0`}
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
