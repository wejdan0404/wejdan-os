// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String whyGrowFocus(String domain) {
    return 'من تركيز موسمك: $domain';
  }

  @override
  String whyStrengthDay(String n, String total) {
    return 'يوم القوة $n من $total هذا الأسبوع';
  }

  @override
  String get whyWalkDay => 'يوم مشي — عضلاتك ترتاح بين أيام القوة';

  @override
  String whyIeltsRotation(String skill) {
    return 'مفرداتك + مهارة اليوم: $skill';
  }

  @override
  String whyVocabDue(String count) {
    return '$count بطاقة تنتظر المراجعة — تكرار متباعد';
  }

  @override
  String get whyComeback => 'رجعتي — وهذا أهم جزء';

  @override
  String whyMaintainLight(String domain) {
    return 'صيانة خفيفة: $domain';
  }

  @override
  String whyChainStep(String routine) {
    return 'خطوة من $routine';
  }

  @override
  String get whyWeeklyDue => 'مهمة هذا الأسبوع — يومها اليوم';

  @override
  String whyWeeklyCarried(String day) {
    return 'مهمة هذا الأسبوع — تنتظرك من يوم $day';
  }

  @override
  String get whyWeeklyReview => 'نهاية الأسبوع — وقت نقفل الفصل بهدوء';

  @override
  String whyProjectNext(String project) {
    return 'الخطوة التالية في $project';
  }

  @override
  String get whyFreeJoy => 'متعة لك — بدون شروط';

  @override
  String get whyRedEssential => 'يوم هادئ — نسخة صغيرة تكفي اليوم';

  @override
  String get whyYellowMinimum => 'طاقتك متوسطة — النسخة الصغيرة تكفي';

  @override
  String get whyTimeTrimmed => 'يومك مزدحم — النسخة الصغيرة تناسب وقتك';

  @override
  String get ieltsSkillReading => 'القراءة';

  @override
  String get ieltsSkillListening => 'الاستماع';

  @override
  String get ieltsSkillWriting => 'الكتابة';

  @override
  String get ieltsSkillSpeaking => 'المحادثة';

  @override
  String get ieltsSkillMixedReadingListening => 'قراءة واستماع معًا';

  @override
  String get ieltsSkillLightReview => 'مراجعة خفيفة أو اختبار تجريبي';

  @override
  String get weekday1 => 'الاثنين';

  @override
  String get weekday2 => 'الثلاثاء';

  @override
  String get weekday3 => 'الأربعاء';

  @override
  String get weekday4 => 'الخميس';

  @override
  String get weekday5 => 'الجمعة';

  @override
  String get weekday6 => 'السبت';

  @override
  String get weekday7 => 'الأحد';

  @override
  String get nudgeMorningTitle => 'صباح الخير — يومك جاهز';

  @override
  String nudgeMorningBody(String first) {
    return 'أول خطوة: $first';
  }

  @override
  String get nudgeMorningBodyEmpty => 'خذي نفس وشوفي خطتك';

  @override
  String get nudgeAnchoredBody => 'نسخة صغيرة تكفي اليوم';

  @override
  String get nudgeEveningTitle => 'إغلاق اليوم';

  @override
  String get nudgeEveningBody => 'دقيقتين نرتب بكرة ونبدأ التهدئة';

  @override
  String get nudgeActionDone => 'تم — نسخة صغيرة';

  @override
  String get nudgeActionSnooze => 'بعد 30 دقيقة';

  @override
  String get nudgeActionSkip => 'تخطي اليوم';

  @override
  String get appTitle => 'Wejdan Life OS — وجدان';

  @override
  String get tabToday => 'اليوم';

  @override
  String get tabHabits => 'العناية';

  @override
  String get tabPath => 'مهني';

  @override
  String get tabJoy => 'متعتي';

  @override
  String get tabMe => 'أنا';

  @override
  String get energyGreen => 'طاقة عالية';

  @override
  String get energyYellow => 'طاقة متوسطة';

  @override
  String get energyRed => 'يوم هادئ';

  @override
  String get levelMinimum => 'نسخة صغيرة';

  @override
  String get levelNormal => 'النسخة العادية';

  @override
  String get levelBonus => 'إضافي';

  @override
  String get levelSkipped => 'تخطيت اليوم';

  @override
  String get tierCore => 'الأساسي';

  @override
  String get tierMaintain => 'صيانة';

  @override
  String get tierJoy => 'متعة';

  @override
  String get tierChain => 'روتين';

  @override
  String get tierSystem => 'طقس أسبوعي';

  @override
  String get sectionMorningChain => 'روتين الصباح';

  @override
  String get sectionDay => 'خلال اليوم';

  @override
  String get sectionEveningChain => 'روتين المساء';

  @override
  String get thisWeekStrip => 'هذا الأسبوع';

  @override
  String get stageSeed => 'بذرة';

  @override
  String get stageSprout => 'برعم';

  @override
  String get stageGrowing => 'تنمو';

  @override
  String get stageRooted => 'متجذّرة';

  @override
  String get stageAutomatic => 'تلقائية';

  @override
  String get missForgot => 'نسيت';

  @override
  String get missBadTime => 'الوقت ما كان مناسب';

  @override
  String get missTooBig => 'كانت كبيرة';

  @override
  String get missTired => 'كنت تعبانة';

  @override
  String get missNotEnjoyable => 'ما كانت ممتعة';

  @override
  String get missPlaceDidntFit => 'المكان ما ناسب';

  @override
  String get missBusy => 'كنت مشغولة';

  @override
  String get missNotImportantNow => 'مو مهمة الحين';

  @override
  String get recoveryTitle => 'وش صار؟ خلينا نعدل التصميم مو نلومك';

  @override
  String get changeMoveCueAddReminder => 'نربطها بإشارة أوضح ونفعّل تذكير واحد';

  @override
  String get changeSwapTime => 'ننقلها لوقت يناسبك أكثر';

  @override
  String get changeShrinkToMinimum => 'نصغّرها للنسخة الصغيرة';

  @override
  String get changeMinimumAndMoveEarlier => 'نسخة صغيرة وفي وقت أبكر';

  @override
  String get changeAddJoyPairing => 'نضيف لها متعة مرافقة أو نغير النشاط';

  @override
  String get changeChangePlacePrepare => 'نغير المكان أو نجهزه مسبقًا';

  @override
  String get changeShrinkAndReschedule => 'نصغّرها ونخفف أيامها';

  @override
  String get changePauseToRest => 'نريّحها هذا الموسم';

  @override
  String get comebackCelebration => 'رجعتي — هذا أهم جزء';

  @override
  String get sparksLabel => 'شرارات';

  @override
  String get sparkReasonCompletion => 'بداية';

  @override
  String get sparkReasonComeback => 'عودة';

  @override
  String get sparkReasonWeeklyReview => 'مراجعة أسبوعية';

  @override
  String get sparkReasonExperiment => 'تجربة';

  @override
  String get sparkReasonRedeem => 'مكافأة';

  @override
  String get sparkReasonReversal => 'تراجع';

  @override
  String get sparkReasonAdjustment => 'تعديل';

  @override
  String get undo => 'تراجع';

  @override
  String get smallVersionEnough => 'نسخة صغيرة تكفي اليوم';

  @override
  String get whyLabel => 'لماذا؟';

  @override
  String get helpSafetyLink => 'المساعدة والأمان';

  @override
  String get helpMoh => 'وزارة الصحة 937';

  @override
  String get helpEmergency => 'الطوارئ 997 / 911';

  @override
  String get placeholderHomeTitle => 'خطة اليوم';

  @override
  String get placeholderLoading => 'نجهز يومك…';

  @override
  String get placeholderError => 'صار خطأ في التحميل';

  @override
  String get userName => 'وجدان';

  @override
  String greetingMorning(String name) {
    return 'صباح الخير، $name';
  }

  @override
  String greetingEvening(String name) {
    return 'مساء الخير، $name';
  }

  @override
  String get months =>
      'يناير,فبراير,مارس,أبريل,مايو,يونيو,يوليو,أغسطس,سبتمبر,أكتوبر,نوفمبر,ديسمبر';

  @override
  String minutesShort(String m) {
    return '$m د';
  }

  @override
  String minutesPlus(String m) {
    return '$m+ د';
  }

  @override
  String get close => 'إغلاق';

  @override
  String get back => 'رجوع';

  @override
  String get next => 'التالي';

  @override
  String get cancel => 'إلغاء';

  @override
  String get save => 'حفظ';

  @override
  String get add => 'إضافة';

  @override
  String get change => 'تغيير';

  @override
  String get optional => '(اختياري)';

  @override
  String get later => 'لاحقًا';

  @override
  String get more => 'أكثر';

  @override
  String get fewer => 'أقل';

  @override
  String get pause => 'إيقاف مؤقت';

  @override
  String get resume => 'متابعة';

  @override
  String get suggested => 'مقترح';

  @override
  String xOfY(String x, String y) {
    return '$x من $y';
  }

  @override
  String stepOf(String n, String total) {
    return 'الخطوة $n من $total';
  }

  @override
  String get itemNotFound => 'ما لقينا هذا العنصر — يمكن تغيّرت خطة اليوم.';

  @override
  String get mainNavigation => 'التنقل الرئيسي';

  @override
  String get doneShort => 'تم';

  @override
  String get skippedShort => 'تخطيتها';

  @override
  String get backToToday => 'ارجعي لليوم';

  @override
  String get energyChipGreen => 'طاقتي: جيدة';

  @override
  String get energyChipYellow => 'طاقتي: متوسطة';

  @override
  String get energyChipRed => 'طاقتي: منخفضة';

  @override
  String get energyGood => 'جيدة';

  @override
  String get energyGoodSub => 'يوم عادي';

  @override
  String get energyMid => 'متوسطة';

  @override
  String get energyMidSub => 'نسخ أخف';

  @override
  String get energyLow => 'منخفضة';

  @override
  String get energyLowSub => 'الحد الأدنى';

  @override
  String get levelGroupLabel => 'مستوى الإنجاز';

  @override
  String get levelShortMin => 'أدنى';

  @override
  String get levelShortNormal => 'عادي';

  @override
  String get levelShortBonus => 'إضافي';

  @override
  String get domainHealth => 'الحركة';

  @override
  String get domainSleep => 'النوم';

  @override
  String get domainFood => 'الأكل';

  @override
  String get domainCare => 'العناية';

  @override
  String get domainWomensHealth => 'صحة المرأة';

  @override
  String get domainIelts => 'IELTS';

  @override
  String get domainLearning => 'التعلّم';

  @override
  String get domainCareer => 'المسار المهني';

  @override
  String get domainDriving => 'القيادة';

  @override
  String get domainMoney => 'المال';

  @override
  String get domainHome => 'البيت';

  @override
  String get domainDigital => 'الحياة الرقمية';

  @override
  String get domainAdmin => 'الأمور الإدارية';

  @override
  String get domainJoy => 'المتعة';

  @override
  String get domainPeople => 'الناس';

  @override
  String get domainFaith => 'الإيمان والمعنى';

  @override
  String get domainAquarium => 'حوض السمك';

  @override
  String get prayerFajr => 'الفجر';

  @override
  String get prayerDhuhr => 'الظهر';

  @override
  String get prayerAsr => 'العصر';

  @override
  String get prayerMaghrib => 'المغرب';

  @override
  String get prayerIsha => 'العشاء';

  @override
  String get slotMorning => 'الصباح';

  @override
  String get slotMidday => 'الظهيرة';

  @override
  String get slotAfternoon => 'العصرية';

  @override
  String get slotEvening => 'المساء';

  @override
  String get slotNight => 'الليل';

  @override
  String get slotAnytime => 'أي وقت';

  @override
  String get dayLabel => 'النهار';

  @override
  String cueAfter(String p) {
    return 'بعد $p';
  }

  @override
  String cueBefore(String p) {
    return 'قبل $p';
  }

  @override
  String get cueAfterWake => 'بعد الاستيقاظ';

  @override
  String get cueBeforeSleep => 'قبل النوم';

  @override
  String get fixedTime => 'وقت محدد';

  @override
  String get morningBriefTitle => 'موجز الصباح';

  @override
  String get eveningShutdownTitle => 'إغلاق اليوم';

  @override
  String get weekMomentum => 'زخم\nالأسبوع';

  @override
  String get weekMomentumOneLine => 'زخم الأسبوع';

  @override
  String get momentum => 'الزخم';

  @override
  String get dayReady => 'يومك جاهز';

  @override
  String get dayReadySubGreen => 'على قد طاقتك اليوم، ونسخة صغيرة تكفي';

  @override
  String get dayReadySubYellow => 'طاقتك متوسطة — خففنا النسخ اليوم';

  @override
  String get dayReadySubRed => 'يوم هادئ — الحد الأدنى يكفي';

  @override
  String get dayShapeLabel => 'شكل يومك';

  @override
  String get dayProgress => 'تقدم اليوم';

  @override
  String doneOf(String done, String total) {
    return '$done من $total';
  }

  @override
  String get tilesCore => 'أساسية';

  @override
  String get tilesMaintain => 'صيانة';

  @override
  String get tilesJoy => 'متعة';

  @override
  String coreSection(String n) {
    return 'الأساسيات · $n';
  }

  @override
  String get anyVersionCounts => 'أي نسخة تُحسب إنجازًا';

  @override
  String maintainSection(String n) {
    return 'الصيانة · $n · خفيفة';
  }

  @override
  String get eveningSection => 'المساء';

  @override
  String get freeJoySection => 'متعة حرة';

  @override
  String get freeJoySub => 'لك بدون شروط — ما تحتاجين تستحقينها';

  @override
  String chainDone(String done, String total, String time) {
    return 'اكتملت · $done من $total · بدأت $time';
  }

  @override
  String chainProgress(String done, String total, String time) {
    return '$done من $total · تبدأ $time';
  }

  @override
  String openChain(String title) {
    return 'فتح $title';
  }

  @override
  String checkLabel(String title) {
    return 'تم: $title';
  }

  @override
  String uncheckLabel(String title) {
    return 'إلغاء إنجاز $title';
  }

  @override
  String joyCheckLabel(String title) {
    return 'استمتعت: $title';
  }

  @override
  String joyPlus(String b) {
    return '+ $b';
  }

  @override
  String doneLogged(String level) {
    return 'انحسبت — $level';
  }

  @override
  String get joyLogged => 'استمتعي — هذي لك';

  @override
  String get startSession => 'ابدئي الجلسة';

  @override
  String get thisWeekAnyDay => 'أي يوم';

  @override
  String recoveryBannerTitle(String title) {
    return 'نعدّل تصميم $title؟';
  }

  @override
  String get recoveryBannerSub =>
      'ما مشى الحال كم مرة — نعدّل التصميم، مو نلومك';

  @override
  String get calmDayTitle => 'يوم هادئ';

  @override
  String get calmDayBody =>
      'أشياء صغيرة ومتعة لك — هذا يكفي تمامًا. الباقي يرتاح اليوم بدون ما ينقص شي.';

  @override
  String minimumOnly(String done, String total) {
    return 'الحد الأدنى فقط · $done من $total';
  }

  @override
  String restingNote(String items) {
    return '$items ترتاح اليوم. يوم هادئ مو تراجع — ولا شي يرجع للصفر.';
  }

  @override
  String get helpLinkRed => 'إذا الأمور ثقيلة جدًا: المساعدة موجودة';

  @override
  String get helpIntro =>
      'إذا حسيتي إن الأمور أثقل من المعتاد لفترة، الحديث مع مختص خطوة قوية. هذا التطبيق ما يشخّص ولا يتابع حالتك النفسية.';

  @override
  String get helpNote => 'في الطوارئ اتصلي مباشرة.';

  @override
  String get quickAddTitle => 'إضافة سريعة';

  @override
  String get quickAddHabit => 'عادة جديدة';

  @override
  String get quickAddHabitSub => 'نصممها خطوة خطوة في الاستوديو';

  @override
  String get quickAddBlock => 'موعد ثابت اليوم';

  @override
  String get quickAddBlockSub => 'الخطة تتكيف حول وقتك';

  @override
  String get quickAddFocus => 'جلسة تركيز الآن';

  @override
  String get quickAddFocusSub => 'مؤقت وتنبيهات صامتة';

  @override
  String get blockTitleHint => 'وش الموعد؟ مثلًا: محاضرة';

  @override
  String startsAt(String t) {
    return 'تبدأ $t';
  }

  @override
  String get coreHabit => 'عادة أساسية';

  @override
  String get maintainHabit => 'عادة صيانة';

  @override
  String get growthStage => 'مرحلة النمو';

  @override
  String get last4Weeks => 'آخر 4 أسابيع';

  @override
  String get legendFull => 'كامل';

  @override
  String get legendMin => 'أدنى';

  @override
  String get legendRest => 'راحة';

  @override
  String gridSummary(String n) {
    return 'أنجزتيها $n مرة في آخر 4 أسابيع';
  }

  @override
  String get designSection => 'التصميم';

  @override
  String get fieldCue => 'الإشارة';

  @override
  String get fieldVersions => 'النسخ';

  @override
  String get fieldIfThen => 'إذا... فإني';

  @override
  String get fieldEasy => 'أسهّلها';

  @override
  String get fieldJoy => 'المتعة';

  @override
  String get minimumIs => 'النسخة الصغيرة:';

  @override
  String get doseLabel => 'الجرعة حسب المصدر';

  @override
  String get sourceLanguageNote => 'نص الدليل بلغته الأصلية (الإنجليزية).';

  @override
  String sourcesCount(String n) {
    return 'المصادر · $n';
  }

  @override
  String get openSource => 'فتح المصدر';

  @override
  String get linkOpenFailed => 'ما قدرنا نفتح الرابط';

  @override
  String get noEvidenceLinked => 'ما فيه دليل مربوط بهذا العنصر.';

  @override
  String get evidenceGuideline => 'دليل قوي · إرشادات رسمية';

  @override
  String get evidenceSrMa => 'دليل قوي · مراجعة منهجية';

  @override
  String get evidenceRct => 'دليل جيد · تجارب مضبوطة';

  @override
  String get evidenceObservational => 'دليل متوسط · رصدي';

  @override
  String get evidenceExpert => 'رأي خبراء';

  @override
  String get editHabitDesign => 'عدّلي تصميم العادة';

  @override
  String get markDoneMinimum => 'سجّليها منجزة (نسخة صغيرة)';

  @override
  String get evidenceLibrary => 'مكتبة الأدلة';

  @override
  String get briefQuestion =>
      'كيف طاقتك اليوم؟ اختاري وحدة، والخطة تتكيّف معك.';

  @override
  String shapeLine(String core, String maintain, String joy) {
    return '$core أساسية · $maintain صيانة · $joy متعة';
  }

  @override
  String shapeRed(String n) {
    return '$n أشياء صغيرة + متعة';
  }

  @override
  String get shapeSubGreen =>
      'خطتك العادية، ولكل عادة نسخة صغيرة إذا احتجتيها.';

  @override
  String get shapeSubYellow => 'نسخ أخف وعادتين أساسيتين كحد أقصى.';

  @override
  String get shapeSubRed => 'الأساسيات بأصغر نسخة ومتعة لك — بدون ذنب.';

  @override
  String get firstStep => 'أول خطوة';

  @override
  String get startMyDay => 'ابدئي يومي';

  @override
  String get startMorningChainNow => 'شغّلي سلسلة الصباح مباشرة';

  @override
  String get chainComplete => 'اكتملت السلسلة';

  @override
  String chainCompleteTitle(String title) {
    return '$title — اكتملت';
  }

  @override
  String get chainCompleteSub =>
      'سلسلة كاملة بدون تفكير — هذا بالضبط اللي نبنيه.';

  @override
  String timeLeft(String t) {
    return 'باقي $t';
  }

  @override
  String get stepsLabel => 'الخطوات';

  @override
  String get currentStep => 'الحالية';

  @override
  String doneNext(String next) {
    return 'تم، التالي: $next';
  }

  @override
  String get doneFinish => 'تم، أنهي السلسلة';

  @override
  String get skipStepToday => 'تخطّي هذه الخطوة اليوم';

  @override
  String get focusSession => 'جلسة تركيز';

  @override
  String get freeFocusTitle => 'جلسة تركيز حرة';

  @override
  String get nudgesSilenced => 'التنبيهات صامتة';

  @override
  String get remaining => 'متبقي';

  @override
  String get readyWhenYouAre => 'جاهزة لما تكونين جاهزة';

  @override
  String get sessionLength => 'مدة الجلسة';

  @override
  String get attemptFirstTitle => 'حاولي أولًا ثم اسألي الذكاء الاصطناعي';

  @override
  String get attemptFirstBody =>
      'اكتبي محاولتك ولو ناقصة — المحاولة قبل الجواب تثبّت الفهم.';

  @override
  String get attemptHint => 'محاولتي...';

  @override
  String get phoneAwayTitle => 'بعّدي الجوال عنك';

  @override
  String get phoneAwayBody => 'في غرفة ثانية أو بالشنطة — مو على الطاولة.';

  @override
  String get phoneAwayAction => 'بعّدته';

  @override
  String get phoneAwayDone => 'بعيد';

  @override
  String get endSession => 'إنهاء الجلسة';

  @override
  String get leaveFocusTitle => 'ننهي الجلسة؟';

  @override
  String get leaveFocusBody =>
      'نحفظ الوقت اللي اشتغلتيه — حتى الجلسة القصيرة تُحسب.';

  @override
  String get keepGoing => 'أكمل';

  @override
  String get sessionDoneTitle => 'خلصت الجلسة';

  @override
  String get recallPrompt =>
      'بدون ما تشوفين ملاحظاتك: وش أهم شي تتذكرينه من الجلسة؟';

  @override
  String get recallHint => '3 أشياء تتذكرينها...';

  @override
  String get recallWhy =>
      'الاسترجاع بعد الدراسة يثبّت التعلم أكثر من إعادة القراءة.';

  @override
  String get sessionNotePrompt => 'كلمة عن الجلسة؟ (اختياري)';

  @override
  String get sessionNoteHint => 'وش أنجزتي؟';

  @override
  String get saveSession => 'احفظي الجلسة';

  @override
  String get discardSession => 'بدون حفظ';

  @override
  String get recoveryQuestion => 'ليش ما مشى الحال؟';

  @override
  String get recoverySub => 'نعدّل التصميم، مو نلومك. اختاري اللي ينطبق.';

  @override
  String recoveryContext(String title, String n) {
    return '$title · آخر $n مرات ما صارت';
  }

  @override
  String get proposedChange => 'تعديل مقترح';

  @override
  String get before => 'قبل';

  @override
  String get after => 'بعد';

  @override
  String afterShrink(String desc) {
    return '$desc — والباقي إضافي إذا حبّيتي';
  }

  @override
  String get afterJoy => 'نربطها بمتعة تختارينها';

  @override
  String get afterPlace => 'مكان مجهّز مسبقًا';

  @override
  String get afterRest => 'ترتاح هذا الموسم — ترجع لما تبين';

  @override
  String get oneReminderOn => 'تذكير واحد';

  @override
  String daysPerWeek(String n) {
    return '$n أيام بالأسبوع';
  }

  @override
  String get joyPairingHint => 'وش المتعة اللي تبينها معها؟';

  @override
  String get placeHint => 'وين المكان الأنسب؟ وش نجهّز؟';

  @override
  String get acceptChange => 'اعتمدي التعديل';

  @override
  String get editMyself => 'أعدّله بنفسي';

  @override
  String get recoveryDoneBody =>
      'التصميم الجديد جاهز، وأول مرة ترجعين لها تاخذين شرارات مضاعفة.';

  @override
  String get shutdownTitle => 'نقفل اليوم بهدوء';

  @override
  String shutdownDone(String done, String total) {
    return 'أنجزتي $done من $total — يوم حلو.';
  }

  @override
  String get whatHappened => 'اللي ما صار اليوم';

  @override
  String get whatHappenedSub => 'قرار سريع لكل وحدة، وبعدها تطلع من بالك.';

  @override
  String get noLeftovers => 'ما فيه شي معلّق — كل شي انحسب اليوم.';

  @override
  String get notStartedToday => 'ما بدأت اليوم';

  @override
  String get leftoverTomorrow => 'بكرة';

  @override
  String get leftoverLater => 'لاحقًا';

  @override
  String get leftoverLetGo => 'نتركها';

  @override
  String get leftoverTomorrowSub => 'تنتقل لبكرة';

  @override
  String get leftoverLaterSub => 'ترجع في يومها القادم';

  @override
  String get leftoverLetGoSub => 'نتركها — عادي';

  @override
  String get tomorrowFirst => 'أول خطوة بكرة';

  @override
  String minimumMinutes(String m) {
    return 'أدنى $m';
  }

  @override
  String get sweetMoment => 'لحظة حلوة اليوم';

  @override
  String get sweetMomentHint => 'مثلًا: القهوة مع الكتاب العصر';

  @override
  String get eveningChainTitle => 'سلسلة المساء';

  @override
  String chainAbout(String min, String sleep) {
    return 'نحو $min د · النوم $sleep';
  }

  @override
  String get startEveningChain => 'ابدئي سلسلة المساء';

  @override
  String get closeTheDay => 'أقفلي اليوم';

  @override
  String get onbStart => 'يلا نبدأ';

  @override
  String get onbFinish => 'يومي الأول جاهز';

  @override
  String get onbWelcomeTitle => 'يومك يكون جاهز\nقبل ما تصحين';

  @override
  String get onbWelcomeBody =>
      'أرتّب لك اليوم: وش تسوين، ومتى، وأصغر نسخة منه — ومعه شي تحبينه.';

  @override
  String get onbF1Title => 'نسخة صغيرة تكفي';

  @override
  String get onbF1Sub => 'لكل عادة حد أدنى، ويُحسب إنجازًا كاملًا.';

  @override
  String get onbF2Title => 'المتعة جزء من الخطة';

  @override
  String get onbF2Sub => 'نربط اللي لازم يصير باللي تحبينه.';

  @override
  String get onbF3Title => 'التعثّر معلومة، مو حكم';

  @override
  String get onbF3Sub => 'إذا ما مشى الحال، نعدّل التصميم مو نلومك.';

  @override
  String get onbLocalOnly => 'بياناتك كلها على جهازك فقط';

  @override
  String get onbUseSample => 'استخدمي الملف التجريبي';

  @override
  String get lifeMapTitle => 'خريطة حياتك لهذا الموسم';

  @override
  String get lifeMapBody =>
      'الموسم من 6 إلى 12 أسبوع. اختاري لكل مجال: نمو، صيانة، أو راحة.';

  @override
  String get lifeMapHint =>
      'النمو = تركيز هذا الموسم. الراحة مو إهمال — إيقاف مؤقت، ويختفي من يومك.';

  @override
  String get stateGrow => 'نمو';

  @override
  String get stateMaintain => 'صيانة';

  @override
  String get stateRest => 'راحة';

  @override
  String get capacityReached => 'وصلتي الحد لهذا الموسم — بدّلي مجال ثاني أول.';

  @override
  String get sensitiveModulesNote =>
      'صحة المرأة وتتبّع الدورة مقفلة افتراضيًا — تقدرين تفعّلينها من الإعدادات.';

  @override
  String get timesTitle => 'متى يبدأ يومك وينتهي؟';

  @override
  String get timesBody =>
      'نربط العادات بإشارات ثابتة من يومك، مو بساعة عشوائية.';

  @override
  String get wakeTime => 'الاستيقاظ';

  @override
  String get sleepTime => 'النوم';

  @override
  String get tapToChange => 'اضغطي للتغيير';

  @override
  String get prayerAnchors => 'أوقات الصلاة كإشارات';

  @override
  String get prayerAnchorsSub =>
      'اختياري · أم القرى · مكة المكرمة — تقدرين تغيّرينها لاحقًا';

  @override
  String timesPreview(String wake, String shutdown) {
    return 'روتين الصباح يبدأ $wake، وإغلاق اليوم حوالي $shutdown.';
  }

  @override
  String get starterTitle => 'عادات البداية';

  @override
  String get starterBody =>
      'اختاري لين 5 من مجالات النمو — نبدأ صغير ونكبر بهدوء.';

  @override
  String get joyMapTitle => 'خريطة متعتك';

  @override
  String get joyMapBody =>
      'وش يفرّحك؟ اختاري كل اللي ينطبق — ما فيه إجابة غلط.';

  @override
  String get somethingElse => 'شي ثاني';

  @override
  String get somethingElseHint => 'وش يفرّحك؟';

  @override
  String get shoppingNote => 'التسوّق يظهر معه تذكير لطيف بالميزانية.';

  @override
  String get bundlesTitle => 'باقات: متعة محجوزة لعادة';

  @override
  String get bundlesBody => 'شي تحبينه تخلينه لوقت عادة — بدون أقفال.';

  @override
  String get privacyTitle => 'التنبيهات والخصوصية';

  @override
  String get privacyBody => 'قليل من التنبيهات، وكلها مرتبطة بإشارات يومك.';

  @override
  String get notifCapTitle => 'حد التنبيهات اليومي';

  @override
  String notifCapSub(String start, String end) {
    return 'بدون تنبيهات بين $start و$end';
  }

  @override
  String perDay(String n) {
    return '$n باليوم';
  }

  @override
  String get allowNotifications => 'اسمحي بالتنبيهات';

  @override
  String get notificationsAllowed => 'التنبيهات مسموحة';

  @override
  String get notificationsNotAllowed =>
      'ما انسمح — تقدرين تغيّرينه من إعدادات الجهاز';

  @override
  String get notificationsWebNote =>
      'في نسخة المعاينة على الويب ما فيه تنبيهات.';

  @override
  String get appLockTitle => 'قفل التطبيق';

  @override
  String get appLockSub => 'Face ID للأقسام الحساسة';

  @override
  String get privacyPoint1 => 'كل بياناتك على جهازك — بدون حساب ولا سيرفر.';

  @override
  String get privacyPoint2 => 'بدون تحليلات ولا تتبّع.';

  @override
  String get privacyPoint3 => 'تصدير أو حذف كل شي من الإعدادات بأي وقت.';

  @override
  String get studioTitle => 'استوديو العادات';

  @override
  String get studioSub =>
      'نصمّم العادة خطوة خطوة — واضحة، سهلة البداية، وممتعة.';

  @override
  String studioStepOf(String n, String total) {
    return 'الخطوة $n من $total';
  }

  @override
  String get fromLibrary => 'مقترح من مكتبة الأدلة';

  @override
  String fromLibrarySub(String name) {
    return '$name — عبّأنا الحقول، عدّلي اللي تبين.';
  }

  @override
  String get noLibraryLink => 'اختاري إجراء من المكتبة لتعبئة الحقول';

  @override
  String get searchLibrary => 'ابحثي في المكتبة';

  @override
  String get fGoal => 'الهدف';

  @override
  String get fBehavior => 'السلوك';

  @override
  String get fVersions => 'النسخ: أدنى · عادي · إضافي';

  @override
  String get fCue => 'الإشارة';

  @override
  String get fPrepare => 'التحضير';

  @override
  String get fJoy => 'ربط بمتعة';

  @override
  String get fIfThen => 'خطة إذا... فإني';

  @override
  String get fFrictionUp => 'صعّبي المُغري';

  @override
  String get fReminder => 'التذكير';

  @override
  String get goalEmpty => 'ليش هذي العادة مهمة لك؟';

  @override
  String get goalHelp => 'بكلماتك: وش تبين يصير لما تثبت العادة؟';

  @override
  String get goalHint => 'مثلًا: أرفع درجتي في IELTS';

  @override
  String get behaviorHelp => 'سلوك واضح تقدرين تشوفينه — مو نية عامة.';

  @override
  String get behaviorHint => 'مثلًا: أراجع بطاقات المفردات المستحقة';

  @override
  String get behaviorRequired => 'اكتبي السلوك أول';

  @override
  String get versionsHelp =>
      'الأدنى يُحسب إنجازًا كاملًا. خليه صغير لدرجة يصعب ترفضينه.';

  @override
  String versionsSummary(String min, String normal, String bonus) {
    return 'أدنى $min · عادي $normal · إضافي $bonus';
  }

  @override
  String get cueHelp => 'بعد وش؟ اربطيها بشي يصير كل يوم.';

  @override
  String get cueTextHint => 'وصف الإشارة بكلماتك';

  @override
  String get onDays => 'الأيام';

  @override
  String get prepareHelp => 'وش تجهّزين مسبقًا عشان البداية تكون بدون تفكير؟';

  @override
  String get joyHelp => 'وش تحبين يرافقها؟ متعة تخلينها لوقتها بس.';

  @override
  String get ifThenHelp => 'وش ممكن يعطّلك؟ وش بتسوين وقتها؟';

  @override
  String get ifThenHint => 'إذا ... فإني ...';

  @override
  String get frictionUpHelp => 'وش المغري اللي ينافسها؟ كيف نبعده خطوة؟';

  @override
  String get reminderHelp =>
      'تذكير واحد كحد أقصى، مرتبط بالإشارة. الأفضل إن السلسلة تكفي.';

  @override
  String get oneReminderAtCue => 'تذكير واحد وقت الإشارة';

  @override
  String get reminderOn => 'تذكير واحد وقت الإشارة';

  @override
  String get reminderOffSummary => 'بدون تذكير';

  @override
  String nextField(String f) {
    return 'التالي: $f';
  }

  @override
  String get saveHabit => 'احفظي العادة';

  @override
  String get saveAsDraft => 'احفظيها كمسودة';

  @override
  String get savedHabit => 'انحفظت العادة — بتظهر في خطتك';

  @override
  String get savedDraft => 'انحفظت كمسودة — موقوفة لين تفعّلينها';

  @override
  String get swapOrParkTitle => 'نبدّل أو نأجّل؟';

  @override
  String capCoreHabits(String max) {
    return 'عندك $max عادات أساسية — هذا الحد عشان ما يثقل يومك.';
  }

  @override
  String capGrow(String max) {
    return '$max مجالات نمو كحد أقصى في الموسم.';
  }

  @override
  String capMaintain(String max) {
    return '$max مجالات صيانة كحد أقصى.';
  }

  @override
  String capProjects(String max) {
    return '$max مشاريع نشطة كحد أقصى.';
  }

  @override
  String capCourses(String max) {
    return 'كورس واحد نشط بكل مرة ($max).';
  }

  @override
  String get swapWith => 'بدّليها مع:';

  @override
  String get swap => 'بدّلي';

  @override
  String get parkIt => 'أجّليها (موقوفة)';

  @override
  String get placeholderHabits =>
      'استوديو العادات، المكتبة، والحديقة — قريبًا هنا.';

  @override
  String get placeholderPath => 'أهداف السنة والمشاريع والمواسم — قريبًا هنا.';

  @override
  String get placeholderJoy => 'خريطة المتعة والشرارات والمكافآت — قريبًا هنا.';

  @override
  String get placeholderMe => 'المراجعة الأسبوعية والإعدادات — قريبًا هنا.';

  @override
  String get quickPrefs => 'تفضيلات سريعة';

  @override
  String get languageLabel => 'اللغة';

  @override
  String get themeLabel => 'المظهر';

  @override
  String get themeSystem => 'تلقائي';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get appearancePalettes => 'لوحة الألوان';

  @override
  String get paletteCalmSky => 'سماء هادئة';

  @override
  String get paletteLavender => 'لافندر';

  @override
  String get paletteOcean => 'محيط';

  @override
  String get paletteForest => 'غابة';

  @override
  String get paletteRose => 'وردي داكن';

  @override
  String get paletteTerracotta => 'طيني';

  @override
  String get paletteMidnight => 'ليلي';

  @override
  String get customAccentColor => 'لون مخصص';

  @override
  String get customColorHint => 'أدخل رمز اللون مثل #6172B5';

  @override
  String get applyCustomColor => 'تطبيق اللون';

  @override
  String get invalidCustomColor =>
      'أدخل لونًا صالحًا يحقق وضوحًا كافيًا مع النص الأبيض.';

  @override
  String get cardStyle => 'تصميم البطاقات';

  @override
  String get cardStyleOutlined => 'محددة';

  @override
  String get cardStyleSoft => 'ناعمة';

  @override
  String get cardStyleMinimal => 'بسيطة';

  @override
  String get appearancePreview => 'معاينة المظهر';

  @override
  String get previewAction => 'زر تجريبي';

  @override
  String get resetAppearance => 'استعادة المظهر الافتراضي';

  @override
  String get replayOnboarding => 'أعيدي التهيئة';

  @override
  String minutesOf(String level) {
    return 'دقائق $level';
  }

  @override
  String get partMorning => 'صباحًا';

  @override
  String get partNoon => 'ظهرًا';

  @override
  String get partAfternoon => 'عصرًا';

  @override
  String get partEvening => 'مساءً';

  @override
  String get partNight => 'ليلًا';

  @override
  String get relToday => 'اليوم';

  @override
  String get relTomorrow => 'بكرة';

  @override
  String relIn(String n) {
    return 'بعد $n يوم';
  }

  @override
  String relAgo(String n) {
    return 'قبل $n يوم';
  }

  @override
  String get sar => 'ر.س';

  @override
  String get delete => 'حذف';

  @override
  String get edit => 'تعديل';

  @override
  String get notEnoughData =>
      'ما فيه بيانات كافية بعد — تظهر بعد كم يوم من التسجيل.';

  @override
  String seasonShape(String g, String m) {
    return 'أنمّي $g مجالات وأحافظ على $m';
  }

  @override
  String get byDomainMomentum => 'حسب المجال · الزخم لآخر 7 أيام';

  @override
  String maintainNote(String n, String domains) {
    return '$n عادات في المحافظة: $domains — نسختها الصغيرة تكفي.';
  }

  @override
  String get myRoutines => 'روتيناتي · إشارة وحدة تبدأ السلسلة';

  @override
  String get newHabit => 'عادة جديدة';

  @override
  String coreCapacityNote(String n, String max, String left) {
    return 'عندك $n عادات أساسية من $max — باقي $left.';
  }

  @override
  String get myGarden => 'حديقتي';

  @override
  String get gardenSub =>
      'كل عادة نبتة. تكبر مع التلقائية، وإذا غبتِ عنها ترتاح — ما تذبل.';

  @override
  String get gardenEmpty => 'حديقتك تنتظر أول نبتة — أضيفي عادة من الاستوديو.';

  @override
  String get plantResting => 'ترتاح';

  @override
  String get plantRestingNote =>
      'هذي النبتة ترتاح. ترجع تكبر من أول نسخة صغيرة — بدون ما يضيع شي.';

  @override
  String get gardenNoData => 'بدأت للتو — المرحلة تتضح بعد كم مرة.';

  @override
  String consistencyLine(String p) {
    return 'الثبات $p٪ في آخر 4 أسابيع.';
  }

  @override
  String srbaiLine(String v) {
    return 'التلقائية $v من 5 في آخر فحص.';
  }

  @override
  String get noSrbaiYet => 'فحص التلقائية يصير في المراجعة الأسبوعية.';

  @override
  String get noCoreHabits => 'ما فيه عادات أساسية في مجالات النمو الحين.';

  @override
  String get noRoutines => 'ما فيه روتينات بعد.';

  @override
  String stepsCount(String n) {
    return '$n خطوات';
  }

  @override
  String get everyDay => 'يوميًا';

  @override
  String momentumOf(String title, String v) {
    return 'زخم $title: $v من 100';
  }

  @override
  String get pathSub =>
      'سنتي: أكتوبر 2026 ← سبتمبر 2027 · خطة مقترحة تعدّلينها متى ما بغيتي';

  @override
  String get weeklyReview => 'مراجعة الأسبوع';

  @override
  String get yearInQuarters => 'السنة في 4 أرباع';

  @override
  String get goalsNextStep => 'أهدافي · وكل هدف له خطوة تالية وحدة';

  @override
  String get seasonLabel => 'الموسم';

  @override
  String weekN(String n) {
    return 'الأسبوع $n';
  }

  @override
  String weekNofM(String n, String m) {
    return 'الأسبوع $n من $m';
  }

  @override
  String get restHidden => 'مخفي من يومك لين ترجعينه';

  @override
  String get editSeason => 'تعديل الموسم';

  @override
  String get seasonEditorSub => 'أنمّي 3 بالكثير · أحافظ 5 · والباقي يرتاح.';

  @override
  String seasonCounts(String g, String gm, String m, String mm) {
    return 'في النمو: $g من $gm · في الصيانة: $m من $mm';
  }

  @override
  String get swapFirst => 'خلي مجال ثاني يرتاح أو يحافظ أول.';

  @override
  String get q1Name => 'الأساس';

  @override
  String get q2Name => 'البناء';

  @override
  String get q3Name => 'التثبيت';

  @override
  String get q4Name => 'التوسّع';

  @override
  String get q1Months => 'أكت–ديس';

  @override
  String get q2Months => 'ينا–مار';

  @override
  String get q3Months => 'أبر–يون';

  @override
  String get q4Months => 'يول–سبت';

  @override
  String quarterN(String n) {
    return 'الربع $n';
  }

  @override
  String youAreHere(String date) {
    return 'أنتِ هنا · $date';
  }

  @override
  String get noMilestonesQuarter => 'ما فيه محطات في هذا الربع بعد.';

  @override
  String get roadmapNote =>
      'بدون تواريخ ثابتة ولا وعود بدرجات — المحطات بالربع فقط.';

  @override
  String get noGoals => 'ما فيه أهداف بعد.';

  @override
  String get goalAllDone => 'كل المحطات خلصت — وقت هدف جديد؟';

  @override
  String milestoneProgress(String done, String total) {
    return '$done من $total محطات';
  }

  @override
  String nextLabel(String x) {
    return 'التالي: $x';
  }

  @override
  String get goalTargetLabel => 'هدفك بكلماتك';

  @override
  String get goalTargetHint => 'مثلًا: الدرجة اللي تحتاجينها — تحددينها أنتِ';

  @override
  String get projects => 'المشاريع';

  @override
  String activeOfMax(String n, String max) {
    return 'نشطة $n من $max';
  }

  @override
  String get noProjects => 'ما فيه مشاريع بعد — ابدئي بفكرة في الصندوق.';

  @override
  String get noStepsYet => 'بدون خطوات بعد';

  @override
  String get projectsRule =>
      'مشروعين نشطين بس — أي مشروع جديد يروح لصندوق الأفكار أو يتبادل مكانه مع واحد.';

  @override
  String get newProject => 'مشروع جديد';

  @override
  String get projectTitleLabel => 'اسم المشروع';

  @override
  String get projectTitleHint => 'مثلًا: دراسة حالة للبورتفوليو';

  @override
  String get psIdea => 'فكرة';

  @override
  String get psActive => 'نشطة';

  @override
  String get psWaiting => 'بالانتظار';

  @override
  String get psPaused => 'متوقف · راحة';

  @override
  String get psDone => 'خلص';

  @override
  String get psArchived => 'مؤرشف';

  @override
  String get statusLabel => 'الحالة';

  @override
  String get parkSuggestion =>
      'خليه بالانتظار أو في صندوق الأفكار لين يفضى مكان.';

  @override
  String get addStep => 'أضيفي خطوة';

  @override
  String get stepTitleLabel => 'الخطوة';

  @override
  String get deleteProject => 'حذف المشروع';

  @override
  String get deleteProjectBody => 'يُحذف المشروع وخطواته من جهازك.';

  @override
  String get ideaInbox => 'صندوق الأفكار';

  @override
  String ideaInboxSub(String n) {
    return '$n أفكار تنتظر وقتها — بدون ضغط';
  }

  @override
  String get ideaInboxBody =>
      'الأفكار هنا ما تظهر في يومك. لما يفضى مكان، حوّلي وحدة لمشروع نشط.';

  @override
  String get ideaInboxEmpty => 'الصندوق فاضي — اكتبي أي فكرة تمر في بالك.';

  @override
  String get addIdea => 'أضيفي فكرة';

  @override
  String get ieltsSub =>
      'Academic أو General — تختارينه حسب هدفك. الاستماع والمحادثة نفسها في الاثنين.';

  @override
  String get ieltsNoPromise =>
      'لا نعد بدرجة — نقيس بالاختبار التجريبي. الهدف تحددينه أنتِ بعد التشخيص، والتجريبي الشهري يقول وين وصلتي.';

  @override
  String ieltsNoPromiseWithTarget(String t) {
    return 'هدفك: $t. لا نعد بدرجة — التجريبي الشهري يقول وين وصلتي.';
  }

  @override
  String get vocabToday => 'مفردات اليوم';

  @override
  String get cardsDue => 'بطاقة مستحقة';

  @override
  String reviewsNew(String r, String n) {
    return '$r مراجعة · $n جديدة';
  }

  @override
  String totalCards(String n) {
    return '$n بطاقة في مجموعتك';
  }

  @override
  String minimumPrefix(String t) {
    return 'النسخة الصغيرة: $t';
  }

  @override
  String get startReview => 'ابدئي المراجعة';

  @override
  String get vocabEmpty => 'ما فيه بطاقات بعد — أضيفي أول كلمة.';

  @override
  String get vocabAllDone =>
      'خلصتي المستحق اليوم — المراجعة الجاية ترتّب نفسها.';

  @override
  String get addCard => 'أضيفي بطاقة';

  @override
  String get cardFront => 'الكلمة';

  @override
  String get cardBack => 'المعنى';

  @override
  String get cardBackHint => 'بكلماتك';

  @override
  String get cardExample => 'جملة مثال';

  @override
  String get rotationTitle => 'دورة المهارات الأسبوعية · المفردات كل يوم';

  @override
  String get rotationMinimum => 'الأدنى: المفردات بس — ويُحسب يوم كامل.';

  @override
  String get rotationNote =>
      'يوم صعب؟ المفردات بس — يوم المهارة ينتقل، ما يختفي.';

  @override
  String get taskReading => 'قراءة نص واحد بالوقت، ثم مراجعة الأخطاء.';

  @override
  String get taskListening =>
      'مقطع استماع واحد بالوقت، ثم إعادة الأجزاء اللي فاتتك.';

  @override
  String get taskWriting => 'إجابة Task 2 بالوقت، ثم تصحيح بالمعايير تحت.';

  @override
  String get taskSpeaking => 'سجّلي إجابة محادثة واسمعيها بالمعايير تحت.';

  @override
  String get taskMixed => 'قراءة واستماع معًا — جزء من كل واحد.';

  @override
  String get taskLight => 'مراجعة خفيفة أو اختبار تجريبي.';

  @override
  String get mockLog => 'سجل الاختبارات التجريبية';

  @override
  String get mockEmpty =>
      'ما سجلتي اختبار بعد. أول واحد يكون تشخيصي — يعطينا نقطة البداية.';

  @override
  String get bandScale => 'المقياس من 0 إلى 9.';

  @override
  String bandScaleWeakest(String s) {
    return 'المقياس من 0 إلى 9. أضعف مهارة ($s) تاخذ يوم الخميس الإضافي.';
  }

  @override
  String get mockMonthly => 'تجريبي كل شهر يكفي.';

  @override
  String get logResult => 'سجّلي نتيجة';

  @override
  String get noteLabel => 'ملاحظة';

  @override
  String get mockNoteHint => 'مثلًا: تشخيصي، اختبار كامل بالوقت';

  @override
  String get feedbackChecklist => 'قائمة التغذية الراجعة';

  @override
  String get writingTask2 => 'الكتابة Task 2';

  @override
  String get speakingLabel => 'المحادثة';

  @override
  String get feedbackHelp =>
      'راجعي إجابتك بمعايير التصحيح الرسمية. ركزي على خطأين أو ثلاثة بس، ثم أعيدي نفس السؤال.';

  @override
  String get critTaskResponse => 'الاستجابة للمهمة';

  @override
  String get critCoherence => 'الترابط والتماسك';

  @override
  String get critFluency => 'الطلاقة والترابط';

  @override
  String get critLexical => 'الحصيلة اللغوية';

  @override
  String get critGrammar => 'تنوّع القواعد ودقتها';

  @override
  String get critPronunciation => 'النطق';

  @override
  String get writingDescriptors => 'واصفات درجات الكتابة الرسمية (ielts.org)';

  @override
  String get speakingDescriptors => 'واصفات درجات المحادثة الرسمية (ielts.org)';

  @override
  String get resetChecklist => 'صفّري القائمة للمحاولة الجاية';

  @override
  String get vocabReview => 'مراجعة المفردات';

  @override
  String get reviewDoneTitle => 'خلصت المراجعة';

  @override
  String reviewDoneBody(String good, String total) {
    return '$good من $total تذكرتيها — والباقي يرجع لك قريب.';
  }

  @override
  String get finish => 'إنهاء';

  @override
  String get showAnswer => 'أظهري المعنى';

  @override
  String get gradeAgain => 'ما تذكرتها';

  @override
  String get gradeHard => 'صعبة';

  @override
  String get gradeGood => 'تمام';

  @override
  String get gradeEasy => 'سهلة';

  @override
  String get drivingTitle => 'رخصة القيادة';

  @override
  String drivingSub(String n) {
    return 'المرحلة $n من 5 · خطوة وحدة في كل مرة';
  }

  @override
  String get licencePath => 'طريق الرخصة';

  @override
  String get lp1Title => 'تأكيد المسار الرسمي عبر أبشر / منصة الحكومة';

  @override
  String get lp1Sub =>
      'الخطوات وعدد الساعات والرسوم تأخذينها من المصدر الرسمي ومدرسة القيادة — ما نكتبها من عندنا.';

  @override
  String get saveServiceLink => 'حفظت رابط الخدمة';

  @override
  String get editServiceLink => 'غيّري الرابط';

  @override
  String get serviceLinkLabel => 'رابط صفحة الخدمة الرسمية';

  @override
  String get lp2Title => 'التسجيل في مدرسة القيادة';

  @override
  String get lp2Sub => 'بعد تأكيد المسار · مشروع بالانتظار';

  @override
  String get lp3Title => 'دروس وتدريب تحت الإشراف';

  @override
  String get lp3Sub => 'نهار · ليل · طريق سريع · زحمة';

  @override
  String get lp4Title => 'الاختبار النظري';

  @override
  String get lp4Sub => 'أسئلة متباعدة + إدراك المخاطر';

  @override
  String get lp5Title => 'الاختبار العملي';

  @override
  String get lp5Sub => 'موعده من المدرسة — نذكّرك قبله';

  @override
  String get supervisedLog => 'سجل التدريب تحت الإشراف';

  @override
  String get sessionsLabel => 'جلسات';

  @override
  String get minutesLabel => 'دقائق';

  @override
  String get conditionsTried => 'ظروف جرّبتيها';

  @override
  String get practiceNote =>
      'كل ما تنوّعت الظروف كان أفضل — والمراجعة مع المدرسة، ما نتفق على عدد ساعات محدد.';

  @override
  String get beforeTheRoad => 'تجهيز قبل الطريق · تقدرين تبدئين الحين';

  @override
  String get hazardTitle => 'إدراك المخاطر';

  @override
  String get hazardSub => 'شوفي مقطع طريق، وسمّي الخطر بصوت قبل ما يظهر.';

  @override
  String hazardThisWeek(String n) {
    return 'هذا الأسبوع: $n مقاطع';
  }

  @override
  String get logClip => 'سجّلي مقطع';

  @override
  String get theoryTitle => 'النظري بالتكرار المتباعد';

  @override
  String get theorySub =>
      'جولة أسئلة تدريبية، ترجع لك الأسئلة اللي غلطتي فيها بعد أيام.';

  @override
  String nextRound(String when) {
    return 'الجولة الجاية: $when';
  }

  @override
  String get logRound => 'سجّلي جولة';

  @override
  String get drivingAnxietyNote =>
      'إذا القلق من القيادة قوي ومستمر، الحديث مع مختص يساعد.';

  @override
  String get helpShort => 'المساعدة';

  @override
  String get logPractice => 'سجّلي جلسة تدريب';

  @override
  String get chooseConditions => 'الظروف';

  @override
  String get durationLabel => 'المدة';

  @override
  String get withSchool => 'درس مع المدرسة';

  @override
  String get withSchoolSub => 'غير كذا = تدريب تحت إشراف';

  @override
  String get condDay => 'نهار';

  @override
  String get condNight => 'ليل';

  @override
  String get condHighway => 'طريق سريع';

  @override
  String get condTraffic => 'زحمة';

  @override
  String get condParking => 'مواقف';

  @override
  String get joySub => 'اللي يفرّحك، مربوط بيومك — بدون ما يصير واجب';

  @override
  String get freeJoyToday => 'متعة اليوم الحرة';

  @override
  String get myRewards => 'مكافآت حددتيها بنفسك';

  @override
  String get addReward => 'أضيفي مكافأة';

  @override
  String get noRewards => 'ما فيه مكافآت بعد — وش يفرّحك لما تستاهلينه؟';

  @override
  String sparksN(String n) {
    return '$n شرارة';
  }

  @override
  String sparksLeft(String n) {
    return 'باقي $n شرارة';
  }

  @override
  String get redeem => 'استبدلي';

  @override
  String rewardProgress(String title, String have, String price) {
    return '$title: $have من $price شرارة';
  }

  @override
  String get sparksExplain =>
      'الشرارات تجي من البدء بأي نسخة صغيرة، والرجوع بعد غياب (مضاعفة)، والمراجعة الأسبوعية، والتجارب — مو من الكمال.';

  @override
  String get bundlesSection => 'متعة محجوزة لمهمة · باتفاق مع نفسك';

  @override
  String get addBundle => 'أضيفي باقة';

  @override
  String get editBundle => 'تعديل الباقة';

  @override
  String get noBundles => 'ما فيه باقات — اختاري شي تحبينه وخليه لوقت عادة.';

  @override
  String get noHabitLinked => 'بدون عادة';

  @override
  String get bundleHelp =>
      'شي تحبينه تخلينه لوقت عادة بس — بدون أقفال، باتفاق مع نفسك.';

  @override
  String get bundleWant => 'المتعة';

  @override
  String get bundleWantHint => 'مثلًا: بودكاست، حلقة مسلسل، قائمة أغاني';

  @override
  String get bundleFor => 'محجوزة لـ';

  @override
  String get removeBundle => 'شيلي الباقة';

  @override
  String get joyMap => 'خريطة متعتي';

  @override
  String get joyMapEmpty => 'خريطتك فاضية — أضيفي أشياء تفرّحك.';

  @override
  String get freeJoyNote =>
      'الأشياء اللي تحبينها أصلًا ما نحط عليها سعر — تبقى حرة.';

  @override
  String get addJoy => 'أضيفي متعة';

  @override
  String get sizeLabel => 'حجمها';

  @override
  String get sizeQuick => 'سريعة · أقل من 15 د';

  @override
  String get sizeMedium => 'متوسطة';

  @override
  String get sizeBig => 'كبيرة';

  @override
  String get costsMoney => 'تكلف فلوس';

  @override
  String gardenSummary(String n, String auto) {
    return '$n نباتات · $auto صارت تلقائية';
  }

  @override
  String get celebrationsTitle => 'احتفالاتي';

  @override
  String get celebrationsSub => 'العودات، المراجعات، والمكافآت اللي استبدلتيها';

  @override
  String redeemTitle(String title) {
    return 'تستبدلين $title؟';
  }

  @override
  String redeemBody(String n) {
    return 'ينخصم $n شرارة — وهذي لحظة احتفال، استاهلتيها.';
  }

  @override
  String get enjoy => 'استمتعي';

  @override
  String get celebrateTitle => 'مبروك!';

  @override
  String celebrateBody(String title) {
    return '$title لك — من خطوات صغيرة تجمّعت.';
  }

  @override
  String get newReward => 'مكافأة جديدة';

  @override
  String get editReward => 'تعديل المكافأة';

  @override
  String get saveReward => 'احفظي المكافأة';

  @override
  String get rewardPrompt => 'وش يفرّحك لما تستاهلينه؟';

  @override
  String get rewardName => 'اسم المكافأة';

  @override
  String get rewardNameHint => 'مثلًا: كتاب جديد';

  @override
  String get priceInSparks => 'سعرها بالشرارات';

  @override
  String balanceCanRedeem(String n) {
    return 'رصيدك الحالي $n — تقدرين تستبدلينها الحين.';
  }

  @override
  String balanceNow(String n, String left) {
    return 'رصيدك الحالي $n — باقي $left.';
  }

  @override
  String get costsMoneySub => 'نضيفها لقائمة الأمنيات وفترة التهدئة في المال';

  @override
  String get keepFreeAdvice =>
      'شي تحبينه وتسوينه أصلًا — مثل الرسم أو القراءة للمتعة — خليه متعة حرة بدون سعر، عشان ما يصير واجب.';

  @override
  String get archiveReward => 'أرشفي المكافأة';

  @override
  String get milestoneRewards => 'مكافآت المحطات · لما توصلين لخطوة في هدف';

  @override
  String get pickMilestoneReward => 'مكافأة هذي المحطة';

  @override
  String get chooseLater => 'تختارينها لاحقًا';

  @override
  String get noCelebrations =>
      'احتفالاتك تظهر هنا: عودة بعد غياب، مراجعة أسبوع، مكافأة استبدلتيها.';

  @override
  String get freshStartTitle => 'بداية جديدة';

  @override
  String get freshWeek =>
      'أسبوع جديد بدأ — فرصة لطيفة نختار أول خطوة صغيرة، بدون ما نحاسب اللي فات.';

  @override
  String get freshMonth =>
      'شهر جديد — لو فيه شي تبين ترجعين له، هذي لحظة مناسبة.';

  @override
  String get freshSeason => 'موسم جديد بدأ — نشوف وش ينمو ووش يرتاح هالموسم.';

  @override
  String get freshWeekTomorrow =>
      'بكرة أسبوع جديد — بداية جديدة. اختاري ثلاث أولويات وخلّي الباقي يرتاح.';

  @override
  String get freshMonthTomorrow => 'بكرة شهر جديد — بداية جديدة تناسب أي رجوع.';

  @override
  String get freshDismiss => 'إخفاء بطاقة البداية الجديدة';

  @override
  String get freshAction => 'اختاري أولويات الأسبوع';

  @override
  String wrSub(String n) {
    return 'الفصل $n · حوالي 10 دقائق';
  }

  @override
  String get wrWins => 'الإنجازات';

  @override
  String get wrBlockers => 'اللي عطّلني';

  @override
  String get wrStrength => 'فحص القوة';

  @override
  String get wrSeason => 'الموسم';

  @override
  String get wrTop3 => 'أولويات الأسبوع الجاي';

  @override
  String get wrExperiment => 'التجربة';

  @override
  String get wrChapter => 'عنوان الفصل';

  @override
  String get wrSparks => 'الشرارات';

  @override
  String get wrWinsTitle => 'وش مشى صح هالأسبوع؟';

  @override
  String get wrWinsSub => 'جمعنا لك اللي لاحظناه. أشري على اللي تفتخرين فيه.';

  @override
  String get wrNoWins =>
      'ما سجلنا شي هالأسبوع — وهذا عادي. اكتبي أي شي صغير صار.';

  @override
  String get wrExtraWin => 'إنجاز ثاني تبين تذكرينه';

  @override
  String get wrExtraWinHint => 'مثلًا: كلمت صديقتي بعد فترة';

  @override
  String get wrBlockersTitle => 'وش عطّلك؟';

  @override
  String get wrBlockersSub => 'معلومة للتصميم، مو حكم عليك. اختاري اللي ينطبق.';

  @override
  String get wrBlockersNote =>
      'إذا عادة وحدة تكرر تعطّلها، زر «عدّلي التصميم» في يومك يقترح تعديل واحد.';

  @override
  String wrStrengthTitle(String title) {
    return 'فحص القوة: $title';
  }

  @override
  String get wrStrengthSub =>
      '4 جمل، 20 ثانية. 1 = ما أوافق أبدًا · 5 = أوافق تمامًا.';

  @override
  String get srbai1 => 'أسويها تلقائيًا';

  @override
  String get srbai2 => 'أسويها بدون ما أتذكر عمدًا';

  @override
  String get srbai3 => 'أسويها بدون ما أفكر';

  @override
  String get srbai4 => 'أبدأ فيها قبل ما أنتبه';

  @override
  String wrStrengthAvg(String v) {
    return 'متوسطك $v من 5 — هذي قراءتك أنتِ، مو امتحان.';
  }

  @override
  String get wrTop3Title => 'أهم 3 للأسبوع الجاي';

  @override
  String get wrTop3Sub => 'ثلاثة بس. الباقي ينتظر بدون ضغط.';

  @override
  String wrTopN(String n) {
    return 'الأولوية $n';
  }

  @override
  String get wrSuggestions => 'من أهدافك ومشاريعك';

  @override
  String get wrExperimentTitle => 'تجربة الأسبوع';

  @override
  String get wrExperimentSub =>
      'نغيّر شي واحد بس ونقيس الإنجاز والمتعة. القرار بعدها لك.';

  @override
  String get wrExperimentActive => 'عندك تجربة شغّالة — شوفي النتيجة وقرري.';

  @override
  String get wrNoExperiment => 'بدون تجربة هالأسبوع';

  @override
  String get wrNoExperimentSub => 'أسبوع هادئ بدون تغيير — اختيار مناسب بعد.';

  @override
  String get wrExperimentNote => 'أسبوع واحد يعطي إشارة، مو حكم نهائي.';

  @override
  String get expVarBundle =>
      'نشغّل المتعة وقت العادة بس ونقارن بالأسبوع اللي قبله';

  @override
  String get expVarEvening => 'أسبوع في المساء بدل الصباح';

  @override
  String get expVarMorning => 'أسبوع في الصباح بدل المساء';

  @override
  String get expVarMinimum => 'أسبوع بالنسخة الصغيرة كل يوم';

  @override
  String wrChapterTitle(String n) {
    return 'عنوان الفصل $n';
  }

  @override
  String get wrChapterSub => 'كل أسبوع فصل. سمّيه بكلمتين تتذكرينه فيها.';

  @override
  String get wrChapterHint => 'مثلًا: أسبوع الرجوع';

  @override
  String get wrChapterS1 => 'أسبوع الرجوع';

  @override
  String get wrChapterS2 => 'خطوات صغيرة';

  @override
  String get wrChapterS3 => 'أسبوع هادئ';

  @override
  String get wrCloseChapter => 'سكّري الفصل';

  @override
  String get wrDone => 'خلصنا';

  @override
  String wrClosedN(String n) {
    return 'سكّرتي الفصل $n';
  }

  @override
  String wrClosedTitled(String n, String title) {
    return 'سكّرتي الفصل $n: $title';
  }

  @override
  String get wrSaved => 'انحفظ الفصل.';

  @override
  String wrEndWin(String win) {
    return '$win — وهذا بالضبط اللي نبنيه. الأسبوع الجاي جاهز بأولوياتك.';
  }

  @override
  String get wrEndGeneric =>
      'وصلتي لآخر الأسبوع وقفلتيه بهدوء — وهذا بحد ذاته إنجاز.';

  @override
  String get experimentResultLabel => 'نتيجة التجربة';

  @override
  String get beforeWithout => 'قبل';

  @override
  String get afterWith => 'بعد';

  @override
  String get daysDone => 'أيام منجزة';

  @override
  String get enjoymentOf5 => 'المتعة من 5';

  @override
  String get experimentCaveat => 'تجربة شخصية قصيرة — إشارة، مو دليل.';

  @override
  String get keepIt => 'أثبتها';

  @override
  String get revertIt => 'أرجّع القديم';

  @override
  String get keptLabel => 'ثبّتيها';

  @override
  String get revertedLabel => 'رجّعتي القديم';

  @override
  String get insights => 'الرؤى';

  @override
  String get insightsSub =>
      'آخر 4 أسابيع · أرقام تساعدك تعدّلين التصميم، مو تحكم عليك';

  @override
  String get momentumByDomain => 'الزخم حسب المجال';

  @override
  String get momentumCaption =>
      'الزخم من 0 إلى 100: متوسط موزون لآخر 7 أيام. اليوم الفائت ينزله شوي، ما يرجعه للصفر.';

  @override
  String get recoverySpeed => 'سرعة الرجوع';

  @override
  String get recoveryEmpty =>
      'ما فيه رجوع مسجّل بعد — يظهر هنا لما ترجعين لعادة بعد غياب.';

  @override
  String get recoveryCaption =>
      'الأرقام = أيام حتى الرجوع. أقل = أحسن. «—» = ما فيه رجوع ذاك الأسبوع.';

  @override
  String weekShort(String n) {
    return 'أسبوع $n';
  }

  @override
  String get thisWeekShort => 'هذا الأسبوع';

  @override
  String get noReturn => 'بدون رجوع';

  @override
  String get bestTimes => 'أفضل أوقاتك';

  @override
  String get bestTimesEmpty =>
      'نحتاج 3 مرات على الأقل لكل عادة عشان نعرف وقتها المعتاد.';

  @override
  String get bestTimesCaption =>
      'نص أوقات إنجازك بالضبط (بين الربع الأول والثالث) لآخر 4 أسابيع.';

  @override
  String fromNTimes(String n) {
    return 'من $n مرات';
  }

  @override
  String get experimentsTitle => 'التجارب';

  @override
  String get experimentsEmpty =>
      'ما فيه تجارب بعد — تختارين وحدة في المراجعة الأسبوعية.';

  @override
  String get systemBurden => 'عبء النظام';

  @override
  String get burdenSub =>
      'قد إيش التطبيق نفسه ياخذ من وقتك. نبيه يبقى قليل — التطبيق خادم، مو شغلة إضافية.';

  @override
  String get burdenLogs => 'تسجيلات هذا الأسبوع';

  @override
  String get burdenReview => 'دقائق المراجعة';

  @override
  String get burdenCaption =>
      'نعدّ الضغطات ونقيس وقت المراجعة الفعلي — ما نقدّر شي من عندنا.';

  @override
  String chapterN(String n) {
    return 'الفصل $n';
  }

  @override
  String get settings => 'الإعدادات';

  @override
  String aboutMinutes(String n) {
    return '$n دقائق';
  }

  @override
  String get reviewReady => 'مراجعة الأسبوع جاهزة';

  @override
  String reviewReadyBody(String n) {
    return 'نسكّر الفصل $n بقصته: وش مشى، وش عطّل، وأهم 3 للأسبوع الجاي.';
  }

  @override
  String get reviewEndsWithSparks => 'تنتهي بشرارات المراجعة';

  @override
  String chapterClosed(String n) {
    return 'سكّرتي الفصل $n';
  }

  @override
  String get nextWeekTop3 => 'أهم 3 للأسبوع';

  @override
  String get reviewAgain => 'افتحي المراجعة مرة ثانية';

  @override
  String get understandMyself => 'أفهم نفسي';

  @override
  String get insightsTileSub => 'الزخم وسرعة الرجوع';

  @override
  String get noActiveExperiment => 'ما فيه تجربة شغّالة';

  @override
  String get evidenceSub => 'كل عادة ومصادرها وقوة دليلها';

  @override
  String get lifeAdmin => 'أمور حياتي';

  @override
  String get moneyTitle => 'المال';

  @override
  String get moneySub => 'ظروف الشهر والفواتير';

  @override
  String nextDue(String title, String when) {
    return '$title $when';
  }

  @override
  String get autoSaveShort => 'الادخار التلقائي';

  @override
  String get homeAdminTitle => 'البيت والمعاملات';

  @override
  String zoneOfWeekIs(String z) {
    return 'منطقة الأسبوع: $z';
  }

  @override
  String get cycleTitle => 'الدورة الشهرية';

  @override
  String get pcosTitle => 'نمط حياة لتكيّس المبايض';

  @override
  String get ifDiagnosed => 'إذا كان لديك تشخيص';

  @override
  String get privateLocal => 'خاص بك · على جهازك فقط';

  @override
  String get appSection => 'التطبيق';

  @override
  String get settingsSub => 'التنبيهات · الوحدات · الخصوصية';

  @override
  String get helpSub => 'متى أطلب مساعدة مختص';

  @override
  String get dataOnDevice => 'كل بياناتك على جهازك فقط.';

  @override
  String get unlockReason => 'افتحي القسم الخاص';

  @override
  String get lockedTitle => 'قسم خاص';

  @override
  String get lockedBody => 'هذا القسم مقفل بقفل التطبيق.';

  @override
  String get unlock => 'افتحي القفل';

  @override
  String get moduleOff => 'هذي الوحدة مطفأة. تقدرين تفعّلينها من الإعدادات.';

  @override
  String get cyclePrivacy =>
      'تسجيل خاص بك: تواريخ وملاحظات بس. بدون توقعات ولا تحليل، وكل شي يبقى على جهازك.';

  @override
  String cycleLastStart(String date, String n) {
    return 'آخر بداية: $date · قبل $n يوم';
  }

  @override
  String get cycleStartedToday => 'بدأت اليوم';

  @override
  String get cycleEndedToday => 'انتهت اليوم';

  @override
  String get addNote => 'ملاحظة';

  @override
  String get cycleLog => 'السجل';

  @override
  String get cycleEmpty => 'ما فيه تسجيلات بعد.';

  @override
  String get cycleStart => 'بداية';

  @override
  String get cycleEnd => 'نهاية';

  @override
  String get cycleNotMedical =>
      'هذا سجل شخصي، مو أداة طبية. لأي سؤال صحي راجعي طبيبتك.';

  @override
  String get pcosBanner =>
      'هذا المحتوى إذا كان لديك تشخيص من طبيبة فقط — مو أداة تشخيص.';

  @override
  String get fieldWhat => 'وش هو';

  @override
  String get fieldWhy => 'ليش';

  @override
  String get notASubstitute => 'التطبيق ليس بديلًا عن المختص.';

  @override
  String moneyScreenSub(String month) {
    return '$month · تسجيل يدوي — ما نربط أي حساب بنكي';
  }

  @override
  String get envelopesTitle => 'ظروف الشهر';

  @override
  String daysLeftMonth(String n) {
    return 'باقي $n يوم';
  }

  @override
  String get envelopesEmpty =>
      'ما فيه ظروف لهذا الشهر — أضيفي أول ظرف (مثلًا: أكل وقهوة).';

  @override
  String spentOf(String spent, String planned) {
    return '$spent من $planned';
  }

  @override
  String get logSpend => 'سجّلي مصروف';

  @override
  String get addEnvelope => 'أضيفي ظرف';

  @override
  String get envelopeName => 'اسم الظرف';

  @override
  String get envelopeHint => 'مثلًا: أكل وقهوة';

  @override
  String get plannedAmount => 'المبلغ المخطط (ر.س)';

  @override
  String get amountSar => 'المبلغ (ر.س)';

  @override
  String get autoSaveBody =>
      'فعّليه مرة وحدة من تطبيق بنكك، ويمشي لحاله. أي مبلغ صغير ثابت يكفي كبداية.';

  @override
  String get autoSaveUnset => 'ما حددتي يوم التذكير بعد';

  @override
  String autoSaveReminder(String day, String time) {
    return 'تذكير: $day من كل شهر · $time';
  }

  @override
  String get setReminderDay => 'حددي يوم التذكير';

  @override
  String get dayOfMonth => 'يوم الشهر';

  @override
  String billsTitle(String month) {
    return 'الفواتير والاشتراكات · $month';
  }

  @override
  String get legendBill => 'فاتورة أو اشتراك';

  @override
  String get legendBnpl => 'قسط';

  @override
  String get billsEmpty => 'ما فيه فواتير — أضيفي اللي يتكرر كل شهر.';

  @override
  String get subscription => 'اشتراك';

  @override
  String get subscriptionsReview =>
      'مراجعة شهرية: اشتراك ما تستخدمينه؟ ألغيه من إعدادات المتجر في جوالك.';

  @override
  String get addBill => 'فاتورة أو اشتراك';

  @override
  String get billName => 'الاسم';

  @override
  String get deleteItemBody => 'يُحذف من جهازك.';

  @override
  String get bnplTitle => 'الأقساط';

  @override
  String get bnplEmpty => 'ما فيه أقساط.';

  @override
  String get bnplDone => 'خلصت كل الدفعات';

  @override
  String bnplNext(
    String amount,
    String date,
    String when,
    String n,
    String total,
  ) {
    return 'القسط الجاي $amount ر.س · $date ($when) · الدفعة $n من $total';
  }

  @override
  String get markPaid => 'دفعتها';

  @override
  String bnplRule(String rule) {
    return 'قاعدتي قبل أي تقسيط: $rule';
  }

  @override
  String get addBnpl => 'خطة تقسيط';

  @override
  String get bnplItemName => 'وش اشتريتي؟';

  @override
  String get bnplProvider => 'الجهة';

  @override
  String get instalmentAmount => 'مبلغ القسط (ر.س)';

  @override
  String get instalmentCount => 'عدد الدفعات';

  @override
  String get wishlistTitle => 'قائمة الأمنيات · فترة تهدئة';

  @override
  String get wishlistEmpty =>
      'شي تبين تشترينه؟ حطيه هنا بدل السلة، وقرري بعد فترة التهدئة.';

  @override
  String coolingLeft(String n) {
    return 'باقي $n أيام — خليها ترتاح';
  }

  @override
  String get coolingDone => 'خلصت التهدئة — لسا تبينها؟';

  @override
  String get buyIt => 'إيه، أشتريها';

  @override
  String get dropIt => 'أشيلها';

  @override
  String get coolingNote =>
      'مدة التهدئة تختارينها أنتِ — طريقة عملية، والدليل عليها مو محسوم.';

  @override
  String get addWish => 'أمنية جديدة';

  @override
  String get wishName => 'وش هي؟';

  @override
  String get coolingDays => 'أيام التهدئة';

  @override
  String get homeAdminSub => 'قليل وثابت أحسن من كثير ومتقطع';

  @override
  String resetTitle(String n) {
    return 'ترتيب $n دقائق';
  }

  @override
  String get resetReady => 'جاهز';

  @override
  String get resetRunning => 'شغّال';

  @override
  String get resetDone => 'خلصتي — المكان صار أخف';

  @override
  String startResetN(String n) {
    return 'ابدئي $n دقائق';
  }

  @override
  String withBundle(String b) {
    return 'مع $b';
  }

  @override
  String get zoneOfWeek => 'منطقة الأسبوع';

  @override
  String get nextZone => 'المنطقة التالية';

  @override
  String get zoneDesk => 'درج المكتب';

  @override
  String get zoneWardrobe => 'الدولاب';

  @override
  String get zoneKitchen => 'رف المطبخ';

  @override
  String get zoneBathroom => 'رف الحمام';

  @override
  String get zoneBag => 'الشنطة';

  @override
  String get zoneShelf => 'رف الكتب';

  @override
  String get docsTitle => 'الوثائق والتجديدات';

  @override
  String get addDoc => 'إضافة وثيقة';

  @override
  String get docsEmpty =>
      'سجلي وثائقك (الهوية، الجواز، التأمين…) وتاريخ انتهائها — نذكّرك قبلها.';

  @override
  String get docNoExpiry => 'بدون تاريخ انتهاء بعد';

  @override
  String docExpires(String date, String when) {
    return 'تنتهي $date · $when';
  }

  @override
  String get docWaiting => 'تنتظر';

  @override
  String get docRenewNow => 'وقت التجديد';

  @override
  String docRemindBefore(String n) {
    return 'قبل $n يوم';
  }

  @override
  String get docsNote => 'مدة التذكير قبل الانتهاء تحددينها لكل وثيقة.';

  @override
  String get docName => 'اسم الوثيقة';

  @override
  String get docNameHint => 'مثلًا: جواز السفر';

  @override
  String get expiryDate => 'تاريخ الانتهاء';

  @override
  String get remindBeforeDays => 'ذكّريني قبل';

  @override
  String daysN(String n) {
    return '$n يوم';
  }

  @override
  String get errandsTitle => 'مشاوير مجمّعة';

  @override
  String errandsTitleWhen(String when) {
    return 'مشاوير مجمّعة · $when';
  }

  @override
  String get errandsEmpty =>
      'أي مشوار يطرأ؟ سجليه هنا وسوّيه مع الباقي في وقت المهام الإدارية.';

  @override
  String get addErrand => 'مشوار جديد';

  @override
  String get errandName => 'المشوار';

  @override
  String get errandHint => 'مثلًا: استلام طرد';

  @override
  String get aquarium => 'الحوض';

  @override
  String get aquariumSub => 'وحدة اختيارية · تطلع بس إذا عندك حوض';

  @override
  String get evidenceScreenSub =>
      'كل عادة في التطبيق لها مصدر، ونقول لك قوة دليلها بصراحة';

  @override
  String get filterAll => 'الكل';

  @override
  String get strengthStrongest => 'قوة الدليل · من الأقوى';

  @override
  String get strengthLegend =>
      'الإرشادات من جهات صحية رسمية، والمراجعة المنهجية تجمع دراسات كثيرة، والتجربة دراسة وحدة مضبوطة.';

  @override
  String get evGuideline => 'إرشادات';

  @override
  String get evSrMa => 'مراجعة منهجية';

  @override
  String get evRct => 'تجربة';

  @override
  String get evObservational => 'رصدية';

  @override
  String get evExpert => 'رأي خبراء';

  @override
  String actionsCount(String n, String total) {
    return '$n من $total إجراء';
  }

  @override
  String get sourceLabel => 'المصدر';

  @override
  String get noSourceListed => 'ما فيه مصدر مسجّل لهذا الإجراء — نصيحة عملية.';

  @override
  String get inYourPlan => 'في خطتك';

  @override
  String get addToPlan => 'أضيفي لخطتي';

  @override
  String get addedToInbox => 'انضاف لصندوق الأفكار';

  @override
  String get addedWeekly => 'انضافت لمهام الأسبوع';

  @override
  String get weeklyPickDay =>
      'أي يوم يناسبك؟ إذا ما حددتي، تظهر في «هذا الأسبوع».';

  @override
  String get fieldMetric => 'كيف أقيسها';

  @override
  String get atHabit => 'عادة';

  @override
  String get atRoutineStep => 'خطوة روتين';

  @override
  String get atWeekly => 'أسبوعية';

  @override
  String get atSystem => 'نظام يُضبط مرة';

  @override
  String get atReference => 'مرجع';

  @override
  String get atProjectStep => 'خطوة مشروع';

  @override
  String get langAndLook => 'اللغة والمظهر';

  @override
  String get notificationsSection => 'التنبيهات';

  @override
  String get capRange => 'من 0 إلى 6 · الافتراضي 4';

  @override
  String get capNone => 'بدون تنبيهات — التطبيق يشتغل وأنتِ تفتحينه.';

  @override
  String get capCaption =>
      'موجز الصباح · إغلاق المساء · والباقي عند إشارات عاداتك اللي فيها تذكير.';

  @override
  String scheduledToday(String n) {
    return 'مجدول اليوم: $n';
  }

  @override
  String get quietHours => 'ساعات الهدوء';

  @override
  String get fromLabel => 'من';

  @override
  String get toLabel => 'إلى';

  @override
  String get focusSilences => 'وجلسات التركيز توقف التنبيهات تلقائيًا.';

  @override
  String get anchorsSection => 'المراسي · الإشارات اللي تبدأ منها عاداتك';

  @override
  String get prayerAnchorsSettingsSub =>
      'اختيارية · تُحسب على جهازك · أم القرى';

  @override
  String get cityLabel => 'المدينة';

  @override
  String get cityMakkah => 'مكة';

  @override
  String get cityJeddah => 'جدة';

  @override
  String get modulesSection => 'الوحدات الاختيارية';

  @override
  String get cycleModuleSub => 'تسجيل خاص بك · مطفأة افتراضيًا';

  @override
  String get pcosModuleSub => 'فقط إذا فيه تشخيص من طبيبة';

  @override
  String get aquariumModuleSub => 'مهام الماء والإطعام';

  @override
  String get modulesPrivacy =>
      'كل البيانات على جهازك فقط — بدون حساب أو خادم. الوحدات الحساسة مطفأة افتراضيًا، وتقدرين تقفلينها بـ Face ID.';

  @override
  String get privacyData => 'الخصوصية والبيانات';

  @override
  String get appLockSettingsSub => 'Face ID للأقسام الحساسة';

  @override
  String get forgivingStreakTitle => 'سلسلة متسامحة';

  @override
  String get forgivingStreakSub => 'اختيارية · يومين سماح كل أسبوع';

  @override
  String get exportAll => 'تصدير كل البيانات';

  @override
  String get importFile => 'استيراد من ملف';

  @override
  String get exportDone => 'جهّزنا الملف للمشاركة.';

  @override
  String get exportFailed => 'ما قدرنا نشارك الملف.';

  @override
  String get importConfirmTitle => 'نستبدل بياناتك؟';

  @override
  String get importConfirmBody =>
      'بيانات الملف تحل محل كل بياناتك الحالية على هذا الجهاز.';

  @override
  String get importDone => 'تم الاستيراد.';

  @override
  String get importFailed => 'الملف ما ينقرأ — تأكدي إنه تصدير من التطبيق.';

  @override
  String get deleteAll => 'حذف كل البيانات';

  @override
  String get deleteAllNote => 'نطلب تأكيد مرتين قبل الحذف، وننصح بالتصدير أول.';

  @override
  String get deleteAllTitle => 'نحذف كل شي؟';

  @override
  String get deleteAllBody1 =>
      'عاداتك وسجلاتك وشراراتك ومكافآتك كلها تنحذف من الجهاز. ننصحك تصدّرين نسخة أول.';

  @override
  String get deleteContinue => 'أكملي';

  @override
  String get deleteAllTitle2 => 'متأكدة؟';

  @override
  String get deleteAllBody2 => 'هذي آخر خطوة — الحذف ما يتراجع عنه.';

  @override
  String get deleteAllFinal => 'احذفي كل شي';

  @override
  String get whenToSeekHelp => 'متى أطلب مساعدة مختص؟';

  @override
  String get helpBullet1 =>
      'إذا الضيق أو القلق أو التوتر مستمر ويأثر على يومك.';

  @override
  String get helpBullet2 =>
      'إذا صار صعب تهتمين بأساسياتك: النوم، الأكل، الشغل أو الدراسة.';

  @override
  String get helpBullet3 =>
      'إذا جتك أفكار إنك تأذين نفسك — روحي للطوارئ الحين.';

  @override
  String get savedNumbers => 'أرقام محفوظة لك';

  @override
  String get moh937 => 'وزارة الصحة';

  @override
  String get moh937Sub => 'استشارة طبية بالهاتف · 24 ساعة';

  @override
  String get mohPsych => 'مركز الاستشارات النفسية (وزارة الصحة)';

  @override
  String get mohPsychSub =>
      'مختصين في الصحة النفسية\n8 ص – 8 م، السبت 1 م – 8 م';

  @override
  String get ambulance => 'الهلال الأحمر (إسعاف)';

  @override
  String get unifiedEmergency => 'الطوارئ الموحد';

  @override
  String get erOpen => 'وأقسام الطوارئ في المستشفيات مفتوحة 24 ساعة.';

  @override
  String get notSubstituteLong =>
      'هذا التطبيق ليس بديلًا عن المختص. ما يشخّص ولا يتابع حالتك النفسية — يساعدك في يومك بس.';

  @override
  String callN(String title, String n) {
    return 'اتصال $title: $n';
  }

  @override
  String get recoverySpeedSub =>
      'كم يوم تاخذين عشان ترجعين بعد ما تفوّتين عادة أساسية.';

  @override
  String beforeRoadmap(String date) {
    return 'قبل بداية السنة · $date — تبدأ في أكتوبر';
  }

  @override
  String get sizeQuickShort => 'سريعة';

  @override
  String bnplNextAmount(String amount) {
    return 'القسط الجاي $amount ر.س';
  }

  @override
  String bnplPaymentN(String n, String total) {
    return 'الدفعة $n من $total';
  }

  @override
  String overdueDays(String n) {
    return 'متأخر $n يوم';
  }

  @override
  String get storageUnavailable =>
      'الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة';

  @override
  String get undoExpired =>
      'انتهت مهلة التراجع — تقدرين تلغين الإنجاز من البطاقة.';

  @override
  String get setSmallDuration => 'حددي مدة صغيرة';

  @override
  String get setSmallDurationRequired =>
      'حددي مدة صغيرة للنسخة الأدنى قبل الحفظ.';

  @override
  String get estimateTag => 'تقدير';

  @override
  String get momentumResting => 'راحة';

  @override
  String get shapeRedOne => 'شي واحد صغير + متعة';

  @override
  String get shapeRedTwo => 'شيئين صغار + متعة';

  @override
  String wrEndWinNoTop(String win) {
    return '$win — وهذا بالضبط اللي نبنيه. الأسبوع الجاي يبدأ بهدوء.';
  }

  @override
  String get helpSources => 'مصادر الأرقام';

  @override
  String get helpSrc937 => '937 — صفحة خدمة 937، وزارة الصحة';

  @override
  String get helpSrcPsych =>
      '920033360 — صفحة خدمات الصحة النفسية، وزارة الصحة';

  @override
  String get helpSrc911 => '911 — موقع هيئة الهلال الأحمر السعودي';

  @override
  String get unsourcedBadge => 'ممارسة عملية — بلا مصدر محكّم';

  @override
  String get nudgeDuesTitle => 'مستحقات اليوم';

  @override
  String get duesAutoSave => 'تحويل الادخار التلقائي';

  @override
  String get helpSrc997 =>
      '997 — خطة الترقيم الوطنية، هيئة الاتصالات والفضاء والتقنية';
}
