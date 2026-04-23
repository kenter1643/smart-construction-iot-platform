## ADDED Requirements

### Requirement: Current System Scope Baseline
The system SHALL maintain a formal baseline that defines the current production-intent scope for the smart construction IoT platform, including core modules, supported workflows, and explicit non-goals.

#### Scenario: Baseline scope is reviewable
- **WHEN** a contributor needs to understand what the current version is expected to provide
- **THEN** the baseline specification SHALL clearly describe included capabilities and excluded scope without requiring source-code inference

### Requirement: Core Capability Coverage Baseline
The baseline MUST define normative requirements for the current core capability domains, including device management, device communication protocols, video capability, data storage/analysis, alert handling, and security constraints.

#### Scenario: Capability domain mapping is complete
- **WHEN** reviewers compare project modules against baseline requirements
- **THEN** each core domain SHALL map to at least one requirement and verification scenario in the baseline capability spec

### Requirement: Acceptance-Oriented Requirement Style
Each baseline requirement SHALL be expressed with normative language and include at least one scenario using WHEN/THEN so that the requirement can be validated as a test case.

#### Scenario: Requirement is testable
- **WHEN** QA or engineering derives verification cases from baseline requirements
- **THEN** every requirement SHALL provide concrete scenario conditions and expected outcomes suitable for validation

### Requirement: Deployment and Runtime Constraint Baseline
The baseline MUST capture current deployment and runtime constraints that affect delivery expectations, including existing Docker and Kubernetes deployment paths and the no-new-runtime-change rule for baseline initialization.

#### Scenario: Baseline does not alter runtime behavior
- **WHEN** this baseline change is applied
- **THEN** system runtime behavior, API contracts, and deployment topology SHALL remain unchanged

### Requirement: Traceable Source-of-Truth Priority
The baseline SHALL define that OpenSpec specification artifacts are the normative source of truth for requirement behavior, while README and design documents are informative references.

#### Scenario: Conflicting descriptions appear
- **WHEN** a discrepancy is found between README text and OpenSpec requirement text
- **THEN** reviewers MUST treat OpenSpec requirements as authoritative and resolve the discrepancy through a new change

### Requirement: Controlled Requirement Evolution
All future requirement additions, removals, or behavior modifications MUST be introduced through OpenSpec change workflows before implementation changes are considered complete.

#### Scenario: New requirement is proposed
- **WHEN** a contributor proposes functional behavior not covered by baseline
- **THEN** the contributor SHALL create or update an OpenSpec change artifact before merging implementation for that behavior
