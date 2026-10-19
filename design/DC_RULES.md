# Design canvas artboard rules (.dc.html) — condensed, MUST follow

Each artboard = one file `project/<Name>.dc.html` (write under /tmp/claude-0/-home-claude/49b59e3e-4b4c-556a-8d1b-6d898ff3199b/scratchpad/design/project/). Write each file DIRECTLY with the Write tool (no scripts generating files).

Skeleton (keep head line EXACTLY):
```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>Today</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif;background:#F4F7FC;color:#0E121C}
a{color:#4F5FA0}a:hover{color:#2B3358}
</style>
</helmet>
<div style="width: 390px; height: 844px; ...root with FIXED size = board w/h ...">
 ...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
renderVals() { return { }; }
}
</script>
</body>
</html>
```

Rules that fail silently if broken:
- Root element has FIXED width/height equal to the board size, and `$preview` equals it.
- Close every non-void element; quote every attribute. No self-closing custom tags.
- `{{hole}}` = dotted lookup into renderVals() only; never expressions.
- Always include the `<script type="text/x-dc" data-dc-script>` block, classic JS `class Component extends DCLogic`, no imports.
- All UI is markup; never build DOM in script (no innerHTML/appendChild).
- Loops: `<sc-for list="{{items}}" as="item" hint-placeholder-count="3">…{{item.title}}…</sc-for>`; branches: `<sc-if value="{{flag}}" hint-placeholder-val="{{true}}">…</sc-if>`.
- Events: `onClick="{{pick}}"` where pick is a function from renderVals(); per-item handler: map items to add `pick: () => this.setState({...})`. State via this.state / this.setState (init in constructor or `state = {...}` class field is NOT allowed? -> use `constructor(props){super(props); this.state={...};}`).
- Links between artboards: `<a href="Focus.dc.html" style="...button look...">ابدئي</a>` (style the <a> itself; no <button> inside <a>).
- Layout with flex/grid + gap. Grid: `display:grid;grid-template-columns:repeat(N, minmax(0, 1fr));gap:..`.
- Inline `style="…"` for design; `<helmet><style>` only for body basics and a/a:hover colors.
- No network except the Google Fonts link above. No emoji (use inline stroke SVG icons, stroke="currentColor", 1.75 width, 24 viewBox). No iframe/object/embed. No global keydown handlers.
- `data-props` single-quoted JSON; only a few tweak levers (e.g., {"dark":{"editor":"boolean","default":false}}) or none. Copy stays literal markup.
- Real `<button>`, `<a href>`, `<input>`+`<label>`; aria-label on icon-only buttons. Touch targets ≥44px. Text ≥12px. Contrast AA (caption text #5A6478 minimum on light bg; on dark bg use #B8C2D9 or lighter).
- No fake iOS status bar. No lorem ipsum, no invented stats. Sample data must be plausible and labelled "عيّنة" subtly where it looks like real metrics (a tiny 11–12px chip "عيّنة" in the header corner is enough).
- Arabic text: no letter-spacing. Western digits 0-9. RTL: `dir="rtl"` on <html>; mirror rows naturally (flex in RTL already starts at right). Keep LTR data (times like 07:30, numbers) readable; wrap mixed Latin tokens with `<bdi>` if needed.
