/// Separate Arabic and English type scales (UIKIT "Type"). Arabic uses
/// IBM Plex Sans Arabic with generous line heights; English uses IBM Plex
/// Sans (400/500/600 bundled — 700 roles fall back to 600) with tighter
/// leading. Numbers always use the Metric style (IBM Plex Sans 600).
library;

import 'package:flutter/material.dart';

const String kFontAr = 'IBMPlexSansArabic';
const String kFontEn = 'IBMPlexSans';

/// Semantic text roles. Colour is applied by the widget (defaults to text).
@immutable
class WType extends ThemeExtension<WType> {
  const WType({
    required this.display,
    required this.h1,
    required this.h2,
    required this.body,
    required this.bodyStrong,
    required this.small,
    required this.caption,
    required this.label,
    required this.metric,
  });

  final TextStyle display;
  final TextStyle h1;
  final TextStyle h2;
  final TextStyle body;
  final TextStyle bodyStrong;
  final TextStyle small;
  final TextStyle caption;
  final TextStyle label;

  /// Numbers (IBM Plex Sans 600). Size set per use with `copyWith`.
  final TextStyle metric;

  static TextStyle _s(String family, double size, double lh, FontWeight w, {List<String>? fallback}) => TextStyle(
    fontFamily: family,
    fontFamilyFallback: fallback,
    fontSize: size,
    height: lh / size,
    fontWeight: w,
    leadingDistribution: TextLeadingDistribution.even,
  );

  static const _arFallback = [kFontEn];
  static const _enFallback = [kFontAr];

  /// Arabic scale: Display 28/36 700 · H1 22/30 700 · H2 18/26 600 ·
  /// Body 16/26 · Small 14/22 · Caption 13/20 500 · Label 12/18 600.
  static final WType arabic = WType(
    display: _s(kFontAr, 28, 36, FontWeight.w700, fallback: _arFallback),
    h1: _s(kFontAr, 22, 30, FontWeight.w700, fallback: _arFallback),
    h2: _s(kFontAr, 18, 26, FontWeight.w600, fallback: _arFallback),
    body: _s(kFontAr, 16, 26, FontWeight.w400, fallback: _arFallback),
    bodyStrong: _s(kFontAr, 16, 26, FontWeight.w600, fallback: _arFallback),
    small: _s(kFontAr, 14, 22, FontWeight.w400, fallback: _arFallback),
    caption: _s(kFontAr, 13, 20, FontWeight.w500, fallback: _arFallback),
    label: _s(kFontAr, 12, 18, FontWeight.w600, fallback: _arFallback),
    metric: _s(kFontEn, 15, 20, FontWeight.w600, fallback: _enFallback),
  );

  /// English scale: same sizes, Latin leading (≈1.25–1.5), 600 max.
  static final WType english = WType(
    display: _s(kFontEn, 28, 34, FontWeight.w600, fallback: _enFallback).copyWith(letterSpacing: -0.3),
    h1: _s(kFontEn, 22, 28, FontWeight.w600, fallback: _enFallback).copyWith(letterSpacing: -0.2),
    h2: _s(kFontEn, 18, 24, FontWeight.w600, fallback: _enFallback),
    body: _s(kFontEn, 16, 24, FontWeight.w400, fallback: _enFallback),
    bodyStrong: _s(kFontEn, 16, 24, FontWeight.w600, fallback: _enFallback),
    small: _s(kFontEn, 14, 20, FontWeight.w400, fallback: _enFallback),
    caption: _s(kFontEn, 13, 18, FontWeight.w500, fallback: _enFallback),
    label: _s(kFontEn, 12, 16, FontWeight.w600, fallback: _enFallback).copyWith(letterSpacing: 0.1),
    metric: _s(kFontEn, 15, 20, FontWeight.w600, fallback: _enFallback),
  );

  /// Material text theme mapped from the semantic roles.
  TextTheme toTextTheme(Color text, Color secondary) => TextTheme(
    displaySmall: display.copyWith(color: text),
    headlineSmall: h1.copyWith(color: text),
    titleLarge: h2.copyWith(color: text),
    titleMedium: bodyStrong.copyWith(color: text),
    titleSmall: caption.copyWith(color: text, fontWeight: FontWeight.w600),
    bodyLarge: body.copyWith(color: text),
    bodyMedium: small.copyWith(color: text),
    bodySmall: caption.copyWith(color: secondary),
    labelLarge: bodyStrong.copyWith(color: text),
    labelMedium: label.copyWith(color: secondary),
    labelSmall: label.copyWith(color: secondary),
  );

  @override
  WType copyWith() => this;

  @override
  WType lerp(ThemeExtension<WType>? other, double t) => t < .5 ? this : (other as WType? ?? this);
}
