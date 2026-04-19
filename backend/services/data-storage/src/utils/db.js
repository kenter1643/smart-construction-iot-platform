const mysql = require('mysql2/promise');
const Influx = require('influx');

// MySQL 连接配置
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'smartiot',
  password: process.env.MYSQL_PASSWORD || 'smartiot123',
  database: process.env.MYSQL_DATABASE || 'smartiot'
};

// InfluxDB 连接配置
const influxConfig = {
  host: process.env.INFLUX_HOST || 'localhost',
  port: process.env.INFLUX_PORT || 8086,
  database: process.env.INFLUX_DATABASE || 'sensor-data',
  schema: [
    {
      measurement: 'sensor_data',
      fields: {
        value: Influx.FieldType.FLOAT,
        unit: Influx.FieldType.STRING
      },
      tags: [
        'deviceId',
        'type',
        'location'
      ]
    }
  ]
};

// MySQL 连接池
let mysqlPool;

// InfluxDB 客户端
let influxClient;

/**
 * 初始化 MySQL 连接
 */
async function initMySQL() {
  try {
    mysqlPool = mysql.createPool({
      ...mysqlConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 测试连接
    const connection = await mysqlPool.getConnection();
    console.log('MySQL connection established');
    connection.release();

    return true;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error);
    return false;
  }
}

/**
 * 初始化 InfluxDB 客户端
 */
async function initInfluxDB() {
  try {
    influxClient = new Influx.InfluxDB({
      ...influxConfig,
      username: process.env.INFLUX_USER || 'smartiot',
      password: process.env.INFLUX_PASSWORD || 'smartiot123'
    });

    // 检查数据库是否存在
    const databases = await influxClient.getDatabaseNames();
    if (!databases.includes(influxConfig.database)) {
      await influxClient.createDatabase(influxConfig.database);
      console.log(`Created InfluxDB database: ${influxConfig.database}`);
    }

    console.log('InfluxDB connection established');
    return true;
  } catch (error) {
    console.error('Failed to connect to InfluxDB:', error);
    return false;
  }
}

/**
 * 初始化所有数据库连接
 */
async function initDB() {
  console.log('Initializing database connections...');

  const [mysqlOk, influxOk] = await Promise.all([
    initMySQL(),
    initInfluxDB()
  ]);

  return mysqlOk && influxOk;
}

/**
 * 获取 MySQL 连接池
 */
function getMySQLPool() {
  return mysqlPool;
}

/**
 * 获取 InfluxDB 客户端
 */
function getInfluxClient() {
  return influxClient;
}

/**
 * 关闭所有数据库连接
 */
async function closeDB() {
  if (mysqlPool) {
    await mysqlPool.end();
    console.log('MySQL connection pool closed');
  }

  console.log('All database connections closed');
}

/**
 * 测试数据库连接
 */
async function testConnections() {
  try {
    const mysqlConnection = await mysql.createConnection(mysqlConfig);
    await mysqlConnection.ping();
    mysqlConnection.end();
    console.log('MySQL connection test passed');
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return false;
  }

  try {
    const client = new Influx.InfluxDB({
      ...influxConfig,
      username: process.env.INFLUX_USER || 'smartiot',
      password: process.env.INFLUX_PASSWORD || 'smartiot123'
    });
    await client.getDatabaseNames();
    console.log('InfluxDB connection test passed');
  } catch (error) {
    console.error('InfluxDB connection test failed:', error);
    return false;
  }

  return true;
}

module.exports = {
  initDB,
  getMySQLPool,
  getInfluxClient,
  closeDB,
  testConnections
};
