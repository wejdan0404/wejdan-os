/// Shared building blocks for the hub screens (UI-2): page scaffold with a
/// back button, navigation rows, toggle / check rows, labelled bars (every
/// chart value is also written as text), stat tiles, input + confirm sheets.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../theme/theme_ext.dart';
import 'buttons.dart';
import 'sheet.dart';
import 'surfaces.dart';
import 'tab_shell.dart';

/// Scrollable hub page: header (optional back button, H1, caption, trailing
/// actions) then [children] with 20 px gutters. [bottom] is pinned under
/// the list (one primary button per view).
class HubPage extends StatelessWidget {
  const HubPage({
    super.key,
    required this.title,
    this.subtitle,
    this.back = true,
    this.actions = const [],
    required this.children,
    this.bottom,
    this.onBack,
    this.controller,
    this.leading,
  });

  /// Widget before the title (Me avatar).
  final Widget? leading;

  final String title;
  final String? subtitle;
  final bool back;
  final List<Widget> actions;
  final List<Widget> children;
  final Widget? bottom;
  final VoidCallback? onBack;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(WSpace.page, 16, WSpace.page, 40),
                children: [
                  if (leading != null)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        leading!,
                        const SizedBox(width: 12),
                        Expanded(child: _header(context)),
                      ],
                    )
                  else
                    _header(context),
                  const SizedBox(height: 16),
                  ...children,
                ],
              ),
            ),
            if (bottom != null)
              SafeArea(
                top: false,
                child: Padding(padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 12), child: bottom),
              ),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context) => WHeader(
    title: title,
    subtitle: subtitle,
    actions: [
      ...actions,
      if (back)
        CircleIconButton(
          icon: backIcon(context),
          label: context.l.back,
          onPressed: onBack ?? () => context.canPop() ? context.pop() : context.go('/me'),
        ),
    ],
  );
}

/// Vertical gap helpers used between sections.
const gap8 = SizedBox(height: 8);
const gap12 = SizedBox(height: 12);
const gap16 = SizedBox(height: 16);
const gap24 = SizedBox(height: 24);

/// Title + subtitle row with a leading tinted icon and a forward chevron.
class NavRow extends StatelessWidget {
  const NavRow({super.key, required this.title, this.subtitle, this.icon, this.tint, this.onTap, this.trailing});

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Tint? tint;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      button: onTap != null,
      child: InkWell(
        onTap: onTap,
        borderRadius: WRadius.tileR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                if (icon != null) ...[TintIcon(icon!, tint: tint ?? c.info), const SizedBox(width: 12)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                      if (subtitle != null && subtitle!.isNotEmpty)
                        Text(subtitle!, style: context.t.caption.copyWith(color: c.caption)),
                    ],
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: 8), trailing!],
                if (onTap != null)
                  ExcludeSemantics(
                    child: Icon(forwardIcon(context), color: c.caption, size: 22, textDirection: TextDirection.ltr),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Thin divider in card colour.
class RowDivider extends StatelessWidget {
  const RowDivider({super.key});

  @override
  Widget build(BuildContext context) => Divider(height: 1, thickness: 1, color: context.c.border);
}

/// Card whose children are separated by dividers.
class ListCard extends StatelessWidget {
  const ListCard({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
  });

  final List<Widget> children;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => WCard(
    padding: padding,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, w) in children.indexed) ...[if (i > 0) const RowDivider(), w],
      ],
    ),
  );
}

/// Title/subtitle with a switch (settings, module toggles).
class ToggleRow extends StatelessWidget {
  const ToggleRow({
    super.key,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
    this.locked = false,
  });

  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;

  /// Small lock glyph for sensitive modules.
  final bool locked;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return MergeSemantics(
      child: InkWell(
        onTap: onChanged == null ? null : () => onChanged!(!value),
        borderRadius: WRadius.tileR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                        ),
                        if (locked) ...[
                          const SizedBox(width: 6),
                          Icon(Icons.lock_outline_rounded, size: 16, color: c.caption),
                        ],
                      ],
                    ),
                    if (subtitle != null) Text(subtitle!, style: context.t.caption.copyWith(color: c.caption)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Switch(value: value, onChanged: onChanged),
            ],
          ),
        ),
      ),
    );
  }
}

