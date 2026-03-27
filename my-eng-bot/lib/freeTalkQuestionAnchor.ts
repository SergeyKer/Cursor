import { stableHash32 } from './freeTalkDialogueTense'
import { isNearDuplicateQuestion } from './dialogueQuestionVariety'

export function buildFreeTalkTopicLabel(keywords: string[]): string {
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')
}

export function buildFreeTalkTopicAnchorQuestion(params: {
  keywords: string[]
  topicLabel?: string
  tense: string
  audience: 'child' | 'adult'
  diversityKey?: string
  recentAssistantQuestions?: string[]
}): string {
  const { keywords, topicLabel, tense, audience, diversityKey = '', recentAssistantQuestions = [] } = params
  const t = (topicLabel ?? buildFreeTalkTopicLabel(keywords)).trim()
  const seed = stableHash32(`ftaq|${t}|${tense}|${audience}|${diversityKey}`)
  const pick = (variants: string[]) => {
    if (variants.length === 0) return ''
    const offset = seed % variants.length
    const rotated = [...variants.slice(offset), ...variants.slice(0, offset)]
    const candidate = rotated.find((q) => recentAssistantQuestions.every((prev) => !isNearDuplicateQuestion(prev, q)))
    return candidate ?? rotated[0]!
  }
  const isChild = audience === 'child'

  switch (tense) {
    case 'present_simple':
      return isChild
        ? pick([
            `Do you like ${t}?`,
            `What do you think about ${t}?`,
            `What do you like best about ${t}?`,
            `Why do you like ${t}?`,
            `What do you enjoy most about ${t}?`,
          ])
        : pick([
            `What do you think about ${t}?`,
            `Why do you find ${t} interesting?`,
            `What part of ${t} do you enjoy most?`,
            `How do you feel about ${t} in your life now?`,
            `What do you want to say about ${t}?`,
          ])
    case 'present_continuous':
      return isChild
        ? pick([
            `Are you enjoying ${t} right now?`,
            `Are you thinking about ${t} now?`,
            `What are you doing with ${t} right now?`,
            `How are you using ${t} now?`,
          ])
        : pick([
            `What are you focusing on about ${t} right now?`,
            `How are you engaging with ${t} at the moment?`,
            `What are you doing with ${t} these days?`,
          ])
    case 'present_perfect':
      return pick([
        `Have you ever tried ${t}?`,
        `Have you enjoyed ${t} recently?`,
        `What have you learned about ${t}?`,
        isChild ? `What new thing about ${t} have you found recently?` : `What insight about ${t} have you gained recently?`,
      ])
    case 'present_perfect_continuous':
      return pick([
        `Have you been thinking about ${t} lately?`,
        `Have you been enjoying ${t} for a while?`,
      ])
    case 'past_simple':
      return pick([
        `Did you enjoy ${t} recently?`,
        `Did you talk about ${t} yesterday?`,
        `What happened with ${t} last time?`,
        `Did you try ${t} before?`,
        isChild ? `What was fun about ${t} yesterday?` : `What was the most meaningful part of ${t} recently?`,
      ])
    case 'past_continuous':
      return pick([
        `Were you thinking about ${t} yesterday?`,
        `Were you enjoying ${t} at that time?`,
      ])
    case 'past_perfect':
      return pick([
        `Had you tried ${t} before that?`,
        `Had you thought about ${t} before?`,
      ])
    case 'past_perfect_continuous':
      return pick([
        `Had you been thinking about ${t} for a long time?`,
        `Had you been enjoying ${t} before that?`,
      ])
    case 'future_simple':
      return pick([
        `Will you try ${t} soon?`,
        `Will you enjoy ${t} tomorrow?`,
        `What will you do with ${t} next week?`,
        `What will you do with ${t} next?`,
      ])
    case 'future_continuous':
      return pick([
        `Will you be enjoying ${t} this time tomorrow?`,
        `Will you be thinking about ${t} later?`,
      ])
    case 'future_perfect':
      return pick([
        `Will you have tried ${t} by next week?`,
        `Will you have finished with ${t} by tomorrow?`,
      ])
    case 'future_perfect_continuous':
      return pick([
        `Will you have been enjoying ${t} for a long time by then?`,
        `Will you have been thinking about ${t} for a while?`,
      ])
    case 'all':
    default:
      return pick([
        `Do you like ${t}?`,
        `What do you think about ${t}?`,
        `Do you enjoy ${t}?`,
        `Tell me about ${t}. What do you like about it?`,
        isChild ? `What is the most fun thing about ${t}?` : `What makes ${t} worth discussing for you?`,
      ])
  }
}
