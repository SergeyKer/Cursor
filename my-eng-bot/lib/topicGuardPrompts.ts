import type { TopicId } from './types'

type GuardMode = 'dialogue' | 'translation'

type StrictTopicBoundary = {
  include: string[]
  exclude: string[]
  anchorKeywords: string[]
  dialogueHint: string
  translationHint: string
}

type FixedTopicId = Exclude<TopicId, 'free_talk'>

const STRICT_TOPIC_BOUNDARIES: Record<FixedTopicId, StrictTopicBoundary> = {
  business: {
    include: ['office tasks', 'career growth', 'startups', 'negotiations', 'presentations', 'investment', 'marketing', 'management', 'HR'],
    exclude: ['personal romance or dating', 'private hobbies without business context'],
    anchorKeywords: ['meeting', 'client', 'strategy', 'budget', 'startup', 'pitch', 'investment', 'marketing', 'deadline'],
    dialogueHint: 'Ask practical business-context questions (clients, decisions, negotiations, deadlines), not private-life small talk.',
    translationHint: 'Use business-context Russian drills (office, clients, planning, pitches) and avoid purely personal relationship scenes.',
  },
  family_friends: {
    include: ['relationships', 'dating', 'marriage', 'children', 'parents', 'friends', 'parties', 'support', 'trust', 'conflicts'],
    exclude: ['work tasks', 'office meetings', 'business strategy'],
    anchorKeywords: ['friend', 'family', 'parent', 'child', 'trust', 'support', 'conflict', 'date', 'relationship'],
    dialogueHint: 'Focus on interpersonal emotions, support, trust, and family/friend situations; avoid office scenarios.',
    translationHint: 'Generate Russian drills about relatives, friends, feelings, conflicts, and support, not business workflows.',
  },
  hobbies: {
    include: ['collecting', 'crafts', 'games', 'music as hobby', 'drawing', 'for-fun coding', 'gardening'],
    exclude: ['professional duties', 'formal job responsibilities'],
    anchorKeywords: ['hobby', 'game', 'collection', 'draw', 'craft', 'garden', 'play', 'practice', 'free time'],
    dialogueHint: 'Ask about personal interest routines, enjoyment, and free-time activities, not job deliverables.',
    translationHint: 'Use hobby-centric Russian drills (practice, create, collect, play) without workplace framing.',
  },
  movies_series: {
    include: ['movies', 'actors', 'directors', 'plots', 'genres', 'streaming services', 'premieres', 'reviews', 'recommendations'],
    exclude: ['sports topics', 'music topics unless direct soundtrack context'],
    anchorKeywords: ['movie', 'series', 'actor', 'director', 'plot', 'genre', 'episode', 'premiere', 'review'],
    dialogueHint: 'Ask about films/series experiences, preferences, and recommendations; avoid unrelated sports/music discussion.',
    translationHint: 'Keep Russian drills in movie/series context (watching, episodes, genres, actors, reviews).',
  },
  music: {
    include: ['genres', 'artists', 'concerts', 'albums', 'playlists', 'instruments', 'vocals', 'streaming', 'song lyrics'],
    exclude: ['general film topics without musical context', 'sports topics'],
    anchorKeywords: ['song', 'concert', 'instrument', 'album', 'genre', 'artist', 'playlist', 'melody', 'rhythm'],
    dialogueHint: 'Focus on songs, albums, concerts, and instruments; mention films only when clearly music-related (e.g. musicals).',
    translationHint: 'Use Russian drills about listening, performing, concerts, instruments, playlists, and albums.',
  },
  sports: {
    include: ['training', 'football', 'running', 'gym', 'yoga', 'swimming', 'competitions', 'healthy lifestyle', 'sports nutrition'],
    exclude: ['food-only content without sports context'],
    anchorKeywords: ['training', 'run', 'match', 'team', 'gym', 'yoga', 'swim', 'competition', 'recovery'],
    dialogueHint: 'Ask about workouts, activity habits, and sport goals; avoid switching into generic cooking/food chat.',
    translationHint: 'Keep Russian drills tied to exercise, competitions, or athlete lifestyle habits.',
  },
  food: {
    include: ['recipes', 'restaurants', 'ingredients', 'cooking', 'diets', 'world cuisines', 'delivery'],
    exclude: ['travel logistics unless directly about cuisine'],
    anchorKeywords: ['dish', 'recipe', 'ingredient', 'cook', 'restaurant', 'taste', 'menu', 'kitchen', 'delivery'],
    dialogueHint: 'Focus on meals, ingredients, taste, cooking, and places to eat; avoid generic travel planning.',
    translationHint: 'Use Russian drills about cooking/eating/ordering food and concrete ingredients.',
  },
  culture: {
    include: ['art', 'museums', 'theatre', 'literature', 'traditions', 'history', 'architecture', 'exhibitions', 'festivals'],
    exclude: ['movies as casual entertainment without art context'],
    anchorKeywords: ['museum', 'theatre', 'literature', 'tradition', 'history', 'architecture', 'exhibition', 'festival', 'art'],
    dialogueHint: 'Frame questions as culture/art heritage discussion, not pure entertainment chatter.',
    translationHint: 'Generate Russian drills around art, museums, theatre, traditions, and heritage topics.',
  },
  daily_life: {
    include: ['daily routine', 'household tasks', 'shopping', 'transport', 'weather', 'city life', 'home chores'],
    exclude: ['narrow specialized domains requiring professional context'],
    anchorKeywords: ['routine', 'home', 'shopping', 'transport', 'weather', 'schedule', 'chores', 'city', 'everyday'],
    dialogueHint: 'Keep questions practical and routine-based: home, transport, shopping, daily schedule.',
    translationHint: 'Use simple everyday Russian drills about routine actions and household situations.',
  },
  travel: {
    include: ['countries', 'hotels', 'flights', 'landmarks', 'visas', 'routes', 'luggage', 'excursions', 'beaches'],
    exclude: ['business trip planning except explicit work-travel context'],
    anchorKeywords: ['trip', 'flight', 'hotel', 'route', 'visa', 'luggage', 'tour', 'landmark', 'beach'],
    dialogueHint: 'Ask about travel experience, logistics, places, and plans; avoid office/business workflow drift.',
    translationHint: 'Generate Russian drills about travel planning and travel experiences (flights, hotels, routes).',
  },
  work: {
    include: ['job role', 'salary', 'vacation', 'sick leave', 'colleagues', 'office', 'remote work', 'interviews', 'career growth'],
    exclude: ['startup fundraising/investor strategy unless clearly employment context'],
    anchorKeywords: ['job', 'salary', 'office', 'colleague', 'vacation', 'interview', 'remote', 'manager', 'career'],
    dialogueHint: 'Keep context in hired-employment situations (role, colleagues, office process), not startup investing.',
    translationHint: 'Use Russian drills about day-to-day employment context and workplace communication.',
  },
  technology: {
    include: ['gadgets', 'software', 'apps', 'internet services', 'programming topics', 'AI tools', 'devices'],
    exclude: ['pure startup funding strategy', 'HR/career-only discussion without tech context'],
    anchorKeywords: ['app', 'device', 'software', 'internet', 'platform', 'code', 'AI', 'tool', 'update'],
    dialogueHint: 'Ask about technology usage and technical interests; avoid drifting into pure business or HR framing.',
    translationHint: 'Generate Russian drills about devices, apps, coding, and practical technology usage.',
  },
}

