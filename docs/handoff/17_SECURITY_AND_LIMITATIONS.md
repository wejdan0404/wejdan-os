> **ملخص**
> القفل على الجهاز يشفّر قيم السجلات بـ AES-GCM بمفتاح بيانات عشوائي مغلَّف بكلمة السر وبرمز الاسترداد (PBKDF2 بـ 310,000 دورة)، وبعد إصلاحات الفحص الثالث صار تفعيله آمنًا على البيانات: القاعدة العادية القديمة ما تنحذف إلا بعد فتح حقيقي ناجح في تشغيل لاحق، وكل ملف شخصي يحمل ترويسة تسمح بإعادة بناء السجل المفقود.
> المشفّر هو قيم السجلات فقط؛ أسماء الجداول والمعرّفات والأعداد وسجل الملفات الشخصية (الاسم، اسم المستخدم، الشكل، الأملاح، المفاتيح المغلَّفة) وبعض مفاتيح الراحة في localStorage تبقى غير مشفّرة، وكذلك القاعدة العادية القديمة طوال فترة الرجوع (rollback).
> هذا حاجز خصوصية محلي وليس حماية ضد برمجيات خبيثة أو XSS أو مهاجم يخمّن كلمة سر ضعيفة دون اتصال. ثغرات npm audit (9) مفتوحة وغير مقيَّمة.

# 17 — Security, privacy and limitations

Updated 2026-10-24 on branch `docs/handoff` (on top of `main` @ `ed0df23`, i.e. after the release-gate-3 fixes). Evidence tags follow `00_HANDOFF_INDEX.md` §4. No secret value appears in this document. Items I could not verify are marked UNKNOWN / NOT VERIFIED.

## 1. Security model in one paragraph

The app is a static, client-only PWA (no backend, no accounts, no network sync; all data lives in the browser's IndexedDB). The optional app lock is a **local privacy barrier** for a shared or borrowed device. It is not an authentication system and has no server-side component. Statement of limits in code (`src/domain/vault/vault.ts` header): it does not defend against malware on the device, XSS in the origin, or a determined offline guesser against a weak password.

## 2. What the lock encrypts (source: `src/domain/vault/*`, `src/domain/storage.ts`)

| Aspect | Verified fact (VERIFIED-NOW: code read) |
|---|---|
| Envelope | One random AES-GCM-256 **data key** per profile. It is wrapped twice: once by a key derived from the password, once by a key derived from the recovery code. Changing the password re-wraps only; data is not re-encrypted |
| KDF | PBKDF2-HMAC-SHA256, `kKdfIterations = 310_000` (`vault/crypto.ts`), random per-secret salt; the iteration count is stored with each wrapped key |
| In memory | After unlock the data key is a **non-extractable** `CryptoKey`; it is dropped on lock |
| Record sealing | Every record **value** is sealed with AES-GCM and a fresh random 12-byte IV; the row address (box + id) is bound as additional authenticated data, so moving a ciphertext to another row fails to open |
| Recovery code | 16 symbols from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I); shown once at setup |
| Brute-force friction | Soft delay stored per profile: 4 free attempts, then waits of 30 s, 60 s, 120 s, 300 s. This is a UI delay, **not** a cryptographic limit: anyone with the stored envelope can try offline at PBKDF2 speed |
| Auto-lock | `immediate` / `min1` (default) / `min5` / `launch` |
| Encrypted export | `wejdan-encrypted-backup` v1 (PBKDF2 + AES-GCM) |
| Damaged rows | A row that fails to open is **quarantined** (kept on disk, skipped, listed in Settings, reason `tamper` or `unreadable`); one bad row no longer blocks the profile. If a profile has nothing readable the store throws `profile-unreadable` and the unreadable-profile screen offers retry, open a backup / import a file, and back |

### 2.1 Durability design added in gate 3 (what makes enabling the lock safe)

Source: `vault.ts` header comment and methods; tests `tests/domain/vaultDurability.test.ts` (75 tests, deterministic crash injection at every step via `VaultHooks.step`), `vaultMigration.test.ts`, `vaultPrivateKeys.test.ts`; e2e `tests/e2e/lockKill.e2e.mjs` (SIGKILL at 150/600/2000/6000 ms). Results: see `13_TESTING_AND_QA.md`.

