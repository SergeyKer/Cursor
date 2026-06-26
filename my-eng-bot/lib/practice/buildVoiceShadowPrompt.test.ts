import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { sanitizeVoiceShadowPrompt, buildVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'

describe('sanitizeVoiceShadowPrompt', () => {
  it('removes repeat-phrase tail with the target answer', () => {
    expect(
      sanitizeVoiceShadowPrompt("Ситуация: На улице темно. Повторите фразу: 'It's dark.'", "It's dark.")
    ).toBe('Ситуация: На улице темно.')
  })

  it('falls back when prompt is only the answer', () => {
    expect(sanitizeVoiceShadowPrompt("Repeat: It's dark.", "It's dark.")).toMatch(/Прослушайте фразу/i)
  })
})

describe('buildVoiceShadowPrompt', () => {
  it('extracts situation from lesson step task bubble', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const step = lesson!.steps.find((item) =>
      item.bubbles.some((bubble) => bubble.content.includes('На улице темно'))
    )
    expect(step?.exercise).toBeTruthy()

    const prompt = buildVoiceShadowPrompt(step!, step!.exercise!, lesson!)
    expect(prompt).toBe('Ситуация: На улице темно.')
    expect(prompt).not.toContain("It's dark")
  })
})
