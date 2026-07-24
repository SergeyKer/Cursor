import { describe, expect, it } from 'vitest'
import {
  buildIdleNowCardView,
  buildMoreEmptyCardView,
  myPlanButton,
  myPlanCopy,
  myPlanInviteFromGoalType,
  myPlanLevelLine,
  myPlanNowInvite,
  myPlanStreakLine,
  myPlanTimeLabel,
  myPlanTopicLine,
  myPlanWhy,
  ruDayWord,
} from '@/lib/uiCopy/myPlan'

describe('myPlan copy dictionary', () => {
  it('child sections are short', () => {
    const c = myPlanCopy('child')
    expect(c.sectionNow).toBe('Сейчас')
    expect(c.statusLink).toContain('сделал')
    expect(c.referenceLink).toBe('Справочник')
  })

  it('idle and more-empty placeholders differ by audience', () => {
    const child = myPlanCopy('child')
    const adult = myPlanCopy('adult')
    expect(child.nowIdleTitle).toBe('Пока спокойно')
    expect(adult.nowIdleTitle).toBe('Срочного шага нет')
    expect(child.moreEmptyTitle).toBe('Пока ничего рядом')
    expect(adult.moreEmptyTitle).toBe('Дополнительного шага нет')
    expect(child.nowIdleReason.length).toBeGreaterThan(0)
    expect(adult.moreEmptyReason.length).toBeGreaterThan(0)

    const idle = buildIdleNowCardView('adult')
    expect(idle.headerTitle).toBe('Сейчас')
    expect(idle.footer).toBeNull()
    const more = buildMoreEmptyCardView('child')
    expect(more.headerTitle).toBe('Ещё можно')
    expect(more.footer).toBeNull()
  })

  it('why is one short phrase', () => {
    expect(myPlanWhy('incomplete', 'child').includes('\n')).toBe(false)
    expect(myPlanWhy('incomplete', 'child')).toMatch(/начинал/)
    expect(myPlanWhy('incomplete', 'adult')).toMatch(/начинали/)
    expect(myPlanWhy('incomplete', 'adult')).toMatch(/не закончили/)
    expect(myPlanWhy('reinforce', 'adult', { errorCount: 3 })).toMatch(/3/)
    expect(myPlanWhy('reinforce', 'child', { errorCount: 3 })).toMatch(/ошиб/)
  })

  it('buttons differ by audience', () => {
    expect(myPlanButton('incomplete', 'child')).toBe('Продолжить')
    expect(myPlanButton('incomplete', 'adult')).toBe('Продолжить урок')
  })

  it('time unknown is null', () => {
    expect(myPlanTimeLabel('unknown', 'child')).toBeNull()
    expect(myPlanTimeLabel('short', 'child')).toBe('Коротко')
  })

  it('ruDayWord plural forms', () => {
    expect(ruDayWord(0)).toBe('дней')
    expect(ruDayWord(1)).toBe('день')
    expect(ruDayWord(2)).toBe('дня')
    expect(ruDayWord(5)).toBe('дней')
    expect(ruDayWord(21)).toBe('день')
    expect(ruDayWord(22)).toBe('дня')
    expect(ruDayWord(11)).toBe('дней')
  })

  it('status lines', () => {
    expect(myPlanStreakLine(1, 'adult')).toBe('Серия: 1 день')
    expect(myPlanStreakLine(2, 'adult')).toBe('Серия: 2 дня')
    expect(myPlanStreakLine(5, 'adult')).toBe('Серия: 5 дней')
    expect(myPlanStreakLine(0, 'adult')).toContain('начни сегодня')
    expect(myPlanStreakLine(1, 'child')).toContain('1 день')
    expect(myPlanLevelLine(3, 120, 'adult')).toContain('XP')
  })

  it('invite questions by goalType', () => {
    expect(myPlanNowInvite('incomplete')).toBe('Продолжим урок?')
    expect(myPlanInviteFromGoalType('soft_return')).toBe('С возвращением?')
    expect(myPlanInviteFromGoalType('reinforce')).toBe('Поправим ошибки?')
    expect(myPlanInviteFromGoalType('soft_return')).not.toBe(
      myPlanInviteFromGoalType('reinforce')
    )
    expect(myPlanInviteFromGoalType(undefined)).toBe('С чего начнём?')
  })

  it('topic lines use EN topic name', () => {
    expect(myPlanTopicLine('lesson', "It's time")).toBe("Урок: It's time")
    expect(myPlanTopicLine('practice', 'короткая')).toBe('Практика: короткая')
    expect(myPlanTopicLine('topic', 'Present Simple')).toBe('Тема: Present Simple')
    expect(myPlanTopicLine('lessons')).toBe('Уроки')
  })
})
