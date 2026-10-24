/**
 * Bilingual copy the engine needs without UI context ("why today" lines and
 * notification texts). Port of `engine/why_today.dart` using the FINAL Saudi
 * strings (lib/l10n/app_ar.arb after the dialect pass, plus the audit
 * rewrites for whyMaintainLight / nudgeDuesTitle / duesAutoSave).
 * Digits are always Western (0–9).
 */
import type { IeltsSkill, LocalizedText, WhyCode, WhyToday } from '../models';
import { ltSame } from '../models';

/** Key → [ar, en] template. Placeholders use `{name}`. */
export const kEngineStrings: Readonly<Record<string, readonly [string, string]>> = {
  // ---- why today ----
  whyGrowFocus: ['من تركيز موسمك: {domain}', 'Part of your season focus: {domain}'],
  whyStrengthDay: ['يوم القوة {n} من {total} هالأسبوع', 'Strength day {n} of {total} this week'],
  whyWalkDay: ['يوم مشي — عضلاتك ترتاح بين أيام القوة', 'Walk day — your muscles rest between strength days'],
  whyIeltsRotation: ['مفرداتك + مهارة اليوم: {skill}', "Your vocab + today's skill: {skill}"],
  whyVocabDue: ['{count} بطاقة تنتظرك تراجعينها — مراجعة متباعدة', '{count} cards due — spaced review'],
  whyComeback: ['رجعتي — وهذا أهم جزء', "You're back — that's the most important part"],
  whyMaintainLight: ['نحافظ عليها بخفّة: {domain}', 'Light maintenance: {domain}'],
  whyChainStep: ['خطوة من {routine}', 'A step of your {routine}'],
  whyWeeklyDue: ['مهمة هالأسبوع — يومها اليوم', "This week's task — today is its day"],
  whyWeeklyCarried: ['مهمة هالأسبوع — تنتظرك من يوم {day}', "This week's task — waiting since {day}"],
  whyWeeklyOpen: ['هالأسبوع: باقي {left} من {total} — أي يوم يناسبك', 'This week: {left} of {total} left — any day that suits you'],
  whyWeeklyReview: ['آخر الأسبوع — وقت نقفله بهدوء', 'End of the week — time to close the chapter'],
  whyProjectNext: ['الخطوة الجاية في {project}', 'Next step in {project}'],
  whyFreeJoy: ['متعة لك — بلا شروط', 'Joy for you — no strings attached'],
  whyRedEssential: ['يوم رايق — نسخة صغيرة تكفي اليوم', 'A gentle day — a small version is enough today'],
  whyYellowMinimum: ['طاقتك متوسطة — النسخة الصغيرة تكفي', 'Medium energy — the minimum version is enough'],
  whyTimeTrimmed: ['يومك مزدحم — النسخة الصغيرة تناسب وقتك', 'A full day — the minimum version fits your time'],
  // ---- IELTS skills (GROW-12 rotation) ----
  ieltsSkillReading: ['القراءة', 'Reading'],
  ieltsSkillListening: ['الاستماع', 'Listening'],
  ieltsSkillWriting: ['الكتابة', 'Writing'],
  ieltsSkillSpeaking: ['المحادثة', 'Speaking'],
  ieltsSkillMixedReadingListening: ['قراءة واستماع مع بعض', 'Mixed reading & listening'],
  ieltsSkillLightReview: ['مراجعة خفيفة أو اختبار تجريبي', 'Light review or mock test'],
  // ---- weekdays (Dart weekday 1..7) ----
  weekday1: ['الاثنين', 'Monday'],
  weekday2: ['الثلاثاء', 'Tuesday'],
  weekday3: ['الأربعاء', 'Wednesday'],
  weekday4: ['الخميس', 'Thursday'],
  weekday5: ['الجمعة', 'Friday'],
  weekday6: ['السبت', 'Saturday'],
  weekday7: ['الأحد', 'Sunday'],
  // ---- notifications ----
  nudgeMorningTitle: ['صباح الخير — يومك جاهز', 'Good morning — your day is ready'],
  nudgeMorningBody: ['أول خطوة: {first}', 'First step: {first}'],
  nudgeMorningBodyEmpty: ['خذي نفس وشوفي خطتك', 'Take a breath and see your plan'],
  nudgeAnchoredBody: ['نسخة صغيرة تكفي اليوم', 'A small version is enough today'],
  nudgeEveningTitle: ['نقفل اليوم', 'Evening shutdown'],
  nudgeEveningBody: ['دقيقتين نرتب بكرة ونبدأ نهدّي', 'Two minutes to set up tomorrow and start winding down'],
  nudgeDuesTitle: ['دفعات اليوم', "Today's dues"],
  duesAutoSave: ['حوّلي للادخار', 'Automatic savings transfer'],
  duesPayday: ['يوم الراتب', 'Payday'],
  nudgeActionDone: ['سوّيتها — نسخة صغيرة', 'Done — minimum'],
  nudgeActionSnooze: ['بعد 30 دقيقة', 'Snooze 30 min'],
  nudgeActionSkip: ['تخطي اليوم', 'Skip today'],
};

/** Fills `{name}` placeholders. */
export function fillTemplate(template: string, args: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(args)) out = out.split(`{${k}}`).join(v);
  return out;
}

/** Looks up [key] and fills both languages. [args] values are bilingual. */
export function engineText(key: string, args: Record<string, LocalizedText> = {}): LocalizedText {
  const t = kEngineStrings[key];
  if (!t) throw new Error(`Unknown engine string: ${key}`);
  const ar: Record<string, string> = {};
  const en: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    ar[k] = v.ar;
    en[k] = v.en;
  }
  return { ar: fillTemplate(t[0], ar), en: fillTemplate(t[1], en) };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Key for a WhyCode (`whyStrengthDay` …). */
export const whyKey = (code: WhyCode): string => `why${cap(code)}`;

/** Builds a WhyToday for [code]; numeric args can be passed as ltSame('3'). */
export function buildWhy(code: WhyCode, args: Record<string, LocalizedText> = {}): WhyToday {
  const en: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) en[k] = v.en;
  return { code, args: en, text: engineText(whyKey(code), args) };
}

export const ieltsSkillName = (s: IeltsSkill): LocalizedText => engineText(`ieltsSkill${cap(s)}`);

/** Localised weekday name (Dart weekday 1..7). */
export const weekdayName = (wd: number): LocalizedText => engineText(`weekday${wd}`);

/** Localised number (Western digits in both languages). */
export const numText = (n: number): LocalizedText => ltSame(String(n));
