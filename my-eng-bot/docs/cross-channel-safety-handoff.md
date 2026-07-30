# Cross-channel safety handoff (после hardening Репетитора)

## Что сделано в Репетиторе

Детерминированный hardening ветки **Репетитор** (не чат-бот):

| Слой | Файлы |
|---|---|
| Copy stop-сообщений | `lib/uiCopy/tutorChat.ts` (`gateHomeworkDump`, `gateInsultTeach`, `gateEntertainment`, `gatePersonaMeta`, `gateProductParent`) |
| Hard-stop до intent bypass | `lib/tutor/tutorGate.ts` (+ reasons `insult_teach`, `product_parent`) |
| Hop2 continue/noise | `lib/tutor/tutorTurnRouter.ts` |
| Pending B/C не обходит gate | `components/tutor/TutorChatPanel.tsx` |
| Product-блок LLM | `app/api/tutor-explain/route.ts` |
| Тесты | `lib/tutor/tutorGate.test.ts`, `tutorTurnRouter.test.ts`, `app/api/tutor-explain/productBlock.guards.test.ts` |

**Не трогали:** AppShell, `app/api/chat/route.ts`, teacher/free_call prompts, `safetyPolicy` markers.

Jailbreak **намеренно** не в local hard-stop (иначе ломается mixed «игнорируй + объясни Present Perfect»).

---

## Аудит других каналов (readonly)

Общий фон: `buildAiSafetyRulesBlock` = prompt-only; Moderation API нет.

| Канал | vs tutor | Главное |
|---|---|---|
| **Общение (communication)** | HIGHER | Open chat; **bare translate** в `app/api/chat/route.ts` (~`explicitTranslateTarget`) — system только «Translate…» **без** safety |
| **Перевод** | = общение | Тот же translate-only path |
| **Диалог** | mixed | Local stop ≈ low-signal; нет tutor thematic gate; locked topic лучше по drift |
| **Преподаватель** | LOWER | Drill + rhythm lock; дыра: NSFW как `topic_choice` |
| **Свободный звонок** | HIGHER drift | Practice partner; RU→EN coaching может перефразировать сомнительное |

**Не копировать** `matchTutorGate` в voice один в один.

---

## Промпт-задание для нового чата

```
Контекст: в my-eng-bot закрыт стресс-hardening Репетитора (tutorGate/tutorTurnRouter/TutorChatPanel pending-gate/tutor-explain). Не трогай tutor без нужды.

Задача: hardening других каналов, KISS, без порта matchTutorGate в voice.

P0 — Общение/перевод:
В app/api/chat/route.ts ветка communication && explicitTranslateTarget (~7179): system сейчас только Translate без buildAiSafetyRulesBlock. Добавь safety (channel communication, audience) + refuse 18+/harm/jailbreak; иначе только EN. Не ломай учебный translate. Guard-тест на safety в translate path.

P1 — сначала прогон без правок:
dialogue locked+free_talk; teacher topic_choice; free_call RU paraphrase/homework/persona/child.
Матрица T/C/D/L/H → потом тонкий план.

P2 — точечные фиксы по прогону (отдельные PR):
dialogue узкий refuse homework/off-topic; teacher отказ NSFW topic_choice до lock; free_call 1–2 строки practice-not-homework + child free_talk.

Non-negotiables: AppShell UTF-8; не SERVICE_ROLE; не ломать drill reclaim / topicRetention; не монолит всех каналов в одном PR.
```

---

## Ручной smoke Репетитора (после деплоя)

См. также `docs/tutor-first-hop-handoff.md` smoke 1–10.

Дополнительно: insult how_to_say → local stop; drip сочинения → stop; `а почему дорого Duolingo` при живом PP → не continue; `проверь:` → continue/explain; jailbreak+PP → LLM учит PP; chips после stop при теме живы.
