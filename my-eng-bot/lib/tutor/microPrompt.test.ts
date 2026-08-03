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

  it('uses form_one not fill_one and includes mistake recipe', () => {
    const prompt = buildTutorMicroSystemPrompt('adult', 'a2')
    expect(prompt).toContain('form_one')
    expect(prompt).not.toContain('fill_one')
    expect(prompt).toMatch(/Mistakes|нельзя/i)
    expect(prompt).toContain('3-5')
    expect(prompt).toContain('I really like pizza')
  })
})
