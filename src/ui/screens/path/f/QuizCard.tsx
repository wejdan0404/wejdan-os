import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { addQuizQuestion, answerQuiz, editQuizQuestion, nextQuizDate, quizDueCount, quizRound, removeQuizQuestion, type QuizQuestion } from '../../../../domain'
import { Bidi } from '../../../components/Bidi'
import { Button } from '../../../components/Button'
import { Icon } from '../../../icons/Icon'
import { Sheet } from '../../../components/Sheet'
import { dur, ease } from '../../../motion'
import { useStore, useToday } from '../../../state/LifeStore'
import { SectionHead, dayLabel } from '../pathKit'
import { useDo, useIeltsDriving } from './fKit'
import pathStyles from '../Path.module.css'
import styles from './PathF.module.css'

/** «النظري بالتكرار المتباعد» — questions are all hers; wrong answers come back after a day, then after days. */
export function QuizCard() {
  const today = useToday()
  const d = useIeltsDriving()
  const due = quizDueCount(d.quiz, today)
  const next = nextQuizDate(d.quiz, today)
  const [run, setRun] = useState(false)
  const [manage, setManage] = useState(false)
  return (
    <>
      <SectionHead title="النظري بالتكرار المتباعد" />
      <section className={styles.card} aria-label="النظري بالتكرار المتباعد">
        {d.quiz.length === 0 ? (
          <p className={styles.callout}>ما فيه أسئلة للحين. أضيفي أسئلتك من مصدر رسمي — بنك الأسئلة نضيفه لما نتأكد من المصدر.</p>
        ) : (
          <p className={styles.cardSub}>
            {due > 0 ? `${due} ${due === 1 ? 'سؤال' : 'أسئلة'} تنتظرك — الجولة حتى 10 أسئلة. الأسئلة اللي تغلطين فيها ترجع لك بعد أيام.` : next ? `ما فيه شي اليوم. الجولة الجاية: ${dayLabel(next)}` : 'خلّصتي اللي عندك.'}
          </p>
        )}
        <div className={styles.actions}>
          {due > 0 && <Button onClick={() => setRun(true)}>ابدئي جولة</Button>}
          <Button variant="secondary" onClick={() => setManage(true)}>{d.quiz.length ? 'أسئلتك' : 'أضيفي سؤال'}</Button>
        </div>
      </section>
      {run && <QuizRunSheet onClose={() => setRun(false)} />}
      <QuestionsSheet open={manage} onClose={() => setManage(false)} />
    </>
  )
}

