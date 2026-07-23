export type ProgressAnalyticsEventName =
  | 'progress_viewed'
  | 'progress_space_opened'
  | 'progress_space_back'
  | 'progress_detail_opened'
  | 'progress_shelf_opened'
  | 'progress_to_my_plan_click'
  | 'progress_weak_zone_click'
  | 'progress_near_reward_click'
  | 'progress_premium_cue_shown'

export type ProgressAnalyticsProps = {
  audience?: 'child' | 'adult'
  detailKind?: 'awards' | 'calendar' | 'remarks'
  lessonId?: string
  reason?: string
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
