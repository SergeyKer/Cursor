/** Сброс inflight-состояния tutor-урока только если запрос ещё актуален. */
export function shouldFinalizeTutorLessonOpen(
  requestId: number,
  currentOpenRequestId: number
): boolean {
  return requestId === currentOpenRequestId
}
