/// Provider-neutral account sync contracts.
///
/// These types do not connect to a service or authorize cloud processing. A
/// future gateway must derive account scope from its authenticated session;
/// mutation payloads deliberately contain no client-selected account ID.
library;

enum SyncMutationKind { upsert, delete }

enum SyncDataClass { general, financial, sensitiveHealth }

class SyncMutation {
  SyncMutation({
    required this.operationId,
    required this.collection,
    required this.recordId,
    required this.schemaVersion,
    required this.baseRevision,
    required this.updatedAt,
    required this.kind,
    required this.dataClass,
    this.payload,
  }) {
    _validate();
  }

  final String operationId;
  final String collection;
  final String recordId;
  final int schemaVersion;
  final int? baseRevision;
  final DateTime updatedAt;
  final SyncMutationKind kind;
  final SyncDataClass dataClass;
  final Map<String, Object?>? payload;

  void _validate() {
    if (operationId.trim().isEmpty ||
        collection.trim().isEmpty ||
        recordId.trim().isEmpty) {
      throw ArgumentError(
        'operationId, collection, and recordId must be non-empty',
      );
    }
    if (schemaVersion < 1 || (baseRevision != null && baseRevision! < 0)) {
      throw ArgumentError(
        'schemaVersion must be positive and baseRevision cannot be negative',
      );
    }
    if (kind == SyncMutationKind.upsert && payload == null) {
      throw ArgumentError('upsert requires a payload');
    }
    if (kind == SyncMutationKind.delete && payload != null) {
      throw ArgumentError('delete cannot contain a payload');
    }
  }

  Map<String, Object?> toJson() => {
    'operationId': operationId,
    'collection': collection,
    'recordId': recordId,
    'schemaVersion': schemaVersion,
    'baseRevision': baseRevision,
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'kind': kind.name,
    'dataClass': dataClass.name,
    'payload': payload,
  };

  factory SyncMutation.fromJson(Map<String, Object?> json) {
    return SyncMutation(
      operationId: _requiredString(json, 'operationId'),
      collection: _requiredString(json, 'collection'),
      recordId: _requiredString(json, 'recordId'),
      schemaVersion: _requiredInt(json, 'schemaVersion'),
      baseRevision: json['baseRevision'] as int?,
      updatedAt: DateTime.parse(_requiredString(json, 'updatedAt')),
      kind: _enumValue(
        SyncMutationKind.values,
        _requiredString(json, 'kind'),
        'kind',
      ),
      dataClass: _enumValue(
        SyncDataClass.values,
        _requiredString(json, 'dataClass'),
        'dataClass',
      ),
      payload: _optionalObject(json['payload']),
    );
  }
}

sealed class _SyncOutcome {
  const _SyncOutcome();

  String get operationId;
  String get recordId;
}

class SyncAcknowledgement extends _SyncOutcome {
  const SyncAcknowledgement({
    required this.operationId,
    required this.recordId,
    required this.serverRevision,
  });

  @override
  final String operationId;
  @override
  final String recordId;
  final int serverRevision;
}

class SyncConflict extends _SyncOutcome {
  const SyncConflict({
    required this.operationId,
    required this.recordId,
    required this.remoteRevision,
    required this.remoteDeleted,
    this.remotePayload,
  });

  @override
  final String operationId;
  @override
  final String recordId;
  final int remoteRevision;
  final bool remoteDeleted;
  final Map<String, Object?>? remotePayload;
}

class SyncRejection extends _SyncOutcome {
  const SyncRejection({
    required this.operationId,
    required this.recordId,
    required this.code,
    required this.retryable,
  });

  @override
  final String operationId;
  @override
  final String recordId;
  final String code;
  final bool retryable;
}

/// Server response to one push batch. Every submitted operation must have
/// exactly one explicit accepted, conflicted, or rejected outcome.
class SyncPushResult {
  const SyncPushResult({
    required this.accepted,
    required this.conflicts,
    required this.rejected,
    this.nextCursor,
  });

  final List<SyncAcknowledgement> accepted;
  final List<SyncConflict> conflicts;
  final List<SyncRejection> rejected;
  final String? nextCursor;

