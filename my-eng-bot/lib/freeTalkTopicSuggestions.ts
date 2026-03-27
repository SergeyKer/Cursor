import type { Audience } from './types'
import type {
  FreeTalkTopicRotationAudienceState,
  FreeTalkTopicRotationState,
} from './storage'

const COOLDOWN_LAUNCHES = 3
const TOPICS_PER_LAUNCH = 3

export const CHILD_FREE_TALK_TOPIC_POOL: string[] = [
  'my friends',
  'my family',
  'my pet',
  'my favorite food',
  'what I like to do after school',
  'my games',
  'my toys',
  'what I like at school',
  'my weekend',
  'my day today',
  'my favorite cartoons',
  'my favorite holiday',
  'today’s weather',
  'what I do on holidays',
  'what I like outside',
]

export const ADULT_FREE_TALK_TOPIC_POOL: string[] = [
  'how my day went',
  'my plans for the week',
  'what is happening at work',
  'what I do in my free time',
  'where I would like to travel',
  'what I watch (movies and series)',
  'what I listen to (music and podcasts)',
  'my habits and routine',
  'how I relax after work',
  'my short-term goals',
  'new technology in my life',
  'how I learn English',
  'what I eat and cook',
  'sport in my life',
  'what inspires me now',
]

function poolForAudience(audience: Audience): string[] {
  return audience === 'child' ? CHILD_FREE_TALK_TOPIC_POOL : ADULT_FREE_TALK_TOPIC_POOL
}

function audienceStateForRotation(
  audience: Audience,
  state: FreeTalkTopicRotationState
): FreeTalkTopicRotationAudienceState {
  return audience === 'child' ? state.child : state.adult
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = next[i]
    next[i] = next[j]
    next[j] = a
  }
  return next
}

function pickRandomUnique(items: string[], count: number, rng: () => number): string[] {
  if (items.length <= count) return [...items]
  return shuffle(items, rng).slice(0, count)
}

export function pickFreeTalkTopicSuggestions(params: {
  audience: Audience
  state: FreeTalkTopicRotationState
  rng?: () => number
}): { topics: string[]; nextState: FreeTalkTopicRotationState } {
  const { audience, state, rng = Math.random } = params
  const pool = poolForAudience(audience)
  const audienceState = audienceStateForRotation(audience, state)
  const launchIndex = audienceState.launchIndex + 1

  const available = pool.filter((topic) => {
    const lastShownLaunch = audienceState.lastShownLaunch[topic]
    if (typeof lastShownLaunch !== 'number') return true
    return launchIndex - lastShownLaunch >= COOLDOWN_LAUNCHES
  })

  const picked = pickRandomUnique(available, TOPICS_PER_LAUNCH, rng)
  if (picked.length < TOPICS_PER_LAUNCH) {
    const used = new Set(picked)
    const fallbackPool = pool.filter((topic) => !used.has(topic))
    const fallback = pickRandomUnique(fallbackPool, TOPICS_PER_LAUNCH - picked.length, rng)
    picked.push(...fallback)
  }

  const nextAudienceState: FreeTalkTopicRotationAudienceState = {
    launchIndex,
    lastShownLaunch: { ...audienceState.lastShownLaunch },
  }
  for (const topic of picked) {
    nextAudienceState.lastShownLaunch[topic] = launchIndex
  }

  return {
    topics: picked,
    nextState:
      audience === 'child'
        ? { ...state, child: nextAudienceState }
        : { ...state, adult: nextAudienceState },
  }
}
