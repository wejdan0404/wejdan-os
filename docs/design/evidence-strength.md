# Evidence — strength filter and «أضيفيها لعاداتي»

Purpose: filter the existing library by evidence strength (data field evidence_strength: Guideline, SR/MA, RCT, Observational, Expert consensus) and add a habit from an evidence entry.
No new claims: labels are the existing field values in Arabic; explainer sentences are definitions of study types only.

Filter: chips row (all + 5 strengths, ordered strongest first, with counts), single-select, composes with search. Row subtitle shows «{قوة الدليل} · {n} مصادر».
Add: button in the detail sheet, only for entries whose app type is Habit / Routine step / Weekly task? -> Habit and Routine step only. Creates one habit (id h_ev_<actionId>, idempotent) through store.upsertHabit via the domain builder, wakes the domain respecting the cap (existing sheet), toast «انضافت لعاداتك» with «تراجع» (deletes the new habit). Already-added entries show a disabled «موجودة بعاداتك».
States: empty filter result; sensitive entries hidden as before; error path = toast.
Tokens: Chip, Sheet, Button. RTL, 44pt, scale 2.0 (chips wrap).
