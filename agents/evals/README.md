# Agent evaluation assets

Keep source traces and original acceptance artifacts immutable. Add regression case references under `regressions/` with contract/role, task/trace IDs, artifact/evidence paths, expected recovery, synthetic/consent status and grader limits. Separate deterministic schema/correlation checks, model-generated grading, specialist domain review, and human expert approval in reports.

`regressions/residual-failures.v1.json` references the 8 documented failed roles from the 2026-10-18 residual review. They are preserved test inputs and findings; this package has not replayed the model or demonstrated repair.
