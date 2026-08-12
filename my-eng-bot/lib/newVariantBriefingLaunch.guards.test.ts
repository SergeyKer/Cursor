import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readAppShell(): string {
  return readFileSync(join(process.cwd(), 'components', 'app', 'AppShell.tsx'), 'utf8')
}

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = source.indexOf(endMarker, start + startMarker.length)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('new variant briefing launch guards', () => {
  it('repeat_variant enters briefing and suppresses reward ticker on success', () => {
    const source = readAppShell()
    const body = sliceBetween(
      source,
      "if (action === 'repeat_variant') {",
      'const handleFinaleOpenTips = useCallback('
    )
    expect(body).toContain("setLessonViewStage('briefing')")
    expect(body).toContain('setLessonReturnBriefingAckRunKey(null)')
    expect(body).toContain('setFooterRewardSuppressBeforeMs(Date.now())')
    expect(body).toContain('bumpFooterSessionContext()')
    // both local clone and API success paths
    expect(body.split("setLessonViewStage('briefing')").length - 1).toBeGreaterThanOrEqual(2)
  })

  it('briefing-generate success does not acknowledge and stays on briefing', () => {
    const source = readAppShell()
    const body = sliceBetween(
      source,
      "if (variantGenerateLaunchRef.current === 'briefing') {",
      "} else {\n            console.info(\n              `[lesson-ui] mode=menu-generate-bg"
    )
    expect(body).toContain("setLessonViewStage('briefing')")
    expect(body).toContain('setLessonReturnBriefingAckRunKey(null)')
    expect(body).toContain('setFooterRewardSuppressBeforeMs(Date.now())')
    expect(body).not.toContain('acknowledgeLessonReturnBriefingRef.current')
  })

  it('activeLessonBriefingKey includes runKey', () => {
    const source = readAppShell()
    expect(source).toContain(
      'const activeLessonBriefingKey = activeLearningLessonId\n    ? `${activeLearningLessonId}:${activeStructuredLesson?.runKey ?? \'static\'}`\n    : \'lesson\''
    )
  })

  it('blocks celebrate ticker on structured lesson idle', () => {
    const source = readAppShell()
    const body = sliceBetween(
      source,
      'const structuredLessonFooterBlocksCelebrateTicker =',
      'const structuredLessonFooterTopLine = React.useMemo('
    )
    expect(body).toContain("activeStructuredLessonStatus === 'idle'")
  })
})
