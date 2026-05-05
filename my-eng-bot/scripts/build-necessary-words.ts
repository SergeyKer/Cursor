import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildNecessaryWordsCatalog } from '../lib/vocabulary/catalog'
import { parseNecessaryWordsText } from '../lib/vocabulary/parser'
import { countActiveWordsByWorld } from '../lib/vocabulary/worlds'

async function main() {
  const workspaceRoot = process.cwd()
  const sourcePath = path.join(workspaceRoot, 'english_words_with_russian.txt')
  const outputDir = path.join(workspaceRoot, 'public', 'data', 'vocabulary')
  const outputPath = path.join(outputDir, 'necessary-words.json')

  const raw = await readFile(sourcePath, 'utf8')
  const parsed = parseNecessaryWordsText(raw)
  const catalog = buildNecessaryWordsCatalog(parsed)
  const activeCounts = countActiveWordsByWorld(catalog.words)

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  const activeTotal = catalog.words.filter((word) => word.status === 'active').length
  const excludedTotal = catalog.words.filter((word) => word.status === 'excluded').length
  const reviewTotal = catalog.words.filter((word) => word.status === 'needsReview').length

  console.info('[necessary-words] parsed:', parsed.length)
  console.info('[necessary-words] active:', activeTotal)
  console.info('[necessary-words] excluded:', excludedTotal)
  console.info('[necessary-words] needsReview:', reviewTotal)
  console.info('[necessary-words] worldCounts:', activeCounts)
  console.info('[necessary-words] output:', outputPath)
}

void main().catch((error) => {
  console.error('[necessary-words] build failed')
  console.error(error)
  process.exitCode = 1
})
