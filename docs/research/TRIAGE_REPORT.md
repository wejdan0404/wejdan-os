# Evidence Library Triage Report

Scope: 509 rows in `MASTER_source.xlsx` › Evidence Index (377 WLO-R2 bulk-added, 132 curated). Checked 2026-09-28 against PubMed E-utilities (esummary/efetch) and Crossref. Output: `triage.csv`.

## 1. Verification

| Status | Curated | R2 | Total |
|---|---|---|---|
| MATCH | 124 | 376 | 500 |
| CHECK | 0 | 0 | 0 |
| MISMATCH | 4 | 0 | 4 |
| UNVERIFIABLE_ID | 4 | 1 | 5 |

Method: 440 PMIDs were checked in batches of up to 200 with esummary. 64 DOI-only rows were checked through Crossref. Titles were compared after normalization (≥0.8 = MATCH). No row scored in the 0.5–0.8 CHECK band. Every mismatch scored below 0.35 and was confirmed by reading it.

### MISMATCH (wrong identifier in the sheet; the paper itself exists)

| Study ID | Problem and fix |
|---|---|
| WLO-D-003 | Sheet PMID 35742152 resolves to an unrelated paper (lateral elbow pain); correct PMID 35742582 (Int J Environ Res Public Health 2022; DOI 10.3390/ijerph19127337) confirmed by title [verified_title/year/journal columns show the paper the WRONG ID resolves to] |
| WLO-J-003 | Sheet DOI 10.1007/s10648-019-09492-2 resolves to a different paper (diagnostic competences MA); correct DOI 10.1007/s10648-020-09572-8 (Latimier et al., Educ Psychol Rev, online 2020, issue 2021) [verified_title/year/journal columns show the paper the WRONG ID resolves to] |
| WLO-AG-002 | Sheet PMID 38617893 resolves to an unrelated paper (paranasal sinus infections); correct PMID 38629035 (Front Psychol 2024) matches sheet DOI [verified_title/year/journal columns show the paper the WRONG ID resolves to] |
| WLO-AK-003 | Sheet PMID 34242217 resolves to an unrelated paper (skin topography); correct PMID 34237109 (PLoS One 2021); sheet DOI correct [verified_title/year/journal columns show the paper the WRONG ID resolves to] |

All 4 are curated rows. The title, authors and year in the sheet are correct; only the identifier is wrong. Fix the PMID/DOI in the source.


### UNVERIFIABLE_ID (no PMID or DOI in the sheet)

| Study ID | Resolution |
|---|---|
| WLO-B-003 | URL PMC9150741 resolves (idconv) to PMID 35651575 / DOI 10.3389/fpsyg.2022.853879; title matches; add IDs |
| WLO-G-001 | DOI in URL (10.1080/17437199.2023.2248222) verified via Crossref; PMID 37578065; PubMed issue year 2024; add IDs |
| WLO-I-002 | DOI in URL (10.1016/j.edurev.2017.08.004) verified via Crossref (Educ Res Rev 2017); no PubMed record; add DOI |
| WLO-ER-002 | NICE CG78 guideline (URL only); not indexed; acceptable as grey literature |
| WLO-R2-0259 | URL PMC9193430 resolves to DOI 10.1093/cdn/nzac060.054 = conference abstract (Current Developments in Nutrition supplement); First Author "Not extracted"; no PMID |

### Year / journal disagreements (MATCH rows)

| Study ID | Issue |
|---|---|
| WLO-A-004 | year sheet=2010 verified=2009 |
| WLO-L-002 | year sheet=2024 verified=2023 |
| WLO-N-002 | year sheet=2022 verified=2021 |
| WLO-N-003 | year sheet=2026 verified=2025 |
| WLO-C-002 | year sheet=2019 verified=2018 |
| WLO-I-003 | year sheet=2023 verified=2022 |
| WLO-AS-001 | year sheet=2026 verified=2025 |
| WLO-D-004 | year sheet=2025 verified=2024 |
| WLO-AK-006 | year sheet=2021 verified=2020 |
| WLO-ER-009 | year sheet=2023 verified=2022 |

The R2 rows had no year or journal disagreements. Every flagged row is curated. Most are off by one year: the sheet uses the online-first year and PubMed shows the print year. WLO-G-001 is the same case. Z-005 (an abbreviated journal name) was a false positive and is left out.

