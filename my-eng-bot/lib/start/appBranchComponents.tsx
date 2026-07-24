'use client'

import type { ComponentProps, ComponentType } from 'react'
import { branchDynamic } from '@/lib/start/branchDynamicLoading'
import type LessonBriefingScreenComponent from '@/components/LessonBriefingScreen'
import type LessonExtraTipsScreenComponent from '@/components/LessonExtraTipsScreen'
import type LessonIntroScreenComponent from '@/components/LessonIntroScreen'
import type LessonStepRendererComponent from '@/components/LessonStepRenderer'
import type ReferenceSheetScreenComponent from '@/components/ReferenceSheetScreen'
import type VocabularyByLevelScreenComponent from '@/components/vocabulary/VocabularyByLevelScreen'
import type VocabularyWorldsScreenComponent from '@/components/vocabulary/VocabularyWorldsScreen'

function branchNamed<P>(
  load: () => Promise<{ default: ComponentType<P> }>
) {
  return branchDynamic<P>(load)
}

export const MenuSectionPanels = branchDynamic(() => import('@/components/branches/HubBranch'))
export const Chat = branchDynamic(() => import('@/components/branches/ChatBranch'))

export const LessonIntroScreen = branchNamed<ComponentProps<typeof LessonIntroScreenComponent>>(() =>
  import('@/components/branches/LessonBranch').then((m) => ({
    default: m.LessonIntroScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof LessonIntroScreenComponent>> }>
)
export const LessonBriefingScreen = branchNamed<ComponentProps<typeof LessonBriefingScreenComponent>>(() =>
  import('@/components/branches/LessonBranch').then((m) => ({
    default: m.LessonBriefingScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof LessonBriefingScreenComponent>> }>
)
export const LessonExtraTipsScreen = branchNamed<ComponentProps<typeof LessonExtraTipsScreenComponent>>(() =>
  import('@/components/branches/LessonBranch').then((m) => ({
    default: m.LessonExtraTipsScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof LessonExtraTipsScreenComponent>> }>
)
export const LessonStepRenderer = branchNamed<ComponentProps<typeof LessonStepRendererComponent>>(() =>
  import('@/components/branches/LessonBranch').then((m) => ({
    default: m.LessonStepRenderer,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof LessonStepRendererComponent>> }>
)
export const ReferenceSheetScreen = branchNamed<ComponentProps<typeof ReferenceSheetScreenComponent>>(() =>
  import('@/components/branches/LessonBranch').then((m) => ({
    default: m.ReferenceSheetScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof ReferenceSheetScreenComponent>> }>
)

export const ProgressSheetScreen = branchDynamic(() => import('@/components/ProgressSheetScreen'))
export const MyPlanSheetScreen = branchDynamic(() => import('@/components/MyPlanSheetScreen'))

export const PracticeScreen = branchDynamic(() => import('@/components/branches/PracticeBranch'))
export const AccentTrainer = branchDynamic(() => import('@/components/branches/AccentBranch'))

export const VocabularyWorldsScreen = branchNamed<ComponentProps<typeof VocabularyWorldsScreenComponent>>(() =>
  import('@/components/branches/VocabularyBranch').then((m) => ({
    default: m.VocabularyWorldsScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof VocabularyWorldsScreenComponent>> }>
)
export const VocabularyByLevelScreen = branchNamed<ComponentProps<typeof VocabularyByLevelScreenComponent>>(() =>
  import('@/components/branches/VocabularyBranch').then((m) => ({
    default: m.VocabularyByLevelScreen,
  })) as Promise<{ default: ComponentType<ComponentProps<typeof VocabularyByLevelScreenComponent>> }>
)
