/**
 * Like vs love — единые формулировки для промптов (чат: диалог + перевод) и для API ru→en.
 * Только текст; логика приложения здесь не меняется.
 */

/** Режим «Перевод» в чате: эталон = русская строка задания + INTERNAL_REFERENCE_ENGLISH при наличии. */
export const LIKE_LOVE_TRANSLATION_TUTOR_BLOCK = `
LIKE vs LOVE — translation training (follow strictly in this app):
- Choose "like" vs "love" by emotional intensity and what the Russian sentence means, not by the fact that Russian used "люблю" alone.
- Neutral "нравится" / mild preference → English "like" (use "enjoy" only if it fits the phrase better). Never strengthen neutral "нравится" to "love".
- Strong bond or passion → "love": close family (mother, father, children, partner), clear passion ("обожаю", obvious strong enthusiasm in the Russian line).
- Russian "люблю" + activity or hobby (cooking, walking, reading, etc.) → default English "like" (e.g. "I like cooking"). Use "love" only if the Russian or context clearly signals passion (e.g. "обожаю", exclamatory tone). Do not demand "love" for plain habit/activity without that cue.
- Pets (dog, cat, etc.): BOTH "I love my dog" and "I like my dog" are correct. Do NOT use ERROR protocol and do NOT give "Повтори:" solely because the learner swapped like↔love for a pet.
- When INTERNAL_REFERENCE_ENGLISH is provided, it is the canonical answer for "Повтори:" when a non-exempt intensity fix is needed. If the ONLY mismatch is like↔love about a pet, treat the learner answer as correct (SUCCESS). For activities, if the reference uses "like" and the learner used "love" without passion support in the Russian task, correct toward the reference; if the Russian clearly supports strong enthusiasm, accepting "love" is OK.
- If grammar is otherwise fine but like/love strength is wrong for a non-exempt case, use ERROR protocol: praise what was right in "Комментарий_перевод:", explain the intensity mismatch briefly, "Повтори:" = canonical English. Exempt: pet-only like/love swaps.
- Never swap like↔love without semantic cause from the Russian prompt (except the pet exemption above, where both are valid).
- Verb pattern after preference verbs: after like/love/hate/prefer both forms are acceptable when meaning is the same: "to + verb" and "verb-ing" (e.g. "I like to watch" = "I like watching"). Do NOT mark this as an error by itself.
- Exception rules: "enjoy" takes gerund only (enjoy doing, not enjoy to do). "want/need/decide" take infinitive only (want to do, need to do, decide to do).

Few-shot (do not print these headings to the learner):
- Task RU: "Мне нравится пить кофе по утрам." Learner: "I love to drink coffee in the morning." → Повтори: I like to drink coffee in the morning; explain нравится = mild preference, not love.
- Task RU: "Я люблю маму." Learner: "I like my mother." → Повтори: I love my mother; explain close family bond calls for love here.
- Task RU: "Я люблю готовить." Learner: "I love cooking." (plain tone, no passion in Russian) → Повтори: I like cooking; explain activity/habit defaults to like unless Russian shows clear passion.
- Task RU: "Я люблю свою собаку." Learner: "I like my dog." → SUCCESS; both like and love are acceptable for pets — no Повтори for like↔love alone.
- Task RU: "Я люблю гулять с собакой." Learner: "I love walking with my dog." (no passion cue in Russian) → Prefer Повтори: I like walking with my dog; the main idea is the activity; like is the default.
`.trim()

/** Режим «Диалог» в чате: эталон = ваша последняя английская реплика. */
export const LIKE_LOVE_DIALOGUE_TUTOR_BLOCK = `
LIKE vs LOVE — dialogue training:
- Anchor: your own last English question/reply. If you used "like", do not require "love" in the learner answer. If you used "love", do not push "like" unless their wording clearly weakens the intended emotion.
- For pets (my dog, my cat, etc.), do not force like↔love — both are natural; never treat only like/love choice as an error.
- If the learner uses "love" where you used "like" and the answer is otherwise grammatically correct and on-topic, ACCEPT it (stronger but same situation): output ONE short "Комментарий:" in Russian noting that love is more expressive (emojis allowed on this line only), then on the next line ONE follow-up question in English. No "Повтори:". This is the only case where a correct answer may include "Комментарий:".
- If both like and love fit the situation, do not force a change.
- Do not treat like/love as an error when only intensity differs and meaning stays true.

Few-shot:
- You asked: "Do you like swimming?" User: "Yes, I love swimming!" → Short Russian praise + next English question; not an error, no Повтори.
`.trim()

/** Краткий абзац для профессионального переводчика ru→en (без протокола Комментарий/Повтори). */
export const LIKE_LOVE_RU_TO_EN_TRANSLATOR_BLOCK =
  'Like vs love: choose by intensity, not by whether Russian says "люблю" alone. Neutral "нравится" → "like" (or "enjoy" when more natural). Never use "love" for neutral "нравится". Russian "люблю" with activities/hobbies/things → usually "like" unless the line clearly signals passion. Close people and clear passion → "love". Pets: both "love" and "like" are fine in English (e.g. my dog/cat). ' +
  '"Would like" is polite wanting; "I would love to" is stronger willingness than "I would like to". '
