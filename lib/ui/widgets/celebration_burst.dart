/// Micro-celebration (spec §6.7): haptic + small particle burst from the
/// check, 3 variants rotated. Reduced motion → a single spark fades in and
/// out in place (no movement).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/theme_ext.dart';
import 'spark.dart';

enum BurstVariant {
  /// Sparks radiate outward in a ring.
  radiate,

  /// Small confetti dots + sparks rise and drift.
  rise,

  /// Sparks orbit once and settle outward (bigger moments: comeback).
  orbit,
}

class CelebrationBurst {
  CelebrationBurst._();

  static int _counter = 0;

  /// Next variant in rotation.
  static BurstVariant nextVariant() => BurstVariant.values[_counter++ % BurstVariant.values.length];

  /// Plays a burst centred on [origin] (global coordinates) in the
  /// nearest overlay. Safe to call repeatedly.
  static void show(BuildContext context, Offset origin, {BurstVariant? variant, bool strong = false}) {
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
    strong ? HapticFeedback.mediumImpact() : HapticFeedback.lightImpact();
    final reduced = WMotion.reduced(context);
    final c = context.c;
    final box = overlay.context.findRenderObject() as RenderBox?;
    final local = box == null ? origin : box.globalToLocal(origin);
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _Burst(
        origin: local,
        variant: variant ?? nextVariant(),
        reduced: reduced,
        colors: [c.spark, c.sky300, c.primary, c.tint(TintName.sage).ink, c.tint(TintName.rose).ink],
        glow: c.isDark ? c.glow : null,
        onDone: () => entry.remove(),
      ),
    );
    overlay.insert(entry);
  }
}

class _Burst extends StatefulWidget {
  const _Burst({
    required this.origin,
    required this.variant,
    required this.reduced,
    required this.colors,
    required this.onDone,
    this.glow,
  });

  final Offset origin;
  final BurstVariant variant;
  final bool reduced;
  final List<Color> colors;
  final Color? glow;
  final VoidCallback onDone;

  @override
  State<_Burst> createState() => _BurstState();
}

class _BurstState extends State<_Burst> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.reduced ? const Duration(milliseconds: 600) : WMotion.celebrate,
  )..forward().whenComplete(widget.onDone);
  final _rand = math.Random();
  late final List<_Particle> _parts = List.generate(widget.reduced ? 0 : 14, (i) {
    final a = (i / 14) * 2 * math.pi + _rand.nextDouble() * .3;
    return _Particle(
      angle: a,
      dist: 38 + _rand.nextDouble() * 34,
      size: 6 + _rand.nextDouble() * 8,
      color: widget.colors[i % widget.colors.length],
      spark: i.isEven,
      drift: (_rand.nextDouble() - .5) * 30,
    );
  });

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value;
          if (widget.reduced) {
            final o = t < .5 ? t * 2 : (1 - t) * 2;
            return Stack(
              children: [
                Positioned(
                  left: widget.origin.dx - 14,
                  top: widget.origin.dy - 44,
                  child: Opacity(
                    opacity: o.clamp(0, 1),
                    child: SparkIcon(size: 28, color: widget.colors.first),
                  ),
                ),
              ],
            );
          }
          return CustomPaint(
            size: Size.infinite,
            painter: _BurstPainter(t: t, origin: widget.origin, parts: _parts, variant: widget.variant, glow: widget.glow),
          );
        },
      ),
    );
  }
}

class _Particle {
  _Particle({
    required this.angle,
    required this.dist,
    required this.size,
    required this.color,
    required this.spark,
    required this.drift,
  });
  final double angle, dist, size, drift;
  final Color color;
  final bool spark;
}

class _BurstPainter extends CustomPainter {
  _BurstPainter({required this.t, required this.origin, required this.parts, required this.variant, this.glow});
  final double t;
  final Offset origin;
  final List<_Particle> parts;
  final BurstVariant variant;
  final Color? glow;

  @override
  void paint(Canvas canvas, Size size) {
    final e = Curves.easeOutCubic.transform(t);
    final fade = t < .6 ? 1.0 : (1 - (t - .6) / .4);
    if (glow != null) {
      canvas.drawCircle(
        origin,
        30 + 20 * e,
        Paint()
          ..color = glow!.withValues(alpha: glow!.a * (1 - t))
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16),
      );
    }
    // soft ring
    canvas.drawCircle(
      origin,
      22 + 26 * e,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2 * (1 - e)
        ..color = parts.first.color.withValues(alpha: .5 * (1 - e)),
    );
    for (final p in parts) {
      late Offset pos;
      switch (variant) {
        case BurstVariant.radiate:
          pos = origin + Offset(math.cos(p.angle), math.sin(p.angle)) * (p.dist * e);
        case BurstVariant.rise:
          pos = origin + Offset(math.cos(p.angle) * p.dist * .6 * e + p.drift * e, -p.dist * 1.2 * e + 30 * e * e);
        case BurstVariant.orbit:
          final a = p.angle + e * math.pi * .9;
          pos = origin + Offset(math.cos(a), math.sin(a)) * (p.dist * (.4 + .8 * e));
      }
      final s = p.size * (1 - .4 * e);
      final paint = Paint()..color = p.color.withValues(alpha: fade.clamp(0, 1));
      if (p.spark) {
        canvas.save();
        canvas.translate(pos.dx - s / 2, pos.dy - s / 2);
        canvas.drawPath(SparkPainter.pathFor(Size.square(s)), paint);
        canvas.restore();
      } else {
        canvas.drawCircle(pos, s / 4, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_BurstPainter o) => o.t != t;
}
