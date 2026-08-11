/**
 * Move lesson header progress chip next to menu (gap-1). UTF-8 safe.
 * Usage: node scripts/patches/apply-header-progress-left.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')

function mustReplaceOnce(content, from, to, label) {
  const count = content.split(from).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`)
  return content.replace(from, to)
}

const fromGridMenu = [
  '            className={`relative mx-auto grid w-full grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 sm:grid-cols-[2.5rem_1fr_auto] ${',
  "              dialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'",
  '            }`}',
  '          >',
  '            <button',
  '              type="button"',
  '              onClick={handleMenuButtonClick}',
  '              className="app-header-control chat-action-button pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"',
  "              style={{ borderRadius: 'var(--app-header-control-radius)' }}",
  "              aria-label={menuOpen ? '\u041c\u0435\u043d\u044e, \u043e\u0442\u043a\u0440\u044b\u0442\u043e' : '\u041c\u0435\u043d\u044e, \u0437\u0430\u043a\u0440\u044b\u0442\u043e'}",
  '              aria-expanded={menuOpen}',
  "              title={menuOpen ? '\u041c\u0435\u043d\u044e, \u043e\u0442\u043a\u0440\u044b\u0442\u043e' : '\u041c\u0435\u043d\u044e, \u0437\u0430\u043a\u0440\u044b\u0442\u043e'}",
  '            >',
  '              <MenuToggleIcon />',
  '            </button>',
  '',
].join('\n')

const toGridMenu = [
  '            className={`relative mx-auto grid w-full items-center gap-2 ${',
  '              lessonHeaderProgressLabel',
  "                ? 'grid-cols-[auto_1fr_auto]'",
  "                : 'grid-cols-[2.5rem_1fr_2.5rem] sm:grid-cols-[2.5rem_1fr_auto]'",
  '            } ${',
  "              dialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'",
  '            }`}',
  '          >',
  '            <div className="relative z-20 col-start-1 row-start-1 flex items-center gap-1 justify-self-start">',
  '              <button',
  '                type="button"',
  '                onClick={handleMenuButtonClick}',
  '                className="app-header-control chat-action-button pointer-events-auto relative flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"',
  "                style={{ borderRadius: 'var(--app-header-control-radius)' }}",
  "                aria-label={menuOpen ? '\u041c\u0435\u043d\u044e, \u043e\u0442\u043a\u0440\u044b\u0442\u043e' : '\u041c\u0435\u043d\u044e, \u0437\u0430\u043a\u0440\u044b\u0442\u043e'}",
  '                aria-expanded={menuOpen}',
  "                title={menuOpen ? '\u041c\u0435\u043d\u044e, \u043e\u0442\u043a\u0440\u044b\u0442\u043e' : '\u041c\u0435\u043d\u044e, \u0437\u0430\u043a\u0440\u044b\u0442\u043e'}",
  '              >',
  '                <MenuToggleIcon />',
  '              </button>',
  '              {dialogStarted && isStructuredLessonActive && lessonHeaderProgressLabel ? (',
  '                <span',
  '                  className="max-w-[5.5rem] shrink-0 truncate rounded-md border border-[var(--app-header-control-border)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-[var(--app-header-text)] sm:max-w-none sm:text-[11px]"',
  '                  title={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}',
  '                  aria-label={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}',
  '                >',
  '                  {lessonHeaderProgressLabel}',
  '                </span>',
  '              ) : null}',
  '            </div>',
  '',
].join('\n')

const fromRightProgress = [
  '              {dialogStarted && isStructuredLessonActive && lessonHeaderProgressLabel ? (',
  '                <span',
  '                  className="mr-1 max-w-[5.5rem] shrink-0 truncate rounded-md border border-[var(--app-header-control-border)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-[var(--app-header-text)] sm:max-w-none sm:text-[11px]"',
  '                  title={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}',
  '                  aria-label={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}',
  '                >',
  '                  {lessonHeaderProgressLabel}',
  '                </span>',
  '              ) : null}',
  '',
].join('\n')

let content = fs.readFileSync(FILE, 'utf8')
content = mustReplaceOnce(content, fromGridMenu, toGridMenu, 'wrap menu + move progress left')
content = mustReplaceOnce(content, fromRightProgress, '', 'remove progress from right cluster')
fs.writeFileSync(FILE, content, 'utf8')

const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length > 0) {
  console.error('check:cyrillic failed after header progress left patch')
  for (const { relPath, violations } of failures) {
    for (const v of violations) {
      console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
    }
  }
  process.exit(1)
}

console.log('OK: header progress moved left next to menu')
