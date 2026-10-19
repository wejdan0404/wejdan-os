# Action Library research spec (shared by all agents)

## Who this is for
One person: a young adult Saudi woman (20s), recent HCI graduate, lives in Makkah/Jeddah area, building a personal "life OS" app that will plan her day and lead her routines. This year she wants to: learn to drive, study for IELTS, grow professionally (UX/UI, product, UX research, AI tools), and improve health and fitness (exercise at home ~4 days/week, walking, nutrition, sleep). She wants to link routines to enjoyment so she keeps them.

## What we need
For each life area in your cluster, the evidence-based ACTIONS she should do (what + how much + how often), AND how to make each action stick and be enjoyable (behavior design). Example of what she means: "research says walking is beneficial -> OK, walk daily; how much; how to make it a habit I enjoy".

## Hard rules
1. Never invent sources, numbers, or doses. A dose/amount appears ONLY if the cited source states it. Otherwise dose = "not specified by source" and the action says "start small and adjust".
2. Prefer, in order: official guidelines (WHO, CDC, NICE, AASM, national bodies, Saudi MOH / Saudi official portals), Cochrane / systematic reviews & meta-analyses, large RCTs. Adult general population or directly relevant population (young adults, women, students, learners). Do NOT use studies whose population is children, older adults only, or disease groups unless the action is explicitly conditional (e.g., "if diagnosed with X").
3. VERIFY every source before writing it:
   - For PubMed items: run `curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=<PMID>&retmode=json"` and confirm title/year/journal. Search with `curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10&term=<urlencoded query>"`. Abstracts: `efetch.fcgi?db=pubmed&id=<PMID>&rettype=abstract&retmode=text`.
   - For DOIs: `curl -s https://api.crossref.org/works/<DOI>` to confirm.
   - For guideline web pages: use WebFetch to confirm the page states the claim. Use WebSearch to locate them.
   - Record the exact PMID/DOI/URL you verified. If you could not verify, drop the item.
4. Separate the action's evidence (what/dose) from the habit-design evidence (how to stick). Habit-design fields can use general behavior-science principles (cue/context stability, implementation intentions, minimum version, temptation bundling, immediate reward, friction reduction, self-monitoring) — you do not need a new citation per field, but put any specific claim's source in sources.
5. Include safety/stop rules and "when to see a professional" where relevant. No diagnosis. No clinical mental-health treatment protocols (those belong to a clinician); for mental wellbeing stay with general, non-clinical, evidence-based wellbeing actions.
6. Write concise English for fields; add an Arabic short name (name_ar) for each action.
7. Aim for 10–25 actions per cluster, covering every area listed for your cluster. Quality over count.

## Output
Write a JSON array to the path given in your task. Each object:
{
 "action_id": "<CLUSTER>-<nn>",            // e.g., BODY-01
 "area": "walking",                         // life area
 "name_en": "Daily brisk walk",
 "name_ar": "مشي سريع يومي",
 "what": "...",                             // concrete action
 "dose": "...",                             // amount/frequency ONLY as stated by source, else "not specified by source"
 "why": "...",                              // benefit, one sentence, faithful to source
 "evidence_strength": "Guideline | SR/MA | RCT | Observational | Expert consensus",
 "sources": [{"type":"PMID|DOI|URL","id":"...","title":"...","year":2020,"verified_by":"eutils|crossref|webfetch"}],
 "cue_suggestion": "...",                   // stable context anchor, e.g., "after Asr prayer" or "after morning coffee"
 "minimum_version": "...",                  // bad-day version
 "normal_version": "...",
 "bonus_version": "...",
 "joy_pairing": "...",                      // how to make it enjoyable now (temptation bundle, music, place, social, novelty)
 "friction_down": "...",                    // make it easier
 "friction_up_for_competing": "...",        // make the competing temptation harder (optional)
 "if_then_plan": "If ..., then I will ...",
 "tracking_metric": "...",                  // one-tap metric
 "progression": "...",                      // how it grows over weeks, only if source-supported, else "self-paced"
 "safety_or_stop_rule": "...",
 "schedule_slot": "morning|midday|afternoon|evening|night|weekly|monthly|as-needed",
 "time_minutes_normal": 20,                 // integer, planning estimate
 "app_type": "Habit|Routine step|Weekly task|Project step|System/automation|Reference",
 "priority_for_her": "Core|Recommended|Optional|Conditional",
 "notes": "..."
}
Also, at the end, write a short plain-text file next to the JSON (same name, .md) listing: sources you tried and dropped (and why), gaps where evidence was weak, and anything surprising.
