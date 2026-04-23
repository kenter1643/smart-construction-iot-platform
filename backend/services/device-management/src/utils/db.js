const { Pool } = require('pg');
const Influx = require('influx');
require('dotenv').config();

// PostgreSQL 连接池
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'smartiot',
  user: process.env.POSTGRES_USER || 'smartiot',
  password: process.env.POSTGRES_PASSWORD || 'smartiot123'
});

// InfluxDB 客户端
const influxClient = new Influx.InfluxDB({
  url: process.env.INFLUXDB_URL || 'http://localhost:8086',
  token: process.env.INFLUXDB_TOKEN || 'my-super-secret-auth-token',
  org: process.env.INFLUXDB_ORG || 'smart-construction',
  bucket: process.env.INFLUXDB_BUCKET || 'sensor-data'
});

async function ensureDeviceSchema() {
  await pgPool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS department_id INTEGER`);
  await pgPool.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS owner_user_id INTEGER`);
  await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_devices_department_id ON devices(department_id)`);
  await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_devices_owner_user_id ON devices(owner_user_id)`);
}

// 测试连接
const testConnections = async () => {
  try {
    console.log('Testing PostgreSQL connection...');
    const pgResult = await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL connection successful:', pgResult.rows[0]);

    console.log('Testing InfluxDB connection...');
    await influxClient.ping(5000);
    console.log('InfluxDB connection successful');

    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
};

module.exports = {
  pgPool,
  influxClient,
  ensureDeviceSchema,
  testConnections
};
