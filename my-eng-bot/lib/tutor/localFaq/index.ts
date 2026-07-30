export type { LocalFaqEntry, LocalFaqGenre, LocalFaqLevel, LocalFaqMatch } from '@/lib/tutor/localFaq/types'
export {
  getLocalFaqById,
  listAllLocalFaq,
  listLocalFaqForLevels,
  localFaqPoolSize,
  resolveFaqLevelWindow,
} from '@/lib/tutor/localFaq/catalog'
export { matchLocalFaq } from '@/lib/tutor/localFaq/match'
export {
  pickIdleFaq,
  idleFaqSeed,
  IDLE_FAQ_SOFT_BOOST,
  type PickIdleFaqOpts,
} from '@/lib/tutor/localFaq/pickIdleFaq'
export {
  looksLikeEnErrorUtterance,
  normalizeFaqText,
  stripFaqInterrogative,
} from '@/lib/tutor/localFaq/normalizeFaq'
export {
  skillTagIdToTopicKey,
  topicKeysFromSkillTagIds,
  listKnownFaqTopicKeys,
  clearKnownFaqTopicKeysCacheForTests,
} from '@/lib/tutor/localFaq/skillTopicMap'
export {
  pickCanonicalFaqForTopic,
  resolveFaqCanonForZone,
} from '@/lib/tutor/localFaq/pickFaqForTopic'
export {
  listShownFaqIds,
  recordShownFaqIds,
  pruneShownFaqStore,
  clearHalfOldestShown,
  clearShownFaqForTests,
  SHOWN_FAQ_CAP,
  SHOWN_FAQ_TTL_MS,
} from '@/lib/tutor/localFaq/shownFaqStore'
export { buildIdleFaqFilters } from '@/lib/tutor/localFaq/idlePickContext'
