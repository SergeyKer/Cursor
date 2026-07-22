import fs from 'node:fs'

const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')

function mustReplace(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`)
  s = s.replace(from, to)
}

// Back from theory hub: reference → root
mustReplace(
  `      if (lessonsPanel === 'theory') {
        setLessonsPanel('summary')
        return
      }`,
  `      if (lessonsPanel === 'theory') {
        if (catalogBrowseIntent === 'reference') {
          setCatalogBrowseIntent('lesson')
          setReferenceHubSearchQuery('')
          onMenuViewChange('root')
          return
        }
        setLessonsPanel('summary')
        return
      }`,
  'back theory hub'
)

// Titles
mustReplace(
  `    if (menuView === 'lessons') return LESSONS_PANEL_TITLE[lessonsPanel]`,
  `    if (menuView === 'lessons') {
      if (isReferenceBrowse) {
        if (lessonsPanel === 'theory') return REFERENCE_COPY.hubTitle
        if (lessonsPanel === 'theoryTagLevels') return REFERENCE_COPY.tagLevelsTitle
        if (lessonsPanel === 'theoryTagLessons') return REFERENCE_COPY.tagLessonsTitle
      }
      return LESSONS_PANEL_TITLE[lessonsPanel]
    }`,
  'panel titles'
)

// Root menu: add Справочник + reset intent on Уроки
mustReplace(
  `              <MenuNavRow
                label="Уроки"
                onClick={() => {
                  setLessonsPanel('summary')
                  onMenuViewChange('lessons')
                }}
              />
              <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />`,
  `              <MenuNavRow
                label="Уроки"
                onClick={() => {
                  setCatalogBrowseIntent('lesson')
                  setReferenceHubSearchQuery('')
                  setLessonsPanel('summary')
                  onMenuViewChange('lessons')
                }}
              />
              {featureFlags.referenceV1 ? (
                <MenuNavRow
                  label={REFERENCE_COPY.menuRootLabel}
                  onClick={() => {
                    setCatalogBrowseIntent('reference')
                    setReferenceHubSearchQuery('')
                    setLessonsPanel('theory')
                    onMenuViewChange('lessons')
                  }}
                />
              ) : null}
              <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />`,
  'root справочник'
)

// Theory hub: search for reference + labels
mustReplace(
  `            {lessonsPanel === 'theory' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="По уровню" onClick={() => setLessonsPanel('theoryCefrLevels')} />
                  <MenuNavRow
                    label="По теме"
                    onClick={() => {
                      setTheoryTagsSearchQuery('')
                      setTheoryTopicLaunch(null)
                      setSelectedTheoryTopicLessonId(null)
                      setLessonsPanel('theoryGrammarCategories')
                    }}
                  />
                </div>
              </div>
            )}`,
  `            {lessonsPanel === 'theory' && (
              <div className="space-y-3">
                {isReferenceBrowse ? (
                  <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                    <label className="block text-[13px] font-medium text-[var(--text-muted)]" htmlFor={pid('reference-hub-search')}>
                      Поиск
                    </label>
                    <input
                      id={pid('reference-hub-search')}
                      type="text"
                      value={referenceHubSearchQuery}
                      onChange={(e) => setReferenceHubSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || !onOpenReferenceTopic) return
                        const strong = pickStrongReferenceHit(referenceHubSearchHits)
                        if (!strong) return
                        void onOpenReferenceTopic(strong.lessonId, 'theory', buildLearningLessonMeta())
                      }}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[15px] text-[var(--text)] outline-none"
                      placeholder={REFERENCE_COPY.searchPlaceholder}
                    />
                    {referenceHubSearchQuery.trim() ? (
                      referenceHubSearchHits.length > 0 ? (
                        <div className={MENU_GROUP_OUTER}>
                          <div className={MENU_GROUP_CLASS}>
                            {referenceHubSearchHits.map((hit) => (
                              <MenuNavRow
                                key={hit.lessonId}
                                label={hit.title}
                                onClick={() => {
                                  if (!onOpenReferenceTopic) return
                                  void onOpenReferenceTopic(hit.lessonId, 'theory', buildLearningLessonMeta())
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{REFERENCE_COPY.searchEmpty}</p>
                      )
                    ) : null}
                  </div>
                ) : null}
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    <MenuNavRow
                      label={isReferenceBrowse ? REFERENCE_COPY.byLevelLabel : 'По уровню'}
                      onClick={() => setLessonsPanel('theoryCefrLevels')}
                    />
                    <MenuNavRow
                      label={isReferenceBrowse ? REFERENCE_COPY.byTopicLabel : 'По теме'}
                      onClick={() => {
                        setTheoryTagsSearchQuery('')
                        setTheoryTopicLaunch(null)
                        setSelectedTheoryTopicLessonId(null)
                        setLessonsPanel('theoryGrammarCategories')
                      }}
                    />
                  </div>
                </div>
              </div>
            )}`,
  'theory hub search'
)

// Restore catalogBrowseIntent from context
mustReplace(
  `    setActiveGrammarCategoryId(initialLessonMenuContext.activeGrammarCategoryId ?? null)
    setActiveTheoryTagId(initialLessonMenuContext.activeTheoryTagId ?? null)
    setTheoryLessonSourceNav(initialLessonMenuContext.theoryLessonSource ?? null)
    setPracticeTheoryTagFilterId(initialLessonMenuContext.practiceTheoryTagFilterId ?? null)`,
  `    setActiveGrammarCategoryId(initialLessonMenuContext.activeGrammarCategoryId ?? null)
    setActiveTheoryTagId(initialLessonMenuContext.activeTheoryTagId ?? null)
    setTheoryLessonSourceNav(initialLessonMenuContext.theoryLessonSource ?? null)
    setPracticeTheoryTagFilterId(initialLessonMenuContext.practiceTheoryTagFilterId ?? null)
    setCatalogBrowseIntent(initialLessonMenuContext.catalogBrowseIntent === 'reference' ? 'reference' : 'lesson')`,
  'restore intent'
)

// Also include catalogBrowseIntent in initialLessonMenuContextKey
mustReplace(
  `      ret: initialLessonMenuContext.referenceExerciseType ?? null,
    })
  }, [initialLessonMenuContext])`,
  `      ret: initialLessonMenuContext.referenceExerciseType ?? null,
      cbi: initialLessonMenuContext.catalogBrowseIntent ?? null,
    })
  }, [initialLessonMenuContext])`,
  'context key intent'
)

fs.writeFileSync(f, s, 'utf8')
console.log('part2 ok')
