'use client'

import React from 'react'

type EngvoVoiceMeterProps = {
  stream: MediaStream | null
  active: boolean
  frozen?: boolean
  ariaLabel?: string
}

const BAR_COUNT = 9
const BAR_PIXEL_MAX = 22
const BASELINE_SCALE = 0.16
const MAX_SCALE = 1
const IDLE_MAX_SCALE = 0.42
const RMS_TO_LEVEL = 5.6

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
}: EngvoVoiceMeterProps) {
  const barsRef = React.useRef<Array<HTMLSpanElement | null>>([])
  const animationFrameRef = React.useRef<number | null>(null)
  const sourceNodeRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserNodeRef = React.useRef<AnalyserNode | null>(null)
  const currentLevelsRef = React.useRef<number[]>(Array(BAR_COUNT).fill(BASELINE_SCALE))
  const idlePhaseRef = React.useRef(0)

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
    }

    stop()

    if (frozen) {
      currentLevelsRef.current = Array(BAR_COUNT).fill(BASELINE_SCALE)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    if (!active) {
      currentLevelsRef.current = Array(BAR_COUNT).fill(BASELINE_SCALE)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    if (!stream) {
      const idleTick = () => {
        idlePhaseRef.current += 0.16
        const nextLevels = new Array<number>(BAR_COUNT)
        const center = (BAR_COUNT - 1) / 2
        for (let i = 0; i < BAR_COUNT; i += 1) {
          const distance = Math.abs(i - center)
          const envelope = Math.max(0.3, 1 - distance * 0.2)
          const pulse = (Math.sin(idlePhaseRef.current + i * 0.45) + 1) * 0.5
          const target = BASELINE_SCALE + pulse * (IDLE_MAX_SCALE - BASELINE_SCALE) * envelope
          const prev = currentLevelsRef.current[i] ?? BASELINE_SCALE
          nextLevels[i] = prev * 0.72 + target * 0.28
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
      currentLevelsRef.current = Array(BAR_COUNT).fill(BASELINE_SCALE)
      animateBars(barsRef, currentLevelsRef.current)
      return stop
    }

    const context = shared.context
    if (context.state === 'suspended') {
      void context.resume().catch(() => {})
    }

    const sourceNode = context.createMediaStreamSource(stream)
    const analyserNode = context.createAnalyser()
    analyserNode.fftSize = 128
    analyserNode.smoothingTimeConstant = 0.42

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
      const boosted = clamp(rms * RMS_TO_LEVEL, 0, 1)

      const nextLevels = new Array<number>(BAR_COUNT)
      const center = (BAR_COUNT - 1) / 2

      for (let barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
        const distance = Math.abs(barIndex - center)
        const envelope = clamp(1 - distance * 0.18, 0.32, 1)
        const microMotion = (Math.sin((performance.now() * 0.012) + barIndex * 0.55) + 1) * 0.5
        const target = clamp(
          BASELINE_SCALE + boosted * 0.95 * envelope + microMotion * 0.03 * envelope,
          BASELINE_SCALE,
          MAX_SCALE
        )
        const prev = currentLevelsRef.current[barIndex] ?? BASELINE_SCALE
        nextLevels[barIndex] = prev * 0.58 + target * 0.42
      }

      currentLevelsRef.current = nextLevels
      animateBars(barsRef, nextLevels)
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
    return stop
  }, [active, frozen, stream])

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
              height: `${Math.max(2, BASELINE_SCALE * BAR_PIXEL_MAX)}px`,
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}
