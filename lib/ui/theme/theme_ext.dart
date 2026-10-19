/// `context.c` (colours), `context.t` (type), `context.l` (strings),
/// `context.lang` shortcuts.
library;

import 'package:flutter/widgets.dart';
import 'package:flutter/material.dart' show Theme;

import '../../data/models/models.dart';
import '../../l10n/app_localizations.dart';
import 'tokens.dart';
import 'typography.dart';

export 'domain_palette.dart';
export 'motion.dart';
export 'tokens.dart';
export 'typography.dart';

extension WThemeContext on BuildContext {
  WColors get c => Theme.of(this).extension<WColors>() ?? WColors.light;
  WType get t => Theme.of(this).extension<WType>() ?? WType.arabic;
  AppLocalizations get l => AppLocalizations.of(this);
  AppLanguage get lang => Localizations.localeOf(this).languageCode == 'en' ? AppLanguage.en : AppLanguage.ar;
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;
}
