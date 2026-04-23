# Requirements Baseline Inventory

## 1. Requirement Sources (Task 1.1)

Current baseline source documents and implementation anchors:

- `README.md`
  - Project scope, feature overview, deployment/operation entry points.
- `docs/superpowers/specs/2026-04-18-device-management-ui-redesign-design.md`
  - Existing UI/interaction design constraints for device management.
- `openspec/changes/establish-current-requirements-baseline/proposal.md`
- `openspec/changes/establish-current-requirements-baseline/design.md`
- `openspec/changes/establish-current-requirements-baseline/specs/project-requirements-baseline/spec.md`
  - Normative baseline requirements and scenarios.
- Implemented modules:
  - `backend/services/device-management`
  - `backend/services/device-communication`
  - `backend/services/video-streaming`
  - `backend/services/data-storage`
  - `backend/services/alerts-notifications`
  - `backend/services/user-auth`
  - `frontend/` and `frontend-vue/`
  - deployment assets in `docker/` and `kubernetes/`

## 2. Capability Domain Map (Task 1.2)

| Domain | Primary Modules | Baseline Requirement Coverage |
|---|---|---|
| Device management | `backend/services/device-management`, `frontend-vue` | Covered by Requirement: Core Capability Coverage Baseline |
| Device communication | `backend/services/device-communication` | Covered by Requirement: Core Capability Coverage Baseline |
| Video capability | `backend/services/video-streaming`, `frontend-vue` | Covered by Requirement: Core Capability Coverage Baseline |
| Data storage/analysis | `backend/services/data-storage`, Influx/PostgreSQL paths | Covered by Requirement: Core Capability Coverage Baseline |
| Alert handling | `backend/services/alerts-notifications`, `frontend-vue` | Covered by Requirement: Core Capability Coverage Baseline |
| Security/authz | `backend/services/user-auth`, permission model | Covered by Requirement: Core Capability Coverage Baseline |
| Deployment/runtime constraints | `docker/`, `kubernetes/`, service startup paths | Covered by Requirement: Deployment and Runtime Constraint Baseline |

## 3. Requirement-to-Domain Validation (Task 1.3)

Validation against `specs/project-requirements-baseline/spec.md`:

- Requirement: `Current System Scope Baseline`
  - Scenario confirms scope visibility and explicit boundaries.
- Requirement: `Core Capability Coverage Baseline`
  - Scenario explicitly requires every core domain to map to at least one requirement.
- Requirement: `Acceptance-Oriented Requirement Style`
  - Scenario enforces testability via WHEN/THEN.
- Requirement: `Deployment and Runtime Constraint Baseline`
  - Scenario constrains runtime/API/deployment behavior during baseline init.
- Requirement: `Traceable Source-of-Truth Priority`
  - Scenario resolves cross-document conflicts with OpenSpec precedence.
- Requirement: `Controlled Requirement Evolution`
  - Scenario requires change artifacts before merge for new/changed behaviors.

Conclusion: each required capability domain has normative coverage plus executable scenario framing.
