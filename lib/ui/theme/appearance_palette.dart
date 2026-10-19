import 'package:flutter/material.dart';

import '../../data/models/enums.dart';

/// Accent colors are deliberately dark enough to keep white button labels
/// readable. Dark-mode links use a lighter semantic tint of the chosen color.
const Map<ThemePalette, Color> kThemePaletteColors = {
  ThemePalette.calmSky: Color(0xFF6172B5),
  ThemePalette.lavender: Color(0xFF63439A),
  ThemePalette.ocean: Color(0xFF0C5875),
  ThemePalette.forest: Color(0xFF216246),
  ThemePalette.rose: Color(0xFF88384F),
  ThemePalette.terracotta: Color(0xFF884A30),
  ThemePalette.midnight: Color(0xFF384157),
};

Color resolveAccentColor(ThemePalette palette, int? customArgb) {
  final custom = customArgb == null ? null : Color(customArgb);
  if (custom != null && isReadableAccent(custom)) return custom;
  return kThemePaletteColors[palette] ?? kThemePaletteColors[ThemePalette.calmSky]!;
}

/// Accept only opaque colors that provide at least 4.5:1 contrast with white
/// button text. Rejects malformed/transparent input rather than guessing.
Color? parseReadableAccent(String raw) {
  final value = raw.trim().replaceFirst(RegExp(r'^#'), '');
  if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(value)) return null;
  final color = Color(0xFF000000 | int.parse(value, radix: 16));
  return isReadableAccent(color) ? color : null;
}

bool isReadableAccent(Color color) => (color.a * 255).round() == 0xFF && contrastRatio(color, Colors.white) >= 4.5;

double contrastRatio(Color a, Color b) {
  final l1 = a.computeLuminance();
  final l2 = b.computeLuminance();
  final lighter = l1 > l2 ? l1 : l2;
  final darker = l1 > l2 ? l2 : l1;
  return (lighter + .05) / (darker + .05);
}

Color darkModeAccent(Color accent) {
  const darkSurface = Color(0xFF141B33);
  for (var amount = .25; amount <= .9; amount += .05) {
    final candidate = Color.lerp(accent, Colors.white, amount)!;
    if (contrastRatio(candidate, darkSurface) >= 4.5) return candidate;
  }
  return const Color(0xFFF4F7FC);
}

String colorHex(Color color) => color.toARGB32().toRadixString(16).substring(2).toUpperCase();
