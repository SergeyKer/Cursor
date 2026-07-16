import type { QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

export type QuickTestFinaleActionId =
  | 'open_lesson'
  | 'another_variant'
  | 'other_test'
  | 'share'

export type QuickTestFinaleActionTone = 'primary' | 'secondary' | 'tertiary'

export type QuickTestFinaleAction = {
  id: QuickTestFinaleActionId
  label: string
  tone: QuickTestFinaleActionTone
  ctaPosition: 'finale_primary' | 'finale_secondary' | 'finale_tertiary'
  spanFull?: boolean
}

export function buildQuickTestFinaleActions(input: {
  band: QuickTestScoreBand
  nextVariantId: string | null
}): {
  primary: QuickTestFinaleAction
  secondary: QuickTestFinaleAction[]
  tertiary: QuickTestFinaleAction
} {
  const { band, nextVariantId } = input

  const primary: QuickTestFinaleAction = {
    id: 'open_lesson',
    label:
      band === 'perfect'
        ? QUICK_TEST_COPY.finaleCtaPerfect
        : band === 'strong'
          ? QUICK_TEST_COPY.finaleCtaStrong
          : QUICK_TEST_COPY.finaleCtaStart,
    tone: 'primary',
    ctaPosition: 'finale_primary',
  }

  const variantAction: QuickTestFinaleAction | null = nextVariantId
    ? {
        id: 'another_variant',
        label: QUICK_TEST_COPY.finaleAnotherVariant,
        tone: 'secondary',
        ctaPosition: 'finale_secondary',
      }
    : null

  const otherTestSecondary: QuickTestFinaleAction = {
    id: 'other_test',
    label: QUICK_TEST_COPY.finaleOtherTest,
    tone: 'secondary',
    ctaPosition: 'finale_secondary',
  }

  const otherTestTertiary: QuickTestFinaleAction = {
    id: 'other_test',
    label: QUICK_TEST_COPY.finaleOtherTest,
    tone: 'tertiary',
    ctaPosition: 'finale_tertiary',
  }

  const shareSecondary: QuickTestFinaleAction = {
    id: 'share',
    label: QUICK_TEST_COPY.finaleShare,
    tone: 'secondary',
    ctaPosition: 'finale_secondary',
  }

  const shareTertiary: QuickTestFinaleAction = {
    id: 'share',
    label: QUICK_TEST_COPY.finaleShare,
    tone: 'tertiary',
    ctaPosition: 'finale_tertiary',
  }

  if (band === 'perfect') {
    const secondary: QuickTestFinaleAction[] = [shareSecondary]
    if (variantAction) secondary.push(variantAction)
    else secondary.push(otherTestSecondary)
    return { primary, secondary: normalizeSecondary(secondary), tertiary: otherTestTertiary }
  }

  if (band === 'strong') {
    const secondary: QuickTestFinaleAction[] = []
    if (variantAction) secondary.push(variantAction)
    else secondary.push(otherTestSecondary)
    secondary.push(shareSecondary)
    return { primary, secondary: normalizeSecondary(secondary), tertiary: otherTestTertiary }
  }

  const secondary: QuickTestFinaleAction[] = []
  if (variantAction) secondary.push(variantAction)
  secondary.push(otherTestSecondary)
  return { primary, secondary: normalizeSecondary(secondary), tertiary: shareTertiary }
}

function normalizeSecondary(actions: QuickTestFinaleAction[]): QuickTestFinaleAction[] {
  if (actions.length === 1) {
    return [{ ...actions[0], spanFull: true }]
  }
  return actions.slice(0, 2)
}
