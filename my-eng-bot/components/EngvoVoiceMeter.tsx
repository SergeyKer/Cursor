'use client'

import React from 'react'

type EngvoVoiceMeterRole = 'user' | 'assistant'
type IdleAnimation = 'wave' | 'semiRandom'

type EngvoVoiceMeterProps = {
  stream: MediaStream | null
  active: boolean
  frozen?: boolean
  ariaLabel?: string
  /** user - микрофон (AGC сжимает сигнал); assistant - удалённый поток Engvo. */
  role?: EngvoVoiceMeterRole
  /** Анимация без аудиопотока: wave — связанная волна; semiRandom — независимые столбцы с random targets. */
  idleAnimation?: IdleAnimation
}

const BAR_COUNT = 9
const BAR_PIXEL_MAX = 22
const MAX_SCALE = 1
const IDLE_MAX_SCALE = 0.42
const SEMI_RANDOM_MAX_SCALE = 0.68
const SEMI_RANDOM_ATTACK = 0.42
const SEMI_RANDOM_RELEASE = 0.18
const SEMI_RANDOM_RETARGET_MIN_MS = 90
const SEMI_RANDOM_RETARGET_MAX_MS = 220
const SEMI_RANDOM_SETTLE_BLEND = 0.32
const SEMI_RANDOM_SETTLE_EPSILON = 0.01
const SEMI_RANDOM_EDGE_BAR_HEIGHT_FACTOR = 0.5

type BarEq = { target: number; nextRetargetAt: number }

function semiRandomMaxScaleForBar(baselineScale: number, barIndex: number): number {
  const isEdge = barIndex === 0 || barIndex === BAR_COUNT - 1
  const range = SEMI_RANDOM_MAX_SCALE - baselineScale
  return baselineScale + range * (isEdge ? SEMI_RANDOM_EDGE_BAR_HEIGHT_FACTOR : 1)
}

function randomSemiRandomTarget(baselineScale: number, barIndex: number): number {
  const maxScale = semiRandomMaxScaleForBar(baselineScale, barIndex)
  return baselineScale + Math.random() * (maxScale - baselineScale)
}

function randomRetargetDelayMs(): number {
  return (
    SEMI_RANDOM_RETARGET_MIN_MS
    + Math.random() * (SEMI_RANDOM_RETARGET_MAX_MS - SEMI_RANDOM_RETARGET_MIN_MS)
  )
}

function createBarEqStates(baselineScale: number): BarEq[] {
  const now = performance.now()
  return Array.from({ length: BAR_COUNT }, (_, barIndex) => ({
    target: randomSemiRandomTarget(baselineScale, barIndex),
    nextRetargetAt: now + randomRetargetDelayMs(),
  }))
}

const METER_TUNING: Record<
  EngvoVoiceMeterRole,
  {
    baselineScale: number
    rmsToLevel: number
    analyserSmoothing: number
    levelAttack: number
    voiceEnvelope: number
  }
> = {
  user: {
    baselineScale: 0.08,
    rmsToLevel: 14,
    analyserSmoothing: 0.28,
    levelAttack: 0.52,
    voiceEnvelope: 1,
  },
  assistant: {
    baselineScale: 0.16,
    rmsToLevel: 5.6,
    analyserSmoothing: 0.42,
    levelAttack: 0.42,
    voiceEnvelope: 0.95,
  },
}

type SharedAudioState = {
  context: AudioContext
}

