/// Life Garden plant glyph (spec §6.6): a line drawing whose leaves grow
/// with the habit's [GrowthStage]. Plants never die — a resting habit shows
/// a sleeping plant (closed bud + small moon), with a slow "breathing" sway
/// that stops under Reduce Motion.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../theme/theme_ext.dart';
import 'spark.dart';

class PlantGlyph extends StatefulWidget {
  const PlantGlyph({super.key, required this.stage, this.resting = false, this.size = 44, this.color});

  final GrowthStage stage;
  final bool resting;
  final double size;
  final Color? color;

  @override
  State<PlantGlyph> createState() => _PlantGlyphState();
}

class _PlantGlyphState extends State<PlantGlyph> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(seconds: 4));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.resting && !reduced) {
      if (!_a.isAnimating) _a.repeat(reverse: true);
    } else {
      _a.stop();
    }
  }

  @override
  void dispose() {
    _a.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final color = widget.color ?? (widget.resting ? c.caption : c.done.ink);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _a,
          builder: (_, _) => Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _PlantPainter(
                    stage: widget.stage,
                    resting: widget.resting,
                    color: color,
                    ground: c.border,
                    sway: widget.resting ? (_a.value - .5) * .06 : 0,
                  ),
                ),
              ),
              if (widget.stage == GrowthStage.automatic && !widget.resting)
                PositionedDirectional(top: -2, start: widget.size / 2 - 6, child: SparkIcon(size: 12, color: c.spark)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlantPainter extends CustomPainter {
  _PlantPainter({required this.stage, required this.resting, required this.color, required this.ground, required this.sway});

  final GrowthStage stage;
  final bool resting;
  final Color color;
  final Color ground;
  final double sway;

  @override
  void paint(Canvas canvas, Size s) {
    final w = s.width, h = s.height;
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.6, w / 26)
      ..strokeCap = StrokeCap.round;
    // ground
    canvas.drawLine(Offset(w * .22, h * .9), Offset(w * .78, h * .9), p..color = ground);
    p.color = color;
    final level = GrowthStage.values.indexOf(stage); // 0..4
    final stemTop = h * (.72 - level * .1);
    canvas.save();
    canvas.translate(w / 2, h * .9);
    canvas.rotate(sway);
    canvas.translate(-w / 2, -h * .9);
    canvas.drawLine(Offset(w / 2, h * .9), Offset(w / 2, stemTop), p);
    void leaf(double y, bool right, double len) {
      final dir = right ? 1.0 : -1.0;
      final path = Path()
        ..moveTo(w / 2, y)
        ..quadraticBezierTo(w / 2 + dir * len * .9, y - len * .7, w / 2 + dir * len, y - len * .15)
        ..quadraticBezierTo(w / 2 + dir * len * .4, y + len * .05, w / 2, y);
      canvas.drawPath(path, p);
    }

    if (level == 0) {
      // seed: a short shoot with two tiny leaves
      leaf(stemTop + h * .06, true, w * .13);
      leaf(stemTop + h * .06, false, w * .13);
      canvas.drawCircle(Offset(w / 2, stemTop - w * .03), w * .05, p);
    } else {
      final len = w * .2;
      leaf(stemTop + h * .08, true, len);
      if (level >= 2) leaf(stemTop + h * .16, false, len);
      if (level >= 3) leaf(stemTop + h * .26, true, len * 1.1);
      if (level >= 4) leaf(stemTop + h * .34, false, len * 1.1);
      if (resting) {
        canvas.drawCircle(Offset(w / 2, stemTop), w * .05, p);
      } else {
        leaf(stemTop + h * .02, false, len * .7);
      }
    }
    canvas.restore();
    if (resting) {
      // moon
      final c = Offset(w * .72, h * .2);
      final r = w * .1;
      final moon = Path.combine(
        PathOperation.difference,
        Path()..addOval(Rect.fromCircle(center: c, radius: r)),
        Path()..addOval(Rect.fromCircle(center: c.translate(r * .55, -r * .35), radius: r * .85)),
      );
      canvas.drawPath(moon, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_PlantPainter o) =>
      o.stage != stage || o.resting != resting || o.color != color || o.sway != sway || o.ground != ground;
}