## 2. Relevance triage

| Relevance | Curated | R2 | Total |
|---|---|---|---|
| DIRECT | 53 | 35 | 88 |
| TRANSFERABLE | 46 | 73 | 119 |
| CONDITIONAL | 31 | 82 | 113 |
| OFF_POPULATION | 1 | 144 | 145 |
| OFF_TOPIC | 1 | 43 | 44 |
| **Total** | 132 | 377 | 509 |

**Main finding:** only 108 of 377 R2 rows (28%) are DIRECT or TRANSFERABLE for her. 187 R2 rows are about other populations or other topics. Examples: older adults, cancer, stroke, children, smoking, clinician implementation frameworks. The R2 bulk search matched on domain keywords, not on the population.

Categories CONDITIONAL and OFF_* where most R2 rows fall:

- OFF_POPULATION, most common: Older adults (22), Adolescents (7), Children/adolescents (4), Children (3), Cancer patients (3), Preschool children (3), Cancer survivors (2), Severe mental illness (2)
- CONDITIONAL by area: women's health (23), emotion regulation (23), nutrition (22), chronic pain (15), self-care (13), sleep (11), walking (6)

DIRECT + TRANSFERABLE rows by life area (all 509):

| Life area | DIRECT | TRANSFERABLE |
|---|---|---|
| study skills | 16 | 11 |
| habit engine | 6 | 19 |
| joy/wellbeing | 9 | 13 |
| learning | 5 | 12 |
| digital wellbeing | 11 | 2 |
| driving | 6 | 6 |
| IELTS/language | 5 | 5 |
| money | 4 | 6 |
| nutrition | 4 | 6 |
| walking | 4 | 5 |
| career | 1 | 7 |
| sleep | 4 | 4 |
| relationships | 1 | 6 |
| emotion regulation | 5 | 2 |
| fitness | 1 | 4 |
| attention | 3 | 2 |
| strength | 2 | 2 |
| self-care | 0 | 4 |
| home | 1 | 2 |
| women's health | 0 | 1 |

Gaps: nothing DIRECT on home organization beyond AM-001, nothing on money for young women specifically, no evidence on job search or portfolios for UX/product roles (only AJ-001 applies), and no Saudi or Arabic-context studies for IELTS or driving.

Rules applied: novice-driver studies count as DIRECT/TRANSFERABLE even when participants are adolescents, because she is a novice driver. Insomnia-disorder trials are CONDITIONAL. Sleep-quality, sleep-hygiene and sub-threshold insomnia studies are TRANSFERABLE. Pregnancy, PCOS, prediabetes, metabolic syndrome, dysmenorrhea, acne, hair loss, chronic pain and BPD are CONDITIONAL. Skincare/sunscreen studies in the general population are TRANSFERABLE but low importance, because skincare is not in her goal list.

## 3. Role proposals (R2 DIRECT + TRANSFERABLE only)

| Proposed role | DIRECT | TRANSFERABLE | Total |
|---|---|---|---|
| Core | 1 | 5 | 6 |
| Supporting | 21 | 35 | 56 |
| Emerging | 10 | 27 | 37 |
| Contradictory | 3 | 6 | 9 |

The sheet labels all 377 R2 rows "Supporting" with Project Importance 88. That includes 269 rows triaged here as CONDITIONAL, OFF_POPULATION or OFF_TOPIC. These should be downgraded or excluded from the app's rule engine. Core candidates: WLO-R2-0130 (walking), WLO-R2-0161 (fitness), WLO-R2-0165 (fitness), WLO-R2-0169 (habit engine), WLO-R2-0170 (habit engine), WLO-R2-0293 (walking). Contradictory: WLO-R2-0075, WLO-R2-0078, WLO-R2-0120, WLO-R2-0148, WLO-R2-0210, WLO-R2-0235, WLO-R2-0294, WLO-R2-0311, WLO-R2-0355.

## 4. Top 30 DIRECT R2 studies (by importance)

