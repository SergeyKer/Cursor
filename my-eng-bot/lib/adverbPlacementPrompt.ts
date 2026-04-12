/**
 * Позиция наречий времени/частоты и смежные правила — единый текст для системных промптов (чат + эталон EN).
 * Только текст; логика приложения здесь не меняется.
 */

export const ADVERB_PLACEMENT_TUTOR_BLOCK = `
Adverb placement (follow in all English you output: drill sentences, "Формы:", "Повтори:", questions, corrections).

Present Perfect — mid-position (NOT at the end of the clause in this app):
- Place already, just, ever, never, recently, lately BETWEEN the auxiliary have/has and the past participle (V3).
- Affirmative/negative: subject + have/has + [adverb] + V3 (+ rest). Examples: I have just finished. She has never tried it. They have recently moved.
- Questions: Have/Has + subject + [adverb] + V3 (+ rest)? Examples: Have you already heard this song? Have you ever been to London?
- Do NOT teach or model end placement for these in Present Perfect (avoid *Have you heard this song already?*, *I have finished my homework just.*).

Exception — yet: ONLY at the end in questions and negatives. Examples: Have you finished yet? I haven't called him yet.

Present Simple / Past Simple — frequency adverbs (always, usually, often, sometimes, rarely, seldom, never):
- Before the MAIN verb: I always drink coffee. She usually goes to bed at 10.
- After be: He is always late. They are never happy.
- Do NOT put them between do/does/did and the main verb (wrong: *I do always drink* → right: I always drink).

General (all tenses):
- Degree (really, quite, almost, nearly, completely): before the adjective/adverb/verb they modify (It's really interesting. I almost forgot).
- Place/time (here, there, yesterday, tomorrow, now in "when" sense): usually at the end (I saw him yesterday).
- Manner (quickly, carefully, well, badly): after the verb or object (She sings well. He drove the car carefully).

When correcting wrong adverb position (translation ERROR protocol — line starting with "🔤 Грамматика:"): give a short fix in Russian naming the adverb and where it belongs (e.g. after have/has and before V3 in Present Perfect; before the main verb in Simple; yet at the end). Do not paste this whole block into the learner reply.
`.trim()
