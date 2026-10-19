// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String whyGrowFocus(String domain) {
    return 'Part of your season focus: $domain';
  }

  @override
  String whyStrengthDay(String n, String total) {
    return 'Strength day $n of $total this week';
  }

  @override
  String get whyWalkDay => 'Walk day — your muscles rest between strength days';

  @override
  String whyIeltsRotation(String skill) {
    return 'Your vocab + today\'s skill: $skill';
  }

  @override
  String whyVocabDue(String count) {
    return '$count cards due — spaced review';
  }

  @override
  String get whyComeback => 'You\'re back — that\'s the most important part';

  @override
  String whyMaintainLight(String domain) {
    return 'Light maintenance: $domain';
  }

  @override
  String whyChainStep(String routine) {
    return 'A step of your $routine';
  }

  @override
  String get whyWeeklyDue => 'This week\'s task — today is its day';

  @override
  String whyWeeklyCarried(String day) {
    return 'This week\'s task — waiting since $day';
  }

  @override
  String get whyWeeklyReview => 'End of the week — time to close the chapter';

  @override
  String whyProjectNext(String project) {
    return 'Next step in $project';
  }

  @override
  String get whyFreeJoy => 'Joy for you — no strings attached';

  @override
  String get whyRedEssential =>
      'A gentle day — a small version is enough today';

  @override
  String get whyYellowMinimum =>
      'Medium energy — the minimum version is enough';

  @override
  String get whyTimeTrimmed =>
      'A full day — the minimum version fits your time';

  @override
  String get ieltsSkillReading => 'Reading';

  @override
  String get ieltsSkillListening => 'Listening';

  @override
  String get ieltsSkillWriting => 'Writing';

  @override
  String get ieltsSkillSpeaking => 'Speaking';

  @override
  String get ieltsSkillMixedReadingListening => 'Mixed reading & listening';

  @override
  String get ieltsSkillLightReview => 'Light review or mock test';

  @override
  String get weekday1 => 'Monday';

  @override
  String get weekday2 => 'Tuesday';

  @override
  String get weekday3 => 'Wednesday';

  @override
  String get weekday4 => 'Thursday';

  @override
  String get weekday5 => 'Friday';

  @override
  String get weekday6 => 'Saturday';

  @override
  String get weekday7 => 'Sunday';

  @override
  String get nudgeMorningTitle => 'Good morning — your day is ready';

  @override
  String nudgeMorningBody(String first) {
    return 'First step: $first';
  }

  @override
  String get nudgeMorningBodyEmpty => 'Take a breath and see your plan';

  @override
  String get nudgeAnchoredBody => 'A small version is enough today';

  @override
  String get nudgeEveningTitle => 'Evening shutdown';

  @override
  String get nudgeEveningBody =>
      'Two minutes to set up tomorrow and start winding down';

  @override
  String get nudgeActionDone => 'Done — minimum';

  @override
  String get nudgeActionSnooze => 'Snooze 30 min';

  @override
  String get nudgeActionSkip => 'Skip today';

  @override
  String get appTitle => 'Wejdan Life OS — وجدان';

  @override
  String get tabToday => 'Today';

  @override
  String get tabHabits => 'Care';

  @override
  String get tabPath => 'Professional';

  @override
  String get tabJoy => 'Joy';

  @override
  String get tabMe => 'Me';

  @override
  String get energyGreen => 'Green — good energy';

  @override
  String get energyYellow => 'Yellow — medium energy';

  @override
  String get energyRed => 'Red — gentle day';

  @override
  String get levelMinimum => 'Minimum';

  @override
  String get levelNormal => 'Normal';

  @override
  String get levelBonus => 'Bonus';

  @override
  String get levelSkipped => 'Skipped today';

  @override
  String get tierCore => 'Core';

  @override
  String get tierMaintain => 'Maintain';

  @override
  String get tierJoy => 'Joy';

  @override
  String get tierChain => 'Routine';

  @override
  String get tierSystem => 'Weekly ritual';

  @override
  String get sectionMorningChain => 'Morning chain';

  @override
  String get sectionDay => 'During the day';

  @override
  String get sectionEveningChain => 'Evening chain';

  @override
  String get thisWeekStrip => 'This week';

  @override
  String get stageSeed => 'Seed';

  @override
  String get stageSprout => 'Sprout';

  @override
  String get stageGrowing => 'Growing';

  @override
  String get stageRooted => 'Rooted';

  @override
  String get stageAutomatic => 'Automatic';

  @override
  String get missForgot => 'I forgot';

  @override
  String get missBadTime => 'Bad time';

  @override
  String get missTooBig => 'Too big';

  @override
  String get missTired => 'I was tired';

  @override
  String get missNotEnjoyable => 'Not enjoyable';

  @override
  String get missPlaceDidntFit => 'The place didn’t fit';

  @override
  String get missBusy => 'I was busy';

  @override
  String get missNotImportantNow => 'Not important now';

  @override
  String get recoveryTitle =>
      'What got in the way? Let’s fix the design, not blame you';

  @override
  String get changeMoveCueAddReminder =>
      'Tie it to a clearer cue and turn on one reminder';

  @override
  String get changeSwapTime => 'Move it to a time that suits you better';

  @override
  String get changeShrinkToMinimum => 'Shrink it to the minimum version';

  @override
  String get changeMinimumAndMoveEarlier =>
      'Minimum version, earlier in the day';

  @override
  String get changeAddJoyPairing =>
      'Pair it with something you enjoy, or change the activity';

  @override
  String get changeChangePlacePrepare => 'Change the place or prepare it ahead';

  @override
  String get changeShrinkAndReschedule => 'Shrink it and plan it on fewer days';

  @override
  String get changePauseToRest => 'Let it rest this season';

  @override
  String get comebackCelebration =>
      'You’re back — that’s the most important part';

  @override
  String get sparksLabel => 'Sparks';

  @override
  String get sparkReasonCompletion => 'A start';

  @override
  String get sparkReasonComeback => 'Comeback';

  @override
  String get sparkReasonWeeklyReview => 'Weekly review';

  @override
  String get sparkReasonExperiment => 'Experiment';

  @override
  String get sparkReasonRedeem => 'Reward';

  @override
  String get sparkReasonReversal => 'Undo';

  @override
  String get sparkReasonAdjustment => 'Adjustment';

  @override
  String get undo => 'Undo';

  @override
  String get smallVersionEnough => 'A small version is enough today';

  @override
  String get whyLabel => 'Why?';

  @override
  String get helpSafetyLink => 'Help & safety';

  @override
  String get helpMoh => 'Ministry of Health 937';

  @override
  String get helpEmergency => 'Emergency 997 / 911';

  @override
  String get placeholderHomeTitle => 'Today’s plan';

  @override
  String get placeholderLoading => 'Preparing your day…';

  @override
  String get placeholderError => 'Something went wrong while loading';

  @override
  String get userName => 'Wejdan';

  @override
  String greetingMorning(String name) {
    return 'Good morning, $name';
  }

  @override
  String greetingEvening(String name) {
    return 'Good evening, $name';
  }

  @override
  String get months =>
      'January,February,March,April,May,June,July,August,September,October,November,December';

  @override
  String minutesShort(String m) {
    return '$m min';
  }

  @override
  String minutesPlus(String m) {
    return '$m+ min';
  }

  @override
  String get close => 'Close';

  @override
  String get back => 'Back';

  @override
  String get next => 'Next';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get add => 'Add';

  @override
  String get change => 'Change';

  @override
  String get optional => '(optional)';

  @override
  String get later => 'Later';

  @override
  String get more => 'More';

  @override
  String get fewer => 'Fewer';

  @override
  String get pause => 'Pause';

  @override
  String get resume => 'Resume';

  @override
  String get suggested => 'Suggested';

  @override
  String xOfY(String x, String y) {
    return '$x of $y';
  }

  @override
  String stepOf(String n, String total) {
    return 'Step $n of $total';
  }

  @override
  String get itemNotFound =>
      'We couldn\'t find this item — today\'s plan may have changed.';

  @override
  String get mainNavigation => 'Main navigation';

  @override
  String get doneShort => 'done';

  @override
  String get skippedShort => 'skipped';

  @override
  String get backToToday => 'Back to today';

  @override
  String get energyChipGreen => 'Energy: good';

  @override
  String get energyChipYellow => 'Energy: medium';

  @override
  String get energyChipRed => 'Energy: low';

  @override
  String get energyGood => 'Good';

  @override
  String get energyGoodSub => 'A normal day';

  @override
  String get energyMid => 'Medium';

  @override
  String get energyMidSub => 'Lighter versions';

  @override
  String get energyLow => 'Low';

  @override
  String get energyLowSub => 'Minimum only';

  @override
  String get levelGroupLabel => 'Completion level';

  @override
  String get levelShortMin => 'Min';

  @override
  String get levelShortNormal => 'Normal';

  @override
  String get levelShortBonus => 'Bonus';

  @override
  String get domainHealth => 'Movement';

  @override
  String get domainSleep => 'Sleep';

  @override
  String get domainFood => 'Food';

  @override
  String get domainCare => 'Care';

  @override
  String get domainWomensHealth => 'Women\'s health';

  @override
  String get domainIelts => 'IELTS';

  @override
  String get domainLearning => 'Learning';

  @override
  String get domainCareer => 'Career';

  @override
  String get domainDriving => 'Driving';

  @override
  String get domainMoney => 'Money';

  @override
  String get domainHome => 'Home';

  @override
  String get domainDigital => 'Digital life';

  @override
  String get domainAdmin => 'Life admin';

  @override
  String get domainJoy => 'Joy';

  @override
  String get domainPeople => 'People';

  @override
  String get domainFaith => 'Faith & meaning';

  @override
  String get domainAquarium => 'Aquarium';

  @override
  String get prayerFajr => 'Fajr';

  @override
  String get prayerDhuhr => 'Dhuhr';

  @override
  String get prayerAsr => 'Asr';

  @override
  String get prayerMaghrib => 'Maghrib';

  @override
  String get prayerIsha => 'Isha';

  @override
  String get slotMorning => 'Morning';

  @override
  String get slotMidday => 'Midday';

  @override
  String get slotAfternoon => 'Afternoon';

  @override
  String get slotEvening => 'Evening';

  @override
  String get slotNight => 'Night';

  @override
  String get slotAnytime => 'Any time';

  @override
  String get dayLabel => 'Day';

  @override
  String cueAfter(String p) {
    return 'After $p';
  }

  @override
  String cueBefore(String p) {
    return 'Before $p';
  }

  @override
  String get cueAfterWake => 'After waking';

  @override
  String get cueBeforeSleep => 'Before sleep';

  @override
  String get fixedTime => 'Set time';

  @override
  String get morningBriefTitle => 'Morning brief';

  @override
  String get eveningShutdownTitle => 'Close the day';

  @override
  String get weekMomentum => 'Week\nmomentum';

  @override
  String get weekMomentumOneLine => 'Week momentum';

  @override
  String get momentum => 'Momentum';

  @override
  String get dayReady => 'Your day is ready';

  @override
  String get dayReadySubGreen =>
      'Sized to your energy — a small version is enough';

  @override
  String get dayReadySubYellow =>
      'Medium energy — we lightened the versions today';

  @override
  String get dayReadySubRed => 'A calm day — the minimum is enough';

  @override
  String get dayShapeLabel => 'Shape of your day';

  @override
  String get dayProgress => 'Today\'s progress';

  @override
  String doneOf(String done, String total) {
    return '$done of $total';
  }

  @override
  String get tilesCore => 'core';

  @override
  String get tilesMaintain => 'maintain';

  @override
  String get tilesJoy => 'joy';

  @override
  String coreSection(String n) {
    return 'Core · $n';
  }

  @override
  String get anyVersionCounts => 'Any version counts';

  @override
  String maintainSection(String n) {
    return 'Maintain · $n · light';
  }

  @override
  String get eveningSection => 'Evening';

  @override
  String get freeJoySection => 'Free joy';

  @override
  String get freeJoySub => 'Yours, no conditions — you don\'t have to earn it';

  @override
  String chainDone(String done, String total, String time) {
    return 'Complete · $done of $total · started $time';
  }

  @override
  String chainProgress(String done, String total, String time) {
    return '$done of $total · starts $time';
  }

  @override
  String openChain(String title) {
    return 'Open $title';
  }

  @override
  String checkLabel(String title) {
    return 'Done: $title';
  }

  @override
  String uncheckLabel(String title) {
    return 'Undo done: $title';
  }

  @override
  String joyCheckLabel(String title) {
    return 'Enjoyed: $title';
  }

  @override
  String joyPlus(String b) {
    return '+ $b';
  }

  @override
  String doneLogged(String level) {
    return 'Counted — $level';
  }

  @override
  String get joyLogged => 'Enjoy — this one is yours';

  @override
  String get startSession => 'Start session';

  @override
  String get thisWeekAnyDay => 'Any day';

  @override
  String recoveryBannerTitle(String title) {
    return 'Redesign $title?';
  }

  @override
  String get recoveryBannerSub =>
      'It didn\'t work a few times — let\'s fix the design, not blame you';

  @override
  String get calmDayTitle => 'A calm day';

  @override
  String get calmDayBody =>
      'A few small things and a joy for you — that\'s completely enough. The rest rests today, nothing lost.';

  @override
  String minimumOnly(String done, String total) {
    return 'Minimum only · $done of $total';
  }

  @override
  String restingNote(String items) {
    return '$items rest today. A calm day is not a step back — nothing resets to zero.';
  }

  @override
  String get helpLinkRed => 'If things feel very heavy: help is here';

  @override
  String get helpIntro =>
      'If things have felt heavier than usual for a while, talking to a professional is a strong step. This app doesn\'t diagnose or track mental health.';

  @override
  String get helpNote => 'In an emergency, call directly.';

  @override
  String get quickAddTitle => 'Quick add';

  @override
  String get quickAddHabit => 'New habit';

  @override
  String get quickAddHabitSub => 'We\'ll design it step by step in the Studio';

  @override
  String get quickAddBlock => 'Fixed block today';

  @override
  String get quickAddBlockSub => 'The plan adapts around it';

  @override
  String get quickAddFocus => 'Focus session now';

  @override
  String get quickAddFocusSub => 'Timer with nudges silenced';

  @override
  String get blockTitleHint => 'What is it? e.g. lecture';

  @override
  String startsAt(String t) {
    return 'Starts $t';
  }

  @override
  String get coreHabit => 'Core habit';

  @override
  String get maintainHabit => 'Maintain habit';

  @override
  String get growthStage => 'Growth stage';

  @override
  String get last4Weeks => 'Last 4 weeks';

  @override
  String get legendFull => 'Full';

  @override
  String get legendMin => 'Min';

  @override
  String get legendRest => 'Rest';

  @override
  String gridSummary(String n) {
    return 'Done $n times in the last 4 weeks';
  }

  @override
  String get designSection => 'Design';

  @override
  String get fieldCue => 'Cue';

  @override
  String get fieldVersions => 'Versions';

  @override
  String get fieldIfThen => 'If… then';

  @override
  String get fieldEasy => 'Make it easy';

  @override
  String get fieldJoy => 'Joy';

  @override
  String get minimumIs => 'Minimum version:';

  @override
  String get doseLabel => 'Dose per source';

  @override
  String get sourceLanguageNote =>
      'Evidence text shown in its original language.';

  @override
  String sourcesCount(String n) {
    return 'Sources · $n';
  }

  @override
  String get openSource => 'Open source';

  @override
  String get linkOpenFailed => 'Couldn\'t open the link';

  @override
  String get noEvidenceLinked => 'No evidence is linked to this item.';

  @override
  String get evidenceGuideline => 'Strong · official guideline';

  @override
  String get evidenceSrMa => 'Strong · systematic review';

  @override
  String get evidenceRct => 'Good · randomised trials';

  @override
  String get evidenceObservational => 'Moderate · observational';

  @override
  String get evidenceExpert => 'Expert consensus';

  @override
  String get editHabitDesign => 'Edit habit design';

  @override
  String get markDoneMinimum => 'Log it (small version)';

  @override
  String get evidenceLibrary => 'Evidence library';

  @override
  String get briefQuestion =>
      'How\'s your energy today? Pick one and the plan adapts.';

  @override
  String shapeLine(String core, String maintain, String joy) {
    return '$core core · $maintain maintain · $joy joy';
  }

  @override
  String shapeRed(String n) {
    return '$n small things + a joy';
  }

  @override
  String get shapeSubGreen =>
      'Your usual plan, with a small version of each habit if you need it.';

  @override
  String get shapeSubYellow => 'Lighter versions and at most two core habits.';

  @override
  String get shapeSubRed =>
      'The essentials at their smallest, plus a joy — no guilt.';

  @override
  String get firstStep => 'First step';

  @override
  String get startMyDay => 'Start my day';

  @override
  String get startMorningChainNow => 'Start the morning chain now';

  @override
  String get chainComplete => 'Chain complete';

  @override
  String chainCompleteTitle(String title) {
    return '$title — complete';
  }

  @override
  String get chainCompleteSub =>
      'A whole chain without thinking — that\'s exactly what we\'re building.';

  @override
  String timeLeft(String t) {
    return '$t left';
  }

  @override
  String get stepsLabel => 'Steps';

  @override
  String get currentStep => 'current';

  @override
  String doneNext(String next) {
    return 'Done, next: $next';
  }

  @override
  String get doneFinish => 'Done, finish the chain';

  @override
  String get skipStepToday => 'Skip this step today';

  @override
  String get focusSession => 'Focus session';

  @override
  String get freeFocusTitle => 'Free focus session';

  @override
  String get nudgesSilenced => 'Nudges silenced';

  @override
  String get remaining => 'remaining';

  @override
  String get readyWhenYouAre => 'Ready when you are';

  @override
  String get sessionLength => 'Session length';

  @override
  String get attemptFirstTitle => 'Try first, then ask AI';

  @override
  String get attemptFirstBody =>
      'Write your attempt, even if incomplete — trying before the answer makes it stick.';

  @override
  String get attemptHint => 'My attempt…';

  @override
  String get phoneAwayTitle => 'Put the phone away';

  @override
  String get phoneAwayBody => 'Another room or your bag — not on the desk.';

  @override
  String get phoneAwayAction => 'Done';

  @override
  String get phoneAwayDone => 'Away';

  @override
  String get endSession => 'End session';

  @override
  String get leaveFocusTitle => 'End the session?';

  @override
  String get leaveFocusBody =>
      'We keep the time you worked — even a short session counts.';

  @override
  String get keepGoing => 'Keep going';

  @override
  String get sessionDoneTitle => 'Session done';

  @override
  String get recallPrompt =>
      'Without looking at your notes: what\'s the main thing you remember?';

  @override
  String get recallHint => '3 things you remember…';

  @override
  String get recallWhy =>
      'Recalling after studying makes learning stick better than re-reading.';

  @override
  String get sessionNotePrompt => 'A word about the session? (optional)';

  @override
  String get sessionNoteHint => 'What did you get done?';

  @override
  String get saveSession => 'Save session';

  @override
  String get discardSession => 'Don\'t save';

  @override
  String get recoveryQuestion => 'What got in the way?';

  @override
  String get recoverySub => 'We fix the design, not you. Pick what fits.';

  @override
  String recoveryContext(String title, String n) {
    return '$title · didn\'t happen the last $n times';
  }

  @override
  String get proposedChange => 'Proposed change';

  @override
  String get before => 'Before';

  @override
  String get after => 'After';

  @override
  String afterShrink(String desc) {
    return '$desc — the rest is a bonus if you like';
  }

  @override
  String get afterJoy => 'Paired with a joy you choose';

  @override
  String get afterPlace => 'A place prepared in advance';

  @override
  String get afterRest => 'Rests this season — back whenever you want';

  @override
  String get oneReminderOn => 'one reminder';

  @override
  String daysPerWeek(String n) {
    return '$n days a week';
  }

  @override
  String get joyPairingHint => 'Which joy would you pair with it?';

  @override
  String get placeHint => 'Which place fits better? What to prepare?';

  @override
  String get acceptChange => 'Accept the change';

  @override
  String get editMyself => 'I\'ll edit it myself';

  @override
  String get recoveryDoneBody =>
      'The new design is ready — your first time back earns double Sparks.';

  @override
  String get shutdownTitle => 'Closing the day, gently';

  @override
  String shutdownDone(String done, String total) {
    return 'You did $done of $total — a good day.';
  }

  @override
  String get whatHappened => 'What didn\'t happen today';

  @override
  String get whatHappenedSub => 'A quick decision for each, then let it go.';

  @override
  String get noLeftovers => 'Nothing left hanging — everything counted today.';

  @override
  String get notStartedToday => 'Not started today';

  @override
  String get leftoverTomorrow => 'Tomorrow';

  @override
  String get leftoverLater => 'Later';

  @override
  String get leftoverLetGo => 'Let go';

  @override
  String get leftoverTomorrowSub => 'moves to tomorrow';

  @override
  String get leftoverLaterSub => 'comes back on its next day';

  @override
  String get leftoverLetGoSub => 'let go — that\'s fine';

  @override
  String get tomorrowFirst => 'Tomorrow\'s first step';

  @override
  String minimumMinutes(String m) {
    return 'min $m';
  }

  @override
  String get sweetMoment => 'A sweet moment today';

  @override
  String get sweetMomentHint => 'e.g. coffee with my book this afternoon';

  @override
  String get eveningChainTitle => 'Evening chain';

  @override
  String chainAbout(String min, String sleep) {
    return 'about $min min · sleep $sleep';
  }

  @override
  String get startEveningChain => 'Start the evening chain';

  @override
  String get closeTheDay => 'Close the day';

  @override
  String get onbStart => 'Let\'s start';

  @override
  String get onbFinish => 'My first day is ready';

  @override
  String get onbWelcomeTitle => 'Your day is ready\nbefore you wake up';

  @override
  String get onbWelcomeBody =>
      'I plan your day: what to do, when, the smallest version — and something you love with it.';

  @override
  String get onbF1Title => 'A small version is enough';

  @override
  String get onbF1Sub => 'Every habit has a minimum, and it counts fully.';

  @override
  String get onbF2Title => 'Joy is part of the plan';

  @override
  String get onbF2Sub => 'We pair what needs doing with what you love.';

  @override
  String get onbF3Title => 'Slips are data, not verdicts';

  @override
  String get onbF3Sub =>
      'If it doesn\'t work, we change the design — not blame you.';

  @override
  String get onbLocalOnly => 'All your data stays on your device';

  @override
  String get onbUseSample => 'Use the sample profile';

  @override
  String get lifeMapTitle => 'Your life map for this season';

  @override
  String get lifeMapBody =>
      'A season is 6–12 weeks. For each area choose: grow, maintain or rest.';

  @override
  String get lifeMapHint =>
      'Grow = this season\'s focus. Rest isn\'t neglect — it\'s a pause, hidden from your day.';

  @override
  String get stateGrow => 'Grow';

  @override
  String get stateMaintain => 'Maintain';

  @override
  String get stateRest => 'Rest';

  @override
  String get capacityReached =>
      'You\'ve reached this season\'s limit — swap another area first.';

  @override
  String get sensitiveModulesNote =>
      'Women\'s health and cycle tracking are off by default — you can turn them on in Settings.';

  @override
  String get timesTitle => 'When does your day start and end?';

  @override
  String get timesBody =>
      'We tie habits to stable cues in your day, not random clock times.';

  @override
  String get wakeTime => 'Wake up';

  @override
  String get sleepTime => 'Sleep';

  @override
  String get tapToChange => 'Tap to change';

  @override
  String get prayerAnchors => 'Prayer times as cues';

  @override
  String get prayerAnchorsSub =>
      'Optional · Umm al-Qura · Makkah — change it later';

  @override
  String timesPreview(String wake, String shutdown) {
    return 'Morning chain starts $wake; closing the day around $shutdown.';
  }

  @override
  String get starterTitle => 'Starter habits';

  @override
  String get starterBody =>
      'Pick up to 5 from your grow areas — start small, grow gently.';

  @override
  String get joyMapTitle => 'Your joy map';

  @override
  String get joyMapBody =>
      'What makes you happy? Pick everything that fits — no wrong answers.';

  @override
  String get somethingElse => 'Something else';

  @override
  String get somethingElseHint => 'What makes you happy?';

  @override
  String get shoppingNote => 'Shopping comes with a gentle budget reminder.';

  @override
  String get bundlesTitle => 'Bundles: joy reserved for a habit';

  @override
  String get bundlesBody => 'Something you love, kept for a habit — no locks.';

  @override
  String get privacyTitle => 'Notifications & privacy';

  @override
  String get privacyBody => 'Few nudges, each tied to a cue in your day.';

  @override
  String get notifCapTitle => 'Daily nudge limit';

  @override
  String notifCapSub(String start, String end) {
    return 'None between $start and $end';
  }

  @override
  String perDay(String n) {
    return '$n a day';
  }

  @override
  String get allowNotifications => 'Allow notifications';

  @override
  String get notificationsAllowed => 'Notifications allowed';

  @override
  String get notificationsNotAllowed =>
      'Not allowed — change it in device settings';

  @override
  String get notificationsWebNote => 'The web preview has no notifications.';

  @override
  String get appLockTitle => 'App lock';

  @override
  String get appLockSub => 'Face ID for sensitive sections';

  @override
  String get privacyPoint1 =>
      'All data on your device — no account, no server.';

  @override
  String get privacyPoint2 => 'No analytics, no tracking.';

  @override
  String get privacyPoint3 =>
      'Export or delete everything from Settings any time.';

  @override
  String get studioTitle => 'Habit Studio';

  @override
  String get studioSub =>
      'Let\'s design the habit step by step — clear, easy to start, enjoyable.';

  @override
  String studioStepOf(String n, String total) {
    return 'Step $n of $total';
  }

  @override
  String get fromLibrary => 'Suggested from the evidence library';

  @override
  String fromLibrarySub(String name) {
    return '$name — fields prefilled; edit anything.';
  }

  @override
  String get noLibraryLink => 'Pick an action from the library to prefill';

  @override
  String get searchLibrary => 'Search the library';

  @override
  String get fGoal => 'Goal';

  @override
  String get fBehavior => 'Behaviour';

  @override
  String get fVersions => 'Versions: min · normal · bonus';

  @override
  String get fCue => 'Cue';

  @override
  String get fPrepare => 'Prepare';

  @override
  String get fJoy => 'Joy pairing';

  @override
  String get fIfThen => 'If–then plan';

  @override
  String get fFrictionUp => 'Add friction to temptations';

  @override
  String get fReminder => 'Reminder';

  @override
  String get goalEmpty => 'Why does this matter to you?';

  @override
  String get goalHelp => 'In your words: what do you want once this sticks?';

  @override
  String get goalHint => 'e.g. raise my IELTS band';

  @override
  String get behaviorHelp => 'A clear, visible action — not a vague intention.';

  @override
  String get behaviorHint => 'e.g. review my due vocab cards';

  @override
  String get behaviorRequired => 'Write the behaviour first';

  @override
  String get versionsHelp =>
      'The minimum counts fully. Make it too small to refuse.';

  @override
  String versionsSummary(String min, String normal, String bonus) {
    return 'min $min · normal $normal · bonus $bonus';
  }

  @override
  String get cueHelp => 'After what? Tie it to something that happens daily.';

  @override
  String get cueTextHint => 'Describe the cue in your words';

  @override
  String get onDays => 'Days';

  @override
  String get prepareHelp => 'What can you set up so starting takes no thought?';

  @override
  String get joyHelp =>
      'What do you love that can come with it — kept just for it?';

  @override
  String get ifThenHelp =>
      'What might get in the way — and what will you do then?';

  @override
  String get ifThenHint => 'If … then I will …';

  @override
  String get frictionUpHelp =>
      'Which temptation competes with it? How do we move it a step away?';

  @override
  String get reminderHelp =>
      'At most one reminder, tied to the cue. Ideally the chain is enough.';

  @override
  String get oneReminderAtCue => 'One reminder at the cue';

  @override
  String get reminderOn => 'One reminder at the cue';

  @override
  String get reminderOffSummary => 'No reminder';

  @override
  String nextField(String f) {
    return 'Next: $f';
  }

  @override
  String get saveHabit => 'Save the habit';

  @override
  String get saveAsDraft => 'Save as draft';

  @override
  String get savedHabit => 'Habit saved — it will show up in your plan';

  @override
  String get savedDraft => 'Saved as a draft — paused until you turn it on';

  @override
  String get swapOrParkTitle => 'Swap or park?';

  @override
  String capCoreHabits(String max) {
    return 'You have $max core habits — that\'s the limit so your day stays light.';
  }

  @override
  String capGrow(String max) {
    return 'At most $max grow areas per season.';
  }

  @override
  String capMaintain(String max) {
    return 'At most $max maintain areas.';
  }

  @override
  String capProjects(String max) {
    return 'At most $max active projects.';
  }

  @override
  String capCourses(String max) {
    return 'One active course at a time ($max).';
  }

  @override
  String get swapWith => 'Swap with:';

  @override
  String get swap => 'Swap';

  @override
  String get parkIt => 'Park it (paused)';

  @override
  String get placeholderHabits =>
      'Habit Studio, library and garden — coming here soon.';

  @override
  String get placeholderPath =>
      'Year goals, projects and seasons — coming here soon.';

  @override
  String get placeholderJoy =>
      'Joy map, Sparks and rewards — coming here soon.';

  @override
  String get placeholderMe => 'Weekly review and settings — coming here soon.';

  @override
  String get quickPrefs => 'Quick preferences';

  @override
  String get languageLabel => 'Language';

  @override
  String get themeLabel => 'Theme';

  @override
  String get themeSystem => 'Auto';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get appearancePalettes => 'Color palettes';

  @override
  String get paletteCalmSky => 'Calm sky';

  @override
  String get paletteLavender => 'Lavender';

  @override
  String get paletteOcean => 'Ocean';

  @override
  String get paletteForest => 'Forest';

  @override
  String get paletteRose => 'Deep rose';

  @override
  String get paletteTerracotta => 'Terracotta';

  @override
  String get paletteMidnight => 'Midnight';

  @override
  String get customAccentColor => 'Custom color';

  @override
  String get customColorHint => 'Enter a color such as #6172B5';

  @override
  String get applyCustomColor => 'Apply color';

  @override
  String get invalidCustomColor =>
      'Enter a valid color with enough contrast for white text.';

  @override
  String get cardStyle => 'Card design';

  @override
  String get cardStyleOutlined => 'Outlined';

  @override
  String get cardStyleSoft => 'Soft';

  @override
  String get cardStyleMinimal => 'Minimal';

  @override
  String get appearancePreview => 'Appearance preview';

  @override
  String get previewAction => 'Sample button';

  @override
  String get resetAppearance => 'Reset appearance';

  @override
  String get replayOnboarding => 'Replay onboarding';

  @override
  String minutesOf(String level) {
    return '$level minutes';
  }

  @override
  String get partMorning => 'Morning';

  @override
  String get partNoon => 'Midday';

  @override
  String get partAfternoon => 'Afternoon';

  @override
  String get partEvening => 'Evening';

  @override
  String get partNight => 'Night';

  @override
  String get relToday => 'Today';

  @override
  String get relTomorrow => 'Tomorrow';

  @override
  String relIn(String n) {
    return 'In $n days';
  }

  @override
  String relAgo(String n) {
    return '$n days ago';
  }

  @override
  String get sar => 'SAR';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get notEnoughData =>
      'Not enough data yet — this appears after a few days of logging.';

  @override
  String seasonShape(String g, String m) {
    return 'Growing $g areas, maintaining $m';
  }

  @override
  String get byDomainMomentum => 'By area · momentum over the last 7 days';

  @override
  String maintainNote(String n, String domains) {
    return '$n habits in maintenance: $domains — the small version is enough.';
  }

  @override
  String get myRoutines => 'My routines · one cue starts the chain';

  @override
  String get newHabit => 'New habit';

  @override
  String coreCapacityNote(String n, String max, String left) {
    return 'You have $n of $max core habits — room for $left more.';
  }

  @override
  String get myGarden => 'My garden';

  @override
  String get gardenSub =>
      'Each habit is a plant. It grows with automaticity; if you step away it rests — it never wilts.';

  @override
  String get gardenEmpty =>
      'Your garden is waiting for its first plant — add a habit in the Studio.';

  @override
  String get plantResting => 'Resting';

  @override
  String get plantRestingNote =>
      'This plant is resting. It grows again from the first small version — nothing is lost.';

  @override
  String get gardenNoData =>
      'Just planted — the stage becomes clear after a few times.';

  @override
  String consistencyLine(String p) {
    return 'Consistency $p% over the last 4 weeks.';
  }

  @override
  String srbaiLine(String v) {
    return 'Automaticity $v of 5 at the last check.';
  }

  @override
  String get noSrbaiYet =>
      'The automaticity check happens in the weekly review.';

  @override
  String get noCoreHabits => 'No core habits in your Grow areas right now.';

  @override
  String get noRoutines => 'No routines yet.';

  @override
  String stepsCount(String n) {
    return '$n steps';
  }

  @override
  String get everyDay => 'Daily';

  @override
  String momentumOf(String title, String v) {
    return '$title momentum: $v of 100';
  }

  @override
  String get pathSub =>
      'My year: October 2026 → September 2027 · a suggested plan you can change any time';

  @override
  String get weeklyReview => 'Weekly review';

  @override
  String get yearInQuarters => 'The year in 4 quarters';

  @override
  String get goalsNextStep => 'My goals · each with one next step';

  @override
  String get seasonLabel => 'Season';

  @override
  String weekN(String n) {
    return 'Week $n';
  }

  @override
  String weekNofM(String n, String m) {
    return 'Week $n of $m';
  }

  @override
  String get restHidden => 'hidden from your day until you bring it back';

  @override
  String get editSeason => 'Edit the season';

  @override
  String get seasonEditorSub => 'Grow up to 3 · maintain 5 · the rest rests.';

  @override
  String seasonCounts(String g, String gm, String m, String mm) {
    return 'Growing: $g of $gm · maintaining: $m of $mm';
  }

  @override
  String get swapFirst => 'Move another area to Maintain or Rest first.';

  @override
  String get q1Name => 'Foundations';

  @override
  String get q2Name => 'Build';

  @override
  String get q3Name => 'Consolidate';

  @override
  String get q4Name => 'Expand';

  @override
  String get q1Months => 'Oct–Dec';

  @override
  String get q2Months => 'Jan–Mar';

  @override
  String get q3Months => 'Apr–Jun';

  @override
  String get q4Months => 'Jul–Sep';

  @override
  String quarterN(String n) {
    return 'Q$n';
  }

  @override
  String youAreHere(String date) {
    return 'You are here · $date';
  }

  @override
  String get noMilestonesQuarter => 'No milestones in this quarter yet.';

  @override
  String get roadmapNote =>
      'No fixed dates or promised scores — milestones by quarter only.';

  @override
  String get noGoals => 'No goals yet.';

  @override
  String get goalAllDone => 'All milestones done — time for a new goal?';

  @override
  String milestoneProgress(String done, String total) {
    return '$done of $total milestones';
  }

  @override
  String nextLabel(String x) {
    return 'Next: $x';
  }

  @override
  String get goalTargetLabel => 'Your target, in your words';

  @override
  String get goalTargetHint => 'e.g. the score you need — you decide';

  @override
  String get projects => 'Projects';

  @override
  String activeOfMax(String n, String max) {
    return 'Active $n of $max';
  }

  @override
  String get noProjects => 'No projects yet — start with an idea in the inbox.';

  @override
  String get noStepsYet => 'No steps yet';

  @override
  String get projectsRule =>
      'Two active projects only — anything new goes to the idea inbox or swaps places with one.';

  @override
  String get newProject => 'New project';

  @override
  String get projectTitleLabel => 'Project name';

  @override
  String get projectTitleHint => 'e.g. portfolio case study';

  @override
  String get psIdea => 'Idea';

  @override
  String get psActive => 'Active';

  @override
  String get psWaiting => 'Waiting';

  @override
  String get psPaused => 'Paused';

  @override
  String get psDone => 'Done';

  @override
  String get psArchived => 'Archived';

  @override
  String get statusLabel => 'Status';

  @override
  String get parkSuggestion =>
      'Keep it waiting or in the idea inbox until a slot frees up.';

  @override
  String get addStep => 'Add a step';

  @override
  String get stepTitleLabel => 'Step';

  @override
  String get deleteProject => 'Delete project';

  @override
  String get deleteProjectBody =>
      'The project and its steps are removed from your device.';

  @override
  String get ideaInbox => 'Idea inbox';

  @override
  String ideaInboxSub(String n) {
    return '$n ideas waiting for their time — no pressure';
  }

  @override
  String get ideaInboxBody =>
      'Ideas here don\'t show in your day. When a slot frees up, make one active.';

  @override
  String get ideaInboxEmpty =>
      'The inbox is empty — jot down any idea that comes up.';

  @override
  String get addIdea => 'Add an idea';

  @override
  String get ieltsSub =>
      'Academic or General — you choose by your goal. Listening and Speaking are the same in both.';

  @override
  String get ieltsNoPromise =>
      'No promised band — we measure with mock tests. You set the target after the diagnostic; the monthly mock shows where you are.';

  @override
  String ieltsNoPromiseWithTarget(String t) {
    return 'Your target: $t. No promised band — the monthly mock shows where you are.';
  }

  @override
  String get vocabToday => 'Today\'s vocabulary';

  @override
  String get cardsDue => 'cards due';

  @override
  String reviewsNew(String r, String n) {
    return '$r reviews · $n new';
  }

  @override
  String totalCards(String n) {
    return '$n cards in your deck';
  }

  @override
  String minimumPrefix(String t) {
    return 'Minimum: $t';
  }

  @override
  String get startReview => 'Start review';

  @override
  String get vocabEmpty => 'No cards yet — add your first word.';

  @override
  String get vocabAllDone =>
      'You\'re done for today — the next review schedules itself.';

  @override
  String get addCard => 'Add a card';

  @override
  String get cardFront => 'Word';

  @override
  String get cardBack => 'Meaning';

  @override
  String get cardBackHint => 'In your words';

  @override
  String get cardExample => 'Example sentence';

  @override
  String get rotationTitle => 'Weekly skill rotation · vocabulary every day';

  @override
  String get rotationMinimum =>
      'Minimum: vocabulary only — it counts as a full day.';

  @override
  String get rotationNote =>
      'Hard day? Vocabulary only — the skill day moves, it does not disappear.';

  @override
  String get taskReading => 'Read one timed passage, then review mistakes.';

  @override
  String get taskListening =>
      'One timed listening section, then replay what you missed.';

  @override
  String get taskWriting =>
      'A timed Task 2 answer, then check it against the criteria below.';

  @override
  String get taskSpeaking =>
      'Record a speaking answer and listen back with the criteria below.';

  @override
  String get taskMixed => 'Reading and listening together — one part of each.';

  @override
  String get taskLight => 'Light review or a mock test.';

  @override
  String get mockLog => 'Mock test log';

  @override
  String get mockEmpty =>
      'No mock logged yet. The first one is a diagnostic — our starting point.';

  @override
  String get bandScale => 'Scale 0 to 9.';

  @override
  String bandScaleWeakest(String s) {
    return 'Scale 0 to 9. The weakest skill ($s) gets the extra Thursday.';
  }

  @override
  String get mockMonthly => 'One mock a month is enough.';

  @override
  String get logResult => 'Log a result';

  @override
  String get noteLabel => 'Note';

  @override
  String get mockNoteHint => 'e.g. diagnostic, full timed test';

  @override
  String get feedbackChecklist => 'Feedback checklist';

  @override
  String get writingTask2 => 'Writing Task 2';

  @override
  String get speakingLabel => 'Speaking';

  @override
  String get feedbackHelp =>
      'Check your answer against the official criteria. Focus on two or three mistakes, then redo the same question.';

  @override
  String get critTaskResponse => 'Task Response';

  @override
  String get critCoherence => 'Coherence and Cohesion';

  @override
  String get critFluency => 'Fluency and Coherence';

  @override
  String get critLexical => 'Lexical Resource';

  @override
  String get critGrammar => 'Grammatical Range and Accuracy';

  @override
  String get critPronunciation => 'Pronunciation';

  @override
  String get writingDescriptors =>
      'Official Writing band descriptors (ielts.org)';

  @override
  String get speakingDescriptors =>
      'Official Speaking band descriptors (ielts.org)';

  @override
  String get resetChecklist => 'Reset for the next attempt';

  @override
  String get vocabReview => 'Vocabulary review';

  @override
  String get reviewDoneTitle => 'Review done';

  @override
  String reviewDoneBody(String good, String total) {
    return 'You recalled $good of $total — the rest come back soon.';
  }

  @override
  String get finish => 'Finish';

  @override
  String get showAnswer => 'Show meaning';

  @override
  String get gradeAgain => 'Again';

  @override
  String get gradeHard => 'Hard';

  @override
  String get gradeGood => 'Good';

  @override
  String get gradeEasy => 'Easy';

  @override
  String get drivingTitle => 'Driving licence';

  @override
  String drivingSub(String n) {
    return 'Stage $n of 5 · one step at a time';
  }

  @override
  String get licencePath => 'Licence path';

  @override
  String get lp1Title => 'Confirm the official path on Absher / my.gov.sa';

  @override
  String get lp1Sub =>
      'Steps, hours and fees come from the official source and the driving school — we never write them ourselves.';

  @override
  String get saveServiceLink => 'Save the service link';

  @override
  String get editServiceLink => 'Change the link';

  @override
  String get serviceLinkLabel => 'Official service page link';

  @override
  String get lp2Title => 'Enrol in a driving school';

  @override
  String get lp2Sub => 'After confirming the path · waiting project';

  @override
  String get lp3Title => 'Lessons and supervised practice';

  @override
  String get lp3Sub => 'Day · night · highway · traffic';

  @override
  String get lp4Title => 'Theory test';

  @override
  String get lp4Sub => 'Spaced questions + hazard perception';

  @override
  String get lp5Title => 'Practical test';

  @override
  String get lp5Sub => 'Date from the school — we remind you before';

  @override
  String get supervisedLog => 'Supervised practice log';

  @override
  String get sessionsLabel => 'Sessions';

  @override
  String get minutesLabel => 'Minutes';

  @override
  String get conditionsTried => 'Conditions tried';

  @override
  String get practiceNote =>
      'The more varied the conditions the better — check with the school; we set no hour count.';

  @override
  String get beforeTheRoad => 'Before the road · you can start now';

  @override
  String get hazardTitle => 'Hazard perception';

  @override
  String get hazardSub =>
      'Watch a road clip and name the hazard out loud before it appears.';

  @override
  String hazardThisWeek(String n) {
    return 'This week: $n clips';
  }

  @override
  String get logClip => 'Log a clip';

  @override
  String get theoryTitle => 'Spaced theory practice';

  @override
  String get theorySub =>
      'A round of practice questions; the ones you missed come back days later.';

  @override
  String nextRound(String when) {
    return 'Next round: $when';
  }

  @override
  String get logRound => 'Log a round';

  @override
  String get drivingAnxietyNote =>
      'If driving anxiety is strong and lasting, talking to a professional helps.';

  @override
  String get helpShort => 'Help';

  @override
  String get logPractice => 'Log a practice session';

  @override
  String get chooseConditions => 'Conditions';

  @override
  String get durationLabel => 'Duration';

  @override
  String get withSchool => 'Lesson with the school';

  @override
  String get withSchoolSub => 'Otherwise = supervised practice';

  @override
  String get condDay => 'Day';

  @override
  String get condNight => 'Night';

  @override
  String get condHighway => 'Highway';

  @override
  String get condTraffic => 'Traffic';

  @override
  String get condParking => 'Parking';

  @override
  String get joySub =>
      'What makes you happy, tied to your day — without becoming a chore';

  @override
  String get freeJoyToday => 'Today\'s free joy';

  @override
  String get myRewards => 'Rewards you set yourself';

  @override
  String get addReward => 'Add a reward';

  @override
  String get noRewards =>
      'No rewards yet — what would you love when you have earned it?';

  @override
  String sparksN(String n) {
    return '$n sparks';
  }

  @override
  String sparksLeft(String n) {
    return '$n sparks to go';
  }

  @override
  String get redeem => 'Redeem';

  @override
  String rewardProgress(String title, String have, String price) {
    return '$title: $have of $price sparks';
  }

  @override
  String get sparksExplain =>
      'Sparks come from starting any small version, coming back after a break (doubled), the weekly review and experiments — not from perfection.';

  @override
  String get bundlesSection => 'Joy reserved for a task · a deal with yourself';

  @override
  String get addBundle => 'Add a bundle';

  @override
  String get editBundle => 'Edit bundle';

  @override
  String get noBundles =>
      'No bundles — pick something you love and keep it for a habit.';

  @override
  String get noHabitLinked => 'No habit';

  @override
  String get bundleHelp =>
      'Something you love, kept only for a habit — no locks, a deal with yourself.';

  @override
  String get bundleWant => 'The joy';

  @override
  String get bundleWantHint => 'e.g. a podcast, a series episode, a playlist';

  @override
  String get bundleFor => 'Reserved for';

  @override
  String get removeBundle => 'Remove bundle';

  @override
  String get joyMap => 'My joy map';

  @override
  String get joyMapEmpty =>
      'Your map is empty — add things that make you happy.';

  @override
  String get freeJoyNote =>
      'The things you already love don\'t get a price — they stay free.';

  @override
  String get addJoy => 'Add a joy';

  @override
  String get sizeLabel => 'Size';

  @override
  String get sizeQuick => 'Quick · under 15 min';

  @override
  String get sizeMedium => 'Medium';

  @override
  String get sizeBig => 'Big';

  @override
  String get costsMoney => 'Costs money';

  @override
  String gardenSummary(String n, String auto) {
    return '$n plants · $auto automatic';
  }

  @override
  String get celebrationsTitle => 'My celebrations';

  @override
  String get celebrationsSub => 'Comebacks, reviews and rewards you redeemed';

  @override
  String redeemTitle(String title) {
    return 'Redeem $title?';
  }

  @override
  String redeemBody(String n) {
    return '$n sparks will be spent — this is a celebration, you earned it.';
  }

  @override
  String get enjoy => 'Enjoy';

  @override
  String get celebrateTitle => 'Congratulations!';

  @override
  String celebrateBody(String title) {
    return '$title is yours — from small steps that added up.';
  }

  @override
  String get newReward => 'New reward';

  @override
  String get editReward => 'Edit reward';

  @override
  String get saveReward => 'Save the reward';

  @override
  String get rewardPrompt =>
      'What would make you happy when you have earned it?';

  @override
  String get rewardName => 'Reward name';

  @override
  String get rewardNameHint => 'e.g. a new book';

  @override
  String get priceInSparks => 'Price in sparks';

  @override
  String balanceCanRedeem(String n) {
    return 'Your balance is $n — you can redeem it now.';
  }

  @override
  String balanceNow(String n, String left) {
    return 'Your balance is $n — $left to go.';
  }

  @override
  String get costsMoneySub =>
      'We add it to the wishlist with a cooling-off period in Money';

  @override
  String get keepFreeAdvice =>
      'Something you already love doing — like drawing or reading for fun — keep it a free joy with no price, so it doesn\'t become a chore.';

  @override
  String get archiveReward => 'Archive reward';

  @override
  String get milestoneRewards =>
      'Milestone rewards · when you reach a step in a goal';

  @override
  String get pickMilestoneReward => 'Reward for this milestone';

  @override
  String get chooseLater => 'Choose later';

  @override
  String get noCelebrations =>
      'Your celebrations appear here: a comeback, a weekly review, a reward you redeemed.';

  @override
  String get freshStartTitle => 'A fresh start';

  @override
  String get freshWeek =>
      'A new week has started — a gentle chance to pick one small first step, no looking back.';

  @override
  String get freshMonth =>
      'A new month — if there is something you want to return to, this is a good moment.';

  @override
  String get freshSeason =>
      'A new season has started — let us see what grows and what rests this season.';

  @override
  String get freshWeekTomorrow =>
      'Tomorrow a new week begins — a fresh start. Pick three priorities and let the rest rest.';

  @override
  String get freshMonthTomorrow =>
      'Tomorrow a new month begins — a fresh start that suits any comeback.';

  @override
  String get freshDismiss => 'Hide the fresh-start card';

  @override
  String get freshAction => 'Pick this week\'s priorities';

  @override
  String wrSub(String n) {
    return 'Chapter $n · about 10 minutes';
  }

  @override
  String get wrWins => 'Wins';

  @override
  String get wrBlockers => 'What got in the way';

  @override
  String get wrStrength => 'Strength check';

  @override
  String get wrSeason => 'Season';

  @override
  String get wrTop3 => 'Next week\'s top 3';

  @override
  String get wrExperiment => 'Experiment';

  @override
  String get wrChapter => 'Chapter title';

  @override
  String get wrSparks => 'Sparks';

  @override
  String get wrWinsTitle => 'What went well this week?';

  @override
  String get wrWinsSub =>
      'We gathered what we noticed. Tick what you are proud of.';

  @override
  String get wrNoWins =>
      'Nothing logged this week — and that is fine. Write down anything small that happened.';

  @override
  String get wrExtraWin => 'Another win you want to note';

  @override
  String get wrExtraWinHint => 'e.g. called a friend after a while';

  @override
  String get wrBlockersTitle => 'What got in the way?';

  @override
  String get wrBlockersSub => 'Design data, not a verdict. Pick what applies.';

  @override
  String get wrBlockersNote =>
      'If one habit keeps stalling, the redesign prompt on Today suggests one change.';

  @override
  String wrStrengthTitle(String title) {
    return 'Strength check: $title';
  }

  @override
  String get wrStrengthSub =>
      '4 statements, 20 seconds. 1 = strongly disagree · 5 = strongly agree.';

  @override
  String get srbai1 => 'I do it automatically';

  @override
  String get srbai2 => 'I do it without having to consciously remember';

  @override
  String get srbai3 => 'I do it without thinking';

  @override
  String get srbai4 => 'I start it before I realise I am doing it';

  @override
  String wrStrengthAvg(String v) {
    return 'Your average is $v of 5 — your own reading, not a test.';
  }

  @override
  String get wrTop3Title => 'Top 3 for next week';

  @override
  String get wrTop3Sub => 'Just three. The rest waits without pressure.';

  @override
  String wrTopN(String n) {
    return 'Priority $n';
  }

  @override
  String get wrSuggestions => 'From your goals and projects';

  @override
  String get wrExperimentTitle => 'This week\'s experiment';

  @override
  String get wrExperimentSub =>
      'Change one thing only and measure completion and enjoyment. You decide afterwards.';

  @override
  String get wrExperimentActive =>
      'You have an experiment running — see the result and decide.';

  @override
  String get wrNoExperiment => 'No experiment this week';

  @override
  String get wrNoExperimentSub =>
      'A calm week with no change — also a good choice.';

  @override
  String get wrExperimentNote =>
      'One week gives a signal, not a final verdict.';

  @override
  String get expVarBundle =>
      'Pair the joy only with the habit and compare with the week before';

  @override
  String get expVarEvening => 'One week in the evening instead of the morning';

  @override
  String get expVarMorning => 'One week in the morning instead of the evening';

  @override
  String get expVarMinimum => 'One week of the minimum version every day';

  @override
  String wrChapterTitle(String n) {
    return 'Title for chapter $n';
  }

  @override
  String get wrChapterSub =>
      'Each week is a chapter. Name it in a couple of words you will remember.';

  @override
  String get wrChapterHint => 'e.g. the comeback week';

  @override
  String get wrChapterS1 => 'The comeback week';

  @override
  String get wrChapterS2 => 'Small steps';

  @override
  String get wrChapterS3 => 'A calm week';

  @override
  String get wrCloseChapter => 'Close the chapter';

  @override
  String get wrDone => 'Done';

  @override
  String wrClosedN(String n) {
    return 'Chapter $n closed';
  }

  @override
  String wrClosedTitled(String n, String title) {
    return 'Chapter $n closed: $title';
  }

  @override
  String get wrSaved => 'Chapter saved.';

  @override
  String wrEndWin(String win) {
    return '$win — exactly what we are building. Next week is ready with your priorities.';
  }

  @override
  String get wrEndGeneric =>
      'You reached the end of the week and closed it calmly — that is a win in itself.';

  @override
  String get experimentResultLabel => 'Experiment result';

  @override
  String get beforeWithout => 'Before';

  @override
  String get afterWith => 'After';

  @override
  String get daysDone => 'days done';

  @override
  String get enjoymentOf5 => 'enjoyment of 5';

  @override
  String get experimentCaveat =>
      'A short personal experiment — a signal, not proof.';

  @override
  String get keepIt => 'Keep it';

  @override
  String get revertIt => 'Revert';

  @override
  String get keptLabel => 'Kept';

  @override
  String get revertedLabel => 'Reverted';

  @override
  String get insights => 'Insights';

  @override
  String get insightsSub =>
      'Last 4 weeks · numbers that help you redesign, not judge you';

  @override
  String get momentumByDomain => 'Momentum by area';

  @override
  String get momentumCaption =>
      'Momentum 0–100: a weighted average of the last 7 days. A missed day lowers it a little, never to zero.';

  @override
  String get recoverySpeed => 'Recovery speed';

  @override
  String get recoveryEmpty =>
      'No comebacks logged yet — they appear here when you return to a habit after a break.';

  @override
  String get recoveryCaption =>
      'Numbers = days until you came back. Lower is better. \"—\" = no comeback that week.';

  @override
  String weekShort(String n) {
    return 'Week $n';
  }

  @override
  String get thisWeekShort => 'This week';

  @override
  String get noReturn => 'no comeback';

  @override
  String get bestTimes => 'Your best times';

  @override
  String get bestTimesEmpty =>
      'We need at least 3 completions per habit to find its usual time.';

  @override
  String get bestTimesCaption =>
      'The middle half of your completion times over the last 4 weeks.';

  @override
  String fromNTimes(String n) {
    return 'from $n times';
  }

  @override
  String get experimentsTitle => 'Experiments';

  @override
  String get experimentsEmpty =>
      'No experiments yet — pick one in the weekly review.';

  @override
  String get systemBurden => 'System burden';

  @override
  String get burdenSub =>
      'How much the app itself asks of you. We want it small — the app serves you, it is not extra work.';

  @override
  String get burdenLogs => 'Logs this week';

  @override
  String get burdenReview => 'Review minutes';

  @override
  String get burdenCaption =>
      'We count taps and measure actual review time — nothing is estimated.';

  @override
  String chapterN(String n) {
    return 'Chapter $n';
  }

  @override
  String get settings => 'Settings';

  @override
  String aboutMinutes(String n) {
    return '$n minutes';
  }

  @override
  String get reviewReady => 'Your weekly review is ready';

  @override
  String reviewReadyBody(String n) {
    return 'We close chapter $n with its story: what went well, what got in the way, and next week\'s top 3.';
  }

  @override
  String get reviewEndsWithSparks => 'Ends with review sparks';

  @override
  String chapterClosed(String n) {
    return 'Chapter $n closed';
  }

  @override
  String get nextWeekTop3 => 'Top 3 for the week';

  @override
  String get reviewAgain => 'Open the review again';

  @override
  String get understandMyself => 'Understand myself';

  @override
  String get insightsTileSub => 'Momentum and recovery speed';

  @override
  String get noActiveExperiment => 'No experiment running';

  @override
  String get evidenceSub => 'Every habit, its sources and evidence strength';

  @override
  String get lifeAdmin => 'Life admin';

  @override
  String get moneyTitle => 'Money';

  @override
  String get moneySub => 'Monthly envelopes and bills';

  @override
  String nextDue(String title, String when) {
    return '$title $when';
  }

  @override
  String get autoSaveShort => 'Auto-save';

  @override
  String get homeAdminTitle => 'Home & admin';

  @override
  String zoneOfWeekIs(String z) {
    return 'Zone of the week: $z';
  }

  @override
  String get cycleTitle => 'Cycle log';

  @override
  String get pcosTitle => 'PCOS lifestyle';

  @override
  String get ifDiagnosed => 'If you have a diagnosis';

  @override
  String get privateLocal => 'Private · on your device only';

  @override
  String get appSection => 'App';

  @override
  String get settingsSub => 'Notifications · modules · privacy';

  @override
  String get helpSub => 'When to ask a professional for help';

  @override
  String get dataOnDevice => 'All your data stays on your device.';

  @override
  String get unlockReason => 'Unlock the private section';

  @override
  String get lockedTitle => 'Private section';

  @override
  String get lockedBody => 'This section is protected by the app lock.';

  @override
  String get unlock => 'Unlock';

  @override
  String get moduleOff => 'This module is off. You can turn it on in Settings.';

  @override
  String get cyclePrivacy =>
      'A private log: dates and notes only. No predictions, no analysis, and everything stays on your device.';

  @override
  String cycleLastStart(String date, String n) {
    return 'Last start: $date · $n days ago';
  }

  @override
  String get cycleStartedToday => 'Started today';

  @override
  String get cycleEndedToday => 'Ended today';

  @override
  String get addNote => 'Note';

  @override
  String get cycleLog => 'Log';

  @override
  String get cycleEmpty => 'No entries yet.';

  @override
  String get cycleStart => 'Start';

  @override
  String get cycleEnd => 'End';

  @override
  String get cycleNotMedical =>
      'This is a personal log, not a medical tool. For any health question, see your doctor.';

  @override
  String get pcosBanner =>
      'This content is only for when a doctor has given you a diagnosis — it is not a diagnostic tool.';

  @override
  String get fieldWhat => 'What';

  @override
  String get fieldWhy => 'Why';

  @override
  String get notASubstitute =>
      'The app is not a substitute for a professional.';

  @override
  String moneyScreenSub(String month) {
    return '$month · manual entry — no bank account is linked';
  }

  @override
  String get envelopesTitle => 'Monthly envelopes';

  @override
  String daysLeftMonth(String n) {
    return '$n days left';
  }

  @override
  String get envelopesEmpty =>
      'No envelopes this month — add your first one (e.g. food & coffee).';

  @override
  String spentOf(String spent, String planned) {
    return '$spent of $planned';
  }

  @override
  String get logSpend => 'Log a spend';

  @override
  String get addEnvelope => 'Add an envelope';

  @override
  String get envelopeName => 'Envelope name';

  @override
  String get envelopeHint => 'e.g. food & coffee';

  @override
  String get plannedAmount => 'Planned amount (SAR)';

  @override
  String get amountSar => 'Amount (SAR)';

  @override
  String get autoSaveBody =>
      'Set it up once in your bank app and it runs by itself. Any small fixed amount is a fine start.';

  @override
  String get autoSaveUnset => 'No reminder day set yet';

  @override
  String autoSaveReminder(String day, String time) {
    return 'Reminder: day $day of each month · $time';
  }

  @override
  String get setReminderDay => 'Set the reminder day';

  @override
  String get dayOfMonth => 'Day of month';

  @override
  String billsTitle(String month) {
    return 'Bills & subscriptions · $month';
  }

  @override
  String get legendBill => 'Bill or subscription';

  @override
  String get legendBnpl => 'Instalment';

  @override
  String get billsEmpty => 'No bills — add what repeats every month.';

  @override
  String get subscription => 'Subscription';

  @override
  String get subscriptionsReview =>
      'Monthly check: a subscription you do not use? Cancel it in your phone store settings.';

  @override
  String get addBill => 'Bill or subscription';

  @override
  String get billName => 'Name';

  @override
  String get deleteItemBody => 'It will be removed from your device.';

  @override
  String get bnplTitle => 'Instalments (BNPL)';

  @override
  String get bnplEmpty => 'No instalment plans.';

  @override
  String get bnplDone => 'All payments done';

  @override
  String bnplNext(
    String amount,
    String date,
    String when,
    String n,
    String total,
  ) {
    return 'Next $amount SAR · $date ($when) · payment $n of $total';
  }

  @override
  String get markPaid => 'Paid';

  @override
  String bnplRule(String rule) {
    return 'My rule before any instalment: $rule';
  }

  @override
  String get addBnpl => 'Instalment plan';

  @override
  String get bnplItemName => 'What did you buy?';

  @override
  String get bnplProvider => 'Provider';

  @override
  String get instalmentAmount => 'Instalment (SAR)';

  @override
  String get instalmentCount => 'Number of payments';

  @override
  String get wishlistTitle => 'Wishlist · cooling-off';

  @override
  String get wishlistEmpty =>
      'Want to buy something? Put it here instead of the cart and decide after the cooling-off.';

  @override
  String coolingLeft(String n) {
    return '$n days left — let it rest';
  }

  @override
  String get coolingDone => 'Cooling-off done — still want it?';

  @override
  String get buyIt => 'Yes, buy it';

  @override
  String get dropIt => 'Drop it';

  @override
  String get coolingNote =>
      'You choose the cooling-off length — a practical method; the evidence is not settled.';

  @override
  String get addWish => 'New wish';

  @override
  String get wishName => 'What is it?';

  @override
  String get coolingDays => 'Cooling-off days';

  @override
  String get homeAdminSub => 'Little and steady beats a lot now and then';

  @override
  String resetTitle(String n) {
    return '$n-minute reset';
  }

  @override
  String get resetReady => 'Ready';

  @override
  String get resetRunning => 'Running';

  @override
  String get resetDone => 'Done — the space feels lighter';

  @override
  String startResetN(String n) {
    return 'Start $n minutes';
  }

  @override
  String withBundle(String b) {
    return 'With $b';
  }

  @override
  String get zoneOfWeek => 'Zone of the week';

  @override
  String get nextZone => 'Next zone';

  @override
  String get zoneDesk => 'Desk drawer';

  @override
  String get zoneWardrobe => 'Wardrobe';

  @override
  String get zoneKitchen => 'Kitchen shelf';

  @override
  String get zoneBathroom => 'Bathroom shelf';

  @override
  String get zoneBag => 'Bag';

  @override
  String get zoneShelf => 'Bookshelf';

  @override
  String get docsTitle => 'Documents & renewals';

  @override
  String get addDoc => 'Add a document';

  @override
  String get docsEmpty =>
      'Add your documents (ID, passport, insurance…) and expiry dates — we remind you before.';

  @override
  String get docNoExpiry => 'No expiry date yet';

  @override
  String docExpires(String date, String when) {
    return 'Expires $date · $when';
  }

  @override
  String get docWaiting => 'Waiting';

  @override
  String get docRenewNow => 'Time to renew';

  @override
  String docRemindBefore(String n) {
    return '$n days before';
  }

  @override
  String get docsNote => 'You set the reminder window for each document.';

  @override
  String get docName => 'Document name';

  @override
  String get docNameHint => 'e.g. passport';

  @override
  String get expiryDate => 'Expiry date';

  @override
  String get remindBeforeDays => 'Remind me before';

  @override
  String daysN(String n) {
    return '$n days';
  }

  @override
  String get errandsTitle => 'Batched errands';

  @override
  String errandsTitleWhen(String when) {
    return 'Batched errands · $when';
  }

  @override
  String get errandsEmpty =>
      'Any errand that comes up? Note it here and do it with the rest in your admin block.';

  @override
  String get addErrand => 'New errand';

  @override
  String get errandName => 'Errand';

  @override
  String get errandHint => 'e.g. pick up a parcel';

  @override
  String get aquarium => 'Aquarium';

  @override
  String get aquariumSub => 'Optional module · only if you have a tank';

  @override
  String get evidenceScreenSub =>
      'Every habit in the app has a source, and we tell you its evidence strength honestly';

  @override
  String get filterAll => 'All';

  @override
  String get strengthStrongest => 'Evidence strength · strongest first';

  @override
  String get strengthLegend =>
      'Guidelines come from official health bodies, systematic reviews pool many studies, and a trial is one controlled study.';

  @override
  String get evGuideline => 'Guideline';

  @override
  String get evSrMa => 'Systematic review';

  @override
  String get evRct => 'Trial';

  @override
  String get evObservational => 'Observational';

  @override
  String get evExpert => 'Expert opinion';

  @override
  String actionsCount(String n, String total) {
    return '$n of $total actions';
  }

  @override
  String get sourceLabel => 'Source';

  @override
  String get noSourceListed =>
      'No source listed for this action — a practical tip.';

  @override
  String get inYourPlan => 'In your plan';

  @override
  String get addToPlan => 'Add to my plan';

  @override
  String get addedToInbox => 'Added to the idea inbox';

  @override
  String get addedWeekly => 'Added to weekly tasks';

  @override
  String get weeklyPickDay =>
      'Which day suits you? If none, it shows in \"This week\".';

  @override
  String get fieldMetric => 'How to track';

  @override
  String get atHabit => 'Habit';

  @override
  String get atRoutineStep => 'Routine step';

  @override
  String get atWeekly => 'Weekly';

  @override
  String get atSystem => 'One-time system';

  @override
  String get atReference => 'Reference';

  @override
  String get atProjectStep => 'Project step';

  @override
  String get langAndLook => 'Language & appearance';

  @override
  String get notificationsSection => 'Notifications';

  @override
  String get capRange => '0 to 6 · default 4';

  @override
  String get capNone => 'No notifications — the app works when you open it.';

  @override
  String get capCaption =>
      'Morning brief · evening shutdown · the rest at the cues of habits with a reminder.';

  @override
  String scheduledToday(String n) {
    return 'Scheduled today: $n';
  }

  @override
  String get quietHours => 'Quiet hours';

  @override
  String get fromLabel => 'From';

  @override
  String get toLabel => 'To';

  @override
  String get focusSilences =>
      'Focus sessions silence notifications automatically.';

  @override
  String get anchorsSection => 'Anchors · the cues your habits start from';

  @override
  String get prayerAnchorsSettingsSub =>
      'Optional · computed on your device · Umm al-Qura';

  @override
  String get cityLabel => 'City';

  @override
  String get cityMakkah => 'Makkah';

  @override
  String get cityJeddah => 'Jeddah';

  @override
  String get modulesSection => 'Optional modules';

  @override
  String get cycleModuleSub => 'A private log · off by default';

  @override
  String get pcosModuleSub => 'Only with a diagnosis from a doctor';

  @override
  String get aquariumModuleSub => 'Water and feeding tasks';

  @override
  String get modulesPrivacy =>
      'All data stays on your device — no account or server. Sensitive modules are off by default and can be locked with Face ID.';

  @override
  String get privacyData => 'Privacy & data';

  @override
  String get appLockSettingsSub => 'Face ID for sensitive sections';

  @override
  String get forgivingStreakTitle => 'Forgiving streak';

  @override
  String get forgivingStreakSub => 'Optional · two grace days each week';

  @override
  String get exportAll => 'Export all data';

  @override
  String get importFile => 'Import from a file';

  @override
  String get exportDone => 'The file is ready to share.';

  @override
  String get exportFailed => 'We could not share the file.';

  @override
  String get importConfirmTitle => 'Replace your data?';

  @override
  String get importConfirmBody =>
      'The file\'s data replaces all your current data on this device.';

  @override
  String get importDone => 'Import done.';

  @override
  String get importFailed =>
      'The file could not be read — make sure it is an export from the app.';

  @override
  String get deleteAll => 'Delete all data';

  @override
  String get deleteAllNote =>
      'We ask twice before deleting, and suggest exporting first.';

  @override
  String get deleteAllTitle => 'Delete everything?';

  @override
  String get deleteAllBody1 =>
      'Your habits, logs, sparks and rewards will all be removed from this device. Export a copy first.';

  @override
  String get deleteContinue => 'Continue';

  @override
  String get deleteAllTitle2 => 'Are you sure?';

  @override
  String get deleteAllBody2 =>
      'This is the last step — deleting cannot be undone.';

  @override
  String get deleteAllFinal => 'Delete everything';

  @override
  String get whenToSeekHelp => 'When to ask a professional for help?';

  @override
  String get helpBullet1 =>
      'If low mood, anxiety or stress keeps going and affects your day.';

  @override
  String get helpBullet2 =>
      'If it becomes hard to look after your basics: sleep, food, work or study.';

  @override
  String get helpBullet3 =>
      'If you have thoughts of harming yourself — go to the emergency department now.';

  @override
  String get savedNumbers => 'Numbers saved for you';

  @override
  String get moh937 => 'Ministry of Health';

  @override
  String get moh937Sub => 'Medical phone consultation · 24 hours';

  @override
  String get mohPsych => 'MOH psychological consultation center';

  @override
  String get mohPsychSub =>
      'Mental-health professionals\n8 am–8 pm, Sat 1–8 pm';

  @override
  String get ambulance => 'Red Crescent (ambulance)';

  @override
  String get unifiedEmergency => 'Unified emergency';

  @override
  String get erOpen => 'Hospital emergency departments are open 24 hours.';

  @override
  String get notSubstituteLong =>
      'This app is not a substitute for a professional. It does not diagnose or track your mental health — it only helps with your day.';

  @override
  String callN(String title, String n) {
    return 'Call $title: $n';
  }

  @override
  String get recoverySpeedSub =>
      'How many days it takes you to come back after missing a core habit.';

  @override
  String beforeRoadmap(String date) {
    return 'Before the year starts · $date — it begins in October';
  }

  @override
  String get sizeQuickShort => 'Quick';

  @override
  String bnplNextAmount(String amount) {
    return 'Next $amount SAR';
  }

  @override
  String bnplPaymentN(String n, String total) {
    return 'Payment $n of $total';
  }

  @override
  String overdueDays(String n) {
    return '$n days overdue';
  }

  @override
  String get storageUnavailable =>
      'Saving isn\'t available in this browser — your data is temporary';

  @override
  String get undoExpired =>
      'The undo window has passed — you can uncheck it on the card.';

  @override
  String get setSmallDuration => 'Set a small duration';

  @override
  String get setSmallDurationRequired =>
      'Set a small duration for the minimum version before saving.';

  @override
  String get estimateTag => 'estimate';

  @override
  String get momentumResting => 'Resting';

  @override
  String get shapeRedOne => '1 small thing + a joy';

  @override
  String get shapeRedTwo => '2 small things + a joy';

  @override
  String wrEndWinNoTop(String win) {
    return '$win — exactly what we are building. Next week starts calmly.';
  }

  @override
  String get helpSources => 'Sources for these numbers';

  @override
  String get helpSrc937 => '937 — MOH 937 service page';

  @override
  String get helpSrcPsych => '920033360 — MOH mental-health services page';

  @override
  String get helpSrc911 => '911 — Saudi Red Crescent Authority site';

  @override
  String get unsourcedBadge => 'Practical tip — no peer-reviewed source';

  @override
  String get nudgeDuesTitle => 'Today\'s dues';

  @override
  String get duesAutoSave => 'Automatic savings transfer';

  @override
  String get helpSrc997 =>
      '997 — National Numbering Plan, Communications, Space & Technology Commission';
}