| # | Study ID | Area | Imp | Role | Finding |
|---|---|---|---|---|---|
| 1 | WLO-R2-0103 | digital wellbeing | 5 | Supporting | Promoting Self-Regulated Social Media Use on Smartphones With a Mobile: n=70 (67% female, ~26y); -29.35 min/day on most problematic app (95% CI -42.79 to -15.99); no change in problematic SM use score |
| 2 | WLO-R2-0116 | driving | 5 | Supporting | Learner drivers (and their parent-supervisors) benefit from an online : Learners n=26 vs 23 waitlist: improved HP skill and following distance; no effect on speed choice/gap acceptance |
| 3 | WLO-R2-0165 | fitness | 5 | Core | High intensity interval training characteristics associated with exerc: 18 RCTs (N=964); HIIT more enjoyable than MICT (g=0.44, 95% CI 0.09-0.79; I2=78.9%) |
| 4 | WLO-R2-0196 | IELTS/language | 5 | Supporting | A Meta-Analysis on Mobile-Assisted Language Learning Applications: Ben: 23 effect sizes; mobile language apps g=0.88 vs traditional; high RoB, low quality |
| 5 | WLO-R2-0295 | sleep | 5 | Supporting | A randomized controlled trial of a behavioral intervention for decreas: n=60 (~21y, 87% female); bedtime procrastination -46.29 min (d=1.22); sleep efficiency +5.70% (d=1.25) |
| 6 | WLO-R2-0095 | digital wellbeing | 4 | Supporting | A Mobile Intervention for Self-Efficacious and Goal-Directed Smartphon: n=232 (high attrition); both arms reduced problematic use; self-efficacy mediated (b=-0.09, 95% CI -0.26 to -0.01) |
| 7 | WLO-R2-0097 | digital wellbeing | 4 | Supporting | From screens to serenity: evaluating the effect of digital detox on me: 3-arm RCT in medical-college students; detox + alternative activities largest improvements in PSS, GAD-7 and HRV |
| 8 | WLO-R2-0113 | driving | 4 | Supporting | The effectiveness of mandating supervised driving practice requirement: Longer permit periods, supervised practice and structured training linked to fewer crashes/offences in novices |
| 9 | WLO-R2-0114 | driving | 4 | Emerging | The Effectiveness of a Digital Game-Based Intervention on Hazard Perce: n=46 novice drivers (~21y, 40 women); 14-day game-based training improved visual skills (p<0.05) |
| 10 | WLO-R2-0119 | driving | 4 | Supporting | Effects of higher-order driving skill training on young, inexperienced: Higher-order skill training improved on-road visual search, hazard perception and reduced overconfidence; vehicle-handling training did not |
| 11 | WLO-R2-0255 | walking | 4 | Supporting | The effect of need supportive text messages on motivation and physical: n=65 (~26y); need-supportive SMS: greater moderate PA at 4-month follow-up |
| 12 | WLO-R2-0262 | nutrition | 4 | Supporting | Effectiveness of Web-Based Personalized Nutrition Advice for Adults Us: PN advice m-AHEI +3.5/100 (95% CI 1.19-5.78) vs control in non-diseased adults |
| 13 | WLO-R2-0289 | nutrition | 4 | Supporting | Does stress compromise fruit and vegetable intake? A randomized contro: n=99 young adults; planning increased F&V intake, but not under high stress |
| 14 | WLO-R2-0297 | study skills | 4 | Emerging | Development of a Mobile Intervention for Procrastination Augmented Wit: Pilot n=85; chatbot-augmented app improved time management and stress vs control |
| 15 | WLO-R2-0298 | study skills | 4 | Supporting | StudiCare procrastination - Randomized controlled non-inferiority tria: IPS decreased across groups (d=-0.43 to -0.89); PSD version non-inferior for procrastination |
| 16 | WLO-R2-0299 | study skills | 4 | Supporting | Group cognitive behavioral therapy for reducing procrastination in col: Group CBT procrastination reduction d=1.09 vs waitlist; no well-being change |
| 17 | WLO-R2-0301 | study skills | 4 | Supporting | Treating Procrastination Using Cognitive Behavior Therapy: A Pragmatic: ICBT d=1.29 (95% CI 0.81-1.74); group CBT d=1.24; group format sustained better |
| 18 | WLO-R2-0347 | relationships | 4 | Supporting | Social connection interventions and depression in young adults: a syst: 6 studies; depression SMD -0.19 (95% CI -0.33 to -0.05); loneliness SMD -0.10 (ns) |
| 19 | WLO-R2-0034 | attention | 3 | Supporting | Mind over Matter: Testing the Efficacy of an Online Randomized Control: 10-day online RCT; reduced smartphone distraction but not habitual use, nomophobia or social-media time |
| 20 | WLO-R2-0099 | digital wellbeing | 3 | Emerging | Effect of a mindfulness-integrated positive psychology course on digit: Quasi-experimental; improved mindfulness and digital detox, reduced smartphone addiction vs control |
| 21 | WLO-R2-0102 | digital wellbeing | 3 | Emerging | Examining the Impact of Digital Detox Interventions on Anxiety and Dep: n=467 young adults, uncontrolled pre-post; anxiety 14.74 to 8.29 in females (p<.0001) |
| 22 | WLO-R2-0122 | emotion regulation | 3 | Supporting | Cognitive reappraisal in mHealth interventions to foster mental health: 30 RCTs (n=3904); reappraisal mHealth SMD 0.34 (p=.002); no effect on distress/wellbeing; high RoB |
| 23 | WLO-R2-0148 | money | 3 | Contradictory | Psychological mechanisms linking a financial-literacy curriculum to sc: Cluster RCT 4 classes (N=320); no outcome significant at cluster level; individual-level d=0.37-0.51 |
| 24 | WLO-R2-0198 | IELTS/language | 3 | Emerging | The Impact of Mobile-Assisted Language Learning on English as a Foreig: n=139 EFL learners; 1-year MALL increased vocab attitudes and self-regulatory capacity (no control) |
| 25 | WLO-R2-0201 | IELTS/language | 3 | Emerging | Fostering EFL learners' motivation, anxiety, and self-efficacy through: n=90 EFL learners; CALL and MALL improved motivation, anxiety, self-efficacy vs face-to-face; no CALL vs MALL difference |
| 26 | WLO-R2-0203 | IELTS/language | 3 | Emerging | Gamified behavioral engagement as an indirect association linking idea: Gamified engagement mediated ideal L2 self to vocab achievement (indirect beta=0.043, 95% CI 0.012-0.096) |
| 27 | WLO-R2-0239 | emotion regulation | 3 | Supporting | Gender differences in the influence of app-based mindfulness meditatio: n=300 workers; women improved cognitive flexibility (d=0.36) and angry reactions (d=-0.56); not robust to correction |
| 28 | WLO-R2-0300 | study skills | 3 | Supporting | Effectiveness of group therapy based on acceptance and commitment for : ACT group: academic procrastination 5.817 units lower (P=0.038) |
| 29 | WLO-R2-0355 | joy/wellbeing | 3 | Contradictory | Evaluation of the contribution of values clarification to a brief mind: n=120 (~22y); values clarification added nothing to mindfulness for anxiety/QoL |
| 30 | WLO-R2-0360 | joy/wellbeing | 3 | Supporting | Effects of cold-water immersion on health and wellbeing: A systematic : 11 studies (n=3177); stress SMD -1.00 at 12h only; acute inflammation SMD 1.03; no effect at other timepoints |

