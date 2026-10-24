import type { ExperimentTemplate, MissReason, StrengthBand } from '../../../../domain'

/** Weekly review — step ids in order (feat/a). */
export const STEP_IDS = ['wins', 'important', 'deferred', 'blockers', 'pause', 'strength', 'season', 'top3', 'experiment', 'close'] as const
export type StepId = (typeof STEP_IDS)[number]

export const STEP_QUESTION: Record<StepId, string> = {
  wins: 'وش خلّصتي؟',
  important: 'وش لسا مهم؟',
  deferred: 'وش تأجلينه دايم؟',
  blockers: 'وش اللي عطّلك؟',
  pause: 'وش نوقفه؟',
  strength: 'كيف صارت عاداتك؟',
  season: 'تعديل الموسم',
  top3: 'أولوياتك الجاية؟',
  experiment: 'تجربة الأسبوع',
  close: 'الخطة ناسبت طاقتك؟',
}

/** One suggested fix per blocker — calm, a design change, never blame. */
export const BLOCKER_FIX_AR: Record<MissReason, string> = {
  forgot: 'اربطيها بشي تسوينه كل يوم، وخلّي التذكير قبله بدقايق.',
  badTime: 'جرّبي وقت ثاني لها هالأسبوع، ونشوف أي وقت يمشي معك.',
  tooBig: 'نزّليها للنسخة الصغيرة بس. دقيقتين تكفي هالأسبوع.',
  tired: 'النسخة الصغيرة تكفي، وقرّبيها للوقت اللي طاقتك فيه أحسن.',
  notEnjoyable: 'ضمّي لها شي تحبينه، مثل بودكاست أو أغنية.',
  placeDidntFit: 'جهّزي المكان قبلها، أداتك على الباب أو جنب السرير.',
  busy: 'صغّريها وحطيها في وقت فاضي ثابت، ولو فاتت ما يصير شي.',
  notImportantNow: 'عادي. وقّفيها مؤقتًا، وترجعينها متى ما بغيتي.',
}

export const BLOCKER_FEEDS_AR = {
  experiment: 'نجرّبها في تجربة الأسبوع',
  pause: 'تلقينها في خطوة «وش نوقفه؟»',
} as const

/** SRBAI: 4 sentences about the same habit. */
export const STRENGTH_ITEMS_AR = [
  'أسويها تلقائيًا',
  'أسويها بدون ما أحتاج أتذكر',
  'أسويها بدون ما أفكر فيها',
  'أبدأها قبل ما أنتبه إني بدأت',
] as const

export const STRENGTH_BAND_AR: Record<StrengthBand, string> = {
  attention: 'لسا تحتاج انتباه منك، وهذا طبيعي بالبداية.',
  easing: 'بدأت تخف عليك شوي شوي.',
  easy: 'صارت أسهل بوضوح.',
  automatic: 'شبه تلقائية.',
}

export const EXPERIMENT_HOW_AR: Record<ExperimentTemplate, string> = {
  timeSwap: 'غيّري وقتها هالأسبوع، ونقارن الإنجاز والمتعة بالأسبوع اللي قبله.',
  bundle: 'ضمّي لها شي تحبينه هالأسبوع، ونقارن الإنجاز والمتعة.',
  minimumOnly: 'اكتفي بالنسخة الصغيرة هالأسبوع، ونقارن الإنجاز والمتعة.',
}

export const SCALE_LOW_AR = 'ما أوافق أبدًا'
export const SCALE_HIGH_AR = 'أوافق تمامًا'