function buildModeHint(mode: GuardMode, boundary: StrictTopicBoundary): string {
  return mode === 'dialogue' ? boundary.dialogueHint : boundary.translationHint
}

export function buildStrictTopicPromptBlock(params: { topic: TopicId; mode: GuardMode }): string {
  if (params.topic === 'free_talk') return ''

  const boundary = STRICT_TOPIC_BOUNDARIES[params.topic as FixedTopicId]
  if (!boundary) return ''

  const include = boundary.include.join(', ')
  const exclude = boundary.exclude.join(', ')
  const anchors = boundary.anchorKeywords.join(', ')
  const modeHint = buildModeHint(params.mode, boundary)

  return `STRICT TOPIC MAPPING (active for current topic only):
- Scope: keep at least 80% of content strictly within this topic; up to 20% may touch adjacent context only if it logically supports the same topic.
- Allowed area (include): ${include}.
- Out-of-scope area (exclude): ${exclude}.
- Before generating each sentence, run self-check: "Can this sentence be clearly classified under the current topic?" If no, regenerate.
- Anti-confusion keyword check: ensure each sentence contains at least one anchor keyword or a direct synonym from this list: ${anchors}.
- If the user goes off-topic, respond softly and bring focus back to the active topic (for example: "Great point. If we stay on this topic, ..."). Offer topic switch only as an explicit option.
- Mode-specific focus: ${modeHint}
- Tie-break for overlapping work/business contexts: hired-employment context -> Work; startup/investors/strategy context -> Business.`
}
