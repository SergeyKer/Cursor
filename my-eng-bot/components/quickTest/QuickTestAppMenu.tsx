'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import SlideOutMenu from '@/components/SlideOutMenu'
import type { LearningLessonMenuMeta, LessonsPanel } from '@/components/MenuSectionPanels'
import { useAppColumnBounds } from '@/hooks/useAppColumnBounds'
import type { Settings, UsageInfo } from '@/lib/types'
import {
  DEFAULT_SETTINGS,
  getUsageCountToday,
  loadState,
  normalizeOpenAiChatPreset,
  saveState,
} from '@/lib/storage'
import {
  createDefaultRewardsState,
  loadRewardsState,
  reconcileModeGoalSessions,
  saveRewardsState,
  type RewardsState,
} from '@/lib/rewardsState'
import {
  applyChatPatternState,
  getDefaultChatPatternTuning,
  loadChatPatternTuningMap,
  normalizeChatPatternTuning,
  resolveChatPatternTuning,
  saveChatPatternTuningMap,
  type ChatPatternTuning,
  type ChatPatternTuningMap,
  type TunableChatPatternId,
} from '@/lib/chatPatternTuning'
import { loadChatPattern, saveChatPattern, type ChatPatternId } from '@/lib/chatPattern'
import {
  loadPracticeTtsSpeedDefaultIndex,
  savePracticeTtsSpeedDefaultIndex,
} from '@/lib/practice/practiceTtsPreferences'
import {
  loadEngvoCefrLevel,
  loadEngvoProvider,
  loadEngvoRealtimeVoice,
  loadEngvoSpeechSpeedPreset,
  loadEngvoXaiVoice,
  loadEngvoXaiVoiceRotationMode,
  resolveEngvoSpeechSpeedPreset,
  saveEngvoCefrLevel,
  saveEngvoProvider,
  saveEngvoRealtimeVoice,
  saveEngvoSpeechSpeedPreset,
  saveEngvoXaiVoice,
  saveEngvoXaiVoiceRotationMode,
} from '@/lib/engvo/preferences'
import type {
  EngvoCefrLevel,
  EngvoProvider,
  EngvoRealtimeVoice,
  EngvoSpeechSpeedPresetId,
  EngvoXaiCallVoice,
  EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'
import { readEntryContext, writeEntryContext, writeOpenLessonIntent } from '@/lib/quickTest/openLessonIntent'

type QuickTestAppMenuProps = {
  open: boolean
  onToggle: () => void
  columnRef: React.RefObject<HTMLElement | null>
  onLeaveTest?: () => boolean
  onDebugSkipToQuickTestFinale?: () => void
  quickTestSessionActiveForDebug?: boolean
  quickTestLobbyActiveForDebug?: boolean
  onOpenQuickTest?: () => void
}

function normalizeQuickTestSettings(settings: Settings): Settings {
  return {
    ...settings,
    openAiChatPreset: normalizeOpenAiChatPreset(settings.openAiChatPreset),
    level: settings.level === 'starter' ? 'a1' : settings.level,
  }
}

export function QuickTestAppMenu({
  open,
  onToggle,
  columnRef,
  onLeaveTest,
  onDebugSkipToQuickTestFinale,
  quickTestSessionActiveForDebug = false,
  quickTestLobbyActiveForDebug = false,
  onOpenQuickTest,
}: QuickTestAppMenuProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [rewardsState, setRewardsState] = useState<RewardsState>(createDefaultRewardsState)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [engvoProvider, setEngvoProvider] = useState<EngvoProvider>(() => loadEngvoProvider())
  const [engvoRealtimeVoice, setEngvoRealtimeVoice] = useState<EngvoRealtimeVoice>(() =>
    loadEngvoRealtimeVoice()
  )
  const [engvoXaiVoice, setEngvoXaiVoice] = useState<EngvoXaiCallVoice>(() => loadEngvoXaiVoice())
  const [engvoXaiVoiceRotationMode, setEngvoXaiVoiceRotationMode] =
    useState<EngvoXaiVoiceRotationMode>(() => loadEngvoXaiVoiceRotationMode())
  const [engvoCefrLevel, setEngvoCefrLevel] = useState<EngvoCefrLevel>(() =>
    loadEngvoCefrLevel(DEFAULT_SETTINGS.audience)
  )
  const [engvoSpeechSpeedPreset, setEngvoSpeechSpeedPreset] = useState<EngvoSpeechSpeedPresetId>(() =>
    resolveEngvoSpeechSpeedPreset({ audience: DEFAULT_SETTINGS.audience, level: loadEngvoCefrLevel(DEFAULT_SETTINGS.audience) })
  )
  const [practiceTtsSpeedDefaultIndex, setPracticeTtsSpeedDefaultIndex] = useState(() =>
    loadPracticeTtsSpeedDefaultIndex()
  )
  const [chatPatternId, setChatPatternId] = useState<ChatPatternId>(() => loadChatPattern())
  const [chatPatternTuningMap, setChatPatternTuningMap] = useState<ChatPatternTuningMap>(() =>
    loadChatPatternTuningMap()
  )
  const chatPatternTuningMapRef = useRef(chatPatternTuningMap)
  const usageRequestStartedRef = useRef(false)

  const columnBounds = useAppColumnBounds(columnRef, { remeasureWhen: open })

  useLayoutEffect(() => {
    chatPatternTuningMapRef.current = chatPatternTuningMap
  }, [chatPatternTuningMap])

  useLayoutEffect(() => {
    try {
      const state = loadState()
      const rewards = reconcileModeGoalSessions(loadRewardsState())
      const mergedSettings = normalizeQuickTestSettings({
        ...state.settings,
        openAiChatPreset: 'gpt-4o-mini',
      })
      setSettings(mergedSettings)
      setRewardsState(rewards)
      const loadedEngvoLevel = loadEngvoCefrLevel(mergedSettings.audience)
      setEngvoCefrLevel(loadedEngvoLevel)
      setEngvoSpeechSpeedPreset(
        resolveEngvoSpeechSpeedPreset({
          audience: mergedSettings.audience,
          level: loadedEngvoLevel,
        })
      )
      setEngvoProvider(loadEngvoProvider())
      setEngvoRealtimeVoice(loadEngvoRealtimeVoice())
      setEngvoXaiVoice(loadEngvoXaiVoice())
      setEngvoXaiVoiceRotationMode(loadEngvoXaiVoiceRotationMode())
      setPracticeTtsSpeedDefaultIndex(loadPracticeTtsSpeedDefaultIndex())
      const loadedChatPattern = loadChatPattern()
      const loadedChatPatternTuningMap = loadChatPatternTuningMap()
      setChatPatternId(loadedChatPattern)
      setChatPatternTuningMap(loadedChatPatternTuningMap)
    } catch (error) {
      console.error('Failed to load quick test menu state', error)
    } finally {
      setStorageLoaded(true)
    }
  }, [])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      if (!res.ok) throw new Error('usage fetch failed')
      const data = (await res.json()) as { used?: number; limit?: number }
      setUsage({
        used: typeof data.used === 'number' ? data.used : getUsageCountToday(),
        limit: typeof data.limit === 'number' ? data.limit : 50,
      })
    } catch {
      setUsage((prev) => ({ ...prev, used: getUsageCountToday() }))
    }
  }, [])

  useEffect(() => {
    if (!storageLoaded || !open) return
    if (usageRequestStartedRef.current) return
    usageRequestStartedRef.current = true
    void fetchUsage()
  }, [fetchUsage, open, storageLoaded])

  const tryLeaveTestAndNavigate = useCallback(
    (href: string) => {
      if (onLeaveTest?.() === false) return
      window.location.assign(href)
    },
    [onLeaveTest]
  )

  const handleOpenQuickTest = useCallback(() => {
    if (open) onToggle()
    onOpenQuickTest?.()
  }, [open, onToggle, onOpenQuickTest])

  const handleSettingsChange = useCallback((next: Settings) => {
    const normalized = normalizeQuickTestSettings(next)
    setSettings(normalized)
    const { messages } = loadState()
    saveState(messages, normalized)
  }, [])

  const handleRewardsStateChange = useCallback((next: RewardsState) => {
    setRewardsState(next)
    saveRewardsState(next)
  }, [])

  const handleChatPatternChange = useCallback((id: ChatPatternId) => {
    setChatPatternId(id)
    saveChatPattern(id)
    applyChatPatternState(id, chatPatternTuningMapRef.current)
  }, [])

  const handleChatPatternTuningChange = useCallback(
    (id: TunableChatPatternId, patch: Partial<ChatPatternTuning>) => {
      setChatPatternTuningMap((prev) => {
        const resolved = resolveChatPatternTuning(prev, id)
        const nextTuning = normalizeChatPatternTuning(
          { ...resolved, ...patch },
          getDefaultChatPatternTuning(id)
        )
        const next: ChatPatternTuningMap = { ...prev, [id]: nextTuning }
        saveChatPatternTuningMap(next)
        if (chatPatternId === id) {
          applyChatPatternState(id, next)
        }
        return next
      })
    },
    [chatPatternId]
  )

  const handleChatPatternTuningReset = useCallback(
    (id: TunableChatPatternId) => {
      setChatPatternTuningMap((prev) => {
        const next = { ...prev }
        delete next[id]
        saveChatPatternTuningMap(next)
        if (chatPatternId === id) {
          applyChatPatternState(id, next)
        }
        return next
      })
    },
    [chatPatternId]
  )

  const handleOpenLearningLesson = useCallback(
    (lessonId: string, _lessonsPanel?: LessonsPanel, _meta?: LearningLessonMenuMeta) => {
      const entry = readEntryContext()
      writeOpenLessonIntent({
        lessonId,
        source: 'internal_menu',
        audience: entry?.audience ?? (settings.audience === 'child' ? 'child' : 'adult'),
        createdAt: Date.now(),
      })
      writeEntryContext({
        source: 'internal_menu',
        audience: settings.audience === 'child' ? 'child' : 'adult',
      })
      tryLeaveTestAndNavigate('/')
    },
    [settings.audience, tryLeaveTestAndNavigate]
  )

  if (!storageLoaded) return null

  return (
    <SlideOutMenu
      open={open}
      onToggle={onToggle}
      hideButton
      settings={settings}
      onSettingsChange={handleSettingsChange}
      usage={usage}
      dialogueCorrectAnswers={0}
      rewardsState={rewardsState}
      onRewardsStateChange={handleRewardsStateChange}
      onGoHome={() => tryLeaveTestAndNavigate('/')}
      onStartChat={() => tryLeaveTestAndNavigate('/')}
      onOpenEngvoVoiceChat={() => tryLeaveTestAndNavigate('/')}
      engvoProvider={engvoProvider}
      engvoRealtimeVoice={engvoRealtimeVoice}
      engvoXaiVoice={engvoXaiVoice}
      engvoXaiVoiceRotationMode={engvoXaiVoiceRotationMode}
      engvoCefrLevel={engvoCefrLevel}
      engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
      onEngvoProviderChange={(provider) => {
        setEngvoProvider(provider)
        saveEngvoProvider(provider)
      }}
      onEngvoVoiceChange={(voice) => {
        setEngvoRealtimeVoice(voice)
        saveEngvoRealtimeVoice(voice)
      }}
      onEngvoXaiVoiceChange={(voice) => {
        setEngvoXaiVoice(voice)
        saveEngvoXaiVoice(voice)
      }}
      onEngvoXaiVoiceRotationModeChange={(mode) => {
        setEngvoXaiVoiceRotationMode(mode)
        saveEngvoXaiVoiceRotationMode(mode)
      }}
      onEngvoLevelChange={(level) => {
        setEngvoCefrLevel(level)
        saveEngvoCefrLevel(level)
        if (!loadEngvoSpeechSpeedPreset()) {
          setEngvoSpeechSpeedPreset(
            resolveEngvoSpeechSpeedPreset({ audience: settings.audience, level })
          )
        }
      }}
      onEngvoSpeechSpeedChange={(preset) => {
        setEngvoSpeechSpeedPreset(preset)
        saveEngvoSpeechSpeedPreset(preset)
      }}
      practiceTtsSpeedDefaultIndex={practiceTtsSpeedDefaultIndex}
      onPracticeTtsSpeedDefaultChange={(index) => {
        setPracticeTtsSpeedDefaultIndex(index)
        savePracticeTtsSpeedDefaultIndex(index)
      }}
      chatPatternId={chatPatternId}
      onChatPatternChange={handleChatPatternChange}
      chatPatternTuningMap={chatPatternTuningMap}
      onChatPatternTuningChange={handleChatPatternTuningChange}
      onChatPatternTuningReset={handleChatPatternTuningReset}
      onOpenLearningLesson={handleOpenLearningLesson}
      onGenerateLearningLesson={handleOpenLearningLesson}
      onDebugSkipToQuickTestFinale={onDebugSkipToQuickTestFinale}
      quickTestSessionActiveForDebug={quickTestSessionActiveForDebug}
      quickTestLobbyActiveForDebug={quickTestLobbyActiveForDebug}
      onOpenQuickTest={onOpenQuickTest ? handleOpenQuickTest : undefined}
      onOpenPracticeSession={() => tryLeaveTestAndNavigate('/')}
      onGeneratePracticeSession={() => tryLeaveTestAndNavigate('/')}
      onOpenAccentTrainer={() => tryLeaveTestAndNavigate('/')}
      onOpenVocabularyWorlds={() => tryLeaveTestAndNavigate('/')}
      onOpenVocabularyByLevel={() => tryLeaveTestAndNavigate('/')}
      onOpenAdaptivePracticeTopic={() => tryLeaveTestAndNavigate('/')}
      onOpenTutorLesson={() => tryLeaveTestAndNavigate('/')}
      topOffset="var(--app-top-offset)"
      bottomOffset="var(--app-menu-panel-bottom)"
      columnBounds={columnBounds}
    />
  )
}
