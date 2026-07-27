import fs from 'node:fs'

const p = 'components/app/AppShell.tsx'
let s = fs.readFileSync(p, 'utf8')

const pairs = [
  [
    `                instructions: buildEngvoFirstTurnResponseInstructions({
                  audience: settings.audience,
                  level: engvoCefrLevel,
                  topic: settings.topic,
                  kind: engvoSessionKind,
                  tense: engvoTeacherTense,
                  sentenceType: engvoTeacherSentenceType,
                  lessonAxis: engvoTeacherLessonAxisRef.current,
                }),`,
    `                instructions: buildEngvoFirstTurnResponseInstructions({
                  audience: settings.audience,
                  level: engvoCefrLevel,
                  topic: settings.topic,
                  kind: engvoSessionKind,
                  tense: resolveTeacherLiveTense() as import('@/lib/types').TenseId,
                  sentenceType: engvoTeacherSentenceType,
                  lessonAxis: engvoTeacherLessonAxisRef.current,
                }),`,
  ],
  [
    `          relayBootstrap: {
            audience: settings.audience,
            level: engvoCefrLevel,
            topic: settings.topic,
            kind: engvoSessionKind,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
            speed: speechSpeedForCall,
            teacherDrillKind: engvoTeacherDrillKind,
            teacherLessonId: engvoTeacherLessonId,
            teacherEffectiveLessonId: engvoTeacherEffectiveLessonIdRef.current,
            sessionSeed: engvoTeacherSessionSeedRef.current,
          },`,
    `          relayBootstrap: {
            audience: settings.audience,
            level: engvoCefrLevel,
            topic: settings.topic,
            kind: engvoSessionKind,
            tense: (ensureTeacherAnyLiveAxes()?.current ?? resolveTeacherLiveTense()) as import('@/lib/types').TenseId,
            sentenceType: engvoTeacherSentenceType,
            speed: speechSpeedForCall,
            teacherDrillKind: engvoTeacherDrillKind,
            teacherLessonId: engvoTeacherLessonId,
            teacherEffectiveLessonId: engvoTeacherEffectiveLessonIdRef.current,
            sessionSeed: engvoTeacherSessionSeedRef.current,
            teacherCurrentTense: engvoTeacherCurrentTenseRef.current,
            teacherNextTense: engvoTeacherNextTenseRef.current,
          },`,
  ],
  [
    `          kind: engvoSessionKind,
          tense: engvoTeacherTense,
          sentenceType: engvoTeacherSentenceType,
          teacherDrillKind: engvoTeacherDrillKind,
          teacherLessonId: engvoTeacherLessonId,
          teacherEffectiveLessonId: engvoTeacherEffectiveLessonIdRef.current,
          sessionSeed: engvoTeacherSessionSeedRef.current,
        }),`,
    `          kind: engvoSessionKind,
          tense: (ensureTeacherAnyLiveAxes()?.current ?? resolveTeacherLiveTense()) as import('@/lib/types').TenseId,
          sentenceType: engvoTeacherSentenceType,
          teacherDrillKind: engvoTeacherDrillKind,
          teacherLessonId: engvoTeacherLessonId,
          teacherEffectiveLessonId: engvoTeacherEffectiveLessonIdRef.current,
          sessionSeed: engvoTeacherSessionSeedRef.current,
          teacherCurrentTense: engvoTeacherCurrentTenseRef.current,
          teacherNextTense: engvoTeacherNextTenseRef.current,
        }),`,
  ],
  [
    `      const instructions = policyUpdate
        ? buildEngvoRealtimeInstructionsClient({
            audience: settings.audience,
            level: payload.level ?? engvoCefrLevel,
            topic: settings.topic,
            speechSpeed,
            kind: engvoSessionKind,
            tense:
              engvoTeacherDrillKind === 'lesson_topic' &&
              engvoTeacherLessonAxisRef.current
                ? engvoTeacherTense
                : engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
            lessonAxis: engvoTeacherLessonAxisRef.current,
          })
        : undefined
      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
          })
        )
      }`,
    `      const liveAny =
        engvoTeacherTense === 'all' && engvoTeacherDrillKind === 'tense_drill'
          ? ensureTeacherAnyLiveAxes()
          : null
      const instructions = policyUpdate
        ? buildEngvoRealtimeInstructionsClient({
            audience: settings.audience,
            level: payload.level ?? engvoCefrLevel,
            topic: settings.topic,
            speechSpeed,
            kind: engvoSessionKind,
            tense: resolveTeacherLiveTense() as import('@/lib/types').TenseId,
            sentenceType: engvoTeacherSentenceType,
            lessonAxis: engvoTeacherLessonAxisRef.current,
            nextTense: liveAny?.next
              ? (liveAny.next as import('@/lib/types').TenseId)
              : null,
          })
        : undefined
      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
            teacherCurrentTense: engvoTeacherCurrentTenseRef.current,
            teacherNextTense: engvoTeacherNextTenseRef.current,
          })
        )
      }`,
  ],
]

for (const [from, to] of pairs) {
  if (!s.includes(from)) {
    console.error('missing block:', from.slice(0, 100))
    process.exit(1)
  }
  s = s.replace(from, to)
}

fs.writeFileSync(p, s)
console.log('OK bootstrap/live tense wires')
