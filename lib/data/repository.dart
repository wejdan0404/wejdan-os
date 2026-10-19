/// Local-first persistence (spec §1, §8).
///
/// [LifeRepository] is an abstract JSON document store with typed
/// [EntityCollection]s on top. Implementations only provide string
/// primitives:
///
/// * [HiveLifeRepository] — `hive_ce` boxes of JSON strings (iOS files,
///   IndexedDB on web). Call `Hive.initFlutter()` before [open].
/// * [InMemoryLifeRepository] — for tests and ephemeral previews.
library;

import 'dart:convert';

import 'package:hive_ce/hive_ce.dart';

import '../core/date_utils.dart';
import 'models/models.dart';
import 'seed/seed_library.dart';
import 'seed/starter_profile.dart';

/// Box names (one per entity type) — also the keys of the export JSON.
abstract final class Boxes {
  static const actions = 'actions';
  static const engineRules = 'engineRules';
  static const domains = 'domains';
  static const seasons = 'seasons';
  static const habits = 'habits';
  static const routines = 'routines';
  static const weeklyTasks = 'weeklyTasks';
  static const projects = 'projects';
  static const goals = 'goals';
  static const logs = 'logs';
  static const dayPlans = 'dayPlans';
  static const energyChecks = 'energyChecks';
  static const strengthChecks = 'strengthChecks';
  static const joyItems = 'joyItems';
  static const sparkTxns = 'sparkTxns';
  static const experiments = 'experiments';
  static const vocabCards = 'vocabCards';
  static const mockTests = 'mockTests';
  static const drivingSessions = 'drivingSessions';
  static const moneyEnvelopes = 'moneyEnvelopes';
  static const bills = 'bills';
  static const bnplItems = 'bnplItems';
  static const wishItems = 'wishItems';
  static const adminDocs = 'adminDocs';
  static const fixedEvents = 'fixedEvents';
  static const nudgeRecords = 'nudgeRecords';
  static const errands = 'errands';
  static const cycleEntries = 'cycleEntries';
  static const weeklyReviews = 'weeklyReviews';
  static const meta = 'meta';

  static const all = [
    actions, engineRules, domains, seasons, habits, routines, weeklyTasks, projects, goals, logs, dayPlans,
    energyChecks, strengthChecks, joyItems, sparkTxns, experiments, vocabCards, mockTests, drivingSessions,
    moneyEnvelopes, bills, bnplItems, wishItems, adminDocs, fixedEvents, nudgeRecords, errands, cycleEntries,
    weeklyReviews, meta,
  ];

  /// Boxes that hold the read-only seed library (not exported/imported).
  static const seedOnly = [actions, engineRules];
}

const _kSettings = 'settings';
const _kSeeded = 'seeded';
const _kOpenedDays = 'openedDays';
const _kFirstRun = 'firstRunDate';
const _kModuleState = 'moduleState';
const _kLibraryVersion = 'libraryVersion';

/// Current export format version.
const int kExportSchemaVersion = 1;

/// Typed view over one box.
class EntityCollection<T> {
  EntityCollection(this._repo, this.box, this._from, this._to, this._id);

  final LifeRepository _repo;
  final String box;
  final T Function(Json) _from;
  final Json Function(T) _to;
  final String Function(T) _id;

  Future<List<T>> all() async =>
      (await _repo.readAll(box)).map((s) => _from(asJson(jsonDecode(s)))).toList(growable: false);

  Future<T?> get(String id) async {
    final s = await _repo.read(box, id);
    return s == null ? null : _from(asJson(jsonDecode(s)));
  }

  Future<void> put(T item) => _repo.write(box, _id(item), jsonEncode(_to(item)));

  Future<void> putAll(Iterable<T> items) =>
      _repo.writeAll(box, {for (final i in items) _id(i): jsonEncode(_to(i))});

  Future<void> delete(String id) => _repo.remove(box, id);

  Future<void> clear() => _repo.clearBox(box);
}

/// Abstract repository. See library docs.
abstract class LifeRepository {
  // ---- primitives (implemented by backends) ----
  Future<void> open();
  Future<void> close();
  Future<List<String>> readAll(String box);
  Future<String?> read(String box, String id);
  Future<void> write(String box, String id, String json);
  Future<void> writeAll(String box, Map<String, String> entries);
  Future<void> remove(String box, String id);
  Future<void> clearBox(String box);

