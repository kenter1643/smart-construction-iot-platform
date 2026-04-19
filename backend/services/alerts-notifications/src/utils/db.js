const mysql = require('mysql2/promise');

// MySQL 连接配置
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'smartiot',
  password: process.env.MYSQL_PASSWORD || 'smartiot123',
  database: process.env.MYSQL_DATABASE || 'smartiot'
};

// MySQL 连接池
let mysqlPool;

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
 * 获取 MySQL 连接池
 */
function getMySQLPool() {
  return mysqlPool;
}

/**
 * 初始化告警规则表
 */
async function initAlertTables() {
  const pool = getMySQLPool();

  // 创建告警规则表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255) NOT NULL,
      rule_name VARCHAR(255) NOT NULL,
      condition_type ENUM('threshold', 'range', 'status_change') NOT NULL,
      condition_value JSON NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_device_id (device_id),
      INDEX idx_enabled (enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建告警历史表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rule_id INT NOT NULL,
      device_id VARCHAR(255) NOT NULL,
      alert_type VARCHAR(255) NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
      message TEXT NOT NULL,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      resolved BOOLEAN DEFAULT false,
      FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE,
      INDEX idx_device_id (device_id),
      INDEX idx_triggered_at (triggered_at),
      INDEX idx_resolved (resolved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建通知配置表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notification_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      alert_rule_id INT NOT NULL,
      notification_type ENUM('email', 'sms') NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE,
      INDEX idx_notification_type (notification_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('Alert tables initialized');
}

/**
 * 关闭 MySQL 连接
 */
async function closeDB() {
  if (mysqlPool) {
    await mysqlPool.end();
    console.log('MySQL connection pool closed');
  }
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
    return true;
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return false;
  }
}

module.exports = {
  initMySQL,
  getMySQLPool,
  initAlertTables,
  closeDB,
  testConnections
};
