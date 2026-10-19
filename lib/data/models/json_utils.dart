/// Small, forgiving JSON readers so malformed/older data never crashes.
library;

typedef Json = Map<String, dynamic>;

String jStr(Json j, String k, [String fallback = '']) {
  final v = j[k];
  return v is String ? v : (v == null ? fallback : v.toString());
}

String? jStrN(Json j, String k) {
  final v = j[k];
  return v is String ? v : null;
}

int jInt(Json j, String k, [int fallback = 0]) {
  final v = j[k];
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

int? jIntN(Json j, String k) {
  final v = j[k];
  if (v is int) return v;
  if (v is num) return v.round();
  return null;
}

double jDouble(Json j, String k, [double fallback = 0]) {
  final v = j[k];
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

double? jDoubleN(Json j, String k) {
  final v = j[k];
  return v is num ? v.toDouble() : null;
}

bool jBool(Json j, String k, [bool fallback = false]) {
  final v = j[k];
  return v is bool ? v : fallback;
}

DateTime? jDate(Json j, String k) {
  final v = j[k];
  return v is String ? DateTime.tryParse(v) : null;
}

List<String> jStrList(Json j, String k) {
  final v = j[k];
  if (v is List) return v.whereType<String>().toList(growable: false);
  return const [];
}

List<int> jIntList(Json j, String k) {
  final v = j[k];
  if (v is List) return v.whereType<num>().map((e) => e.toInt()).toList(growable: false);
  return const [];
}

Json jMap(Json j, String k) {
  final v = j[k];
  if (v is Map) return v.map((key, value) => MapEntry(key.toString(), value));
  return <String, dynamic>{};
}

List<T> jList<T>(Json j, String k, T Function(Json) f) {
  final v = j[k];
  if (v is! List) return const [];
  return v
      .whereType<Map>()
      .map((e) => f(e.map((key, value) => MapEntry(key.toString(), value))))
      .toList(growable: false);
}

/// Normalises a decoded JSON object into `Map<String, dynamic>`.
Json asJson(Object? v) {
  if (v is Map) return v.map((key, value) => MapEntry(key.toString(), value));
  return <String, dynamic>{};
}
