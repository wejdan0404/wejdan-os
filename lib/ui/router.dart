/// App routes (go_router). Tabs live in a StatefulShellRoute; overlays
/// (Brief, Studio, Player, Focus, Recovery, Evening) are full-screen root
/// routes; sheets (Why, Quick Add) are deep-linkable [SheetPage]s.
///
/// | Path | Screen |
/// |---|---|
/// | /onboarding | 6-step onboarding |
/// | /brief | Morning Brief |
/// | /today, /path, /habits, /me | four owner-authorized primary tabs |
/// | /habits/joy | joy and rewards sub-screen within Care |
/// | /path/ielts, /path/driving | IELTS / Driving hubs |
/// | /habits/joy/reward?id= | reward editor + milestone rewards + celebrations |
/// | /me/insights, /me/money, /me/home, /me/evidence, /me/settings, /me/help | Me sub-screens |
/// | /me/cycle, /me/pcos | sensitive modules (Settings toggles, app lock) |
/// | /review?step= | Weekly Review (8 steps) |
/// | /ielts/review | vocab review session |
/// | /help | Help & Safety (full screen, from Red mode) |
/// | /today/why/:itemId | Why sheet (habit detail) |
/// | /today/add | Quick Add sheet |
/// | /studio?habit=&action=&step= | Habit Studio |
/// | /routine/:id | Routine Player |
/// | /focus/:itemId (`free` = unlinked) | Focus Mode |
/// | /recovery/:habitId | Recovery flow |
/// | /evening | Evening Shutdown |
/// | /joy and /joy/reward | compatibility redirects into the Care branch |
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/models/models.dart';
import '../state/providers.dart';
import 'screens/evening/evening_shutdown_screen.dart';
import 'screens/focus/focus_screen.dart';
import 'screens/habit/why_sheet.dart';
import 'screens/morning_brief/morning_brief_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/driving/driving_screen.dart';
import 'screens/evidence/evidence_screen.dart';
import 'screens/habits/habits_hub_screen.dart';
import 'screens/help/help_safety_screen.dart';
import 'screens/home_admin/home_admin_screen.dart';
import 'screens/ielts/ielts_screen.dart';
import 'screens/insights/insights_screen.dart';
import 'screens/joy/joy_screen.dart';
import 'screens/me/me_screen.dart';
import 'screens/money/money_screen.dart';
import 'screens/path/path_screen.dart';
import 'screens/review/weekly_review_screen.dart';
import 'screens/rewards/rewards_screen.dart';
import 'screens/sensitive/cycle_screen.dart';
import 'screens/sensitive/pcos_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/recovery/recovery_screen.dart';
import 'screens/routine/routine_player_screen.dart';
import 'screens/studio/habit_studio_screen.dart';
import 'screens/today/today_screen.dart';
import 'screens/today/today_sections.dart';
import 'widgets/widgets.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

/// Where the app opens: onboarding → Morning Brief (once/day) → Today.
String initialLocationFor(Settings s, {required bool energyAnswered}) {
  if (!s.onboardingDone) return '/onboarding';
  if (!energyAnswered) return '/brief';
  return '/today';
}

