import { describe, expect, it } from 'vitest'
import { buildPracticeBriefingThesisLines } from '@/lib/practice/practiceBriefingThesisCopy'

const base = {
  tier: 2 as const,
  ringCount: 0,
  lastQualifyingDayKey: null,
  todayKey: '2026-07-12',
  baseBadgeClaimed: false,
  pendingPracticeCoins: 0,
  pendingCup: false,
  practiceGlobalXpToday: 0,
  audience: 'child' as const,
  forgivenessEnabled: true,
}

describe('buildPracticeBriefingThesisLines', () => {
  it('orders challenge as goal → XP → forgiveness for child', () => {
    const challenge = buildPracticeBriefingThesisLines({ ...base, mode: 'challenge' })
    expect(challenge).toEqual([
      '📝 Победа: 11 из 12 сразу правильно.',
      '⭐ Ещё XP — если больше половины сразу правильно.',
      '💡 С 5-го шага 1 ошибку можно простить за 1 монету.',
    ])
  })

  it('orders challenge as goal → XP → forgiveness for adult', () => {
    const challenge = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      audience: 'adult',
    })
    expect(challenge).toEqual([
      '📝 Цель: 11 из 12 с первой попытки.',
      '⭐ XP к уровню — если больше половины с первой попытки.',
      '💡 С 5-го шага 1 ошибку можно пропустить за 1🪙.',
    ])
  })

  it('describes relaxed and reference without Ещё XP', () => {
    expect(buildPracticeBriefingThesisLines({ ...base, mode: 'reference' })).toEqual([
      '⭐ В этом режиме XP к уровню нет.',
      '⚡ Здесь одно упражнение.',
    ])
    expect(buildPracticeBriefingThesisLines({ ...base, mode: 'relaxed' })).toEqual([
      '⭐ Больше половины сразу правильно — дадим XP.',
      '🌱 Это разминка — победы и кубка здесь нет.',
    ])
  })

  it('orders balanced as goal → XP', () => {
    const lines = buildPracticeBriefingThesisLines({ ...base, mode: 'balanced', audience: 'adult' })
    expect(lines[0]).toBe('📌 Цель: 8 из 9 с первой попытки.')
    expect(lines[1]).toBe('⭐ XP к уровню — если больше половины с первой попытки.')
  })

  it('does not promise a second qualifying pass today', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      lastQualifyingDayKey: base.todayKey,
    })
    expect(lines[0]).toContain('завтра снова')
    expect(lines[1]).toContain('XP ещё можно')
    expect(lines.join(' ')).not.toContain('простить за 1')
  })

  it('explains medal and daily-cap blockers', () => {
    const tier0 = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      tier: 0,
      audience: 'adult',
    })
    expect(tier0[0]).toContain('Цель откроется после медали')
    expect(tier0[1]).toContain('Без медали урока')

    expect(
      buildPracticeBriefingThesisLines({
        ...base,
        mode: 'relaxed',
        practiceGlobalXpToday: 70,
        audience: 'adult',
      })[0]
    ).toContain('уже набраны')
  })

  it('shows pending rewards instead of forgiveness', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      pendingPracticeCoins: 1,
      audience: 'adult',
    })
    expect(lines[2]).toContain('золотую медаль урока')
    expect(lines.join(' ')).not.toContain('пропустить')
  })
})
