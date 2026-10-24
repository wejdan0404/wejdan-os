/**
 * One read-model + action set for every Today-area screen, so the
 * behaviour (toasts, undo, nothing moving silently) is identical everywhere.
 */
import { useMemo } from 'react'
import {
  dayKey as dateKeyOf,
  energyAnswered,
  isDoneLevel,
  logsOn,
  sparksBalance,
  todayView,
  type CompletionLevel,
  type LogEntry,
  type PlanItem,
  type TaskItem,
} from '../../../domain'
import { useToast } from '../../components/Toast'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { dateLine, isolate, sparksText, thingsCount } from './lib'

export function useTodayModel() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const view = useMemo(() => todayView(s, today), [s, today])
  const logs = useMemo(() => logsOn(s, today), [s, today])
  const answered = energyAnswered(s, today)
  const sparks = sparksBalance(s)

  const logOf = (i: PlanItem): LogEntry | undefined => logs.get(i.itemId)
  const isDone = (i: PlanItem): boolean => {
    const l = logOf(i)
    return l != null && isDoneLevel(l.level)
  }
  const isSkipped = (i: PlanItem): boolean => logOf(i)?.level === 'skipped'

  const actions = {
    async complete(i: PlanItem, level: CompletionLevel = i.suggestedLevel, o: { durationMin?: number } = {}) {
      const r = await store.completeItem(i, level, o)
      toast({
        message: r.award.amount > 0 ? `انحسبت لك · +${sparksText(r.award.amount)}` : 'انحسبت لك',
        actionLabel: 'تراجع',
        onAction: () => void store.undo(r.log.id),
      })
      return r
    },
    uncomplete(i: PlanItem) {
      const l = logOf(i)
      if (l) void store.undo(l.id, true)
    },
    async skip(i: PlanItem) {
      const log = await store.skipItem(i)
      toast({ message: 'تخطّيتيها اليوم — عادي', actionLabel: 'تراجع', onAction: () => void store.undo(log.id, true) })
    },
    async later(i: PlanItem) {
      const ok = await store.moveToLater(i.id)
      if (ok) toast({ message: `راحت لـ«بعدين»: ${isolate(i.title.ar)}`, actionLabel: 'تراجع', onAction: () => void store.restoreFromLater(i.id) })
    },
    async restore(i: PlanItem) {
      await store.restoreFromLater(i.id)
      toast({ message: 'رجعت ليومك', actionLabel: 'تراجع', onAction: () => void store.moveToLater(i.id) })
    },
    async dropLater(i: PlanItem) {
      const token = await store.dropFromLater(i.id)
      toast({ message: 'شلناها من «بعدين»', actionLabel: token ? 'تراجع' : undefined, onAction: token ? () => void store.undoDelete(token.token) : undefined })
    },
    async accept(i: PlanItem, level?: CompletionLevel) {
      await store.acceptSuggestion(i.id, level ? { level } : {})
      toast({ message: `انضافت ليومك: ${isolate(i.title.ar)}`, actionLabel: 'تراجع', onAction: () => void store.unaccept(i.id) })
    },
    async remove(i: PlanItem) {
      await store.unaccept(i.id)
      toast({ message: `شلناها من يومك: ${isolate(i.title.ar)}`, actionLabel: 'تراجع', onAction: () => void store.acceptSuggestion(i.id) })
    },
    /** Moves an item to another day: off today, out of today's suggestions; undo puts it back. */
    async moveTo(i: PlanItem, to: Date, label: string | null) {
      const wasAccepted = view.plan.items.some((x) => x.id === i.id)
      const ok = await store.moveToDate(i.id, to, today)
      if (!ok) return
      // «لبكرة» / «ليوم السبت 24 أكتوبر» — no tatweel joiner
      const when = label != null ? `ل${label}` : `ليوم ${dateLine(to)}`
      toast({
        message: `انتقلت ${when}: ${isolate(i.title.ar)}`,
        actionLabel: 'تراجع',
        onAction: () => void store.undoMoveToDate(i.id, to, today, wasAccepted),
      })
    },
    /** «رجّعيها للوارد»: leaves today and lands in the inbox to re-sort. */
    async toInbox(i: PlanItem) {
      const wasAccepted = view.plan.items.some((x) => x.id === i.id)
      const inb = await store.planItemToInbox(i.id, today)
      if (!inb) return
      toast({
        message: `رجعت للوارد: ${isolate(i.title.ar)}`,
        actionLabel: 'تراجع',
        onAction: () => void store.undoPlanItemToInbox(i.id, inb.id, today, wasAccepted),
      })
    },
    /** Adds several suggestions at once (Brief «أضيفي المقترح كله»), with one undo. */
    async acceptAll(items: PlanItem[]) {
      const ids = items.map((i) => i.id)
      const n = await store.acceptMany(ids, today)
      if (n === 0) return 0
      toast({
        message: n === 1 ? 'انضافت ليومك' : `انضاف ${thingsCount(n)} ليومك`,
        actionLabel: 'تراجع',
        onAction: () => void Promise.all(ids.map((id) => store.unaccept(id, today))),
      })
      return n
    },
    /** Adds a whole suggested routine to today in one tap. */
    async acceptRoutine(ids: string[], title: string) {
      const n = await store.acceptMany(ids, today)
      if (n === 0) return
      toast({
        message: `انضاف ${title} ليومك`,
        actionLabel: 'تراجع',
        onAction: () => void Promise.all(ids.map((id) => store.unaccept(id, today))),
      })
    },
    async completeTask(t: TaskItem) {
      const prev = t.status
      await store.completeTask(t.id)
      toast({ message: 'خلصت', actionLabel: 'تراجع', onAction: () => void store.updateTask(t.id, { status: prev }) })
    },
    /** «ما خلصت» on a finished task: back to planned for today. */
    async uncompleteTask(t: TaskItem) {
      await store.updateTask(t.id, { status: 'planned', dueDate: t.dueDate ?? dateKeyOf(today) })
    },
    async postponeTask(t: TaskItem) {
      const prev = { status: t.status, dueDate: t.dueDate, postponedTo: t.postponedTo }
      await store.postponeTask(t.id)
      toast({ message: 'تأجلت — تلقينها في «بعدين»', actionLabel: 'تراجع', onAction: () => void store.updateTask(t.id, prev) })
    },
    async taskToInbox(t: TaskItem) {
      const prev = { status: t.status, dueDate: t.dueDate, postponedTo: t.postponedTo }
      await store.returnTaskToInbox(t.id)
      toast({ message: 'رجعت للوارد', actionLabel: 'تراجع', onAction: () => void store.updateTask(t.id, prev) })
    },
  }

  return { s, store, today, view, logs, answered, sparks, isDone, isSkipped, logOf, actions }
}
