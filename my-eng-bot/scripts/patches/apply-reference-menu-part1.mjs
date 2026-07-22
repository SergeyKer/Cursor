/**
 * UTF-8 safe patches for MenuSectionPanels reference browse mode.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const file = path.join(ROOT, 'components/MenuSectionPanels.tsx')
let s = fs.readFileSync(file, 'utf8')

function mustReplace(from, to, label) {
  if (!s.includes(from)) {
    throw new Error(`Patch failed: ${label}`)
  }
  s = s.replace(from, to)
}

mustReplace(
  `import { featureFlags } from '@/lib/featureFlags'\n`,
  `import { featureFlags } from '@/lib/featureFlags'\nimport { REFERENCE_COPY } from '@/lib/uiCopy/reference'\nimport type { CatalogBrowseIntent } from '@/lib/reference/types'\nimport { getReferenceLessonTopics, isReferenceLessonId } from '@/lib/reference/getReferenceLessonTopics'\nimport { getReferenceTeaserForLessonId } from '@/lib/reference/buildReferenceSheet'\nimport {\n  findReferenceTopicCandidates,\n  pickStrongReferenceHit,\n} from '@/lib/reference/findReferenceTopicCandidates'\n`,
  'imports'
)

mustReplace(
  `  /** Тип эталонного упражнения при последнем запуске. */
  referenceExerciseType?: PracticeExerciseType | null
}`,
  `  /** Тип эталонного упражнения при последнем запуске. */
  referenceExerciseType?: PracticeExerciseType | null
  /** Режим обзора каталога: урок или справочник. */
  catalogBrowseIntent?: CatalogBrowseIntent | null
}`,
  'LessonMenuContext field'
)

mustReplace(
  `export type LearningLessonMenuMeta = Pick<
  LessonMenuContext,
  | 'activeGrammarCategoryId'
  | 'activeTheoryTagId'
  | 'theorySearchQuery'
  | 'activeTheoryTagIds'
  | 'theoryLessonSource'
  | 'theoryTagBrowseLevel'
>`,
  `export type LearningLessonMenuMeta = Pick<
  LessonMenuContext,
  | 'activeGrammarCategoryId'
  | 'activeTheoryTagId'
  | 'theorySearchQuery'
  | 'activeTheoryTagIds'
  | 'theoryLessonSource'
  | 'theoryTagBrowseLevel'
  | 'catalogBrowseIntent'
