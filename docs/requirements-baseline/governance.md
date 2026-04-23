# Requirements Governance

## Source-of-Truth Precedence (Task 2.1)

Precedence order for requirement interpretation:

1. OpenSpec spec artifacts (normative):
   - `openspec/specs/**`
   - active change specs in `openspec/changes/**/specs/**`
2. OpenSpec proposal/design/tasks (contextual, planning-level)
3. README and other docs (informative)
4. Code behavior (implementation reality to be reconciled via changes when divergent)

Rule: if README/design and OpenSpec spec conflict, OpenSpec spec is authoritative.

## Change-Control Rule (Task 2.2)

Mandatory rule for requirement evolution:

- Any requirement add/remove/behavior-change MUST be introduced through OpenSpec change artifacts before implementation is considered complete.
- PRs that alter behavior MUST reference the related OpenSpec requirement(s) and change name.
- Emergency fixes still require post-fix OpenSpec reconciliation in the nearest follow-up PR.

## PR Review Checklist (Task 2.3)

The PR template checklist enforces traceability:

- Requirement references (`Requirement:` names and spec path)
- Change linkage (`openspec/changes/<name>`)
- Scope statement (new requirement vs implementation-only)
- Verification evidence (scenario/test/manual steps)

See `.github/pull_request_template.md`.
