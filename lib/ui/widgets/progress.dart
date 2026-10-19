/// Progress bar, momentum ring, countdown ring, growth-stage bar.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../../engine/momentum.dart' show isMomentumResting;
import '../theme/theme_ext.dart';

/// 8px bar, radius 999, animated fill. Announced as a percentage.
class WProgressBar extends StatelessWidget {
  const WProgressBar({super.key, required this.value, this.semanticLabel, this.height = 8, this.color});

  /// 0..1
  final double value;
  final String? semanticLabel;
  final double height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final v = value.clamp(0.0, 1.0);
    return Semantics(
      label: semanticLabel,
      value: '${(v * 100).round()}%',
      child: ClipRRect(
        borderRadius: WRadius.pillR,
        child: SizedBox(
          height: height,
          child: Stack(
            children: [
              Positioned.fill(child: ColoredBox(color: c.surfaceSubtle)),
              TweenAnimationBuilder<double>(
                tween: Tween(end: v),
                duration: WMotion.of(context, WMotion.slow),
                curve: WMotion.curve,
                builder: (context, x, _) => FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: x,
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: color ?? c.primaryFill, borderRadius: WRadius.pillR),
                    child: const SizedBox.expand(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.value, required this.track, required this.fill, required this.stroke});

  final double value;
  final Color track;
  final Color fill;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final r = (math.min(size.width, size.height) - stroke) / 2;
    final center = size.center(Offset.zero);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true;
    canvas.drawCircle(center, r, p..color = track);
    if (value > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        -math.pi / 2,
        2 * math.pi * value.clamp(0, 1),
        false,
        p..color = fill,
      );
    }
  }

  @override
  bool shouldRepaint(_RingPainter o) => o.value != value || o.fill != fill || o.track != track;
}

/// UIKIT #8: r=18 stroke 4 ring with the number in the centre (0–100).
class MomentumRing extends StatelessWidget {
  const MomentumRing({super.key, required this.value, this.size = 44, this.semanticLabel});

  /// 0–100.
  final double value;
  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    // Spec §5.4: never shown as 0 — at rest it reads «راحة».
    final resting = isMomentumResting(value);
    final restText = context.l.momentumResting;
    return Semantics(
      container: true,
      label: semanticLabel,
      value: resting ? restText : context.l.xOfY(value.round().toString(), '100'),
      excludeSemantics: true,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: value.clamp(0, 100) / 100),
        duration: WMotion.of(context, WMotion.slow),
        curve: WMotion.curve,
        builder: (context, v, _) => SizedBox.square(
          dimension: size,
          child: CustomPaint(
            painter: _RingPainter(value: v, track: c.surfaceSubtle, fill: c.primary, stroke: size * 4 / 44),
            child: Center(
              child: resting
                  ? Text(
                      restText,
                      maxLines: 1,
                      textScaler: TextScaler.noScaling,
                      // ≥ 12 px (Fix pass 3; was 10 px at the 44 px ring).
                      style: context.t.label.copyWith(fontSize: math.max(12.0, size * 12 / 44), height: 1.1, color: c.caption),
                    )
                  : Text(
                      '${(v * 100).round()}',
                      style: context.t.metric.copyWith(fontSize: size * 13 / 44, color: c.deep),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Large countdown ring (Routine Player / Focus). [child] sits in the centre.
class TimerRing extends StatelessWidget {
  const TimerRing({super.key, required this.progress, required this.child, this.size = 240, this.stroke = 10});

  /// Remaining fraction 0..1 (1 = full ring).
  final double progress;
  final Widget child;
  final double size;
  final double stroke;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _RingPainter(value: progress, track: c.surfaceSubtle, fill: c.primaryFill, stroke: stroke),
        child: Center(child: child),
      ),
    );
  }
}

/// UIKIT #9: five growth stages as segments with labels; current stage
/// highlighted (text + weight, not colour alone).
class GrowthStageBar extends StatelessWidget {
  const GrowthStageBar({super.key, required this.stage, this.showLabels = true});

  final GrowthStage stage;
  final bool showLabels;

  static String label(BuildContext context, GrowthStage s) => switch (s) {
    GrowthStage.seed => context.l.stageSeed,
    GrowthStage.sprout => context.l.stageSprout,
    GrowthStage.growing => context.l.stageGrowing,
    GrowthStage.rooted => context.l.stageRooted,
    GrowthStage.automatic => context.l.stageAutomatic,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final done = c.done;
    return Semantics(
      label: '${context.l.growthStage}: ${label(context, stage)}',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              for (final s in GrowthStage.values) ...[
                Expanded(
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(color: s.index <= stage.index ? done.ink : done.bg, borderRadius: WRadius.pillR),
                  ),
                ),
                if (s != GrowthStage.automatic) const SizedBox(width: 4),
              ],
            ],
          ),
          if (showLabels) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                for (final s in GrowthStage.values)
                  Expanded(
                    child: Text(
                      label(context, s),
                      textAlign: TextAlign.center,
                      style: context.t.label.copyWith(
                        color: s == stage ? done.ink : c.caption,
                        fontWeight: s == stage ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
