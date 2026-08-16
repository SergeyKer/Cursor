import { describe, expect, it } from 'vitest'
import {
  PROGRESS_CHILD_BANNED_HERO_TERMS,
  compactOpportunityTopicLabel,
  formatAttentionZoneMeta,
  formatOpportunityBodyLine,
  formatOpportunityTitle,
  progressCopy,
  progressOpportunityReason,
  ruRazWord,
  ruZachetWord,
  ruZanyatieWord,
} from '@/lib/uiCopy/progress'

describe('progress copy', () => {
  it('child hero labels avoid banned jargon and Premium', () => {
    const c = progressCopy('child')
    const heroBlob = [
      c.awardsTitle,
      c.showShelf,
      c.todayTitle,
      c.aiTitle,
      c.dialogueCorrect,
      c.usageLabel,
      c.premiumCue,
      c.nearRewardTitle,
      c.emptyTitle,
      c.emptyBody,
      c.toMyPlan,
      c.streakShort,
      c.levelShort,
      c.xpShort,
      c.currentLevelLabel,
      c.saveStreak,
      c.weakZonesTitle,
      c.weakZonesCta,
      c.remarksTitle,
      c.remarksEmpty,
      c.remarksMore,
      c.modesTranslation,
      c.modesDialogue,
      c.modesVocabulary,
      c.modesTutor,
      c.modesPronunciation,
      c.calendarTitle,
      c.calendarDayInStreak,
      c.calendarDayNoClosed,
      c.calendarDayEmpty,
      c.calendarNow,
      c.calendarMore,
      c.calendarLessonDone,
      c.calendarVocabReviewed,
      c.calendarVocabLearned,
      c.ritualTitle,
      c.ritualDailySoon,
      c.ritualStreakSoon,
      c.ritualRubySoon,
      c.ritualMilestonesSoon,
      c.ritualLaterTail,
      c.balanceRubySoon,
      c.balanceDiamondSoon,
    ].join(' ')
    for (const term of PROGRESS_CHILD_BANNED_HERO_TERMS) {
      expect(heroBlob.toLowerCase()).not.toContain(term.toLowerCase())
    }
  })

  it('adult premium cue mentions Premium', () => {
    expect(progressCopy('adult').premiumCue).toContain('Premium')
  })

  it('opportunity reasons stay child-friendly', () => {
    const line = formatOpportunityBodyLine('gold_ring', 'child', true, 0)
    expect(line.toLowerCase()).not.toContain('11/12')
    expect(line.toLowerCase()).not.toContain('путь')
    expect(line.toLowerCase()).not.toContain('золото')
    expect(line.toLowerCase()).not.toContain('зачёт')
    expect(line).toBe('Ещё 5 раз — будет кубок.')
  })

  it('gold_ring without cups has no slogan path', () => {
    expect(formatOpportunityBodyLine('gold_ring', 'adult', false, 0).toLowerCase()).not.toContain('путь')
    expect(formatOpportunityBodyLine('gold_ring', 'child', false, 0).toLowerCase()).not.toContain('путь')
    expect(formatOpportunityBodyLine('gold_ring', 'child', false, 0).toLowerCase()).not.toContain('золото')
    expect(formatOpportunityBodyLine('gold_ring', 'adult', false, 3)).toBe('Ещё 2 зачёта — будут камни.')
  })

  it('gems_pending asks to claim the gem without gold jargon or remaining count', () => {
    const line = formatOpportunityBodyLine('gems_pending', 'child', false, 5)
    expect(line.toLowerCase()).toContain('камень')
    expect(line.toLowerCase()).not.toContain('золото')
    expect(line.toLowerCase()).not.toContain('ещё')
  })

  it('child start CTA is train not start-practice jargon', () => {
    expect(progressCopy('child').startPractice).toBe('Тренировать')
    expect(progressCopy('child').nearRewardTitle).toBe('Практика')
    expect(progressCopy('child').remarksTitle).toBe('Что поправить')
    expect(progressCopy('adult').remarksTitle).toBe('Недавние ошибки')
    expect(progressCopy('adult').remarksReview).toBe('К теме')
    expect(progressCopy('child').remarksReview).toBe('Ещё')
  })

  it('compact topic label and opportunity title', () => {
    expect(compactOpportunityTopicLabel('I am / I am from', 'Знакомство')).toBe('I am')
    expect(compactOpportunityTopicLabel(null, 'Знакомство')).toBe('Знакомство')
    expect(formatOpportunityTitle('I am', true)).toBe('I am 🥇')
    expect(formatOpportunityTitle('I am', false)).toBe('I am')
    expect(formatOpportunityBodyLine('gold_ring', 'adult', true, 0)).toBe('Ещё 5 зачётов — будет кубок.')
    expect(formatOpportunityBodyLine('gold_ring', 'adult', true, 3)).toBe('Ещё 2 зачёта — будет кубок.')
    expect(formatOpportunityBodyLine('gold_ring', 'adult', true, 5)).toBe('Следующая практика — кубок.')
    expect(progressOpportunityReason('gold_ring', 'child', true, 2)).toBe('Ещё 3 раза — будет кубок.')
  })

  it('link to my plan exists', () => {
    expect(progressCopy('child').toMyPlan).toContain('сейчас')
  })

  it('weak zones cta is an action not a plan label', () => {
    expect(progressCopy('child').weakZonesTitle).toBe('Тут путаешься')
    expect(progressCopy('child').weakZonesCta).toBe('Исправить')
    expect(progressCopy('adult').weakZonesCta).toBe('К заданиям')
  })

  it('ruRazWord plural forms', () => {
    expect(ruRazWord(1)).toBe('раз')
    expect(ruRazWord(2)).toBe('раза')
    expect(ruRazWord(5)).toBe('раз')
    expect(ruRazWord(11)).toBe('раз')
    expect(ruRazWord(21)).toBe('раз')
    expect(ruRazWord(22)).toBe('раза')
    expect(ruZachetWord(1)).toBe('зачёт')
    expect(ruZachetWord(2)).toBe('зачёта')
    expect(ruZachetWord(5)).toBe('зачётов')
    expect(ruZanyatieWord(1)).toBe('занятие')
    expect(ruZanyatieWord(2)).toBe('занятия')
    expect(ruZanyatieWord(5)).toBe('занятий')
  })

  it('ritual stubs have no fake 0/7 counters', () => {
    for (const audience of ['child', 'adult'] as const) {
      const c = progressCopy(audience)
      const blob = [c.ritualDailySoon, c.ritualStreakSoon, c.ritualRubySoon, c.ritualMilestonesSoon].join(' ')
      expect(blob).not.toMatch(/0\s*[/из]\s*7/)
      expect(blob.toLowerCase()).not.toContain('закрыт')
    }
  })

  it('formatAttentionZoneMeta joins hint and count', () => {
    expect(formatAttentionZoneMeta('В общении', 1)).toBe('В общении · 1 раз')
    expect(formatAttentionZoneMeta('У репетитора', 4)).toBe('У репетитора · 4 раза')
    expect(formatAttentionZoneMeta('В общении', 0)).toBe('В общении')
  })
})
