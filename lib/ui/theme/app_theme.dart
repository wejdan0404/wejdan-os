/// ThemeData (light + dark) built from the Calm Sky tokens, with the
/// language-specific type scale.
library;

import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models/models.dart';
import 'appearance_palette.dart';
import 'tokens.dart';
import 'typography.dart';

abstract final class WTheme {
  static ThemeData build({
    required Brightness brightness,
    required AppLanguage language,
    ThemePalette palette = ThemePalette.calmSky,
    int? customAccentArgb,
    CardStyle cardStyle = CardStyle.outlined,
  }) {
    final base = brightness == Brightness.dark ? WColors.dark : WColors.light;
    final accent = resolveAccentColor(palette, customAccentArgb);
    final semanticAccent = brightness == Brightness.dark ? darkModeAccent(accent) : accent;
    final card = switch (cardStyle) {
      CardStyle.outlined => (radius: 20.0, padding: 16.0, border: 1.0, fill: base.surface),
      CardStyle.soft => (radius: 24.0, padding: 18.0, border: 0.0, fill: Color.lerp(base.surface, accent, .07)!),
      CardStyle.minimal => (radius: 14.0, padding: 14.0, border: 0.0, fill: base.surfaceSubtle),
    };
    final tints = Map<TintName, Tint>.from(base.tints)
      ..[TintName.primary] = Tint(
        Color.lerp(base.surface, accent, brightness == Brightness.dark ? .22 : .10)!,
        semanticAccent,
      );
    final c = base.copyWith(
      primary: semanticAccent,
      primaryFill: accent,
      accentText: semanticAccent,
      cardRadius: card.radius,
      cardPadding: card.padding,
      cardBorderWidth: card.border,
      cardSurface: card.fill,
      tints: tints,
    );
    final t = language == AppLanguage.ar ? WType.arabic : WType.english;
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.primaryFill,
      onPrimary: c.onPrimary,
      primaryContainer: c.surfaceSubtle,
      onPrimaryContainer: c.deep,
      secondary: c.accentText,
      onSecondary: c.onPrimary,
      tertiary: c.spark,
      onTertiary: c.text,
      error: c.tint(TintName.rose).ink,
      onError: c.onPrimary,
      surface: c.surface,
      onSurface: c.text,
      onSurfaceVariant: c.caption,
      surfaceContainerHighest: c.surfaceSubtle,
      surfaceContainerHigh: c.surfaceSubtle,
      surfaceContainer: c.surface,
      surfaceContainerLow: c.surface,
      surfaceContainerLowest: c.surface,
      outline: c.border,
      outlineVariant: c.border,
      scrim: c.scrim,
      inverseSurface: c.isDark ? c.surfaceSubtle : c.text,
      onInverseSurface: c.isDark ? c.text : c.bg,
      inversePrimary: c.sky300,
    );
    final textTheme = t.toTextTheme(c.text, c.caption);
    return ThemeData(
      useMaterial3: true,
      // Standard density + padded tap targets on every platform: the default
      // adaptive density is compact on desktop/web and shrank the 44 pt
      // undo button to 36 pt there (QA D04, Fix pass 3).
      visualDensity: VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.bg,
      canvasColor: c.bg,
      fontFamily: language == AppLanguage.ar ? kFontAr : kFontEn,
      textTheme: textTheme,
      extensions: [c, t],
      splashFactory: InkSparkle.splashFactory,
      dividerTheme: DividerThemeData(color: c.border, thickness: 1, space: 1),
      iconTheme: IconThemeData(color: c.deep, size: 22),
      appBarTheme: AppBarTheme(
        backgroundColor: c.bg,
        foregroundColor: c.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: c.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: c.isDark ? c.surfaceSubtle : c.text,
        contentTextStyle: t.small.copyWith(color: c.isDark ? c.text : c.bg, fontWeight: FontWeight.w500),
        actionTextColor: c.isDark ? c.accentText : c.sky300,
        shape: const RoundedRectangleBorder(borderRadius: WRadius.buttonR),
        insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.bg,
        modalBackgroundColor: c.bg,
        surfaceTintColor: Colors.transparent,
        modalBarrierColor: c.scrim,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(WRadius.sheet))),
        showDragHandle: false,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: WRadius.cardR),
        titleTextStyle: t.h2.copyWith(color: c.text),
        contentTextStyle: t.small.copyWith(color: c.textSecondary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        hintStyle: t.small.copyWith(color: c.caption),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: WRadius.buttonR,
          borderSide: BorderSide(color: c.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: WRadius.buttonR,
          borderSide: BorderSide(color: c.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: WRadius.buttonR,
          borderSide: BorderSide(color: c.sky300, width: 1.5),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.onPrimary : c.caption),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.primaryFill : c.surfaceSubtle),
        trackOutlineColor: WidgetStateProperty.all(c.border),
      ),
      textSelectionTheme: TextSelectionThemeData(cursorColor: c.primary, selectionColor: c.sky300.withValues(alpha: .4)),
      timePickerTheme: TimePickerThemeData(backgroundColor: c.surface),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
