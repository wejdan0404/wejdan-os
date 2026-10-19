/// "Calm Sky" design tokens (design/UIKIT.md). Every colour, radius and
/// spacing used by the UI comes from here — never hard-code hex in widgets.
library;

import 'package:flutter/material.dart';

/// Spacing scale (vertical rhythm 8/12/16/24, page padding 20).
abstract final class WSpace {
  static const double x2 = 2;
  static const double x4 = 4;
  static const double x6 = 6;
  static const double x8 = 8;
  static const double x10 = 10;
  static const double x12 = 12;
  static const double x16 = 16;
  static const double x20 = 20;
  static const double x24 = 24;
  static const double x32 = 32;

  /// Page side padding.
  static const double page = 20;

  /// Minimum tap target (spec §1: 44pt).
  static const double tap = 44;
}

/// Radius scale.
abstract final class WRadius {
  static const double card = 20;
  static const double tile = 14;
  static const double button = 16;
  static const double sheet = 28;
  static const double pill = 999;

  static const BorderRadius cardR = BorderRadius.all(Radius.circular(card));
  static const BorderRadius tileR = BorderRadius.all(Radius.circular(tile));
  static const BorderRadius buttonR = BorderRadius.all(Radius.circular(button));
  static const BorderRadius pillR = BorderRadius.all(Radius.circular(pill));
}

/// A background + ink pair (domain tints, statuses, energy).
@immutable
class Tint {
  const Tint(this.bg, this.ink);
  final Color bg;
  final Color ink;

  static Tint lerp(Tint a, Tint b, double t) => Tint(Color.lerp(a.bg, b.bg, t)!, Color.lerp(a.ink, b.ink, t)!);
}

/// Named tint families used by domains and statuses.
enum TintName { sage, lilac, apricot, sky, sand, slate, mint, rose, gold, neutral, primary }

/// Theme-dependent colours. Access with `context.c` (see `theme_ext.dart`).
@immutable
class WColors extends ThemeExtension<WColors> {
  const WColors({
    required this.brightness,
    required this.bg,
    required this.surface,
    required this.surfaceSubtle,
    required this.sky200,
    required this.sky300,
    required this.checkRing,
    required this.primary,
    required this.primaryFill,
    required this.onPrimary,
    required this.accentText,
    required this.deep,
    required this.text,
    required this.textSecondary,
    required this.caption,
    required this.border,
    required this.spark,
    required this.scrim,
    required this.glow,
    required this.tints,
    this.cardRadius = 20,
    this.cardPadding = 16,
    this.cardBorderWidth = 1,
    Color? cardSurface,
  }) : cardSurface = cardSurface ?? surface;

  final Brightness brightness;
  final Color bg;
  final Color surface;
  final Color surfaceSubtle;
  final Color sky200;
  final Color sky300;

  /// Unchecked check-button ring: ≥ 3:1 on surface/bg (WCAG 1.4.11).
  final Color checkRing;

  /// Brand blue for icons / selected states (lighter in dark mode).
  final Color primary;

  /// Button & check fill (always Blue 500 so white text keeps contrast).
  final Color primaryFill;
  final Color onPrimary;

  /// Small blue text (links, selected pill text).
  final Color accentText;

  /// Numbers / strong ink on subtle surfaces.
  final Color deep;
  final Color text;
  final Color textSecondary;
  final Color caption;
  final Color border;

  /// The 4-point spark ✦ fill.
  final Color spark;
  final Color scrim;

  /// Celebration glow (dark mode replaces shadows with glow).
  final Color glow;
  final Map<TintName, Tint> tints;
  final double cardRadius;
  final double cardPadding;
  final double cardBorderWidth;
  final Color cardSurface;

  bool get isDark => brightness == Brightness.dark;

  Tint tint(TintName n) => tints[n]!;

  // Semantic shortcuts.
  Tint get done => tint(TintName.sage);
  Tint get rest => tint(TintName.neutral);
  Tint get joy => tint(TintName.gold);
  Tint get energyGreen => tint(TintName.sage);
  Tint get energyYellow => tint(TintName.gold);
  Tint get energyRed => tint(TintName.lilac);
  Tint get info => tint(TintName.sky);

  static const light = WColors(
    brightness: Brightness.light,
    bg: Color(0xFFF4F7FC),
    surface: Color(0xFFFFFFFF),
    surfaceSubtle: Color(0xFFEAF1FB),
    sky200: Color(0xFFBEDAF7),
    sky300: Color(0xFF9BC4EE),
    checkRing: Color(0xFF5E8BC4),
    primary: Color(0xFF6172B5),
    primaryFill: Color(0xFF6172B5),
    onPrimary: Color(0xFFFFFFFF),
    accentText: Color(0xFF4F5FA0),
    deep: Color(0xFF2B3358),
    text: Color(0xFF0E121C),
    textSecondary: Color(0xFF3A4256),
    caption: Color(0xFF5A6478),
    border: Color(0xFFDCE3EF),
    spark: Color(0xFFE0A93B),
    scrim: Color(0x660E121C),
    glow: Color(0x599BC4EE),
    tints: {
      TintName.sage: Tint(Color(0xFFE3F0E8), Color(0xFF2F6B4A)),
      TintName.lilac: Tint(Color(0xFFECE8F7), Color(0xFF5B4C99)),
      TintName.apricot: Tint(Color(0xFFFBEADF), Color(0xFF9A4E1F)),
      TintName.sky: Tint(Color(0xFFE1EEFB), Color(0xFF2D5F92)),
      TintName.sand: Tint(Color(0xFFF3EEDF), Color(0xFF6E5A1E)),
      TintName.slate: Tint(Color(0xFFE6EAF2), Color(0xFF3A4A6B)),
      TintName.mint: Tint(Color(0xFFE2F3F0), Color(0xFF23675C)),
      TintName.rose: Tint(Color(0xFFF6E6EA), Color(0xFF8A3950)),
      TintName.gold: Tint(Color(0xFFFBF1D6), Color(0xFF8A6412)),
      TintName.neutral: Tint(Color(0xFFEEF1F6), Color(0xFF5A6478)),
      TintName.primary: Tint(Color(0xFFEAF1FB), Color(0xFF4F5FA0)),
    },
  );

