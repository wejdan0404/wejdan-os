# WORKBOOK QA — WEJDAN_LIFE_OS_MASTER_v2.xlsx

Date: 2026-09-28. Built by `wb/build_v2.py` from `MASTER_source.xlsx`. Recalculated with LibreOffice through the xlsx skill's `recalc.py`, then patched by `wb/patch_bool.py`, then verified by `wb/verify_v2.py`.

## Result

| Check | Result |
|---|---|
| recalc.py | status success, total_errors 0 |
| Formula cells (openpyxl count) | 897. All have cached values. 0 are #REF!, #VALUE!, #NAME?, #DIV/0!, #N/A, #NUM! or #NULL! |
| Sheets | 32: README first, 8 new sheets, all 23 original sheets kept |
| Original cells changed | 7, all intended: 4 ID corrections, 1 DOI added (D-003, previously blank), 2 superseded notes in blank row 3 |
| LibreOffice artefact | LibreOffice rewrote 509 literal booleans in Claim Extraction Queue col O as `=FALSE()`. The patch put the literals back. A cell-by-cell diff against the source now shows no other changes. |
| File re-opens in LibreOffice | yes (CSV export OK) |

## Live formula counts vs TRIAGE_REPORT.md (Library Audit "Check" column: all OK)

- Verification: MATCH 500 (124 curated / 376 R2), MISMATCH 4, UNVERIFIABLE_ID 5, CHECK 0. Total 509.
- Relevance: DIRECT 88 (53/35), TRANSFERABLE 119 (46/73), CONDITIONAL 113 (31/82), OFF_POPULATION 145 (1/144), OFF_TOPIC 44 (1/43).
- Use In App: Yes 207, Conditional 113, No 189.
- R2 roles (108 usable rows): Core 6, Supporting 56, Emerging 37, Contradictory 9.

## Sheets and row counts

| Sheet | Rows | Notes |
|---|---|---|
| Evidence Index | 509 × 60 cols | AX–BH added. Autofilter A1:BH510, freeze B2. Conditional formatting on Relevance, Use In App and Verify Status |
| Library Audit | 7 sections | Decision line, verification, relevance × batch, Use In App, roles, Maps To, ID fixes, 10 data-quality issues |
| Action Library | 112 × 26 | Order BODY → FOOD → GROW → LIFE → JOY. Source Count is a live formula |
| Engine Rules | 23 | Every mechanism's build file exists in `wejdan_life_os/lib/engine` |
| Action Sources | 269 | 193 OK (PMID/DOI re-verified), 76 URL (fetched by an agent) |
| App Blueprint | 63 | 1 canvas, 5 tabs, 6 overlays, 28 screens (Designed), 23 features (18 In build, 5 Designed) |
| Joy & Rewards | 10 | Sparks numbers are build constants from `sparks.dart`, labelled as such |
| App Requirements | 33 | 21 FR + 12 NFR (27 Must, 6 Should) |
| Year Roadmap | 17 | Q1–Q4 × domain. No fixed dates or band targets |
| Control Center | +14 metrics from row 22 | All formulas |
| Quality Checks | +10 checks from row 19 | Relevance screened PASS. Verification PASS. Unresolved mismatches 0 PASS. Excluded rows marked No PASS. Evidence-graded actions without a source 0 PASS. Sources unverified 0 PASS. Size checks PASS. 2 INFO rows |

## Findings to know

1. **4 actions have no source**: LIFE-01, LIFE-11, LIFE-15, JOY-12. The research agents chose this. They are all labelled Expert consensus and are practical, low-risk items. For LIFE-01 the official Saudi licence pages could not be reached, so it carries no hour counts. Quality Checks lists these 4 as INFO and does not fail them.
2. **Spec citation error**: PRODUCT_SPEC §4 cites ENG-10 for fresh-start suggestions. ENG-10 is self-monitoring; the fresh-start action is JOY-10. This is noted in Engine Rules and App Blueprint (F14).
3. **Recoverable IDs not applied**: B-003, G-001 and I-002 have recoverable IDs (listed in ID Fix and Library Audit §6). Only the 4 mismatches were corrected, as scoped.
4. **Unreviewed extraction**: 183 R2 Key Result cells are automatic extraction and are marked "[auto-extracted, unreviewed]". The 108 usable R2 rows were extracted by hand and match dt.txt exactly.
5. **"In build" is a narrow status**: it means only that the engine or platform source file exists in the Flutter project. It does not mean the file is tested or shipped.
