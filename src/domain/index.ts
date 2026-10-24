/**
 * Wejdan Life OS — domain facade (the ONLY import the UI needs: `@/domain` or `../domain`).
 *
 * ## Boot
 *   const store = await createLifeStore();            // IndexedDB (falls back to memory)
 *   store.persistent                                   // false → show "not saved in this browser" banner
 *
 * ## Read (React)
 *   const s = useSyncExternalStore(store.subscribe, store.getSnapshot);   // LifeSnapshot (new object per change)
 *   const today = store.today();                                          // logical day (flips at 04:30)
 *   todayView(s, today)   → { mode, plan (accepted items), suggestions (with fit reason), later, tasks,
 *                             thisWeek, load {busy, overByMin, coreCount, coreCap}, showHelpLink }
 *   logsOn(s, today)      → Map<itemId, best LogEntry> (card done-state)
 *   openInbox(s), inboxCount(s), postponedTasks(s), tasksForDay(s, d), tasksOfProject(s, id)
 *   productsBySlot(s)     → { am, pm, weekly }   (AM/PM care routines are generated from them)
 *   currentBudgetCycle(s, d) → { start, end, key, nextPayday, daysToPayday, isPayday }  (payday default 1)
 *   upcomingDuesFor(s, d) · envelopesThisCycle(s, d)
 *   sparksBalance(s) · sparksEarnedOn(s, d) · sparkLedger(s)
 *   habitStrengthOf(s, id, d) · momentumOf(s, id, d) · domainMomentum(s, domain, d) · forgivingStreakOf(s, id, d)
 *   recoveryTriggers(s, d) · capacityViolations(s) · reminderPlanFor(s, d) (empty while reminders are off)
 *   vocabDue(s, d) · activeExperiment(s) · experimentResult(s, id, d) · currentChapter(s, d) · freshStartToday(s, d)
 *
 * ## Write (all async, write-through, publish a new snapshot)
 *   Day (suggestion mode — nothing moves without her):
 *     acceptSuggestion(id, {level?, date?}) · acceptMany(ids) · acceptAutoPlan() · unaccept(id) · declineSuggestion(id)
 *     setPlannedLevel(id, level) · moveToLater(id) · restoreFromLater(id, date?) · dropFromLater(id) → UndoToken
 *     eveningDecision({planItemId}|{taskId}, 'tomorrow'|'later'|'letGo')
 *   Logging: completeItem(item, level, {durationMin, enjoyment, note}) → {log, award, undoUntil}
 *     skipItem(item) · undo(logId) (10 s) · setEnergy(mode) · recordStrengthCheck(habitId, items)
 *   Inbox & tasks: quickAdd(title, kind?) · convertInbox(id, 'task'|'project'|'note', {domain, dueDate})
 *     archiveInbox(id) · deleteInbox(id) → UndoToken · addTask({title, …}) · updateTask(id, patch)
 *     completeTask(id) · postponeTask(id, date|null) · returnTaskToInbox(id) · planTask(id, date, time) · deleteTask(id)
 *   Products: upsertProduct(p) · deleteProduct(id) · reorderProducts(slot, ids)
 *   Habits / design: upsertHabit(h, force?) → CapacityViolation[] · setHabitStatus(id, 'paused'|…) · deleteHabit(id)
 *     setDomainState(id, state, force?) · setDomainEnabled · startNewSeason · upsertProject / deleteProject
 *     upsertRoutine / upsertWeeklyTask / upsertGoal / upsertFixedEvent / upsertJoyItem (+ delete* → UndoToken)
 *   Recovery (any habit): startRecovery(habitId) · proposeRecovery(habitId, reason) · acceptDesignChange(change)
 *   Money: setPayday(day) · upsertEnvelope / upsertBill / upsertBnpl / upsertWish / upsertAdminDoc (+ delete*)
 *   Sparks & joy: redeem(joyId) · Experiments: startExperiment / finishExperiment · Vocab: addVocabCard / reviewVocab
 *   Weekly review: saveWeeklyReview(draft) · Settings: updateSettings(settings)
 *   Deletes: every delete* returns UndoToken | null → undoDelete(token) within 10 s.
 *   Data: exportAll() → JSON · previewImport(json) → counts/errors · importAll(json, {confirm: true}) → BackupInfo
 *     (automatic backup first) · listBackups() · getBackup(id) · restoreBackup(id) · deleteAllAndReseed()
 *
 * ## Notes & decisions (snapshot `s.notes`, pinned first then newest)
 *   Read:  notesView(s) · decisions(s) · notesLinkedTo(s, 'project'|'goal'|'habit'|'task', id) · noteDisplayTitle(n)
 *   Write: addNote({title?, body?, links?, isDecision?, pinned?, tag?}) → Note | null (empty refused)
 *          updateNote(id, patch) · setNotePinned(id, b) · setNoteDecision(id, b) · linkNote(id, {kind, id}) · unlinkNote(id, link)
 *          deleteNote(id) → UndoToken (undoDelete within 10 s)
 *   Labels: NOTE_TAG_LABELS (ملاحظة/تفضيل/مرجع/روتين/هدف/موعد)
 *
 * ## Global search (pure, Arabic-aware: no tashkeel/tatweel, أإآ→ا، ة→ه، ى→ي)
 *   store.search(query, {perGroup?, kinds?, includeInactive?}) — or search(s, query, o)
 *     → { query, tokens, total, groups: [{ kind, label, results: [{kind, id, title, subtitle, score, inactive}] }] }
 *   kinds: task · inbox · habit · project · goal · note · product · joy (SEARCH_KIND_LABELS for headers)
 *   normalizeArabic(text) is exported for highlighting.
 *
 * ## Change log (snapshot `s.changeLog`, newest first, capped at kMaxChangeLog = 300, exported)
 *   Logged automatically: deletes (every delete*), edits/creates of tasks, inbox, habits, projects, goals, products,
 *   notes, routines, weekly tasks, joy items, fixed events (no-op edits skipped).
 *   Read:  changesFor(s, entity, id) · CHANGE_ENTITY_LABELS · CHANGE_OP_LABELS
 *   Write: restoreChange(entryId) → boolean — puts the "before" version back (a create is removed); the restore is logged too.
 *
 * ## Sources & import review (snapshot `s.sources`, `s.importBatches`, `s.provenance`)
 *   1. startImport(fileName, text) → {ok: true, source, batch} | {ok: false, source (status 'failed'), error (Arabic), reason}
 *      .json / .csv / .md / .txt (unknown text files read as text). Nothing is added yet.
 *   2. Review each candidate {type, title, body, date?, time?, sourceRef {file, location}, status, decision, matches, missing}:
 *      status: confirmed | suggested | missing | conflict  (CANDIDATE_STATUS_LABELS) · type labels: CANDIDATE_TYPE_LABELS
 *      reviewCandidate(batchId, candId, 'approved'|'ignored'|'pending') · editCandidate(batchId, candId, {type?, title?, body?,
 *      url?, date?, time?, domain?}) · decideAll(batchId, decision, {includeFlagged?}) (bulk-approve skips flagged items)
 *   3. commitImport(batchId) → {added, skipped, undo} — only APPROVED items; tasks → inbox status (no date), projects → idea,
 *      ideas → inbox, others → notes tagged with their type. NEVER touches a day plan. undoDelete(undo.token) reverts.
 *      discardImport(batchId) drops it.
 *   Read:  needsReview(s) · needsReviewCount(s) · openImportBatches(s) · failedSources(s) · sourceReport(s, sourceId)
 *          provenanceOf(s, 'task'|'project'|'note'|'inbox', id) → {sourceRef {file, location}, source, originalDate, …} | null
 *   Storage: new boxes notes · changelog · sources · importBatches · provenance are additive web boxes in the same
 *   export (schemaVersion stays 1): a file without them imports fine and keeps what is on the device.
 *
 * ## Old Flutter data (same origin, hive_ce IndexedDB `wlo_*` databases — read-only)
 *   detectLegacyData() → {found, hasData, counts, total}
 *   shouldOfferLegacyMigration(snapshot) → {offer, wouldReplace, detection}  (boot sheet rule)
 *   migrateLegacyData(store, {confirm: true}) → {backup, imported, report, skipped}  (old DBs never touched)
 *   snoozeLegacyMigration() («بعدين», 24 h) · readLegacyMarker() · readLegacyData() (export JSON, no writes)
 */
export * from './models';
export * from './core/dates';
export { type Json } from './core/json';
export * from './engine/whyToday';
export * from './engine/anchors';
export * from './engine/history';
export * from './engine/dayPlanner';
export * from './engine/capacityGuard';
export * from './engine/sparks';
export * from './engine/momentum';
export * from './engine/habitStrength';
export * from './engine/recovery';
export * from './engine/reminders';
export * from './inAppReminders';
export * from './reminderSelectors';
export * from './engine/dues';
export * from './engine/freshStart';
export * from './engine/experiments';
export * from './engine/insights';
export * from './engine/reviewInsights';
export * from './engine/celebrations';
export * from './engine/vocabSrs';
export * from './products';
export * from './seed/seedLibrary';
export * from './seed/starterProfile';
export * from './seed/personalLibrary';
export * from './snapshot';
export * from './selectors';
export * from './todaySummary';
export * from './features';
export * from './storage';
export * from './store';
export * from './migration/flutterHive';
export * from './ics';
export * from './backupReminder';
export * from './money';
export * from './joyMap';
export * from './studio/habitWizard';
export * from './studio/lifeMap';
