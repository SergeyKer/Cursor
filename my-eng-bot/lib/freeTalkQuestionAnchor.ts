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
            `What are you doing with ${t} right now?`,
            `How are you using ${t} now?`,
            `What are you thinking about ${t} now?`,
            `How are you enjoying ${t} right now?`,
          ])
        : pick([
            `What are you focusing on about ${t} right now?`,
            `How are you engaging with ${t} at the moment?`,
            `What are you doing with ${t} these days?`,
          ])
    case 'present_perfect':
      return pick([
        `What have you learned about ${t}?`,
        `What have you tried in ${t} recently?`,
        `What have you enjoyed about ${t} recently?`,
        isChild ? `What new thing about ${t} have you found recently?` : `What insight about ${t} have you gained recently?`,
      ])
    case 'present_perfect_continuous':
      return pick([
        `How have you been thinking about ${t} lately?`,
        `How have you been enjoying ${t} for a while?`,
      ])
    case 'past_simple':
      return pick([
        `What happened with ${t} last time?`,
        `What did you enjoy about ${t} recently?`,
        `What did you talk about in ${t} yesterday?`,
        `What did you try in ${t} before?`,
        isChild ? `What was fun about ${t} yesterday?` : `What was the most meaningful part of ${t} recently?`,
      ])
    case 'past_continuous':
      return pick([
        `What were you thinking about ${t} yesterday?`,
        `How were you enjoying ${t} at that time?`,
      ])
    case 'past_perfect':
      return pick([
        `What had you tried in ${t} before that?`,
        `What had you thought about ${t} before?`,
      ])
    case 'past_perfect_continuous':
      return pick([
        `How had you been thinking about ${t} for a long time?`,
        `How had you been enjoying ${t} before that?`,
      ])
    case 'future_simple':
      return pick([
        `What will you do with ${t} next week?`,
        `What will you do with ${t} next?`,
        `What will you try in ${t} soon?`,
        `What will you enjoy about ${t} tomorrow?`,
      ])
    case 'future_continuous':
      return pick([
        `What will you be enjoying about ${t} this time tomorrow?`,
        `What will you be thinking about ${t} later?`,
      ])
    case 'future_perfect':
      return pick([
        `What will you have tried in ${t} by next week?`,
        `What will you have finished in ${t} by tomorrow?`,
      ])
    case 'future_perfect_continuous':
      return pick([
        `How will you have been enjoying ${t} for a long time by then?`,
        `How will you have been thinking about ${t} for a while?`,
      ])
    case 'all':
    default:
      return pick([
        `What do you think about ${t}?`,
        `What do you enjoy about ${t}?`,
        `Tell me about ${t}. What stands out for you?`,
        isChild ? `What is the most fun thing about ${t}?` : `What makes ${t} worth discussing for you?`,
      ])
  }
}