/// Square checkbox row (feedback checklist, errands, wins).
class CheckRow extends StatelessWidget {
  const CheckRow({
    super.key,
    required this.title,
    this.subtitle,
    required this.checked,
    required this.onChanged,
    this.strike = false,
    this.subtitleLtr = false,
  });

  final String title;
  final String? subtitle;
  final bool checked;
  final ValueChanged<bool> onChanged;

  /// Strike the title through when checked (errands).
  final bool strike;
  final bool subtitleLtr;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      container: true,
      checked: checked,
      button: true,
      label: title,
      excludeSemantics: true,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onChanged(!checked);
        },
        borderRadius: WRadius.tileR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Row(
            children: [
              AnimatedContainer(
                duration: WMotion.of(context, WMotion.fast),
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: checked ? c.primaryFill : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: checked ? c.primaryFill : c.sky300, width: 2),
                ),
                child: checked ? Icon(Icons.check_rounded, size: 18, color: c.onPrimary) : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: context.t.bodyStrong.copyWith(
                        color: checked && strike ? c.caption : c.text,
                        decoration: checked && strike ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        textDirection: subtitleLtr ? TextDirection.ltr : null,
                        style: (subtitleLtr ? WType.english.caption : context.t.caption).copyWith(color: c.caption),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Horizontal bar with a label on the start side and the value written as
/// text on the end side (charts never rely on the bar alone).
class LabelledBar extends StatelessWidget {
  const LabelledBar({
    super.key,
    required this.label,
    required this.fraction,
    required this.valueText,
    this.color,
    this.labelWidth = 96,
  });

  final String label;
  final double fraction;
  final String valueText;
  final Color? color;
  final double labelWidth;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      label: '$label: $valueText',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            SizedBox(
              width: labelWidth,
              child: Text(label, style: context.t.small.copyWith(color: c.text), maxLines: 2),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ClipRRect(
                borderRadius: WRadius.pillR,
                child: SizedBox(
                  height: 10,
                  child: Stack(
                    children: [
                      Positioned.fill(child: ColoredBox(color: c.surfaceSubtle)),
                      Positioned.fill(
                        child: FractionallySizedBox(
                          widthFactor: fraction.clamp(0, 1).toDouble(),
                          heightFactor: 1,
                          alignment: AlignmentDirectional.centerStart,
                          child: ColoredBox(color: color ?? c.primaryFill),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 36),
              child: Text(
                valueText,
                textAlign: TextAlign.end,
                style: context.t.metric.copyWith(fontSize: 14, color: c.text),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Number + caption tile (subtle surface).
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.value, required this.label, this.tint});

  final String value;
  final String label;
  final Tint? tint;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final t = tint ?? Tint(c.surfaceSubtle, c.text);
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(color: t.bg, borderRadius: WRadius.tileR),
        child: Column(
          children: [
            Text(
              value,
              textDirection: RegExp(r'^[0-9.,:+\-– ]+$').hasMatch(value) ? TextDirection.ltr : null,
              style: context.t.metric.copyWith(fontSize: 22, color: t.ink),
            ),
            Text(
              label,
              textAlign: TextAlign.center,
              style: context.t.caption.copyWith(color: c.caption),
            ),
          ],
        ),
      ),
    );
  }
}

/// Outlined small button (secondary actions inside cards: "استبدلي", "سجّلي").
class OutlineAction extends StatelessWidget {
  const OutlineAction({super.key, required this.label, required this.onPressed, this.tint, this.icon});

  final String label;
  final VoidCallback? onPressed;
  final Tint? tint;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fg = onPressed == null ? c.caption : (tint?.ink ?? c.accentText);
    return Semantics(
      container: true,
      button: true,
      enabled: onPressed != null,
      child: Material(
        color: tint?.bg ?? Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: WRadius.buttonR,
          side: BorderSide(color: tint == null ? c.sky300 : fg.withValues(alpha: .35)),
        ),
        child: InkWell(
          onTap: onPressed,
          borderRadius: WRadius.buttonR,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: WSpace.tap, minWidth: 64),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[Icon(icon, size: 18, color: fg), const SizedBox(width: 6)],
                  Flexible(
                    child: Text(
                      label,
                      textAlign: TextAlign.center,
                      style: context.t.small.copyWith(color: fg, fontWeight: FontWeight.w600),
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

/// One text field in [showInputSheet].
class InputSpec {
  const InputSpec(
    this.label, {
    this.hint,
    this.initial = '',
    this.number = false,
    this.lines = 1,
    this.optional = false,
  });

  final String label;
  final String? hint;
  final String initial;
  final bool number;
  final int lines;
  final bool optional;
}

/// Sheet with labelled text fields and one Save button. Returns the values
/// (trimmed) or null when dismissed. Required fields must be non-empty.
Future<List<String>?> showInputSheet(
  BuildContext context, {
  required String title,
  required List<InputSpec> fields,
  String? saveLabel,
  Widget? extra,
}) => showWSheet<List<String>>(
  context,
  (_) => _InputSheet(title: title, fields: fields, saveLabel: saveLabel, extra: extra),
);

class _InputSheet extends StatefulWidget {
  const _InputSheet({required this.title, required this.fields, this.saveLabel, this.extra});

  final String title;
  final List<InputSpec> fields;
  final String? saveLabel;
  final Widget? extra;

  @override
  State<_InputSheet> createState() => _InputSheetState();
}

class _InputSheetState extends State<_InputSheet> {
  late final List<TextEditingController> _c = [for (final f in widget.fields) TextEditingController(text: f.initial)];

  @override
  void initState() {
    super.initState();
    for (final c in _c) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in _c) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _valid =>
      [for (final (i, f) in widget.fields.indexed) f.optional || _c[i].text.trim().isNotEmpty].every((v) => v);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return WSheet(
      title: widget.title,
      footer: PrimaryButton(
        label: widget.saveLabel ?? context.l.save,
        onPressed: _valid ? () => Navigator.of(context).pop([for (final t in _c) t.text.trim()]) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, f) in widget.fields.indexed) ...[
            Text(f.label, style: context.t.label.copyWith(color: c.textSecondary)),
            const SizedBox(height: 6),
            TextField(
              controller: _c[i],
              autofocus: i == 0,
              minLines: 1,
              maxLines: f.lines,
              keyboardType: f.number ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
              inputFormatters: f.number ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9.\-]'))] : null,
              style: context.t.body.copyWith(color: c.text),
              decoration: InputDecoration(hintText: f.hint),
            ),
            const SizedBox(height: 14),
          ],
          ?widget.extra,
        ],
      ),
    );
  }
}

/// Calm confirm sheet. Returns true on confirm.
Future<bool> showConfirmSheet(
  BuildContext context, {
  required String title,
  required String body,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final r = await showWSheet<bool>(
    context,
    (ctx) => WSheet(
      title: title,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          destructive
              ? OutlineAction(
                  label: confirmLabel,
                  tint: ctx.c.tint(TintName.rose),
                  onPressed: () => Navigator.of(ctx).pop(true),
                )
              : PrimaryButton(label: confirmLabel, onPressed: () => Navigator.of(ctx).pop(true)),
          SecondaryButton(label: ctx.l.cancel, onPressed: () => Navigator.of(ctx).pop(false)),
        ],
      ),
      child: Text(body, style: ctx.t.body.copyWith(color: ctx.c.textSecondary)),
    ),
  );
  return r ?? false;
}

/// Minus / value / plus stepper (44 px buttons).
class Stepper44 extends StatelessWidget {
  const Stepper44({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 9999,
    this.step = 1,
    this.label,
    this.display,
  });

  final int value;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;
  final int step;
  final String? label;
  final Widget? display;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      label: label,
      value: '$value',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleIconButton(
            icon: Icons.remove_rounded,
            label: '${context.l.fewer} ${label ?? ''}',
            onPressed: value - step >= min ? () => onChanged(value - step) : null,
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 56),
            child: Center(
              child:
                  display ??
                  Text(
                    '$value',
                    textDirection: TextDirection.ltr,
                    style: context.t.metric.copyWith(fontSize: 22, color: c.text),
                  ),
            ),
          ),
          CircleIconButton(
            icon: Icons.add_rounded,
            label: '${context.l.more} ${label ?? ''}',
            onPressed: value + step <= max ? () => onChanged(value + step) : null,
          ),
        ],
      ),
    );
  }
}
