# Baseline Validation Cases

Initial verification cases derived from `project-requirements-baseline` scenarios. (Task 3.1)

## Case 1: Scope Reviewability
- Requirement: `Current System Scope Baseline`
- Method: Manual review
- Steps:
  1. Open baseline spec and README.
  2. Confirm included capabilities and non-goals are explicit without source browsing.
- Expected: reviewer can answer “what is in/out of scope” directly from docs.

## Case 2: Domain Coverage Mapping
- Requirement: `Core Capability Coverage Baseline`
- Method: Manual matrix check
- Steps:
  1. Compare service/module list with domain map in `source-inventory.md`.
  2. Confirm each domain maps to at least one requirement.
- Expected: no uncovered core domain.

## Case 3: Scenario Testability
- Requirement: `Acceptance-Oriented Requirement Style`
- Method: Static spec lint/manual check
- Steps:
  1. Check each requirement has at least one `#### Scenario` block.
  2. Check each scenario has WHEN/THEN.
- Expected: all requirements are executable as test cases.

## Case 4: Runtime/Topology Stability During Baseline Init
- Requirement: `Deployment and Runtime Constraint Baseline`
- Method: Diff + smoke checks
- Steps:
  1. Confirm no intentional API contract change in baseline-only PR.
  2. Confirm deployment topology docs unchanged except governance additions.
- Expected: no runtime behavior change introduced by baseline capture itself.

## Case 5: Source-of-Truth Conflict Handling
- Requirement: `Traceable Source-of-Truth Priority`
- Method: Review procedure simulation
- Steps:
  1. Simulate README/OpenSpec conflict.
  2. Confirm reviewer resolves by OpenSpec and raises follow-up change.
- Expected: decision outcome follows precedence policy.

## Case 6: Controlled Requirement Evolution Gate
- Requirement: `Controlled Requirement Evolution`
- Method: PR process check
- Steps:
  1. For a behavior-changing PR, inspect linked OpenSpec change/spec references.
  2. Verify missing references fail review checklist.
- Expected: no behavior-changing PR merged without change artifact linkage.
