/// Energy chip, joy badge, choice chip and the segmented pill control.
library;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../theme/theme_ext.dart';
import 'spark.dart';

extension EnergyTint on WColors {
  Tint energy(EnergyMode m) => switch (m) {
    EnergyMode.green => energyGreen,
    EnergyMode.yellow => energyYellow,
    EnergyMode.red => energyRed,
  };
}

/// Pill 32px high: dot + "طاقتي: جيدة". Wrapped in a 44px tap area.
class EnergyChip extends StatelessWidget {
  const EnergyChip({super.key, required this.mode, this.onTap, this.showChange = false});

  final EnergyMode mode;
  final VoidCallback? onTap;

  /// Appends " · تغيير" (Red mode header).
  final bool showChange;

  @override
  Widget build(BuildContext context) {
    final t = context.c.energy(mode);
    final l = context.l;
    final name = switch (mode) {
      EnergyMode.green => l.energyChipGreen,
      EnergyMode.yellow => l.energyChipYellow,
      EnergyMode.red => l.energyChipRed,
    };
    final text = showChange ? '$name · ${l.change}' : name;
    return Semantics(
      container: true,
      button: onTap != null,
      label: text,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: WRadius.pillR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: WSpace.tap),
          child: Center(
            widthFactor: 1,
            child: Container(
              constraints: const BoxConstraints(minHeight: 32),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.pillR),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: t.ink, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      text,
                      style: context.t.caption.copyWith(color: t.ink, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Gold chip with a small spark: "+ بودكاستك المحجوز للمشي".
class JoyBadge extends StatelessWidget {
  const JoyBadge(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.c.joy;
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.pillR),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SparkIcon(size: 12),
          const SizedBox(width: 6),
          Flexible(
            child: Text(text, style: context.t.label.copyWith(color: t.ink)),
          ),
        ],
      ),
    );
  }
}

/// 40px choice chip (UIKIT #11). Wrapped to a 44px tap target.
class WChoiceChip extends StatelessWidget {
  const WChoiceChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
    this.dashed = false,
    this.enabled = true,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  /// "+ شي ثاني" add-your-own chip.
  final bool dashed;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fg = !enabled ? c.caption.withValues(alpha: .6) : (selected ? c.deep : c.textSecondary);
    return Semantics(
      container: true,
      button: true,
      selected: selected,
      enabled: enabled,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: WRadius.pillR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: WSpace.tap),
          child: Center(
            widthFactor: 1,
            child: AnimatedContainer(
              duration: WMotion.of(context, WMotion.fast),
              constraints: const BoxConstraints(minHeight: 40),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? c.surfaceSubtle : c.surface,
                borderRadius: WRadius.pillR,
                border: Border.all(
                  color: selected ? c.sky300 : c.border,
                  width: 1,
                  style: dashed ? BorderStyle.none : BorderStyle.solid,
                ),
              ),
              foregroundDecoration: dashed ? ShapeDecoration(shape: _DashedPill(color: c.sky300)) : null,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[Icon(icon, size: 16, color: dashed ? c.accentText : fg), const SizedBox(width: 6)],
                  Flexible(
                    child: Text(
                      label,
                      style: context.t.small.copyWith(
                        color: dashed ? c.accentText : fg,
                        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedPill extends ShapeBorder {
  const _DashedPill({required this.color});
  final Color color;

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => getOuterPath(rect);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) =>
      Path()..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(rect.height / 2)));

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final path = getOuterPath(rect.deflate(.5));
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 5), paint);
        d += 9;
      }
    }
  }

  @override
  ShapeBorder scale(double t) => this;
}

/// One option of a [SegmentedPills] control.
class PillOption<T> {
  const PillOption(this.value, this.label, {this.semanticLabel});
  final T value;
  final String label;
  final String? semanticLabel;
}

/// Rounded segmented control (level "أدنى · عادي · إضافي", domain
/// "نمو · صيانة · راحة"). 44px tall segments.
class SegmentedPills<T> extends StatelessWidget {
  const SegmentedPills({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
    this.groupLabel,
    this.selectedTint,
    this.minSegmentWidth = 52,
    this.disabled = const {},
    this.expand = false,
  });

  /// Fill the available width with equal segments (settings rows, scales).
  final bool expand;

  final List<PillOption<T>> options;
  final T? selected;
  final ValueChanged<T> onSelected;
  final String? groupLabel;

  /// Per-value selected tint (e.g. Rest = neutral).
  final Tint Function(T value)? selectedTint;
  final double minSegmentWidth;
  final Set<T> disabled;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      label: groupLabel,
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: WRadius.pillR,
          border: Border.all(color: c.border),
        ),
        padding: expand ? const EdgeInsets.all(3) : null,
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          children: [for (final o in options) expand ? Expanded(child: _segment(context, o)) : _segment(context, o)],
        ),
      ),
    );
  }

  Widget _segment(BuildContext context, PillOption<T> o) {
    final c = context.c;
    final sel = o.value == selected;
    final off = disabled.contains(o.value);
    final tint = sel ? (selectedTint?.call(o.value) ?? c.tint(TintName.primary)) : null;
    return Semantics(
      container: true,
      button: true,
      selected: sel,
      enabled: !off,
      inMutuallyExclusiveGroup: true,
      label: o.semanticLabel ?? o.label,
      excludeSemantics: true,
      child: InkWell(
        onTap: off ? null : () => onSelected(o.value),
        borderRadius: WRadius.pillR,
        child: AnimatedContainer(
          duration: WMotion.of(context, WMotion.fast),
          constraints: BoxConstraints(minHeight: WSpace.tap, minWidth: minSegmentWidth),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(color: tint?.bg ?? Colors.transparent, borderRadius: WRadius.pillR),
          child: Text(
            o.label,
            style: context.t.caption.copyWith(
              fontWeight: FontWeight.w600,
              color: off ? c.caption.withValues(alpha: .45) : (tint?.ink ?? c.caption),
            ),
          ),
        ),
      ),
    );
  }
}
