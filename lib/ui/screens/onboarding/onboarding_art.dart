/// Welcome illustration (Onboarding1.dc.html): the day as a dashed arc
/// with morning / day / evening nodes and the spark motif above.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';

class DayArcArt extends StatelessWidget {
  const DayArcArt({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    return ExcludeSemantics(
      child: AspectRatio(
        aspectRatio: 350 / 216,
        child: Container(
          decoration: BoxDecoration(color: c.surfaceSubtle, borderRadius: BorderRadius.circular(28)),
          child: LayoutBuilder(
            builder: (context, box) {
              final w = box.maxWidth, h = box.maxHeight;
              // Arc nodes in reading order: start = morning.
              final rtl = context.isRtl;
              Offset node(double t) {
                final x = rtl ? w * (0.82 - 0.64 * t) : w * (0.18 + 0.64 * t);
                final y = h * 0.62 - math.sin(t * math.pi) * h * 0.24;
                return Offset(x, y);
              }

              Widget dot(Offset o, String label) => Positioned(
                left: o.dx - 40,
                top: o.dy - 11,
                width: 80,
                child: Column(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: c.surface,
                        shape: BoxShape.circle,
                        border: Border.all(color: c.primaryFill, width: 2),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(color: c.surface, borderRadius: WRadius.pillR),
                      child: Text(label, style: context.t.label.copyWith(color: c.deep)),
                    ),
                  ],
                ),
              );

              return Stack(
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _ArcPainter(node: node, color: c.sky300, base: c.sky200),
                    ),
                  ),
                  Positioned(left: w / 2 - 16, top: h * .12, child: const SparkIcon(size: 32)),
                  Positioned(
                    left: w / 2 + 40,
                    top: h * .2,
                    child: SparkIcon(size: 14, color: c.primary),
                  ),
                  Positioned(
                    left: w / 2 - 58,
                    top: h * .27,
                    child: SparkIcon(size: 10, color: c.sky300),
                  ),
                  dot(node(0), l.slotMorning),
                  dot(node(.5), l.dayLabel),
                  dot(node(1), l.slotEvening),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  _ArcPainter({required this.node, required this.color, required this.base});
  final Offset Function(double) node;
  final Color color;
  final Color base;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    final path = Path()..moveTo(node(0).dx, node(0).dy);
    for (var t = 0.02; t <= 1.0001; t += 0.02) {
      path.lineTo(node(t).dx, node(t).dy);
    }
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 9) {
        canvas.drawPath(m.extractPath(d, d + 5), p);
      }
    }
    canvas.drawLine(Offset(20, size.height * .82), Offset(size.width - 20, size.height * .82), p..color = base);
  }

  @override
  bool shouldRepaint(_ArcPainter o) => o.color != color;
}
