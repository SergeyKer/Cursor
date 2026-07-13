/** Детерминированный shuffle опций для SSR/hydration parity. */

function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleOptionsDeterministic(
  options: readonly [string, string, string],
  correctIndex: 0 | 1 | 2,
  seedKey: string
): { options: [string, string, string]; correctIndex: 0 | 1 | 2 } {
  const indexed = options.map((text, index) => ({ text, index }))
  const rand = mulberry32(hashSeed(seedKey))
  for (let i = indexed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = indexed[i]!
    indexed[i] = indexed[j]!
    indexed[j] = tmp
  }
  const nextOptions = indexed.map((item) => item.text) as [string, string, string]
  const nextCorrect = indexed.findIndex((item) => item.index === correctIndex)
  return {
    options: nextOptions,
    correctIndex: nextCorrect as 0 | 1 | 2,
  }
}
