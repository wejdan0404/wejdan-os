# Design tokens

## Semantic colors

نستخدم أسماء دلالية لا ألوانًا مباشرة داخل الشاشات: `canvas`, `surface`, `surfaceSecondary`, `textPrimary`, `textSecondary`, `caption`, `border`, `accent`, `accentText`, `success`, `warning`, `critical`, `focus`.

قيم Calm Sky الأولية: canvas `#F4F7FC`، surface `#FFFFFF`، secondary `#EAF1FB`، accent `#6172B5`، accentStrong `#4F5FA0`، text `#2B3358`، darkCanvas `#0E121C`، border `#DCE3EF`. تحفظ في Asset Catalog بنسختي Light وDark، ولا تُكتب hex داخل View.

## Typography and layout

- SF Pro للنصوص اللاتينية، وخط عربي متوافق مع Dynamic Type بعد اعتماده في Xcode.
- استخدم أدوار SwiftUI الدلالية مثل `.body`, `.headline`, `.title2`, `.caption`.
- شبكة المسافات: 8، 16، 24، 32.
- هوامش المحتوى: 16–20 نقطة.
- الحد الأدنى لكل هدف لمس: 44×44 نقطة.
- التزم بالـ safe areas ولوحة المفاتيح.

## Motion and feedback

الانتقالات قصيرة ومفيدة، مع دعم Reduce Motion. الاهتزاز خفيف ويؤكد الإكمال أو الخطأ فقط. لا تستخدم حركة مستمرة أو تقدمًا مضللًا.

## SwiftUI mapping

`TabView`، `NavigationStack`، `.sheet`، `.confirmationDialog`، `.alert`، `.swipeActions`، `ContentUnavailableView`، `#Preview`، وواجهات الوصول الدلالية (`accessibilityLabel`, `value`, `hint`).
