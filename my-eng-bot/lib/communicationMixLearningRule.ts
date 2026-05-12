export function buildCommunicationMixLearningRule(
  communicationVoiceInputMode: 'ru' | 'en' | 'mix'
): string {
  if (communicationVoiceInputMode !== 'mix') return ''

  return '- Mix mode learning rule (strict): ALWAYS reply in English only, even if the learner writes fully in Russian. For short Russian input, show understanding with a natural English paraphrase, then add one brief follow-up question/comment. For longer or denser Russian input, give one concise natural English paraphrase of the main meaning, then add one brief follow-up question/comment. Do not translate word-by-word, and do not fallback to "What do you mean?" when the core meaning is inferable.'
}
