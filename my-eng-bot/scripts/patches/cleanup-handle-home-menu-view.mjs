import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')
let out = fs.readFileSync(FILE, 'utf8')

const block = `  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      if (v !== homeMenuView) {
        setFooterTransitionText(null)
        bumpFooterSessionContext()
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted, bumpFooterSessionContext]
  )

`
if (!out.includes(block)) {
  console.error('handleHomeMenuViewChange block missing')
  process.exit(1)
}
out = out.replace(block, '')
fs.writeFileSync(FILE, out, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('removed handleHomeMenuViewChange')
