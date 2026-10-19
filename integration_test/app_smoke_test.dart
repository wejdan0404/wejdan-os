// BL-016 smoke test (integration_test). Boots the real widget tree with the
// shipped assets, skips onboarding with the sample profile, and checks that
// Today renders. It uses an in-memory repository on purpose, so running it
// on her iPhone never touches her Hive data (Hive on device = BL-005).
//
// Run (Mac):  flutter test integration_test -d <simulator-udid>
// In the Linux container it ran headless with `-d flutter-tester` (pass,
// docs/QA_LOG.md "Fix pass 1"); iOS simulator not run here (no Xcode).
// `-d web-server` is not supported by `flutter test integration_test` (web
// needs chromedriver + `flutter drive`).
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/widgets.dart' show Scrollable;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wejdan_life_os/data/repository.dart';
import 'package:wejdan_life_os/engine/engine.dart' show NoopNotificationService;
import 'package:wejdan_life_os/l10n/app_localizations_ar.dart';
import 'package:wejdan_life_os/main.dart';
import 'package:wejdan_life_os/state/bootstrap.dart';
import 'package:wejdan_life_os/state/providers.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app boots → skip onboarding (sample) → Today renders', (tester) async {
    final l = AppLocalizationsAr();
    final repo = await bootstrapRepository(
      repo: InMemoryLifeRepository(),
      loadSeedJson: () => rootBundle.loadString('assets/data/actions.json'),
      loadArJson: () => rootBundle.loadString('assets/data/actions_ar.json'),
      now: DateTime.now(),
    );
    final container = ProviderContainer(overrides: [
      repositoryProvider.overrideWithValue(repo),
      notificationServiceProvider.overrideWithValue(NoopNotificationService()),
    ]);
    addTearDown(container.dispose);
    await container.read(lifeControllerProvider.future);
    await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const WejdanApp()));
    await tester.pumpAndSettle();

    Future<void> reveal(Finder f) async {
      await tester.scrollUntilVisible(f, 300, scrollable: find.byType(Scrollable).first);
      await tester.pumpAndSettle();
    }

    // Onboarding welcome → "use the sample" (debug builds and web only).
    await reveal(find.text(l.onbUseSample));
    expect(find.text(l.onbUseSample), findsOneWidget);
    await tester.tap(find.text(l.onbUseSample));
    await tester.pumpAndSettle();

    // Morning Brief → start the day.
    await reveal(find.text(l.startMyDay));
    expect(find.text(l.startMyDay), findsOneWidget);
    await tester.tap(find.text(l.startMyDay));
    await tester.pumpAndSettle();

    // Today.
    expect(find.text(l.dayReady), findsOneWidget);
    expect(container.read(todayPlanProvider).requireValue.items, isNotEmpty);
  });
}