  // ---- typed collections ----
  late final actions = EntityCollection<Action>(this, Boxes.actions, Action.fromJson, (e) => e.toJson(), (e) => e.actionId);
  late final engineRules =
      EntityCollection<EngineRule>(this, Boxes.engineRules, EngineRule.fromJson, (e) => e.toJson(), (e) => e.ruleId);
  late final domains = EntityCollection<Domain>(this, Boxes.domains, Domain.fromJson, (e) => e.toJson(), (e) => e.id.name);
  late final seasons = EntityCollection<Season>(this, Boxes.seasons, Season.fromJson, (e) => e.toJson(), (e) => e.id);
  late final habits = EntityCollection<Habit>(this, Boxes.habits, Habit.fromJson, (e) => e.toJson(), (e) => e.id);
  late final routines = EntityCollection<Routine>(this, Boxes.routines, Routine.fromJson, (e) => e.toJson(), (e) => e.id);
  late final weeklyTasks =
      EntityCollection<WeeklyTask>(this, Boxes.weeklyTasks, WeeklyTask.fromJson, (e) => e.toJson(), (e) => e.id);
  late final projects = EntityCollection<Project>(this, Boxes.projects, Project.fromJson, (e) => e.toJson(), (e) => e.id);
  late final goals = EntityCollection<Goal>(this, Boxes.goals, Goal.fromJson, (e) => e.toJson(), (e) => e.id);
  late final logs = EntityCollection<LogEntry>(this, Boxes.logs, LogEntry.fromJson, (e) => e.toJson(), (e) => e.id);
  late final dayPlans = EntityCollection<DayPlan>(this, Boxes.dayPlans, DayPlan.fromJson, (e) => e.toJson(), (e) => e.date);
  late final energyChecks =
      EntityCollection<EnergyCheck>(this, Boxes.energyChecks, EnergyCheck.fromJson, (e) => e.toJson(), (e) => e.date);
  late final strengthChecks = EntityCollection<StrengthCheck>(
      this, Boxes.strengthChecks, StrengthCheck.fromJson, (e) => e.toJson(), (e) => e.id);
  late final joyItems = EntityCollection<JoyItem>(this, Boxes.joyItems, JoyItem.fromJson, (e) => e.toJson(), (e) => e.id);
  late final sparkTxns = EntityCollection<SparkTxn>(this, Boxes.sparkTxns, SparkTxn.fromJson, (e) => e.toJson(), (e) => e.id);
  late final experiments =
      EntityCollection<Experiment>(this, Boxes.experiments, Experiment.fromJson, (e) => e.toJson(), (e) => e.id);
  late final vocabCards =
      EntityCollection<VocabCard>(this, Boxes.vocabCards, VocabCard.fromJson, (e) => e.toJson(), (e) => e.id);
  late final mockTests = EntityCollection<MockTest>(this, Boxes.mockTests, MockTest.fromJson, (e) => e.toJson(), (e) => e.id);
  late final drivingSessions = EntityCollection<DrivingSession>(
      this, Boxes.drivingSessions, DrivingSession.fromJson, (e) => e.toJson(), (e) => e.id);
  late final moneyEnvelopes = EntityCollection<MoneyEnvelope>(
      this, Boxes.moneyEnvelopes, MoneyEnvelope.fromJson, (e) => e.toJson(), (e) => e.id);
  late final bills = EntityCollection<Bill>(this, Boxes.bills, Bill.fromJson, (e) => e.toJson(), (e) => e.id);
  late final bnplItems = EntityCollection<BnplItem>(this, Boxes.bnplItems, BnplItem.fromJson, (e) => e.toJson(), (e) => e.id);
  late final wishItems = EntityCollection<WishItem>(this, Boxes.wishItems, WishItem.fromJson, (e) => e.toJson(), (e) => e.id);
  late final adminDocs = EntityCollection<AdminDoc>(this, Boxes.adminDocs, AdminDoc.fromJson, (e) => e.toJson(), (e) => e.id);
  late final fixedEvents =
      EntityCollection<FixedEvent>(this, Boxes.fixedEvents, FixedEvent.fromJson, (e) => e.toJson(), (e) => e.id);
  late final nudgeRecords =
      EntityCollection<NudgeRecord>(this, Boxes.nudgeRecords, NudgeRecord.fromJson, (e) => e.toJson(), (e) => e.id);
  late final errands = EntityCollection<Errand>(this, Boxes.errands, Errand.fromJson, (e) => e.toJson(), (e) => e.id);
  late final cycleEntries =
      EntityCollection<CycleEntry>(this, Boxes.cycleEntries, CycleEntry.fromJson, (e) => e.toJson(), (e) => e.id);
  late final weeklyReviews = EntityCollection<WeeklyReviewRecord>(
      this, Boxes.weeklyReviews, WeeklyReviewRecord.fromJson, (e) => e.toJson(), (e) => e.id);

