import { describe, expect, it } from 'vitest'
import { buildTutorMicroSystemPrompt } from '@/lib/tutor/microPrompt'

describe('buildTutorMicroSystemPrompt', () => {
  it('requires refusal path and bans junk templates', () => {
    const prompt = buildTutorMicroSystemPrompt('adult', 'a2')
    expect(prompt).toContain('micro": null')
    expect(prompt).toContain('Тема сейчас')
    expect(prompt).toContain('correctIndex')
    expect(prompt).toContain('pick_side')
  })
})
