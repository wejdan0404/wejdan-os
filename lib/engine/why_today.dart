/// Bilingual copy the pure-Dart engine needs *without* a BuildContext
/// (plan "why today" lines and notification texts).
///
/// Every key here is mirrored 1:1 in `lib/l10n/app_ar.arb` and
/// `lib/l10n/app_en.arb` (a unit test enforces equality), so the UI can use
/// either the ready strings on models or `AppLocalizations`.
///
/// Arabic copy is Claude-authored — pending native review (see README).
/// Digits are always Western (0–9).
library;

import '../data/models/models.dart';

/// Key → (ar, en) template. Placeholders use `{name}`.
const Map<String, (String, String)> kEngineStrings = {
  // ---- why today ----
  'whyGrowFocus': ('من تركيز موسمك: {domain}', 'Part of your season focus: {domain}'),
  'whyStrengthDay': ('يوم القوة {n} من {total} هذا الأسبوع', 'Strength day {n} of {total} this week'),
  'whyWalkDay': ('يوم مشي — عضلاتك ترتاح بين أيام القوة', 'Walk day — your muscles rest between strength days'),
  'whyIeltsRotation': ('مفرداتك + مهارة اليوم: {skill}', "Your vocab + today's skill: {skill}"),
  'whyVocabDue': ('{count} بطاقة تنتظر المراجعة — تكرار متباعد', '{count} cards due — spaced review'),
  'whyComeback': ('رجعتي — وهذا أهم جزء', "You're back — that's the most important part"),
  'whyMaintainLight': ('صيانة خفيفة: {domain}', 'Light maintenance: {domain}'),
  'whyChainStep': ('خطوة من {routine}', 'A step of your {routine}'),
  'whyWeeklyDue': ('مهمة هذا الأسبوع — يومها اليوم', "This week's task — today is its day"),
  'whyWeeklyCarried': ('مهمة هذا الأسبوع — تنتظرك من يوم {day}', "This week's task — waiting since {day}"),
  'whyWeeklyReview': ('نهاية الأسبوع — وقت نقفل الفصل بهدوء', 'End of the week — time to close the chapter'),
  'whyProjectNext': ('الخطوة التالية في {project}', 'Next step in {project}'),
  'whyFreeJoy': ('متعة لك — بدون شروط', 'Joy for you — no strings attached'),
  'whyRedEssential': ('يوم هادئ — نسخة صغيرة تكفي اليوم', 'A gentle day — a small version is enough today'),
  'whyYellowMinimum': ('طاقتك متوسطة — النسخة الصغيرة تكفي', 'Medium energy — the minimum version is enough'),
  'whyTimeTrimmed': ('يومك مزدحم — النسخة الصغيرة تناسب وقتك', 'A full day — the minimum version fits your time'),
  // ---- IELTS skills (GROW-12 rotation) ----
  'ieltsSkillReading': ('القراءة', 'Reading'),
  'ieltsSkillListening': ('الاستماع', 'Listening'),
  'ieltsSkillWriting': ('الكتابة', 'Writing'),
  'ieltsSkillSpeaking': ('المحادثة', 'Speaking'),
  'ieltsSkillMixedReadingListening': ('قراءة واستماع معًا', 'Mixed reading & listening'),
  'ieltsSkillLightReview': ('مراجعة خفيفة أو اختبار تجريبي', 'Light review or mock test'),
  // ---- weekdays (DateTime.weekday 1..7) ----
  'weekday1': ('الاثنين', 'Monday'),
  'weekday2': ('الثلاثاء', 'Tuesday'),
  'weekday3': ('الأربعاء', 'Wednesday'),
  'weekday4': ('الخميس', 'Thursday'),
  'weekday5': ('الجمعة', 'Friday'),
  'weekday6': ('السبت', 'Saturday'),
  'weekday7': ('الأحد', 'Sunday'),
  // ---- notifications (spec §5.6) ----
  'nudgeMorningTitle': ('صباح الخير — يومك جاهز', 'Good morning — your day is ready'),
  'nudgeMorningBody': ('أول خطوة: {first}', 'First step: {first}'),
  'nudgeMorningBodyEmpty': ('خذي نفس وشوفي خطتك', 'Take a breath and see your plan'),
  'nudgeAnchoredBody': ('نسخة صغيرة تكفي اليوم', 'A small version is enough today'),
  'nudgeEveningTitle': ('إغلاق اليوم', 'Evening shutdown'),
  'nudgeEveningBody': ('دقيقتين نرتب بكرة ونبدأ التهدئة', 'Two minutes to set up tomorrow and start winding down'),
  'nudgeDuesTitle': ('مستحقات اليوم', "Today's dues"),
  'duesAutoSave': ('تحويل الادخار التلقائي', 'Automatic savings transfer'),
  'nudgeActionDone': ('تم — نسخة صغيرة', 'Done — minimum'),
  'nudgeActionSnooze': ('بعد 30 دقيقة', 'Snooze 30 min'),
  'nudgeActionSkip': ('تخطي اليوم', 'Skip today'),
};

/// Fills `{name}` placeholders.
String fillTemplate(String template, Map<String, String> args) {
  var out = template;
  args.forEach((k, v) => out = out.replaceAll('{$k}', v));
  return out;
}

/// Looks up [key] and fills both languages. [args] values are bilingual.
LocalizedText engineText(String key, [Map<String, LocalizedText> args = const {}]) {
  final t = kEngineStrings[key];
  if (t == null) throw ArgumentError('Unknown engine string: $key');
  return LocalizedText(
    ar: fillTemplate(t.$1, args.map((k, v) => MapEntry(k, v.ar))),
    en: fillTemplate(t.$2, args.map((k, v) => MapEntry(k, v.en))),
  );
}

/// ARB key for a [WhyCode] (`whyStrengthDay` …).
String whyKey(WhyCode code) => 'why${code.name[0].toUpperCase()}${code.name.substring(1)}';

/// Builds a [WhyToday] for [code]. Numeric args can be passed as
/// `LocalizedText.same('3')`.
WhyToday buildWhy(WhyCode code, [Map<String, LocalizedText> args = const {}]) => WhyToday(
      code: code,
      args: args.map((k, v) => MapEntry(k, v.en)),
      text: engineText(whyKey(code), args),
    );

/// Localised IELTS skill name.
LocalizedText ieltsSkillName(IeltsSkill s) =>
    engineText('ieltsSkill${s.name[0].toUpperCase()}${s.name.substring(1)}');

/// Localised weekday name ([DateTime.weekday] 1..7).
LocalizedText weekdayName(int weekday) => engineText('weekday$weekday');

/// Localised number (Western digits in both languages).
LocalizedText numText(int n) => LocalizedText.same(n.toString());
