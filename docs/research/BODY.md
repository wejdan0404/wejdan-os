BODY cluster - research notes
==============================
25 actions (BODY-01..BODY-25). 42 unique source entries (PMIDs via eutils, 1 DOI via crossref, web pages via WebFetch). Web-page sources have year = null where the page shows no date.

Sources tried and dropped (and why)
- PMID 25975560: wrong ID (elder self-neglect paper); the correct Rhodes & Kates 2015 review is PMID 25921307.
- PMID 29556492 and 30446428: wrong IDs for the Cochrane sit-stand / ergonomics reviews; replaced with Cochrane PMID 30350850 (Hoe 2018).
- WHO physical activity fact sheet (who.int): fetched, but it does not state the adult numbers; used only as background. Numbers come from Bull 2020 (PMID 33239350).
- EFSA water opinion PDFs (efsa.europa.eu/pub/1459, Wiley PDF): 403; sennutricion mirror: 404. The 2.0 L/day women value was confirmed from the EFSA press release page; the opinion DOI was confirmed via crossref only.
- Mayo Clinic "exercise: when to check with your doctor" page: 404. CDC heat pages /heat-health/signs-symptoms and /hcp/clinical-guidance: 404. Replaced with the CDC NIOSH heat-illness page and the NHS Cheshire & Merseyside page.
- PMC4677472 (Saudi vitamin D): reCAPTCHA, could not read; dropped.
- Brown et al. 2022 PMC: numbers not in the abstract, so they were confirmed on the PLOS full-text page.
- Exercise-with-others: no recent adult SR on exercising with a partner (Kohler effect) came up in PubMed searches. Kept the older Kahn 2002 Community Guide SR only.

Gaps where evidence was weak
- Rest/recovery days: no verified source gives a rest-day count for general adults (the 48 h rule was not in any verified abstract, so it is not used). Dose = not specified.
- Posture/ergonomics: in the Cochrane review, workstation adjustment and sit-stand desks showed no effect, and breaks had only very-low-quality evidence. No "correct posture" source. Setup tips in BODY-08 are marked as common practice, not evidence.
- Core/Pilates: the only SR is heterogeneous (I2 about 92%) and mixes populations. It shows quality-of-life and self-esteem benefits only. There is no dose and no posture or back-pain claim for healthy adults.
- Exercise snacks: the mortality data are observational in an older cohort (mean age about 62). The trial SR is low certainty.
- Sleep regularity: the mortality link comes from older UK Biobank adults (observational). The guidelines still recommend it, but they give no numeric tolerance.
- Morning light: the consensus gives a daytime light level (250 lux melanopic EDI) with no "morning within X min" and no minutes dose. Don't state a morning-light dose.
- Bedtime procrastination: the evidence is observational only. The if-then fix is general behavior science and was not tested for this.
- Vitamin D, Saudi context: no minutes-of-sun dose exists. The Riyadh study is in vitro (ampoules), and the consensus advises against universal screening. Framed as "ask a doctor", Conditional.
- Ramadan sleep numbers (4-6 h night + 1.5-2 h day) and "young adults 7-9 h" came from a text-garbled KSU-hosted PDF read through WebFetch. Re-confirm against PMC8388570 before shipping.
- Temptation bundling and the megastudy effects fade over time. The megastudy population was US gym members.

Surprising / useful for the app design
- The Saudi Public Health Authority 24-h Movement Guidelines (PMID 34484438) are the best local anchor. They cover sedentary breaks, 7+ h sleep, naps under 30 min around midday (Qailulah), no harm from splitting night sleep around Fajr, and Ramadan sleep.
- Steps: the 2025 Lancet Public Health meta-analysis puts the inflection at 5,000-7,000 steps/day, so 10,000 is not a threshold.
- Caffeine: coffee at least 8.8 h before bed; a pre-workout supplement at least 13.2 h before bed. That makes the cutoff early afternoon for a typical bedtime.
- Megastudy: the best intervention rewarded coming back after a missed workout. The app should reward recovery instead of punishing broken streaks.
- A pleasure-guided intensity RCT gave 77% more sessions over 8 weeks. This directly supports her "link routines to enjoyment" goal.
- NHS counts all fluids (including tea and coffee) toward 6-8 cups/glasses. The "8 glasses of water" myth is not what the sources say.
