/// Motion tokens. Every animation duration goes through [WMotion.of] so
/// reduced motion (iOS "Reduce Motion" → `MediaQuery.disableAnimations`)
/// collapses movement to a short fade or nothing.
library;

import 'package:flutter/widgets.dart';

abstract final class WMotion {
  /// Pressed states, check fill.
  static const Duration fast = Duration(milliseconds: 160);

  /// Card/segment transitions, sheet content.
  static const Duration base = Duration(milliseconds: 260);

  /// Page-level transitions, progress bars.
  static const Duration slow = Duration(milliseconds: 420);

  /// Celebration burst lifetime.
  static const Duration celebrate = Duration(milliseconds: 1100);

  /// Default curve — calm ease-out, no bounce.
  static const Curve curve = Curves.easeOutCubic;

  /// Emphasised entrance (celebrations only).
  static const Curve emphasis = Curves.easeOutBack;

  static bool reduced(BuildContext context) => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// [d] normally; [Duration.zero] when reduced motion is on.
  static Duration of(BuildContext context, Duration d) => reduced(context) ? Duration.zero : d;

  /// Fade-only duration used when reduced motion replaces movement.
  static const Duration reducedFade = Duration(milliseconds: 200);
}
