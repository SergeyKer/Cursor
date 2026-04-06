function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function hasExplicitWeatherQuestionIntent(text: string): boolean {
  return [
    /\?/,
    /(?:^|\s)(?:какая|какой|какое|какие|что\s+за|как)\s+(?:сейчас\s+)?погод[а-яё]*/i,
    /\b(?:какой|какая|какое|какие)\s+прогноз/i,
    /\b(?:покажи|дай|скажи)\s+(?:мне\s+)?(?:погод[а-яё]*|прогноз)/i,
    /\bwhat(?:'s| is)?\s+(?:the\s+)?weather\b/i,
    /\bweather\s+forecast\b/i,
    /\bforecast\s+for\b/i,
    /\bwill\s+it\s+(?:rain|snow)\b/i,
  ].some((pattern) => pattern.test(text))
}

const RU_WEEKDAY_PATTERN =
  '(?:понедельник(?:а|у|ом|е)?|вторник(?:а|у|ом|е)?|сред(?:а|у|е|ой)|четверг(?:а|у|ом|е)?|пятниц(?:а|у|е|ей)|суббот(?:а|у|е|ой)|воскресень(?:е|я|ю|ем))'
const EN_WEEKDAY_PATTERN =
  '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)'

export function isNarrativeOrPastWeatherRemark(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  if (hasExplicitWeatherQuestionIntent(normalized)) return false

  const hasWeatherLexeme = /\b(?:weather|forecast)\b|погод[а-яё]*|прогноз|температур[а-яё]*/i.test(normalized)
  const narrativePatterns = [
    /погод[а-яё]*(?:\s+\S+){0,6}\s+был[аои]?/i,
    /был[аои]?\s+погод[а-яё]*/i,
    /(?:вчера|на\s+выходных|в\s+выходные)[^?.!]{0,50}погод[а-яё]*/i,
    new RegExp(`погод[а-яё]*(?:\\s+\\S+){0,6}\\b(?:в|во|на)\\s+${RU_WEEKDAY_PATTERN}`, 'i'),
    new RegExp(`\\b(?:в|во|на)\\s+${RU_WEEKDAY_PATTERN}(?:\\s+\\S+){0,6}\\s+был[аои]?`, 'i'),
    /\bweather\s+was\b/i,
    /\bwe\s+had\b[^?.!]{0,40}\bweather\b/i,
    /\bweather(?:\s+\S+){0,6}\s+was\b/i,
    new RegExp(`\\bweather(?:\\s+\\S+){0,6}\\bon\\s+${EN_WEEKDAY_PATTERN}\\b`, 'i'),
    new RegExp(`\\bon\\s+${EN_WEEKDAY_PATTERN}\\b(?:\\s+\\S+){0,6}\\bweather\\b`, 'i'),
    /\blast\s+weekend\b[^?.!]{0,40}\bweather\b/i,
  ]
  const activityWeekendNarrative =
    !hasWeatherLexeme &&
    /(?:\bplayed\b|играл[аио]?|играли|тренировал(?:ся|ась|ись)?|трениров(?:ался|алась|ались)|ходил[аио]?|ходили|был[аио]?|были|занимал(?:ся|ась|ись)?|занимались)/i.test(
      normalized
    ) &&
    /(?:на\s+выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|в\s+выходн(?:ые|ых|ым|ыми|ах|ам|ую)?|on\s+weekends?|на\s+weekends?)/i.test(
      normalized
    )

  return activityWeekendNarrative || narrativePatterns.some((pattern) => pattern.test(normalized))
}

export function shouldAllowGismeteoByIntent(params: { text: string; isFollowup: boolean }): boolean {
  if (params.isFollowup) return true
  return !isNarrativeOrPastWeatherRemark(params.text)
}

