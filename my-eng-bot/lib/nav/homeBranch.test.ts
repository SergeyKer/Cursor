import { describe, expect, it } from 'vitest'
import {
  createHomeBranchStack,
  isMenuChatActive,
  openHomeMyPlan,
  openHomeProgress,
  openHomeSections,
  peekHomeFrame,
  popHomeFrame,
  shouldShowHomeBranchBack,
  shouldShowHomePlanComposerBack,
  shouldShowHomeProgressComposer,
} from '@/lib/nav/homeBranch'

const chromeOff = {
  menuOpen: false,
  homeSectionsOpen: false,
  dialogStarted: false,
  myPlanSpaceActive: false,
  progressSpaceActive: false,
} as const

describe('home branch stack', () => {
  it('pops landing → myPlan back to landing', () => {
    const stack = openHomeMyPlan(createHomeBranchStack())
    expect(peekHomeFrame(stack)).toBe('myPlan')
    expect(peekHomeFrame(popHomeFrame(stack))).toBe('landing')
  })

  it('pops sections → myPlan back to sections', () => {
    const stack = openHomeMyPlan(openHomeSections(createHomeBranchStack()))
    expect(peekHomeFrame(stack)).toBe('myPlan')
    expect(peekHomeFrame(popHomeFrame(stack))).toBe('sections')
  })

  it('pops myPlan → progress back to myPlan', () => {
    const stack = openHomeProgress(openHomeMyPlan(createHomeBranchStack()))
    expect(peekHomeFrame(stack)).toBe('progress')
    expect(peekHomeFrame(popHomeFrame(stack))).toBe('myPlan')
  })

  it('does not duplicate the current frame', () => {
    const once = openHomeSections(createHomeBranchStack())
    expect(openHomeSections(once)).toEqual(once)
  })
})

describe('home branch chrome flags', () => {
  it('hides header back on landing and while the overlay is open', () => {
    expect(shouldShowHomeBranchBack({ origin: 'home', ...chromeOff })).toBe(false)
    expect(
      shouldShowHomeBranchBack({
        origin: 'home',
        ...chromeOff,
        menuOpen: true,
        myPlanSpaceActive: true,
        dialogStarted: true,
      })
    ).toBe(false)
  })

  it('shows header back on home-origin sections, myPlan, and progress', () => {
    expect(
      shouldShowHomeBranchBack({ origin: 'home', ...chromeOff, homeSectionsOpen: true })
    ).toBe(true)
    expect(
      shouldShowHomeBranchBack({
        origin: 'home',
        ...chromeOff,
        myPlanSpaceActive: true,
        dialogStarted: true,
      })
    ).toBe(true)
    expect(
      shouldShowHomeBranchBack({
        origin: 'home',
        ...chromeOff,
        progressSpaceActive: true,
        dialogStarted: true,
      })
    ).toBe(true)
  })

  it('hides header back on a live session even if home sections leftover is true', () => {
    expect(
      shouldShowHomeBranchBack({
        origin: 'home',
        ...chromeOff,
        homeSectionsOpen: true,
        dialogStarted: true,
      })
    ).toBe(false)
  })

  it('hides header back on menu origin', () => {
    expect(
      shouldShowHomeBranchBack({ origin: 'menu', ...chromeOff, homeSectionsOpen: true })
    ).toBe(false)
    expect(
      shouldShowHomeBranchBack({
        origin: 'menu',
        ...chromeOff,
        myPlanSpaceActive: true,
        dialogStarted: true,
      })
    ).toBe(false)
  })

  it('keeps composer back on menu origin and hides it on home origin', () => {
    expect(shouldShowHomePlanComposerBack('menu')).toBe(true)
    expect(shouldShowHomePlanComposerBack('home')).toBe(false)
    expect(shouldShowHomeProgressComposer('home')).toBe(false)
    expect(shouldShowHomeProgressComposer()).toBe(true)
  })
})

describe('isMenuChatActive', () => {
  it('is false on idle home', () => {
    expect(isMenuChatActive({ dialogStarted: false })).toBe(false)
  })

  it('is true for a live chat or lesson', () => {
    expect(isMenuChatActive({ dialogStarted: true })).toBe(true)
  })

  it('is false for plan, progress, tutor, and vocabulary spaces', () => {
    expect(isMenuChatActive({ dialogStarted: true, isMyPlanSpaceActive: true })).toBe(false)
    expect(isMenuChatActive({ dialogStarted: true, isProgressSpaceActive: true })).toBe(false)
    expect(isMenuChatActive({ dialogStarted: true, isTutorChatSpaceActive: true })).toBe(false)
    expect(isMenuChatActive({ dialogStarted: true, isVocabularyHubActive: true })).toBe(false)
  })
})
