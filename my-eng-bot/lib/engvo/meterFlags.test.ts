import { describe, expect, it } from 'vitest'
import { resolveEngvoMeterFlags } from './meterFlags'

const fakeStream = {} as MediaStream

describe('resolveEngvoMeterFlags', () => {
  it('shows light idle AI meter while waiting with remote stream but no playback', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'assistantPending',
        remoteStream: fakeStream,
        remotePlaybackActive: false,
      })
    ).toEqual({
      aiMeterStream: null,
      aiMeterActive: true,
      userMeterActive: false,
    })
  })

  it('uses live remote stream when playback is active', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'assistantSpeaking',
        remoteStream: fakeStream,
        remotePlaybackActive: true,
      })
    ).toEqual({
      aiMeterStream: fakeStream,
      aiMeterActive: true,
      userMeterActive: false,
    })
  })

  it('shows light idle AI meter on user turn without attaching remote stream', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'listening',
        remoteStream: fakeStream,
        remotePlaybackActive: false,
      })
    ).toEqual({
      aiMeterStream: null,
      aiMeterActive: true,
      userMeterActive: true,
    })
  })

  it('enables user meter while connecting and keeps AI meter off', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'connecting',
        remoteStream: null,
        remotePlaybackActive: false,
      })
    ).toEqual({
      aiMeterStream: null,
      aiMeterActive: false,
      userMeterActive: true,
    })
  })

  it('idles softly on assistantSpeaking without playback (no empty-stream analyser)', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'assistantSpeaking',
        remoteStream: fakeStream,
        remotePlaybackActive: false,
      })
    ).toEqual({
      aiMeterStream: null,
      aiMeterActive: true,
      userMeterActive: false,
    })
  })

  it('keeps mic meter on when phase is listening even if AI playback still active', () => {
    expect(
      resolveEngvoMeterFlags({
        phase: 'listening',
        remoteStream: fakeStream,
        remotePlaybackActive: true,
      })
    ).toEqual({
      aiMeterStream: fakeStream,
      aiMeterActive: true,
      userMeterActive: true,
    })
  })
})