* **Header row.** Every profile database carries a plaintext **header** in a second Dexie table `vault` (Dexie schema `version(2)`; id `header`): the profile record (salts, wrapped data key, verifier, name, username, avatar, `rev`), an optional `legacy` pointer, and the `deleted` / `retired` tombstone flags. It mirrors the localStorage registry; either store can rebuild the other.
* **Boot recovery.** `Vault.recover()` (once per launch, before any database is opened) rebuilds a lost or partial registry from the headers, repairs a header that is behind, and finishes interrupted deletes / turn-offs. It never deletes a database that could still hold her data.
* **Plain database kept as rollback.** Turning the lock on: automatic `before-lock` backup → copy → read-back compare → write header → write registry (compare-and-set) → fresh-connection proof that the header, the registry and every record decrypt. The pre-lock plain database is **not deleted** in that launch; it is named in `registry.legacy` and deleted only by `finalizeLegacy` after a **real unlock with the new credentials on a later launch**, and only when registry and header agree. Any failure before the registry write leaves everything exactly as it was.
* **Versioned registry.** `rev` is monotonic; every write re-reads the stored copy first and re-applies the mutation on the freshest data (compare-and-set), so a stale tab cannot overwrite another tab's change. `storage` events and a `BroadcastChannel` (`wejdan.vault.registry`) refresh other tabs.
* **Header-first writes.** Change password, new recovery code, add profile, delete profile and turn lock off write the header, then the registry, then read both back. Turning the lock off marks the encrypted DB `retired` before the registry is removed, so a crash cannot resurrect the lock from its header.
* **Durable markers (gate 4, `eed6603`).** Every destructive IndexedDB step is preceded by a durable marker written and read back in the database itself, and a database that carries one is deleted only on a LATER launch, after the registry as it survived on disk no longer lists it. Turn off: plain copy verified, header `retired` written, registry removed; the encrypted DB is kept and removed by the next launch's `recover()` only if the plain DB still holds her data (a plain DB with unexpected data is copied aside first). Delete: mandatory `deleted` tombstone first (abort if it cannot be written), registry, rollback copy and records wiped, empty shell removed later. Enable: `migrating` header before the copy; an abandoned, unreferenced one older than 10 minutes with its plain source still present is removed by `recover()`. A profile whose database is missing is never opened or created empty (`missing` result). Tests: `vaultDurability.test.ts` (75); e2e `lockKill` SIGKILLs turn-off and delete at 100 to 8000 ms (gate 4 and 5 reports, PER-REPORT).
* `navigator.storage.persist()` is requested best-effort when the lock is enabled.
* **Modal setup.** The lock setup overlay (`LockPage` with `portal`) is a real modal dialog: `role=dialog aria-modal`, focus trap, inert background, Escape, focus returned to the opener.

### 2.2 What is NOT encrypted (plaintext residuals — authoritative list is the `vault.ts` header)

| Item | Where | Exposes |
|---|---|---|
| IndexedDB database name, box (table) names, record ids (day keys, generated ids **and** semantic ids such as habit/product ids), record counts, value sizes | IndexedDB | structure and rough volume of data |
| Profile registry **and** the identical header row inside each profile database: display name, username, avatar, KDF salts/cost, wrapped keys; plus (registry only) attempt counter and auto-lock choice | `localStorage` key `wejdan.vault.v1`; table `vault` of each profile DB | who uses the device; the wrapped keys are what an offline guesser attacks |
| **Orphan plain database / `_bak_` copy after a kill about 190 to 220 ms into turning the lock off** | IndexedDB | **everything, in clear, with no automatic cleanup** (gate-5 M1, LOS-040) |
| **The pre-lock plain database** | IndexedDB `wejdan_life_os` | **everything, in clear**, until the first real unlock on a LATER launch deletes it (rollback window; the app tells her nothing about it — see LOS-032) |
| Per-device conveniences: recent searches, unsent review draft, today's pick, focus block, onboarding draft, theme, per-profile reminder memory (reminder ids + snooze times, key `wos.reminders.v1.<profileId>`) | `localStorage` `wejdan.*`, `wos.reminders.v1*` | habits of use. Wiped on manual lock, profile switch and delete (`deviceKeys.ts`), **not on auto-lock**; theme, registry and PWA flags are kept |
| Plain Flutter-era databases of the old app, if any | IndexedDB `wlo_*` | whatever the old app stored; the lock never touches them |
| Anything exported as plain `.json`, `.ics` or text and saved by the user | user's file system | plain content (the unencrypted export option exists next to the encrypted one) |
| Service-worker caches | Cache Storage | only static assets and the neutral library (see §6) |

