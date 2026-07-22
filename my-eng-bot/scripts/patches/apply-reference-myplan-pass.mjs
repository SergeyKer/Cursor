import fs from 'node:fs'
const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')
const from = `            onOpenLearningLesson={onOpenLearningLesson}
            onOpenPracticeSession={onOpenPracticeSession}`
const to = `            onOpenLearningLesson={onOpenLearningLesson}
            onOpenReferenceTopic={
              onOpenReferenceTopic
                ? (lessonId) => {
                    void onOpenReferenceTopic(lessonId, 'theory', {
                      catalogBrowseIntent: 'reference',
                    })
                  }
                : undefined
            }
            onOpenPracticeSession={onOpenPracticeSession}`
const fromCr = from.replace(/\n/g, '\r\n')
const toCr = to.replace(/\n/g, '\r\n')
if (s.includes(fromCr)) s = s.replace(fromCr, toCr)
else if (s.includes(from)) s = s.replace(from, to)
else throw new Error('myplan pass missing')
fs.writeFileSync(f, s, 'utf8')
console.log('ok')
