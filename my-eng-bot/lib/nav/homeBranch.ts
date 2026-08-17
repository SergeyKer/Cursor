export type HomeBranchOrigin = 'home' | 'menu'

export type HomeBranchFrame = 'landing' | 'sections' | 'myPlan' | 'progress'

export const HOME_BRANCH_DEFAULT_ORIGIN: HomeBranchOrigin = 'menu'

export function createHomeBranchStack(): HomeBranchFrame[] {
  return ['landing']
}

export function peekHomeFrame(stack: HomeBranchFrame[]): HomeBranchFrame {
  return stack[stack.length - 1] ?? 'landing'
}

export function pushHomeFrame(stack: HomeBranchFrame[], frame: HomeBranchFrame): HomeBranchFrame[] {
  if (peekHomeFrame(stack) === frame) return stack
  return [...stack, frame]
}

export function popHomeFrame(stack: HomeBranchFrame[]): HomeBranchFrame[] {
  if (stack.length <= 1) return ['landing']
  return stack.slice(0, -1)
}

export function openHomeMyPlan(stack: HomeBranchFrame[]): HomeBranchFrame[] {
  const current = peekHomeFrame(stack)
  if (current === 'myPlan') return stack
  if (current === 'progress') return pushHomeFrame(popHomeFrame(stack), 'myPlan')
  return pushHomeFrame(stack, 'myPlan')
}

export function openHomeProgress(stack: HomeBranchFrame[]): HomeBranchFrame[] {
  const current = peekHomeFrame(stack)
  if (current === 'progress') return stack
  if (current === 'myPlan') return pushHomeFrame(stack, 'progress')
  return pushHomeFrame(pushHomeFrame(stack, 'myPlan'), 'progress')
}

export function openHomeSections(stack: HomeBranchFrame[]): HomeBranchFrame[] {
  const current = peekHomeFrame(stack)
  if (current === 'sections') return stack
  if (current === 'landing') return pushHomeFrame(stack, 'sections')
  return ['landing', 'sections']
}

export function shouldShowHomeBranchBack(input: {
  origin: HomeBranchOrigin
  menuOpen: boolean
  homeSectionsOpen: boolean
  dialogStarted: boolean
  myPlanSpaceActive: boolean
  progressSpaceActive: boolean
}): boolean {
  if (input.menuOpen) return false
  if (input.origin !== 'home') return false
  if (input.myPlanSpaceActive || input.progressSpaceActive) return true
  return input.homeSectionsOpen && !input.dialogStarted
}

export function shouldShowHomePlanComposerBack(origin: HomeBranchOrigin = HOME_BRANCH_DEFAULT_ORIGIN): boolean {
  return origin !== 'home'
}

export function shouldShowHomeProgressComposer(origin: HomeBranchOrigin = HOME_BRANCH_DEFAULT_ORIGIN): boolean {
  return origin !== 'home'
}

export function isMenuChatActive(input: {
  dialogStarted: boolean
  isMyPlanSpaceActive?: boolean
  isProgressSpaceActive?: boolean
  isTutorChatSpaceActive?: boolean
  isVocabularyHubActive?: boolean
}): boolean {
  if (!input.dialogStarted) return false
  if (input.isMyPlanSpaceActive) return false
  if (input.isProgressSpaceActive) return false
  if (input.isTutorChatSpaceActive) return false
  if (input.isVocabularyHubActive) return false
  return true
}
