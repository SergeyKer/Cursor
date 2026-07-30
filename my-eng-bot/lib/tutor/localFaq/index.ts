export type { LocalFaqEntry, LocalFaqGenre, LocalFaqLevel, LocalFaqMatch } from '@/lib/tutor/localFaq/types'
export {
  getLocalFaqById,
  listAllLocalFaq,
  listLocalFaqForLevels,
  localFaqPoolSize,
  resolveFaqLevelWindow,
} from '@/lib/tutor/localFaq/catalog'
export { matchLocalFaq } from '@/lib/tutor/localFaq/match'
export { pickIdleFaq, idleFaqSeed } from '@/lib/tutor/localFaq/pickIdleFaq'
export {
  looksLikeEnErrorUtterance,
  normalizeFaqText,
  stripFaqInterrogative,
} from '@/lib/tutor/localFaq/normalizeFaq'
