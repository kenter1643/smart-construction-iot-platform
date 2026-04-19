# device-management-rs

Rust 版设备管理服务，基于 `Axum + sqlx(MySQL) + influxdb2`。

## 启动

```bash
cp .env.example .env
cargo run
```

默认端口：`3003`

## 关键环境变量

- `PORT`：服务端口
- `MYSQL_URL`：MySQL 连接串
- `INFLUX_URL`：InfluxDB 地址
- `INFLUX_ORG`：Influx 组织
- `INFLUX_BUCKET`：Influx bucket
- `INFLUX_TOKEN`：Influx token

## API

- `GET /health`
- `GET /api/v1/devices`
- `GET /api/v1/devices/:id`
- `POST /api/v1/devices`
- `PUT /api/v1/devices/:id`
- `DELETE /api/v1/devices/:id`
