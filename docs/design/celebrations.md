# «احتفالاتي» — celebrations history (feat/a)

Board: Rewards (احتفالاتي list: title, date, delta). Route `/joy/celebrations`, entered from مكافآتي («احتفالاتي» row).

## Purpose
A calm place to look back. Derived, no new storage: finished milestones (`doneDate`), comebacks (spark txns), closed chapters (weekly reviews),
finished experiments. Each row: title, date, small delta (sparks, or «بعد غياب n أيام»).

## Layout
Hero summary (the only decorative star + the newest entry's star = max 2 stars on the screen): «عندك N لحظات تستاهل» + the three kind counts.
Then month groups (`InsetGroupedList`, header = «أكتوبر 2026»). Rows use a quiet kind glyph in a tinted tile (flag-like check / return arrow / book / flask-free
"insights" glyph), not stars. Never more than 3 stars.

## Copy
Milestone «خلّصتي «…»» · comeback «رجعتي لـ «…»» + «بعد غياب يومين» · chapter «الفصل 3 · title» · experiment «جرّبتي «…» وأثبتّيها / رجّعتي القديم».

## States
empty: «لسا ما فيه احتفالات — أول رجعة أو معلم تخلصينه يظهر هنا» (EmptyState) · normal · edge: entries with no title (comeback of a deleted habit → «رجعتي لعادة») · long list: grouped, no pagination needed.

## a11y / motion
Rows are plain list items (`role=list`), 44pt+; dates in `<bdi>`; reduced motion respected (no entrance animation on rows; only the hero fades).
