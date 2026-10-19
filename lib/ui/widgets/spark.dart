/// The reward motif: a 4-point spark ✦ drawn with the exact UIKIT path
/// (never an emoji), plus the animated Sparks balance badge.
library;

import 'package:flutter/material.dart';

import '../theme/theme_ext.dart';

/// Paints the UIKIT spark path scaled into [size].
class SparkPainter extends CustomPainter {
  const SparkPainter({required this.color, this.stroke = false});

  final Color color;

  /// Outline instead of fill (used by the Joy tab icon).
  final bool stroke;

  static Path pathFor(Size size) {
    final sx = size.width / 24, sy = size.height / 24;
    Offset p(double x, double y) => Offset(x * sx, y * sy);
    final a = p(12, 2);
    return Path()
      ..moveTo(a.dx, a.dy)
      ..cubicTo(p(12.8, 8.5).dx, p(12.8, 8.5).dy, p(15.5, 11.2).dx, p(15.5, 11.2).dy, p(22, 12).dx, p(22, 12).dy)
      ..cubicTo(p(15.5, 12.8).dx, p(15.5, 12.8).dy, p(12.8, 15.5).dx, p(12.8, 15.5).dy, p(12, 22).dx, p(12, 22).dy)
      ..cubicTo(p(11.2, 15.5).dx, p(11.2, 15.5).dy, p(8.5, 12.8).dx, p(8.5, 12.8).dy, p(2, 12).dx, p(2, 12).dy)
      ..cubicTo(p(8.5, 11.2).dx, p(8.5, 11.2).dy, p(11.2, 8.5).dx, p(11.2, 8.5).dy, a.dx, a.dy)
      ..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..isAntiAlias = true
      ..style = stroke ? PaintingStyle.stroke : PaintingStyle.fill
      ..strokeWidth = stroke ? size.width / 14 : 0
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(pathFor(size), paint);
  }

  @override
  bool shouldRepaint(SparkPainter old) => old.color != color || old.stroke != stroke;
}

/// A spark glyph. Decorative by default (excluded from semantics).
class SparkIcon extends StatelessWidget {
  const SparkIcon({super.key, this.size = 16, this.color, this.stroke = false});

  final double size;
  final Color? color;
  final bool stroke;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: CustomPaint(
      size: Size.square(size),
      painter: SparkPainter(color: color ?? context.c.spark, stroke: stroke),
    ),
  );
}

/// "✦ 146" pill; the number counts up/down when [count] changes and a
/// short "+n" floats up on gains (static when reduced motion is on).
class SparkBadge extends StatefulWidget {
  const SparkBadge({super.key, required this.count, this.onTap, this.compact = false});

  final int count;
  final VoidCallback? onTap;

  /// Inline variant without the pill border.
  final bool compact;

  @override
  State<SparkBadge> createState() => _SparkBadgeState();
}

class _SparkBadgeState extends State<SparkBadge> with SingleTickerProviderStateMixin {
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  int _delta = 0;

  @override
  void didUpdateWidget(SparkBadge old) {
    super.didUpdateWidget(old);
    final d = widget.count - old.count;
    if (d > 0 && !WMotion.reduced(context)) {
      _delta = d;
      _float.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _float.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final number = TweenAnimationBuilder<double>(
      tween: Tween(end: widget.count.toDouble()),
      duration: WMotion.of(context, WMotion.slow),
      curve: WMotion.curve,
      builder: (context, v, _) => Text(v.round().toString(), style: context.t.metric.copyWith(fontSize: 15, color: c.text)),
    );
    final content = Row(mainAxisSize: MainAxisSize.min, children: [const SparkIcon(size: 16), const SizedBox(width: 6), number]);
    final pill = widget.compact
        ? content
        : Container(
            height: WSpace.tap,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: WRadius.pillR,
              border: Border.all(color: c.border),
            ),
            child: Center(widthFactor: 1, child: content),
          );
    return Semantics(
      container: true,
      button: widget.onTap != null,
      label: '${context.l.sparksLabel}: ${widget.count}',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            pill,
            AnimatedBuilder(
              animation: _float,
              builder: (context, _) {
                if (!_float.isAnimating) return const SizedBox.shrink();
                final v = Curves.easeOut.transform(_float.value);
                return Positioned(
                  top: -18 * v - 4,
                  child: Opacity(
                    opacity: (1 - v).clamp(0, 1),
                    child: Text('+$_delta', style: context.t.metric.copyWith(fontSize: 13, color: c.tint(TintName.gold).ink)),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
