import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @whyGrowFocus.
  ///
  /// In ar, this message translates to:
  /// **'من تركيز موسمك: {domain}'**
  String whyGrowFocus(String domain);

  /// No description provided for @whyStrengthDay.
  ///
  /// In ar, this message translates to:
  /// **'يوم القوة {n} من {total} هذا الأسبوع'**
  String whyStrengthDay(String n, String total);

  /// No description provided for @whyWalkDay.
  ///
  /// In ar, this message translates to:
  /// **'يوم مشي — عضلاتك ترتاح بين أيام القوة'**
  String get whyWalkDay;

  /// No description provided for @whyIeltsRotation.
  ///
  /// In ar, this message translates to:
  /// **'مفرداتك + مهارة اليوم: {skill}'**
  String whyIeltsRotation(String skill);

  /// No description provided for @whyVocabDue.
  ///
  /// In ar, this message translates to:
  /// **'{count} بطاقة تنتظر المراجعة — تكرار متباعد'**
  String whyVocabDue(String count);

  /// No description provided for @whyComeback.
  ///
  /// In ar, this message translates to:
  /// **'رجعتي — وهذا أهم جزء'**
  String get whyComeback;

  /// No description provided for @whyMaintainLight.
  ///
  /// In ar, this message translates to:
  /// **'صيانة خفيفة: {domain}'**
  String whyMaintainLight(String domain);

  /// No description provided for @whyChainStep.
  ///
  /// In ar, this message translates to:
  /// **'خطوة من {routine}'**
  String whyChainStep(String routine);

  /// No description provided for @whyWeeklyDue.
  ///
  /// In ar, this message translates to:
  /// **'مهمة هذا الأسبوع — يومها اليوم'**
  String get whyWeeklyDue;

  /// No description provided for @whyWeeklyCarried.
  ///
  /// In ar, this message translates to:
  /// **'مهمة هذا الأسبوع — تنتظرك من يوم {day}'**
  String whyWeeklyCarried(String day);

  /// No description provided for @whyWeeklyReview.
  ///
  /// In ar, this message translates to:
  /// **'نهاية الأسبوع — وقت نقفل الفصل بهدوء'**
  String get whyWeeklyReview;

  /// No description provided for @whyProjectNext.
  ///
  /// In ar, this message translates to:
  /// **'الخطوة التالية في {project}'**
  String whyProjectNext(String project);

  /// No description provided for @whyFreeJoy.
  ///
  /// In ar, this message translates to:
  /// **'متعة لك — بدون شروط'**
  String get whyFreeJoy;

  /// No description provided for @whyRedEssential.
  ///
  /// In ar, this message translates to:
  /// **'يوم هادئ — نسخة صغيرة تكفي اليوم'**
  String get whyRedEssential;

  /// No description provided for @whyYellowMinimum.
  ///
  /// In ar, this message translates to:
  /// **'طاقتك متوسطة — النسخة الصغيرة تكفي'**
  String get whyYellowMinimum;

  /// No description provided for @whyTimeTrimmed.
  ///
  /// In ar, this message translates to:
  /// **'يومك مزدحم — النسخة الصغيرة تناسب وقتك'**
  String get whyTimeTrimmed;

  /// No description provided for @ieltsSkillReading.
  ///
  /// In ar, this message translates to:
  /// **'القراءة'**
  String get ieltsSkillReading;

  /// No description provided for @ieltsSkillListening.
  ///
  /// In ar, this message translates to:
  /// **'الاستماع'**
  String get ieltsSkillListening;

  /// No description provided for @ieltsSkillWriting.
  ///
  /// In ar, this message translates to:
  /// **'الكتابة'**
  String get ieltsSkillWriting;

  /// No description provided for @ieltsSkillSpeaking.
  ///
  /// In ar, this message translates to:
  /// **'المحادثة'**
  String get ieltsSkillSpeaking;

  /// No description provided for @ieltsSkillMixedReadingListening.
  ///
  /// In ar, this message translates to:
  /// **'قراءة واستماع معًا'**
  String get ieltsSkillMixedReadingListening;

  /// No description provided for @ieltsSkillLightReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة خفيفة أو اختبار تجريبي'**
  String get ieltsSkillLightReview;

  /// No description provided for @weekday1.
  ///
  /// In ar, this message translates to:
  /// **'الاثنين'**
  String get weekday1;

  /// No description provided for @weekday2.
  ///
  /// In ar, this message translates to:
  /// **'الثلاثاء'**
  String get weekday2;

  /// No description provided for @weekday3.
  ///
  /// In ar, this message translates to:
  /// **'الأربعاء'**
  String get weekday3;

  /// No description provided for @weekday4.
  ///
  /// In ar, this message translates to:
  /// **'الخميس'**
  String get weekday4;

  /// No description provided for @weekday5.
  ///
  /// In ar, this message translates to:
  /// **'الجمعة'**
  String get weekday5;

  /// No description provided for @weekday6.
  ///
  /// In ar, this message translates to:
  /// **'السبت'**
  String get weekday6;

  /// No description provided for @weekday7.
  ///
  /// In ar, this message translates to:
  /// **'الأحد'**
  String get weekday7;

  /// No description provided for @nudgeMorningTitle.
  ///
  /// In ar, this message translates to:
  /// **'صباح الخير — يومك جاهز'**
  String get nudgeMorningTitle;

  /// No description provided for @nudgeMorningBody.
  ///
  /// In ar, this message translates to:
  /// **'أول خطوة: {first}'**
  String nudgeMorningBody(String first);

  /// No description provided for @nudgeMorningBodyEmpty.
  ///
  /// In ar, this message translates to:
  /// **'خذي نفس وشوفي خطتك'**
  String get nudgeMorningBodyEmpty;

  /// No description provided for @nudgeAnchoredBody.
  ///
  /// In ar, this message translates to:
  /// **'نسخة صغيرة تكفي اليوم'**
  String get nudgeAnchoredBody;

  /// No description provided for @nudgeEveningTitle.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق اليوم'**
  String get nudgeEveningTitle;

  /// No description provided for @nudgeEveningBody.
  ///
  /// In ar, this message translates to:
  /// **'دقيقتين نرتب بكرة ونبدأ التهدئة'**
  String get nudgeEveningBody;

  /// No description provided for @nudgeActionDone.
  ///
  /// In ar, this message translates to:
  /// **'تم — نسخة صغيرة'**
  String get nudgeActionDone;

  /// No description provided for @nudgeActionSnooze.
  ///
  /// In ar, this message translates to:
  /// **'بعد 30 دقيقة'**
  String get nudgeActionSnooze;

  /// No description provided for @nudgeActionSkip.
  ///
  /// In ar, this message translates to:
  /// **'تخطي اليوم'**
  String get nudgeActionSkip;

  /// No description provided for @appTitle.
  ///
  /// In ar, this message translates to:
  /// **'Wejdan Life OS — وجدان'**
  String get appTitle;

  /// No description provided for @tabToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get tabToday;

  /// No description provided for @tabHabits.
  ///
  /// In ar, this message translates to:
  /// **'العناية'**
  String get tabHabits;

  /// No description provided for @tabPath.
  ///
  /// In ar, this message translates to:
  /// **'مهني'**
  String get tabPath;

  /// No description provided for @tabJoy.
  ///
  /// In ar, this message translates to:
  /// **'متعتي'**
  String get tabJoy;

  /// No description provided for @tabMe.
  ///
  /// In ar, this message translates to:
  /// **'أنا'**
  String get tabMe;

  /// No description provided for @energyGreen.
  ///
  /// In ar, this message translates to:
  /// **'طاقة عالية'**
  String get energyGreen;

  /// No description provided for @energyYellow.
  ///
  /// In ar, this message translates to:
  /// **'طاقة متوسطة'**
  String get energyYellow;

  /// No description provided for @energyRed.
  ///
  /// In ar, this message translates to:
  /// **'يوم هادئ'**
  String get energyRed;

  /// No description provided for @levelMinimum.
  ///
  /// In ar, this message translates to:
  /// **'نسخة صغيرة'**
  String get levelMinimum;

  /// No description provided for @levelNormal.
  ///
  /// In ar, this message translates to:
  /// **'النسخة العادية'**
  String get levelNormal;

  /// No description provided for @levelBonus.
  ///
  /// In ar, this message translates to:
  /// **'إضافي'**
  String get levelBonus;

  /// No description provided for @levelSkipped.
  ///
  /// In ar, this message translates to:
  /// **'تخطيت اليوم'**
  String get levelSkipped;

  /// No description provided for @tierCore.
  ///
  /// In ar, this message translates to:
  /// **'الأساسي'**
  String get tierCore;

  /// No description provided for @tierMaintain.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get tierMaintain;

  /// No description provided for @tierJoy.
  ///
  /// In ar, this message translates to:
  /// **'متعة'**
  String get tierJoy;

  /// No description provided for @tierChain.
  ///
  /// In ar, this message translates to:
  /// **'روتين'**
  String get tierChain;

  /// No description provided for @tierSystem.
  ///
  /// In ar, this message translates to:
  /// **'طقس أسبوعي'**
  String get tierSystem;

  /// No description provided for @sectionMorningChain.
  ///
  /// In ar, this message translates to:
  /// **'روتين الصباح'**
  String get sectionMorningChain;

  /// No description provided for @sectionDay.
  ///
  /// In ar, this message translates to:
  /// **'خلال اليوم'**
  String get sectionDay;

  /// No description provided for @sectionEveningChain.
  ///
  /// In ar, this message translates to:
  /// **'روتين المساء'**
  String get sectionEveningChain;

  /// No description provided for @thisWeekStrip.
  ///
  /// In ar, this message translates to:
  /// **'هذا الأسبوع'**
  String get thisWeekStrip;

  /// No description provided for @stageSeed.
  ///
  /// In ar, this message translates to:
  /// **'بذرة'**
  String get stageSeed;

  /// No description provided for @stageSprout.
  ///
  /// In ar, this message translates to:
  /// **'برعم'**
  String get stageSprout;

  /// No description provided for @stageGrowing.
  ///
  /// In ar, this message translates to:
  /// **'تنمو'**
  String get stageGrowing;

  /// No description provided for @stageRooted.
  ///
  /// In ar, this message translates to:
  /// **'متجذّرة'**
  String get stageRooted;

  /// No description provided for @stageAutomatic.
  ///
  /// In ar, this message translates to:
  /// **'تلقائية'**
  String get stageAutomatic;

  /// No description provided for @missForgot.
  ///
  /// In ar, this message translates to:
  /// **'نسيت'**
  String get missForgot;

  /// No description provided for @missBadTime.
  ///
  /// In ar, this message translates to:
  /// **'الوقت ما كان مناسب'**
  String get missBadTime;

  /// No description provided for @missTooBig.
  ///
  /// In ar, this message translates to:
  /// **'كانت كبيرة'**
  String get missTooBig;

  /// No description provided for @missTired.
  ///
  /// In ar, this message translates to:
  /// **'كنت تعبانة'**
  String get missTired;

  /// No description provided for @missNotEnjoyable.
  ///
  /// In ar, this message translates to:
  /// **'ما كانت ممتعة'**
  String get missNotEnjoyable;

  /// No description provided for @missPlaceDidntFit.
  ///
  /// In ar, this message translates to:
  /// **'المكان ما ناسب'**
  String get missPlaceDidntFit;

  /// No description provided for @missBusy.
  ///
  /// In ar, this message translates to:
  /// **'كنت مشغولة'**
  String get missBusy;

  /// No description provided for @missNotImportantNow.
  ///
  /// In ar, this message translates to:
  /// **'مو مهمة الحين'**
  String get missNotImportantNow;

  /// No description provided for @recoveryTitle.
  ///
  /// In ar, this message translates to:
  /// **'وش صار؟ خلينا نعدل التصميم مو نلومك'**
  String get recoveryTitle;

  /// No description provided for @changeMoveCueAddReminder.
  ///
  /// In ar, this message translates to:
  /// **'نربطها بإشارة أوضح ونفعّل تذكير واحد'**
  String get changeMoveCueAddReminder;

  /// No description provided for @changeSwapTime.
  ///
  /// In ar, this message translates to:
  /// **'ننقلها لوقت يناسبك أكثر'**
  String get changeSwapTime;

  /// No description provided for @changeShrinkToMinimum.
  ///
  /// In ar, this message translates to:
  /// **'نصغّرها للنسخة الصغيرة'**
  String get changeShrinkToMinimum;

  /// No description provided for @changeMinimumAndMoveEarlier.
  ///
  /// In ar, this message translates to:
  /// **'نسخة صغيرة وفي وقت أبكر'**
  String get changeMinimumAndMoveEarlier;

  /// No description provided for @changeAddJoyPairing.
  ///
  /// In ar, this message translates to:
  /// **'نضيف لها متعة مرافقة أو نغير النشاط'**
  String get changeAddJoyPairing;

  /// No description provided for @changeChangePlacePrepare.
  ///
  /// In ar, this message translates to:
  /// **'نغير المكان أو نجهزه مسبقًا'**
  String get changeChangePlacePrepare;

  /// No description provided for @changeShrinkAndReschedule.
  ///
  /// In ar, this message translates to:
  /// **'نصغّرها ونخفف أيامها'**
  String get changeShrinkAndReschedule;

  /// No description provided for @changePauseToRest.
  ///
  /// In ar, this message translates to:
  /// **'نريّحها هذا الموسم'**
  String get changePauseToRest;

  /// No description provided for @comebackCelebration.
  ///
  /// In ar, this message translates to:
  /// **'رجعتي — هذا أهم جزء'**
  String get comebackCelebration;

  /// No description provided for @sparksLabel.
  ///
  /// In ar, this message translates to:
  /// **'شرارات'**
  String get sparksLabel;

  /// No description provided for @sparkReasonCompletion.
  ///
  /// In ar, this message translates to:
  /// **'بداية'**
  String get sparkReasonCompletion;

  /// No description provided for @sparkReasonComeback.
  ///
  /// In ar, this message translates to:
  /// **'عودة'**
  String get sparkReasonComeback;

  /// No description provided for @sparkReasonWeeklyReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة أسبوعية'**
  String get sparkReasonWeeklyReview;

  /// No description provided for @sparkReasonExperiment.
  ///
  /// In ar, this message translates to:
  /// **'تجربة'**
  String get sparkReasonExperiment;

  /// No description provided for @sparkReasonRedeem.
  ///
  /// In ar, this message translates to:
  /// **'مكافأة'**
  String get sparkReasonRedeem;

  /// No description provided for @sparkReasonReversal.
  ///
  /// In ar, this message translates to:
  /// **'تراجع'**
  String get sparkReasonReversal;

  /// No description provided for @sparkReasonAdjustment.
  ///
  /// In ar, this message translates to:
  /// **'تعديل'**
  String get sparkReasonAdjustment;

  /// No description provided for @undo.
  ///
  /// In ar, this message translates to:
  /// **'تراجع'**
  String get undo;

  /// No description provided for @smallVersionEnough.
  ///
  /// In ar, this message translates to:
  /// **'نسخة صغيرة تكفي اليوم'**
  String get smallVersionEnough;

  /// No description provided for @whyLabel.
  ///
  /// In ar, this message translates to:
  /// **'لماذا؟'**
  String get whyLabel;

  /// No description provided for @helpSafetyLink.
  ///
  /// In ar, this message translates to:
  /// **'المساعدة والأمان'**
  String get helpSafetyLink;

  /// No description provided for @helpMoh.
  ///
  /// In ar, this message translates to:
  /// **'وزارة الصحة 937'**
  String get helpMoh;

  /// No description provided for @helpEmergency.
  ///
  /// In ar, this message translates to:
  /// **'الطوارئ 997 / 911'**
  String get helpEmergency;

  /// No description provided for @placeholderHomeTitle.
  ///
  /// In ar, this message translates to:
  /// **'خطة اليوم'**
  String get placeholderHomeTitle;

  /// No description provided for @placeholderLoading.
  ///
  /// In ar, this message translates to:
  /// **'نجهز يومك…'**
  String get placeholderLoading;

  /// No description provided for @placeholderError.
  ///
  /// In ar, this message translates to:
  /// **'صار خطأ في التحميل'**
  String get placeholderError;

  /// No description provided for @userName.
  ///
  /// In ar, this message translates to:
  /// **'وجدان'**
  String get userName;

  /// No description provided for @greetingMorning.
  ///
  /// In ar, this message translates to:
  /// **'صباح الخير، {name}'**
  String greetingMorning(String name);

  /// No description provided for @greetingEvening.
  ///
  /// In ar, this message translates to:
  /// **'مساء الخير، {name}'**
  String greetingEvening(String name);

  /// No description provided for @months.
  ///
  /// In ar, this message translates to:
  /// **'يناير,فبراير,مارس,أبريل,مايو,يونيو,يوليو,أغسطس,سبتمبر,أكتوبر,نوفمبر,ديسمبر'**
  String get months;

  /// No description provided for @minutesShort.
  ///
  /// In ar, this message translates to:
  /// **'{m} د'**
  String minutesShort(String m);

  /// No description provided for @minutesPlus.
  ///
  /// In ar, this message translates to:
  /// **'{m}+ د'**
  String minutesPlus(String m);

  /// No description provided for @close.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق'**
  String get close;

  /// No description provided for @back.
  ///
  /// In ar, this message translates to:
  /// **'رجوع'**
  String get back;

  /// No description provided for @next.
  ///
  /// In ar, this message translates to:
  /// **'التالي'**
  String get next;

  /// No description provided for @cancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In ar, this message translates to:
  /// **'حفظ'**
  String get save;

  /// No description provided for @add.
  ///
  /// In ar, this message translates to:
  /// **'إضافة'**
  String get add;

  /// No description provided for @change.
  ///
  /// In ar, this message translates to:
  /// **'تغيير'**
  String get change;

  /// No description provided for @optional.
  ///
  /// In ar, this message translates to:
  /// **'(اختياري)'**
  String get optional;

  /// No description provided for @later.
  ///
  /// In ar, this message translates to:
  /// **'لاحقًا'**
  String get later;

  /// No description provided for @more.
  ///
  /// In ar, this message translates to:
  /// **'أكثر'**
  String get more;

  /// No description provided for @fewer.
  ///
  /// In ar, this message translates to:
  /// **'أقل'**
  String get fewer;

  /// No description provided for @pause.
  ///
  /// In ar, this message translates to:
  /// **'إيقاف مؤقت'**
  String get pause;

  /// No description provided for @resume.
  ///
  /// In ar, this message translates to:
  /// **'متابعة'**
  String get resume;

  /// No description provided for @suggested.
  ///
  /// In ar, this message translates to:
  /// **'مقترح'**
  String get suggested;

  /// No description provided for @xOfY.
  ///
  /// In ar, this message translates to:
  /// **'{x} من {y}'**
  String xOfY(String x, String y);

  /// No description provided for @stepOf.
  ///
  /// In ar, this message translates to:
  /// **'الخطوة {n} من {total}'**
  String stepOf(String n, String total);

  /// No description provided for @itemNotFound.
  ///
  /// In ar, this message translates to:
  /// **'ما لقينا هذا العنصر — يمكن تغيّرت خطة اليوم.'**
  String get itemNotFound;

  /// No description provided for @mainNavigation.
  ///
  /// In ar, this message translates to:
  /// **'التنقل الرئيسي'**
  String get mainNavigation;

  /// No description provided for @doneShort.
  ///
  /// In ar, this message translates to:
  /// **'تم'**
  String get doneShort;

  /// No description provided for @skippedShort.
  ///
  /// In ar, this message translates to:
  /// **'تخطيتها'**
  String get skippedShort;

  /// No description provided for @backToToday.
  ///
  /// In ar, this message translates to:
  /// **'ارجعي لليوم'**
  String get backToToday;

  /// No description provided for @energyChipGreen.
  ///
  /// In ar, this message translates to:
  /// **'طاقتي: جيدة'**
  String get energyChipGreen;

  /// No description provided for @energyChipYellow.
  ///
  /// In ar, this message translates to:
  /// **'طاقتي: متوسطة'**
  String get energyChipYellow;

  /// No description provided for @energyChipRed.
  ///
  /// In ar, this message translates to:
  /// **'طاقتي: منخفضة'**
  String get energyChipRed;

  /// No description provided for @energyGood.
  ///
  /// In ar, this message translates to:
  /// **'جيدة'**
  String get energyGood;

  /// No description provided for @energyGoodSub.
  ///
  /// In ar, this message translates to:
  /// **'يوم عادي'**
  String get energyGoodSub;

  /// No description provided for @energyMid.
  ///
  /// In ar, this message translates to:
  /// **'متوسطة'**
  String get energyMid;

  /// No description provided for @energyMidSub.
  ///
  /// In ar, this message translates to:
  /// **'نسخ أخف'**
  String get energyMidSub;

  /// No description provided for @energyLow.
  ///
  /// In ar, this message translates to:
  /// **'منخفضة'**
  String get energyLow;

  /// No description provided for @energyLowSub.
  ///
  /// In ar, this message translates to:
  /// **'الحد الأدنى'**
  String get energyLowSub;

  /// No description provided for @levelGroupLabel.
  ///
  /// In ar, this message translates to:
  /// **'مستوى الإنجاز'**
  String get levelGroupLabel;

  /// No description provided for @levelShortMin.
  ///
  /// In ar, this message translates to:
  /// **'أدنى'**
  String get levelShortMin;

  /// No description provided for @levelShortNormal.
  ///
  /// In ar, this message translates to:
  /// **'عادي'**
  String get levelShortNormal;

  /// No description provided for @levelShortBonus.
  ///
  /// In ar, this message translates to:
  /// **'إضافي'**
  String get levelShortBonus;

  /// No description provided for @domainHealth.
  ///
  /// In ar, this message translates to:
  /// **'الحركة'**
  String get domainHealth;

  /// No description provided for @domainSleep.
  ///
  /// In ar, this message translates to:
  /// **'النوم'**
  String get domainSleep;

  /// No description provided for @domainFood.
  ///
  /// In ar, this message translates to:
  /// **'الأكل'**
  String get domainFood;

  /// No description provided for @domainCare.
  ///
  /// In ar, this message translates to:
  /// **'العناية'**
  String get domainCare;

  /// No description provided for @domainWomensHealth.
  ///
  /// In ar, this message translates to:
  /// **'صحة المرأة'**
  String get domainWomensHealth;

  /// No description provided for @domainIelts.
  ///
  /// In ar, this message translates to:
  /// **'IELTS'**
  String get domainIelts;

  /// No description provided for @domainLearning.
  ///
  /// In ar, this message translates to:
  /// **'التعلّم'**
  String get domainLearning;

  /// No description provided for @domainCareer.
  ///
  /// In ar, this message translates to:
  /// **'المسار المهني'**
  String get domainCareer;

  /// No description provided for @domainDriving.
  ///
  /// In ar, this message translates to:
  /// **'القيادة'**
  String get domainDriving;

  /// No description provided for @domainMoney.
  ///
  /// In ar, this message translates to:
  /// **'المال'**
  String get domainMoney;

  /// No description provided for @domainHome.
  ///
  /// In ar, this message translates to:
  /// **'البيت'**
  String get domainHome;

  /// No description provided for @domainDigital.
  ///
  /// In ar, this message translates to:
  /// **'الحياة الرقمية'**
  String get domainDigital;

  /// No description provided for @domainAdmin.
  ///
  /// In ar, this message translates to:
  /// **'الأمور الإدارية'**
  String get domainAdmin;

  /// No description provided for @domainJoy.
  ///
  /// In ar, this message translates to:
  /// **'المتعة'**
  String get domainJoy;

  /// No description provided for @domainPeople.
  ///
  /// In ar, this message translates to:
  /// **'الناس'**
  String get domainPeople;

  /// No description provided for @domainFaith.
  ///
  /// In ar, this message translates to:
  /// **'الإيمان والمعنى'**
  String get domainFaith;

  /// No description provided for @domainAquarium.
  ///
  /// In ar, this message translates to:
  /// **'حوض السمك'**
  String get domainAquarium;

  /// No description provided for @prayerFajr.
  ///
  /// In ar, this message translates to:
  /// **'الفجر'**
  String get prayerFajr;

  /// No description provided for @prayerDhuhr.
  ///
  /// In ar, this message translates to:
  /// **'الظهر'**
  String get prayerDhuhr;

  /// No description provided for @prayerAsr.
  ///
  /// In ar, this message translates to:
  /// **'العصر'**
  String get prayerAsr;

  /// No description provided for @prayerMaghrib.
  ///
  /// In ar, this message translates to:
  /// **'المغرب'**
  String get prayerMaghrib;

  /// No description provided for @prayerIsha.
  ///
  /// In ar, this message translates to:
  /// **'العشاء'**
  String get prayerIsha;

  /// No description provided for @slotMorning.
  ///
  /// In ar, this message translates to:
  /// **'الصباح'**
  String get slotMorning;

  /// No description provided for @slotMidday.
  ///
  /// In ar, this message translates to:
  /// **'الظهيرة'**
  String get slotMidday;

  /// No description provided for @slotAfternoon.
  ///
  /// In ar, this message translates to:
  /// **'العصرية'**
  String get slotAfternoon;

  /// No description provided for @slotEvening.
  ///
  /// In ar, this message translates to:
  /// **'المساء'**
  String get slotEvening;

  /// No description provided for @slotNight.
  ///
  /// In ar, this message translates to:
  /// **'الليل'**
  String get slotNight;

  /// No description provided for @slotAnytime.
  ///
  /// In ar, this message translates to:
  /// **'أي وقت'**
  String get slotAnytime;

  /// No description provided for @dayLabel.
  ///
  /// In ar, this message translates to:
  /// **'النهار'**
  String get dayLabel;

  /// No description provided for @cueAfter.
  ///
  /// In ar, this message translates to:
  /// **'بعد {p}'**
  String cueAfter(String p);

  /// No description provided for @cueBefore.
  ///
  /// In ar, this message translates to:
  /// **'قبل {p}'**
  String cueBefore(String p);

  /// No description provided for @cueAfterWake.
  ///
  /// In ar, this message translates to:
  /// **'بعد الاستيقاظ'**
  String get cueAfterWake;

  /// No description provided for @cueBeforeSleep.
  ///
  /// In ar, this message translates to:
  /// **'قبل النوم'**
  String get cueBeforeSleep;

  /// No description provided for @fixedTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت محدد'**
  String get fixedTime;

  /// No description provided for @morningBriefTitle.
  ///
  /// In ar, this message translates to:
  /// **'موجز الصباح'**
  String get morningBriefTitle;

  /// No description provided for @eveningShutdownTitle.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق اليوم'**
  String get eveningShutdownTitle;

  /// No description provided for @weekMomentum.
  ///
  /// In ar, this message translates to:
  /// **'زخم\nالأسبوع'**
  String get weekMomentum;

  /// No description provided for @weekMomentumOneLine.
  ///
  /// In ar, this message translates to:
  /// **'زخم الأسبوع'**
  String get weekMomentumOneLine;

  /// No description provided for @momentum.
  ///
  /// In ar, this message translates to:
  /// **'الزخم'**
  String get momentum;

  /// No description provided for @dayReady.
  ///
  /// In ar, this message translates to:
  /// **'يومك جاهز'**
  String get dayReady;

  /// No description provided for @dayReadySubGreen.
  ///
  /// In ar, this message translates to:
  /// **'على قد طاقتك اليوم، ونسخة صغيرة تكفي'**
  String get dayReadySubGreen;

  /// No description provided for @dayReadySubYellow.
  ///
  /// In ar, this message translates to:
  /// **'طاقتك متوسطة — خففنا النسخ اليوم'**
  String get dayReadySubYellow;

  /// No description provided for @dayReadySubRed.
  ///
  /// In ar, this message translates to:
  /// **'يوم هادئ — الحد الأدنى يكفي'**
  String get dayReadySubRed;

  /// No description provided for @dayShapeLabel.
  ///
  /// In ar, this message translates to:
  /// **'شكل يومك'**
  String get dayShapeLabel;

  /// No description provided for @dayProgress.
  ///
  /// In ar, this message translates to:
  /// **'تقدم اليوم'**
  String get dayProgress;

  /// No description provided for @doneOf.
  ///
  /// In ar, this message translates to:
  /// **'{done} من {total}'**
  String doneOf(String done, String total);

  /// No description provided for @tilesCore.
  ///
  /// In ar, this message translates to:
  /// **'أساسية'**
  String get tilesCore;

  /// No description provided for @tilesMaintain.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get tilesMaintain;

  /// No description provided for @tilesJoy.
  ///
  /// In ar, this message translates to:
  /// **'متعة'**
  String get tilesJoy;

  /// No description provided for @coreSection.
  ///
  /// In ar, this message translates to:
  /// **'الأساسيات · {n}'**
  String coreSection(String n);

  /// No description provided for @anyVersionCounts.
  ///
  /// In ar, this message translates to:
  /// **'أي نسخة تُحسب إنجازًا'**
  String get anyVersionCounts;

  /// No description provided for @maintainSection.
  ///
  /// In ar, this message translates to:
  /// **'الصيانة · {n} · خفيفة'**
  String maintainSection(String n);

  /// No description provided for @eveningSection.
  ///
  /// In ar, this message translates to:
  /// **'المساء'**
  String get eveningSection;

  /// No description provided for @freeJoySection.
  ///
  /// In ar, this message translates to:
  /// **'متعة حرة'**
  String get freeJoySection;

  /// No description provided for @freeJoySub.
  ///
  /// In ar, this message translates to:
  /// **'لك بدون شروط — ما تحتاجين تستحقينها'**
  String get freeJoySub;

  /// No description provided for @chainDone.
  ///
  /// In ar, this message translates to:
  /// **'اكتملت · {done} من {total} · بدأت {time}'**
  String chainDone(String done, String total, String time);

  /// No description provided for @chainProgress.
  ///
  /// In ar, this message translates to:
  /// **'{done} من {total} · تبدأ {time}'**
  String chainProgress(String done, String total, String time);

  /// No description provided for @openChain.
  ///
  /// In ar, this message translates to:
  /// **'فتح {title}'**
  String openChain(String title);

  /// No description provided for @checkLabel.
  ///
  /// In ar, this message translates to:
  /// **'تم: {title}'**
  String checkLabel(String title);

  /// No description provided for @uncheckLabel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء إنجاز {title}'**
  String uncheckLabel(String title);

  /// No description provided for @joyCheckLabel.
  ///
  /// In ar, this message translates to:
  /// **'استمتعت: {title}'**
  String joyCheckLabel(String title);

  /// No description provided for @joyPlus.
  ///
  /// In ar, this message translates to:
  /// **'+ {b}'**
  String joyPlus(String b);

  /// No description provided for @doneLogged.
  ///
  /// In ar, this message translates to:
  /// **'انحسبت — {level}'**
  String doneLogged(String level);

  /// No description provided for @joyLogged.
  ///
  /// In ar, this message translates to:
  /// **'استمتعي — هذي لك'**
  String get joyLogged;

  /// No description provided for @startSession.
  ///
  /// In ar, this message translates to:
  /// **'ابدئي الجلسة'**
  String get startSession;

  /// No description provided for @thisWeekAnyDay.
  ///
  /// In ar, this message translates to:
  /// **'أي يوم'**
  String get thisWeekAnyDay;

  /// No description provided for @recoveryBannerTitle.
  ///
  /// In ar, this message translates to:
  /// **'نعدّل تصميم {title}؟'**
  String recoveryBannerTitle(String title);

  /// No description provided for @recoveryBannerSub.
  ///
  /// In ar, this message translates to:
  /// **'ما مشى الحال كم مرة — نعدّل التصميم، مو نلومك'**
  String get recoveryBannerSub;

  /// No description provided for @calmDayTitle.
  ///
  /// In ar, this message translates to:
  /// **'يوم هادئ'**
  String get calmDayTitle;

  /// No description provided for @calmDayBody.
  ///
  /// In ar, this message translates to:
  /// **'أشياء صغيرة ومتعة لك — هذا يكفي تمامًا. الباقي يرتاح اليوم بدون ما ينقص شي.'**
  String get calmDayBody;

  /// No description provided for @minimumOnly.
  ///
  /// In ar, this message translates to:
  /// **'الحد الأدنى فقط · {done} من {total}'**
  String minimumOnly(String done, String total);

  /// No description provided for @restingNote.
  ///
  /// In ar, this message translates to:
  /// **'{items} ترتاح اليوم. يوم هادئ مو تراجع — ولا شي يرجع للصفر.'**
  String restingNote(String items);

  /// No description provided for @helpLinkRed.
  ///
  /// In ar, this message translates to:
  /// **'إذا الأمور ثقيلة جدًا: المساعدة موجودة'**
  String get helpLinkRed;

  /// No description provided for @helpIntro.
  ///
  /// In ar, this message translates to:
  /// **'إذا حسيتي إن الأمور أثقل من المعتاد لفترة، الحديث مع مختص خطوة قوية. هذا التطبيق ما يشخّص ولا يتابع حالتك النفسية.'**
  String get helpIntro;

  /// No description provided for @helpNote.
  ///
  /// In ar, this message translates to:
  /// **'في الطوارئ اتصلي مباشرة.'**
  String get helpNote;

  /// No description provided for @quickAddTitle.
  ///
  /// In ar, this message translates to:
  /// **'إضافة سريعة'**
  String get quickAddTitle;

  /// No description provided for @quickAddHabit.
  ///
  /// In ar, this message translates to:
  /// **'عادة جديدة'**
  String get quickAddHabit;

  /// No description provided for @quickAddHabitSub.
  ///
  /// In ar, this message translates to:
  /// **'نصممها خطوة خطوة في الاستوديو'**
  String get quickAddHabitSub;

  /// No description provided for @quickAddBlock.
  ///
  /// In ar, this message translates to:
  /// **'موعد ثابت اليوم'**
  String get quickAddBlock;

  /// No description provided for @quickAddBlockSub.
  ///
  /// In ar, this message translates to:
  /// **'الخطة تتكيف حول وقتك'**
  String get quickAddBlockSub;

  /// No description provided for @quickAddFocus.
  ///
  /// In ar, this message translates to:
  /// **'جلسة تركيز الآن'**
  String get quickAddFocus;

  /// No description provided for @quickAddFocusSub.
  ///
  /// In ar, this message translates to:
  /// **'مؤقت وتنبيهات صامتة'**
  String get quickAddFocusSub;

  /// No description provided for @blockTitleHint.
  ///
  /// In ar, this message translates to:
  /// **'وش الموعد؟ مثلًا: محاضرة'**
  String get blockTitleHint;

  /// No description provided for @startsAt.
  ///
  /// In ar, this message translates to:
  /// **'تبدأ {t}'**
  String startsAt(String t);

  /// No description provided for @coreHabit.
  ///
  /// In ar, this message translates to:
  /// **'عادة أساسية'**
  String get coreHabit;

  /// No description provided for @maintainHabit.
  ///
  /// In ar, this message translates to:
  /// **'عادة صيانة'**
  String get maintainHabit;

  /// No description provided for @growthStage.
  ///
  /// In ar, this message translates to:
  /// **'مرحلة النمو'**
  String get growthStage;

  /// No description provided for @last4Weeks.
  ///
  /// In ar, this message translates to:
  /// **'آخر 4 أسابيع'**
  String get last4Weeks;

  /// No description provided for @legendFull.
  ///
  /// In ar, this message translates to:
  /// **'كامل'**
  String get legendFull;

  /// No description provided for @legendMin.
  ///
  /// In ar, this message translates to:
  /// **'أدنى'**
  String get legendMin;

  /// No description provided for @legendRest.
  ///
  /// In ar, this message translates to:
  /// **'راحة'**
  String get legendRest;

  /// No description provided for @gridSummary.
  ///
  /// In ar, this message translates to:
  /// **'أنجزتيها {n} مرة في آخر 4 أسابيع'**
  String gridSummary(String n);

  /// No description provided for @designSection.
  ///
  /// In ar, this message translates to:
  /// **'التصميم'**
  String get designSection;

  /// No description provided for @fieldCue.
  ///
  /// In ar, this message translates to:
  /// **'الإشارة'**
  String get fieldCue;

  /// No description provided for @fieldVersions.
  ///
  /// In ar, this message translates to:
  /// **'النسخ'**
  String get fieldVersions;

  /// No description provided for @fieldIfThen.
  ///
  /// In ar, this message translates to:
  /// **'إذا... فإني'**
  String get fieldIfThen;

  /// No description provided for @fieldEasy.
  ///
  /// In ar, this message translates to:
  /// **'أسهّلها'**
  String get fieldEasy;

  /// No description provided for @fieldJoy.
  ///
  /// In ar, this message translates to:
  /// **'المتعة'**
  String get fieldJoy;

  /// No description provided for @minimumIs.
  ///
  /// In ar, this message translates to:
  /// **'النسخة الصغيرة:'**
  String get minimumIs;

  /// No description provided for @doseLabel.
  ///
  /// In ar, this message translates to:
  /// **'الجرعة حسب المصدر'**
  String get doseLabel;

  /// No description provided for @sourceLanguageNote.
  ///
  /// In ar, this message translates to:
  /// **'نص الدليل بلغته الأصلية (الإنجليزية).'**
  String get sourceLanguageNote;

  /// No description provided for @sourcesCount.
  ///
  /// In ar, this message translates to:
  /// **'المصادر · {n}'**
  String sourcesCount(String n);

  /// No description provided for @openSource.
  ///
  /// In ar, this message translates to:
  /// **'فتح المصدر'**
  String get openSource;

  /// No description provided for @linkOpenFailed.
  ///
  /// In ar, this message translates to:
  /// **'ما قدرنا نفتح الرابط'**
  String get linkOpenFailed;

  /// No description provided for @noEvidenceLinked.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه دليل مربوط بهذا العنصر.'**
  String get noEvidenceLinked;

  /// No description provided for @evidenceGuideline.
  ///
  /// In ar, this message translates to:
  /// **'دليل قوي · إرشادات رسمية'**
  String get evidenceGuideline;

  /// No description provided for @evidenceSrMa.
  ///
  /// In ar, this message translates to:
  /// **'دليل قوي · مراجعة منهجية'**
  String get evidenceSrMa;

  /// No description provided for @evidenceRct.
  ///
  /// In ar, this message translates to:
  /// **'دليل جيد · تجارب مضبوطة'**
  String get evidenceRct;

  /// No description provided for @evidenceObservational.
  ///
  /// In ar, this message translates to:
  /// **'دليل متوسط · رصدي'**
  String get evidenceObservational;

  /// No description provided for @evidenceExpert.
  ///
  /// In ar, this message translates to:
  /// **'رأي خبراء'**
  String get evidenceExpert;

  /// No description provided for @editHabitDesign.
  ///
  /// In ar, this message translates to:
  /// **'عدّلي تصميم العادة'**
  String get editHabitDesign;

  /// No description provided for @markDoneMinimum.
  ///
  /// In ar, this message translates to:
  /// **'سجّليها منجزة (نسخة صغيرة)'**
  String get markDoneMinimum;

  /// No description provided for @evidenceLibrary.
  ///
  /// In ar, this message translates to:
  /// **'مكتبة الأدلة'**
  String get evidenceLibrary;

  /// No description provided for @briefQuestion.
  ///
  /// In ar, this message translates to:
  /// **'كيف طاقتك اليوم؟ اختاري وحدة، والخطة تتكيّف معك.'**
  String get briefQuestion;

  /// No description provided for @shapeLine.
  ///
  /// In ar, this message translates to:
  /// **'{core} أساسية · {maintain} صيانة · {joy} متعة'**
  String shapeLine(String core, String maintain, String joy);

  /// No description provided for @shapeRed.
  ///
  /// In ar, this message translates to:
  /// **'{n} أشياء صغيرة + متعة'**
  String shapeRed(String n);

  /// No description provided for @shapeSubGreen.
  ///
  /// In ar, this message translates to:
  /// **'خطتك العادية، ولكل عادة نسخة صغيرة إذا احتجتيها.'**
  String get shapeSubGreen;

  /// No description provided for @shapeSubYellow.
  ///
  /// In ar, this message translates to:
  /// **'نسخ أخف وعادتين أساسيتين كحد أقصى.'**
  String get shapeSubYellow;

  /// No description provided for @shapeSubRed.
  ///
  /// In ar, this message translates to:
  /// **'الأساسيات بأصغر نسخة ومتعة لك — بدون ذنب.'**
  String get shapeSubRed;

  /// No description provided for @firstStep.
  ///
  /// In ar, this message translates to:
  /// **'أول خطوة'**
  String get firstStep;

  /// No description provided for @startMyDay.
  ///
  /// In ar, this message translates to:
  /// **'ابدئي يومي'**
  String get startMyDay;

  /// No description provided for @startMorningChainNow.
  ///
  /// In ar, this message translates to:
  /// **'شغّلي سلسلة الصباح مباشرة'**
  String get startMorningChainNow;

  /// No description provided for @chainComplete.
  ///
  /// In ar, this message translates to:
  /// **'اكتملت السلسلة'**
  String get chainComplete;

  /// No description provided for @chainCompleteTitle.
  ///
  /// In ar, this message translates to:
  /// **'{title} — اكتملت'**
  String chainCompleteTitle(String title);

  /// No description provided for @chainCompleteSub.
  ///
  /// In ar, this message translates to:
  /// **'سلسلة كاملة بدون تفكير — هذا بالضبط اللي نبنيه.'**
  String get chainCompleteSub;

  /// No description provided for @timeLeft.
  ///
  /// In ar, this message translates to:
  /// **'باقي {t}'**
  String timeLeft(String t);

  /// No description provided for @stepsLabel.
  ///
  /// In ar, this message translates to:
  /// **'الخطوات'**
  String get stepsLabel;

  /// No description provided for @currentStep.
  ///
  /// In ar, this message translates to:
  /// **'الحالية'**
  String get currentStep;

  /// No description provided for @doneNext.
  ///
  /// In ar, this message translates to:
  /// **'تم، التالي: {next}'**
  String doneNext(String next);

  /// No description provided for @doneFinish.
  ///
  /// In ar, this message translates to:
  /// **'تم، أنهي السلسلة'**
  String get doneFinish;

  /// No description provided for @skipStepToday.
  ///
  /// In ar, this message translates to:
  /// **'تخطّي هذه الخطوة اليوم'**
  String get skipStepToday;

  /// No description provided for @focusSession.
  ///
  /// In ar, this message translates to:
  /// **'جلسة تركيز'**
  String get focusSession;

  /// No description provided for @freeFocusTitle.
  ///
  /// In ar, this message translates to:
  /// **'جلسة تركيز حرة'**
  String get freeFocusTitle;

  /// No description provided for @nudgesSilenced.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات صامتة'**
  String get nudgesSilenced;

  /// No description provided for @remaining.
  ///
  /// In ar, this message translates to:
  /// **'متبقي'**
  String get remaining;

  /// No description provided for @readyWhenYouAre.
  ///
  /// In ar, this message translates to:
  /// **'جاهزة لما تكونين جاهزة'**
  String get readyWhenYouAre;

  /// No description provided for @sessionLength.
  ///
  /// In ar, this message translates to:
  /// **'مدة الجلسة'**
  String get sessionLength;

  /// No description provided for @attemptFirstTitle.
  ///
  /// In ar, this message translates to:
  /// **'حاولي أولًا ثم اسألي الذكاء الاصطناعي'**
  String get attemptFirstTitle;

  /// No description provided for @attemptFirstBody.
  ///
  /// In ar, this message translates to:
  /// **'اكتبي محاولتك ولو ناقصة — المحاولة قبل الجواب تثبّت الفهم.'**
  String get attemptFirstBody;

  /// No description provided for @attemptHint.
  ///
  /// In ar, this message translates to:
  /// **'محاولتي...'**
  String get attemptHint;

  /// No description provided for @phoneAwayTitle.
  ///
  /// In ar, this message translates to:
  /// **'بعّدي الجوال عنك'**
  String get phoneAwayTitle;

  /// No description provided for @phoneAwayBody.
  ///
  /// In ar, this message translates to:
  /// **'في غرفة ثانية أو بالشنطة — مو على الطاولة.'**
  String get phoneAwayBody;

  /// No description provided for @phoneAwayAction.
  ///
  /// In ar, this message translates to:
  /// **'بعّدته'**
  String get phoneAwayAction;

  /// No description provided for @phoneAwayDone.
  ///
  /// In ar, this message translates to:
  /// **'بعيد'**
  String get phoneAwayDone;

  /// No description provided for @endSession.
  ///
  /// In ar, this message translates to:
  /// **'إنهاء الجلسة'**
  String get endSession;

  /// No description provided for @leaveFocusTitle.
  ///
  /// In ar, this message translates to:
  /// **'ننهي الجلسة؟'**
  String get leaveFocusTitle;

  /// No description provided for @leaveFocusBody.
  ///
  /// In ar, this message translates to:
  /// **'نحفظ الوقت اللي اشتغلتيه — حتى الجلسة القصيرة تُحسب.'**
  String get leaveFocusBody;

  /// No description provided for @keepGoing.
  ///
  /// In ar, this message translates to:
  /// **'أكمل'**
  String get keepGoing;

  /// No description provided for @sessionDoneTitle.
  ///
  /// In ar, this message translates to:
  /// **'خلصت الجلسة'**
  String get sessionDoneTitle;

  /// No description provided for @recallPrompt.
  ///
  /// In ar, this message translates to:
  /// **'بدون ما تشوفين ملاحظاتك: وش أهم شي تتذكرينه من الجلسة؟'**
  String get recallPrompt;

  /// No description provided for @recallHint.
  ///
  /// In ar, this message translates to:
  /// **'3 أشياء تتذكرينها...'**
  String get recallHint;

  /// No description provided for @recallWhy.
  ///
  /// In ar, this message translates to:
  /// **'الاسترجاع بعد الدراسة يثبّت التعلم أكثر من إعادة القراءة.'**
  String get recallWhy;

  /// No description provided for @sessionNotePrompt.
  ///
  /// In ar, this message translates to:
  /// **'كلمة عن الجلسة؟ (اختياري)'**
  String get sessionNotePrompt;

  /// No description provided for @sessionNoteHint.
  ///
  /// In ar, this message translates to:
  /// **'وش أنجزتي؟'**
  String get sessionNoteHint;

  /// No description provided for @saveSession.
  ///
  /// In ar, this message translates to:
  /// **'احفظي الجلسة'**
  String get saveSession;

  /// No description provided for @discardSession.
  ///
  /// In ar, this message translates to:
  /// **'بدون حفظ'**
  String get discardSession;

  /// No description provided for @recoveryQuestion.
  ///
  /// In ar, this message translates to:
  /// **'ليش ما مشى الحال؟'**
  String get recoveryQuestion;

  /// No description provided for @recoverySub.
  ///
  /// In ar, this message translates to:
  /// **'نعدّل التصميم، مو نلومك. اختاري اللي ينطبق.'**
  String get recoverySub;

  /// No description provided for @recoveryContext.
  ///
  /// In ar, this message translates to:
  /// **'{title} · آخر {n} مرات ما صارت'**
  String recoveryContext(String title, String n);

  /// No description provided for @proposedChange.
  ///
  /// In ar, this message translates to:
  /// **'تعديل مقترح'**
  String get proposedChange;

  /// No description provided for @before.
  ///
  /// In ar, this message translates to:
  /// **'قبل'**
  String get before;

  /// No description provided for @after.
  ///
  /// In ar, this message translates to:
  /// **'بعد'**
  String get after;

  /// No description provided for @afterShrink.
  ///
  /// In ar, this message translates to:
  /// **'{desc} — والباقي إضافي إذا حبّيتي'**
  String afterShrink(String desc);

  /// No description provided for @afterJoy.
  ///
  /// In ar, this message translates to:
  /// **'نربطها بمتعة تختارينها'**
  String get afterJoy;

  /// No description provided for @afterPlace.
  ///
  /// In ar, this message translates to:
  /// **'مكان مجهّز مسبقًا'**
  String get afterPlace;

  /// No description provided for @afterRest.
  ///
  /// In ar, this message translates to:
  /// **'ترتاح هذا الموسم — ترجع لما تبين'**
  String get afterRest;

  /// No description provided for @oneReminderOn.
  ///
  /// In ar, this message translates to:
  /// **'تذكير واحد'**
  String get oneReminderOn;

  /// No description provided for @daysPerWeek.
  ///
  /// In ar, this message translates to:
  /// **'{n} أيام بالأسبوع'**
  String daysPerWeek(String n);

  /// No description provided for @joyPairingHint.
  ///
  /// In ar, this message translates to:
  /// **'وش المتعة اللي تبينها معها؟'**
  String get joyPairingHint;

  /// No description provided for @placeHint.
  ///
  /// In ar, this message translates to:
  /// **'وين المكان الأنسب؟ وش نجهّز؟'**
  String get placeHint;

  /// No description provided for @acceptChange.
  ///
  /// In ar, this message translates to:
  /// **'اعتمدي التعديل'**
  String get acceptChange;

  /// No description provided for @editMyself.
  ///
  /// In ar, this message translates to:
  /// **'أعدّله بنفسي'**
  String get editMyself;

  /// No description provided for @recoveryDoneBody.
  ///
  /// In ar, this message translates to:
  /// **'التصميم الجديد جاهز، وأول مرة ترجعين لها تاخذين شرارات مضاعفة.'**
  String get recoveryDoneBody;

  /// No description provided for @shutdownTitle.
  ///
  /// In ar, this message translates to:
  /// **'نقفل اليوم بهدوء'**
  String get shutdownTitle;

  /// No description provided for @shutdownDone.
  ///
  /// In ar, this message translates to:
  /// **'أنجزتي {done} من {total} — يوم حلو.'**
  String shutdownDone(String done, String total);

  /// No description provided for @whatHappened.
  ///
  /// In ar, this message translates to:
  /// **'اللي ما صار اليوم'**
  String get whatHappened;

  /// No description provided for @whatHappenedSub.
  ///
  /// In ar, this message translates to:
  /// **'قرار سريع لكل وحدة، وبعدها تطلع من بالك.'**
  String get whatHappenedSub;

  /// No description provided for @noLeftovers.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه شي معلّق — كل شي انحسب اليوم.'**
  String get noLeftovers;

  /// No description provided for @notStartedToday.
  ///
  /// In ar, this message translates to:
  /// **'ما بدأت اليوم'**
  String get notStartedToday;

  /// No description provided for @leftoverTomorrow.
  ///
  /// In ar, this message translates to:
  /// **'بكرة'**
  String get leftoverTomorrow;

  /// No description provided for @leftoverLater.
  ///
  /// In ar, this message translates to:
  /// **'لاحقًا'**
  String get leftoverLater;

  /// No description provided for @leftoverLetGo.
  ///
  /// In ar, this message translates to:
  /// **'نتركها'**
  String get leftoverLetGo;

  /// No description provided for @leftoverTomorrowSub.
  ///
  /// In ar, this message translates to:
  /// **'تنتقل لبكرة'**
  String get leftoverTomorrowSub;

  /// No description provided for @leftoverLaterSub.
  ///
  /// In ar, this message translates to:
  /// **'ترجع في يومها القادم'**
  String get leftoverLaterSub;

  /// No description provided for @leftoverLetGoSub.
  ///
  /// In ar, this message translates to:
  /// **'نتركها — عادي'**
  String get leftoverLetGoSub;

  /// No description provided for @tomorrowFirst.
  ///
  /// In ar, this message translates to:
  /// **'أول خطوة بكرة'**
  String get tomorrowFirst;

  /// No description provided for @minimumMinutes.
  ///
  /// In ar, this message translates to:
  /// **'أدنى {m}'**
  String minimumMinutes(String m);

  /// No description provided for @sweetMoment.
  ///
  /// In ar, this message translates to:
  /// **'لحظة حلوة اليوم'**
  String get sweetMoment;

  /// No description provided for @sweetMomentHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: القهوة مع الكتاب العصر'**
  String get sweetMomentHint;

  /// No description provided for @eveningChainTitle.
  ///
  /// In ar, this message translates to:
  /// **'سلسلة المساء'**
  String get eveningChainTitle;

  /// No description provided for @chainAbout.
  ///
  /// In ar, this message translates to:
  /// **'نحو {min} د · النوم {sleep}'**
  String chainAbout(String min, String sleep);

  /// No description provided for @startEveningChain.
  ///
  /// In ar, this message translates to:
  /// **'ابدئي سلسلة المساء'**
  String get startEveningChain;

  /// No description provided for @closeTheDay.
  ///
  /// In ar, this message translates to:
  /// **'أقفلي اليوم'**
  String get closeTheDay;

  /// No description provided for @onbStart.
  ///
  /// In ar, this message translates to:
  /// **'يلا نبدأ'**
  String get onbStart;

  /// No description provided for @onbFinish.
  ///
  /// In ar, this message translates to:
  /// **'يومي الأول جاهز'**
  String get onbFinish;

  /// No description provided for @onbWelcomeTitle.
  ///
  /// In ar, this message translates to:
  /// **'يومك يكون جاهز\nقبل ما تصحين'**
  String get onbWelcomeTitle;

  /// No description provided for @onbWelcomeBody.
  ///
  /// In ar, this message translates to:
  /// **'أرتّب لك اليوم: وش تسوين، ومتى، وأصغر نسخة منه — ومعه شي تحبينه.'**
  String get onbWelcomeBody;

  /// No description provided for @onbF1Title.
  ///
  /// In ar, this message translates to:
  /// **'نسخة صغيرة تكفي'**
  String get onbF1Title;

  /// No description provided for @onbF1Sub.
  ///
  /// In ar, this message translates to:
  /// **'لكل عادة حد أدنى، ويُحسب إنجازًا كاملًا.'**
  String get onbF1Sub;

  /// No description provided for @onbF2Title.
  ///
  /// In ar, this message translates to:
  /// **'المتعة جزء من الخطة'**
  String get onbF2Title;

  /// No description provided for @onbF2Sub.
  ///
  /// In ar, this message translates to:
  /// **'نربط اللي لازم يصير باللي تحبينه.'**
  String get onbF2Sub;

  /// No description provided for @onbF3Title.
  ///
  /// In ar, this message translates to:
  /// **'التعثّر معلومة، مو حكم'**
  String get onbF3Title;

  /// No description provided for @onbF3Sub.
  ///
  /// In ar, this message translates to:
  /// **'إذا ما مشى الحال، نعدّل التصميم مو نلومك.'**
  String get onbF3Sub;

  /// No description provided for @onbLocalOnly.
  ///
  /// In ar, this message translates to:
  /// **'بياناتك كلها على جهازك فقط'**
  String get onbLocalOnly;

  /// No description provided for @onbUseSample.
  ///
  /// In ar, this message translates to:
  /// **'استخدمي الملف التجريبي'**
  String get onbUseSample;

  /// No description provided for @lifeMapTitle.
  ///
  /// In ar, this message translates to:
  /// **'خريطة حياتك لهذا الموسم'**
  String get lifeMapTitle;

  /// No description provided for @lifeMapBody.
  ///
  /// In ar, this message translates to:
  /// **'الموسم من 6 إلى 12 أسبوع. اختاري لكل مجال: نمو، صيانة، أو راحة.'**
  String get lifeMapBody;

  /// No description provided for @lifeMapHint.
  ///
  /// In ar, this message translates to:
  /// **'النمو = تركيز هذا الموسم. الراحة مو إهمال — إيقاف مؤقت، ويختفي من يومك.'**
  String get lifeMapHint;

  /// No description provided for @stateGrow.
  ///
  /// In ar, this message translates to:
  /// **'نمو'**
  String get stateGrow;

  /// No description provided for @stateMaintain.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get stateMaintain;

  /// No description provided for @stateRest.
  ///
  /// In ar, this message translates to:
  /// **'راحة'**
  String get stateRest;

  /// No description provided for @capacityReached.
  ///
  /// In ar, this message translates to:
  /// **'وصلتي الحد لهذا الموسم — بدّلي مجال ثاني أول.'**
  String get capacityReached;

  /// No description provided for @sensitiveModulesNote.
  ///
  /// In ar, this message translates to:
  /// **'صحة المرأة وتتبّع الدورة مقفلة افتراضيًا — تقدرين تفعّلينها من الإعدادات.'**
  String get sensitiveModulesNote;

  /// No description provided for @timesTitle.
  ///
  /// In ar, this message translates to:
  /// **'متى يبدأ يومك وينتهي؟'**
  String get timesTitle;

  /// No description provided for @timesBody.
  ///
  /// In ar, this message translates to:
  /// **'نربط العادات بإشارات ثابتة من يومك، مو بساعة عشوائية.'**
  String get timesBody;

  /// No description provided for @wakeTime.
  ///
  /// In ar, this message translates to:
  /// **'الاستيقاظ'**
  String get wakeTime;

  /// No description provided for @sleepTime.
  ///
  /// In ar, this message translates to:
  /// **'النوم'**
  String get sleepTime;

  /// No description provided for @tapToChange.
  ///
  /// In ar, this message translates to:
  /// **'اضغطي للتغيير'**
  String get tapToChange;

  /// No description provided for @prayerAnchors.
  ///
  /// In ar, this message translates to:
  /// **'أوقات الصلاة كإشارات'**
  String get prayerAnchors;

  /// No description provided for @prayerAnchorsSub.
  ///
  /// In ar, this message translates to:
  /// **'اختياري · أم القرى · مكة المكرمة — تقدرين تغيّرينها لاحقًا'**
  String get prayerAnchorsSub;

  /// No description provided for @timesPreview.
  ///
  /// In ar, this message translates to:
  /// **'روتين الصباح يبدأ {wake}، وإغلاق اليوم حوالي {shutdown}.'**
  String timesPreview(String wake, String shutdown);

  /// No description provided for @starterTitle.
  ///
  /// In ar, this message translates to:
  /// **'عادات البداية'**
  String get starterTitle;

  /// No description provided for @starterBody.
  ///
  /// In ar, this message translates to:
  /// **'اختاري لين 5 من مجالات النمو — نبدأ صغير ونكبر بهدوء.'**
  String get starterBody;

  /// No description provided for @joyMapTitle.
  ///
  /// In ar, this message translates to:
  /// **'خريطة متعتك'**
  String get joyMapTitle;

  /// No description provided for @joyMapBody.
  ///
  /// In ar, this message translates to:
  /// **'وش يفرّحك؟ اختاري كل اللي ينطبق — ما فيه إجابة غلط.'**
  String get joyMapBody;

  /// No description provided for @somethingElse.
  ///
  /// In ar, this message translates to:
  /// **'شي ثاني'**
  String get somethingElse;

  /// No description provided for @somethingElseHint.
  ///
  /// In ar, this message translates to:
  /// **'وش يفرّحك؟'**
  String get somethingElseHint;

  /// No description provided for @shoppingNote.
  ///
  /// In ar, this message translates to:
  /// **'التسوّق يظهر معه تذكير لطيف بالميزانية.'**
  String get shoppingNote;

  /// No description provided for @bundlesTitle.
  ///
  /// In ar, this message translates to:
  /// **'باقات: متعة محجوزة لعادة'**
  String get bundlesTitle;

  /// No description provided for @bundlesBody.
  ///
  /// In ar, this message translates to:
  /// **'شي تحبينه تخلينه لوقت عادة — بدون أقفال.'**
  String get bundlesBody;

  /// No description provided for @privacyTitle.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات والخصوصية'**
  String get privacyTitle;

  /// No description provided for @privacyBody.
  ///
  /// In ar, this message translates to:
  /// **'قليل من التنبيهات، وكلها مرتبطة بإشارات يومك.'**
  String get privacyBody;

  /// No description provided for @notifCapTitle.
  ///
  /// In ar, this message translates to:
  /// **'حد التنبيهات اليومي'**
  String get notifCapTitle;

  /// No description provided for @notifCapSub.
  ///
  /// In ar, this message translates to:
  /// **'بدون تنبيهات بين {start} و{end}'**
  String notifCapSub(String start, String end);

  /// No description provided for @perDay.
  ///
  /// In ar, this message translates to:
  /// **'{n} باليوم'**
  String perDay(String n);

  /// No description provided for @allowNotifications.
  ///
  /// In ar, this message translates to:
  /// **'اسمحي بالتنبيهات'**
  String get allowNotifications;

  /// No description provided for @notificationsAllowed.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات مسموحة'**
  String get notificationsAllowed;

  /// No description provided for @notificationsNotAllowed.
  ///
  /// In ar, this message translates to:
  /// **'ما انسمح — تقدرين تغيّرينه من إعدادات الجهاز'**
  String get notificationsNotAllowed;

  /// No description provided for @notificationsWebNote.
  ///
  /// In ar, this message translates to:
  /// **'في نسخة المعاينة على الويب ما فيه تنبيهات.'**
  String get notificationsWebNote;

  /// No description provided for @appLockTitle.
  ///
  /// In ar, this message translates to:
  /// **'قفل التطبيق'**
  String get appLockTitle;

  /// No description provided for @appLockSub.
  ///
  /// In ar, this message translates to:
  /// **'Face ID للأقسام الحساسة'**
  String get appLockSub;

  /// No description provided for @privacyPoint1.
  ///
  /// In ar, this message translates to:
  /// **'كل بياناتك على جهازك — بدون حساب ولا سيرفر.'**
  String get privacyPoint1;

  /// No description provided for @privacyPoint2.
  ///
  /// In ar, this message translates to:
  /// **'بدون تحليلات ولا تتبّع.'**
  String get privacyPoint2;

  /// No description provided for @privacyPoint3.
  ///
  /// In ar, this message translates to:
  /// **'تصدير أو حذف كل شي من الإعدادات بأي وقت.'**
  String get privacyPoint3;

  /// No description provided for @studioTitle.
  ///
  /// In ar, this message translates to:
  /// **'استوديو العادات'**
  String get studioTitle;

  /// No description provided for @studioSub.
  ///
  /// In ar, this message translates to:
  /// **'نصمّم العادة خطوة خطوة — واضحة، سهلة البداية، وممتعة.'**
  String get studioSub;

  /// No description provided for @studioStepOf.
  ///
  /// In ar, this message translates to:
  /// **'الخطوة {n} من {total}'**
  String studioStepOf(String n, String total);

  /// No description provided for @fromLibrary.
  ///
  /// In ar, this message translates to:
  /// **'مقترح من مكتبة الأدلة'**
  String get fromLibrary;

  /// No description provided for @fromLibrarySub.
  ///
  /// In ar, this message translates to:
  /// **'{name} — عبّأنا الحقول، عدّلي اللي تبين.'**
  String fromLibrarySub(String name);

  /// No description provided for @noLibraryLink.
  ///
  /// In ar, this message translates to:
  /// **'اختاري إجراء من المكتبة لتعبئة الحقول'**
  String get noLibraryLink;

  /// No description provided for @searchLibrary.
  ///
  /// In ar, this message translates to:
  /// **'ابحثي في المكتبة'**
  String get searchLibrary;

  /// No description provided for @fGoal.
  ///
  /// In ar, this message translates to:
  /// **'الهدف'**
  String get fGoal;

  /// No description provided for @fBehavior.
  ///
  /// In ar, this message translates to:
  /// **'السلوك'**
  String get fBehavior;

  /// No description provided for @fVersions.
  ///
  /// In ar, this message translates to:
  /// **'النسخ: أدنى · عادي · إضافي'**
  String get fVersions;

  /// No description provided for @fCue.
  ///
  /// In ar, this message translates to:
  /// **'الإشارة'**
  String get fCue;

  /// No description provided for @fPrepare.
  ///
  /// In ar, this message translates to:
  /// **'التحضير'**
  String get fPrepare;

  /// No description provided for @fJoy.
  ///
  /// In ar, this message translates to:
  /// **'ربط بمتعة'**
  String get fJoy;

  /// No description provided for @fIfThen.
  ///
  /// In ar, this message translates to:
  /// **'خطة إذا... فإني'**
  String get fIfThen;

  /// No description provided for @fFrictionUp.
  ///
  /// In ar, this message translates to:
  /// **'صعّبي المُغري'**
  String get fFrictionUp;

  /// No description provided for @fReminder.
  ///
  /// In ar, this message translates to:
  /// **'التذكير'**
  String get fReminder;

  /// No description provided for @goalEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ليش هذي العادة مهمة لك؟'**
  String get goalEmpty;

  /// No description provided for @goalHelp.
  ///
  /// In ar, this message translates to:
  /// **'بكلماتك: وش تبين يصير لما تثبت العادة؟'**
  String get goalHelp;

  /// No description provided for @goalHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: أرفع درجتي في IELTS'**
  String get goalHint;

  /// No description provided for @behaviorHelp.
  ///
  /// In ar, this message translates to:
  /// **'سلوك واضح تقدرين تشوفينه — مو نية عامة.'**
  String get behaviorHelp;

  /// No description provided for @behaviorHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: أراجع بطاقات المفردات المستحقة'**
  String get behaviorHint;

  /// No description provided for @behaviorRequired.
  ///
  /// In ar, this message translates to:
  /// **'اكتبي السلوك أول'**
  String get behaviorRequired;

  /// No description provided for @versionsHelp.
  ///
  /// In ar, this message translates to:
  /// **'الأدنى يُحسب إنجازًا كاملًا. خليه صغير لدرجة يصعب ترفضينه.'**
  String get versionsHelp;

  /// No description provided for @versionsSummary.
  ///
  /// In ar, this message translates to:
  /// **'أدنى {min} · عادي {normal} · إضافي {bonus}'**
  String versionsSummary(String min, String normal, String bonus);

  /// No description provided for @cueHelp.
  ///
  /// In ar, this message translates to:
  /// **'بعد وش؟ اربطيها بشي يصير كل يوم.'**
  String get cueHelp;

  /// No description provided for @cueTextHint.
  ///
  /// In ar, this message translates to:
  /// **'وصف الإشارة بكلماتك'**
  String get cueTextHint;

  /// No description provided for @onDays.
  ///
  /// In ar, this message translates to:
  /// **'الأيام'**
  String get onDays;

  /// No description provided for @prepareHelp.
  ///
  /// In ar, this message translates to:
  /// **'وش تجهّزين مسبقًا عشان البداية تكون بدون تفكير؟'**
  String get prepareHelp;

  /// No description provided for @joyHelp.
  ///
  /// In ar, this message translates to:
  /// **'وش تحبين يرافقها؟ متعة تخلينها لوقتها بس.'**
  String get joyHelp;

  /// No description provided for @ifThenHelp.
  ///
  /// In ar, this message translates to:
  /// **'وش ممكن يعطّلك؟ وش بتسوين وقتها؟'**
  String get ifThenHelp;

  /// No description provided for @ifThenHint.
  ///
  /// In ar, this message translates to:
  /// **'إذا ... فإني ...'**
  String get ifThenHint;

  /// No description provided for @frictionUpHelp.
  ///
  /// In ar, this message translates to:
  /// **'وش المغري اللي ينافسها؟ كيف نبعده خطوة؟'**
  String get frictionUpHelp;

  /// No description provided for @reminderHelp.
  ///
  /// In ar, this message translates to:
  /// **'تذكير واحد كحد أقصى، مرتبط بالإشارة. الأفضل إن السلسلة تكفي.'**
  String get reminderHelp;

  /// No description provided for @oneReminderAtCue.
  ///
  /// In ar, this message translates to:
  /// **'تذكير واحد وقت الإشارة'**
  String get oneReminderAtCue;

  /// No description provided for @reminderOn.
  ///
  /// In ar, this message translates to:
  /// **'تذكير واحد وقت الإشارة'**
  String get reminderOn;

  /// No description provided for @reminderOffSummary.
  ///
  /// In ar, this message translates to:
  /// **'بدون تذكير'**
  String get reminderOffSummary;

  /// No description provided for @nextField.
  ///
  /// In ar, this message translates to:
  /// **'التالي: {f}'**
  String nextField(String f);

  /// No description provided for @saveHabit.
  ///
  /// In ar, this message translates to:
  /// **'احفظي العادة'**
  String get saveHabit;

  /// No description provided for @saveAsDraft.
  ///
  /// In ar, this message translates to:
  /// **'احفظيها كمسودة'**
  String get saveAsDraft;

  /// No description provided for @savedHabit.
  ///
  /// In ar, this message translates to:
  /// **'انحفظت العادة — بتظهر في خطتك'**
  String get savedHabit;

  /// No description provided for @savedDraft.
  ///
  /// In ar, this message translates to:
  /// **'انحفظت كمسودة — موقوفة لين تفعّلينها'**
  String get savedDraft;

  /// No description provided for @swapOrParkTitle.
  ///
  /// In ar, this message translates to:
  /// **'نبدّل أو نأجّل؟'**
  String get swapOrParkTitle;

  /// No description provided for @capCoreHabits.
  ///
  /// In ar, this message translates to:
  /// **'عندك {max} عادات أساسية — هذا الحد عشان ما يثقل يومك.'**
  String capCoreHabits(String max);

  /// No description provided for @capGrow.
  ///
  /// In ar, this message translates to:
  /// **'{max} مجالات نمو كحد أقصى في الموسم.'**
  String capGrow(String max);

  /// No description provided for @capMaintain.
  ///
  /// In ar, this message translates to:
  /// **'{max} مجالات صيانة كحد أقصى.'**
  String capMaintain(String max);

  /// No description provided for @capProjects.
  ///
  /// In ar, this message translates to:
  /// **'{max} مشاريع نشطة كحد أقصى.'**
  String capProjects(String max);

  /// No description provided for @capCourses.
  ///
  /// In ar, this message translates to:
  /// **'كورس واحد نشط بكل مرة ({max}).'**
  String capCourses(String max);

  /// No description provided for @swapWith.
  ///
  /// In ar, this message translates to:
  /// **'بدّليها مع:'**
  String get swapWith;

  /// No description provided for @swap.
  ///
  /// In ar, this message translates to:
  /// **'بدّلي'**
  String get swap;

  /// No description provided for @parkIt.
  ///
  /// In ar, this message translates to:
  /// **'أجّليها (موقوفة)'**
  String get parkIt;

  /// No description provided for @placeholderHabits.
  ///
  /// In ar, this message translates to:
  /// **'استوديو العادات، المكتبة، والحديقة — قريبًا هنا.'**
  String get placeholderHabits;

  /// No description provided for @placeholderPath.
  ///
  /// In ar, this message translates to:
  /// **'أهداف السنة والمشاريع والمواسم — قريبًا هنا.'**
  String get placeholderPath;

  /// No description provided for @placeholderJoy.
  ///
  /// In ar, this message translates to:
  /// **'خريطة المتعة والشرارات والمكافآت — قريبًا هنا.'**
  String get placeholderJoy;

  /// No description provided for @placeholderMe.
  ///
  /// In ar, this message translates to:
  /// **'المراجعة الأسبوعية والإعدادات — قريبًا هنا.'**
  String get placeholderMe;

  /// No description provided for @quickPrefs.
  ///
  /// In ar, this message translates to:
  /// **'تفضيلات سريعة'**
  String get quickPrefs;

  /// No description provided for @languageLabel.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get languageLabel;

  /// No description provided for @themeLabel.
  ///
  /// In ar, this message translates to:
  /// **'المظهر'**
  String get themeLabel;

  /// No description provided for @themeSystem.
  ///
  /// In ar, this message translates to:
  /// **'تلقائي'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In ar, this message translates to:
  /// **'فاتح'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In ar, this message translates to:
  /// **'داكن'**
  String get themeDark;

  /// No description provided for @appearancePalettes.
  ///
  /// In ar, this message translates to:
  /// **'لوحة الألوان'**
  String get appearancePalettes;

  /// No description provided for @paletteCalmSky.
  ///
  /// In ar, this message translates to:
  /// **'سماء هادئة'**
  String get paletteCalmSky;

  /// No description provided for @paletteLavender.
  ///
  /// In ar, this message translates to:
  /// **'لافندر'**
  String get paletteLavender;

  /// No description provided for @paletteOcean.
  ///
  /// In ar, this message translates to:
  /// **'محيط'**
  String get paletteOcean;

  /// No description provided for @paletteForest.
  ///
  /// In ar, this message translates to:
  /// **'غابة'**
  String get paletteForest;

  /// No description provided for @paletteRose.
  ///
  /// In ar, this message translates to:
  /// **'وردي داكن'**
  String get paletteRose;

  /// No description provided for @paletteTerracotta.
  ///
  /// In ar, this message translates to:
  /// **'طيني'**
  String get paletteTerracotta;

  /// No description provided for @paletteMidnight.
  ///
  /// In ar, this message translates to:
  /// **'ليلي'**
  String get paletteMidnight;

  /// No description provided for @customAccentColor.
  ///
  /// In ar, this message translates to:
  /// **'لون مخصص'**
  String get customAccentColor;

  /// No description provided for @customColorHint.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رمز اللون مثل #6172B5'**
  String get customColorHint;

  /// No description provided for @applyCustomColor.
  ///
  /// In ar, this message translates to:
  /// **'تطبيق اللون'**
  String get applyCustomColor;

  /// No description provided for @invalidCustomColor.
  ///
  /// In ar, this message translates to:
  /// **'أدخل لونًا صالحًا يحقق وضوحًا كافيًا مع النص الأبيض.'**
  String get invalidCustomColor;

  /// No description provided for @cardStyle.
  ///
  /// In ar, this message translates to:
  /// **'تصميم البطاقات'**
  String get cardStyle;

  /// No description provided for @cardStyleOutlined.
  ///
  /// In ar, this message translates to:
  /// **'محددة'**
  String get cardStyleOutlined;

  /// No description provided for @cardStyleSoft.
  ///
  /// In ar, this message translates to:
  /// **'ناعمة'**
  String get cardStyleSoft;

  /// No description provided for @cardStyleMinimal.
  ///
  /// In ar, this message translates to:
  /// **'بسيطة'**
  String get cardStyleMinimal;

  /// No description provided for @appearancePreview.
  ///
  /// In ar, this message translates to:
  /// **'معاينة المظهر'**
  String get appearancePreview;

  /// No description provided for @previewAction.
  ///
  /// In ar, this message translates to:
  /// **'زر تجريبي'**
  String get previewAction;

  /// No description provided for @resetAppearance.
  ///
  /// In ar, this message translates to:
  /// **'استعادة المظهر الافتراضي'**
  String get resetAppearance;

  /// No description provided for @replayOnboarding.
  ///
  /// In ar, this message translates to:
  /// **'أعيدي التهيئة'**
  String get replayOnboarding;

  /// No description provided for @minutesOf.
  ///
  /// In ar, this message translates to:
  /// **'دقائق {level}'**
  String minutesOf(String level);

  /// No description provided for @partMorning.
  ///
  /// In ar, this message translates to:
  /// **'صباحًا'**
  String get partMorning;

  /// No description provided for @partNoon.
  ///
  /// In ar, this message translates to:
  /// **'ظهرًا'**
  String get partNoon;

  /// No description provided for @partAfternoon.
  ///
  /// In ar, this message translates to:
  /// **'عصرًا'**
  String get partAfternoon;

  /// No description provided for @partEvening.
  ///
  /// In ar, this message translates to:
  /// **'مساءً'**
  String get partEvening;

  /// No description provided for @partNight.
  ///
  /// In ar, this message translates to:
  /// **'ليلًا'**
  String get partNight;

  /// No description provided for @relToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get relToday;

  /// No description provided for @relTomorrow.
  ///
  /// In ar, this message translates to:
  /// **'بكرة'**
  String get relTomorrow;

  /// No description provided for @relIn.
  ///
  /// In ar, this message translates to:
  /// **'بعد {n} يوم'**
  String relIn(String n);

  /// No description provided for @relAgo.
  ///
  /// In ar, this message translates to:
  /// **'قبل {n} يوم'**
  String relAgo(String n);

  /// No description provided for @sar.
  ///
  /// In ar, this message translates to:
  /// **'ر.س'**
  String get sar;

  /// No description provided for @delete.
  ///
  /// In ar, this message translates to:
  /// **'حذف'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل'**
  String get edit;

  /// No description provided for @notEnoughData.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه بيانات كافية بعد — تظهر بعد كم يوم من التسجيل.'**
  String get notEnoughData;

  /// No description provided for @seasonShape.
  ///
  /// In ar, this message translates to:
  /// **'أنمّي {g} مجالات وأحافظ على {m}'**
  String seasonShape(String g, String m);

  /// No description provided for @byDomainMomentum.
  ///
  /// In ar, this message translates to:
  /// **'حسب المجال · الزخم لآخر 7 أيام'**
  String get byDomainMomentum;

  /// No description provided for @maintainNote.
  ///
  /// In ar, this message translates to:
  /// **'{n} عادات في المحافظة: {domains} — نسختها الصغيرة تكفي.'**
  String maintainNote(String n, String domains);

  /// No description provided for @myRoutines.
  ///
  /// In ar, this message translates to:
  /// **'روتيناتي · إشارة وحدة تبدأ السلسلة'**
  String get myRoutines;

  /// No description provided for @newHabit.
  ///
  /// In ar, this message translates to:
  /// **'عادة جديدة'**
  String get newHabit;

  /// No description provided for @coreCapacityNote.
  ///
  /// In ar, this message translates to:
  /// **'عندك {n} عادات أساسية من {max} — باقي {left}.'**
  String coreCapacityNote(String n, String max, String left);

  /// No description provided for @myGarden.
  ///
  /// In ar, this message translates to:
  /// **'حديقتي'**
  String get myGarden;

  /// No description provided for @gardenSub.
  ///
  /// In ar, this message translates to:
  /// **'كل عادة نبتة. تكبر مع التلقائية، وإذا غبتِ عنها ترتاح — ما تذبل.'**
  String get gardenSub;

  /// No description provided for @gardenEmpty.
  ///
  /// In ar, this message translates to:
  /// **'حديقتك تنتظر أول نبتة — أضيفي عادة من الاستوديو.'**
  String get gardenEmpty;

  /// No description provided for @plantResting.
  ///
  /// In ar, this message translates to:
  /// **'ترتاح'**
  String get plantResting;

  /// No description provided for @plantRestingNote.
  ///
  /// In ar, this message translates to:
  /// **'هذي النبتة ترتاح. ترجع تكبر من أول نسخة صغيرة — بدون ما يضيع شي.'**
  String get plantRestingNote;

  /// No description provided for @gardenNoData.
  ///
  /// In ar, this message translates to:
  /// **'بدأت للتو — المرحلة تتضح بعد كم مرة.'**
  String get gardenNoData;

  /// No description provided for @consistencyLine.
  ///
  /// In ar, this message translates to:
  /// **'الثبات {p}٪ في آخر 4 أسابيع.'**
  String consistencyLine(String p);

  /// No description provided for @srbaiLine.
  ///
  /// In ar, this message translates to:
  /// **'التلقائية {v} من 5 في آخر فحص.'**
  String srbaiLine(String v);

  /// No description provided for @noSrbaiYet.
  ///
  /// In ar, this message translates to:
  /// **'فحص التلقائية يصير في المراجعة الأسبوعية.'**
  String get noSrbaiYet;

  /// No description provided for @noCoreHabits.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه عادات أساسية في مجالات النمو الحين.'**
  String get noCoreHabits;

  /// No description provided for @noRoutines.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه روتينات بعد.'**
  String get noRoutines;

  /// No description provided for @stepsCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} خطوات'**
  String stepsCount(String n);

  /// No description provided for @everyDay.
  ///
  /// In ar, this message translates to:
  /// **'يوميًا'**
  String get everyDay;

  /// No description provided for @momentumOf.
  ///
  /// In ar, this message translates to:
  /// **'زخم {title}: {v} من 100'**
  String momentumOf(String title, String v);

  /// No description provided for @pathSub.
  ///
  /// In ar, this message translates to:
  /// **'سنتي: أكتوبر 2026 ← سبتمبر 2027 · خطة مقترحة تعدّلينها متى ما بغيتي'**
  String get pathSub;

  /// No description provided for @weeklyReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة الأسبوع'**
  String get weeklyReview;

  /// No description provided for @yearInQuarters.
  ///
  /// In ar, this message translates to:
  /// **'السنة في 4 أرباع'**
  String get yearInQuarters;

  /// No description provided for @goalsNextStep.
  ///
  /// In ar, this message translates to:
  /// **'أهدافي · وكل هدف له خطوة تالية وحدة'**
  String get goalsNextStep;

  /// No description provided for @seasonLabel.
  ///
  /// In ar, this message translates to:
  /// **'الموسم'**
  String get seasonLabel;

  /// No description provided for @weekN.
  ///
  /// In ar, this message translates to:
  /// **'الأسبوع {n}'**
  String weekN(String n);

  /// No description provided for @weekNofM.
  ///
  /// In ar, this message translates to:
  /// **'الأسبوع {n} من {m}'**
  String weekNofM(String n, String m);

  /// No description provided for @restHidden.
  ///
  /// In ar, this message translates to:
  /// **'مخفي من يومك لين ترجعينه'**
  String get restHidden;

  /// No description provided for @editSeason.
  ///
  /// In ar, this message translates to:
  /// **'تعديل الموسم'**
  String get editSeason;

  /// No description provided for @seasonEditorSub.
  ///
  /// In ar, this message translates to:
  /// **'أنمّي 3 بالكثير · أحافظ 5 · والباقي يرتاح.'**
  String get seasonEditorSub;

  /// No description provided for @seasonCounts.
  ///
  /// In ar, this message translates to:
  /// **'في النمو: {g} من {gm} · في الصيانة: {m} من {mm}'**
  String seasonCounts(String g, String gm, String m, String mm);

  /// No description provided for @swapFirst.
  ///
  /// In ar, this message translates to:
  /// **'خلي مجال ثاني يرتاح أو يحافظ أول.'**
  String get swapFirst;

  /// No description provided for @q1Name.
  ///
  /// In ar, this message translates to:
  /// **'الأساس'**
  String get q1Name;

  /// No description provided for @q2Name.
  ///
  /// In ar, this message translates to:
  /// **'البناء'**
  String get q2Name;

  /// No description provided for @q3Name.
  ///
  /// In ar, this message translates to:
  /// **'التثبيت'**
  String get q3Name;

  /// No description provided for @q4Name.
  ///
  /// In ar, this message translates to:
  /// **'التوسّع'**
  String get q4Name;

  /// No description provided for @q1Months.
  ///
  /// In ar, this message translates to:
  /// **'أكت–ديس'**
  String get q1Months;

  /// No description provided for @q2Months.
  ///
  /// In ar, this message translates to:
  /// **'ينا–مار'**
  String get q2Months;

  /// No description provided for @q3Months.
  ///
  /// In ar, this message translates to:
  /// **'أبر–يون'**
  String get q3Months;

  /// No description provided for @q4Months.
  ///
  /// In ar, this message translates to:
  /// **'يول–سبت'**
  String get q4Months;

  /// No description provided for @quarterN.
  ///
  /// In ar, this message translates to:
  /// **'الربع {n}'**
  String quarterN(String n);

  /// No description provided for @youAreHere.
  ///
  /// In ar, this message translates to:
  /// **'أنتِ هنا · {date}'**
  String youAreHere(String date);

  /// No description provided for @noMilestonesQuarter.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه محطات في هذا الربع بعد.'**
  String get noMilestonesQuarter;

  /// No description provided for @roadmapNote.
  ///
  /// In ar, this message translates to:
  /// **'بدون تواريخ ثابتة ولا وعود بدرجات — المحطات بالربع فقط.'**
  String get roadmapNote;

  /// No description provided for @noGoals.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه أهداف بعد.'**
  String get noGoals;

  /// No description provided for @goalAllDone.
  ///
  /// In ar, this message translates to:
  /// **'كل المحطات خلصت — وقت هدف جديد؟'**
  String get goalAllDone;

  /// No description provided for @milestoneProgress.
  ///
  /// In ar, this message translates to:
  /// **'{done} من {total} محطات'**
  String milestoneProgress(String done, String total);

  /// No description provided for @nextLabel.
  ///
  /// In ar, this message translates to:
  /// **'التالي: {x}'**
  String nextLabel(String x);

  /// No description provided for @goalTargetLabel.
  ///
  /// In ar, this message translates to:
  /// **'هدفك بكلماتك'**
  String get goalTargetLabel;

  /// No description provided for @goalTargetHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: الدرجة اللي تحتاجينها — تحددينها أنتِ'**
  String get goalTargetHint;

  /// No description provided for @projects.
  ///
  /// In ar, this message translates to:
  /// **'المشاريع'**
  String get projects;

  /// No description provided for @activeOfMax.
  ///
  /// In ar, this message translates to:
  /// **'نشطة {n} من {max}'**
  String activeOfMax(String n, String max);

  /// No description provided for @noProjects.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه مشاريع بعد — ابدئي بفكرة في الصندوق.'**
  String get noProjects;

  /// No description provided for @noStepsYet.
  ///
  /// In ar, this message translates to:
  /// **'بدون خطوات بعد'**
  String get noStepsYet;

  /// No description provided for @projectsRule.
  ///
  /// In ar, this message translates to:
  /// **'مشروعين نشطين بس — أي مشروع جديد يروح لصندوق الأفكار أو يتبادل مكانه مع واحد.'**
  String get projectsRule;

  /// No description provided for @newProject.
  ///
  /// In ar, this message translates to:
  /// **'مشروع جديد'**
  String get newProject;

  /// No description provided for @projectTitleLabel.
  ///
  /// In ar, this message translates to:
  /// **'اسم المشروع'**
  String get projectTitleLabel;

  /// No description provided for @projectTitleHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: دراسة حالة للبورتفوليو'**
  String get projectTitleHint;

  /// No description provided for @psIdea.
  ///
  /// In ar, this message translates to:
  /// **'فكرة'**
  String get psIdea;

  /// No description provided for @psActive.
  ///
  /// In ar, this message translates to:
  /// **'نشطة'**
  String get psActive;

  /// No description provided for @psWaiting.
  ///
  /// In ar, this message translates to:
  /// **'بالانتظار'**
  String get psWaiting;

  /// No description provided for @psPaused.
  ///
  /// In ar, this message translates to:
  /// **'متوقف · راحة'**
  String get psPaused;

  /// No description provided for @psDone.
  ///
  /// In ar, this message translates to:
  /// **'خلص'**
  String get psDone;

  /// No description provided for @psArchived.
  ///
  /// In ar, this message translates to:
  /// **'مؤرشف'**
  String get psArchived;

  /// No description provided for @statusLabel.
  ///
  /// In ar, this message translates to:
  /// **'الحالة'**
  String get statusLabel;

  /// No description provided for @parkSuggestion.
  ///
  /// In ar, this message translates to:
  /// **'خليه بالانتظار أو في صندوق الأفكار لين يفضى مكان.'**
  String get parkSuggestion;

  /// No description provided for @addStep.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي خطوة'**
  String get addStep;

  /// No description provided for @stepTitleLabel.
  ///
  /// In ar, this message translates to:
  /// **'الخطوة'**
  String get stepTitleLabel;

  /// No description provided for @deleteProject.
  ///
  /// In ar, this message translates to:
  /// **'حذف المشروع'**
  String get deleteProject;

  /// No description provided for @deleteProjectBody.
  ///
  /// In ar, this message translates to:
  /// **'يُحذف المشروع وخطواته من جهازك.'**
  String get deleteProjectBody;

  /// No description provided for @ideaInbox.
  ///
  /// In ar, this message translates to:
  /// **'صندوق الأفكار'**
  String get ideaInbox;

  /// No description provided for @ideaInboxSub.
  ///
  /// In ar, this message translates to:
  /// **'{n} أفكار تنتظر وقتها — بدون ضغط'**
  String ideaInboxSub(String n);

  /// No description provided for @ideaInboxBody.
  ///
  /// In ar, this message translates to:
  /// **'الأفكار هنا ما تظهر في يومك. لما يفضى مكان، حوّلي وحدة لمشروع نشط.'**
  String get ideaInboxBody;

  /// No description provided for @ideaInboxEmpty.
  ///
  /// In ar, this message translates to:
  /// **'الصندوق فاضي — اكتبي أي فكرة تمر في بالك.'**
  String get ideaInboxEmpty;

  /// No description provided for @addIdea.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي فكرة'**
  String get addIdea;

  /// No description provided for @ieltsSub.
  ///
  /// In ar, this message translates to:
  /// **'Academic أو General — تختارينه حسب هدفك. الاستماع والمحادثة نفسها في الاثنين.'**
  String get ieltsSub;

  /// No description provided for @ieltsNoPromise.
  ///
  /// In ar, this message translates to:
  /// **'لا نعد بدرجة — نقيس بالاختبار التجريبي. الهدف تحددينه أنتِ بعد التشخيص، والتجريبي الشهري يقول وين وصلتي.'**
  String get ieltsNoPromise;

  /// No description provided for @ieltsNoPromiseWithTarget.
  ///
  /// In ar, this message translates to:
  /// **'هدفك: {t}. لا نعد بدرجة — التجريبي الشهري يقول وين وصلتي.'**
  String ieltsNoPromiseWithTarget(String t);

  /// No description provided for @vocabToday.
  ///
  /// In ar, this message translates to:
  /// **'مفردات اليوم'**
  String get vocabToday;

  /// No description provided for @cardsDue.
  ///
  /// In ar, this message translates to:
  /// **'بطاقة مستحقة'**
  String get cardsDue;

  /// No description provided for @reviewsNew.
  ///
  /// In ar, this message translates to:
  /// **'{r} مراجعة · {n} جديدة'**
  String reviewsNew(String r, String n);

  /// No description provided for @totalCards.
  ///
  /// In ar, this message translates to:
  /// **'{n} بطاقة في مجموعتك'**
  String totalCards(String n);

  /// No description provided for @minimumPrefix.
  ///
  /// In ar, this message translates to:
  /// **'النسخة الصغيرة: {t}'**
  String minimumPrefix(String t);

  /// No description provided for @startReview.
  ///
  /// In ar, this message translates to:
  /// **'ابدئي المراجعة'**
  String get startReview;

  /// No description provided for @vocabEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه بطاقات بعد — أضيفي أول كلمة.'**
  String get vocabEmpty;

  /// No description provided for @vocabAllDone.
  ///
  /// In ar, this message translates to:
  /// **'خلصتي المستحق اليوم — المراجعة الجاية ترتّب نفسها.'**
  String get vocabAllDone;

  /// No description provided for @addCard.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي بطاقة'**
  String get addCard;

  /// No description provided for @cardFront.
  ///
  /// In ar, this message translates to:
  /// **'الكلمة'**
  String get cardFront;

  /// No description provided for @cardBack.
  ///
  /// In ar, this message translates to:
  /// **'المعنى'**
  String get cardBack;

  /// No description provided for @cardBackHint.
  ///
  /// In ar, this message translates to:
  /// **'بكلماتك'**
  String get cardBackHint;

  /// No description provided for @cardExample.
  ///
  /// In ar, this message translates to:
  /// **'جملة مثال'**
  String get cardExample;

  /// No description provided for @rotationTitle.
  ///
  /// In ar, this message translates to:
  /// **'دورة المهارات الأسبوعية · المفردات كل يوم'**
  String get rotationTitle;

  /// No description provided for @rotationMinimum.
  ///
  /// In ar, this message translates to:
  /// **'الأدنى: المفردات بس — ويُحسب يوم كامل.'**
  String get rotationMinimum;

  /// No description provided for @rotationNote.
  ///
  /// In ar, this message translates to:
  /// **'يوم صعب؟ المفردات بس — يوم المهارة ينتقل، ما يختفي.'**
  String get rotationNote;

  /// No description provided for @taskReading.
  ///
  /// In ar, this message translates to:
  /// **'قراءة نص واحد بالوقت، ثم مراجعة الأخطاء.'**
  String get taskReading;

  /// No description provided for @taskListening.
  ///
  /// In ar, this message translates to:
  /// **'مقطع استماع واحد بالوقت، ثم إعادة الأجزاء اللي فاتتك.'**
  String get taskListening;

  /// No description provided for @taskWriting.
  ///
  /// In ar, this message translates to:
  /// **'إجابة Task 2 بالوقت، ثم تصحيح بالمعايير تحت.'**
  String get taskWriting;

  /// No description provided for @taskSpeaking.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي إجابة محادثة واسمعيها بالمعايير تحت.'**
  String get taskSpeaking;

  /// No description provided for @taskMixed.
  ///
  /// In ar, this message translates to:
  /// **'قراءة واستماع معًا — جزء من كل واحد.'**
  String get taskMixed;

  /// No description provided for @taskLight.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة خفيفة أو اختبار تجريبي.'**
  String get taskLight;

  /// No description provided for @mockLog.
  ///
  /// In ar, this message translates to:
  /// **'سجل الاختبارات التجريبية'**
  String get mockLog;

  /// No description provided for @mockEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما سجلتي اختبار بعد. أول واحد يكون تشخيصي — يعطينا نقطة البداية.'**
  String get mockEmpty;

  /// No description provided for @bandScale.
  ///
  /// In ar, this message translates to:
  /// **'المقياس من 0 إلى 9.'**
  String get bandScale;

  /// No description provided for @bandScaleWeakest.
  ///
  /// In ar, this message translates to:
  /// **'المقياس من 0 إلى 9. أضعف مهارة ({s}) تاخذ يوم الخميس الإضافي.'**
  String bandScaleWeakest(String s);

  /// No description provided for @mockMonthly.
  ///
  /// In ar, this message translates to:
  /// **'تجريبي كل شهر يكفي.'**
  String get mockMonthly;

  /// No description provided for @logResult.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي نتيجة'**
  String get logResult;

  /// No description provided for @noteLabel.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظة'**
  String get noteLabel;

  /// No description provided for @mockNoteHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: تشخيصي، اختبار كامل بالوقت'**
  String get mockNoteHint;

  /// No description provided for @feedbackChecklist.
  ///
  /// In ar, this message translates to:
  /// **'قائمة التغذية الراجعة'**
  String get feedbackChecklist;

  /// No description provided for @writingTask2.
  ///
  /// In ar, this message translates to:
  /// **'الكتابة Task 2'**
  String get writingTask2;

  /// No description provided for @speakingLabel.
  ///
  /// In ar, this message translates to:
  /// **'المحادثة'**
  String get speakingLabel;

  /// No description provided for @feedbackHelp.
  ///
  /// In ar, this message translates to:
  /// **'راجعي إجابتك بمعايير التصحيح الرسمية. ركزي على خطأين أو ثلاثة بس، ثم أعيدي نفس السؤال.'**
  String get feedbackHelp;

  /// No description provided for @critTaskResponse.
  ///
  /// In ar, this message translates to:
  /// **'الاستجابة للمهمة'**
  String get critTaskResponse;

  /// No description provided for @critCoherence.
  ///
  /// In ar, this message translates to:
  /// **'الترابط والتماسك'**
  String get critCoherence;

  /// No description provided for @critFluency.
  ///
  /// In ar, this message translates to:
  /// **'الطلاقة والترابط'**
  String get critFluency;

  /// No description provided for @critLexical.
  ///
  /// In ar, this message translates to:
  /// **'الحصيلة اللغوية'**
  String get critLexical;

  /// No description provided for @critGrammar.
  ///
  /// In ar, this message translates to:
  /// **'تنوّع القواعد ودقتها'**
  String get critGrammar;

  /// No description provided for @critPronunciation.
  ///
  /// In ar, this message translates to:
  /// **'النطق'**
  String get critPronunciation;

  /// No description provided for @writingDescriptors.
  ///
  /// In ar, this message translates to:
  /// **'واصفات درجات الكتابة الرسمية (ielts.org)'**
  String get writingDescriptors;

  /// No description provided for @speakingDescriptors.
  ///
  /// In ar, this message translates to:
  /// **'واصفات درجات المحادثة الرسمية (ielts.org)'**
  String get speakingDescriptors;

  /// No description provided for @resetChecklist.
  ///
  /// In ar, this message translates to:
  /// **'صفّري القائمة للمحاولة الجاية'**
  String get resetChecklist;

  /// No description provided for @vocabReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة المفردات'**
  String get vocabReview;

  /// No description provided for @reviewDoneTitle.
  ///
  /// In ar, this message translates to:
  /// **'خلصت المراجعة'**
  String get reviewDoneTitle;

  /// No description provided for @reviewDoneBody.
  ///
  /// In ar, this message translates to:
  /// **'{good} من {total} تذكرتيها — والباقي يرجع لك قريب.'**
  String reviewDoneBody(String good, String total);

  /// No description provided for @finish.
  ///
  /// In ar, this message translates to:
  /// **'إنهاء'**
  String get finish;

  /// No description provided for @showAnswer.
  ///
  /// In ar, this message translates to:
  /// **'أظهري المعنى'**
  String get showAnswer;

  /// No description provided for @gradeAgain.
  ///
  /// In ar, this message translates to:
  /// **'ما تذكرتها'**
  String get gradeAgain;

  /// No description provided for @gradeHard.
  ///
  /// In ar, this message translates to:
  /// **'صعبة'**
  String get gradeHard;

  /// No description provided for @gradeGood.
  ///
  /// In ar, this message translates to:
  /// **'تمام'**
  String get gradeGood;

  /// No description provided for @gradeEasy.
  ///
  /// In ar, this message translates to:
  /// **'سهلة'**
  String get gradeEasy;

  /// No description provided for @drivingTitle.
  ///
  /// In ar, this message translates to:
  /// **'رخصة القيادة'**
  String get drivingTitle;

  /// No description provided for @drivingSub.
  ///
  /// In ar, this message translates to:
  /// **'المرحلة {n} من 5 · خطوة وحدة في كل مرة'**
  String drivingSub(String n);

  /// No description provided for @licencePath.
  ///
  /// In ar, this message translates to:
  /// **'طريق الرخصة'**
  String get licencePath;

  /// No description provided for @lp1Title.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد المسار الرسمي عبر أبشر / منصة الحكومة'**
  String get lp1Title;

  /// No description provided for @lp1Sub.
  ///
  /// In ar, this message translates to:
  /// **'الخطوات وعدد الساعات والرسوم تأخذينها من المصدر الرسمي ومدرسة القيادة — ما نكتبها من عندنا.'**
  String get lp1Sub;

  /// No description provided for @saveServiceLink.
  ///
  /// In ar, this message translates to:
  /// **'حفظت رابط الخدمة'**
  String get saveServiceLink;

  /// No description provided for @editServiceLink.
  ///
  /// In ar, this message translates to:
  /// **'غيّري الرابط'**
  String get editServiceLink;

  /// No description provided for @serviceLinkLabel.
  ///
  /// In ar, this message translates to:
  /// **'رابط صفحة الخدمة الرسمية'**
  String get serviceLinkLabel;

  /// No description provided for @lp2Title.
  ///
  /// In ar, this message translates to:
  /// **'التسجيل في مدرسة القيادة'**
  String get lp2Title;

  /// No description provided for @lp2Sub.
  ///
  /// In ar, this message translates to:
  /// **'بعد تأكيد المسار · مشروع بالانتظار'**
  String get lp2Sub;

  /// No description provided for @lp3Title.
  ///
  /// In ar, this message translates to:
  /// **'دروس وتدريب تحت الإشراف'**
  String get lp3Title;

  /// No description provided for @lp3Sub.
  ///
  /// In ar, this message translates to:
  /// **'نهار · ليل · طريق سريع · زحمة'**
  String get lp3Sub;

  /// No description provided for @lp4Title.
  ///
  /// In ar, this message translates to:
  /// **'الاختبار النظري'**
  String get lp4Title;

  /// No description provided for @lp4Sub.
  ///
  /// In ar, this message translates to:
  /// **'أسئلة متباعدة + إدراك المخاطر'**
  String get lp4Sub;

  /// No description provided for @lp5Title.
  ///
  /// In ar, this message translates to:
  /// **'الاختبار العملي'**
  String get lp5Title;

  /// No description provided for @lp5Sub.
  ///
  /// In ar, this message translates to:
  /// **'موعده من المدرسة — نذكّرك قبله'**
  String get lp5Sub;

  /// No description provided for @supervisedLog.
  ///
  /// In ar, this message translates to:
  /// **'سجل التدريب تحت الإشراف'**
  String get supervisedLog;

  /// No description provided for @sessionsLabel.
  ///
  /// In ar, this message translates to:
  /// **'جلسات'**
  String get sessionsLabel;

  /// No description provided for @minutesLabel.
  ///
  /// In ar, this message translates to:
  /// **'دقائق'**
  String get minutesLabel;

  /// No description provided for @conditionsTried.
  ///
  /// In ar, this message translates to:
  /// **'ظروف جرّبتيها'**
  String get conditionsTried;

  /// No description provided for @practiceNote.
  ///
  /// In ar, this message translates to:
  /// **'كل ما تنوّعت الظروف كان أفضل — والمراجعة مع المدرسة، ما نتفق على عدد ساعات محدد.'**
  String get practiceNote;

  /// No description provided for @beforeTheRoad.
  ///
  /// In ar, this message translates to:
  /// **'تجهيز قبل الطريق · تقدرين تبدئين الحين'**
  String get beforeTheRoad;

  /// No description provided for @hazardTitle.
  ///
  /// In ar, this message translates to:
  /// **'إدراك المخاطر'**
  String get hazardTitle;

  /// No description provided for @hazardSub.
  ///
  /// In ar, this message translates to:
  /// **'شوفي مقطع طريق، وسمّي الخطر بصوت قبل ما يظهر.'**
  String get hazardSub;

  /// No description provided for @hazardThisWeek.
  ///
  /// In ar, this message translates to:
  /// **'هذا الأسبوع: {n} مقاطع'**
  String hazardThisWeek(String n);

  /// No description provided for @logClip.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي مقطع'**
  String get logClip;

  /// No description provided for @theoryTitle.
  ///
  /// In ar, this message translates to:
  /// **'النظري بالتكرار المتباعد'**
  String get theoryTitle;

  /// No description provided for @theorySub.
  ///
  /// In ar, this message translates to:
  /// **'جولة أسئلة تدريبية، ترجع لك الأسئلة اللي غلطتي فيها بعد أيام.'**
  String get theorySub;

  /// No description provided for @nextRound.
  ///
  /// In ar, this message translates to:
  /// **'الجولة الجاية: {when}'**
  String nextRound(String when);

  /// No description provided for @logRound.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي جولة'**
  String get logRound;

  /// No description provided for @drivingAnxietyNote.
  ///
  /// In ar, this message translates to:
  /// **'إذا القلق من القيادة قوي ومستمر، الحديث مع مختص يساعد.'**
  String get drivingAnxietyNote;

  /// No description provided for @helpShort.
  ///
  /// In ar, this message translates to:
  /// **'المساعدة'**
  String get helpShort;

  /// No description provided for @logPractice.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي جلسة تدريب'**
  String get logPractice;

  /// No description provided for @chooseConditions.
  ///
  /// In ar, this message translates to:
  /// **'الظروف'**
  String get chooseConditions;

  /// No description provided for @durationLabel.
  ///
  /// In ar, this message translates to:
  /// **'المدة'**
  String get durationLabel;

  /// No description provided for @withSchool.
  ///
  /// In ar, this message translates to:
  /// **'درس مع المدرسة'**
  String get withSchool;

  /// No description provided for @withSchoolSub.
  ///
  /// In ar, this message translates to:
  /// **'غير كذا = تدريب تحت إشراف'**
  String get withSchoolSub;

  /// No description provided for @condDay.
  ///
  /// In ar, this message translates to:
  /// **'نهار'**
  String get condDay;

  /// No description provided for @condNight.
  ///
  /// In ar, this message translates to:
  /// **'ليل'**
  String get condNight;

  /// No description provided for @condHighway.
  ///
  /// In ar, this message translates to:
  /// **'طريق سريع'**
  String get condHighway;

  /// No description provided for @condTraffic.
  ///
  /// In ar, this message translates to:
  /// **'زحمة'**
  String get condTraffic;

  /// No description provided for @condParking.
  ///
  /// In ar, this message translates to:
  /// **'مواقف'**
  String get condParking;

  /// No description provided for @joySub.
  ///
  /// In ar, this message translates to:
  /// **'اللي يفرّحك، مربوط بيومك — بدون ما يصير واجب'**
  String get joySub;

  /// No description provided for @freeJoyToday.
  ///
  /// In ar, this message translates to:
  /// **'متعة اليوم الحرة'**
  String get freeJoyToday;

  /// No description provided for @myRewards.
  ///
  /// In ar, this message translates to:
  /// **'مكافآت حددتيها بنفسك'**
  String get myRewards;

  /// No description provided for @addReward.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي مكافأة'**
  String get addReward;

  /// No description provided for @noRewards.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه مكافآت بعد — وش يفرّحك لما تستاهلينه؟'**
  String get noRewards;

  /// No description provided for @sparksN.
  ///
  /// In ar, this message translates to:
  /// **'{n} شرارة'**
  String sparksN(String n);

  /// No description provided for @sparksLeft.
  ///
  /// In ar, this message translates to:
  /// **'باقي {n} شرارة'**
  String sparksLeft(String n);

  /// No description provided for @redeem.
  ///
  /// In ar, this message translates to:
  /// **'استبدلي'**
  String get redeem;

  /// No description provided for @rewardProgress.
  ///
  /// In ar, this message translates to:
  /// **'{title}: {have} من {price} شرارة'**
  String rewardProgress(String title, String have, String price);

  /// No description provided for @sparksExplain.
  ///
  /// In ar, this message translates to:
  /// **'الشرارات تجي من البدء بأي نسخة صغيرة، والرجوع بعد غياب (مضاعفة)، والمراجعة الأسبوعية، والتجارب — مو من الكمال.'**
  String get sparksExplain;

  /// No description provided for @bundlesSection.
  ///
  /// In ar, this message translates to:
  /// **'متعة محجوزة لمهمة · باتفاق مع نفسك'**
  String get bundlesSection;

  /// No description provided for @addBundle.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي باقة'**
  String get addBundle;

  /// No description provided for @editBundle.
  ///
  /// In ar, this message translates to:
  /// **'تعديل الباقة'**
  String get editBundle;

  /// No description provided for @noBundles.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه باقات — اختاري شي تحبينه وخليه لوقت عادة.'**
  String get noBundles;

  /// No description provided for @noHabitLinked.
  ///
  /// In ar, this message translates to:
  /// **'بدون عادة'**
  String get noHabitLinked;

  /// No description provided for @bundleHelp.
  ///
  /// In ar, this message translates to:
  /// **'شي تحبينه تخلينه لوقت عادة بس — بدون أقفال، باتفاق مع نفسك.'**
  String get bundleHelp;

  /// No description provided for @bundleWant.
  ///
  /// In ar, this message translates to:
  /// **'المتعة'**
  String get bundleWant;

  /// No description provided for @bundleWantHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: بودكاست، حلقة مسلسل، قائمة أغاني'**
  String get bundleWantHint;

  /// No description provided for @bundleFor.
  ///
  /// In ar, this message translates to:
  /// **'محجوزة لـ'**
  String get bundleFor;

  /// No description provided for @removeBundle.
  ///
  /// In ar, this message translates to:
  /// **'شيلي الباقة'**
  String get removeBundle;

  /// No description provided for @joyMap.
  ///
  /// In ar, this message translates to:
  /// **'خريطة متعتي'**
  String get joyMap;

  /// No description provided for @joyMapEmpty.
  ///
  /// In ar, this message translates to:
  /// **'خريطتك فاضية — أضيفي أشياء تفرّحك.'**
  String get joyMapEmpty;

  /// No description provided for @freeJoyNote.
  ///
  /// In ar, this message translates to:
  /// **'الأشياء اللي تحبينها أصلًا ما نحط عليها سعر — تبقى حرة.'**
  String get freeJoyNote;

  /// No description provided for @addJoy.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي متعة'**
  String get addJoy;

  /// No description provided for @sizeLabel.
  ///
  /// In ar, this message translates to:
  /// **'حجمها'**
  String get sizeLabel;

  /// No description provided for @sizeQuick.
  ///
  /// In ar, this message translates to:
  /// **'سريعة · أقل من 15 د'**
  String get sizeQuick;

  /// No description provided for @sizeMedium.
  ///
  /// In ar, this message translates to:
  /// **'متوسطة'**
  String get sizeMedium;

  /// No description provided for @sizeBig.
  ///
  /// In ar, this message translates to:
  /// **'كبيرة'**
  String get sizeBig;

  /// No description provided for @costsMoney.
  ///
  /// In ar, this message translates to:
  /// **'تكلف فلوس'**
  String get costsMoney;

  /// No description provided for @gardenSummary.
  ///
  /// In ar, this message translates to:
  /// **'{n} نباتات · {auto} صارت تلقائية'**
  String gardenSummary(String n, String auto);

  /// No description provided for @celebrationsTitle.
  ///
  /// In ar, this message translates to:
  /// **'احتفالاتي'**
  String get celebrationsTitle;

  /// No description provided for @celebrationsSub.
  ///
  /// In ar, this message translates to:
  /// **'العودات، المراجعات، والمكافآت اللي استبدلتيها'**
  String get celebrationsSub;

  /// No description provided for @redeemTitle.
  ///
  /// In ar, this message translates to:
  /// **'تستبدلين {title}؟'**
  String redeemTitle(String title);

  /// No description provided for @redeemBody.
  ///
  /// In ar, this message translates to:
  /// **'ينخصم {n} شرارة — وهذي لحظة احتفال، استاهلتيها.'**
  String redeemBody(String n);

  /// No description provided for @enjoy.
  ///
  /// In ar, this message translates to:
  /// **'استمتعي'**
  String get enjoy;

  /// No description provided for @celebrateTitle.
  ///
  /// In ar, this message translates to:
  /// **'مبروك!'**
  String get celebrateTitle;

  /// No description provided for @celebrateBody.
  ///
  /// In ar, this message translates to:
  /// **'{title} لك — من خطوات صغيرة تجمّعت.'**
  String celebrateBody(String title);

  /// No description provided for @newReward.
  ///
  /// In ar, this message translates to:
  /// **'مكافأة جديدة'**
  String get newReward;

  /// No description provided for @editReward.
  ///
  /// In ar, this message translates to:
  /// **'تعديل المكافأة'**
  String get editReward;

  /// No description provided for @saveReward.
  ///
  /// In ar, this message translates to:
  /// **'احفظي المكافأة'**
  String get saveReward;

  /// No description provided for @rewardPrompt.
  ///
  /// In ar, this message translates to:
  /// **'وش يفرّحك لما تستاهلينه؟'**
  String get rewardPrompt;

  /// No description provided for @rewardName.
  ///
  /// In ar, this message translates to:
  /// **'اسم المكافأة'**
  String get rewardName;

  /// No description provided for @rewardNameHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: كتاب جديد'**
  String get rewardNameHint;

  /// No description provided for @priceInSparks.
  ///
  /// In ar, this message translates to:
  /// **'سعرها بالشرارات'**
  String get priceInSparks;

  /// No description provided for @balanceCanRedeem.
  ///
  /// In ar, this message translates to:
  /// **'رصيدك الحالي {n} — تقدرين تستبدلينها الحين.'**
  String balanceCanRedeem(String n);

  /// No description provided for @balanceNow.
  ///
  /// In ar, this message translates to:
  /// **'رصيدك الحالي {n} — باقي {left}.'**
  String balanceNow(String n, String left);

  /// No description provided for @costsMoneySub.
  ///
  /// In ar, this message translates to:
  /// **'نضيفها لقائمة الأمنيات وفترة التهدئة في المال'**
  String get costsMoneySub;

  /// No description provided for @keepFreeAdvice.
  ///
  /// In ar, this message translates to:
  /// **'شي تحبينه وتسوينه أصلًا — مثل الرسم أو القراءة للمتعة — خليه متعة حرة بدون سعر، عشان ما يصير واجب.'**
  String get keepFreeAdvice;

  /// No description provided for @archiveReward.
  ///
  /// In ar, this message translates to:
  /// **'أرشفي المكافأة'**
  String get archiveReward;

  /// No description provided for @milestoneRewards.
  ///
  /// In ar, this message translates to:
  /// **'مكافآت المحطات · لما توصلين لخطوة في هدف'**
  String get milestoneRewards;

  /// No description provided for @pickMilestoneReward.
  ///
  /// In ar, this message translates to:
  /// **'مكافأة هذي المحطة'**
  String get pickMilestoneReward;

  /// No description provided for @chooseLater.
  ///
  /// In ar, this message translates to:
  /// **'تختارينها لاحقًا'**
  String get chooseLater;

  /// No description provided for @noCelebrations.
  ///
  /// In ar, this message translates to:
  /// **'احتفالاتك تظهر هنا: عودة بعد غياب، مراجعة أسبوع، مكافأة استبدلتيها.'**
  String get noCelebrations;

  /// No description provided for @freshStartTitle.
  ///
  /// In ar, this message translates to:
  /// **'بداية جديدة'**
  String get freshStartTitle;

  /// No description provided for @freshWeek.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع جديد بدأ — فرصة لطيفة نختار أول خطوة صغيرة، بدون ما نحاسب اللي فات.'**
  String get freshWeek;

  /// No description provided for @freshMonth.
  ///
  /// In ar, this message translates to:
  /// **'شهر جديد — لو فيه شي تبين ترجعين له، هذي لحظة مناسبة.'**
  String get freshMonth;

  /// No description provided for @freshSeason.
  ///
  /// In ar, this message translates to:
  /// **'موسم جديد بدأ — نشوف وش ينمو ووش يرتاح هالموسم.'**
  String get freshSeason;

  /// No description provided for @freshWeekTomorrow.
  ///
  /// In ar, this message translates to:
  /// **'بكرة أسبوع جديد — بداية جديدة. اختاري ثلاث أولويات وخلّي الباقي يرتاح.'**
  String get freshWeekTomorrow;

  /// No description provided for @freshMonthTomorrow.
  ///
  /// In ar, this message translates to:
  /// **'بكرة شهر جديد — بداية جديدة تناسب أي رجوع.'**
  String get freshMonthTomorrow;

  /// No description provided for @freshDismiss.
  ///
  /// In ar, this message translates to:
  /// **'إخفاء بطاقة البداية الجديدة'**
  String get freshDismiss;

  /// No description provided for @freshAction.
  ///
  /// In ar, this message translates to:
  /// **'اختاري أولويات الأسبوع'**
  String get freshAction;

  /// No description provided for @wrSub.
  ///
  /// In ar, this message translates to:
  /// **'الفصل {n} · حوالي 10 دقائق'**
  String wrSub(String n);

  /// No description provided for @wrWins.
  ///
  /// In ar, this message translates to:
  /// **'الإنجازات'**
  String get wrWins;

  /// No description provided for @wrBlockers.
  ///
  /// In ar, this message translates to:
  /// **'اللي عطّلني'**
  String get wrBlockers;

  /// No description provided for @wrStrength.
  ///
  /// In ar, this message translates to:
  /// **'فحص القوة'**
  String get wrStrength;

  /// No description provided for @wrSeason.
  ///
  /// In ar, this message translates to:
  /// **'الموسم'**
  String get wrSeason;

  /// No description provided for @wrTop3.
  ///
  /// In ar, this message translates to:
  /// **'أولويات الأسبوع الجاي'**
  String get wrTop3;

  /// No description provided for @wrExperiment.
  ///
  /// In ar, this message translates to:
  /// **'التجربة'**
  String get wrExperiment;

  /// No description provided for @wrChapter.
  ///
  /// In ar, this message translates to:
  /// **'عنوان الفصل'**
  String get wrChapter;

  /// No description provided for @wrSparks.
  ///
  /// In ar, this message translates to:
  /// **'الشرارات'**
  String get wrSparks;

  /// No description provided for @wrWinsTitle.
  ///
  /// In ar, this message translates to:
  /// **'وش مشى صح هالأسبوع؟'**
  String get wrWinsTitle;

  /// No description provided for @wrWinsSub.
  ///
  /// In ar, this message translates to:
  /// **'جمعنا لك اللي لاحظناه. أشري على اللي تفتخرين فيه.'**
  String get wrWinsSub;

  /// No description provided for @wrNoWins.
  ///
  /// In ar, this message translates to:
  /// **'ما سجلنا شي هالأسبوع — وهذا عادي. اكتبي أي شي صغير صار.'**
  String get wrNoWins;

  /// No description provided for @wrExtraWin.
  ///
  /// In ar, this message translates to:
  /// **'إنجاز ثاني تبين تذكرينه'**
  String get wrExtraWin;

  /// No description provided for @wrExtraWinHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: كلمت صديقتي بعد فترة'**
  String get wrExtraWinHint;

  /// No description provided for @wrBlockersTitle.
  ///
  /// In ar, this message translates to:
  /// **'وش عطّلك؟'**
  String get wrBlockersTitle;

  /// No description provided for @wrBlockersSub.
  ///
  /// In ar, this message translates to:
  /// **'معلومة للتصميم، مو حكم عليك. اختاري اللي ينطبق.'**
  String get wrBlockersSub;

  /// No description provided for @wrBlockersNote.
  ///
  /// In ar, this message translates to:
  /// **'إذا عادة وحدة تكرر تعطّلها، زر «عدّلي التصميم» في يومك يقترح تعديل واحد.'**
  String get wrBlockersNote;

  /// No description provided for @wrStrengthTitle.
  ///
  /// In ar, this message translates to:
  /// **'فحص القوة: {title}'**
  String wrStrengthTitle(String title);

  /// No description provided for @wrStrengthSub.
  ///
  /// In ar, this message translates to:
  /// **'4 جمل، 20 ثانية. 1 = ما أوافق أبدًا · 5 = أوافق تمامًا.'**
  String get wrStrengthSub;

  /// No description provided for @srbai1.
  ///
  /// In ar, this message translates to:
  /// **'أسويها تلقائيًا'**
  String get srbai1;

  /// No description provided for @srbai2.
  ///
  /// In ar, this message translates to:
  /// **'أسويها بدون ما أتذكر عمدًا'**
  String get srbai2;

  /// No description provided for @srbai3.
  ///
  /// In ar, this message translates to:
  /// **'أسويها بدون ما أفكر'**
  String get srbai3;

  /// No description provided for @srbai4.
  ///
  /// In ar, this message translates to:
  /// **'أبدأ فيها قبل ما أنتبه'**
  String get srbai4;

  /// No description provided for @wrStrengthAvg.
  ///
  /// In ar, this message translates to:
  /// **'متوسطك {v} من 5 — هذي قراءتك أنتِ، مو امتحان.'**
  String wrStrengthAvg(String v);

  /// No description provided for @wrTop3Title.
  ///
  /// In ar, this message translates to:
  /// **'أهم 3 للأسبوع الجاي'**
  String get wrTop3Title;

  /// No description provided for @wrTop3Sub.
  ///
  /// In ar, this message translates to:
  /// **'ثلاثة بس. الباقي ينتظر بدون ضغط.'**
  String get wrTop3Sub;

  /// No description provided for @wrTopN.
  ///
  /// In ar, this message translates to:
  /// **'الأولوية {n}'**
  String wrTopN(String n);

  /// No description provided for @wrSuggestions.
  ///
  /// In ar, this message translates to:
  /// **'من أهدافك ومشاريعك'**
  String get wrSuggestions;

  /// No description provided for @wrExperimentTitle.
  ///
  /// In ar, this message translates to:
  /// **'تجربة الأسبوع'**
  String get wrExperimentTitle;

  /// No description provided for @wrExperimentSub.
  ///
  /// In ar, this message translates to:
  /// **'نغيّر شي واحد بس ونقيس الإنجاز والمتعة. القرار بعدها لك.'**
  String get wrExperimentSub;

  /// No description provided for @wrExperimentActive.
  ///
  /// In ar, this message translates to:
  /// **'عندك تجربة شغّالة — شوفي النتيجة وقرري.'**
  String get wrExperimentActive;

  /// No description provided for @wrNoExperiment.
  ///
  /// In ar, this message translates to:
  /// **'بدون تجربة هالأسبوع'**
  String get wrNoExperiment;

  /// No description provided for @wrNoExperimentSub.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع هادئ بدون تغيير — اختيار مناسب بعد.'**
  String get wrNoExperimentSub;

  /// No description provided for @wrExperimentNote.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع واحد يعطي إشارة، مو حكم نهائي.'**
  String get wrExperimentNote;

  /// No description provided for @expVarBundle.
  ///
  /// In ar, this message translates to:
  /// **'نشغّل المتعة وقت العادة بس ونقارن بالأسبوع اللي قبله'**
  String get expVarBundle;

  /// No description provided for @expVarEvening.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع في المساء بدل الصباح'**
  String get expVarEvening;

  /// No description provided for @expVarMorning.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع في الصباح بدل المساء'**
  String get expVarMorning;

  /// No description provided for @expVarMinimum.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع بالنسخة الصغيرة كل يوم'**
  String get expVarMinimum;

  /// No description provided for @wrChapterTitle.
  ///
  /// In ar, this message translates to:
  /// **'عنوان الفصل {n}'**
  String wrChapterTitle(String n);

  /// No description provided for @wrChapterSub.
  ///
  /// In ar, this message translates to:
  /// **'كل أسبوع فصل. سمّيه بكلمتين تتذكرينه فيها.'**
  String get wrChapterSub;

  /// No description provided for @wrChapterHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: أسبوع الرجوع'**
  String get wrChapterHint;

  /// No description provided for @wrChapterS1.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع الرجوع'**
  String get wrChapterS1;

  /// No description provided for @wrChapterS2.
  ///
  /// In ar, this message translates to:
  /// **'خطوات صغيرة'**
  String get wrChapterS2;

  /// No description provided for @wrChapterS3.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع هادئ'**
  String get wrChapterS3;

  /// No description provided for @wrCloseChapter.
  ///
  /// In ar, this message translates to:
  /// **'سكّري الفصل'**
  String get wrCloseChapter;

  /// No description provided for @wrDone.
  ///
  /// In ar, this message translates to:
  /// **'خلصنا'**
  String get wrDone;

  /// No description provided for @wrClosedN.
  ///
  /// In ar, this message translates to:
  /// **'سكّرتي الفصل {n}'**
  String wrClosedN(String n);

  /// No description provided for @wrClosedTitled.
  ///
  /// In ar, this message translates to:
  /// **'سكّرتي الفصل {n}: {title}'**
  String wrClosedTitled(String n, String title);

  /// No description provided for @wrSaved.
  ///
  /// In ar, this message translates to:
  /// **'انحفظ الفصل.'**
  String get wrSaved;

  /// No description provided for @wrEndWin.
  ///
  /// In ar, this message translates to:
  /// **'{win} — وهذا بالضبط اللي نبنيه. الأسبوع الجاي جاهز بأولوياتك.'**
  String wrEndWin(String win);

  /// No description provided for @wrEndGeneric.
  ///
  /// In ar, this message translates to:
  /// **'وصلتي لآخر الأسبوع وقفلتيه بهدوء — وهذا بحد ذاته إنجاز.'**
  String get wrEndGeneric;

  /// No description provided for @experimentResultLabel.
  ///
  /// In ar, this message translates to:
  /// **'نتيجة التجربة'**
  String get experimentResultLabel;

  /// No description provided for @beforeWithout.
  ///
  /// In ar, this message translates to:
  /// **'قبل'**
  String get beforeWithout;

  /// No description provided for @afterWith.
  ///
  /// In ar, this message translates to:
  /// **'بعد'**
  String get afterWith;

  /// No description provided for @daysDone.
  ///
  /// In ar, this message translates to:
  /// **'أيام منجزة'**
  String get daysDone;

  /// No description provided for @enjoymentOf5.
  ///
  /// In ar, this message translates to:
  /// **'المتعة من 5'**
  String get enjoymentOf5;

  /// No description provided for @experimentCaveat.
  ///
  /// In ar, this message translates to:
  /// **'تجربة شخصية قصيرة — إشارة، مو دليل.'**
  String get experimentCaveat;

  /// No description provided for @keepIt.
  ///
  /// In ar, this message translates to:
  /// **'أثبتها'**
  String get keepIt;

  /// No description provided for @revertIt.
  ///
  /// In ar, this message translates to:
  /// **'أرجّع القديم'**
  String get revertIt;

  /// No description provided for @keptLabel.
  ///
  /// In ar, this message translates to:
  /// **'ثبّتيها'**
  String get keptLabel;

  /// No description provided for @revertedLabel.
  ///
  /// In ar, this message translates to:
  /// **'رجّعتي القديم'**
  String get revertedLabel;

  /// No description provided for @insights.
  ///
  /// In ar, this message translates to:
  /// **'الرؤى'**
  String get insights;

  /// No description provided for @insightsSub.
  ///
  /// In ar, this message translates to:
  /// **'آخر 4 أسابيع · أرقام تساعدك تعدّلين التصميم، مو تحكم عليك'**
  String get insightsSub;

  /// No description provided for @momentumByDomain.
  ///
  /// In ar, this message translates to:
  /// **'الزخم حسب المجال'**
  String get momentumByDomain;

  /// No description provided for @momentumCaption.
  ///
  /// In ar, this message translates to:
  /// **'الزخم من 0 إلى 100: متوسط موزون لآخر 7 أيام. اليوم الفائت ينزله شوي، ما يرجعه للصفر.'**
  String get momentumCaption;

  /// No description provided for @recoverySpeed.
  ///
  /// In ar, this message translates to:
  /// **'سرعة الرجوع'**
  String get recoverySpeed;

  /// No description provided for @recoveryEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه رجوع مسجّل بعد — يظهر هنا لما ترجعين لعادة بعد غياب.'**
  String get recoveryEmpty;

  /// No description provided for @recoveryCaption.
  ///
  /// In ar, this message translates to:
  /// **'الأرقام = أيام حتى الرجوع. أقل = أحسن. «—» = ما فيه رجوع ذاك الأسبوع.'**
  String get recoveryCaption;

  /// No description provided for @weekShort.
  ///
  /// In ar, this message translates to:
  /// **'أسبوع {n}'**
  String weekShort(String n);

  /// No description provided for @thisWeekShort.
  ///
  /// In ar, this message translates to:
  /// **'هذا الأسبوع'**
  String get thisWeekShort;

  /// No description provided for @noReturn.
  ///
  /// In ar, this message translates to:
  /// **'بدون رجوع'**
  String get noReturn;

  /// No description provided for @bestTimes.
  ///
  /// In ar, this message translates to:
  /// **'أفضل أوقاتك'**
  String get bestTimes;

  /// No description provided for @bestTimesEmpty.
  ///
  /// In ar, this message translates to:
  /// **'نحتاج 3 مرات على الأقل لكل عادة عشان نعرف وقتها المعتاد.'**
  String get bestTimesEmpty;

  /// No description provided for @bestTimesCaption.
  ///
  /// In ar, this message translates to:
  /// **'نص أوقات إنجازك بالضبط (بين الربع الأول والثالث) لآخر 4 أسابيع.'**
  String get bestTimesCaption;

  /// No description provided for @fromNTimes.
  ///
  /// In ar, this message translates to:
  /// **'من {n} مرات'**
  String fromNTimes(String n);

  /// No description provided for @experimentsTitle.
  ///
  /// In ar, this message translates to:
  /// **'التجارب'**
  String get experimentsTitle;

  /// No description provided for @experimentsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه تجارب بعد — تختارين وحدة في المراجعة الأسبوعية.'**
  String get experimentsEmpty;

  /// No description provided for @systemBurden.
  ///
  /// In ar, this message translates to:
  /// **'عبء النظام'**
  String get systemBurden;

  /// No description provided for @burdenSub.
  ///
  /// In ar, this message translates to:
  /// **'قد إيش التطبيق نفسه ياخذ من وقتك. نبيه يبقى قليل — التطبيق خادم، مو شغلة إضافية.'**
  String get burdenSub;

  /// No description provided for @burdenLogs.
  ///
  /// In ar, this message translates to:
  /// **'تسجيلات هذا الأسبوع'**
  String get burdenLogs;

  /// No description provided for @burdenReview.
  ///
  /// In ar, this message translates to:
  /// **'دقائق المراجعة'**
  String get burdenReview;

  /// No description provided for @burdenCaption.
  ///
  /// In ar, this message translates to:
  /// **'نعدّ الضغطات ونقيس وقت المراجعة الفعلي — ما نقدّر شي من عندنا.'**
  String get burdenCaption;

  /// No description provided for @chapterN.
  ///
  /// In ar, this message translates to:
  /// **'الفصل {n}'**
  String chapterN(String n);

  /// No description provided for @settings.
  ///
  /// In ar, this message translates to:
  /// **'الإعدادات'**
  String get settings;

  /// No description provided for @aboutMinutes.
  ///
  /// In ar, this message translates to:
  /// **'{n} دقائق'**
  String aboutMinutes(String n);

  /// No description provided for @reviewReady.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة الأسبوع جاهزة'**
  String get reviewReady;

  /// No description provided for @reviewReadyBody.
  ///
  /// In ar, this message translates to:
  /// **'نسكّر الفصل {n} بقصته: وش مشى، وش عطّل، وأهم 3 للأسبوع الجاي.'**
  String reviewReadyBody(String n);

  /// No description provided for @reviewEndsWithSparks.
  ///
  /// In ar, this message translates to:
  /// **'تنتهي بشرارات المراجعة'**
  String get reviewEndsWithSparks;

  /// No description provided for @chapterClosed.
  ///
  /// In ar, this message translates to:
  /// **'سكّرتي الفصل {n}'**
  String chapterClosed(String n);

  /// No description provided for @nextWeekTop3.
  ///
  /// In ar, this message translates to:
  /// **'أهم 3 للأسبوع'**
  String get nextWeekTop3;

  /// No description provided for @reviewAgain.
  ///
  /// In ar, this message translates to:
  /// **'افتحي المراجعة مرة ثانية'**
  String get reviewAgain;

  /// No description provided for @understandMyself.
  ///
  /// In ar, this message translates to:
  /// **'أفهم نفسي'**
  String get understandMyself;

  /// No description provided for @insightsTileSub.
  ///
  /// In ar, this message translates to:
  /// **'الزخم وسرعة الرجوع'**
  String get insightsTileSub;

  /// No description provided for @noActiveExperiment.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه تجربة شغّالة'**
  String get noActiveExperiment;

  /// No description provided for @evidenceSub.
  ///
  /// In ar, this message translates to:
  /// **'كل عادة ومصادرها وقوة دليلها'**
  String get evidenceSub;

  /// No description provided for @lifeAdmin.
  ///
  /// In ar, this message translates to:
  /// **'أمور حياتي'**
  String get lifeAdmin;

  /// No description provided for @moneyTitle.
  ///
  /// In ar, this message translates to:
  /// **'المال'**
  String get moneyTitle;

  /// No description provided for @moneySub.
  ///
  /// In ar, this message translates to:
  /// **'ظروف الشهر والفواتير'**
  String get moneySub;

  /// No description provided for @nextDue.
  ///
  /// In ar, this message translates to:
  /// **'{title} {when}'**
  String nextDue(String title, String when);

  /// No description provided for @autoSaveShort.
  ///
  /// In ar, this message translates to:
  /// **'الادخار التلقائي'**
  String get autoSaveShort;

  /// No description provided for @homeAdminTitle.
  ///
  /// In ar, this message translates to:
  /// **'البيت والمعاملات'**
  String get homeAdminTitle;

  /// No description provided for @zoneOfWeekIs.
  ///
  /// In ar, this message translates to:
  /// **'منطقة الأسبوع: {z}'**
  String zoneOfWeekIs(String z);

  /// No description provided for @cycleTitle.
  ///
  /// In ar, this message translates to:
  /// **'الدورة الشهرية'**
  String get cycleTitle;

  /// No description provided for @pcosTitle.
  ///
  /// In ar, this message translates to:
  /// **'نمط حياة لتكيّس المبايض'**
  String get pcosTitle;

  /// No description provided for @ifDiagnosed.
  ///
  /// In ar, this message translates to:
  /// **'إذا كان لديك تشخيص'**
  String get ifDiagnosed;

  /// No description provided for @privateLocal.
  ///
  /// In ar, this message translates to:
  /// **'خاص بك · على جهازك فقط'**
  String get privateLocal;

  /// No description provided for @appSection.
  ///
  /// In ar, this message translates to:
  /// **'التطبيق'**
  String get appSection;

  /// No description provided for @settingsSub.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات · الوحدات · الخصوصية'**
  String get settingsSub;

  /// No description provided for @helpSub.
  ///
  /// In ar, this message translates to:
  /// **'متى أطلب مساعدة مختص'**
  String get helpSub;

  /// No description provided for @dataOnDevice.
  ///
  /// In ar, this message translates to:
  /// **'كل بياناتك على جهازك فقط.'**
  String get dataOnDevice;

  /// No description provided for @unlockReason.
  ///
  /// In ar, this message translates to:
  /// **'افتحي القسم الخاص'**
  String get unlockReason;

  /// No description provided for @lockedTitle.
  ///
  /// In ar, this message translates to:
  /// **'قسم خاص'**
  String get lockedTitle;

  /// No description provided for @lockedBody.
  ///
  /// In ar, this message translates to:
  /// **'هذا القسم مقفل بقفل التطبيق.'**
  String get lockedBody;

  /// No description provided for @unlock.
  ///
  /// In ar, this message translates to:
  /// **'افتحي القفل'**
  String get unlock;

  /// No description provided for @moduleOff.
  ///
  /// In ar, this message translates to:
  /// **'هذي الوحدة مطفأة. تقدرين تفعّلينها من الإعدادات.'**
  String get moduleOff;

  /// No description provided for @cyclePrivacy.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل خاص بك: تواريخ وملاحظات بس. بدون توقعات ولا تحليل، وكل شي يبقى على جهازك.'**
  String get cyclePrivacy;

  /// No description provided for @cycleLastStart.
  ///
  /// In ar, this message translates to:
  /// **'آخر بداية: {date} · قبل {n} يوم'**
  String cycleLastStart(String date, String n);

  /// No description provided for @cycleStartedToday.
  ///
  /// In ar, this message translates to:
  /// **'بدأت اليوم'**
  String get cycleStartedToday;

  /// No description provided for @cycleEndedToday.
  ///
  /// In ar, this message translates to:
  /// **'انتهت اليوم'**
  String get cycleEndedToday;

  /// No description provided for @addNote.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظة'**
  String get addNote;

  /// No description provided for @cycleLog.
  ///
  /// In ar, this message translates to:
  /// **'السجل'**
  String get cycleLog;

  /// No description provided for @cycleEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه تسجيلات بعد.'**
  String get cycleEmpty;

  /// No description provided for @cycleStart.
  ///
  /// In ar, this message translates to:
  /// **'بداية'**
  String get cycleStart;

  /// No description provided for @cycleEnd.
  ///
  /// In ar, this message translates to:
  /// **'نهاية'**
  String get cycleEnd;

  /// No description provided for @cycleNotMedical.
  ///
  /// In ar, this message translates to:
  /// **'هذا سجل شخصي، مو أداة طبية. لأي سؤال صحي راجعي طبيبتك.'**
  String get cycleNotMedical;

  /// No description provided for @pcosBanner.
  ///
  /// In ar, this message translates to:
  /// **'هذا المحتوى إذا كان لديك تشخيص من طبيبة فقط — مو أداة تشخيص.'**
  String get pcosBanner;

  /// No description provided for @fieldWhat.
  ///
  /// In ar, this message translates to:
  /// **'وش هو'**
  String get fieldWhat;

  /// No description provided for @fieldWhy.
  ///
  /// In ar, this message translates to:
  /// **'ليش'**
  String get fieldWhy;

  /// No description provided for @notASubstitute.
  ///
  /// In ar, this message translates to:
  /// **'التطبيق ليس بديلًا عن المختص.'**
  String get notASubstitute;

  /// No description provided for @moneyScreenSub.
  ///
  /// In ar, this message translates to:
  /// **'{month} · تسجيل يدوي — ما نربط أي حساب بنكي'**
  String moneyScreenSub(String month);

  /// No description provided for @envelopesTitle.
  ///
  /// In ar, this message translates to:
  /// **'ظروف الشهر'**
  String get envelopesTitle;

  /// No description provided for @daysLeftMonth.
  ///
  /// In ar, this message translates to:
  /// **'باقي {n} يوم'**
  String daysLeftMonth(String n);

  /// No description provided for @envelopesEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه ظروف لهذا الشهر — أضيفي أول ظرف (مثلًا: أكل وقهوة).'**
  String get envelopesEmpty;

  /// No description provided for @spentOf.
  ///
  /// In ar, this message translates to:
  /// **'{spent} من {planned}'**
  String spentOf(String spent, String planned);

  /// No description provided for @logSpend.
  ///
  /// In ar, this message translates to:
  /// **'سجّلي مصروف'**
  String get logSpend;

  /// No description provided for @addEnvelope.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي ظرف'**
  String get addEnvelope;

  /// No description provided for @envelopeName.
  ///
  /// In ar, this message translates to:
  /// **'اسم الظرف'**
  String get envelopeName;

  /// No description provided for @envelopeHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: أكل وقهوة'**
  String get envelopeHint;

  /// No description provided for @plannedAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ المخطط (ر.س)'**
  String get plannedAmount;

  /// No description provided for @amountSar.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ (ر.س)'**
  String get amountSar;

  /// No description provided for @autoSaveBody.
  ///
  /// In ar, this message translates to:
  /// **'فعّليه مرة وحدة من تطبيق بنكك، ويمشي لحاله. أي مبلغ صغير ثابت يكفي كبداية.'**
  String get autoSaveBody;

  /// No description provided for @autoSaveUnset.
  ///
  /// In ar, this message translates to:
  /// **'ما حددتي يوم التذكير بعد'**
  String get autoSaveUnset;

  /// No description provided for @autoSaveReminder.
  ///
  /// In ar, this message translates to:
  /// **'تذكير: {day} من كل شهر · {time}'**
  String autoSaveReminder(String day, String time);

  /// No description provided for @setReminderDay.
  ///
  /// In ar, this message translates to:
  /// **'حددي يوم التذكير'**
  String get setReminderDay;

  /// No description provided for @dayOfMonth.
  ///
  /// In ar, this message translates to:
  /// **'يوم الشهر'**
  String get dayOfMonth;

  /// No description provided for @billsTitle.
  ///
  /// In ar, this message translates to:
  /// **'الفواتير والاشتراكات · {month}'**
  String billsTitle(String month);

  /// No description provided for @legendBill.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة أو اشتراك'**
  String get legendBill;

  /// No description provided for @legendBnpl.
  ///
  /// In ar, this message translates to:
  /// **'قسط'**
  String get legendBnpl;

  /// No description provided for @billsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه فواتير — أضيفي اللي يتكرر كل شهر.'**
  String get billsEmpty;

  /// No description provided for @subscription.
  ///
  /// In ar, this message translates to:
  /// **'اشتراك'**
  String get subscription;

  /// No description provided for @subscriptionsReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة شهرية: اشتراك ما تستخدمينه؟ ألغيه من إعدادات المتجر في جوالك.'**
  String get subscriptionsReview;

  /// No description provided for @addBill.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة أو اشتراك'**
  String get addBill;

  /// No description provided for @billName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get billName;

  /// No description provided for @deleteItemBody.
  ///
  /// In ar, this message translates to:
  /// **'يُحذف من جهازك.'**
  String get deleteItemBody;

  /// No description provided for @bnplTitle.
  ///
  /// In ar, this message translates to:
  /// **'الأقساط'**
  String get bnplTitle;

  /// No description provided for @bnplEmpty.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه أقساط.'**
  String get bnplEmpty;

  /// No description provided for @bnplDone.
  ///
  /// In ar, this message translates to:
  /// **'خلصت كل الدفعات'**
  String get bnplDone;

  /// No description provided for @bnplNext.
  ///
  /// In ar, this message translates to:
  /// **'القسط الجاي {amount} ر.س · {date} ({when}) · الدفعة {n} من {total}'**
  String bnplNext(
    String amount,
    String date,
    String when,
    String n,
    String total,
  );

  /// No description provided for @markPaid.
  ///
  /// In ar, this message translates to:
  /// **'دفعتها'**
  String get markPaid;

  /// No description provided for @bnplRule.
  ///
  /// In ar, this message translates to:
  /// **'قاعدتي قبل أي تقسيط: {rule}'**
  String bnplRule(String rule);

  /// No description provided for @addBnpl.
  ///
  /// In ar, this message translates to:
  /// **'خطة تقسيط'**
  String get addBnpl;

  /// No description provided for @bnplItemName.
  ///
  /// In ar, this message translates to:
  /// **'وش اشتريتي؟'**
  String get bnplItemName;

  /// No description provided for @bnplProvider.
  ///
  /// In ar, this message translates to:
  /// **'الجهة'**
  String get bnplProvider;

  /// No description provided for @instalmentAmount.
  ///
  /// In ar, this message translates to:
  /// **'مبلغ القسط (ر.س)'**
  String get instalmentAmount;

  /// No description provided for @instalmentCount.
  ///
  /// In ar, this message translates to:
  /// **'عدد الدفعات'**
  String get instalmentCount;

  /// No description provided for @wishlistTitle.
  ///
  /// In ar, this message translates to:
  /// **'قائمة الأمنيات · فترة تهدئة'**
  String get wishlistTitle;

  /// No description provided for @wishlistEmpty.
  ///
  /// In ar, this message translates to:
  /// **'شي تبين تشترينه؟ حطيه هنا بدل السلة، وقرري بعد فترة التهدئة.'**
  String get wishlistEmpty;

  /// No description provided for @coolingLeft.
  ///
  /// In ar, this message translates to:
  /// **'باقي {n} أيام — خليها ترتاح'**
  String coolingLeft(String n);

  /// No description provided for @coolingDone.
  ///
  /// In ar, this message translates to:
  /// **'خلصت التهدئة — لسا تبينها؟'**
  String get coolingDone;

  /// No description provided for @buyIt.
  ///
  /// In ar, this message translates to:
  /// **'إيه، أشتريها'**
  String get buyIt;

  /// No description provided for @dropIt.
  ///
  /// In ar, this message translates to:
  /// **'أشيلها'**
  String get dropIt;

  /// No description provided for @coolingNote.
  ///
  /// In ar, this message translates to:
  /// **'مدة التهدئة تختارينها أنتِ — طريقة عملية، والدليل عليها مو محسوم.'**
  String get coolingNote;

  /// No description provided for @addWish.
  ///
  /// In ar, this message translates to:
  /// **'أمنية جديدة'**
  String get addWish;

  /// No description provided for @wishName.
  ///
  /// In ar, this message translates to:
  /// **'وش هي؟'**
  String get wishName;

  /// No description provided for @coolingDays.
  ///
  /// In ar, this message translates to:
  /// **'أيام التهدئة'**
  String get coolingDays;

  /// No description provided for @homeAdminSub.
  ///
  /// In ar, this message translates to:
  /// **'قليل وثابت أحسن من كثير ومتقطع'**
  String get homeAdminSub;

  /// No description provided for @resetTitle.
  ///
  /// In ar, this message translates to:
  /// **'ترتيب {n} دقائق'**
  String resetTitle(String n);

  /// No description provided for @resetReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهز'**
  String get resetReady;

  /// No description provided for @resetRunning.
  ///
  /// In ar, this message translates to:
  /// **'شغّال'**
  String get resetRunning;

  /// No description provided for @resetDone.
  ///
  /// In ar, this message translates to:
  /// **'خلصتي — المكان صار أخف'**
  String get resetDone;

  /// No description provided for @startResetN.
  ///
  /// In ar, this message translates to:
  /// **'ابدئي {n} دقائق'**
  String startResetN(String n);

  /// No description provided for @withBundle.
  ///
  /// In ar, this message translates to:
  /// **'مع {b}'**
  String withBundle(String b);

  /// No description provided for @zoneOfWeek.
  ///
  /// In ar, this message translates to:
  /// **'منطقة الأسبوع'**
  String get zoneOfWeek;

  /// No description provided for @nextZone.
  ///
  /// In ar, this message translates to:
  /// **'المنطقة التالية'**
  String get nextZone;

  /// No description provided for @zoneDesk.
  ///
  /// In ar, this message translates to:
  /// **'درج المكتب'**
  String get zoneDesk;

  /// No description provided for @zoneWardrobe.
  ///
  /// In ar, this message translates to:
  /// **'الدولاب'**
  String get zoneWardrobe;

  /// No description provided for @zoneKitchen.
  ///
  /// In ar, this message translates to:
  /// **'رف المطبخ'**
  String get zoneKitchen;

  /// No description provided for @zoneBathroom.
  ///
  /// In ar, this message translates to:
  /// **'رف الحمام'**
  String get zoneBathroom;

  /// No description provided for @zoneBag.
  ///
  /// In ar, this message translates to:
  /// **'الشنطة'**
  String get zoneBag;

  /// No description provided for @zoneShelf.
  ///
  /// In ar, this message translates to:
  /// **'رف الكتب'**
  String get zoneShelf;

  /// No description provided for @docsTitle.
  ///
  /// In ar, this message translates to:
  /// **'الوثائق والتجديدات'**
  String get docsTitle;

  /// No description provided for @addDoc.
  ///
  /// In ar, this message translates to:
  /// **'إضافة وثيقة'**
  String get addDoc;

  /// No description provided for @docsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'سجلي وثائقك (الهوية، الجواز، التأمين…) وتاريخ انتهائها — نذكّرك قبلها.'**
  String get docsEmpty;

  /// No description provided for @docNoExpiry.
  ///
  /// In ar, this message translates to:
  /// **'بدون تاريخ انتهاء بعد'**
  String get docNoExpiry;

  /// No description provided for @docExpires.
  ///
  /// In ar, this message translates to:
  /// **'تنتهي {date} · {when}'**
  String docExpires(String date, String when);

  /// No description provided for @docWaiting.
  ///
  /// In ar, this message translates to:
  /// **'تنتظر'**
  String get docWaiting;

  /// No description provided for @docRenewNow.
  ///
  /// In ar, this message translates to:
  /// **'وقت التجديد'**
  String get docRenewNow;

  /// No description provided for @docRemindBefore.
  ///
  /// In ar, this message translates to:
  /// **'قبل {n} يوم'**
  String docRemindBefore(String n);

  /// No description provided for @docsNote.
  ///
  /// In ar, this message translates to:
  /// **'مدة التذكير قبل الانتهاء تحددينها لكل وثيقة.'**
  String get docsNote;

  /// No description provided for @docName.
  ///
  /// In ar, this message translates to:
  /// **'اسم الوثيقة'**
  String get docName;

  /// No description provided for @docNameHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: جواز السفر'**
  String get docNameHint;

  /// No description provided for @expiryDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الانتهاء'**
  String get expiryDate;

  /// No description provided for @remindBeforeDays.
  ///
  /// In ar, this message translates to:
  /// **'ذكّريني قبل'**
  String get remindBeforeDays;

  /// No description provided for @daysN.
  ///
  /// In ar, this message translates to:
  /// **'{n} يوم'**
  String daysN(String n);

  /// No description provided for @errandsTitle.
  ///
  /// In ar, this message translates to:
  /// **'مشاوير مجمّعة'**
  String get errandsTitle;

  /// No description provided for @errandsTitleWhen.
  ///
  /// In ar, this message translates to:
  /// **'مشاوير مجمّعة · {when}'**
  String errandsTitleWhen(String when);

  /// No description provided for @errandsEmpty.
  ///
  /// In ar, this message translates to:
  /// **'أي مشوار يطرأ؟ سجليه هنا وسوّيه مع الباقي في وقت المهام الإدارية.'**
  String get errandsEmpty;

  /// No description provided for @addErrand.
  ///
  /// In ar, this message translates to:
  /// **'مشوار جديد'**
  String get addErrand;

  /// No description provided for @errandName.
  ///
  /// In ar, this message translates to:
  /// **'المشوار'**
  String get errandName;

  /// No description provided for @errandHint.
  ///
  /// In ar, this message translates to:
  /// **'مثلًا: استلام طرد'**
  String get errandHint;

  /// No description provided for @aquarium.
  ///
  /// In ar, this message translates to:
  /// **'الحوض'**
  String get aquarium;

  /// No description provided for @aquariumSub.
  ///
  /// In ar, this message translates to:
  /// **'وحدة اختيارية · تطلع بس إذا عندك حوض'**
  String get aquariumSub;

  /// No description provided for @evidenceScreenSub.
  ///
  /// In ar, this message translates to:
  /// **'كل عادة في التطبيق لها مصدر، ونقول لك قوة دليلها بصراحة'**
  String get evidenceScreenSub;

  /// No description provided for @filterAll.
  ///
  /// In ar, this message translates to:
  /// **'الكل'**
  String get filterAll;

  /// No description provided for @strengthStrongest.
  ///
  /// In ar, this message translates to:
  /// **'قوة الدليل · من الأقوى'**
  String get strengthStrongest;

  /// No description provided for @strengthLegend.
  ///
  /// In ar, this message translates to:
  /// **'الإرشادات من جهات صحية رسمية، والمراجعة المنهجية تجمع دراسات كثيرة، والتجربة دراسة وحدة مضبوطة.'**
  String get strengthLegend;

  /// No description provided for @evGuideline.
  ///
  /// In ar, this message translates to:
  /// **'إرشادات'**
  String get evGuideline;

  /// No description provided for @evSrMa.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة منهجية'**
  String get evSrMa;

  /// No description provided for @evRct.
  ///
  /// In ar, this message translates to:
  /// **'تجربة'**
  String get evRct;

  /// No description provided for @evObservational.
  ///
  /// In ar, this message translates to:
  /// **'رصدية'**
  String get evObservational;

  /// No description provided for @evExpert.
  ///
  /// In ar, this message translates to:
  /// **'رأي خبراء'**
  String get evExpert;

  /// No description provided for @actionsCount.
  ///
  /// In ar, this message translates to:
  /// **'{n} من {total} إجراء'**
  String actionsCount(String n, String total);

  /// No description provided for @sourceLabel.
  ///
  /// In ar, this message translates to:
  /// **'المصدر'**
  String get sourceLabel;

  /// No description provided for @noSourceListed.
  ///
  /// In ar, this message translates to:
  /// **'ما فيه مصدر مسجّل لهذا الإجراء — نصيحة عملية.'**
  String get noSourceListed;

  /// No description provided for @inYourPlan.
  ///
  /// In ar, this message translates to:
  /// **'في خطتك'**
  String get inYourPlan;

  /// No description provided for @addToPlan.
  ///
  /// In ar, this message translates to:
  /// **'أضيفي لخطتي'**
  String get addToPlan;

  /// No description provided for @addedToInbox.
  ///
  /// In ar, this message translates to:
  /// **'انضاف لصندوق الأفكار'**
  String get addedToInbox;

  /// No description provided for @addedWeekly.
  ///
  /// In ar, this message translates to:
  /// **'انضافت لمهام الأسبوع'**
  String get addedWeekly;

  /// No description provided for @weeklyPickDay.
  ///
  /// In ar, this message translates to:
  /// **'أي يوم يناسبك؟ إذا ما حددتي، تظهر في «هذا الأسبوع».'**
  String get weeklyPickDay;

  /// No description provided for @fieldMetric.
  ///
  /// In ar, this message translates to:
  /// **'كيف أقيسها'**
  String get fieldMetric;

  /// No description provided for @atHabit.
  ///
  /// In ar, this message translates to:
  /// **'عادة'**
  String get atHabit;

  /// No description provided for @atRoutineStep.
  ///
  /// In ar, this message translates to:
  /// **'خطوة روتين'**
  String get atRoutineStep;

  /// No description provided for @atWeekly.
  ///
  /// In ar, this message translates to:
  /// **'أسبوعية'**
  String get atWeekly;

  /// No description provided for @atSystem.
  ///
  /// In ar, this message translates to:
  /// **'نظام يُضبط مرة'**
  String get atSystem;

  /// No description provided for @atReference.
  ///
  /// In ar, this message translates to:
  /// **'مرجع'**
  String get atReference;

  /// No description provided for @atProjectStep.
  ///
  /// In ar, this message translates to:
  /// **'خطوة مشروع'**
  String get atProjectStep;

  /// No description provided for @langAndLook.
  ///
  /// In ar, this message translates to:
  /// **'اللغة والمظهر'**
  String get langAndLook;

  /// No description provided for @notificationsSection.
  ///
  /// In ar, this message translates to:
  /// **'التنبيهات'**
  String get notificationsSection;

  /// No description provided for @capRange.
  ///
  /// In ar, this message translates to:
  /// **'من 0 إلى 6 · الافتراضي 4'**
  String get capRange;

  /// No description provided for @capNone.
  ///
  /// In ar, this message translates to:
  /// **'بدون تنبيهات — التطبيق يشتغل وأنتِ تفتحينه.'**
  String get capNone;

  /// No description provided for @capCaption.
  ///
  /// In ar, this message translates to:
  /// **'موجز الصباح · إغلاق المساء · والباقي عند إشارات عاداتك اللي فيها تذكير.'**
  String get capCaption;

  /// No description provided for @scheduledToday.
  ///
  /// In ar, this message translates to:
  /// **'مجدول اليوم: {n}'**
  String scheduledToday(String n);

  /// No description provided for @quietHours.
  ///
  /// In ar, this message translates to:
  /// **'ساعات الهدوء'**
  String get quietHours;

  /// No description provided for @fromLabel.
  ///
  /// In ar, this message translates to:
  /// **'من'**
  String get fromLabel;

  /// No description provided for @toLabel.
  ///
  /// In ar, this message translates to:
  /// **'إلى'**
  String get toLabel;

  /// No description provided for @focusSilences.
  ///
  /// In ar, this message translates to:
  /// **'وجلسات التركيز توقف التنبيهات تلقائيًا.'**
  String get focusSilences;

  /// No description provided for @anchorsSection.
  ///
  /// In ar, this message translates to:
  /// **'المراسي · الإشارات اللي تبدأ منها عاداتك'**
  String get anchorsSection;

  /// No description provided for @prayerAnchorsSettingsSub.
  ///
  /// In ar, this message translates to:
  /// **'اختيارية · تُحسب على جهازك · أم القرى'**
  String get prayerAnchorsSettingsSub;

  /// No description provided for @cityLabel.
  ///
  /// In ar, this message translates to:
  /// **'المدينة'**
  String get cityLabel;

  /// No description provided for @cityMakkah.
  ///
  /// In ar, this message translates to:
  /// **'مكة'**
  String get cityMakkah;

  /// No description provided for @cityJeddah.
  ///
  /// In ar, this message translates to:
  /// **'جدة'**
  String get cityJeddah;

  /// No description provided for @modulesSection.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات الاختيارية'**
  String get modulesSection;

  /// No description provided for @cycleModuleSub.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل خاص بك · مطفأة افتراضيًا'**
  String get cycleModuleSub;

  /// No description provided for @pcosModuleSub.
  ///
  /// In ar, this message translates to:
  /// **'فقط إذا فيه تشخيص من طبيبة'**
  String get pcosModuleSub;

  /// No description provided for @aquariumModuleSub.
  ///
  /// In ar, this message translates to:
  /// **'مهام الماء والإطعام'**
  String get aquariumModuleSub;

  /// No description provided for @modulesPrivacy.
  ///
  /// In ar, this message translates to:
  /// **'كل البيانات على جهازك فقط — بدون حساب أو خادم. الوحدات الحساسة مطفأة افتراضيًا، وتقدرين تقفلينها بـ Face ID.'**
  String get modulesPrivacy;

  /// No description provided for @privacyData.
  ///
  /// In ar, this message translates to:
  /// **'الخصوصية والبيانات'**
  String get privacyData;

  /// No description provided for @appLockSettingsSub.
  ///
  /// In ar, this message translates to:
  /// **'Face ID للأقسام الحساسة'**
  String get appLockSettingsSub;

  /// No description provided for @forgivingStreakTitle.
  ///
  /// In ar, this message translates to:
  /// **'سلسلة متسامحة'**
  String get forgivingStreakTitle;

  /// No description provided for @forgivingStreakSub.
  ///
  /// In ar, this message translates to:
  /// **'اختيارية · يومين سماح كل أسبوع'**
  String get forgivingStreakSub;

  /// No description provided for @exportAll.
  ///
  /// In ar, this message translates to:
  /// **'تصدير كل البيانات'**
  String get exportAll;

  /// No description provided for @importFile.
  ///
  /// In ar, this message translates to:
  /// **'استيراد من ملف'**
  String get importFile;

  /// No description provided for @exportDone.
  ///
  /// In ar, this message translates to:
  /// **'جهّزنا الملف للمشاركة.'**
  String get exportDone;

  /// No description provided for @exportFailed.
  ///
  /// In ar, this message translates to:
  /// **'ما قدرنا نشارك الملف.'**
  String get exportFailed;

  /// No description provided for @importConfirmTitle.
  ///
  /// In ar, this message translates to:
  /// **'نستبدل بياناتك؟'**
  String get importConfirmTitle;

  /// No description provided for @importConfirmBody.
  ///
  /// In ar, this message translates to:
  /// **'بيانات الملف تحل محل كل بياناتك الحالية على هذا الجهاز.'**
  String get importConfirmBody;

  /// No description provided for @importDone.
  ///
  /// In ar, this message translates to:
  /// **'تم الاستيراد.'**
  String get importDone;

  /// No description provided for @importFailed.
  ///
  /// In ar, this message translates to:
  /// **'الملف ما ينقرأ — تأكدي إنه تصدير من التطبيق.'**
  String get importFailed;

  /// No description provided for @deleteAll.
  ///
  /// In ar, this message translates to:
  /// **'حذف كل البيانات'**
  String get deleteAll;

  /// No description provided for @deleteAllNote.
  ///
  /// In ar, this message translates to:
  /// **'نطلب تأكيد مرتين قبل الحذف، وننصح بالتصدير أول.'**
  String get deleteAllNote;

  /// No description provided for @deleteAllTitle.
  ///
  /// In ar, this message translates to:
  /// **'نحذف كل شي؟'**
  String get deleteAllTitle;

  /// No description provided for @deleteAllBody1.
  ///
  /// In ar, this message translates to:
  /// **'عاداتك وسجلاتك وشراراتك ومكافآتك كلها تنحذف من الجهاز. ننصحك تصدّرين نسخة أول.'**
  String get deleteAllBody1;

  /// No description provided for @deleteContinue.
  ///
  /// In ar, this message translates to:
  /// **'أكملي'**
  String get deleteContinue;

  /// No description provided for @deleteAllTitle2.
  ///
  /// In ar, this message translates to:
  /// **'متأكدة؟'**
  String get deleteAllTitle2;

  /// No description provided for @deleteAllBody2.
  ///
  /// In ar, this message translates to:
  /// **'هذي آخر خطوة — الحذف ما يتراجع عنه.'**
  String get deleteAllBody2;

  /// No description provided for @deleteAllFinal.
  ///
  /// In ar, this message translates to:
  /// **'احذفي كل شي'**
  String get deleteAllFinal;

  /// No description provided for @whenToSeekHelp.
  ///
  /// In ar, this message translates to:
  /// **'متى أطلب مساعدة مختص؟'**
  String get whenToSeekHelp;

  /// No description provided for @helpBullet1.
  ///
  /// In ar, this message translates to:
  /// **'إذا الضيق أو القلق أو التوتر مستمر ويأثر على يومك.'**
  String get helpBullet1;

  /// No description provided for @helpBullet2.
  ///
  /// In ar, this message translates to:
  /// **'إذا صار صعب تهتمين بأساسياتك: النوم، الأكل، الشغل أو الدراسة.'**
  String get helpBullet2;

  /// No description provided for @helpBullet3.
  ///
  /// In ar, this message translates to:
  /// **'إذا جتك أفكار إنك تأذين نفسك — روحي للطوارئ الحين.'**
  String get helpBullet3;

  /// No description provided for @savedNumbers.
  ///
  /// In ar, this message translates to:
  /// **'أرقام محفوظة لك'**
  String get savedNumbers;

  /// No description provided for @moh937.
  ///
  /// In ar, this message translates to:
  /// **'وزارة الصحة'**
  String get moh937;

  /// No description provided for @moh937Sub.
  ///
  /// In ar, this message translates to:
  /// **'استشارة طبية بالهاتف · 24 ساعة'**
  String get moh937Sub;

  /// No description provided for @mohPsych.
  ///
  /// In ar, this message translates to:
  /// **'مركز الاستشارات النفسية (وزارة الصحة)'**
  String get mohPsych;

  /// No description provided for @mohPsychSub.
  ///
  /// In ar, this message translates to:
  /// **'مختصين في الصحة النفسية\n8 ص – 8 م، السبت 1 م – 8 م'**
  String get mohPsychSub;

  /// No description provided for @ambulance.
  ///
  /// In ar, this message translates to:
  /// **'الهلال الأحمر (إسعاف)'**
  String get ambulance;

  /// No description provided for @unifiedEmergency.
  ///
  /// In ar, this message translates to:
  /// **'الطوارئ الموحد'**
  String get unifiedEmergency;

  /// No description provided for @erOpen.
  ///
  /// In ar, this message translates to:
  /// **'وأقسام الطوارئ في المستشفيات مفتوحة 24 ساعة.'**
  String get erOpen;

  /// No description provided for @notSubstituteLong.
  ///
  /// In ar, this message translates to:
  /// **'هذا التطبيق ليس بديلًا عن المختص. ما يشخّص ولا يتابع حالتك النفسية — يساعدك في يومك بس.'**
  String get notSubstituteLong;

  /// No description provided for @callN.
  ///
  /// In ar, this message translates to:
  /// **'اتصال {title}: {n}'**
  String callN(String title, String n);

  /// No description provided for @recoverySpeedSub.
  ///
  /// In ar, this message translates to:
  /// **'كم يوم تاخذين عشان ترجعين بعد ما تفوّتين عادة أساسية.'**
  String get recoverySpeedSub;

  /// No description provided for @beforeRoadmap.
  ///
  /// In ar, this message translates to:
  /// **'قبل بداية السنة · {date} — تبدأ في أكتوبر'**
  String beforeRoadmap(String date);

  /// No description provided for @sizeQuickShort.
  ///
  /// In ar, this message translates to:
  /// **'سريعة'**
  String get sizeQuickShort;

  /// No description provided for @bnplNextAmount.
  ///
  /// In ar, this message translates to:
  /// **'القسط الجاي {amount} ر.س'**
  String bnplNextAmount(String amount);

  /// No description provided for @bnplPaymentN.
  ///
  /// In ar, this message translates to:
  /// **'الدفعة {n} من {total}'**
  String bnplPaymentN(String n, String total);

  /// No description provided for @overdueDays.
  ///
  /// In ar, this message translates to:
  /// **'متأخر {n} يوم'**
  String overdueDays(String n);

  /// No description provided for @storageUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة'**
  String get storageUnavailable;

  /// No description provided for @undoExpired.
  ///
  /// In ar, this message translates to:
  /// **'انتهت مهلة التراجع — تقدرين تلغين الإنجاز من البطاقة.'**
  String get undoExpired;

  /// No description provided for @setSmallDuration.
  ///
  /// In ar, this message translates to:
  /// **'حددي مدة صغيرة'**
  String get setSmallDuration;

  /// No description provided for @setSmallDurationRequired.
  ///
  /// In ar, this message translates to:
  /// **'حددي مدة صغيرة للنسخة الأدنى قبل الحفظ.'**
  String get setSmallDurationRequired;

  /// No description provided for @estimateTag.
  ///
  /// In ar, this message translates to:
  /// **'تقدير'**
  String get estimateTag;

  /// No description provided for @momentumResting.
  ///
  /// In ar, this message translates to:
  /// **'راحة'**
  String get momentumResting;

  /// No description provided for @shapeRedOne.
  ///
  /// In ar, this message translates to:
  /// **'شي واحد صغير + متعة'**
  String get shapeRedOne;

  /// No description provided for @shapeRedTwo.
  ///
  /// In ar, this message translates to:
  /// **'شيئين صغار + متعة'**
  String get shapeRedTwo;

  /// No description provided for @wrEndWinNoTop.
  ///
  /// In ar, this message translates to:
  /// **'{win} — وهذا بالضبط اللي نبنيه. الأسبوع الجاي يبدأ بهدوء.'**
  String wrEndWinNoTop(String win);

  /// No description provided for @helpSources.
  ///
  /// In ar, this message translates to:
  /// **'مصادر الأرقام'**
  String get helpSources;

  /// No description provided for @helpSrc937.
  ///
  /// In ar, this message translates to:
  /// **'937 — صفحة خدمة 937، وزارة الصحة'**
  String get helpSrc937;

  /// No description provided for @helpSrcPsych.
  ///
  /// In ar, this message translates to:
  /// **'920033360 — صفحة خدمات الصحة النفسية، وزارة الصحة'**
  String get helpSrcPsych;

  /// No description provided for @helpSrc911.
  ///
  /// In ar, this message translates to:
  /// **'911 — موقع هيئة الهلال الأحمر السعودي'**
  String get helpSrc911;

  /// No description provided for @unsourcedBadge.
  ///
  /// In ar, this message translates to:
  /// **'ممارسة عملية — بلا مصدر محكّم'**
  String get unsourcedBadge;

  /// No description provided for @nudgeDuesTitle.
  ///
  /// In ar, this message translates to:
  /// **'مستحقات اليوم'**
  String get nudgeDuesTitle;

  /// No description provided for @duesAutoSave.
  ///
  /// In ar, this message translates to:
  /// **'تحويل الادخار التلقائي'**
  String get duesAutoSave;

  /// No description provided for @helpSrc997.
  ///
  /// In ar, this message translates to:
  /// **'997 — خطة الترقيم الوطنية، هيئة الاتصالات والفضاء والتقنية'**
  String get helpSrc997;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
