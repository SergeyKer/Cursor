import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')
let out = fs.readFileSync(FILE, 'utf8')

const from = `      }).catch((error) => {
        const message = error instanceof Error ? error.message : 'Не удалось открыть практику по выбранной цели.'
        setMenuLessonBgError(message)
        setHomeMenuView('lessons')
      })
    },
    [openPracticeSession]
  )
`
const to = `      }).catch((error) => {
        const message = error instanceof Error ? error.message : 'Не удалось открыть практику по выбранной цели.'
        setMenuLessonBgError(message)
        openMenuAt('lessons')
      })
    },
    [openMenuAt, openPracticeSession]
  )
`
if (!out.includes(from)) {
  console.error('adaptive catch block missing')
  process.exit(1)
}
out = out.replace(from, to)
fs.writeFileSync(FILE, out, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('adaptive openMenuAt: OK')
