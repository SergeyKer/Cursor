import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  clearLessonCache,
  isJsonPilotLessonId,
  loadLessonById,
  primeLessonCache,
} from '@/lib/lessons/loadLessonById'

describe('loadLessonById', () => {
  beforeEach(() => {
    clearLessonCache()
    vi.restoreAllMocks()
  })

  it('returns null for invalid id', async () => {
    expect(await loadLessonById('')).toBeNull()
    expect(await loadLessonById('   ')).toBeNull()
    expect(await loadLessonById('999')).toBeNull()
  })

  it('loads lesson 2 from TS fallback', async () => {
    const lesson = await loadLessonById('2')
    expect(lesson?.id).toBe('2')
    const cached = await loadLessonById('2')
    expect(cached).toBe(lesson)
  })

  it('uses cache when primed', async () => {
    primeLessonCache('1', { id: '1', title: 'Test', steps: [] } as never)
    const lesson = await loadLessonById('1')
    expect(lesson?.title).toBe('Test')
  })

  it('marks pilot json id', () => {
    expect(isJsonPilotLessonId('1')).toBe(true)
    expect(isJsonPilotLessonId('2')).toBe(false)
  })

  it('falls back to TS when JSON fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    const lesson = await loadLessonById('1')
    expect(lesson?.id).toBe('1')
  })
})
