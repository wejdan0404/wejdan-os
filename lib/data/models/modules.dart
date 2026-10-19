import 'enums.dart';
import 'json_utils.dart';

/// IELTS vocabulary flashcard with SM-2 style state (GROW-07).
class VocabCard {
  const VocabCard({
    required this.id,
    required this.front,
    required this.back,
    this.example = '',
    this.ease = 2.5,
    this.intervalDays = 0,
    this.repetitions = 0,
    required this.due,
    this.lapses = 0,
    this.lastReviewed,
  });

  factory VocabCard.fromJson(Json j) => VocabCard(
        id: jStr(j, 'id'),
        front: jStr(j, 'front'),
        back: jStr(j, 'back'),
        example: jStr(j, 'example'),
        ease: jDouble(j, 'ease', 2.5),
        intervalDays: jInt(j, 'intervalDays'),
        repetitions: jInt(j, 'repetitions'),
        due: jStr(j, 'due'),
        lapses: jInt(j, 'lapses'),
        lastReviewed: jStrN(j, 'lastReviewed'),
      );

  final String id;
  final String front;
  final String back;
  final String example;
  final double ease;
  final int intervalDays;
  final int repetitions;

  /// Day key when the card is next due.
  final String due;
  final int lapses;
  final String? lastReviewed;

  VocabCard copyWith({
    double? ease,
    int? intervalDays,
    int? repetitions,
    String? due,
    int? lapses,
    String? lastReviewed,
  }) =>
      VocabCard(
        id: id,
        front: front,
        back: back,
        example: example,
        ease: ease ?? this.ease,
        intervalDays: intervalDays ?? this.intervalDays,
        repetitions: repetitions ?? this.repetitions,
        due: due ?? this.due,
        lapses: lapses ?? this.lapses,
        lastReviewed: lastReviewed ?? this.lastReviewed,
      );

  Json toJson() => {
        'id': id,
        'front': front,
        'back': back,
        'example': example,
        'ease': ease,
        'intervalDays': intervalDays,
        'repetitions': repetitions,
        'due': due,
        'lapses': lapses,
        'lastReviewed': lastReviewed,
      };
}

/// IELTS mock test with band per skill (she enters bands; nothing invented).
class MockTest {
  const MockTest({
    required this.id,
    required this.date,
    this.reading,
    this.listening,
    this.writing,
    this.speaking,
    this.note = '',
  });

  factory MockTest.fromJson(Json j) => MockTest(
        id: jStr(j, 'id'),
        date: jStr(j, 'date'),
        reading: jDoubleN(j, 'reading'),
        listening: jDoubleN(j, 'listening'),
        writing: jDoubleN(j, 'writing'),
        speaking: jDoubleN(j, 'speaking'),
        note: jStr(j, 'note'),
      );

  final String id;
  final String date;
  final double? reading;
  final double? listening;
  final double? writing;
  final double? speaking;
  final String note;

  /// Weakest skill among entered bands (re-weights rotation day, GROW-12).
  IeltsSkill? get weakest {
    final m = <IeltsSkill, double>{
      IeltsSkill.reading: ?reading,
      IeltsSkill.listening: ?listening,
      IeltsSkill.writing: ?writing,
      IeltsSkill.speaking: ?speaking,
    };
    if (m.isEmpty) return null;
    return (m.entries.toList()..sort((a, b) => a.value.compareTo(b.value))).first.key;
  }

  Json toJson() => {
        'id': id,
        'date': date,
        'reading': reading,
        'listening': listening,
        'writing': writing,
        'speaking': speaking,
        'note': note,
      };
}

/// Supervised driving practice log entry.
class DrivingSession {
  const DrivingSession({
    required this.id,
    required this.date,
    required this.minutes,
    this.conditions = const [],
    this.supervised = true,
    this.kind = 'practice',
    this.note = '',
  });

  factory DrivingSession.fromJson(Json j) => DrivingSession(
        id: jStr(j, 'id'),
        date: jStr(j, 'date'),
        minutes: jInt(j, 'minutes'),
        conditions: jStrList(j, 'conditions'),
        supervised: jBool(j, 'supervised', true),
        kind: jStr(j, 'kind', 'practice'),
        note: jStr(j, 'note'),
      );

  final String id;
  final String date;
  final int minutes;

  /// e.g. `night`, `highway`, `traffic`, `parking`.
  final List<String> conditions;
  final bool supervised;

  /// `practice`, `lesson`, `hazardPerception`, `theory`.
  final String kind;
  final String note;

  Json toJson() => {
        'id': id,
        'date': date,
        'minutes': minutes,
        'conditions': conditions,
        'supervised': supervised,
        'kind': kind,
        'note': note,
      };
}

