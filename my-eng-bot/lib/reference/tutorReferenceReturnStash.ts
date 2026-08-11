/**
 * In-memory stash: reference hub miss → tutor space → return to hub + query.
 * Separate from tutorReturnContext (cheatsheet). Not persisted.
 */

export type TutorReferenceReturnStash = {
  searchQuery: string
}

let stash: TutorReferenceReturnStash | null = null

export function setTutorReferenceReturnStash(next: TutorReferenceReturnStash | null): void {
  if (!next) {
    stash = null
    return
  }
  const q = next.searchQuery.trim()
  stash = { searchQuery: q }
}

export function peekTutorReferenceReturnStash(): TutorReferenceReturnStash | null {
  return stash
}

/** Read and clear. */
export function takeTutorReferenceReturnStash(): TutorReferenceReturnStash | null {
  const current = stash
  stash = null
  return current
}

export function clearTutorReferenceReturnStash(): void {
  stash = null
}

/** Test helper. */
export function clearTutorReferenceReturnStashForTests(): void {
  stash = null
}
