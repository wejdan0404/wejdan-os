import '../core/date_utils.dart';
import '../data/repository.dart';
import '../data/seed/seed_library.dart';
import '../data/seed/starter_profile.dart';

/// Opens [repo] and seeds it on first run from [loadSeedJson]
/// (`assets/data/actions.json`) + [loadArJson] (`assets/data/actions_ar.json`).
/// On later launches the read-only library is refreshed once when the
/// shipped version is newer (adds Arabic content to older installs).
/// Safe to call on every launch.
Future<LifeRepository> bootstrapRepository({
  required LifeRepository repo,
  required Future<String> Function() loadSeedJson,
  Future<String> Function()? loadArJson,
  required DateTime now,
}) async {
  await repo.open();
  if (!await repo.isSeeded()) {
    final ar = loadArJson == null ? null : await loadArJson();
    await repo.seed(SeedBundle.build(await loadSeedJson(), dateOnly(now), arJson: ar));
  } else if (loadArJson != null && await repo.libraryOutdated()) {
    await repo.refreshLibrary(SeedLibrary.parse(await loadSeedJson(), arRaw: await loadArJson()));
  }
  return repo;
}
