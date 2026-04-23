# 智慧工地物联网平台

## 项目概述

智慧工地物联网平台是一个基于微服务架构的 IoT 平台，旨在解决建筑行业在安全、效率和实时监控方面的挑战。
当前仓库已引入新一代技术栈迁移基线：
- 前端：`Vue 3 + Vite + Element Plus`
- 后端：`Rust (Axum) + MySQL + InfluxDB`

## 功能特性

- **设备通讯**：支持 Modbus TCP、MQTT 和 HTTP 协议
- **视频流**：视频流接入、转发、存储和查看功能
- **视频查看**：实时视频流和录制视频播放，含播放控制和全屏观看
- **实时监控**：设备和传感器数据的实时可视化仪表盘
- **设备管理**：设备注册、配置和控制
- **数据存储与分析**：历史数据存储与分析
- **告警与通知**：异常情况告警和通知
- **安全**：身份认证、授权和数据加密
- **可扩展性**：处理大量设备和高数据吞吐量

## 项目结构

```text
smart-construction-iot-platform/
├── backend/
│   ├── services/
│   │   ├── device-communication/    # 设备通讯服务
│   │   ├── video-streaming/         # 视频流服务
│   │   ├── device-management/       # 设备管理服务
│   │   ├── device-management-rs/    # Rust 设备管理服务（MySQL + InfluxDB）
│   │   ├── data-storage/            # 数据存储服务
│   │   ├── alerts-notifications/    # 告警与通知服务
│   │   └── user-auth/               # 用户认证服务
│   └── shared/
│       ├── utils/                   # 共享工具
│       └── models/                  # 共享数据模型
├── frontend/                         # 现有静态前端
├── frontend-vue/                     # Vue 3 管理后台（Element Plus）
├── docker/                           # Docker 配置
├── kubernetes/                       # Kubernetes 配置
└── docs/                             # 文档
```

## 快速开始

### 使用 Docker Compose 启动

```bash
cd docker
docker-compose up -d
```

默认会启动 `MySQL + InfluxDB + RabbitMQ + Kafka + Redis`。

### 启动 Vue 管理后台

```bash
cd frontend-vue
npm install
npm run dev
```

### 运行测试

```bash
npm install
npm test
```

说明：
- `test:unit` 默认执行核心模块单元测试
- `test:integration` 默认跳过 E2E（防止未启动环境导致 CI 失败）
- 如需真实 E2E，请先启动完整 API，再执行 `RUN_E2E=true npm run test:integration`

### 启动 Rust 设备管理服务

```bash
cd backend/services/device-management-rs
cp .env.example .env
cargo run
```

### 使用 Kubernetes 部署

```bash
cd kubernetes
kubectl apply -f .
```

### 暂存环境部署

```bash
npm run deploy:staging
```

### 负载测试

```bash
BASE_URL=http://localhost:3000 CONCURRENT_USERS=100 TEST_DURATION=60 npm run test:load
```

## 许可证

MIT

## 认证与权限（跨服务）

当前已在核心服务启用统一鉴权与权限校验：

- 所有受保护接口需携带 `Authorization: Bearer <JWT_TOKEN>`
- 缺少 token 返回 `401`，无效/过期 token 返回 `403`
- 服务会通过认证服务访问画像接口拉取权限与数据范围（`/api/v1/auth/access/profile`）
- 设备相关数据接口按设备范围执行数据规则校验（部门/数据范围）

常用环境变量：

- `JWT_SECRET`：JWT 验签密钥（需与 user-auth 一致）
- `AUTH_SERVICE_BASE`：认证服务地址（默认 `http://localhost:3005/api/v1/auth`）

更详细的服务权限映射与上线说明见：

- `docs/requirements-baseline/authz-parity-rollout.md`

