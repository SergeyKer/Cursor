import fs from 'node:fs'

function patch(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  const crlf = s.includes('\r\n')
  for (const [from, to, label] of pairs) {
    const fromN = crlf ? from.replace(/\n/g, '\r\n') : from
    const toN = crlf ? to.replace(/\n/g, '\r\n') : to
    if (!s.includes(fromN) && !s.includes(from)) throw new Error(`${file}: ${label}`)
    s = s.includes(fromN) ? s.replace(fromN, toN) : s.replace(from, to)
  }
  fs.writeFileSync(file, s, 'utf8')
  console.log('ok', file)
}

patch('lib/start/activeBranch.ts', [
  [
    `  isLessonBriefingActive: boolean
  isTutorLessonPending: boolean
}`,
    `  isLessonBriefingActive: boolean
  isTutorLessonPending: boolean
  isReferenceSheetActive?: boolean
}`,
    'type',
  ],
  [
    `    input.isLessonBriefingActive ||
    input.isTutorLessonPending
  ) {
    return 'lesson'
  }`,
    `    input.isLessonBriefingActive ||
    input.isTutorLessonPending ||
    input.isReferenceSheetActive
  ) {
    return 'lesson'
  }`,
    'resolve',
  ],
])

patch('lib/start/activeBranch.test.ts', [
  [
    `  isTutorLessonPending: false,
}`,
    `  isTutorLessonPending: false,
  isReferenceSheetActive: false,
}`,
    'test base',
  ],
])

patch('components/app/AppShell.tsx', [
  [
    `        isLessonIntroActive,
        isLessonTipsActive,
        isLessonBriefingActive,
        isTutorLessonPending,
      }),
    [`,
    `        isLessonIntroActive,
        isLessonTipsActive,
        isLessonBriefingActive,
        isTutorLessonPending,
        isReferenceSheetActive,
      }),
    [`,
    'resolve call',
  ],
  [
    `      isLessonIntroActive,
      isLessonTipsActive,
      isLessonBriefingActive,
      isTutorLessonPending,
    ]
  )`,
    `      isLessonIntroActive,
      isLessonTipsActive,
      isLessonBriefingActive,
      isTutorLessonPending,
      isReferenceSheetActive,
    ]
  )`,
    'resolve deps',
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

patch('components/SlideOutMenu.tsx', [
  [
    `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void`,
    `  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void
  /** Открыть шпаргалку справочника. */
  onOpenReferenceTopic?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void`,
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

console.log('done')
