import type { QuickTestEntrySource, QuickTestScoreBand } from '@/lib/quickTest/types'

export type QuickTestAnalyticsEventName =
  | 'page_view'
  | 'first_question_view'
  | 'first_answer'
  | 'question_answer'
  | 'finale_view'
  | 'cta_open_lesson'
  | 'share_copy'
  | 'cta_another_variant'
  | 'cta_other_test'
  | 'referral_open'

export type QuickTestAnalyticsProps = {
  entrySource?: QuickTestEntrySource
  slug?: string
  lessonId?: string
  variantId?: string
  questionIndex?: number
  scoreBand?: QuickTestScoreBand
  durationBucket?: string
  referrerHost?: string
  fromShare?: boolean
  ctaId?: string
  ctaPosition?: string
  correct?: boolean
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

export type QuickTestAnalyticsSink = (
  event: QuickTestAnalyticsEventName,
  props: QuickTestAnalyticsProps
) => void

let sink: QuickTestAnalyticsSink = () => {
  /* no-op until real analytics is wired */
}

export function setQuickTestAnalyticsSink(next: QuickTestAnalyticsSink): void {
  sink = next
}

export function trackQuickTest(
  event: QuickTestAnalyticsEventName,
  props: QuickTestAnalyticsProps = {}
): void {
  try {
    sink(event, props)
  } catch {
    /* never break UX for analytics */
  }
}

/** Schema guard for unit tests — required keys by event family. */
export function assertAnalyticsProps(
  event: QuickTestAnalyticsEventName,
  props: QuickTestAnalyticsProps
): string[] {
  const missing: string[] = []
  const need = (...keys: (keyof QuickTestAnalyticsProps)[]) => {
    for (const key of keys) {
      if (props[key] === undefined || props[key] === null || props[key] === '') {
        missing.push(String(key))
      }
    }
  }
  need('entrySource', 'slug')
  if (event === 'question_answer' || event === 'first_answer') need('questionIndex', 'variantId')
  if (event === 'finale_view') need('scoreBand', 'variantId')
  if (event.startsWith('cta_') || event === 'share_copy') need('scoreBand')
  return missing
}
