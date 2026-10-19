/// Bottom sheet scaffold (UIKIT #10): top radius 28, grabber 36×4,
/// 40 % ink scrim. Use [showWSheet] imperatively or [SheetPage] for a
/// deep-linkable go_router route.
library;

import 'package:flutter/material.dart';

import '../theme/theme_ext.dart';

/// Sheet body with grabber, optional header row (title + close) and a
/// scrollable content area; optional pinned [footer] (primary button).
class WSheet extends StatelessWidget {
  const WSheet({super.key, this.title, required this.child, this.footer, this.leading, this.onClose, this.scrollable = true});

  final String? title;
  final Widget child;
  final Widget? footer;

  /// Widget before the title (e.g. domain icon).
  final Widget? leading;
  final VoidCallback? onClose;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final media = MediaQuery.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: media.size.height * .92),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(color: c.border, borderRadius: WRadius.pillR),
              ),
            ),
            if (title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(WSpace.page, 12, WSpace.page, 4),
                child: Row(
                  children: [
                    if (leading != null) ...[leading!, const SizedBox(width: 12)],
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(title!, style: context.t.h2.copyWith(color: c.text)),
                      ),
                    ),
                    Semantics(
                      container: true,
                      button: true,
                      label: context.l.close,
                      excludeSemantics: true,
                      child: IconButton(
                        onPressed: onClose ?? () => Navigator.of(context).maybePop(),
                        icon: Icon(Icons.close_rounded, color: c.deep),
                        style: IconButton.styleFrom(
                          minimumSize: const Size.square(WSpace.tap),
                          backgroundColor: c.surface,
                          side: BorderSide(color: c.border),
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              const SizedBox(height: 8),
            Flexible(
              child: scrollable
                  ? SingleChildScrollView(padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 16), child: child)
                  : Padding(padding: const EdgeInsets.fromLTRB(WSpace.page, 8, WSpace.page, 16), child: child),
            ),
            if (footer != null)
              SafeArea(
                top: false,
                child: Padding(padding: const EdgeInsets.fromLTRB(WSpace.page, 0, WSpace.page, 16), child: footer),
              )
            else
              SizedBox(height: media.padding.bottom),
          ],
        ),
      ),
    );
  }
}

/// Opens [builder] as a modal sheet with the Calm Sky styling.
Future<T?> showWSheet<T>(BuildContext context, WidgetBuilder builder) =>
    showModalBottomSheet<T>(context: context, isScrollControlled: true, useSafeArea: true, useRootNavigator: true, builder: builder);

/// go_router page that presents its child as a modal bottom sheet, so
/// sheets are deep-linkable (`/today/why/h_walk`) and screenshot-able.
class SheetPage<T> extends Page<T> {
  const SheetPage({required this.child, super.key, super.name});

  final Widget child;

  @override
  Route<T> createRoute(BuildContext context) => ModalBottomSheetRoute<T>(
    settings: this,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => child,
    modalBarrierColor: context.c.scrim,
    backgroundColor: context.c.bg,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(WRadius.sheet))),
  );
}
