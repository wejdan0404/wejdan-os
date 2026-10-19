/// Empty / rest state (UIKIT #13): a soft line illustration + one
/// sentence. Never guilt.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/theme_ext.dart';
import 'spark.dart';

class EmptyRestState extends StatelessWidget {
  const EmptyRestState({super.key, required this.message, this.title, this.action});

  final String? title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: WSpace.page, vertical: WSpace.x24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 160,
            height: 96,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(160, 96),
                  painter: _HillPainter(line: c.sky300, fill: c.surfaceSubtle),
                ),
                const PositionedDirectional(top: 6, end: 38, child: SparkIcon(size: 22)),
                PositionedDirectional(top: 26, end: 22, child: SparkIcon(size: 10, color: c.sky300)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (title != null) ...[
            Text(
              title!,
              textAlign: TextAlign.center,
              style: context.t.h2.copyWith(color: c.text),
            ),
            const SizedBox(height: 4),
          ],
          Text(
            message,
            textAlign: TextAlign.center,
            style: context.t.small.copyWith(color: c.caption),
          ),
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    );
  }
}

/// Soft horizon line with a resting sun arc.
class _HillPainter extends CustomPainter {
  _HillPainter({required this.line, required this.fill});
  final Color line;
  final Color fill;

  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()
      ..color = line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(Offset(s.width * .5, s.height * .78), s.height * .34, Paint()..color = fill);
    canvas.drawArc(
      Rect.fromCircle(center: Offset(s.width * .5, s.height * .78), radius: s.height * .34),
      math.pi,
      math.pi,
      false,
      p,
    );
    final hill = Path()
      ..moveTo(8, s.height * .8)
      ..quadraticBezierTo(s.width * .3, s.height * .66, s.width * .5, s.height * .78)
      ..quadraticBezierTo(s.width * .72, s.height * .9, s.width - 8, s.height * .74);
    canvas.drawPath(hill, p);
    canvas.drawLine(Offset(4, s.height - 2), Offset(s.width - 4, s.height - 2), p..color = line.withValues(alpha: .5));
  }

  @override
  bool shouldRepaint(_HillPainter o) => o.line != line || o.fill != fill;
}
