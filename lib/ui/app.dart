/// Root widget: loading gate → MaterialApp.router with the Calm Sky theme,
/// Arabic-first locale (RTL), day-change handling on resume.
library;

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/models.dart';
import '../l10n/app_localizations.dart';
import '../state/providers.dart';
import 'router.dart';
import 'theme/app_theme.dart';
import 'theme/tokens.dart';
import 'widgets/spark.dart';

/// Optional text-scale override (web demo flag `?scale=1.5`, tests).
final textScaleOverrideProvider = Provider<double?>((ref) => null);

/// False when boot fell back to in-memory storage (D01): data is temporary.
final storagePersistentProvider = Provider<bool>((ref) => true);

class WejdanApp extends ConsumerWidget {
  const WejdanApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(lifeControllerProvider);
    // Not a MaterialApp: a second (non-router) app would reset the web URL
    // and break deep links. main() awaits the snapshot before runApp anyway.
    if (!snap.hasValue) return const _Splash();
    return const _RoutedApp();
  }
}

class _RoutedApp extends ConsumerStatefulWidget {
  const _RoutedApp();

  @override
  ConsumerState<_RoutedApp> createState() => _RoutedAppState();
}

class _RoutedAppState extends ConsumerState<_RoutedApp> {
  late final AppLifecycleListener _life;

  @override
  void initState() {
    super.initState();
    _life = AppLifecycleListener(onResume: _onResume);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(settingsProvider).onboardingDone) {
        ref.read(lifeControllerProvider.notifier).scheduleTodayNudges();
      }
    });
  }

  /// Day may have flipped (04:30): recompute "today" and re-plan nudges.
  void _onResume() {
    ref.invalidate(todayProvider);
    if (ref.read(settingsProvider).onboardingDone) {
      ref.read(lifeControllerProvider.notifier).scheduleTodayNudges();
    }
  }

  @override
  void dispose() {
    _life.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final router = ref.watch(routerProvider);
    final scale = ref.watch(textScaleOverrideProvider);
    final persistent = ref.watch(storagePersistentProvider);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      onGenerateTitle: (c) => AppLocalizations.of(c).appTitle,
      locale: Locale(settings.language.name),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: switch (settings.theme) {
        ThemePref.system => ThemeMode.system,
        ThemePref.light => ThemeMode.light,
        ThemePref.dark => ThemeMode.dark,
      },
      theme: WTheme.build(
        brightness: Brightness.light,
        language: settings.language,
        palette: settings.themePalette,
        customAccentArgb: settings.customAccentArgb,
        cardStyle: settings.cardStyle,
      ),
      darkTheme: WTheme.build(
        brightness: Brightness.dark,
        language: settings.language,
        palette: settings.themePalette,
        customAccentArgb: settings.customAccentArgb,
        cardStyle: settings.cardStyle,
      ),
      routerConfig: router,
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        final app = MediaQuery(
          // Dynamic Type honoured up to 200 % (spec §1); demo override wins.
          data: mq.copyWith(textScaler: scale != null ? TextScaler.linear(scale) : mq.textScaler.clamp(maxScaleFactor: 2.0)),
          child: child ?? const SizedBox.shrink(),
        );
        if (persistent) return app;
        // Non-blocking notice above the app (never over it): storage is
        // unavailable, the session runs in memory.
        return Column(
          children: [
            _StorageBanner(topInset: mq.padding.top),
            // Own semantics container, so a route's BlockSemantics can't hide
            // the banner from VoiceOver/TalkBack.
            Expanded(
              child: Semantics(
                container: true,
                child: MediaQuery.removePadding(context: context, removeTop: true, child: app),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _StorageBanner extends StatelessWidget {
  const _StorageBanner({required this.topInset});
  final double topInset;

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<WColors>() ?? WColors.light;
    final t = c.tint(TintName.sand);
    return Semantics(
      liveRegion: true,
      container: true,
      child: Material(
        color: t.bg,
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, topInset + 6, 16, 6),
          child: Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 16, color: t.ink),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  AppLocalizations.of(context).storageUnavailable,
                  style: TextStyle(fontSize: 12, height: 18 / 12, fontWeight: FontWeight.w500, color: t.ink),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => const ColoredBox(
    color: Color(0xFFF4F7FC),
    child: Center(child: SparkIcon(size: 40, color: Color(0xFFE0A93B))),
  );
}
