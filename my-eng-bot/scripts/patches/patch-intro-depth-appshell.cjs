const fs = require('fs')
const path = 'components/app/AppShell.tsx'
let s = fs.readFileSync(path, 'utf8')

function mustInclude(label, re) {
  if (!re.test(s)) {
    console.error('Missing pattern:', label)
    process.exit(1)
  }
}

mustInclude('import', /import type \{ LessonIntroDepth \}/)
mustInclude('state', /lessonIntroDepth, setLessonIntroDepth/)
mustInclude('screen depth', /depth=\{lessonIntroDepth\}/)

s = s.replace(/import type \{ LessonIntroDepth \} from '@\/components\/branches\/LessonBranch'\r?\n/, '')
s = s.replace(/\r?\n[ \t]*const \[lessonIntroDepth, setLessonIntroDepth\] = useState<LessonIntroDepth>\('quick'\)/g, '')
s = s.replace(/\r?\n[ \t]*setLessonIntroDepth\('quick'\)/g, '')

// Collapse footer ternaries that reference lessonIntroDepth by line surgery
{
  const lines = s.split(/\n/)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('const introFooterDynamicText = lessonMenuContext')) {
      out.push("  const introFooterDynamicText = lessonMenuContext?.lessonsPanel === 'tutor'")
      out.push("    ? 'MyEng \u0441\u043e\u0431\u0440\u0430\u043b \u0442\u0435\u043c\u0443. \u0420\u0430\u0437\u0431\u0435\u0440\u0451\u043c \u0441\u043c\u044b\u0441\u043b.'")
      out.push("    : '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043a\u043e\u0440\u043e\u0442\u043a\u043e \u0440\u0430\u0437\u0431\u0435\u0440\u0451\u043c \u0441\u043c\u044b\u0441\u043b \u0442\u0435\u043c\u044b.'")
      // skip until we hit the next const that isn't continuation of this ternary
      while (i + 1 < lines.length) {
        const n = lines[i + 1]
        if (/^\s*const /.test(n) && !n.includes('introFooterDynamicText')) break
        if (/lessonIntroDepth/.test(n) || /^\s*\? /.test(n) || /^\s*: /.test(n)) {
          i++
          continue
        }
        break
      }
      continue
    }
    if (line.includes('const introFooterStaticText = lessonMenuContext')) {
      out.push("  const introFooterStaticText = lessonMenuContext?.lessonsPanel === 'tutor'")
      out.push("    ? '\u0420\u0435\u043f\u0435\u0442\u0438\u0442\u043e\u0440 | \u0412\u0432\u0435\u0434\u0435\u043d\u0438\u0435'")
      out.push("    : '\u0412\u0432\u0435\u0434\u0435\u043d\u0438\u0435 | 0/7 \u0448\u0430\u0433\u043e\u0432'")
      while (i + 1 < lines.length) {
        const n = lines[i + 1]
        if (/^\s*const /.test(n) && !n.includes('introFooterStaticText')) break
        if (/lessonIntroDepth/.test(n) || /^\s*\? /.test(n) || /^\s*: /.test(n)) {
          i++
          continue
        }
        break
      }
      continue
    }
    out.push(line)
  }
  s = out.join('\n')
}

s = s.replace(
  /\$\{activeLearningLessonId \?\? 'lesson'\}:intro:\$\{lessonIntroDepth\}/,
  "${activeLearningLessonId ?? 'lesson'}:intro"
)

// Remove depth-related props from LessonIntroScreen JSX block
s = s.replace(/\r?\n[ \t]*depth=\{lessonIntroDepth\}/g, '')
s = s.replace(/\r?\n[ \t]*provider=\{settings\.provider\}(?=\r?\n[ \t]*(?:openAiChatPreset|audience)=)/g, '')
s = s.replace(/\r?\n[ \t]*openAiChatPreset=\{settings\.openAiChatPreset\}(?=\r?\n[ \t]*audience=)/g, '')
s = s.replace(/\r?\n[ \t]*onShowDetails=\{\(\) => setLessonIntroDepth\('details'\)\}/g, '')
s = s.replace(/\r?\n[ \t]*onShowDeepDive=\{\(\) => setLessonIntroDepth\('deep'\)\}/g, '')

const leftovers = []
s.split(/\n/).forEach((l, i) => {
  if (/lessonIntroDepth|setLessonIntroDepth|LessonIntroDepth/.test(l)) leftovers.push(`${i + 1}: ${l.trim()}`)
})
if (leftovers.length) {
  console.error('Leftovers:\n' + leftovers.join('\n'))
  process.exit(1)
}

fs.writeFileSync(path, s, 'utf8')
console.log('OK')
