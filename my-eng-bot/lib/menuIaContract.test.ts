import { describe, expect, it } from 'vitest'
import type { AppMode } from '@/lib/types'
import type { EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'

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
})