  // ---- settings & meta ----
  Future<Settings> loadSettings() async {
    final s = await read(Boxes.meta, _kSettings);
    return s == null ? const Settings() : Settings.fromJson(asJson(jsonDecode(s)));
  }

  Future<void> saveSettings(Settings s) => write(Boxes.meta, _kSettings, jsonEncode(s.toJson()));

  Future<ModuleState> loadModuleState() async {
    final s = await read(Boxes.meta, _kModuleState);
    return s == null ? const ModuleState() : ModuleState.fromJson(asJson(jsonDecode(s)));
  }

  Future<void> saveModuleState(ModuleState m) => write(Boxes.meta, _kModuleState, jsonEncode(m.toJson()));

  /// Rewrites the read-only Action Library (e.g. after an app update added
  /// Arabic fields). User data is untouched.
  Future<void> refreshLibrary(SeedLibrary lib) async {
    await actions.putAll(lib.actions);
    await engineRules.putAll(lib.rules);
    await write(Boxes.meta, _kLibraryVersion, SeedLibrary.version.toString());
  }

  /// True when the stored library predates [SeedLibrary.version].
  Future<bool> libraryOutdated() async => (await read(Boxes.meta, _kLibraryVersion)) != SeedLibrary.version.toString();

  Future<bool> isSeeded() async => (await read(Boxes.meta, _kSeeded)) == 'true';

  Future<String?> firstRunDate() => read(Boxes.meta, _kFirstRun);

  /// Day keys on which the app was opened (last 60 kept).
  Future<Set<String>> openedDays() async {
    final s = await read(Boxes.meta, _kOpenedDays);
    if (s == null) return {};
    return (jsonDecode(s) as List).whereType<String>().toSet();
  }

  Future<void> markOpened(DateTime day) async {
    final days = (await openedDays())..add(dayKey(day));
    final sorted = days.toList()..sort();
    final kept = sorted.length > 60 ? sorted.sublist(sorted.length - 60) : sorted;
    await write(Boxes.meta, _kOpenedDays, jsonEncode(kept));
  }

  /// Writes the Action Library + starter profile. Idempotent: does nothing
  /// if already seeded unless [force].
  Future<void> seed(SeedBundle bundle, {bool force = false}) async {
    if (!force && await isSeeded()) return;
    await actions.putAll(bundle.library.actions);
    await engineRules.putAll(bundle.library.rules);
    final p = bundle.profile;
    await domains.putAll(p.domains);
    await seasons.putAll([p.season]);
    await habits.putAll(p.habits);
    await routines.putAll(p.routines);
    await weeklyTasks.putAll(p.weeklyTasks);
    await goals.putAll(p.goals);
    await joyItems.putAll(p.joyItems);
    await saveSettings(p.settings);
    await write(Boxes.meta, _kFirstRun, p.season.startDate);
    await write(Boxes.meta, _kLibraryVersion, SeedLibrary.version.toString());
    await write(Boxes.meta, _kSeeded, 'true');
  }

  /// Everything she owns as one JSON map (Action Library excluded — it ships
  /// with the app). Shape: `{schemaVersion, exportedAt, boxes: {box: [..]}, meta: {..}}`.
  Future<Json> exportAll({DateTime? now}) async {
    final boxes = <String, dynamic>{};
    for (final b in Boxes.all) {
      if (Boxes.seedOnly.contains(b) || b == Boxes.meta) continue;
      boxes[b] = (await readAll(b)).map(jsonDecode).toList();
    }
    return {
      'schemaVersion': kExportSchemaVersion,
      'exportedAt': (now ?? DateTime.now()).toIso8601String(),
      'boxes': boxes,
      'meta': {
        'settings': (await loadSettings()).toJson(),
        'openedDays': (await openedDays()).toList()..sort(),
        'firstRunDate': await firstRunDate(),
        'moduleState': (await loadModuleState()).toJson(),
      },
    };
  }

