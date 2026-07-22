import fs from 'node:fs'

const f = 'components/branches/LessonBranch.tsx'
let s = fs.readFileSync(f, 'utf8')
if (!s.includes('ReferenceSheetScreen')) {
  s = s.replace(
    `import LessonStepRenderer from '@/components/LessonStepRenderer'\n\nexport { LessonIntroScreen, LessonBriefingScreen, LessonExtraTipsScreen, LessonStepRenderer }`,
    `import LessonStepRenderer from '@/components/LessonStepRenderer'\nimport ReferenceSheetScreen from '@/components/ReferenceSheetScreen'\n\nexport { LessonIntroScreen, LessonBriefingScreen, LessonExtraTipsScreen, LessonStepRenderer, ReferenceSheetScreen }`
  )
  fs.writeFileSync(f, s, 'utf8')
  console.log('LessonBranch ok')
} else console.log('LessonBranch already')
