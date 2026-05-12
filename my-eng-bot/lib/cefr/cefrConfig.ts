import type { LevelId } from '@/lib/types'
import { DEFAULT_CONFIGS, type CefrLevelConfig, type SupportedCefrLevel } from '@/lib/cefr/cefrDefaults'

export type { CefrLevelConfig, SupportedCefrLevel } from '@/lib/cefr/cefrDefaults'

/**
 * Клиентский и универсальный fallback: только встроенные значения без чтения CEFR_Levels.xlsx.
 * На сервере для актуальных данных из таблицы используйте `@/lib/cefr/cefrConfig.server`.
 */
export function getCefrLevelConfig(level: LevelId): CefrLevelConfig | null {
  if (level === 'all') return null
  return DEFAULT_CONFIGS[level] ?? DEFAULT_CONFIGS.a1
}

export function getAllCefrLevelConfigs(): Record<SupportedCefrLevel, CefrLevelConfig> {
  return { ...DEFAULT_CONFIGS }
}
