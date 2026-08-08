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
  it('orders challenge as goal → XP → coin ladder for child', () => {
    const challenge = buildPracticeBriefingThesisLines({ ...base, mode: 'challenge' })
    expect(challenge).toEqual([
      '📝 Победа: 11/12 · сейчас 0/5.',
      '⭐ Ещё XP — если больше половины сразу правильно.',
      '🪙 Монеты: 3-й зачёт +1 · 5-й +2.',
    ])
  })

  it('orders challenge as goal → XP → coin ladder for adult', () => {
    const challenge = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      audience: 'adult',
    })
    expect(challenge).toEqual([
      '📝 Цель: 11/12 · сейчас 0/5.',
      '⭐ XP к уровню — если больше половины с первой попытки.',
      '🪙 Монеты: 3-й зачёт +1 · 5-й +2.',
    ])
  })

  it('describes relaxed and reference without coins path', () => {
    expect(buildPracticeBriefingThesisLines({ ...base, mode: 'reference' })).toEqual([
      '⭐ В этом режиме XP к уровню нет.',
      '⚡ Без монет и кубка.',
    ])
    expect(buildPracticeBriefingThesisLines({ ...base, mode: 'relaxed' })).toEqual([
      '⭐ Больше половины сразу правильно — дадим XP.',
      '🌱 Разминка — зачёта и монет нет (нужен Челлендж).',
    ])
  })

  it('orders balanced as goal → no-coins → XP', () => {
    const lines = buildPracticeBriefingThesisLines({ ...base, mode: 'balanced', audience: 'adult' })
    expect(lines[0]).toBe('🔵 Цель: 8 из 9 с первой попытки.')
    expect(lines[1]).toContain('Монет')
    expect(lines[1]).toContain('Челлендж')
    expect(lines[2]).toBe('⭐ XP к уровню — если больше половины с первой попытки.')
  })

  it('prefers coin earn line over badge on challenge', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      badgeBriefingLine: 'До 🟡 «Супер-следователь»: 📝 2/5.',
    })
    expect(lines[2]).toContain('3-й зачёт +1')
    expect(lines.join(' ')).not.toContain('Супер-следователь')
    expect(lines.join(' ')).not.toContain('простить')
  })

  it('shows badge when coin line unavailable (day locked)', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      lastQualifyingDayKey: base.todayKey,
      badgeBriefingLine: 'До 🟡 «Супер-следователь»: 📝 2/5.',
    })
    expect(lines[0]).toContain('завтра снова')
    expect(lines[2]).toContain('Супер-следователь')
    expect(lines.join(' ')).not.toContain('простить')
    expect(lines.join(' ')).not.toContain('3-й зачёт +1')
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
    expect(lines.join(' ')).not.toContain('+1 монета')
  })

  it('embeds current ring count and next-coin stakes', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      ringCount: 2,
      audience: 'adult',
      forgivenessEnabled: false,
    })
    expect(lines[0]).toBe('📝 Цель: 11/12 · сейчас 2/5.')
    expect(lines[2]).toContain('Если 11/12')
    expect(lines[2]).toContain('+1')
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
    expect(tier0.join(' ')).not.toContain('3-й зачёт')

    expect(
      buildPracticeBriefingThesisLines({
        ...base,
        mode: 'relaxed',
        practiceGlobalXpToday: 70,
        audience: 'adult',
      })[0]
    ).toContain('уже набраны')
  })

  it('shows pending rewards instead of ladder or forgiveness', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      pendingPracticeCoins: 1,
      audience: 'adult',
    })
    expect(lines[2]).toContain('ждут')
    expect(lines.join(' ')).not.toContain('пропустить')
    expect(lines.join(' ')).not.toContain('3-й зачёт +1')
  })

  it('tier1 promises accumulation not immediate payout', () => {
    const lines = buildPracticeBriefingThesisLines({
      ...base,
      mode: 'challenge',
      tier: 1,
      ringCount: 2,
      audience: 'adult',
    })
    expect(lines[2]).toContain('после золота')
    expect(lines[2]).not.toContain('+1 монета')
  })
})
