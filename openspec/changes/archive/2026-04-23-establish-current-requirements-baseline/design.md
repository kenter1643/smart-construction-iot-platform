## Context

当前项目已形成可运行的多模块形态（`frontend`、`frontend-vue`、`backend/services`、`docker`、`kubernetes`），但需求基线尚未系统化，导致“现状能力、边界、验收口径、变更入口”不统一。现有信息主要散落于 README 与历史设计文档中，缺乏规范化约束。

本设计目标是在不改变运行时行为和接口的前提下，建立一套可执行的需求基线规范，作为后续所有变更的对照标准。

## Goals / Non-Goals

**Goals:**
- 为当前版本建立统一的需求基线规范，并以 OpenSpec 能力形式管理。
- 把核心行为拆解为可验证的规范条目（Requirement + Scenario），可直接映射为测试用例。
- 约束后续需求变更路径：新增或修改需求必须通过 OpenSpec change。
- 明确基线来源与优先级，降低跨文档、跨模块理解偏差。

**Non-Goals:**
- 不新增业务功能或接口。
- 不重构前后端代码。
- 不调整部署拓扑（Docker/Kubernetes）。
- 不定义具体任务排期或组织流程审批机制。

## Decisions

1. 使用单一能力 `project-requirements-baseline` 承载当前版本基线。
- Rationale: 当前目标是“收敛现状”，单能力可降低初始化复杂度，后续再按域拆分。
- Alternative considered: 立即拆分为设备、视频、告警、安全等多能力；但初始成本高、容易在首次建模时引入遗漏和重复。

2. 采用规范性语句（SHALL/MUST）与场景化验收（WHEN/THEN）。
- Rationale: 规范条目必须可测试、可审查、可追踪。
- Alternative considered: 继续维护描述性文档；可读性高但约束力弱，无法稳定支持回归验证。

3. 将“变更治理规则”纳入基线需求本身。
- Rationale: 仅记录现状功能不足以防止未来漂移，必须把变更入口制度化。
- Alternative considered: 只在团队口头流程中约定；执行一致性不可控。

4. 基线不覆盖实现细节，聚焦行为与约束。
- Rationale: 实现可能替换（例如技术栈升级），基线应保持稳定并服务验收。
- Alternative considered: 将实现结构写入需求；短期明确，长期易失效。

## Risks / Trade-offs

- [风险] 基线描述可能与真实代码存在偏差。  
  → Mitigation: 每条 requirement 至少对应一个可执行或可手工验证场景，后续按差异发起变更修订。

- [风险] 单能力承载范围较大，后续维护压力上升。  
  → Mitigation: 当条目规模增长到难维护时，拆分为子能力并通过新 change 迁移。

- [风险] 团队可能跳过 OpenSpec 直接改代码。  
  → Mitigation: 在基线中加入“变更必须先走 OpenSpec”的治理要求，并纳入评审检查项。
