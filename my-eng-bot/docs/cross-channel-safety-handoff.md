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

## Статус выполнения (2026-07-30)

| Этап | Commit | Суть |
|---|---|---|
| **P0** | `e856e1b` | Bare translate + `buildAiSafetyRulesBlock` + dual-mode refuse/EN-only + guard |
| **P1** | — (readonly) | Матрица: homework/insult dialogue; NSFW topic_choice teacher; RU paraphrase + HW free_call |
| **P2** | `4ab30aa` | Prompt-фиксы dialogue/teacher/free_call + guards; reclaim/AppShell/tutorGate не трогали |

P2 детали: dialogue homework/insult refuse; teacher unsafe topic naming + drill-not-HW; free_call Safety override на paraphrase, practice-not-homework, child identity без «14+».

---

## Ручной smoke Репетитора (после деплоя)

См. также `docs/tutor-first-hop-handoff.md` smoke 1–10.

Дополнительно: insult how_to_say → local stop; drip сочинения → stop; `а почему дорого Duolingo` при живом PP → не continue; `проверь:` → continue/explain; jailbreak+PP → LLM учит PP; chips после stop при теме живы.
