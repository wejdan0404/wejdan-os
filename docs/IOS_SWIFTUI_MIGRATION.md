# iPhone SwiftUI migration

## القرار

SwiftUI هو التنفيذ الأساسي لنسخة iPhone. مشروع Flutter الحالي مرجع للمحتوى والمنطق والرحلات، وليس واجهة يجب نسخها آليًا. Android والويب يأتِيان بعد قبول تجربة iPhone.

## ما يعاد استخدامه

- تعريفات المحتوى والنسخ العربية والإنجليزية.
- نماذج المجال التي لا ترتبط بـFlutter.
- قرارات المنتج والرحلات وحالات الاختبار.
- بيانات اختبار محلية قابلة لإعادة البناء.

## ما يعاد بناؤه

- التنقل والواجهات والمكونات في SwiftUI.
- التخزين المحلي عبر SwiftData أو طبقة واضحة قابلة للاستبدال.
- UserNotifications، LocalAuthentication، الوصول، Dynamic Type، Light/Dark.
- Asset Catalog للألوان الدلالية وSF Symbols.

## ترتيب Mac/Xcode

1. إنشاء مشروع iOS SwiftUI على Mac، وتثبيت deployment target والأجهزة المدعومة.
2. إدخال tokens و`WJ*` component contracts.
3. بناء Tab shell ثم Onboarding وToday.
4. إضافة persistence والإشعارات والخصوصية المحلية.
5. تنفيذ P1 ثم P2/P3 بعد اجتياز بوابة P0.
6. تشغيل XCTest/Swift Testing وPreviews ثم جهاز iPhone حقيقي وTestFlight.

لا توجد مزامنة أو حساب في النسخة المحلية الأولى؛ تُصمم الحدود بحيث يمكن استبدال التخزين لاحقًا بخدمة backend دون إعادة تصميم الرحلات.
