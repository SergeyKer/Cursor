import { migrateUserLessonProgress } from '@/lib/lessonProgressMigration'
import type { PostLessonAction } from '@/types/lesson'
import type { UserLessonProgress } from '@/types/userProgress'
import {
  LESSON_PROGRESS_HYDRATED_EVENT,
  LESSON_PROGRESS_MAX_PAYLOAD_BYTES,
  LESSON_PROGRESS_SCHEMA_VERSION,
  estimateCloudPayloadBytes,
  fromCloudLessonProgressV1,
  pickWinningLessonProgress,
  toCloudLessonProgressV1,
  type LessonProgressSyncMeta,
} from '@/lib/lessonProgress/cloudTypes'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ensureAnonSession } from '@/lib/supabase/ensureAnonSession'
import { isSupabaseLessonProgressSyncEnabled } from '@/lib/supabase/env'

const LESSON_PROGRESS_STORAGE_KEY = 'my-eng-bot-lesson-progress'
const META_STORAGE_KEY = 'myeng:lesson-progress-sync-meta:v1'
const OUTBOX_STORAGE_KEY = 'myeng:lesson-progress-outbox:v1'
const FLUSH_DEBOUNCE_MS = 500

type StoredLessonProgressMap = Record<string, UserLessonProgress>
type MetaMap = Record<string, LessonProgressSyncMeta>
type OutboxMap = Record<string, number>

let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushInflight: Promise<void> | null = null
let onlineBound = false
let bootstrapped = false

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function normalizeProgressMap(value: unknown): StoredLessonProgressMap {
  if (!value || typeof value !== 'object') return {}
  const next: StoredLessonProgressMap = {}
  for (const [lessonId, progress] of Object.entries(value as Record<string, unknown>)) {
    if (!progress || typeof progress !== 'object') continue
    next[lessonId] = migrateUserLessonProgress(progress as Partial<UserLessonProgress>, lessonId)
  }
  return next
}

function loadProgressMap(): StoredLessonProgressMap {
  return normalizeProgressMap(readJson<unknown>(LESSON_PROGRESS_STORAGE_KEY, {}))
}

function saveProgressMap(map: StoredLessonProgressMap): void {
  writeJson(LESSON_PROGRESS_STORAGE_KEY, map)
}

function loadMetaMap(): MetaMap {
  const raw = readJson<unknown>(META_STORAGE_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next: MetaMap = {}
  for (const [lessonId, meta] of Object.entries(raw as Record<string, unknown>)) {
    if (!meta || typeof meta !== 'object') continue
    const clientUpdatedAt = (meta as { clientUpdatedAt?: unknown }).clientUpdatedAt
    const revision = (meta as { revision?: unknown }).revision
    if (typeof clientUpdatedAt !== 'string' || typeof revision !== 'number' || revision < 1) continue
    next[lessonId] = { clientUpdatedAt, revision }
  }
  return next
}

function saveMetaMap(map: MetaMap): void {
  writeJson(META_STORAGE_KEY, map)
}

function loadOutbox(): OutboxMap {
  const raw = readJson<unknown>(OUTBOX_STORAGE_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next: OutboxMap = {}
  for (const [lessonId, revision] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof revision === 'number' && revision >= 1) next[lessonId] = revision
  }
  return next
}

function saveOutbox(map: OutboxMap): void {
  writeJson(OUTBOX_STORAGE_KEY, map)
}

function dispatchHydrated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LESSON_PROGRESS_HYDRATED_EVENT))
}

function ensureOnlineListener(): void {
  if (!canUseStorage() || onlineBound) return
  onlineBound = true
  window.addEventListener('online', () => {
    if (!isSupabaseLessonProgressSyncEnabled()) return
    scheduleLessonProgressFlush(0)
  })
}

function resolveInitialMeta(progress: UserLessonProgress): LessonProgressSyncMeta {
  const fromLast = Date.parse(progress.lastCompleted)
  const clientUpdatedAt = Number.isFinite(fromLast) ? new Date(fromLast).toISOString() : new Date().toISOString()
  return { clientUpdatedAt, revision: 1 }
}

