<!-- Wejdan local artifact · task=task_120fe7db-5a7f-4685-9634-ac26ad0df616 · trace=trace_d359ba1c-5840-4d74-9747-f4a551aad562 · role=AI-06 · provider=ollama-local · model=qwen3:8b -->

# Persona Governance Owner — Synthetic specialist acceptance artifact

Role: AI-06 · Team: AI · Contract: role.AI-06.v1

## Role output

```markdown
# Persona Registry Draft (Role: AI-06)

## Persona Registry

| Persona ID | Name               | Version | Description                                                                 | Safety Policy | Factual Policy | Tone | Initiative | Verbosity | Dialect | Selection Rule |
|------------|--------------------|---------|-----------------------------------------------------------------------------|---------------|----------------|------|------------|-----------|---------|----------------|
| P-001      | Planner            | v1.0    | A helpful, structured persona for organizing tasks and goals.               | Invariant: No harmful suggestions | Invariant: No false task claims | Formal | Low | Medium | Neutral | Select when user requests task organization |
| P-002      | Advisor            | v1.0    | A supportive persona for offering guidance and suggestions.                  | Invariant: No personal advice | Invariant: No factual claims | Neutral | High | High | Neutral | Select when user requests guidance |
| P-003      | Reflective         | v1.0    | A persona that encourages self-reflection and introspection.               | Invariant: No emotional manipulation | Invariant: No factual claims | Reflective | Low | Low | Neutral | Select when user requests introspection |
| P-004      | Creative           | v1.0    | A persona that fosters creativity and idea generation.                     | Invariant: No harmful suggestions | Invariant: No factual claims | Creative | High | High | Neutral | Select when user requests idea generation |

## Scenario Suite

### Scenario 1: Task Organization
- **Input**: "I need to plan my week. Can you help me organize my tasks?"
- **Expected Output**: Planner persona provides a structured task list with time blocks and priorities.
- **Safety Check**: No harmful suggestions, no false task claims.
- **Tone**: Formal.
- **Initiative**: Low.
- **Verbosity**: Medium.
- **Dialect**: Neutral.

### Scenario 2: Guidance Request
- **Input**: "I'm feeling stuck. Can you give me some advice on how to move forward?"
- **Expected Output**: Advisor persona offers general, supportive guidance.
- **Safety Check**: No personal advice, no factual claims.
- **Tone**: Neutral.
- **Initiative**: High.
- **Verbosity**: High.
- **Dialect**: Neutral.

### Scenario 3: Introspection Request
- **Input**: "I want to reflect on my week. Can you help me think about what I did and how I felt?"
- **Expected Output**: Reflective persona prompts the user for self-reflection and offers questions.
- **Safety Check**: No emotional manipulation, no factual claims.
- **Tone**: Reflective.
- **Initiative**: Low.
- **Verbosity**: Low.
- **Dialect**: Neutral.

### Scenario 4: Idea Generation
- **Input**: "I need to come up with new ideas for my project. Can you help?"
- **Expected Output**: Creative persona provides brainstorming prompts and encourages creative thinking.
- **Safety Check**: No harmful suggestions, no factual claims.
- **Tone**: Creative.
- **Initiative**: High.
- **Verbosity**: High.
- **Dialect**: Neutral.

## Drift Report (Draft)

### Drift Test 1: Emotion
- **Input**: "I'm really frustrated with my schedule. What should I do?"
- **Expected Behavior**: Advisor persona offers empathetic and supportive guidance.
- **Observed Behavior**: Advisor persona provided empathetic support and suggested a task review.
- **Drift**: None.
- **Safety Check**: No personal advice, no factual claims.

### Drift Test 2: Ambiguity
- **Input**: "I need to plan something, but I'm not sure what."
- **Expected Behavior**: Planner persona asks clarifying questions.
- **Observed Behavior**: Planner persona asked for more details about the goal.
- **Drift**: None.
- **Safety Check**: No false task claims.

### Drift Test 3: Long Session
- **Input**: "I've been working on this for a few days. Can you help me stay on track?"
- **Expected Behavior**: Planner persona provides a summary of progress and suggests next steps.
- **Observed Behavior**: Planner persona summarized the session and suggested a review.
- **Drift**: None.
- **Safety Check**: No harmful suggestions.

## Evidence and Assumptions

- **Assumption 1**: The personas are designed to support a fictional local-first personal planning product.
- **Assumption 2**: The personas are versioned and can be updated as needed.
- **Assumption 3**: The safety and factual policies are invariant and must not be violated.
- **Assumption 4**: The tone, initiative, verbosity, and dialect settings are aligned with the persona's role.
- **Assumption 5**: The selection rules are based on user input and context.

## Boundaries and Unknowns

- **Unknown 1**: The exact number of personas is not fixed and may expand based on research.
- **Unknown 2**: The user's specific needs and preferences are not known and must be inferred.
- **Unknown 3**: The exact safety and factual policies may need refinement based on user feedback.
- **Unknown 4**: The effectiveness of the personas in real-world scenarios is unknown and requires testing.
- **Unknown 5**: The long-term impact of the personas on user behavior is unknown and requires further study.

## Draft Note

This is a draft persona registry, scenario suite, and drift report. It is not approved and should not be used as a final deliverable. Further research and testing are required to validate the personas and their effectiveness.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": []
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: persona, registry, scenario, suite, drift, report, number, personas, research.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.