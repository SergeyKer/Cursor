import fs from 'node:fs'

function patchFile(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  const crlf = s.includes('\r\n')
  for (const [from, to, label] of pairs) {
    const fromN = crlf ? from.replace(/\n/g, '\r\n') : from
    const toN = crlf ? to.replace(/\n/g, '\r\n') : to
    if (s.includes(fromN)) s = s.replace(fromN, toN)
    else if (s.includes(from)) s = s.replace(from, to)
    else throw new Error(`${file}: ${label}`)
  }
  fs.writeFileSync(file, s, 'utf8')
  console.log('ok', file)
}

patchFile('components/app/AppShell.tsx', [
  [
    `        isLessonBriefingActive,
        isTutorLessonPending,
      }),
    [
      dialogStarted,
      engvoVoiceMode,
      homeMenuView,
      isAccentActive,
      isLessonBriefingActive,
      isLessonIntroActive,
      isLessonTipsActive,
      isPracticeActive,
      isStructuredLessonActive,
      isTutorLessonPending,
      isVocabularyHubActive,
    ]
  )`,
    `        isLessonBriefingActive,
        isTutorLessonPending,
        isReferenceSheetActive,
      }),
    [
      dialogStarted,
      engvoVoiceMode,
      homeMenuView,
      isAccentActive,
      isLessonBriefingActive,
      isLessonIntroActive,
      isLessonTipsActive,
      isPracticeActive,
      isReferenceSheetActive,
      isStructuredLessonActive,
      isTutorLessonPending,
      isVocabularyHubActive,
    ]
  )`,
    'resolveActiveBranch',
  ],
  [
    `    if (isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive) return 'lesson-intro'`,
    `    if (isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive || isReferenceSheetActive) return 'lesson-intro'`,
    'footer mode',
  ],
  [
    `      isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive || isTutorLessonPending,`,
    `      isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive || isTutorLessonPending || isReferenceSheetActive,`,
    'header flags',
  ],
])

patchFile('components/SlideOutMenu.tsx', [
  [
    `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  /** Сгенерировать новый вариант урока через LLM. */`,
    `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  /** Открыть шпаргалку справочника. */
  onOpenReferenceTopic?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  /** Сгенерировать новый вариант урока через LLM. */`,
    'prop type',
  ],
  [
    `  onOpenLearningLesson,
  onGenerateLearningLesson,`,
    `  onOpenLearningLesson,
  onOpenReferenceTopic,
  onGenerateLearningLesson,`,
    'destructure',
  ],
  [
    `        onOpenLearningLesson={onOpenLearningLesson}
        onGenerateLearningLesson={onGenerateLearningLesson}`,
    `        onOpenLearningLesson={onOpenLearningLesson}
        onOpenReferenceTopic={onOpenReferenceTopic}
        onGenerateLearningLesson={onGenerateLearningLesson}`,
    'pass prop',
  ],
  [
    `                practiceMode: lessonMenuContext.practiceMode,
                referenceExerciseType: lessonMenuContext.referenceExerciseType,
              }`,
    `                practiceMode: lessonMenuContext.practiceMode,
                referenceExerciseType: lessonMenuContext.referenceExerciseType,
                catalogBrowseIntent: lessonMenuContext.catalogBrowseIntent,
              }`,
    'restore intent',
  ],
])
