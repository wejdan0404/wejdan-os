/// Primary (one per view) and secondary (text link) buttons.
library;

import 'package:flutter/material.dart';

import '../theme/theme_ext.dart';

/// 52px, radius 16, Blue 500 fill, white 16/600. Full width by default.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.expand = true, this.leading});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;

  /// Custom leading widget (e.g. a spark for bundle buttons).
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final enabled = onPressed != null;
    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: 8)],
        if (icon != null) ...[Icon(icon, size: 20, color: c.onPrimary), const SizedBox(width: 8)],
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: context.t.bodyStrong.copyWith(color: c.onPrimary),
          ),
        ),
      ],
    );
    return Semantics(
      container: true,
      button: true,
      enabled: enabled,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 52),
        child: Material(
          color: enabled ? c.primaryFill : c.primaryFill.withValues(alpha: .45),
          borderRadius: WRadius.buttonR,
          child: InkWell(
            borderRadius: WRadius.buttonR,
            onTap: onPressed,
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12), child: child),
          ),
        ),
      ),
    );
  }
}

/// Secondary action: text link 16/600 accent, 44px min target.
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({super.key, required this.label, required this.onPressed, this.icon, this.small = false});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  /// 13/600 inline link variant (e.g. "لماذا؟").
  final bool small;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final style = (small ? context.t.caption : context.t.bodyStrong).copyWith(
      color: onPressed == null ? c.caption : c.accentText,
      fontWeight: FontWeight.w600,
    );
    return Semantics(
      container: true,
      button: true,
      child: InkWell(
        onTap: onPressed,
        borderRadius: WRadius.buttonR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: WSpace.tap, minWidth: WSpace.tap),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: small ? 4 : 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[Icon(icon, size: small ? 16 : 18, color: style.color), const SizedBox(width: 6)],
                Flexible(
                  child: Text(label, style: style, textAlign: TextAlign.center),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
