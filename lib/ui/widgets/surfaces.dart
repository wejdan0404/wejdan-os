/// Cards, round icon buttons, section labels, small pills, domain icons.
library;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../theme/theme_ext.dart';
import 'spark.dart';

/// Standard card: surface, 1px border, radius 20, padding 16.
class WCard extends StatelessWidget {
  const WCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.borderColor,
    this.borderWidth,
    this.onTap,
    this.glow = false,
    this.semanticLabel,
  });

  final Widget child;
  /// Null follows the active appearance density; explicit values are local overrides.
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final Color? borderColor;
  final double? borderWidth;
  final VoidCallback? onTap;

  /// Dark-mode celebration glow (replaces shadows).
  final bool glow;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final effectiveBorderWidth = borderWidth ?? c.cardBorderWidth;
    final radius = BorderRadius.circular(c.cardRadius);
    final box = BoxDecoration(
      color: color ?? c.cardSurface,
      borderRadius: radius,
      border: Border.all(color: borderColor ?? c.border, width: effectiveBorderWidth),
      boxShadow: glow && c.isDark ? [BoxShadow(color: c.glow, blurRadius: 24)] : null,
    );
    Widget body = Padding(padding: padding ?? EdgeInsets.all(c.cardPadding), child: child);
    if (onTap != null) {
      body = Material(
        type: MaterialType.transparency,
        child: InkWell(onTap: onTap, borderRadius: radius, child: body),
      );
    }
    return Semantics(
      container: true,
      label: semanticLabel,
      child: AnimatedContainer(duration: WMotion.of(context, WMotion.base), decoration: box, child: body),
    );
  }
}

/// 44px circular icon-only button with a required semantic label.
class CircleIconButton extends StatelessWidget {
  const CircleIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.size = WSpace.tap,
    this.filled = true,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final double size;

  /// Surface + border (header buttons). False = transparent (chevrons).
  final bool filled;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      button: true,
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: Material(
          color: filled ? c.surface : Colors.transparent,
          shape: CircleBorder(side: filled ? BorderSide(color: c.border) : BorderSide.none),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onPressed,
            child: SizedBox.square(
              dimension: size,
              // Glyphs are chosen per direction by callers (see forwardIcon/backIcon),
              // so never let Material auto-mirror them.
              child: Icon(icon, size: 22, color: iconColor ?? c.deep, textDirection: TextDirection.ltr),
            ),
          ),
        ),
      ),
    );
  }
}

/// True at text scales where side-by-side labels stop fitting (≥ 130 %).
bool largeText(BuildContext context) => MediaQuery.textScalerOf(context).scale(10) / 10 >= 1.3;

/// Label-style section header (12/18 600, caption colour). Optional
/// trailing text and a spark (Joy section only).
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.trailing, this.spark = false, this.onTrailingTap});

  final String text;
  final String? trailing;
  final bool spark;
  final VoidCallback? onTrailingTap;

  @override
  Widget build(BuildContext context) {
    final style = context.t.label.copyWith(color: context.c.caption);
    final trailingWidget = trailing == null
        ? null
        : onTrailingTap == null
            ? Text(trailing!, style: style)
            : InkWell(
                    onTap: onTrailingTap,
                    borderRadius: WRadius.pillR,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: WSpace.tap),
                      child: Center(
                        widthFactor: 1,
                        child: Text(trailing!, style: style.copyWith(color: context.c.accentText)),
                      ),
                    ),
                  );
    final title = Row(
      children: [
        if (spark) ...[const SparkIcon(size: 12), const SizedBox(width: 6)],
        Expanded(child: Text(text, style: style)),
        if (trailingWidget != null && !largeText(context)) trailingWidget,
      ],
    );
    return Semantics(
      header: true,
      // Large Dynamic Type: the trailing note moves under the label instead
      // of squeezing it (spec §1, 200 % without clipping).
      child: trailingWidget == null || !largeText(context)
          ? title
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [title, trailingWidget],
            ),
    );
  }
}

/// Small rounded status pill (e.g. "عيّنة", "مقترح").
class WPill extends StatelessWidget {
  const WPill(this.text, {super.key, this.tint, this.icon});

  final String text;
  final Tint? tint;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final t = tint ?? context.c.rest;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
      decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.pillR),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[icon!, const SizedBox(width: 4)],
          Flexible(
            child: Text(text, style: context.t.label.copyWith(color: t.ink)),
          ),
        ],
      ),
    );
  }
}

/// Circular tinted domain icon (40 default).
class DomainIcon extends StatelessWidget {
  const DomainIcon(this.domain, {super.key, this.size = 40, this.icon, this.tint});

  final DomainId domain;
  final double size;
  final IconData? icon;
  final Tint? tint;

  @override
  Widget build(BuildContext context) {
    final t = tint ?? context.c.domain(domain);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: t.bg, shape: BoxShape.circle),
        child: Icon(icon ?? kDomainIcon[domain], size: size * .5, color: t.ink),
      ),
    );
  }
}

/// Round tinted icon badge for arbitrary icons.
class TintIcon extends StatelessWidget {
  const TintIcon(this.icon, {super.key, required this.tint, this.size = 40});

  final IconData icon;
  final Tint tint;
  final double size;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: tint.bg, shape: BoxShape.circle),
      child: Icon(icon, size: size * .5, color: tint.ink),
    ),
  );
}

/// Bidi-safe number span in the Metric font (`<bdi>` equivalent).
class Num extends StatelessWidget {
  const Num(this.value, {super.key, this.style});

  final Object value;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => Text(
    '$value',
    textDirection: TextDirection.ltr,
    style: (style ?? context.t.caption).copyWith(fontFamily: kFontEn),
  );
}

/// Direction-aware glyphs, rendered with `textDirection: ltr` so Material's
/// own mirroring never double-flips them.
IconData forwardIcon(BuildContext context) =>
    Directionality.of(context) == TextDirection.rtl ? Icons.chevron_left_rounded : Icons.chevron_right_rounded;
IconData backIcon(BuildContext context) =>
    Directionality.of(context) == TextDirection.rtl ? Icons.chevron_right_rounded : Icons.chevron_left_rounded;
IconData forwardArrow(BuildContext context) =>
    Directionality.of(context) == TextDirection.rtl ? Icons.arrow_back_rounded : Icons.arrow_forward_rounded;
