import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildNecessaryWordsCatalog } from '../lib/vocabulary/catalog'
import { countActiveWordsByLevel } from '../lib/vocabulary/levels'
import { parseNecessaryWordsText } from '../lib/vocabulary/parser'
import { countActiveWordsByWorld } from '../lib/vocabulary/worlds'
import { countActiveWordsByVocabularyTopic } from '../lib/vocabulary/topics'

async function main() {
  const workspaceRoot = process.cwd()
  const basePath = path.join(workspaceRoot, 'english_words_with_russian.txt')
  const advancedPath = path.join(workspaceRoot, 'english_words_advanced.txt')
  const outputDir = path.join(workspaceRoot, 'public', 'data', 'vocabulary')
  const outputPath = path.join(outputDir, 'necessary-words.json')

  const rawBase = await readFile(basePath, 'utf8')
  const parsedBase = parseNecessaryWordsText(rawBase)
  const maxBaseId = parsedBase.reduce((max, word) => Math.max(max, word.id), 0)

  let merged = [...parsedBase]
  let advancedNote = ''
  try {
    const rawAdvanced = await readFile(advancedPath, 'utf8')
    const parsedAdvanced = parseNecessaryWordsText(rawAdvanced)
    if (parsedAdvanced.length > 0) {
      const shifted = parsedAdvanced.map((word, index) => ({
        ...word,
        id: maxBaseId + 1 + index,
      }))
      merged = [...parsedBase, ...shifted]
      advancedNote = ` + english_words_advanced.txt (${shifted.length} слов, id с ${maxBaseId + 1})`
    }
  } catch {
    // Файл расширенного словаря необязателен.
  }

  const catalog = buildNecessaryWordsCatalog(merged, {
    sourceFile: `english_words_with_russian.txt${advancedNote}`,
    dictionaryVersion: 2,
  })
  const activeCounts = countActiveWordsByWorld(catalog.words)
  const levelCounts = countActiveWordsByLevel(catalog.words)
  const topicCounts = countActiveWordsByVocabularyTopic(catalog.words)

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  const activeTotal = catalog.words.filter((word) => word.status === 'active').length
  const excludedTotal = catalog.words.filter((word) => word.status === 'excluded').length
  const reviewTotal = catalog.words.filter((word) => word.status === 'needsReview').length

  console.info('[necessary-words] parsed:', merged.length)
  console.info('[necessary-words] active:', activeTotal)
  console.info('[necessary-words] excluded:', excludedTotal)
  console.info('[necessary-words] needsReview:', reviewTotal)
  console.info('[necessary-words] worldCounts:', activeCounts)
  console.info('[necessary-words] levelCounts:', levelCounts)
  console.info('[necessary-words] topicCounts:', topicCounts)
  console.info('[necessary-words] output:', outputPath)
}

void main().catch((error) => {
  console.error('[necessary-words] build failed')
  console.error(error)
  process.exitCode = 1
})