  /// Replaces user data with an export produced by [exportAll].
  /// Throws [FormatException] on an unknown schema.
  Future<void> importAll(Json data) async {
    if (jInt(data, 'schemaVersion') != kExportSchemaVersion) {
      throw const FormatException('Unsupported export schemaVersion');
    }
    final boxes = jMap(data, 'boxes');
    const idKeys = {Boxes.domains: 'id', Boxes.dayPlans: 'date', Boxes.energyChecks: 'date'};
    for (final b in Boxes.all) {
      if (Boxes.seedOnly.contains(b) || b == Boxes.meta) continue;
      await clearBox(b);
      final list = boxes[b];
      if (list is! List) continue;
      final entries = <String, String>{};
      for (final raw in list) {
        final j = asJson(raw);
        final id = jStr(j, idKeys[b] ?? 'id');
        if (id.isEmpty) continue;
        entries[id] = jsonEncode(j);
      }
      await writeAll(b, entries);
    }
    final meta = jMap(data, 'meta');
    await saveSettings(Settings.fromJson(jMap(meta, 'settings')));
    await write(Boxes.meta, _kOpenedDays, jsonEncode(jStrList(meta, 'openedDays')));
    await saveModuleState(ModuleState.fromJson(jMap(meta, 'moduleState')));
    final first = jStrN(meta, 'firstRunDate');
    if (first != null) await write(Boxes.meta, _kFirstRun, first);
    await write(Boxes.meta, _kSeeded, 'true');
  }

  /// "Delete all data" (Settings). The next boot re-seeds a fresh profile.
  Future<void> deleteAll() async {
    for (final b in Boxes.all) {
      await clearBox(b);
    }
  }
}

/// Hive (hive_ce) backend storing JSON strings. Works on iOS and web.
class HiveLifeRepository extends LifeRepository {
  HiveLifeRepository({this.prefix = 'wlo_'});

  /// Box name prefix (lets tests/previews use isolated boxes).
  final String prefix;
  final Map<String, Box<String>> _boxes = {};

  Box<String> _box(String name) {
    final b = _boxes[name];
    if (b == null) throw StateError('HiveLifeRepository not opened');
    return b;
  }

  @override
  Future<void> open() async {
    for (final name in Boxes.all) {
      _boxes[name] = await Hive.openBox<String>('$prefix$name');
    }
  }

  @override
  Future<void> close() async {
    for (final b in _boxes.values) {
      await b.close();
    }
    _boxes.clear();
  }

  @override
  Future<List<String>> readAll(String box) async => _box(box).values.toList(growable: false);

  @override
  Future<String?> read(String box, String id) async => _box(box).get(id);

  @override
  Future<void> write(String box, String id, String json) => _box(box).put(id, json);

  @override
  Future<void> writeAll(String box, Map<String, String> entries) => _box(box).putAll(entries);

  @override
  Future<void> remove(String box, String id) => _box(box).delete(id);

  @override
  Future<void> clearBox(String box) async => _box(box).clear();
}

/// In-memory backend for tests and web previews without storage.
class InMemoryLifeRepository extends LifeRepository {
  final Map<String, Map<String, String>> _data = {};

  Map<String, String> _b(String box) => _data.putIfAbsent(box, () => {});

  @override
  Future<void> open() async {}

  @override
  Future<void> close() async {}

  @override
  Future<List<String>> readAll(String box) async => _b(box).values.toList(growable: false);

  @override
  Future<String?> read(String box, String id) async => _b(box)[id];

  @override
  Future<void> write(String box, String id, String json) async => _b(box)[id] = json;

  @override
  Future<void> writeAll(String box, Map<String, String> entries) async => _b(box).addAll(entries);

  @override
  Future<void> remove(String box, String id) async => _b(box).remove(id);

  @override
  Future<void> clearBox(String box) async => _b(box).clear();
}
