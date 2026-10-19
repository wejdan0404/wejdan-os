import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_ce_flutter.dart';

import 'data/models/models.dart';
import 'data/repository.dart';
import 'services/notification_service.dart';
import 'state/bootstrap.dart';
import 'state/providers.dart';
import 'ui/app.dart';
import 'ui/demo_flags.dart';
import 'ui/state/ui_providers.dart';

export 'ui/app.dart' show WejdanApp;

/// How long boot waits for local storage before falling back to memory.
const Duration kStorageOpenTimeout = Duration(seconds: 5);

/// Boot: Hive → seed on first run → (web demo flags) → notifications →
/// ProviderScope → [WejdanApp].
///
/// If local storage can't be opened (IndexedDB blocked or throwing, a
/// sandboxed iframe with an opaque origin, a hang), the app never shows a
/// blank screen: it boots on a seeded [InMemoryLifeRepository] and shows a
/// subtle banner «الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة» (D01/D02).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final now = DateTime.now();
  Future<String> seed() => rootBundle.loadString('assets/data/actions.json');
  Future<String> seedAr() => rootBundle.loadString('assets/data/actions_ar.json');

  var persistent = true;
  LifeRepository repo;
  try {
    repo = await () async {
      await Hive.initFlutter();
      return bootstrapRepository(repo: HiveLifeRepository(), loadSeedJson: seed, loadArJson: seedAr, now: now);
    }().timeout(kStorageOpenTimeout);
  } catch (e) {
    debugPrint('Local storage unavailable, using in-memory data: $e');
    persistent = false;
    repo = await bootstrapRepository(repo: InMemoryLifeRepository(), loadSeedJson: seed, loadArJson: seedAr, now: now);
  }
  final flags = DemoFlags.fromUri(Uri.base);
  if (flags.any) await flags.apply(repo, now);

  final notifications = createNotificationService();
  final container = ProviderContainer(
    overrides: [
      repositoryProvider.overrideWithValue(repo),
      notificationServiceProvider.overrideWithValue(notifications),
      storagePersistentProvider.overrideWithValue(persistent),
      if (flags.textScale != null) textScaleOverrideProvider.overrideWithValue(flags.textScale),
    ],
  );
  await container.read(lifeControllerProvider.future);
  await notifications.init(onAction: (a) => handleNudgeAction(container, a));
  runApp(UncontrolledProviderScope(container: container, child: const WejdanApp()));
}

/// Maps a notification action to the controller (CORE_API §6).
Future<void> handleNudgeAction(ProviderContainer c, NudgeAction a) async {
  final itemId = a.payload?.itemId;
  if (itemId == null) return;
  await c.read(lifeControllerProvider.future);
  final ctrl = c.read(lifeControllerProvider.notifier);
  final item = c.read(planItemProvider(itemId));
  switch (a.type) {
    case NudgeActionType.done:
      if (item != null) await ctrl.completeItem(item, CompletionLevel.minimum);
      await ctrl.recordNudgeResponse(itemId, NudgeResponse.done);
    case NudgeActionType.snooze:
      final nudge = c.read(reminderPlanProvider)?.nudges.where((n) => n.itemId == itemId).firstOrNull;
      final s = c.read(settingsProvider);
      if (nudge != null) {
        await c.read(notificationServiceProvider).snooze(nudge, language: s.language, timeZoneName: s.timeZoneName);
      }
      await ctrl.recordNudgeResponse(itemId, NudgeResponse.snoozed);
    case NudgeActionType.skip:
      if (item != null) await ctrl.skipItem(item);
      await ctrl.recordNudgeResponse(itemId, NudgeResponse.skipped);
    case NudgeActionType.open:
      await ctrl.recordNudgeResponse(itemId, NudgeResponse.opened);
  }
}