>`,
  'LearningLessonMenuMeta'
)

mustReplace(
  `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void | Promise<void>`,
  `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void | Promise<void>
  /** Открыть шпаргалку справочника по теме урока. */
  onOpenReferenceTopic?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void | Promise<void>`,
  'onOpenReferenceTopic prop type'
)

// Find onOpenLearningLesson in destructuring and add onOpenReferenceTopic
mustReplace(
  `  onOpenLearningLesson,\n  onDebugSkipToLessonFinale,`,
  `  onOpenLearningLesson,\n  onOpenReferenceTopic,\n  onDebugSkipToLessonFinale,`,
  'destructure onOpenReferenceTopic'
)

// After selectedTheoryTopicLessonId state, add catalogBrowseIntent + hub search
mustReplace(
  `  const [selectedTheoryTopicLessonId, setSelectedTheoryTopicLessonId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLessonProgressMap(loadLessonProgressMap())
  }, [selectedA1LessonId, selectedA2LessonId, selectedTheoryTopicLessonId])`,
  `  const [selectedTheoryTopicLessonId, setSelectedTheoryTopicLessonId] = React.useState<string | null>(null)
  const [catalogBrowseIntent, setCatalogBrowseIntent] = React.useState<CatalogBrowseIntent>('lesson')
  const [referenceHubSearchQuery, setReferenceHubSearchQuery] = React.useState('')
  const isReferenceBrowse = featureFlags.referenceV1 && catalogBrowseIntent === 'reference'

  React.useEffect(() => {
    setLessonProgressMap(loadLessonProgressMap())
  }, [selectedA1LessonId, selectedA2LessonId, selectedTheoryTopicLessonId])`,
  'catalogBrowseIntent state'
)

mustReplace(
  `  const buildLearningLessonMeta = React.useCallback((): LearningLessonMenuMeta => {
    const source = theoryLessonSourceNav ?? 'cef_levels'
    if (source !== 'tag_browse') {
      return {
        theoryLessonSource: source,
        activeGrammarCategoryId: null,
        activeTheoryTagId: null,
        theorySearchQuery: null,
        activeTheoryTagIds: null,
        theoryTagBrowseLevel: null,
      }
    }
    const tagIdsFromLaunch = theoryTopicLaunch?.tagIds?.filter(Boolean) ?? []
    const tagIds =
      tagIdsFromLaunch.length > 0 ? [...tagIdsFromLaunch] : activeTheoryTagId ? [activeTheoryTagId] : null
    return {
      theoryLessonSource: 'tag_browse',
      activeGrammarCategoryId,
      activeTheoryTagId: activeTheoryTagId ?? tagIds?.[0] ?? null,
      theorySearchQuery: theoryTopicLaunch?.searchQuery ?? null,
      activeTheoryTagIds: tagIds,
      theoryTagBrowseLevel: theoryTagBrowseLevel ?? null,
    }
  }, [theoryLessonSourceNav, activeGrammarCategoryId, activeTheoryTagId, theoryTopicLaunch, theoryTagBrowseLevel])`,
  `  const buildLearningLessonMeta = React.useCallback((): LearningLessonMenuMeta => {
    const source = theoryLessonSourceNav ?? 'cef_levels'
    if (source !== 'tag_browse') {
      return {
        theoryLessonSource: source,
        activeGrammarCategoryId: null,
        activeTheoryTagId: null,
        theorySearchQuery: null,
        activeTheoryTagIds: null,
        theoryTagBrowseLevel: null,
        catalogBrowseIntent,
      }
    }
    const tagIdsFromLaunch = theoryTopicLaunch?.tagIds?.filter(Boolean) ?? []
    const tagIds =
      tagIdsFromLaunch.length > 0 ? [...tagIdsFromLaunch] : activeTheoryTagId ? [activeTheoryTagId] : null
    return {
      theoryLessonSource: 'tag_browse',
      activeGrammarCategoryId,
      activeTheoryTagId: activeTheoryTagId ?? tagIds?.[0] ?? null,
      theorySearchQuery: theoryTopicLaunch?.searchQuery ?? null,
      activeTheoryTagIds: tagIds,
      theoryTagBrowseLevel: theoryTagBrowseLevel ?? null,
      catalogBrowseIntent,
    }
  }, [theoryLessonSourceNav, activeGrammarCategoryId, activeTheoryTagId, theoryTopicLaunch, theoryTagBrowseLevel, catalogBrowseIntent])`,
  'buildLearningLessonMeta intent'
)

mustReplace(
  `  const a2TheoryItems = React.useMemo(
    () =>
      A2_THEORY_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? \`Тема: \${item.label}\`,
      })),
    [a2PracticeTopicCopy]
  )
  const a1TheoryItems = React.useMemo(
    () =>
      A1_THEORY_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? \`Тема: \${item.label}\`,
      })),
    [a2PracticeTopicCopy]
  )`,
  `  const a2TheoryItems = React.useMemo(() => {
    const source = isReferenceBrowse
      ? getReferenceLessonTopics('A2').map((item) => ({
          id: item.id,
          label: item.title,
          enabled: item.enabled,
          short: item.teaser,
          long: item.teaser,
        }))
      : A2_THEORY_ITEMS.map((item) => ({
          ...item,
          short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
          long: a2PracticeTopicCopy[item.id]?.long ?? \`Тема: \${item.label}\`,
        }))
    return source
  }, [a2PracticeTopicCopy, isReferenceBrowse])
  const a1TheoryItems = React.useMemo(() => {
    const source = isReferenceBrowse
      ? getReferenceLessonTopics('A1').map((item) => ({
          id: item.id,
          label: item.title,
          enabled: item.enabled,
          short: item.teaser,
          long: item.teaser,
        }))
      : A1_THEORY_ITEMS.map((item) => ({
          ...item,
          short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
          long: a2PracticeTopicCopy[item.id]?.long ?? \`Тема: \${item.label}\`,
        }))
    return source
  }, [a2PracticeTopicCopy, isReferenceBrowse])`,
  'a1/a2 theory items filter'
)

mustReplace(
  `  const theoryTopicLessonsFlat = React.useMemo(
    () => getTheoryLessonsForTagIdsUnion(theoryTopicLaunch?.tagIds ?? []),
    [theoryTopicLaunch]
  )`,
  `  const theoryTopicLessonsFlat = React.useMemo(() => {
    const list = getTheoryLessonsForTagIdsUnion(theoryTopicLaunch?.tagIds ?? [])
    if (!isReferenceBrowse) return list
    return list.filter((lesson) => isReferenceLessonId(lesson.id))
  }, [theoryTopicLaunch, isReferenceBrowse])

  const referenceHubSearchHits = React.useMemo(() => {
    if (!isReferenceBrowse || !referenceHubSearchQuery.trim()) return []
    return findReferenceTopicCandidates(referenceHubSearchQuery, settings.audience, 8)
  }, [isReferenceBrowse, referenceHubSearchQuery, settings.audience])`,
  'theoryTopicLessonsFlat filter + hub search'
)

fs.writeFileSync(file, s, 'utf8')
console.log('part1 ok')

