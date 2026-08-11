# Tutor session economy v1

Канон: [`lib/tutor/tutorSessionEconomy.ts`](../lib/tutor/tutorSessionEconomy.ts).  
Wire: [`lib/rewardsEvents.ts`](../lib/rewardsEvents.ts), [`lib/rewardsState.ts`](../lib/rewardsState.ts), футер [`lib/tutor/tutorFooter.ts`](../lib/tutor/tutorFooter.ts).

## Product lock

Репетитор — закрыть вопрос (± закрепить). Не чат, не K-цель сессии.

| Событие | XP | Условие |
|---------|----|---------|
| Explain | +1 | Раз на `canonicalKey` / день; deepen retain / continue того же key = 0 |
| Micro finale | +6 | Любой band; раз на key / день; again = 0 |
| Иное | 0 | triage, gate, OOS, шпаргалка, вход |

Daily cap **14** (только tutor). Сайды 92 → Σ **106**.

## Футер

- Вне micro: compact `⭐totalXP | streak` + TOP (`post_explain`: «Закрепите 2 мин — +6 XP.»; `post_explain_soft` без micro chip: «Уточните или попросите примеры.»).
- В micro: bar вопросов + слева живой `sessionXp` + 🎯/🏁.
- Нет цели сессии K/K.

## Вне скоупа

Soft-gate; hop 3/5; Engvo slice; chrome layout; расширять micro kinds; Готово→MyPlan.

## Handoff

- Soft-gate после того, как +6 реально видно.
- Engvo economy против 92 + tutor **14**.
