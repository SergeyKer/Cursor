import fs from 'node:fs'

const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')

function mustReplace(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`)
  s = s.replace(from, to)
}

const referenceCtaA1 = `{isReferenceBrowse ? (
                  <button
                    type="button"
                    disabled={!onOpenReferenceTopic || !selectedA1LessonId}
                    onClick={() => {
                      if (!onOpenReferenceTopic || !selectedA1LessonId) return
                      void onOpenReferenceTopic(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                    }}
                    className={MENU_PRIMARY_CTA_CLASS}
                  >
                    {REFERENCE_COPY.topicCta}
                  </button>
                ) : (
                  <LessonMenuVariantDualCta
                    layout={a1LessonCtaLayout}
                    selectedLessonId={selectedA1LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA1LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA1LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA1LessonId) return
                      void onOpenLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA1LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA1LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />
                )}`

mustReplace(
  `<LessonMenuVariantDualCta
                    layout={a1LessonCtaLayout}
                    selectedLessonId={selectedA1LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA1LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA1LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA1LessonId) return
                      void onOpenLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA1LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA1LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />`,
  referenceCtaA1,
  'a1 cta'
)

const referenceCtaA2 = `{isReferenceBrowse ? (
                  <button
                    type="button"
                    disabled={!onOpenReferenceTopic || !selectedA2LessonId}
                    onClick={() => {
                      if (!onOpenReferenceTopic || !selectedA2LessonId) return
                      void onOpenReferenceTopic(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                    }}
                    className={MENU_PRIMARY_CTA_CLASS}
                  >
                    {REFERENCE_COPY.topicCta}
                  </button>
                ) : (
                  <LessonMenuVariantDualCta
                    layout={a2LessonCtaLayout}
                    selectedLessonId={selectedA2LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA2LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA2LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA2LessonId) return
                      void onOpenLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA2LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA2LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />
                )}`

mustReplace(
  `<LessonMenuVariantDualCta
                    layout={a2LessonCtaLayout}
                    selectedLessonId={selectedA2LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA2LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA2LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA2LessonId) return
                      void onOpenLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA2LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA2LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />`,
  referenceCtaA2,
  'a2 cta'
)

// Tag lessons CTA - find LessonMenuVariantDualCta with theoryTopicLessonCtaLayout
const tagCtaOld = `                    <LessonMenuVariantDualCta
                      layout={theoryTopicLessonCtaLayout}
                      selectedLessonId={selectedTheoryTopicLessonId}
                      generatingLessonId={generatingLessonId}
                      canOpen={Boolean(onOpenLearningLesson && selectedTheoryTopicLessonId)}
                      canGenerate={Boolean(
                        onGenerateLearningLesson &&
                          selectedTheoryTopicLessonId &&
                          !generatingLessonId &&
                          (() => {
                            const m = selectedTheoryTopicLessonId
                              ? getLessonTopicById(selectedTheoryTopicLessonId)
                              : null
                            return m?.level === 'A1' || m?.level === 'A2'
                          })()
                      )}
                      onOpen={() => {
                        if (!onOpenLearningLesson || !selectedTheoryTopicLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        const panel: LessonsPanel = topicMeta?.level === 'A1' ? 'a1' : 'a2'
                        void onOpenLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                      }}
                      onGenerate={async () => {
                        if (!onGenerateLearningLesson || !selectedTheoryTopicLessonId || generatingLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        if (topicMeta?.level !== 'A1' && topicMeta?.level !== 'A2') return
                        const panel: LessonsPanel = topicMeta.level === 'A1' ? 'a1' : 'a2'
                        setGenerateLessonError(null)
                        setGeneratingLessonId(selectedTheoryTopicLessonId)
                        try {
                          await onGenerateLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                          setGenerateLessonError(message)
                        } finally {
                          setGeneratingLessonId(null)
                        }
                      }}
                      generateError={generateLessonError}
                    />`

const tagCtaNew = `                    {isReferenceBrowse ? (
                      <button
                        type="button"
                        disabled={!onOpenReferenceTopic || !selectedTheoryTopicLessonId}
                        onClick={() => {
                          if (!onOpenReferenceTopic || !selectedTheoryTopicLessonId) return
                          const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                          const panel: LessonsPanel = topicMeta?.level === 'A1' ? 'a1' : 'a2'
                          void onOpenReferenceTopic(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                        }}
                        className={MENU_PRIMARY_CTA_CLASS}
                      >
                        {REFERENCE_COPY.topicCta}
                      </button>
                    ) : (
                    <LessonMenuVariantDualCta
                      layout={theoryTopicLessonCtaLayout}
                      selectedLessonId={selectedTheoryTopicLessonId}
                      generatingLessonId={generatingLessonId}
                      canOpen={Boolean(onOpenLearningLesson && selectedTheoryTopicLessonId)}
                      canGenerate={Boolean(
                        onGenerateLearningLesson &&
                          selectedTheoryTopicLessonId &&
                          !generatingLessonId &&
                          (() => {
                            const m = selectedTheoryTopicLessonId
                              ? getLessonTopicById(selectedTheoryTopicLessonId)
                              : null
                            return m?.level === 'A1' || m?.level === 'A2'
                          })()
                      )}
                      onOpen={() => {
                        if (!onOpenLearningLesson || !selectedTheoryTopicLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        const panel: LessonsPanel = topicMeta?.level === 'A1' ? 'a1' : 'a2'
                        void onOpenLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                      }}
                      onGenerate={async () => {
                        if (!onGenerateLearningLesson || !selectedTheoryTopicLessonId || generatingLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        if (topicMeta?.level !== 'A1' && topicMeta?.level !== 'A2') return
                        const panel: LessonsPanel = topicMeta.level === 'A1' ? 'a1' : 'a2'
                        setGenerateLessonError(null)
                        setGeneratingLessonId(selectedTheoryTopicLessonId)
                        try {
                          await onGenerateLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                          setGenerateLessonError(message)
                        } finally {
                          setGeneratingLessonId(null)
                        }
                      }}
                      generateError={generateLessonError}
                    />
                    )}`

mustReplace(tagCtaOld, tagCtaNew, 'tag lessons cta')

// Teaser in tag lesson rows when reference
mustReplace(
  `                      {(theoryTopicLessonsByLevel[theoryTagBrowseLevel] ?? []).map((lesson) => {
                        const topicCopy = a2PracticeTopicCopy[lesson.id]
                        return (
                          <A2LessonChoiceRow
                            key={lesson.id}
                            label={lesson.title}
                            subtitle={topicCopy?.short}
                            description={topicCopy?.long}`,
  `                      {(theoryTopicLessonsByLevel[theoryTagBrowseLevel] ?? []).map((lesson) => {
                        const topicCopy = a2PracticeTopicCopy[lesson.id]
                        const teaser = isReferenceBrowse ? getReferenceTeaserForLessonId(lesson.id) : null
                        return (
                          <A2LessonChoiceRow
                            key={lesson.id}
                            label={lesson.title}
                            subtitle={isReferenceBrowse ? teaser ?? undefined : topicCopy?.short}
                            description={isReferenceBrowse ? undefined : topicCopy?.long}`,
  'tag row teaser'
)

fs.writeFileSync(f, s, 'utf8')
console.log('part3 ok')
