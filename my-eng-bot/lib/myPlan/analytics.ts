export type MyPlanAnalyticsEventName =
  | 'my_plan_viewed'
  | 'my_plan_main_cta'
  | 'my_plan_secondary_cta'
  | 'my_plan_program_cta'
  | 'my_plan_progress_link'
  | 'my_plan_paywall_shown'
  | 'my_plan_ai_reinforce_started'

export type MyPlanAnalyticsProps = {
  audience?: 'child' | 'adult'
  hasMain?: boolean
  mainType?: string
  actionKind?: string
  generation?: 'local' | 'ai'
  lessonId?: string
  skillTagId?: string
  programStatus?: string
  programLessonId?: string
  anchorLevel?: string
}

export type MyPlanAnalyticsSink = (
  event: MyPlanAnalyticsEventName,
  props: MyPlanAnalyticsProps
) => void

let sink: MyPlanAnalyticsSink = () => {
  /* no-op until real analytics is wired */
}

export function setMyPlanAnalyticsSink(next: MyPlanAnalyticsSink): void {
  sink = next
}

export function trackMyPlanEvent(
  event: MyPlanAnalyticsEventName,
  props: MyPlanAnalyticsProps = {}
): void {
  try {
    sink(event, props)
  } catch {
    /* never break UX for analytics */
  }
}