Only 35 R2 rows are DIRECT. The list above is effectively the whole DIRECT set. Also worth promoting from TRANSFERABLE: R2-0130 (PA boosters, Core), R2-0169/0170 (gamification for PA, Core), R2-0293 (coping planning closes the intention–behaviour gap, Core), R2-0161 (HIIT for fitness, Core) and R2-0319 (stand-alone sleep hygiene is weak).

## 5. Data-quality issues in the source sheet

1. **Truncated effect-size strings (R2 extraction bug).** 51 R2 `Effect Size` cells start with "95% CI" and have no point estimate. 43 of them are cut off at the decimal point. Examples: "95% CI, 0" (R2-0025, 0136, 0137, 0327, 0339, 0351), "95% CI, 1" (0007, 0225, 0324), "95% CI [0" (0029, 0104, 0203), "95% CI -42" (0103), "95% CI" (0244), "95% CI), -1" (0371). The other 8 are text fragments, e.g., R2-0006 "95% CI 71%, 82%), viable saliva…" and R2-0350 "95% CI: 6%-21%, p =". Another 7 parsed the word "or" as an odds ratio: "or 6" (0088, 0108, 0335), "or 2" (0085), "or 12" (0157), "or 7.23" (0253), "or 16" (0310). 63 more hold only a bare point estimate without a CI. One curated row (J-001, "g=.499") also has no CI.
2. **Wrong statistic captured.** Some rows hold a secondary or misleading value. R2-0311 holds "OR: 2.35", which is the pre-1980s cumulative OR; the pooled OR was 1.08 (0.91–1.28, null). R2-0161 holds "SMD: 4.72" for the second-ranked arm, not HIIT (4.85). R2-0360 holds "SMD: 1.03", which is inflammation; the wellbeing/stress result was -1.00 at 12 h only.
3. **Templated fields carry no information for R2.** Across all 377 rows: Country = "Not extracted"; Project Importance = 88; Role = Supporting; Intervention = a copy of the title; Scientific Quality is design-based only. 196 have Sample Size "Not reliably extracted". 233 have Effect Size "Not extracted". 139 have Effect Direction "Not classified". 122 have the generic Population "Population defined in the source".
4. **Population labels disagree with the abstracts.** 6 general or mixed-population rows are labelled "Clinical population" (R2-0001, 0005, 0020, 0022, 0164, 0251). 22 clinical or older-adult rows are labelled "Adults" or "Women" (e.g., R2-0043 eating disorders, 0045/0168/0237 breast cancer, 0060 SMI, 0162 elderly women).
5. **Effect Direction does not match the abstracts.** 222 R2 rows are marked "Positive / potentially beneficial", including several with null primary results: R2-0075 (mindfulness had no effect on critical thinking), 0098 (no effect on screen time), 0148 (null at cluster level), 0294 (planning added nothing), 0311 (no sunscreen association), 0355 (values clarification added nothing).
6. **Misfiled fields.** 18 R2 `Harms` cells contain Methods/Results text (e.g., R2-0015, 0042, 0056, 0060, 0064, 0105, 0106, 0129, 0132, 0166, 0234, 0237, 0238, 0250, 0279). 4 `Null Findings` cells contain no null content (R2-0057, 0097, 0239, 0241). 185 `Main Finding` cells are truncated with "…".
7. **Design mislabels.** 11 pilot/feasibility trials are labelled plain "Randomized controlled trial". Process evaluations (R2-0080/81/82), a protocol (R2-0010), a case report (R2-0292), a commentary (R2-0306) and cost analyses (R2-0155) sit in the index as evidence.
8. **Domain misassignment.** R2-0155 (gestational diabetes cost analysis) is filed under "fintech". 5 cancer financial-toxicity studies are under "financial_behavior". Smoking-cessation JITAIs are under "adaptive_wellbeing". Clinician implementation frameworks (R2-0187–0195) are under "implementation".
9. **Identifier errors.** 4 wrong PMIDs/DOIs (section 1). 3 curated rows have no ID even though one is recoverable (B-003, G-001, I-002). R2-0259 is a conference abstract with First Author "Not extracted".

