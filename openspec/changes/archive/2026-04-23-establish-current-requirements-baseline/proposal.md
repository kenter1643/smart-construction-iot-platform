## Why

当前项目已完成多次技术栈与页面迭代，但需求描述散落在 README、历史设计文档和代码中，缺少统一的可追踪基线。为了让后续新增需求和变更有清晰对照，需要先把“当前已实现与应维持的行为”沉淀为 OpenSpec 基线。

## What Changes

- 建立一套面向当前版本的需求基线能力，统一记录平台范围、核心能力、非目标和验收口径。
- 将现有关键行为（设备管理、设备通信、视频能力、数据存储与告警、安全与部署约束）整理为可测试的规范性要求。
- 定义需求基线更新流程：后续需求必须通过 OpenSpec change 追加/修改，避免口头需求和代码漂移。
- 为后续实现与验收提供固定参照，降低回归风险和跨端协作歧义。

## Capabilities

### New Capabilities
- `project-requirements-baseline`: 定义智慧工地物联网平台当前版本的需求基线，包括范围、功能行为、约束、验收标准与后续变更治理规则。

### Modified Capabilities
- None.

## Impact

- 规范文档：新增 `openspec/specs/project-requirements-baseline/spec.md`。
- 研发流程：后续功能需求、接口行为变更、验收标准调整需基于 OpenSpec 变更流转。
- 影响范围：`frontend/`、`frontend-vue/`、`backend/services/`、`docker/`、`kubernetes/` 的后续迭代将以该基线为对照。
- API 与运行时：本次不引入新 API、不调整现有部署架构，仅建立基线管理约束。