function getSharedAudioState(): SharedAudioState | null {
  if (typeof window === 'undefined') return null
  const win = window as Window & { __myEngEngvoAudioState?: SharedAudioState }
  if (win.__myEngEngvoAudioState) return win.__myEngEngvoAudioState
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  const state: SharedAudioState = { context: new AudioContextCtor() }
  win.__myEngEngvoAudioState = state
  return state
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function animateBars(barNodesRef: React.MutableRefObject<Array<HTMLSpanElement | null>>, levels: number[]) {
  for (let index = 0; index < BAR_COUNT; index += 1) {
    const bar = barNodesRef.current[index]
    if (!bar) continue
    const h = Math.max(2, levels[index] * BAR_PIXEL_MAX)
    bar.style.height = `${h}px`
  }
}

export default function EngvoVoiceMeter({
  stream,
  active,
  frozen = false,
  ariaLabel = 'Индикатор голоса',
  role = 'assistant',
  idleAnimation = 'wave',
}: EngvoVoiceMeterProps) {
  const tuning = METER_TUNING[role]
  const baselineScale = tuning.baselineScale
  const levelDecay = 1 - tuning.levelAttack

  const barsRef = React.useRef<Array<HTMLSpanElement | null>>([])
  const animationFrameRef = React.useRef<number | null>(null)
  const sourceNodeRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserNodeRef = React.useRef<AnalyserNode | null>(null)
  const currentLevelsRef = React.useRef<number[]>(Array(BAR_COUNT).fill(baselineScale))
  const idlePhaseRef = React.useRef(0)
  const barEqRef = React.useRef<BarEq[] | null>(null)

  React.useEffect(() => {
    const stop = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect()
        analyserNodeRef.current = null
      }
      barEqRef.current = null
    }

    stop()

    if (frozen) {
      barEqRef.current = null

      const shouldSettle =
        idleAnimation === 'semiRandom'
        && !stream
        && currentLevelsRef.current.some((level) => level > baselineScale + SEMI_RANDOM_SETTLE_EPSILON)

      if (shouldSettle) {
        const settleTick = () => {
          const nextLevels = new Array<number>(BAR_COUNT)
          let allSettled = true
          for (let i = 0; i < BAR_COUNT; i += 1) {
            const prev = currentLevelsRef.current[i] ?? baselineScale
            if (prev > baselineScale + SEMI_RANDOM_SETTLE_EPSILON) {
              allSettled = false
              nextLevels[i] = prev * (1 - SEMI_RANDOM_SETTLE_BLEND) + baselineScale * SEMI_RANDOM_SETTLE_BLEND
            } else {
              nextLevels[i] = baselineScale
            }
          }
          currentLevelsRef.current = nextLevels
          animateBars(barsRef, nextLevels)
          if (!allSettled) {
            animationFrameRef.current = window.requestAnimationFrame(settleTick)
          } else {
            animationFrameRef.current = null
          }
        }
        animationFrameRef.current = window.requestAnimationFrame(settleTick)
        return stop
      }

      currentLevelsRef.current = Array(BAR_COUNT).fill(baselineScale)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    if (!active) {
      currentLevelsRef.current = Array(BAR_COUNT).fill(baselineScale)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    if (!stream) {
      const idleTick = () => {
        const nextLevels = new Array<number>(BAR_COUNT)

        if (idleAnimation === 'semiRandom') {
          if (!barEqRef.current) {
            barEqRef.current = createBarEqStates(baselineScale)
          }
          const barEq = barEqRef.current
          const now = performance.now()
          for (let i = 0; i < BAR_COUNT; i += 1) {
            const bar = barEq[i]
            if (now >= bar.nextRetargetAt) {
              bar.target = randomSemiRandomTarget(baselineScale, i)
              bar.nextRetargetAt = now + randomRetargetDelayMs()
            }
            const prev = currentLevelsRef.current[i] ?? baselineScale
            const blend = bar.target > prev ? SEMI_RANDOM_ATTACK : SEMI_RANDOM_RELEASE
            nextLevels[i] = prev * (1 - blend) + bar.target * blend
          }
        } else {
          idlePhaseRef.current += 0.16
          const center = (BAR_COUNT - 1) / 2
          for (let i = 0; i < BAR_COUNT; i += 1) {
            const distance = Math.abs(i - center)
            const envelope = Math.max(0.3, 1 - distance * 0.2)
            const pulse = (Math.sin(idlePhaseRef.current + i * 0.45) + 1) * 0.5
            const target = baselineScale + pulse * (IDLE_MAX_SCALE - baselineScale) * envelope
            const prev = currentLevelsRef.current[i] ?? baselineScale
            nextLevels[i] = prev * 0.72 + target * 0.28
          }
        }

        currentLevelsRef.current = nextLevels
        animateBars(barsRef, nextLevels)
        animationFrameRef.current = window.requestAnimationFrame(idleTick)
      }
      animationFrameRef.current = window.requestAnimationFrame(idleTick)
      return stop
    }

    const shared = getSharedAudioState()
    if (!shared) {
      currentLevelsRef.current = Array(BAR_COUNT).fill(baselineScale)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    const context = shared.context
    if (context.state === 'suspended') {
      void context.resume().catch(() => {})
    }

    let sourceNode: MediaStreamAudioSourceNode
    try {
      sourceNode = context.createMediaStreamSource(stream)
    } catch {
      currentLevelsRef.current = Array(BAR_COUNT).fill(baselineScale)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    const analyserNode = context.createAnalyser()
    analyserNode.fftSize = 128
    analyserNode.smoothingTimeConstant = tuning.analyserSmoothing

    sourceNode.connect(analyserNode)
    sourceNodeRef.current = sourceNode
    analyserNodeRef.current = analyserNode

    const timeDomainData = new Uint8Array(analyserNode.fftSize)

    const tick = () => {
      analyserNode.getByteTimeDomainData(timeDomainData)

      let energy = 0
      for (let i = 0; i < timeDomainData.length; i += 1) {
        const centered = (timeDomainData[i] - 128) / 128
        energy += centered * centered
      }
      const rms = Math.sqrt(energy / timeDomainData.length)
      const boosted = clamp(rms * tuning.rmsToLevel, 0, 1)

      const nextLevels = new Array<number>(BAR_COUNT)
      const center = (BAR_COUNT - 1) / 2

      for (let barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
        const distance = Math.abs(barIndex - center)
        const envelope = clamp(1 - distance * 0.18, 0.32, 1)
        const microMotion = (Math.sin((performance.now() * 0.012) + barIndex * 0.55) + 1) * 0.5
        const target = clamp(
          baselineScale + boosted * tuning.voiceEnvelope * envelope + microMotion * 0.03 * envelope,
          baselineScale,
          MAX_SCALE
        )
        const prev = currentLevelsRef.current[barIndex] ?? baselineScale
        nextLevels[barIndex] = prev * levelDecay + target * tuning.levelAttack
      }

      currentLevelsRef.current = nextLevels
      animateBars(barsRef, nextLevels)
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
    return stop
  }, [active, baselineScale, frozen, idleAnimation, levelDecay, role, stream, tuning])

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="flex w-full min-w-0 items-center justify-center overflow-hidden"
    >
      <div className="flex h-[22px] w-full items-end justify-center gap-[4px]">
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <span
            key={index}
            ref={(element) => {
              barsRef.current[index] = element
            }}
            className="w-[4px] shrink-0 rounded-none bg-[#6b8ef6]"
            style={{
              height: `${Math.max(2, baselineScale * BAR_PIXEL_MAX)}px`,
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}
