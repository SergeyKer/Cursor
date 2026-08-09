export type {
  ReferenceSyllabusSource,
  ReferenceSyllabusStatus,
  ReferenceSyllabusTopic,
} from '@/lib/reference/syllabus/types'
export { isSyllabusTopicOpenable } from '@/lib/reference/syllabus/types'
export {
  getReferenceSyllabusTopics,
  listSyllabusTopicsByLevel,
  getSyllabusTopicByKey,
  listOpenableSyllabusTopics,
  clearReferenceSyllabusCacheForTests,
  SYLLABUS_NOISE_TOPIC_KEYS,
  SYLLABUS_LESSON_LINKS,
} from '@/lib/reference/syllabus/topics'
export {
  findSyllabusTopicCandidates,
  findOpenableSyllabusLessonHits,
  isSyllabusTopicSearchActive,
} from '@/lib/reference/syllabus/search'
export type { SyllabusSearchHit } from '@/lib/reference/syllabus/search'
export { sortSyllabusByCurriculum, curriculumRank } from '@/lib/reference/syllabus/curriculumOrder'
