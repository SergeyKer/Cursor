/** Split a byte stream into even-length PCM16 frames; keep a trailing odd byte. */
export function takeEvenPcmFrames(
  pending: Uint8Array<ArrayBufferLike>,
  incoming: Uint8Array<ArrayBufferLike>
): { frames: Uint8Array<ArrayBufferLike>; rest: Uint8Array<ArrayBufferLike> } {
  const merged = new Uint8Array(pending.length + incoming.length)
  merged.set(pending, 0)
  merged.set(incoming, pending.length)
  const even = merged.length - (merged.length % 2)
  if (even === 0) {
    return { frames: new Uint8Array(0), rest: merged }
  }
  if (even === merged.length) {
    return { frames: merged, rest: new Uint8Array(0) }
  }
  return { frames: merged.subarray(0, even), rest: merged.subarray(even) }
}

export function concatUint8(chunks: readonly Uint8Array<ArrayBufferLike>[]): ArrayBuffer {
  let total = 0
  for (const chunk of chunks) total += chunk.byteLength
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out.buffer
}
