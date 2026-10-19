/// Today row: check button + title/meta + joy badge + why + level control
/// (UIKIT #4). A `simple` variant (maintain / Red mode) swaps the level
/// control for a domain icon.
library;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import '../theme/theme_ext.dart';
import 'chips.dart';
import 'surfaces.dart';

/// Called with the global centre of the check (celebration origin).
typedef CheckToggle = void Function(Offset origin);

/// 44px round check. Empty = 2px sky border; done = Blue 500 fill + white
/// check (joy variant: gold). Pops on completion unless reduced motion.
class CheckButton extends StatefulWidget {
  const CheckButton({super.key, required this.done, required this.onToggle, required this.label, this.joy = false});

  final bool done;
  final CheckToggle? onToggle;
  final String label;
  final bool joy;

  @override
  State<CheckButton> createState() => _CheckButtonState();
}

class _CheckButtonState extends State<CheckButton> with SingleTickerProviderStateMixin {
  late final AnimationController _pop = AnimationController(vsync: this, duration: const Duration(milliseconds: 360));

  @override
  void didUpdateWidget(CheckButton old) {
    super.didUpdateWidget(old);
    if (widget.done && !old.done && !WMotion.reduced(context)) _pop.forward(from: 0);
  }

  @override
  void dispose() {
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fill = widget.joy ? c.spark : c.primaryFill;
    // Joy ring uses the gold ink (light #8A6412 on #FBF1D6 = 4.77:1; dark
    // #EFCB7A on #33290F = 9.21:1), not the spark fill (1.88:1) — QA D10.
    final ring = widget.joy ? c.joy.ink : c.checkRing;
    return Semantics(
      container: true,
      button: true,
      checked: widget.done,
      label: widget.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onToggle == null
            ? null
            : () {
                final box = context.findRenderObject() as RenderBox?;
                final origin = box == null ? Offset.zero : box.localToGlobal(box.size.center(Offset.zero));
                widget.onToggle!(origin);
              },
        child: AnimatedBuilder(
          animation: _pop,
          builder: (context, child) {
            final t = _pop.value;
            final s = 1 + 0.18 * (t < .4 ? t / .4 : (1 - t) / .6);
            return Transform.scale(scale: s, child: child);
          },
          child: AnimatedContainer(
            duration: WMotion.of(context, WMotion.fast),
            width: WSpace.tap,
            height: WSpace.tap,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.done ? fill : c.surface,
              border: Border.all(color: widget.done ? fill : ring, width: 2),
              boxShadow: widget.done && c.isDark ? [BoxShadow(color: c.glow, blurRadius: 16)] : null,
            ),
            child: AnimatedOpacity(
              duration: WMotion.of(context, WMotion.fast),
              opacity: widget.done ? 1 : 0,
              child: Icon(Icons.check_rounded, size: 24, color: widget.joy ? c.text : c.onPrimary),
            ),
          ),
        ),
      ),
    );
  }
}

/// Today habit card.
class HabitCard extends StatelessWidget {
  const HabitCard({
    super.key,
    required this.title,
    required this.meta,
    required this.done,
    required this.onToggle,
    required this.checkLabel,
    this.joyText,
    this.why,
    this.linkText,
    this.onLink,
    this.level,
    this.onLevel,
    this.domain,
    this.onTap,
    this.comeback = false,
  }) : simple = false;

  /// Maintain / Red-mode row: no level control; domain icon at the end.
  const HabitCard.simple({
    super.key,
    required this.title,
    required this.meta,
    required this.done,
    required this.onToggle,
    required this.checkLabel,
    required DomainId this.domain,
    this.joyText,
    this.onTap,
  }) : simple = true,
       why = null,
       linkText = null,
       onLink = null,
       level = null,
       onLevel = null,
       comeback = false;

  final String title;
  final String meta;
  final bool done;
  final CheckToggle? onToggle;
  final String checkLabel;
  final String? joyText;
  final String? why;
  final String? linkText;
  final VoidCallback? onLink;
  final CompletionLevel? level;
  final ValueChanged<CompletionLevel>? onLevel;
  final DomainId? domain;
  final VoidCallback? onTap;
  final bool simple;

  /// Welcome-back framing (why line in the gold joy tint).
  final bool comeback;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    final titleStyle = context.t.bodyStrong.copyWith(color: done ? c.textSecondary : c.text);
    final head = Row(
      crossAxisAlignment: simple ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        CheckButton(done: done, onToggle: onToggle, label: checkLabel),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: titleStyle),
              const SizedBox(height: 2),
              Text(meta, style: context.t.caption.copyWith(color: c.caption)),
              if (joyText != null) ...[const SizedBox(height: 6), JoyBadge(joyText!)],
            ],
          ),
        ),
        if (linkText != null && onLink != null)
          Transform.translate(
            offset: const Offset(0, -10),
            child: _Link(text: linkText!, onTap: onLink!),
          ),
        if (simple && domain != null) ...[const SizedBox(width: 12), DomainIcon(domain!)],
      ],
    );
    return WCard(
      onTap: onTap,
      child: simple
          ? head
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                head,
                if (why != null || onLevel != null) const SizedBox(height: 12),
                if (why != null || onLevel != null)
                  _WhyAndLevel(
                    why: why == null
                        ? null
                        : Text(
                            why!,
                            style: context.t.caption.copyWith(
                              fontWeight: FontWeight.w400,
                              color: comeback ? c.joy.ink : c.textSecondary,
                            ),
                          ),
                    level: onLevel == null
                        ? null
                        : SegmentedPills<CompletionLevel>(
                            groupLabel: l.levelGroupLabel,
                            selected: level,
                            onSelected: onLevel!,
                            options: [
                              PillOption(CompletionLevel.minimum, l.levelShortMin),
                              PillOption(CompletionLevel.normal, l.levelShortNormal),
                              PillOption(CompletionLevel.bonus, l.levelShortBonus),
                            ],
                          ),
                  ),
              ],
            ),
    );
  }
}

/// Why line beside the level control; stacks vertically when the text is
/// scaled up (Dynamic Type) or the card is narrow.
class _WhyAndLevel extends StatelessWidget {
  const _WhyAndLevel({this.why, this.level});
  final Widget? why;
  final Widget? level;

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(10) / 10;
    return LayoutBuilder(
      builder: (context, box) {
        // Latin level labels are wider; give the why line its own row sooner.
      final latin = Localizations.localeOf(context).languageCode == 'en';
      final stack = scale > 1.15 || box.maxWidth < (latin ? 340 : 300);
        if (stack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ?why,
              if (why != null && level != null) const SizedBox(height: 8),
              if (level != null) FittedBox(fit: BoxFit.scaleDown, alignment: AlignmentDirectional.centerStart, child: level!),
            ],
          );
        }
        return Row(
          children: [
            Expanded(child: why ?? const SizedBox.shrink()),
            if (level != null) ...[const SizedBox(width: 12), level!],
          ],
        );
      },
    );
  }
}

class _Link extends StatelessWidget {
  const _Link({required this.text, required this.onTap});
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    button: true,
    child: InkWell(
      onTap: onTap,
      borderRadius: WRadius.buttonR,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: WSpace.tap, minWidth: WSpace.tap),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Center(
            widthFactor: 1,
            child: Text(
              text,
              style: context.t.caption.copyWith(color: context.c.accentText, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ),
    ),
  );
}