function QuizRunSheet({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const today = useToday()
  const reduce = useReducedMotion()
  const d = useIeltsDriving()
  // The round is fixed when it opens; later reschedules don't reshuffle it.
  const round = useMemo(() => quizRound(d.quiz, today), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const q = round[i] ?? null
  const live = q ? d.quiz.find((x) => x.id === q.id) ?? q : null

  const choose = async (idx: number) => {
    if (!live || picked != null) return
    setPicked(idx)
    const ok = idx === live.answer
    if (!ok) setWrong((w) => w + 1)
    await answerQuiz(store, live.id, ok)
  }
  const next = () => {
    setPicked(null)
    setI((n) => n + 1)
  }
  return (
    <Sheet open onClose={onClose} title="جولة اليوم" detents={['large']}>
      {live ? (
        <div className={styles.qWrap}>
          <span className={styles.progressRow}>سؤال <bdi>{i + 1}</bdi> من <bdi>{round.length}</bdi></span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={live.id}
              className={styles.qWrap}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.standard }}
            >
              <h3 className={styles.qText}><Bidi>{live.question}</Bidi></h3>
              <ul className={styles.choices}>
                {live.choices.map((c, idx) => {
                  const state = picked == null ? undefined : idx === live.answer ? 'right' : idx === picked ? 'picked' : undefined
                  return (
                    <li key={idx}>
                      <button type="button" className={styles.choice} data-state={state} disabled={picked != null} onClick={() => void choose(idx)}>
                        <span className={styles.choiceMark} aria-hidden="true">{state === 'right' && <Icon name="check" size={20} />}</span>
                        <span><Bidi>{c}</Bidi></span>
                        {state === 'right' && <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> الجواب الصحيح</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {picked != null && (
                <p className={styles.feedback} role="status">
                  {picked === live.answer ? 'تمام.' : 'نرجّعه لك قريب.'}
                  {live.explanation && <> <Bidi>{live.explanation}</Bidi></>}
                  {live.source && <> · <Bidi>{live.source}</Bidi></>}
                </p>
              )}
              {picked != null && <Button size="large" block onClick={next}>{i + 1 >= round.length ? 'خلّصنا' : 'التالي'}</Button>}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className={styles.summary}>
          <h3 className={styles.qText}>خلّصتي جولة اليوم</h3>
          <p className={styles.cardSub}>راجعتي <bdi>{round.length}</bdi>{wrong > 0 ? <> · <bdi>{wrong}</bdi> منها ترجع لك</> : null}.</p>
          <Button onClick={onClose}>تمام</Button>
        </div>
      )}
    </Sheet>
  )
}

type Draft = { question: string; choices: string[]; answer: number; explanation: string; source: string }
const emptyDraft = (): Draft => ({ question: '', choices: ['', '', '', ''], answer: 0, explanation: '', source: '' })

function QuestionsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const run = useDo()
  const d = useIeltsDriving()
  const [editing, setEditing] = useState<QuizQuestion | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [k, setK] = useState<string | null>(null)
  const key = editing === null ? null : editing === 'new' ? 'new' : editing.id
  if (key !== k) {
    setK(key)
    if (editing && editing !== 'new') setDraft({ question: editing.question, choices: [...editing.choices, '', '', ''].slice(0, 4), answer: editing.answer, explanation: editing.explanation, source: editing.source })
    else setDraft(emptyDraft())
  }
  const filled = draft.choices.filter((c) => c.trim()).length
  const answerOk = !!draft.choices[draft.answer]?.trim()
  const can = draft.question.trim() && filled >= 2 && answerOk
  const save = async () => {
    if (!can) return
    const ok = editing && editing !== 'new' ? await run(editQuizQuestion(store, editing.id, draft), 'انحفظ السؤال') : await run(addQuizQuestion(store, draft), 'انضاف السؤال')
    if (ok) setEditing(null)
  }
  const setChoice = (i: number, v: string) => setDraft((x) => ({ ...x, choices: x.choices.map((c, j) => (j === i ? v : c)) }))
  return (
    <Sheet open={open} onClose={() => { setEditing(null); onClose() }} title={editing ? (editing === 'new' ? 'سؤال جديد' : 'عدّلي السؤال') : 'أسئلتك'} detents={['large']}>
      {editing ? (
        <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>السؤال</span>
            <textarea className={pathStyles.textarea} value={draft.question} onChange={(e) => setDraft((x) => ({ ...x, question: e.target.value }))} autoFocus />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className={pathStyles.form}>
            <legend className={pathStyles.label}>الخيارات — اختاري الصحيح بالدائرة</legend>
            {draft.choices.map((c, i) => (
              <div key={i} className={pathStyles.addRow} style={{ padding: 0, alignItems: 'center' }}>
                <input type="radio" name="ans" checked={draft.answer === i} onChange={() => setDraft((x) => ({ ...x, answer: i }))} aria-label={`الخيار ${i + 1} هو الصحيح`} style={{ width: 24, height: 24, flex: 'none', accentColor: 'var(--action-default)' }} />
                <input className={pathStyles.input} value={c} onChange={(e) => setChoice(i, e.target.value)} placeholder={i < 2 ? `الخيار ${i + 1}` : `الخيار ${i + 1} (اختياري)`} aria-label={`الخيار ${i + 1}`} />
              </div>
            ))}
          </fieldset>
          {!answerOk && filled > 0 && <p className={pathStyles.fieldError} role="alert">الجواب الصحيح لازم يكون خيار مكتوب.</p>}
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>شرح (اختياري)</span>
            <input className={pathStyles.input} value={draft.explanation} onChange={(e) => setDraft((x) => ({ ...x, explanation: e.target.value }))} />
          </label>
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>المصدر (اختياري)</span>
            <input className={pathStyles.input} value={draft.source} onChange={(e) => setDraft((x) => ({ ...x, source: e.target.value }))} placeholder="وين أخذتيه؟" />
          </label>
          <Button type="submit" size="large" block disabled={!can}>احفظي</Button>
          <Button variant="plain" block onClick={() => setEditing(null)}>رجوع للقائمة</Button>
          {editing !== 'new' && <Button variant="plain" block onClick={() => { void run(removeQuizQuestion(store, editing.id), 'انحذف السؤال'); setEditing(null) }}>احذفي السؤال</Button>}
        </form>
      ) : (
        <div className={styles.sheetList}>
          <Button block onClick={() => setEditing('new')}>أضيفي سؤال</Button>
          {d.quiz.length === 0 && <p className={styles.callout}>فاضي — أضيفي أسئلتك من مصدر رسمي. بنك الأسئلة نضيفه لما نتأكد من المصدر.</p>}
          {d.quiz.map((q) => (
            <button key={q.id} type="button" className={styles.card} style={{ marginInline: 0, textAlign: 'start', border: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => setEditing(q)}>
              <span className={styles.cardTitle}><Bidi>{q.question}</Bidi></span>
              <span className={styles.cardSub}>{q.choices.length} خيارات · ترجع لك {dayLabel(q.due)}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
