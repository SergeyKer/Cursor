import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { VOCABULARY_LEVELS } from '../lib/vocabulary/levels'
import { VOCABULARY_TOPICS } from '../lib/vocabulary/topics'
import { VOCABULARY_WORLDS } from '../lib/vocabulary/worlds'
import type {
  NecessaryWordsCatalog,
  VocabularyLevelId,
  VocabularyTopicId,
  VocabularyWorldId,
} from '../types/vocabulary'

function formatLine(word: NecessaryWordsCatalog['words'][number]): string {
  const tr = word.transcription?.trim() ? ` ${word.transcription.trim()}` : ''
  return `${word.id}. ${word.en.trim()}${tr} — ${word.ru.trim()}`
}

async function main() {
  const workspaceRoot = process.cwd()
  const jsonPath = path.join(workspaceRoot, 'public', 'data', 'vocabulary', 'necessary-words.json')
  const outputPath = path.join(workspaceRoot, 'public', 'data', 'vocabulary', 'necessary-words-by-world.txt')

  const raw = await readFile(jsonPath, 'utf8')
  const catalog = JSON.parse(raw) as NecessaryWordsCatalog

  const activeWords = catalog.words.filter((word) => word.status === 'active')

  const lines: string[] = []
  lines.push(`Словарь necessary-words v${catalog.dictionaryVersion} (только активные слова)`)
  lines.push(`Сгенерировано (JSON): ${catalog.generatedAt}`)
  lines.push(`Исходный файл: ${catalog.sourceFile}`)
  lines.push(`Выгрузка TXT: ${new Date().toISOString()}`)
  lines.push(`Всего активных: ${activeWords.length}`)
  lines.push('')

  const worldIds = VOCABULARY_WORLDS.map((world) => world.id)

  for (const worldDef of VOCABULARY_WORLDS) {
    const words = activeWords
      .filter((word) => word.primaryWorld === worldDef.id)
      .sort((left, right) => left.id - right.id)

    lines.push('='.repeat(72))
    lines.push(`${worldDef.badge} ${worldDef.title} (${worldDef.id})`)
    lines.push(worldDef.description)
    lines.push(`Записей в мире: ${words.length}`)
    lines.push('-'.repeat(72))

    for (const word of words) {
      lines.push(formatLine(word))
    }

    lines.push('')
  }

  const unknownWorld = activeWords.filter(
    (word) => !worldIds.includes(word.primaryWorld as VocabularyWorldId)
  )
  if (unknownWorld.length > 0) {
    lines.push('='.repeat(72))
    lines.push('Неизвестный primaryWorld')
    lines.push('-'.repeat(72))
    for (const word of unknownWorld.sort((a, b) => a.id - b.id)) {
      lines.push(formatLine(word))
    }
    lines.push('')
  }

  const levelIds = VOCABULARY_LEVELS.map((level) => level.id)
  for (const levelDef of VOCABULARY_LEVELS) {
    const words = activeWords
      .filter((word) => word.primaryLevel === levelDef.id)
      .sort((left, right) => left.id - right.id)

    lines.push('='.repeat(72))
    lines.push(`${levelDef.prefixLabel} (${levelDef.id})`)
    if (levelDef.hint) lines.push(levelDef.hint)
    lines.push(`Записей на уровне: ${words.length}`)
    lines.push('-'.repeat(72))

    for (const word of words) {
      lines.push(formatLine(word))
    }

    lines.push('')
  }

  const unknownLevel = activeWords.filter(
    (word) => !levelIds.includes(word.primaryLevel as VocabularyLevelId)
  )
  if (unknownLevel.length > 0) {
    lines.push('='.repeat(72))
    lines.push('Неизвестный primaryLevel')
    lines.push('-'.repeat(72))
    for (const word of unknownLevel.sort((a, b) => a.id - b.id)) {
      lines.push(formatLine(word))
    }
    lines.push('')
  }

  const topicIds = VOCABULARY_TOPICS.map((topic) => topic.id)
  for (const topicDef of VOCABULARY_TOPICS) {
    const words = activeWords
      .filter((word) => word.primaryVocabularyTopic === topicDef.id)
      .sort((left, right) => left.id - right.id)

    lines.push('='.repeat(72))
    lines.push(`${topicDef.badge} ${topicDef.title} (${topicDef.id})`)
    lines.push(topicDef.description)
    lines.push(`Записей в теме: ${words.length}`)
    lines.push('-'.repeat(72))

    for (const word of words) {
      lines.push(formatLine(word))
    }

    lines.push('')
  }

  const unknownTopic = activeWords.filter(
    (word) => !topicIds.includes(word.primaryVocabularyTopic as VocabularyTopicId)
  )
  if (unknownTopic.length > 0) {
    lines.push('='.repeat(72))
    lines.push('Неизвестная primaryVocabularyTopic')
    lines.push('-'.repeat(72))
    for (const word of unknownTopic.sort((a, b) => a.id - b.id)) {
      lines.push(formatLine(word))
    }
    lines.push('')
  }

  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8')

  const counts = VOCABULARY_WORLDS.map((world) => ({
    id: world.id,
    count: activeWords.filter((w) => w.primaryWorld === world.id).length,
  }))
  const perLevel = VOCABULARY_LEVELS.map((level) => ({
    id: level.id,
    count: activeWords.filter((w) => w.primaryLevel === level.id).length,
  }))
  const perTopic = VOCABULARY_TOPICS.map((topic) => ({
    id: topic.id,
    count: activeWords.filter((w) => w.primaryVocabularyTopic === topic.id).length,
  }))

  console.info('[export-necessary-words-txt] output:', outputPath)
  console.info('[export-necessary-words-txt] perWorld:', counts)
  console.info('[export-necessary-words-txt] perLevel:', perLevel)
  console.info('[export-necessary-words-txt] perTopic:', perTopic)
}

void main().catch((error) => {
  console.error('[export-necessary-words-txt] failed')
  console.error(error)
  process.exitCode = 1
})
