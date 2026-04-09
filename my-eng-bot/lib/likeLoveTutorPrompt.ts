/**
 * Like vs love — единые формулировки для промптов (чат: диалог + перевод) и для API ru→en.
 * Только текст; логика приложения здесь не меняется.
 */

/** Режим «Перевод» в чате: эталон = русская строка задания + INTERNAL_REFERENCE_ENGLISH при наличии. */
export const LIKE_LOVE_TRANSLATION_TUTOR_BLOCK = `
LIKE vs LOVE — translation training (follow strictly in this app):
- Read the Russian task sentence for intensity. Neutral preference ("нравится", mild liking) → English "like" (use "enjoy" only if it fits the phrase better). Strong bond or enthusiasm ("люблю", "обожаю", family/pets/clear deep feeling) → "love".
- When INTERNAL_REFERENCE_ENGLISH is provided, it is the canonical answer for "Повтори:" for that exercise. If the learner wrote "love" for neutral "нравится", treat as a mistake (ERROR protocol): warm concrete praise in "Комментарий_перевод:", diagnose intensity in "Комментарий:" and/or 📖 Лексика, "Повтори:" = canonical English. If they wrote "like" where Russian clearly demands strong "люблю", same — correct toward "love".
- Never swap like↔love without semantic cause from the Russian prompt.
- If grammar is otherwise fine but only like/love strength is wrong, still use ERROR protocol; praise what was right in "Комментарий_перевод:", explain the intensity mismatch briefly.

Few-shot (do not print these headings to the learner):
- Task RU: "Мне нравится пить кофе по утрам." Learner: "I love to drink coffee in the morning." → Повтори: I like to drink coffee in the morning; explain нравится = mild preference, love = much stronger.
- Task RU: "Я люблю свою собаку." Learner: "I like my dog." → Повтори: I love my dog; explain люблю here calls for love, like is too weak.
`.trim()

/** Режим «Диалог» в чате: эталон = ваша последняя английская реплика. */
export const LIKE_LOVE_DIALOGUE_TUTOR_BLOCK = `
LIKE vs LOVE — dialogue training:
- Anchor: your own last English question/reply. If you used "like", do not require "love" in the learner answer. If you used "love", do not push "like" unless their wording clearly weakens the intended emotion.
- If the learner uses "love" where you used "like" and the answer is otherwise grammatically correct and on-topic, ACCEPT it (stronger but same situation): output ONE short "Комментарий:" in Russian noting that love is more expressive (emojis allowed on this line only), then on the next line ONE follow-up question in English. No "Повтори:". This is the only case where a correct answer may include "Комментарий:".
- If both like and love fit the situation, do not force a change.
- Do not treat like/love as an error when only intensity differs and meaning stays true.

Few-shot:
- You asked: "Do you like swimming?" User: "Yes, I love swimming!" → Short Russian praise + next English question; not an error, no Повтори.
`.trim()

/** Краткий абзац для профессионального переводчика ru→en (без протокола Комментарий/Повтори). */
export const LIKE_LOVE_RU_TO_EN_TRANSLATOR_BLOCK =
  'Like vs love: match Russian strength. Neutral "нравится" / ordinary preference → "like" (or "enjoy" when more natural in English). Emotional "люблю", "обожаю", deep attachment (people, pets) or clearly strong enthusiasm → "love". Do not use "love" for neutral "нравится". Do not flatten strong "люблю" to weak "like" when the source is clearly emotional. ' +
  '"Would like" is polite wanting; "I would love to" is stronger willingness than "I would like to". '
