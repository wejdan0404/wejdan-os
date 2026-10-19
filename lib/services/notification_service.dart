import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../core/date_utils.dart';
import '../data/models/models.dart' hide Priority;
import '../engine/reminders.dart';
import '../engine/why_today.dart';

export '../engine/reminders.dart'
    show
        NotificationService,
        NoopNotificationService,
        NudgeAction,
        NudgeActionType;

/// Selects a native notification service where the plugin is supported.
NotificationService createNotificationService() {
  if (kIsWeb) return NoopNotificationService();
  return switch (defaultTargetPlatform) {
    TargetPlatform.iOS => IosNotificationService(),
    TargetPlatform.android => AndroidNotificationService(),
    _ => NoopNotificationService(),
  };
}

/// iOS implementation over `flutter_local_notifications` and `timezone`.
class IosNotificationService extends DeviceNotificationService {
  IosNotificationService({super.plugin}) : super(platform: TargetPlatform.iOS);
}

/// Android implementation over `flutter_local_notifications` and `timezone`.
class AndroidNotificationService extends DeviceNotificationService {
  AndroidNotificationService({super.plugin})
    : super(platform: TargetPlatform.android);
}

/// Shared schedule/callback handling for native notification implementations.
/// Android schedules inexact reminders and does not request exact-alarm access.
class DeviceNotificationService implements NotificationService {
  DeviceNotificationService({
    required this.platform,
    FlutterLocalNotificationsPlugin? plugin,
  }) : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final TargetPlatform platform;
  final FlutterLocalNotificationsPlugin _plugin;
  bool _tzReady = false;

  void _ensureTz(String name) {
    if (!_tzReady) {
      tzdata.initializeTimeZones();
      _tzReady = true;
    }
    try {
      tz.setLocalLocation(tz.getLocation(name));
    } catch (_) {
      tz.setLocalLocation(tz.getLocation('Asia/Riyadh'));
    }
  }

  @override
  Future<void> init({void Function(NudgeAction action)? onAction}) async {
    final category = DarwinNotificationCategory(
      kNudgeCategoryId,
      actions: [
        DarwinNotificationAction.plain(
          kActionDone,
          engineText('nudgeActionDone').ar,
        ),
        DarwinNotificationAction.plain(
          kActionSnooze,
          engineText('nudgeActionSnooze').ar,
        ),
        DarwinNotificationAction.plain(
          kActionSkip,
          engineText('nudgeActionSkip').ar,
        ),
      ],
    );
    await _plugin.initialize(
      settings: InitializationSettings(
        iOS: platform == TargetPlatform.iOS
            ? DarwinInitializationSettings(
                requestAlertPermission: false,
                requestBadgePermission: false,
                requestSoundPermission: false,
                notificationCategories: [category],
              )
            : null,
        android: platform == TargetPlatform.android
            ? const AndroidInitializationSettings('ic_notification')
            : null,
      ),
      onDidReceiveNotificationResponse: (response) {
        final type = switch (response.actionId) {
          kActionDone => NudgeActionType.done,
          kActionSnooze => NudgeActionType.snooze,
          kActionSkip => NudgeActionType.skip,
          _ => NudgeActionType.open,
        };
        onAction?.call(
          NudgeAction(
            type: type,
            payload: NudgePayload.parse(response.payload),
          ),
        );
      },
    );
  }

  @override
  Future<bool> requestPermission() async {
    if (platform == TargetPlatform.android) {
      final android = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      return await android?.requestNotificationsPermission() ?? false;
    }
    final ios = _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    return await ios?.requestPermissions(
          alert: true,
          sound: true,
          badge: false,
        ) ??
        false;
  }

  NotificationDetails _details(ScheduledNudge n, AppLanguage language) =>
      NotificationDetails(
        iOS: platform == TargetPlatform.iOS
            ? DarwinNotificationDetails(
                categoryIdentifier: n.actionable ? kNudgeCategoryId : null,
              )
            : null,
        android: platform == TargetPlatform.android
            ? AndroidNotificationDetails(
                language == AppLanguage.ar
                    ? 'wejdan_reminders_ar'
                    : 'wejdan_reminders_en',
                language == AppLanguage.ar
                    ? 'تذكيرات وجدان'
                    : 'Wejdan reminders',
                channelDescription: language == AppLanguage.ar
                    ? 'تذكيرات الخطة اليومية'
                    : 'Daily plan reminders',
                importance: Importance.defaultImportance,
                priority: Priority.defaultPriority,
                icon: 'ic_notification',
                actions: n.actionable
                    ? [
                        AndroidNotificationAction(
                          kActionDone,
                          engineText('nudgeActionDone').of(language),
                          showsUserInterface: true,
                        ),
                        AndroidNotificationAction(
                          kActionSnooze,
                          engineText('nudgeActionSnooze').of(language),
                          showsUserInterface: true,
                        ),
                        AndroidNotificationAction(
                          kActionSkip,
                          engineText('nudgeActionSkip').of(language),
                          showsUserInterface: true,
                        ),
                      ]
                    : const [],
              )
            : null,
      );

  tz.TZDateTime _at(String date, int minute) {
    final day = parseDayKey(date);
    return tz.TZDateTime(
      tz.local,
      day.year,
      day.month,
      day.day,
      minute ~/ 60,
      minute % 60,
    );
  }

  @override
  Future<void> scheduleDay(
    List<ScheduledNudge> nudges, {
    required AppLanguage language,
    required String timeZoneName,
  }) async {
    _ensureTz(timeZoneName);
    await _plugin.cancelAllPendingNotifications();
    final now = tz.TZDateTime.now(tz.local);
    for (final nudge in nudges) {
      final when = _at(nudge.date, nudge.minute);
      if (!when.isAfter(now)) continue;
      await _plugin.zonedSchedule(
        id: nudge.id,
        scheduledDate: when,
        notificationDetails: _details(nudge, language),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        title: nudge.title.of(language),
        body: nudge.body.of(language),
        payload: nudge.payload,
      );
    }
  }

  @override
  Future<void> snooze(
    ScheduledNudge nudge, {
    required AppLanguage language,
    required String timeZoneName,
  }) async {
    _ensureTz(timeZoneName);
    final when = tz.TZDateTime.now(tz.local)
        .add(const Duration(minutes: kSnoozeMinutes));
    await _plugin.zonedSchedule(
      id: nudge.id,
      scheduledDate: when,
      notificationDetails: _details(nudge, language),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      title: nudge.title.of(language),
      body: nudge.body.of(language),
      payload: nudge.payload,
    );
  }

  @override
  Future<void> cancelAll() => _plugin.cancelAll();
}
