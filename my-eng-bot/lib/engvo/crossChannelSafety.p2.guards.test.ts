import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

describe('cross-channel P2 safety prompt guards', () => {
  it('free_call coaching refuses unsafe paraphrase and homework dumps', () => {
    const src = readFileSync(join(ROOT, 'lib/engvo/instructions.ts'), 'utf8')
    expect(src).toContain('Safety override: if the Russian input is 18+/harm/CSAM')
    expect(src).toContain('spoken practice partner — not a homework/essay writer')
    expect(src).toContain('conversation practice partner for children')
  })

  it('teacher topic_choice refuses unsafe topic lock', () => {
    const src = readFileSync(join(ROOT, 'lib/engvo/teacherPrompts.ts'), 'utf8')
    expect(src).toContain('Unsafe topic naming (18+/sexual')
    expect(src).toContain('do NOT lock that topic and do NOT start a drill')
    expect(src).toContain('Practice translation drill only — do not write essays')
  })

  it('dialogue prompt refuses homework dumps and insult teaching', () => {
    const src = readFileSync(join(ROOT, 'app/api/chat/route.ts'), 'utf8')
    expect(src).toContain('Homework/essay dump: do NOT write full school homework')
    expect(src).toContain('Insult teaching: do NOT teach swearing')
    expect(src).toContain("buildAiSafetyRulesBlock({ channel: 'dialogue'")
  })
})
