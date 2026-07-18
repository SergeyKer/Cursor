export type ProgressAnalyticsEventName =
  | 'progress_viewed'
  | 'progress_shelf_opened'
  | 'progress_to_my_plan_click'
  | 'progress_premium_cue_shown'

export type ProgressAnalyticsProps = {
  audience?: 'child' | 'adult'
}

export type ProgressAnalyticsSink = (
  event: ProgressAnalyticsEventName,
  props: ProgressAnalyticsProps
) => void

let sink: ProgressAnalyticsSink = () => {
  /* no-op until real analytics is wired */
}

export function setProgressAnalyticsSink(next: ProgressAnalyticsSink): void {
  sink = next
}

export function trackProgressEvent(
  event: ProgressAnalyticsEventName,
  props: ProgressAnalyticsProps = {}
): void {
  try {
    sink(event, props)
  } catch {
    /* never break UX for analytics */
  }
}
