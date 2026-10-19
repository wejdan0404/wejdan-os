import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:local_auth/local_auth.dart';
import 'package:share_plus/share_plus.dart';

/// Optional Face ID lock for sensitive modules (spec §1 Privacy).
abstract class AppLockService {
  Future<bool> isAvailable();

  /// Returns true when unlocked (or when no lock is available).
  Future<bool> unlock({required String reason});
}

AppLockService createAppLockService() {
  if (!kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.iOS ||
          defaultTargetPlatform == TargetPlatform.android)) {
    return LocalAuthAppLock();
  }
  return const NoopAppLock();
}

class LocalAuthAppLock implements AppLockService {
  LocalAuthAppLock({LocalAuthentication? auth})
    : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  @override
  Future<bool> isAvailable() async {
    try {
      return await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> unlock({required String reason}) async {
    try {
      return await _auth.authenticate(localizedReason: reason);
    } catch (_) {
      return false;
    }
  }
}

/// Web / tests: no lock.
class NoopAppLock implements AppLockService {
  const NoopAppLock();

  @override
  Future<bool> isAvailable() async => false;

  @override
  Future<bool> unlock({required String reason}) async => true;
}

/// Shares an export JSON through the iOS share sheet (spec §1: export via
/// share sheet). On web it falls back to the Web Share API when available.
abstract class ExportShareService {
  Future<bool> shareJson(Map<String, dynamic> data, {String fileName});
}

ExportShareService createExportShareService() => const SharePlusExportService();

class SharePlusExportService implements ExportShareService {
  const SharePlusExportService();

  @override
  Future<bool> shareJson(
    Map<String, dynamic> data, {
    String fileName = 'wejdan_life_os_export.json',
  }) async {
    final bytes = Uint8List.fromList(
      utf8.encode(const JsonEncoder.withIndent('  ').convert(data)),
    );
    try {
      final res = await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(bytes, mimeType: 'application/json', name: fileName),
          ],
          fileNameOverrides: [fileName],
        ),
      );
      return res.status == ShareResultStatus.success;
    } catch (_) {
      return false;
    }
  }
}
