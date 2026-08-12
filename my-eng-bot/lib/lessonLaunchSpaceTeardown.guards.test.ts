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

describe('lesson launch space teardown guards', () => {
  it('openLearningLesson clears tutorChatSpaceActive before lesson runtime', () => {
    const source = readAppShell()
    const body = sliceBetween(
      source,
      'const openLearningLesson = useCallback(',
      'const openReferenceTopic = useCallback('
    )
    expect(body).toContain('setTutorChatSpaceActive(false)')
    expect(body).toContain('setTutorFooterView(null)')
    expect(body).toContain('clearTutorReferenceReturnStash()')
    expect(body).toContain('clearTutorReturnContext()')
  })

  it('openGeneratedLearningLesson clears tutorChatSpaceActive before generate', () => {
    const source = readAppShell()
    const body = sliceBetween(
      source,
      'const openGeneratedLearningLesson = useCallback(',
      'const handleSelectLearningAction = useCallback('
    )
    expect(body).toContain('setTutorChatSpaceActive(false)')
    expect(body).toContain('setTutorFooterView(null)')
    expect(body).toContain('clearTutorReferenceReturnStash()')
    expect(body).toContain('clearTutorReturnContext()')
  })
})
