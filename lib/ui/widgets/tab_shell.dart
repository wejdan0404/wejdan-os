/// Bottom tab bar: 4 owner-authorized top-level domains, active = primary icon + label + 4px
/// dot above the icon. Order follows reading direction (RTL: Today on the
/// right).
library;

import 'package:flutter/material.dart';

import '../theme/theme_ext.dart';

class WTabBar extends StatelessWidget {
  const WTabBar({super.key, required this.index, required this.onTap});

  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final l = context.l;
    final items = <(Widget Function(Color), String)>[
      (
        (col) => Icon(Icons.wb_sunny_outlined, size: 24, color: col),
        l.tabToday,
      ),
      (
        (col) => Icon(Icons.work_outline_rounded, size: 24, color: col),
        l.tabPath,
      ),
      ((col) => Icon(Icons.spa_outlined, size: 24, color: col), l.tabHabits),
      (
        (col) => Icon(Icons.person_outline_rounded, size: 24, color: col),
        l.tabMe,
      ),
    ];
    return Semantics(
      container: true,
      label: l.mainNavigation,
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          border: Border(top: BorderSide(color: c.border)),
        ),
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
            child: Row(
              children: [
                for (var i = 0; i < items.length; i++)
                  Expanded(
                    child: _TabItem(
                      icon: items[i].$1,
                      label: items[i].$2,
                      active: i == index,
                      onTap: () => onTap(i),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final Widget Function(Color) icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final col = active ? c.primary : c.caption;
    return Semantics(
      container: true,
      button: true,
      selected: active,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: WRadius.buttonR,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: WMotion.of(context, WMotion.fast),
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: active ? c.primary : Colors.transparent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(height: 2),
              SizedBox.square(dimension: 24, child: Center(child: icon(col))),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.t.label.copyWith(color: col),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Screen header (UIKIT #2): H1 title + caption line on the start side,
/// circular 44px actions on the end side.
class WHeader extends StatelessWidget {
  const WHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.subtitleTrailing,
  });

  final String title;
  final String? subtitle;
  final Widget? subtitleTrailing;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(title, style: context.t.h1.copyWith(color: c.text)),
              ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        subtitle!,
                        style: context.t.caption.copyWith(color: c.caption),
                      ),
                      ?subtitleTrailing,
                    ],
                  ),
                ),
            ],
          ),
        ),
        for (final a in actions) ...[const SizedBox(width: 8), a],
      ],
    );
  }
}
