/**
 * Queue entry for future LocalExplainPack generation/save.
 * Pending stubs must NOT be wired into lookup / GOLDEN_PATH.
 */
export type ExplainPackStubStatus = 'pending' | 'generated' | 'saved'

export type ExplainPackStub = {
  packId: string
  faqIds: readonly string[]
  /** New canon + old labels + short EN for matchQueries when saved. */
  matchQueries: readonly string[]
  /** [wrong, correct] — same order as live contrastPair hints. */
  contrastPairHint: readonly [string, string]
  status: ExplainPackStubStatus
}

export function listPendingExplainPackStubs(
  stubs: readonly ExplainPackStub[]
): readonly ExplainPackStub[] {
  return stubs.filter((s) => s.status === 'pending')
}
