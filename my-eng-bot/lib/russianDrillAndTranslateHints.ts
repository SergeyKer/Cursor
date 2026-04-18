/**
 * Shared English-language system-prompt fragments for natural Russian output.
 * Used by translation drill (chat) and EN→RU button (/api/translate).
 */

/** Longer guidance for mode === 'translation' Russian drill task line only. */
export const RUSSIAN_TRANSLATION_DRILL_HINTS = `Russian quality for the ONE Russian drill task sentence (the line before "Переведи на английский" / inside "Переведи далее"):
- Prefer natural idiomatic Russian over English calques; keep meaning clear for a learner translating into English with the Required tense.
- If the drill sentence addresses the learner in 2nd person, match CHILD/ADULT from this system prompt: CHILD uses only informal ты/тебе/твой (never вы); ADULT uses only polite вы/вам/ваш (never informal ты). Do not mix registers inside the same sentence.
- Sentence type NEGATIVE: keep clearly readable negation in Russian using explicit markers (не, ни, нет, никогда, ничего, etc.) so the task unambiguously expects negative English; do not use subtle implied negation without such markers.
- Sentence type INTERROGATIVE: a real Russian question ending with ?; natural word order after the question word.
- Sentence type AFFIRMATIVE: declarative, not a question, not negative.
- Duration / Perfect Continuous intent: if the natural English answer needs duration anchors (for/since, lately), reflect comparable time hints in Russian (e.g. уже N …, с … года, в последнее время) without adding facts absent from the drill intent.
- Avoid the typo "не давно" (two words); for a short time span prefer недолго / совсем недолго / пока недолго rather than ambiguous phrasing.`

/** Short add-on for /api/translate EN→RU to limit prompt bloat. */
export const RUSSIAN_EN_TO_RU_SHORT_HINTS = `Natural Russian: prefer idiomatic wording over literal English structure. Map negation naturally (e.g. don't have → у меня нет …). English perfect tenses: choose natural Russian time/aspect, not calques. Questions → natural Russian questions. Match 2nd-person register to audience (ты child / вы adult) consistently. Never write "не давно" for "not long ago" / short duration — use proper spelling and phrasing (недавно vs недолго) by meaning.`
