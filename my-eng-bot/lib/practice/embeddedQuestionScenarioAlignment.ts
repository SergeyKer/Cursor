const LIKES_RU = /нрав/i
const LIKES_EN = /\blikes?\b/i
const LIVES_RU = /жив/i
const LIVES_EN = /\blives?\b/i
const WORKS_RU = /работ/i
const WORKS_EN = /\bworks?\b/i
const WHO_RU = /\bкто\b/i
const WHO_EN = /\bwho\b/i
const WHEN_RU = /когда|начин/i
const WHEN_EN = /\bwhen\b/i
const STATION_RU = /станц/i
const STATION_EN = /\bstation\b/i
const WANTS_RU = /нужн/i
const WANTS_EN = /\bwants?\b/i

export function embeddedTargetHasBadInversion(targetAnswer: string): boolean {
  const normalized = targetAnswer.trim().toLowerCase()
  return (
    /\b(what|where|who|when)\s+does\b/.test(normalized) ||
    /\b(what|where|who|when)\s+do\b/.test(normalized)
  )
}

export function embeddedRoleplayInterlocutorOk(interlocutorEn: string): boolean {
  const trimmed = interlocutorEn.trim()
  if (!trimmed.endsWith('?')) return false
  if (/\b(where|what|who|when)\s+does\b/i.test(trimmed)) return false
  return /\b(do you know|can you tell me|tell me)\b/i.test(trimmed)
}

/** Smoke check: RU situation and EN target share at least one semantic axis. */
export function embeddedScenarioRuEnAligned(situationRu: string, targetAnswer: string): boolean {
  const ru = situationRu.toLowerCase()
  const en = targetAnswer.toLowerCase()

  const pairs: Array<[RegExp, RegExp]> = [
    [LIKES_RU, LIKES_EN],
    [LIVES_RU, LIVES_EN],
    [WORKS_RU, WORKS_EN],
    [WHO_RU, WHO_EN],
    [WHEN_RU, WHEN_EN],
    [STATION_RU, STATION_EN],
    [WANTS_RU, WANTS_EN],
  ]

  for (const [ruPattern, enPattern] of pairs) {
    if (ruPattern.test(ru) && enPattern.test(en)) return true
  }

  if (/\bwhere\b/.test(en) && /где/.test(ru)) return true
  if (/\bwhat\b/.test(en) && /что/.test(ru)) return true
  if (/\bbut\b/.test(en) && /, но /.test(ru)) return true

  return false
}

export function embeddedErrorFixPairIsAligned(situationRu: string, targetAnswer: string): boolean {
  return embeddedScenarioRuEnAligned(situationRu, targetAnswer) && !embeddedTargetHasBadInversion(targetAnswer)
}
