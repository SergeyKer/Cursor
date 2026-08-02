export type ReferenceAnalyticsEvent =
  | 'reference_local_hit'
  | 'reference_prebuilt_hit'
  | 'reference_generate'
  | 'reference_reject'

export type ReferenceAnalyticsProps = {
  topicKey?: string
  lessonId?: string
  reason?: string
  source?: 'tutor' | 'menu' | 'search' | 'chat'
}

export type ReferenceAnalyticsSink = (
  event: ReferenceAnalyticsEvent,
  props: ReferenceAnalyticsProps
) => void

let sink: ReferenceAnalyticsSink = () => {
  /* no-op until the product analytics transport is selected */
}

export function setReferenceAnalyticsSink(next: ReferenceAnalyticsSink): void {
  sink = next
}

/** Analytics must never block or break opening a sheet. */
export function trackReferenceEvent(
  event: ReferenceAnalyticsEvent,
  props: ReferenceAnalyticsProps = {}
): void {
  try {
    sink(event, props)
  } catch {
    /* Analytics is deliberately best-effort. */
  }
}