/// Monthly spending envelope (manual, Money lite).
class MoneyEnvelope {
  const MoneyEnvelope({
    required this.id,
    required this.titleAr,
    required this.titleEn,
    required this.month,
    this.planned = 0,
    this.spent = 0,
  });

  factory MoneyEnvelope.fromJson(Json j) => MoneyEnvelope(
        id: jStr(j, 'id'),
        titleAr: jStr(j, 'titleAr'),
        titleEn: jStr(j, 'titleEn'),
        month: jStr(j, 'month'),
        planned: jDouble(j, 'planned'),
        spent: jDouble(j, 'spent'),
      );

  final String id;
  final String titleAr;
  final String titleEn;

  /// `yyyy-MM`.
  final String month;
  final double planned;
  final double spent;

  double get remaining => planned - spent;

  Json toJson() =>
      {'id': id, 'titleAr': titleAr, 'titleEn': titleEn, 'month': month, 'planned': planned, 'spent': spent};
}

/// Bill or subscription with a monthly due day.
class Bill {
  const Bill({
    required this.id,
    required this.title,
    required this.amount,
    required this.dueDay,
    this.isSubscription = false,
    this.active = true,
  });

  factory Bill.fromJson(Json j) => Bill(
        id: jStr(j, 'id'),
        title: jStr(j, 'title'),
        amount: jDouble(j, 'amount'),
        dueDay: jInt(j, 'dueDay', 1),
        isSubscription: jBool(j, 'isSubscription'),
        active: jBool(j, 'active', true),
      );

  final String id;
  final String title;
  final double amount;

  /// Day of month 1–31.
  final int dueDay;
  final bool isSubscription;
  final bool active;

  Json toJson() => {
        'id': id,
        'title': title,
        'amount': amount,
        'dueDay': dueDay,
        'isSubscription': isSubscription,
        'active': active,
      };
}

/// Buy-now-pay-later plan with instalment due dates.
class BnplItem {
  const BnplItem({
    required this.id,
    required this.title,
    required this.provider,
    required this.instalmentAmount,
    this.dueDates = const [],
    this.paidDates = const [],
  });

  factory BnplItem.fromJson(Json j) => BnplItem(
        id: jStr(j, 'id'),
        title: jStr(j, 'title'),
        provider: jStr(j, 'provider'),
        instalmentAmount: jDouble(j, 'instalmentAmount'),
        dueDates: jStrList(j, 'dueDates'),
        paidDates: jStrList(j, 'paidDates'),
      );

  final String id;
  final String title;
  final String provider;
  final double instalmentAmount;
  final List<String> dueDates;
  final List<String> paidDates;

  /// Next unpaid due date (day key) or null.
  String? get nextDue {
    for (final d in dueDates) {
      if (!paidDates.contains(d)) return d;
    }
    return null;
  }

  Json toJson() => {
        'id': id,
        'title': title,
        'provider': provider,
        'instalmentAmount': instalmentAmount,
        'dueDates': dueDates,
        'paidDates': paidDates,
      };
}

/// Wishlist item with a cooling-off timer.
class WishItem {
  const WishItem({
    required this.id,
    required this.title,
    required this.addedDate,
    this.price,
    this.coolingOffDays = 7,
    this.decision,
  });

  factory WishItem.fromJson(Json j) => WishItem(
        id: jStr(j, 'id'),
        title: jStr(j, 'title'),
        addedDate: jStr(j, 'addedDate'),
        price: jDoubleN(j, 'price'),
        coolingOffDays: jInt(j, 'coolingOffDays', 7),
        decision: jStrN(j, 'decision'),
      );

  final String id;
  final String title;
  final String addedDate;
  final double? price;

  /// Her chosen waiting period (editable).
  final int coolingOffDays;

  /// null (waiting), `bought`, `dropped`.
  final String? decision;

  Json toJson() => {
        'id': id,
        'title': title,
        'addedDate': addedDate,
        'price': price,
        'coolingOffDays': coolingOffDays,
        'decision': decision,
      };
}

/// Documents & renewals register (ID, licence, insurance…).
class AdminDoc {
  const AdminDoc({
    required this.id,
    required this.name,
    this.expiry,
    this.remindDaysBefore = 30,
    this.note = '',
  });

  factory AdminDoc.fromJson(Json j) => AdminDoc(
        id: jStr(j, 'id'),
        name: jStr(j, 'name'),
        expiry: jStrN(j, 'expiry'),
        remindDaysBefore: jInt(j, 'remindDaysBefore', 30),
        note: jStr(j, 'note'),
      );

  final String id;
  final String name;

  /// Day key.
  final String? expiry;
  final int remindDaysBefore;
  final String note;

  Json toJson() =>
      {'id': id, 'name': name, 'expiry': expiry, 'remindDaysBefore': remindDaysBefore, 'note': note};
}