  void validateAgainst(Iterable<SyncMutation> submitted) {
    final expected = <String, String>{};
    for (final mutation in submitted) {
      if (expected.containsKey(mutation.operationId)) {
        throw const FormatException('duplicate submitted operationId');
      }
      expected[mutation.operationId] = mutation.recordId;
    }

    final results = <String, String>{};
    final outcomes = <_SyncOutcome>[...accepted, ...conflicts, ...rejected];
    for (final outcome in outcomes) {
      final expectedRecord = expected[outcome.operationId];
      if (expectedRecord == null) {
        throw const FormatException('response contains an unknown operationId');
      }
      if (expectedRecord != outcome.recordId) {
        throw const FormatException(
          'response recordId does not match operation',
        );
      }
      if (results.containsKey(outcome.operationId)) {
        throw const FormatException('operation has multiple outcomes');
      }
      results[outcome.operationId] = outcome.recordId;
    }
    if (results.length != expected.length) {
      throw const FormatException('response omits an operation outcome');
    }
    for (final acknowledgement in accepted) {
      if (acknowledgement.serverRevision < 1) {
        throw const FormatException('serverRevision must be positive');
      }
    }
    for (final conflict in conflicts) {
      if (conflict.remoteRevision < 1) {
        throw const FormatException('remoteRevision must be positive');
      }
      if (conflict.remoteDeleted == (conflict.remotePayload != null)) {
        throw const FormatException(
          'remote payload must be present only for a non-deleted record',
        );
      }
    }
    for (final rejection in rejected) {
      if (rejection.code.trim().isEmpty) {
        throw const FormatException('rejection code must be non-empty');
      }
    }
  }
}

class SyncRemoteRecord {
  const SyncRemoteRecord({
    required this.collection,
    required this.recordId,
    required this.schemaVersion,
    required this.revision,
    required this.updatedAt,
    required this.deleted,
    this.payload,
  });

  final String collection;
  final String recordId;
  final int schemaVersion;
  final int revision;
  final DateTime updatedAt;
  final bool deleted;
  final Map<String, Object?>? payload;
}

class SyncPullPage {
  SyncPullPage({
    required this.records,
    required this.hasMore,
    this.nextCursor,
  }) {
    if (hasMore && (nextCursor == null || nextCursor!.isEmpty)) {
      throw ArgumentError('a page with more records requires a cursor');
    }
    for (final record in records) {
      if (record.collection.isEmpty ||
          record.recordId.isEmpty ||
          record.schemaVersion < 1 ||
          record.revision < 1) {
        throw ArgumentError(
          'remote record identity, schema version, and revision must be valid',
        );
      }
      if (record.deleted == (record.payload != null)) {
        throw ArgumentError(
          'remote payload must be present only for a non-deleted record',
        );
      }
    }
    final keys = records
        .map((record) => '${record.collection}\u0000${record.recordId}')
        .toSet();
    if (keys.length != records.length) {
      throw ArgumentError('a page cannot repeat a record');
    }
  }

  final List<SyncRemoteRecord> records;
  final bool hasMore;
  final String? nextCursor;
}

/// The gateway implementation must use a verified session for account scope.
/// There is intentionally no `accountId` argument on any operation.
abstract interface class AccountSyncGateway {
  Future<SyncPushResult> push(List<SyncMutation> mutations);

  Future<SyncPullPage> pull({String? cursor});
}

/// Persistent outbox port. A concrete store must encrypt locally queued user
/// content and preserve entries until an explicit accepted/conflict/rejection
/// outcome is durably recorded.
abstract interface class SyncOutbox {
  Future<void> enqueue(SyncMutation mutation);

  Future<List<SyncMutation>> pending({required int limit});

  Future<void> recordResult(
    SyncPushResult result,
    List<SyncMutation> submitted,
  );
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('$key must be a non-empty string');
}

int _requiredInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw FormatException('$key must be an integer');
}

Map<String, Object?>? _optionalObject(Object? value) {
  if (value == null) return null;
  if (value is Map<String, Object?>) return value;
  if (value is Map) {
    return value.map((key, value) => MapEntry(key.toString(), value));
  }
  throw const FormatException('payload must be an object or null');
}

T _enumValue<T extends Enum>(List<T> values, String value, String key) {
  for (final candidate in values) {
    if (candidate.name == value) return candidate;
  }
  throw FormatException('unknown $key');
}
