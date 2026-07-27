import fs from 'node:fs'

const p = 'components/app/AppShell.tsx'
let s = fs.readFileSync(p, 'utf8')

const from = '    resetTeacherDrillProgress(engvoTeacherDrillProgressRef.current)\n'
const to =
  '    resetTeacherDrillProgress(engvoTeacherDrillProgressRef.current)\n' +
  '    engvoTeacherCurrentTenseRef.current = null\n' +
  '    engvoTeacherNextTenseRef.current = null\n' +
  '    engvoTeacherUsedAnyTensesRef.current = []\n' +
  '    engvoTeacherPostAttemptRotateArmedRef.current = false\n'
const n = s.split(from).length - 1
if (n !== 4) {
  console.error('expected 4 resets, got', n)
  process.exit(1)
}
s = s.split(from).join(to)

const armFrom =
  '                noteTeacherDrillUserAttempt(engvoTeacherDrillProgressRef.current, transcript)'
const armTo =
  armFrom +
  '\n                if (\n' +
  "                  engvoTeacherTense === 'all' &&\n" +
  "                  engvoTeacherDrillKind === 'tense_drill' &&\n" +
  '                  !engvoTeacherDrillProgressRef.current.drillAwaitingAnswer\n' +
  '                ) {\n' +
  '                  engvoTeacherPostAttemptRotateArmedRef.current = true\n' +
  '                }'
if (!s.includes(armFrom)) {
  console.error('arm missing')
  process.exit(1)
}
s = s.replace(armFrom, armTo)

const depsFrom = '[engvoCefrLevel, engvoTeacherSentenceType, engvoTeacherTense, sendEngvoRealtimeEvent]'
const depsTo =
  '[engvoCefrLevel, engvoTeacherDrillKind, engvoTeacherSentenceType, engvoTeacherTense, engvoCefrLevel, engvoRealtimeVoice, engvoSpeechSpeedPreset, engvoXaiVoice, buildEngvoLiveInstructions, ensureTeacherAnyLiveAxes, resolveTeacherLiveTense, sendEngvoRealtimeEvent, settings.audience]'
if (!s.includes(depsFrom)) {
  console.error('deps missing')
  process.exit(1)
}
s = s.replace(depsFrom, depsTo)

fs.writeFileSync(p, s)
console.log('OK resets+arm+deps')
