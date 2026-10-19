import 'enums.dart';
import 'json_utils.dart';

/// A bilingual string (Arabic primary, English mirror).
class LocalizedText {
  const LocalizedText({required this.ar, required this.en});

  /// Same text in both languages (e.g. brand names).
  const LocalizedText.same(String text)
      : ar = text,
        en = text;

  factory LocalizedText.fromJson(Json j) =>
      LocalizedText(ar: jStr(j, 'ar'), en: jStr(j, 'en'));

  final String ar;
  final String en;

  String of(AppLanguage lang) => lang == AppLanguage.ar ? ar : en;

  Json toJson() => {'ar': ar, 'en': en};

  @override
  bool operator ==(Object other) =>
      other is LocalizedText && other.ar == ar && other.en == en;

  @override
  int get hashCode => Object.hash(ar, en);

  @override
  String toString() => 'LocalizedText(ar: $ar, en: $en)';
}