/** Mark existing local rows dirty on first sync enable. */
export function ensureLegacyProgressMetadata(): void {
  if (!canUseStorage()) return
  const map = loadProgressMap()
  const meta = loadMetaMap()
  const outbox = loadOutbox()
  let changed = false
  for (const [lessonId, progress] of Object.entries(map)) {
    if (meta[lessonId]) continue
    meta[lessonId] = resolveInitialMeta(progress)
    outbox[lessonId] = meta[lessonId].revision
    changed = true
  }
  if (changed) {
    saveMetaMap(meta)
    saveOutbox(outbox)
  }
}

/**
 * Called from saveLessonProgress after local write.
 * Keeps save path sync; network is debounced.
 */
export function noteLocalLessonProgressWrite(progress: UserLessonProgress): void {
  if (!canUseStorage()) return
  if (!isSupabaseLessonProgressSyncEnabled()) return
  ensureOnlineListener()
  const metaMap = loadMetaMap()
  const prev = metaMap[progress.lessonId]
  const nextRevision = (prev?.revision ?? 0) + 1
  metaMap[progress.lessonId] = {
    clientUpdatedAt: new Date().toISOString(),
    revision: nextRevision,
  }
  saveMetaMap(metaMap)
  const outbox = loadOutbox()
  outbox[progress.lessonId] = nextRevision
  saveOutbox(outbox)
  scheduleLessonProgressFlush(FLUSH_DEBOUNCE_MS)
}

export function scheduleLessonProgressFlush(delayMs = FLUSH_DEBOUNCE_MS): void {
  if (!isSupabaseLessonProgressSyncEnabled()) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushLessonProgressOutbox()
  }, delayMs)
}

type DbRow = {
  user_id: string
  lesson_id: string
  schema_version: number
  payload: unknown
  client_updated_at: string
  client_revision: number
  updated_at?: string
}

function parseRemoteRow(row: DbRow): {
  lessonId: string
  progress: UserLessonProgress
  clientUpdatedAt: string
  revision: number
} | null {
  if (row.schema_version !== LESSON_PROGRESS_SCHEMA_VERSION) return null
  if (!row.payload || typeof row.payload !== 'object') return null
  const local = loadProgressMap()[row.lesson_id] ?? null
  const progress = fromCloudLessonProgressV1(
    row.payload as Parameters<typeof fromCloudLessonProgressV1>[0],
    local
  )
  const revision = typeof row.client_revision === 'number' ? row.client_revision : 0
  const clientUpdatedAt =
    typeof row.client_updated_at === 'string' ? row.client_updated_at : progress.lastCompleted || ''
  if (!clientUpdatedAt || revision < 1) return null
  return { lessonId: row.lesson_id, progress, clientUpdatedAt, revision }
}

async function pullAndMerge(userId: string): Promise<void> {
  const client = getSupabaseBrowserClient()
  if (!client) return
  const { data, error } = await client
    .from('lesson_progress')
    .select('user_id, lesson_id, schema_version, payload, client_updated_at, client_revision, updated_at')
    .eq('user_id', userId)
  if (error) {
    console.warn('[engvo][lesson_progress] pull failed', {
      message: error.message,
      code: error.code,
      details: error.details,
    })
    return
  }
  if (!Array.isArray(data)) return

  const localMap = loadProgressMap()
  const metaMap = loadMetaMap()
  const outbox = loadOutbox()
  let changed = false

  for (const raw of data as DbRow[]) {
    const remote = parseRemoteRow(raw)
    if (!remote) continue
    const localProgress = localMap[remote.lessonId]
    if (!localProgress) {
      localMap[remote.lessonId] = remote.progress
      metaMap[remote.lessonId] = {
        clientUpdatedAt: remote.clientUpdatedAt,
        revision: remote.revision,
      }
      changed = true
      continue
    }
    const localMeta = metaMap[remote.lessonId] ?? resolveInitialMeta(localProgress)
    if (!metaMap[remote.lessonId]) {
      metaMap[remote.lessonId] = localMeta
      outbox[remote.lessonId] = localMeta.revision
      changed = true
    }
    const picked = pickWinningLessonProgress(
      {
        progress: localProgress,
        clientUpdatedAt: localMeta.clientUpdatedAt,
        revision: localMeta.revision,
      },
      {
        progress: remote.progress,
        clientUpdatedAt: remote.clientUpdatedAt,
        revision: remote.revision,
      }
    )
    if (picked.winner === 'remote') {
      // Preserve local mistakes
      localMap[remote.lessonId] = fromCloudLessonProgressV1(
        toCloudLessonProgressV1(picked.side.progress),
        localProgress
      )
      metaMap[remote.lessonId] = {
        clientUpdatedAt: picked.side.clientUpdatedAt,
        revision: picked.side.revision,
      }
      delete outbox[remote.lessonId]
      changed = true
    } else {
      outbox[remote.lessonId] = localMeta.revision
      changed = true
    }
  }

  if (changed) {
    saveProgressMap(localMap)
    saveMetaMap(metaMap)
    saveOutbox(outbox)
    dispatchHydrated()
  }
}