**Changed since the first draft of this handoff:** her personal action library is **no longer** a plaintext residual while the lock is on — `LifeStore` keeps it as a row in the encrypted database (`meta` / `personalLibrary`); a leftover localStorage copy is moved in, read back, then removed (`settlePersonalLibrary`). With the lock **off** it is still a plaintext `localStorage` key (`wejdan.personalActionLibrary.v1`), as before. `deviceKeys.ts` additionally removes a stray plaintext copy on manual lock/switch/delete. The old mismatch between the `vault.ts` header and the purge list is resolved: reminder memory is per profile and purged; the legacy-migration markers (`wejdan.legacyMigration*`) are not purged and hold no user content (state + timestamp + backup id).

## 3. Threat model

| Threat | Covered? | Notes |
|---|---|---|
| Someone picks up the unlocked phone briefly | Partly | auto-lock default 1 minute; `immediate` available |
| Someone opens the app while locked | Yes | record values are ciphertext; structure/counts visible. **Exception:** during the rollback window the plain pre-lock database is readable (§2.2) |
| Someone copies the browser profile and guesses offline | Only if password is strong | 310k PBKDF2 slows but does not stop; a short or common password falls quickly. Password rule: `isValidPassword` (length-based; see `credentials.ts`) plus a strength meter in the UI. No stronger policy is enforced |
| Malicious extension, malware, or XSS in the origin | No | the unlocked key can be used by any script in the origin. Mitigation present: no `eval`, one `innerHTML` use for static first-party sprite markup (`flowers/sprite.ts`), no third-party scripts at runtime; no CSP (`index.html` has no Content-Security-Policy meta and GitHub Pages cannot set headers) |
| Shoulder surfing | No | not in scope |
| Server breach | NOT APPLICABLE | no server; a grep of `src/` for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` returned no hit when the doc was updated. A full network audit with the app running was not performed |
| Browser killed / storage evicted mid-migration | Covered by design | header/registry mirror + rollback DB + boot recovery; proven by crash-injection tests and a SIGKILL e2e (13) |
| Two tabs writing the registry | Covered | compare-and-set `rev` + `BroadcastChannel` |
| Forgotten password and lost recovery code | Data is unrecoverable by design | the unencrypted/encrypted export is the only backup |
| Side channels, timing, memory forensics | NOT VERIFIED | out of scope |
| Rollback of the registry (restore an old `wejdan.vault.v1`) | Partly | `rev` is monotonic and headers are compared, but an attacker with storage access can still reset the attempt counter (advisory anyway) |

## 4. Residual risks (ordered)

1. **Plaintext pre-lock database during the rollback window** (until the next launch + real unlock). Accepted trade-off for never losing data; not yet disclosed in-app (LOS-032).
2. **Orphan plain DB / `_bak_` after a kill during turn-off** is never cleaned up yet (LOS-040, gate-5 M1). **Missing-data screen is a dead end** with no import or start-fresh action (LOS-041, gate-5 M2); no data is lost, it is a usability gap.
3. **Registry/header metadata is plaintext** (name, username, avatar visible to anyone with the browser profile).
4. **Soft delay is bypassable** offline; only PBKDF2 cost protects the password.
5. **Same-origin exposure**: all project sites of one GitHub account (`<user>.github.io`) are one origin and share `localStorage`/IndexedDB rules; the legacy Flutter site and this app are served from the same origin under different paths, so one can read the other's storage. (Reasoned from how browsers key storage by origin, not tested.)
6. **Plain export files** the user may leave in Downloads or cloud folders.
7. **Plaintext conveniences survive auto-lock** (by design; wiped on manual lock/switch/delete).
8. **Record ids are semantic** (habit/product ids reveal what exists); making ids opaque is a schema change (LOS-034).
9. **Orphaned encrypted databases** are not garbage-collected if a profile row is lost and no header can be parsed (LOS-035).
10. **Auto-lock timers rely on page lifecycle events**; real iOS behaviour is NOT VERIFIED (DEFERRED-BY-OWNER).
11. **Dependency advisories**: `npm audit` reports 9 (see §9).

## 5. Privacy posture of the public bundle and the repo

* The shipped bundle contains a **neutral** action library (`actions.json`: 109 actions + 23 engine rules; `actions_ar.json`) and a neutral starter profile. A check of both files found no owner name, city or `priority_for_her`-style field. They contain generic "IELTS" mentions because IELTS practice is a product feature, not personal data.
* The owner's first name appears only as the app's name «وجدان» (title, manifest, aria-label) and as the `wejdan.*` storage-key prefix.
* **Personal tailoring is imported on-device**: a personal library is chosen through a file import and kept in her own browser (encrypted DB with the lock on, `localStorage` with it off); tests `personalLibrary.test.ts` (4) and `repository.test.ts` guard that the bundle's repository does not ship personal data.
* **Test fixtures are synthetic.** `tests/fixtures/migration/flutter_export_synthetic.json` (+ `flutter_ui_expected.json`) replaced a real-derived export in commit `da4c839`; `tests/domain/fixtures/export_sample.json` was genericised in the same commit. The older commits in the **local** history still contain the real-derived fixture, which is why the public push is a single clean snapshot (`16_DEVELOPMENT_HISTORY.md` §0).
* **`npm run privacy:scan`** (`scripts/privacy-scan.mjs` + generic `scripts/privacy-denylist.txt`; an optional git-ignored local file `privacy-denylist.local.txt` next to it takes owner-specific strings): scans `git ls-files` for token/key patterns, hard-coded credentials, e-mail addresses, Saudi mobile numbers, forbidden file names (`.zip`, `.env`, `.pem`, …) and deny-list literals. It prints locations, never the matched text. Result recorded in `13_TESTING_AND_QA.md` §2.
* Screenshots in this handoff were taken with neutral test data only (`test`).

## 6. PWA and service-worker caching safety

| Fact | Evidence |
|---|---|
| `vite-plugin-pwa` 0.21.1, `registerType: 'prompt'`, `skipWaiting: false`, `clientsClaim: false` — a new worker waits until the user accepts the update prompt | `vite.config.ts` |
| Precache: 139 entries ≈ 2,215 KiB in the final build of this branch; `navigateFallback` = `/wejdan-os/index.html`; `splash/**` is excluded from precache | build output, config |
| Action library is a runtime `CacheFirst` cache named `wejdan-action-library` | config |
| Legacy Flutter files (`flutter.js`, `flutter_bootstrap.js`, `main.dart.js`, `flutter_service_worker.js`) are in `globIgnores`; `flutter_service_worker.js` is a **kill switch** that unregisters the old worker | `public/`, config |
| **No user data in caches**: the lock e2e asserts that no cache entry contains the password, recovery code or username. User data is only in IndexedDB/localStorage, never fetched through the worker | `tests/e2e/lockProfiles.e2e.mjs` |
| Caching is `GET` of same-origin static files only; no authenticated or personalised responses exist because there is no backend | architecture |
| Risk: a stale precache keeps old code until the user accepts the prompt; a bad deploy cannot be hot-fixed for users who never reopen the app | design consequence |

## 7. Repository exposure facts (owner action required; these concern the OLD public `main`, not this branch)

These facts come from a private privacy report and ledger that live **outside the repo (local-only, not published)**; they were **not re-checked against GitHub in this pass**, and their contents are not copied here:

* The GitHub repository `wejdan0404/wejdan-os` is **public**.
* Its `main` branch **still contains the old Flutter code and personal data**; the new React app was developed on a separate line of history.
* A private ops directory of an earlier workflow on that old `main` holds **two live access tokens**. Their values are deliberately not reproduced anywhere in this handoff. **The owner must rotate both tokens**; the ledger says the services they unlock are loopback-only, which reduces but does not remove the risk because they are in a public repository.
* Personal tailoring (a personalised action library) is published in library files on that old `main` and in `gh-pages` history. Deleting files from a branch tip does not remove them from history.
* **How this handoff avoids adding to it:** the React app is to be published as a **single clean snapshot commit** on a new branch (planned name `react-app`; `HANDOFF_MANIFEST.json`), not as the local history, because older local commits contain a real-derived fixture. Whether and how the old `main` is cleaned is the owner's decision (LOS-031); nothing in this branch force-pushes or rewrites anything.

## 8. Secrets and privacy scans of this tree (run 2026-10-24)

* `npm run privacy:scan` — result in `13_TESTING_AND_QA.md` §2 (run on the final tree).
* Additional manual grep over `docs/`, `README.md`, `AGENTS.md`, `CODEX_START_HERE.md` and the screenshot files for e-mail addresses, token shapes, private-file names with content and health/medical specifics — result in `22_COLD_START_AUDIT.md` §6.
* Limits: regex scans, not a full secret scanner (no entropy tool, no git-history scan). The **local history** was not scanned and is not to be published.

## 9. Dependency and code hygiene

* One `innerHTML` assignment (`flowers/sprite.ts`, static first-party SVG). No other raw-HTML sink was found by grep for `innerHTML` and `dangerouslySetInnerHTML`.
* One `console.error` (ErrorBoundary). 0 `@ts-ignore` / `@ts-expect-error`; 24 `eslint-disable` comments; ESLint itself is not runnable (14 B1).
* **`npm audit` (run 2026-10-24, VERIFIED-NOW against `package-lock.json`):** 9 findings — 2 critical (`vitest`, `tinypool`), 5 high (`vite`, `playwright`, `react-router-dom`, `react-router`, `@remix-run/router`), 2 moderate (`@vitest/mocker`, `esbuild`), 0 low. `npm audit --omit=dev` lists only the 3 `react-router*` high findings (runtime dependency; open-redirect advisories). Relevance to a hash-router app with no server redirects was **not assessed**. `fixAvailable: true` for all. No version was changed by this documentation work (LOS-033).
* All `localStorage` accesses sampled are wrapped in try/catch (private-mode safe).

## 10. Licences

| Component | Licence | Verified in |
|---|---|---|
| react, react-dom, react-router-dom, framer-motion, adhan, use-sync-external-store | MIT | each `node_modules/*/package.json` |
| dexie | Apache-2.0 | package.json |
| `@fontsource/ibm-plex-sans-arabic`, `@fontsource/el-messiri` (and the third fontsource package) | OFL-1.1 | package.json |
| ical.js, `@resvg/resvg-js` | MPL-2.0 (dev only, not bundled) | package.json |
| This project | **No `LICENSE` file** — all rights reserved by default; owner must decide | `git ls-files` |
| OFL notice for redistributed fonts | **Absent from `dist`** (14 B5) | grep on `dist` |
| Transitive dependencies | NOT VERIFIED | no licence scan run |
| The W mark, flowers, star, illustrations | first-party artwork by the owner/design process; no third-party artwork identified. Provenance of the Claude Design canvas assets: NOT VERIFIED here | 09 §4 |
| Thmanyah font | **Not used** and not present (approved decision D-12, supersedes the generic master prompt) | 09 §1, 15 |

## 11. Recommended order of work

1. Owner rotates the two exposed tokens (no code change) and decides about the old `main` (LOS-030, LOS-031).
2. Publish the clean snapshot only after the integrator has run `npm run privacy:scan` on the exact tree (playbook 20 §6).
3. Disclose the rollback window in-app and decide whether to shorten it (LOS-032); add a cleanup path for the orphan plain database / `_bak_` copy (LOS-040) and a way forward from the missing-data screen (LOS-041).
4. Upgrade the `react-router*` runtime dependency within 6.x and re-test; decide on the dev-tool advisories (LOS-033).
5. Add OFL notices + LICENSE (LOS-036); add a secrets scanner and `npm audit` to CI if CI is approved (LOS-009).
