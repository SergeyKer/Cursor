import { scoreBandFromCorrect } from '@/lib/quickTest/scoring'
import type { QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

export type QuickTestFinalePresentationMode = 'perfect' | 'analysis' | 'emptyRun'

export type QuickTestFinalePresentation = {
  band: QuickTestScoreBand
  mode: QuickTestFinalePresentationMode
  title: string
  footerTitle: string
  primaryLabel: string
  primaryHint: string
  valueLine: string
  showcaseLimit: number
  showAnalysisCard: boolean
  showMedalGhost: boolean
  emptyRunMessage: string | null
}

export function resolveQuickTestFinalePresentation(input: {
  correct: number
  total?: number
  answerCount: number
  compactViewport?: boolean
}): QuickTestFinalePresentation {
  const total = input.total ?? 5
  const band = scoreBandFromCorrect(input.correct, total)
  const compact = input.compactViewport === true
  const showcaseLimit = compact ? 1 : 2

  if (input.answerCount === 0) {
    return {
      band,
      mode: 'emptyRun',
      title: QUICK_TEST_COPY.finaleEmptyRunTitle,
      footerTitle: QUICK_TEST_COPY.footerFinaleEmptyRun,
      primaryLabel: QUICK_TEST_COPY.finaleCtaStart,
      primaryHint: QUICK_TEST_COPY.finaleHintStart,
      valueLine: QUICK_TEST_COPY.finaleValueStart,
      showcaseLimit: 0,
      showAnalysisCard: true,
      showMedalGhost: false,
      emptyRunMessage: QUICK_TEST_COPY.finaleEmptyRunMessage,
    }
  }

  if (band === 'perfect') {
    return {
      band,
      mode: 'perfect',
      title: QUICK_TEST_COPY.finaleTitlePerfect,
      footerTitle: QUICK_TEST_COPY.footerFinalePerfect,
      primaryLabel: QUICK_TEST_COPY.finaleCtaPerfect,
      primaryHint: QUICK_TEST_COPY.finaleHintPerfect,
      valueLine: QUICK_TEST_COPY.finalePerfectHint,
      showcaseLimit: 0,
      showAnalysisCard: false,
      showMedalGhost: true,
      emptyRunMessage: null,
    }
  }

  if (band === 'strong') {
    return {
      band,
      mode: 'analysis',
      title: QUICK_TEST_COPY.finaleTitleStrong,
      footerTitle: QUICK_TEST_COPY.footerFinaleStrong,
      primaryLabel: QUICK_TEST_COPY.finaleCtaStrong,
      primaryHint: QUICK_TEST_COPY.finaleHintStrong,
      valueLine: QUICK_TEST_COPY.finaleValueStrong,
      showcaseLimit,
      showAnalysisCard: true,
      showMedalGhost: false,
      emptyRunMessage: null,
    }
  }

  const title =
    input.correct === 0
      ? QUICK_TEST_COPY.finaleTitleZero
      : QUICK_TEST_COPY.finaleTitleWeak

  const footerTitle =
    input.correct === 0 ? QUICK_TEST_COPY.footerFinaleZero : QUICK_TEST_COPY.footerFinaleWeak

  return {
    band,
    mode: 'analysis',
    title,
    footerTitle,
    primaryLabel: QUICK_TEST_COPY.finaleCtaStart,
    primaryHint: QUICK_TEST_COPY.finaleHintStart,
    valueLine: QUICK_TEST_COPY.finaleValueStart,
    showcaseLimit,
    showAnalysisCard: true,
    showMedalGhost: false,
    emptyRunMessage: null,
  }
}
