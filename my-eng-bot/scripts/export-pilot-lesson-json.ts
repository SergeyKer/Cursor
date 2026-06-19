import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { itsTimeToLesson } from '../lib/lessons/its-time-to'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'data', 'lessons')
const outFile = path.join(outDir, '1.json')

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(itsTimeToLesson, null, 2) + '\n', 'utf8')
console.log('Wrote', path.relative(root, outFile), 'bytes', fs.statSync(outFile).size)
