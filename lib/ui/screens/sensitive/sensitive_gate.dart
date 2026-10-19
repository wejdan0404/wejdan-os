/// App lock for sensitive modules (Cycle, PCOS): when Settings → app lock is
/// on, these screens stay locked until Face ID (local_auth) succeeds for the
/// session. Web preview / no biometrics: the no-op lock always unlocks.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../services/platform_services.dart';
import '../../../state/providers.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

/// Injectable lock (tests override).
final appLockServiceProvider = Provider<AppLockService>((ref) => createAppLockService());

class _Unlocked extends Notifier<bool> {
  @override
  bool build() => false;
  void set(bool v) => state = v;
}

/// True once she unlocked sensitive modules in this session.
final sensitiveUnlockedProvider = NotifierProvider<_Unlocked, bool>(_Unlocked.new);

Future<bool> unlockSensitive(BuildContext context, WidgetRef ref) async {
  if (!ref.read(settingsProvider).appLock || ref.read(sensitiveUnlockedProvider)) return true;
  final ok = await ref.read(appLockServiceProvider).unlock(reason: context.l.unlockReason);
  if (ok) ref.read(sensitiveUnlockedProvider.notifier).set(true);
  return ok;
}

Future<void> openSensitive(BuildContext context, WidgetRef ref, String route) async {
  if (await unlockSensitive(context, ref) && context.mounted) context.push(route);
}

/// Wraps a sensitive screen body: locked card until unlocked.
class SensitiveGate extends ConsumerWidget {
  const SensitiveGate({super.key, required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(settingsProvider);
    final unlocked = !s.appLock || ref.watch(sensitiveUnlockedProvider);
    if (unlocked) return child;
    final l = context.l;
    return HubPage(
      title: title,
      children: [
        gap24,
        EmptyRestState(
          title: l.lockedTitle,
          message: l.lockedBody,
          action: PrimaryButton(label: l.unlock, icon: Icons.lock_open_rounded, onPressed: () => unlockSensitive(context, ref)),
        ),
      ],
    );
  }
}
