export type BranchId = 'hub' | 'chat' | 'lesson' | 'practice' | 'engvo' | 'accent' | 'vocabulary'

export const BRANCH_IDS: BranchId[] = [
  'hub',
  'chat',
  'lesson',
  'practice',
  'engvo',
  'accent',
  'vocabulary',
]

type BranchLoader = () => Promise<unknown>

export const branchLoaders: Record<BranchId, BranchLoader> = {
  hub: () => import('@/components/branches/HubBranch'),
  chat: () => import('@/components/branches/ChatBranch'),
  lesson: () => import('@/components/branches/LessonBranch'),
  practice: () => import('@/components/branches/PracticeBranch'),
  engvo: () => import('@/components/branches/EngvoBranch'),
  accent: () => import('@/components/branches/AccentBranch'),
  vocabulary: () => import('@/components/branches/VocabularyBranch'),
}

export function prefetchBranch(branchId: BranchId): void {
  void branchLoaders[branchId]()
}

export function prefetchBranches(branchIds: BranchId[]): void {
  for (const id of branchIds) prefetchBranch(id)
}