final routerProvider = Provider<GoRouter>((ref) {
  final onboarded = ValueNotifier<bool>(
    ref.read(settingsProvider).onboardingDone,
  );
  ref.listen(
    settingsProvider.select((s) => s.onboardingDone),
    (_, v) => onboarded.value = v,
  );
  ref.onDispose(onboarded.dispose);
  final initial = initialLocationFor(
    ref.read(settingsProvider),
    energyAnswered: ref.read(energyAnsweredTodayProvider),
  );
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: initial,
    refreshListenable: onboarded,
    redirect: (context, state) {
      final done = onboarded.value;
      final atOnboarding = state.matchedLocation == '/onboarding';
      if (!done && !atOnboarding) return '/onboarding';
      return null;
    },
    routes: [
      GoRoute(path: '/', redirect: (_, _) => '/today'),
      GoRoute(
        path: '/onboarding',
        builder: (_, s) => OnboardingScreen(
          initialStep: int.tryParse(s.uri.queryParameters['step'] ?? '') ?? 0,
        ),
      ),
      GoRoute(path: '/brief', builder: (_, _) => const MorningBriefScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/today',
                builder: (_, _) => const TodayScreen(),
                routes: [
                  GoRoute(
                    path: 'why/:itemId',
                    parentNavigatorKey: rootNavigatorKey,
                    pageBuilder: (_, s) => SheetPage(
                      key: s.pageKey,
                      child: WhySheet(itemId: s.pathParameters['itemId']!),
                    ),
                  ),
                  GoRoute(
                    path: 'add',
                    parentNavigatorKey: rootNavigatorKey,
                    pageBuilder: (_, s) =>
                        SheetPage(key: s.pageKey, child: const QuickAddSheet()),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/path',
                builder: (_, _) => const PathScreen(),
                routes: [
                  GoRoute(
                    path: 'ielts',
                    builder: (_, _) => const IeltsScreen(),
                  ),
                  GoRoute(
                    path: 'driving',
                    builder: (_, _) => const DrivingScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/habits',
                builder: (_, _) => const HabitsHubScreen(),
                routes: [
                  GoRoute(
                    path: 'joy',
                    builder: (_, _) => const JoyScreen(),
                    routes: [
                      GoRoute(
                        path: 'reward',
                        builder: (_, s) => RewardsScreen(
                          rewardId: s.uri.queryParameters['id'],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/me',
                builder: (_, _) => const MeScreen(),
                routes: [
                  GoRoute(
                    path: 'insights',
                    builder: (_, _) => const InsightsScreen(),
                  ),
                  GoRoute(
                    path: 'money',
                    builder: (_, _) => const MoneyScreen(),
                  ),
                  GoRoute(
                    path: 'home',
                    builder: (_, _) => const HomeAdminScreen(),
                  ),
                  GoRoute(
                    path: 'evidence',
                    builder: (_, _) => const EvidenceScreen(),
                  ),
                  GoRoute(
                    path: 'settings',
                    builder: (_, _) => const SettingsScreen(),
                  ),
                  GoRoute(
                    path: 'help',
                    builder: (_, _) => const HelpSafetyScreen(),
                  ),
                  GoRoute(
                    path: 'cycle',
                    builder: (_, _) => const CycleScreen(),
                  ),
                  GoRoute(path: 'pcos', builder: (_, _) => const PcosScreen()),
                ],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/studio',
        builder: (_, s) => HabitStudioScreen(
          habitId: s.uri.queryParameters['habit'],
          actionId: s.uri.queryParameters['action'],
          initialStep: int.tryParse(s.uri.queryParameters['step'] ?? ''),
        ),
      ),
      GoRoute(
        path: '/routine/:id',
        builder: (_, s) =>
            RoutinePlayerScreen(routineId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/focus/:itemId',
        builder: (_, s) => FocusScreen(itemId: s.pathParameters['itemId']!),
      ),
      GoRoute(
        path: '/recovery/:habitId',
        builder: (_, s) =>
            RecoveryScreen(habitId: s.pathParameters['habitId']!),
      ),
      GoRoute(
        path: '/evening',
        builder: (_, _) => const EveningShutdownScreen(),
      ),
      GoRoute(
        path: '/review',
        builder: (_, s) => WeeklyReviewScreen(
          initialStep: int.tryParse(s.uri.queryParameters['step'] ?? '') ?? 0,
        ),
      ),
      GoRoute(
        path: '/ielts/review',
        builder: (_, _) => const VocabReviewScreen(),
      ),
      GoRoute(path: '/joy', redirect: (_, _) => '/habits/joy'),
      GoRoute(
        path: '/joy/reward',
        redirect: (_, state) =>
            '/habits/joy/reward?id=${state.uri.queryParameters['id'] ?? ''}',
      ),
      GoRoute(path: '/help', builder: (_, _) => const HelpSafetyScreen()),
    ],
  );
});

/// Scaffold with the four-tab bar around the active branch.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: shell,
    bottomNavigationBar: WTabBar(
      index: shell.currentIndex,
      onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
    ),
  );
}