  static const dark = WColors(
    brightness: Brightness.dark,
    bg: Color(0xFF0B1020),
    surface: Color(0xFF141B33),
    surfaceSubtle: Color(0xFF1B2444),
    sky200: Color(0xFF2B3358),
    sky300: Color(0xFF9BC4EE),
    checkRing: Color(0xFF9BC4EE),
    primary: Color(0xFF8C9BD8),
    primaryFill: Color(0xFF6172B5),
    onPrimary: Color(0xFFFFFFFF),
    accentText: Color(0xFFA9B6E8),
    deep: Color(0xFFC9D2E6),
    text: Color(0xFFF4F7FC),
    textSecondary: Color(0xFFC9D2E6),
    caption: Color(0xFF9FAACB),
    border: Color(0xFF2B3358),
    spark: Color(0xFFEFCB7A),
    scrim: Color(0x99000000),
    glow: Color(0x599BC4EE),
    tints: {
      TintName.sage: Tint(Color(0xFF1A3327), Color(0xFF9FD3B4)),
      TintName.lilac: Tint(Color(0xFF26203F), Color(0xFFC6BBF0)),
      TintName.apricot: Tint(Color(0xFF3A2517), Color(0xFFF2BE9A)),
      TintName.sky: Tint(Color(0xFF182C45), Color(0xFFA9CBF0)),
      TintName.sand: Tint(Color(0xFF2E2816), Color(0xFFE3D39C)),
      TintName.slate: Tint(Color(0xFF1C2439), Color(0xFFB8C3DE)),
      TintName.mint: Tint(Color(0xFF14302C), Color(0xFF9AD9CB)),
      TintName.rose: Tint(Color(0xFF3A1E29), Color(0xFFEDB3C3)),
      TintName.gold: Tint(Color(0xFF33290F), Color(0xFFEFCB7A)),
      TintName.neutral: Tint(Color(0xFF1B2444), Color(0xFFB4BEDA)),
      TintName.primary: Tint(Color(0xFF232E57), Color(0xFFC3CCF0)),
    },
  );

  @override
  WColors copyWith({
    Color? primary,
    Color? primaryFill,
    Color? accentText,
    Color? cardSurface,
    double? cardRadius,
    double? cardPadding,
    double? cardBorderWidth,
    Map<TintName, Tint>? tints,
  }) => WColors(
        brightness: brightness,
        bg: bg,
        surface: surface,
        surfaceSubtle: surfaceSubtle,
        sky200: sky200,
        sky300: sky300,
        checkRing: checkRing,
        primary: primary ?? this.primary,
        primaryFill: primaryFill ?? this.primaryFill,
        onPrimary: onPrimary,
        accentText: accentText ?? this.accentText,
        deep: deep,
        text: text,
        textSecondary: textSecondary,
        caption: caption,
        border: border,
        spark: spark,
        scrim: scrim,
        glow: glow,
        tints: tints ?? this.tints,
        cardSurface: cardSurface ?? this.cardSurface,
        cardRadius: cardRadius ?? this.cardRadius,
        cardPadding: cardPadding ?? this.cardPadding,
        cardBorderWidth: cardBorderWidth ?? this.cardBorderWidth,
      );

  @override
  WColors lerp(ThemeExtension<WColors>? other, double t) {
    if (other is! WColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return WColors(
      brightness: t < .5 ? brightness : other.brightness,
      bg: l(bg, other.bg),
      surface: l(surface, other.surface),
      surfaceSubtle: l(surfaceSubtle, other.surfaceSubtle),
      sky200: l(sky200, other.sky200),
      sky300: l(sky300, other.sky300),
      checkRing: l(checkRing, other.checkRing),
      primary: l(primary, other.primary),
      primaryFill: l(primaryFill, other.primaryFill),
      onPrimary: l(onPrimary, other.onPrimary),
      accentText: l(accentText, other.accentText),
      deep: l(deep, other.deep),
      text: l(text, other.text),
      textSecondary: l(textSecondary, other.textSecondary),
      caption: l(caption, other.caption),
      border: l(border, other.border),
      spark: l(spark, other.spark),
      scrim: l(scrim, other.scrim),
      glow: l(glow, other.glow),
      tints: {for (final k in tints.keys) k: Tint.lerp(tints[k]!, other.tints[k]!, t)},
      cardSurface: l(cardSurface, other.cardSurface),
      cardRadius: cardRadius + (other.cardRadius - cardRadius) * t,
      cardPadding: cardPadding + (other.cardPadding - cardPadding) * t,
      cardBorderWidth: cardBorderWidth + (other.cardBorderWidth - cardBorderWidth) * t,
    );
  }
}