## 6. Spot-check

I re-read the abstracts for 31 labels, covering every category and the borderline cases: R2-0009, 0012, 0018, 0029, 0043, 0047, 0063, 0064, 0066, 0100, 0123, 0132, 0133, 0136, 0161, 0212, 0228, 0230, 0241, 0287, 0303, 0319, 0322, 0333, 0345, 0348, 0352, 0356, 0360, 0369, 0370. Two changes came out of it. R2-0018 went from TRANSFERABLE to DIRECT (employed non-clinical adults), to match R2-0239. R2-0319 was kept TRANSFERABLE with its reason clarified, to be consistent with W-001 and R2-0322. Earlier checks on 23 uncertain rows (population sentences) changed R2-0015 to OFF_POPULATION (caregivers), R2-0017 to CONDITIONAL (common mental disorders), R2-0038 to OFF_TOPIC, and R2-0239, 0255 and 0355 to DIRECT.

## 7. Caveats

- Relevance, role and importance are judgments made from titles and abstracts, not full texts.
- For the 108 R2 DIRECT/TRANSFERABLE rows, key results were read and written by hand, keeping the numbers exactly as they appear in the abstract. For the other R2 rows, `key_result_extracted` is an automatic pull of verbatim abstract sentences that contain statistics, and `direction_extracted` is a keyword heuristic. Treat both as unreviewed.
- For curated rows, the extraction and role columns are left blank because the sheet already has curated values. Verification and relevance cover all 509 rows.