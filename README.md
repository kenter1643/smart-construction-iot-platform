# 智慧工地物联网平台

## 项目概述

智慧工地物联网平台是一个基于微服务架构的 IoT 平台，旨在解决建筑行业在安全、效率和实时监控方面的挑战。

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

```
smart-construction-iot-platform/
├── backend/
│   ├── services/
│   │   ├── device-communication/    # 设备通讯服务
│   │   ├── video-streaming/         # 视频流服务
│   │   ├── device-management/       # 设备管理服务
│   │   ├── data-storage/            # 数据存储服务
│   │   ├── alerts-notifications/    # 告警与通知服务
│   │   └── user-auth/               # 用户认证服务
│   └── shared/
│       ├── utils/                   # 共享工具
│       └── models/                  # 共享数据模型
├── frontend/                         # 前端应用
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

### 使用 Kubernetes 部署

```bash
cd kubernetes
kubectl apply -f .
```

## 许可证

MIT
