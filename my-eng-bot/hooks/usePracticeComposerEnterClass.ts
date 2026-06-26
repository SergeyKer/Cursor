'use client'

import { useRef } from 'react'
import {
  resolvePracticeComposerEnterClassOnce,
  type PracticeComposerEnterClassOptions,
  type PracticeComposerEnterOnceState,
} from '@/lib/practice/practiceComposerEnter'

const initialEnterOnceState: PracticeComposerEnterOnceState = {
  questionId: '',
  consumed: false,
}

export function usePracticeComposerEnterClass(
  questionId: string,
  options: PracticeComposerEnterClassOptions
): string {
  const stateRef = useRef<PracticeComposerEnterOnceState>(initialEnterOnceState)
  const resolved = resolvePracticeComposerEnterClassOnce(stateRef.current, questionId, options)
  stateRef.current = resolved.next
  return resolved.enterClass
}
