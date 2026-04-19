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
 * 初始化用户和权限表
 */
async function initAuthTables() {
  const pool = getMySQLPool();

  // 创建用户表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      phone VARCHAR(50),
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建角色表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建用户角色关联表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE KEY uk_user_role (user_id, role_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建权限表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      resource VARCHAR(100),
      action VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建角色权限关联表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE KEY uk_role_permission (role_id, permission_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 创建审计日志表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      username VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      resource_id VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      request_method VARCHAR(10),
      request_path VARCHAR(255),
      status_code INT,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_action (action),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 初始化默认角色
  await pool.execute(`
    INSERT IGNORE INTO roles (name, description) VALUES
    ('admin', '系统管理员，拥有所有权限'),
    ('manager', '项目经理，可以管理设备和查看数据'),
    ('operator', '设备操作员，可以控制设备'),
    ('viewer', '查看者，只能查看数据')
  `);

  // 初始化默认权限
  await pool.execute(`
    INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
    ('device.create', '创建设备', 'device', 'create'),
    ('device.read', '查看设备', 'device', 'read'),
    ('device.update', '更新设备', 'device', 'update'),
    ('device.delete', '删除设备', 'device', 'delete'),
    ('device.control', '控制设备', 'device', 'control'),
    ('video.view', '查看视频', 'video', 'view'),
    ('alert.read', '查看告警', 'alert', 'read'),
    ('alert.manage', '管理告警', 'alert', 'manage'),
    ('user.create', '创建用户', 'user', 'create'),
    ('user.read', '查看用户', 'user', 'read'),
    ('user.update', '更新用户', 'user', 'update'),
    ('user.delete', '删除用户', 'user', 'delete'),
    ('role.manage', '管理角色权限', 'role', 'manage'),
    ('data.export', '导出数据', 'data', 'export'),
    ('system.config', '系统配置', 'system', 'config')
  `);

  // 为 admin 角色分配所有权限
  await pool.execute(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT 1, id FROM permissions
  `);

  console.log('Auth tables initialized');
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
  initAuthTables,
  closeDB,
  testConnections
};
