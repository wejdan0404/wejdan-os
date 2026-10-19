LIFE cluster: notes (24 actions in LIFE.json)

SOURCES TRIED AND DROPPED
- my.gov.sa service 112124 ("Driving license issuance"), EN and AR: HTTP 403 (Cloudflare block) through WebFetch and curl. Dropped. No official hour counts, fees, or steps were stated.
- moi.gov.sa traffic pages (licence, temporary driving permit, licence form PDF): connection timed out through the proxy. WebFetch refused the URLs because they are too long. Dropped.
- absher.sa guide "Journey-for-Driving-license-issuance": the page loaded but its content is rendered by JavaScript, so no steps were readable. Dropped.
- sds.com.sa: this is an ERP software company (sds.sa), NOT the Saudi Driving School. sds.pnu.edu.sa: proxy denied the connection. Dropped.
- Dallah driving school (ddc.sa, dallahdrivingschool.sa, female.dallahdrivingschool.sa): no course hours or prerequisites readable, or DNS failure. Dropped.
- spa.gov.sa (royal order on licences for women): robots.txt timeout. Dropped.
- CISA consumer "Data Backup Options" PDF: 403. Replaced with the CISA "Back Up Government Data" page, which states the 3-2-1 rule.
- Roster et al. 2016 (clutter and subjective well-being): only the title and DOI were verified through Crossref. The abstract was not readable (ScienceDirect rate-limited, abstract hidden by the publisher), so the claim is kept general.
- Lally et al. 2010 (habit formation timing): title and DOI verified, but the abstract was not readable, so the "66 days" figure was removed and the source was not used.
- Saudi NCA cybersecurity guidance: not verified. UK NCSC and US CISA are used instead.
- SAMA BNPL rules: only the rulebook page title was verified. The rule text loads dynamically and was not readable, so no SAMA rule content is claimed.
- OECD/INFE: not fetched. CFPB plus the meta-analyses cover the finance evidence.

GAPS / WEAK EVIDENCE
- Saudi licence process: every official detail (medical check, course hours by level, theory and practical tests, temporary permit rules) is unverified. LIFE-01 is a "confirm on Absher/my.gov.sa" project step with no stated numbers. The app should not hard-code training hours until someone checks them on an official Saudi page.
- Driving anxiety: no non-clinical, sourced tip was found and verified, so none is included. The only guidance is to see a professional if anxiety is strong and persistent.
- Supervised practice evidence comes mostly from young novices in graduated driver licensing (GDL) systems (AU/US/NZ). The review says the evidence on specific hour thresholds is mixed.
- Hazard-perception training shows large effects on HP skill tests (g=0.78 for drivers), but transfer to on-road crashes and long-term retention are unproven.
- Budgeting, subscription reviews, wishlist cooling-off, laundry batching, "a home for everything" and errand batching are practical and low-risk, with no trial evidence. They are labelled Expert consensus, and some have no sources.
- Clutter evidence is observational (Saxbe & Repetti 2010: n=60 dual-income couples, and the effect was found in wives). It does not show causation.
- Savings RCTs (Soman & Cheema, Ashraf et al.) were in low-income populations in India and the Philippines. Madrian & Shea studied a US employer 401(k) plan. They are applied to her by principle (defaults, earmarking, commitment).
- Aquarium feeding frequency conflicts between sources: RSPCA Australia says once a day (tropical fish), RSPCA UK says 2-3 times a day. Both are kept, with a "follow species advice" note.

SURPRISING / USEFUL
- The hazard-perception meta-analysis found that single active sessions gave more consistent gains than multiple sessions, though this is preliminary.
- Financial education meta-analyses disagree on size. Fernandes 2014 found a tiny effect that decays over time. Kaiser 2022 (76 RCTs) found meaningful effects at least 3x larger than earlier estimates. Both support "just-in-time" learning.
- Implementation intentions improved prospective memory in healthy young adults (d=0.445, and 0.59 with verbal plus imagery). This supports an app-wide "If/then" field (LIFE-18).
- Defaults meta-analysis: d=0.68. Nudge meta-analysis: d=0.45, with decision-structure nudges (such as defaults) performing best. This supports making automation the core of the finance design.
