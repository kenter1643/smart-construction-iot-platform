use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use chrono::{DateTime, Utc};
use influxdb2::Client as InfluxClient;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::MySqlPool;
use thiserror::Error;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{EnvFilter, fmt};

#[derive(Clone)]
struct AppState {
    mysql: MySqlPool,
    influx: Option<InfluxClient>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct DeviceRow {
    id: i64,
    device_id: String,
    name: String,
    device_type: String,
    protocol: String,
    status: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeviceInput {
    device_id: String,
    name: String,
    #[serde(rename = "type")]
    device_type: String,
    protocol: String,
    status: String,
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("database error")]
    Db(#[from] sqlx::Error),
    #[error("device not found")]
    NotFound,
    #[error("invalid payload: {0}")]
    Validation(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            ApiError::Db(_) => (StatusCode::INTERNAL_SERVER_ERROR, "database error".to_string()),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "device not found".to_string()),
            ApiError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        };
        let body = Json(json!({
            "success": false,
            "error": message
        }));
        (status, body).into_response()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    fmt().with_env_filter(EnvFilter::from_default_env()).init();

    let mysql_url = env::var("MYSQL_URL")
        .unwrap_or_else(|_| "mysql://smartiot:smartiot123@localhost:3306/smartiot".to_string());
    let mysql = MySqlPool::connect(&mysql_url).await?;
    init_mysql(&mysql).await?;

    let influx = build_influx_client();
    let state = Arc::new(AppState { mysql, influx });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/devices", get(list_devices).post(create_device))
        .route("/api/v1/devices/:id", get(get_device).put(update_device).delete(delete_device))
        .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any).allow_methods(Any))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = env::var("PORT").ok().and_then(|v| v.parse::<u16>().ok()).unwrap_or(3003);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("device-management-rs listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn build_influx_client() -> Option<InfluxClient> {
    let url = env::var("INFLUX_URL").ok()?;
    let org = env::var("INFLUX_ORG").ok()?;
    let token = env::var("INFLUX_TOKEN").ok()?;
    Some(InfluxClient::new(url, org, token))
}

async fn init_mysql(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS devices (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            device_id VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            device_type VARCHAR(64) NOT NULL,
            protocol VARCHAR(64) NOT NULL,
            status VARCHAR(64) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mysql_ok = sqlx::query("SELECT 1").execute(&state.mysql).await.is_ok();
    let influx_ok = state.influx.is_some();
    Json(json!({
        "success": true,
        "data": {
            "service": "device-management-rs",
            "status": if mysql_ok { "healthy" } else { "degraded" },
            "mysql": mysql_ok,
            "influxConfigured": influx_ok,
            "timestamp": Utc::now().to_rfc3339()
        }
    }))
}

async fn list_devices(State(state): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, ApiError> {
    let rows: Vec<DeviceRow> = sqlx::query_as::<_, DeviceRow>(
        r#"
        SELECT id, device_id, name, device_type, protocol, status, created_at, updated_at
        FROM devices
        ORDER BY id DESC
        "#,
    )
    .fetch_all(&state.mysql)
    .await?;
    Ok(Json(json!({
        "success": true,
        "data": {
            "devices": rows.iter().map(to_device_json).collect::<Vec<_>>()
        }
    })))
}

async fn get_device(
    Path(id): Path<i64>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let row = sqlx::query_as::<_, DeviceRow>(
        r#"
        SELECT id, device_id, name, device_type, protocol, status, created_at, updated_at
        FROM devices
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(&state.mysql)
    .await?
    .ok_or(ApiError::NotFound)?;
    Ok(Json(json!({
        "success": true,
        "data": to_device_json(&row)
    })))
}

async fn create_device(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeviceInput>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    validate_payload(&payload)?;
    let result = sqlx::query(
        r#"
        INSERT INTO devices (device_id, name, device_type, protocol, status)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&payload.device_id)
    .bind(&payload.name)
    .bind(&payload.device_type)
    .bind(&payload.protocol)
    .bind(&payload.status)
    .execute(&state.mysql)
    .await?;

    let id = result.last_insert_id() as i64;
    let row = sqlx::query_as::<_, DeviceRow>(
        r#"
        SELECT id, device_id, name, device_type, protocol, status, created_at, updated_at
        FROM devices
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(&state.mysql)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "success": true,
            "data": to_device_json(&row)
        })),
    ))
}

async fn update_device(
    Path(id): Path<i64>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeviceInput>,
) -> Result<Json<serde_json::Value>, ApiError> {
    validate_payload(&payload)?;
    let affected = sqlx::query(
        r#"
        UPDATE devices
        SET device_id = ?, name = ?, device_type = ?, protocol = ?, status = ?
        WHERE id = ?
        "#,
    )
    .bind(&payload.device_id)
    .bind(&payload.name)
    .bind(&payload.device_type)
    .bind(&payload.protocol)
    .bind(&payload.status)
    .bind(id)
    .execute(&state.mysql)
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(ApiError::NotFound);
    }

    let row = sqlx::query_as::<_, DeviceRow>(
        r#"
        SELECT id, device_id, name, device_type, protocol, status, created_at, updated_at
        FROM devices
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(&state.mysql)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": to_device_json(&row)
    })))
}

async fn delete_device(
    Path(id): Path<i64>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let affected = sqlx::query("DELETE FROM devices WHERE id = ?")
        .bind(id)
        .execute(&state.mysql)
        .await?
        .rows_affected();
    if affected == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(Json(json!({
        "success": true,
        "data": { "id": id }
    })))
}

fn validate_payload(payload: &DeviceInput) -> Result<(), ApiError> {
    if payload.device_id.trim().is_empty() {
        return Err(ApiError::Validation("deviceId is required".to_string()));
    }
    if payload.name.trim().is_empty() {
        return Err(ApiError::Validation("name is required".to_string()));
    }
    if payload.device_type.trim().is_empty() {
        return Err(ApiError::Validation("type is required".to_string()));
    }
    if payload.protocol.trim().is_empty() {
        return Err(ApiError::Validation("protocol is required".to_string()));
    }
    if payload.status.trim().is_empty() {
        return Err(ApiError::Validation("status is required".to_string()));
    }
    Ok(())
}

fn to_device_json(row: &DeviceRow) -> serde_json::Value {
    json!({
        "id": row.id,
        "deviceId": row.device_id,
        "name": row.name,
        "type": row.device_type,
        "protocol": row.protocol,
        "status": row.status,
        "createdAt": row.created_at.to_rfc3339(),
        "updatedAt": row.updated_at.to_rfc3339()
    })
}
