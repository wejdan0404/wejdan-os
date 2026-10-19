# Component contracts

كل مكوّن يملك حالات: عادي، محدد، مضغوط، معطل، تحميل، نجاح، خطأ، نص طويل، Dynamic Type كبير، Dark، وRTL/LTR.

| Figma component | SwiftUI target | العقد الأساسي |
|---|---|---|
| Button | `WJButton` | label، role، loading، disabled، action، minimum 44pt |
| Card | `WJCard` | title، content، emphasis، tap action، semantic surface |
| List row | `WJListRow` | label، value، accessory، VoiceOver order |
| Section header | `WJSectionHeader` | title، optional action |
| Tab item | `WJTabItem` | icon، label، selected state، badge غير ملح |
| Progress ring | `WJProgressRing` | value، label نصي، لا يعتمد اللون وحده |
| Habit control | `WJHabitCompletion` | minimum/normal/extra، undo window، haptic |
| Energy selector | `WJEnergySelector` | accessible labels، low-energy behavior |
| Segmented control | `WJSegmentedControl` | selection، keyboard/VoiceOver |
| Empty/Error state | `WJStateView` | reason، next action، retry/offline |
| Permission prompt | `WJPermissionPrompt` | benefit، allow/later، settings path |
| Confirmation | native dialog | destructive copy، cancel، confirmation |
| Notification preview | `WJNotificationPreview` | time، quiet hours، skip/snooze |
| Privacy notice | `WJPrivacyNotice` | data use، export، delete، local/cloud status |
| Theme preview | `WJThemePreview` | mode، palette، cards، live preview |

يجب أن يطابق كل Variant في Figma enum أو style واضحًا في SwiftUI، مع توثيق ذلك في handoff.
