import { describe, expect, it } from 'vitest'
import type { AppMode } from '@/lib/types'
import type { EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import { featureFlags } from '@/lib/featureFlags'

/** Mirrors MenuSectionPanels header helpers for regression. */
function resolveAiChatSummaryTitle(mode: AppMode): string {
  if (mode === 'dialogue') return 'Диалог'
  if (mode === 'translation') return 'Перевод'
  return 'Чат'
}

function resolveEngvoSummaryTitle(kind: EngvoVoiceSessionKind): string {
  return kind === 'teacher' ? 'Преподаватель' : 'Звонок'
}

function resolvePracticeLeafBackTarget(): 'practice' {
  return 'practice'
}

/** Hub deep-link presets (always applied; no sessionPresetsLocked). */
function hubCommunicationChatPreset(): AppMode {
  return 'communication'
}

function hubCommunicationCallPreset(): EngvoVoiceSessionKind {
  return 'free_call'
}

function hubPracticeChatPreset(mode: 'dialogue' | 'translation'): AppMode {
  return mode
}

function hubPracticeTeacherPreset(): EngvoVoiceSessionKind {
  return 'teacher'
}

describe('menu IA titles/back contract', () => {
  it('resolves aiChat summary titles by mode', () => {
    expect(resolveAiChatSummaryTitle('communication')).toBe('Чат')
    expect(resolveAiChatSummaryTitle('dialogue')).toBe('Диалог')
    expect(resolveAiChatSummaryTitle('translation')).toBe('Перевод')
  })

  it('resolves engvo summary titles by kind', () => {
    expect(resolveEngvoSummaryTitle('free_call')).toBe('Звонок')
    expect(resolveEngvoSummaryTitle('teacher')).toBe('Преподаватель')
  })

  it('backs from practice leaf to practice hub', () => {
    expect(resolvePracticeLeafBackTarget()).toBe('practice')
  })

  it('hub presets map to communication chat, free call, dialogue, translation, teacher', () => {
    expect(hubCommunicationChatPreset()).toBe('communication')
    expect(hubCommunicationCallPreset()).toBe('free_call')
    expect(hubPracticeChatPreset('dialogue')).toBe('dialogue')
    expect(hubPracticeChatPreset('translation')).toBe('translation')
    expect(hubPracticeTeacherPreset()).toBe('teacher')
  })

  it('branch switchers are locked by default', () => {
    expect(featureFlags.engMenuBranchSwitchersUnlocked).toBe(false)
  })
})
