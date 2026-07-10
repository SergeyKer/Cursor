import { describe, expect, it } from 'vitest'
import {
  extractTimeToGapObject,
  inferTimeToGapVerb,
  isDropdownFillPairAligned,
  resolveAlignedDropdownTarget,
} from '@/lib/practice/prompt/dropdownFillPairAlign'
import { buildGapFillPrompt } from '@/lib/practice/prompt/dropdownFillPromptFormat'

describe('dropdownFillPairAlign', () => {
  const teaPrompt = buildGapFillPrompt(
    'Холодно, пора пить чай',
    "It's cold. It is time to ___ tea."
  )

  it('extracts object after time to ___', () => {
    expect(extractTimeToGapObject("It's cold. It is time to ___ tea.")).toBe('tea')
    expect(extractTimeToGapObject("It's rainy. It is time to ___ an umbrella.")).toBe('umbrella')
  })

  it('infers drink from tea object', () => {
    expect(inferTimeToGapVerb(teaPrompt)).toBe('drink')
  })

  it('rejects go for tea gap (screenshot regression)', () => {
    expect(isDropdownFillPairAligned(teaPrompt, 'go')).toBe(false)
    expect(isDropdownFillPairAligned(teaPrompt, 'drink')).toBe(true)
    expect(resolveAlignedDropdownTarget(teaPrompt, 'go')).toBe('drink')
  })

  it('prefers EN object over vague RU', () => {
    const vague = buildGapFillPrompt(
      'Сейчас холодно, поэтому пора что-то сделать',
      "It's cold. It is time to ___ tea."
    )
    expect(resolveAlignedDropdownTarget(vague, 'go')).toBe('drink')
  })

  it('aligns lunch → eat and umbrella → take', () => {
    const lunch = buildGapFillPrompt(
      'Голодно, пора есть обед',
      "It's hungry. It is time to ___ lunch."
    )
    const umbrella = buildGapFillPrompt(
      'Идет дождь, пора брать зонт',
      "It's rainy. It is time to ___ an umbrella."
    )
    expect(isDropdownFillPairAligned(lunch, 'eat')).toBe(true)
    expect(isDropdownFillPairAligned(lunch, 'drink')).toBe(false)
    expect(resolveAlignedDropdownTarget(umbrella, 'go')).toBe('take')
  })

  it('does not force align for non time-to gaps', () => {
    const country = buildGapFillPrompt('Я из России', 'I am from ___.')
    expect(isDropdownFillPairAligned(country, 'Russia')).toBe(true)
    expect(isDropdownFillPairAligned(country, 'Spain')).toBe(true)
    expect(resolveAlignedDropdownTarget(country, 'Spain')).toBeNull()
  })
})