async function upsertOne(
  userId: string,
  lessonId: string,
  progress: UserLessonProgress,
  meta: LessonProgressSyncMeta
): Promise<boolean> {
  const client = getSupabaseBrowserClient()
  if (!client) return false
  const cloud = toCloudLessonProgressV1(progress)
  if (estimateCloudPayloadBytes(cloud) > LESSON_PROGRESS_MAX_PAYLOAD_BYTES) return false
  const { error } = await client.from('lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      schema_version: LESSON_PROGRESS_SCHEMA_VERSION,
      payload: cloud,
      client_updated_at: meta.clientUpdatedAt,
      client_revision: meta.revision,
    },
    { onConflict: 'user_id,lesson_id' }
  )
  if (error) {
    console.warn('[engvo][lesson_progress] upsert failed', {
      lessonId,
      message: error.message,
      code: error.code,
      details: error.details,
    })
    return false
  }
  return true
}

export async function flushLessonProgressOutbox(): Promise<void> {
  if (!isSupabaseLessonProgressSyncEnabled()) return
  if (flushInflight) return flushInflight
  flushInflight = (async () => {
    try {
      const userId = await ensureAnonSession()
      if (!userId) {
        console.warn('[engvo][lesson_progress] flush skipped — no user')
        return
      }
      const outbox = loadOutbox()
      const ids = Object.keys(outbox)
      if (ids.length === 0) return
      const map = loadProgressMap()
      const metaMap = loadMetaMap()
      for (const lessonId of ids) {
        const queuedRevision = outbox[lessonId]
        const progress = map[lessonId]
        const meta = metaMap[lessonId]
        if (!progress || !meta) {
          const nextOutbox = loadOutbox()
          delete nextOutbox[lessonId]
          saveOutbox(nextOutbox)
          continue
        }
        if (meta.revision !== queuedRevision) {
          // Newer local write already queued with newer revision — skip stale entry
          continue
        }
        const ok = await upsertOne(userId, lessonId, progress, meta)
        if (!ok) continue
        const latestMeta = loadMetaMap()[lessonId]
        const latestOutbox = loadOutbox()
        if (latestMeta && latestMeta.revision === queuedRevision) {
          delete latestOutbox[lessonId]
          saveOutbox(latestOutbox)
        }
      }
    } catch (err) {
      console.warn('[engvo][lesson_progress] flush exception', err)
    } finally {
      flushInflight = null
    }
  })()
  return flushInflight
}

export async function bootstrapLessonProgressSync(): Promise<void> {
  if (!isSupabaseLessonProgressSyncEnabled()) return
  if (bootstrapped) {
    scheduleLessonProgressFlush(0)
    return
  }
  bootstrapped = true
  ensureOnlineListener()
  ensureLegacyProgressMetadata()
  const userId = await ensureAnonSession()
  if (!userId) return
  try {
    await pullAndMerge(userId)
  } catch {
    /* ignore */
  }
  await flushLessonProgressOutbox()
}

/** Test helpers */
export function resetLessonProgressSyncStateForTests(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  flushInflight = null
  bootstrapped = false
}

export type { PostLessonAction }
