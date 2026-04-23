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

async function ensureDevicesDepartmentColumn(pool) {
  try {
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'department_id'`,
      [mysqlConfig.database]
    );

    if (columns.length === 0) {
      await pool.execute(`ALTER TABLE devices ADD COLUMN department_id INT NULL`);
    }
  } catch (error) {
    // device-management 当前可能仍由 PostgreSQL 托管，此处仅做兼容增强，失败可忽略
    console.warn('Skip devices.department_id migration:', error.message);
  }
}

/**
 * 初始化用户和权限表
 */
async function initAuthTables() {
  const pool = getMySQLPool();

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

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      manager_user_id INT NULL,
      status TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_parent_id (parent_id),
      CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
      CONSTRAINT fk_departments_manager FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      department_id INT NOT NULL,
      is_primary TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_department (user_id, department_id),
      INDEX idx_user_primary (user_id, is_primary),
      CONSTRAINT fk_user_departments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_departments_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NULL,
      name VARCHAR(100) NOT NULL,
      menu_key VARCHAR(100) UNIQUE NOT NULL,
      path VARCHAR(255) NULL,
      component VARCHAR(255) NULL,
      type ENUM('directory', 'menu', 'button') NOT NULL,
      permission_code VARCHAR(100) NULL,
      sort_order INT DEFAULT 0,
      visible TINYINT(1) DEFAULT 1,
      status TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_parent_menu (parent_id),
      CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS role_menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      menu_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_menu (role_id, menu_id),
      CONSTRAINT fk_role_menus_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_role_menus_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS role_data_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      scope_type ENUM('ALL', 'DEPT_AND_CHILD', 'DEPT', 'SELF', 'CUSTOM') NOT NULL DEFAULT 'SELF',
      custom_rule_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_data_rule (role_id),
      CONSTRAINT fk_role_data_rules_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS role_data_rule_departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_data_rule_id INT NOT NULL,
      department_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_data_rule_department (role_data_rule_id, department_id),
      CONSTRAINT fk_rule_dept_rule FOREIGN KEY (role_data_rule_id) REFERENCES role_data_rules(id) ON DELETE CASCADE,
      CONSTRAINT fk_rule_dept_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS device_departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255) NOT NULL,
      department_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_device_department (device_id, department_id),
      CONSTRAINT fk_device_departments_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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

  await pool.execute(`
    INSERT IGNORE INTO roles (name, description) VALUES
    ('admin', '系统管理员，拥有所有权限'),
    ('manager', '项目经理，可管理设备和业务配置'),
    ('operator', '设备操作员，可执行业务操作'),
    ('viewer', '查看者，只读访问')
  `);

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
    ('menu.manage', '管理菜单', 'menu', 'manage'),
    ('department.manage', '管理组织', 'department', 'manage'),
    ('data.rule.manage', '管理数据权限规则', 'data_rule', 'manage'),
    ('data.export', '导出数据', 'data', 'export'),
    ('system.config', '系统配置', 'system', 'config')
  `);

  await pool.execute(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'admin'
  `);

  await pool.execute(`
    INSERT IGNORE INTO departments (parent_id, name, code, status, sort_order)
    VALUES
    (NULL, '集团总部', 'ROOT', 1, 0)
  `);

  await pool.execute(`
    INSERT IGNORE INTO departments (parent_id, name, code, status, sort_order)
    SELECT d.id, '城南工地A', 'SITE_A', 1, 10
    FROM departments d
    WHERE d.code = 'ROOT'
  `);

  await pool.execute(`
    INSERT IGNORE INTO departments (parent_id, name, code, status, sort_order)
    SELECT d.id, '城北工地B', 'SITE_B', 1, 20
    FROM departments d
    WHERE d.code = 'ROOT'
  `);

  await pool.execute(`
    INSERT IGNORE INTO user_departments (user_id, department_id, is_primary)
    SELECT u.id, d.id, 1
    FROM users u
    JOIN departments d ON d.code = 'ROOT'
  `);

  await pool.execute(`
    INSERT INTO role_data_rules (role_id, scope_type)
    SELECT id, 'ALL' FROM roles WHERE name = 'admin'
    ON DUPLICATE KEY UPDATE scope_type = VALUES(scope_type)
  `);
  await pool.execute(`
    INSERT INTO role_data_rules (role_id, scope_type)
    SELECT id, 'DEPT_AND_CHILD' FROM roles WHERE name = 'manager'
    ON DUPLICATE KEY UPDATE scope_type = VALUES(scope_type)
  `);
  await pool.execute(`
    INSERT INTO role_data_rules (role_id, scope_type)
    SELECT id, 'DEPT' FROM roles WHERE name = 'operator'
    ON DUPLICATE KEY UPDATE scope_type = VALUES(scope_type)
  `);
  await pool.execute(`
    INSERT INTO role_data_rules (role_id, scope_type)
    SELECT id, 'SELF' FROM roles WHERE name = 'viewer'
    ON DUPLICATE KEY UPDATE scope_type = VALUES(scope_type)
  `);

  await pool.execute(`
    INSERT IGNORE INTO menus (parent_id, name, menu_key, path, component, type, permission_code, sort_order, visible, status)
    VALUES
    (NULL, '工作台', 'dashboard', '/overview', 'overview', 'menu', NULL, 10, 1, 1),
    (NULL, '设备管理', 'device', '/device', 'device', 'menu', 'device.read', 20, 1, 1),
    (NULL, '视频监控', 'video', '/video', 'video', 'menu', 'video.view', 30, 1, 1),
    (NULL, '告警中心', 'alert', '/alert', 'alert', 'menu', 'alert.read', 40, 1, 1),
    (NULL, '系统管理', 'system', '/system', 'system', 'directory', 'role.manage', 50, 1, 1),
    (NULL, '用户管理', 'user-mgmt', '/users', 'user', 'menu', 'user.read', 60, 1, 1),
    (NULL, '权限设置', 'permission-mgmt', '/permissions', 'permission', 'menu', 'role.manage', 70, 1, 1),
    (NULL, '菜单管理', 'menu-mgmt', '/menus', 'menu', 'menu', 'menu.manage', 80, 1, 1),
    (NULL, '部门管理', 'department-mgmt', '/departments', 'department', 'menu', 'department.manage', 90, 1, 1),
    (NULL, '设备新增按钮', 'btn-device-create', NULL, NULL, 'button', 'device.create', 201, 1, 1),
    (NULL, '设备编辑按钮', 'btn-device-update', NULL, NULL, 'button', 'device.update', 202, 1, 1),
    (NULL, '设备删除按钮', 'btn-device-delete', NULL, NULL, 'button', 'device.delete', 203, 1, 1)
  `);

  await pool.execute(`
    INSERT IGNORE INTO role_menus (role_id, menu_id)
    SELECT r.id, m.id
    FROM roles r
    JOIN menus m ON 1 = 1
    WHERE r.name = 'admin'
  `);

  await ensureDevicesDepartmentColumn(pool);

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
