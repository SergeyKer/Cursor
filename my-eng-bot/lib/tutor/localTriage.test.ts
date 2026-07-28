import { describe, expect, it } from 'vitest'
import { localTutorTriage } from '@/lib/tutor/localTriage'

describe('localTutorTriage', () => {
  it('routes clear questions to A', () => {
    expect(localTutorTriage('Зачем Present Perfect, если есть Past Simple?').kind).toBe('A')
  })

  it('routes narrow topic labels to B chips', () => {
    const r = localTutorTriage('Present Perfect')
    expect(r.kind).toBe('B')
    if (r.kind === 'B') expect(r.chips.length).toBeGreaterThan(0)
  })

  it('routes bare word to C intent chips', () => {
    const r = localTutorTriage('cars')
    expect(r.kind).toBe('C')
  })

  it('routes noise to D', () => {
    const r = localTutorTriage('???')
    expect(r.kind).toBe('D')
  })
})
