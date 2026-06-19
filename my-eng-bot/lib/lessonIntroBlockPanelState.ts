export type LessonIntroPanelKind = 'theory' | 'how'

export function resolveIntroPanelToggle(
  openPanel: LessonIntroPanelKind | null,
  target: LessonIntroPanelKind
): LessonIntroPanelKind | null {
  return openPanel === target ? null : target
}
