import {
  TUTOR_TOPIC_CONTEXT_MAX_TURNS,
  type TutorExplainAnswer,
  type TutorTopicContext,
  type TutorTopicContextTurn,
} from '@/lib/tutor/types'
import { compactText } from '@/lib/tutor/text'

export type TopicContextThreadMessage = {
  role: 'user' | 'assistant'
  text: string
}

/**
 * Build minimal topicContext for tutor-explain (anchor + ≤2 recent turns).
 */
export function buildTutorTopicContext(params: {
  answer: TutorExplainAnswer
  thread: TopicContextThreadMessage[]
}): TutorTopicContext {
  const { answer, thread } = params
  const title = compactText(answer.topicAnchor.title || answer.title, 120) || 'topic'
  const canonicalKey = compactText(answer.topicAnchor.canonicalKey, 120) || title
  const rememberRu = compactText(answer.rememberRu, 200) || undefined

  const recentTurns: TutorTopicContextTurn[] = []
  for (let i = thread.length - 1; i >= 0 && recentTurns.length < TUTOR_TOPIC_CONTEXT_MAX_TURNS; i -= 1) {
    const msg = thread[i]
    if (!msg) continue
    const text = compactText(msg.text, 280)
    if (!text) continue
    recentTurns.unshift({ role: msg.role, text })
  }

  return {
    anchor: {
      title,
      canonicalKey,
      ...(rememberRu ? { rememberRu } : {}),
    },
    recentTurns,
  }
}
