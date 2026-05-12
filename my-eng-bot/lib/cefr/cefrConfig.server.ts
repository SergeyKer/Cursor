import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

import type { LevelId } from '@/lib/types'
import {
  DEFAULT_CONFIGS,
  mergeConfig,
  mapLevel,
  pick,
  type CefrLevelConfig,
  type SupportedCefrLevel,
} from '@/lib/cefr/cefrDefaults'

export type { CefrLevelConfig, SupportedCefrLevel } from '@/lib/cefr/cefrDefaults'

const CEFR_FILE_PATH = path.join(process.cwd(), 'CEFR_Levels.xlsx')

let cache:
  | {
      mtimeMs: number
      configs: Record<SupportedCefrLevel, CefrLevelConfig>
    }
  | null = null

function sheetToRows(sheet?: XLSX.WorkSheet): Record<string, unknown>[] {
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })
}

function buildConfigsFromWorkbook(workbook: XLSX.WorkBook): Record<SupportedCefrLevel, CefrLevelConfig> {
  const summaryRows = sheetToRows(workbook.Sheets.Summary)
  const rulesRows = sheetToRows(workbook.Sheets.PromptRules)
  const combinedRows = sheetToRows(workbook.Sheets.Levels_Config)

  const summaryByLevel = new Map<SupportedCefrLevel, Record<string, unknown>>()
  for (const row of summaryRows) {
    const level = mapLevel(pick(row, ['Уровень', 'Level']))
    if (!level) continue
    summaryByLevel.set(level, row)
  }

  const rulesByLevel = new Map<SupportedCefrLevel, Record<string, unknown>>()
  for (const row of rulesRows) {
    const level = mapLevel(pick(row, ['Уровень', 'Level']))
    if (!level) continue
    rulesByLevel.set(level, row)
  }

  for (const row of combinedRows) {
    const level = mapLevel(pick(row, ['Уровень', 'Level']))
    if (!level) continue
    if (!summaryByLevel.has(level)) summaryByLevel.set(level, row)
    if (!rulesByLevel.has(level)) rulesByLevel.set(level, row)
  }

  const next: Record<SupportedCefrLevel, CefrLevelConfig> = { ...DEFAULT_CONFIGS }
  ;(Object.keys(DEFAULT_CONFIGS) as SupportedCefrLevel[]).forEach((level) => {
    next[level] = mergeConfig(
      DEFAULT_CONFIGS[level],
      summaryByLevel.get(level),
      rulesByLevel.get(level)
    )
  })

  return next
}

function readConfigs(): Record<SupportedCefrLevel, CefrLevelConfig> {
  try {
    if (!fs.existsSync(CEFR_FILE_PATH)) return DEFAULT_CONFIGS
    const stat = fs.statSync(CEFR_FILE_PATH)
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.configs
    const workbook = XLSX.readFile(CEFR_FILE_PATH)
    const configs = buildConfigsFromWorkbook(workbook)
    cache = { mtimeMs: stat.mtimeMs, configs }
    return configs
  } catch {
    return DEFAULT_CONFIGS
  }
}

export function getCefrLevelConfig(level: LevelId): CefrLevelConfig | null {
  if (level === 'all') return null
  const configs = readConfigs()
  return configs[level] ?? configs.a1
}

export function getAllCefrLevelConfigs(): Record<SupportedCefrLevel, CefrLevelConfig> {
  return readConfigs()
}
