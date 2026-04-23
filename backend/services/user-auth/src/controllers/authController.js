const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getMySQLPool } = require('../utils/db');
const { buildInClause } = require('../utils/accessControl');

/**
 * 注册新用户
 */
async function register(req, res, next) {
  try {
    const { username, email, password, fullName, phone } = req.body;
    const pool = getMySQLPool();

    // 检查用户是否已存在
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        details: 'Username or email already exists'
      });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)`,
      [username, email, passwordHash, fullName, phone]
    );

    // 默认分配 viewer 角色
    const [viewerRole] = await pool.execute(
      `SELECT id FROM roles WHERE name = 'viewer'`
    );
    if (viewerRole.length > 0) {
      await pool.execute(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [result.insertId, viewerRole[0].id]
      );
    }

    // 创建审计日志
    await createAuditLog({
      userId: result.insertId,
      action: 'user.register',
      resource: 'user',
      metadata: { username, email, fullName }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: result.insertId,
        username,
        email,
        fullName,
        phone,
        status: 'active'
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 用户登录
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const pool = getMySQLPool();

    // 查找用户
    const [users] = await pool.execute(
      `SELECT id, username, email, password_hash, status FROM users WHERE username = ? OR email = ?`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid username or password'
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User account is not active'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid username or password'
      });
    }

    // 更新登录时间
    await pool.execute(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [user.id]
    );

    // 生成 JWT token
    const token = jwt.sign({
      userId: user.id,
      username: user.username,
      email: user.email
    }, process.env.JWT_SECRET || 'default-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // 获取用户角色
    const [userRoles] = await pool.execute(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [user.id]);

    // 创建审计日志
    await createAuditLog({
      userId: user.id,
      action: 'user.login',
      resource: 'auth',
      metadata: { username: user.username, ip: req.ip, userAgent: req.get('User-Agent') }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: userRoles.map(role => role.name)
        }
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取用户配置文件
 */
async function getProfile(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, phone, status, last_login_at, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    const [userRoles] = await pool.execute(`
      SELECT r.name, r.id FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [req.user.id]);

    // 获取用户权限
    let permissions = [];
    if (userRoles.length > 0) {
      const inRoles = buildInClause(userRoles.map((role) => role.id));
      const [permissionRows] = await pool.execute(
        `SELECT p.name
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id IN ${inRoles.clause}`,
        inRoles.params
      );
      permissions = permissionRows;
    }

    res.status(200).json({
      success: true,
      data: {
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        fullName: users[0].full_name,
        phone: users[0].phone,
        status: users[0].status,
        lastLoginAt: users[0].last_login_at,
        createdAt: users[0].created_at,
        roles: userRoles.map(role => role.name),
        permissions: permissions.map(perm => perm.name)
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 更新用户配置文件
 */
async function updateProfile(req, res, next) {
  try {
    const pool = getMySQLPool();

    const updates = [];
    const params = [];

    if (req.body.fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(req.body.fullName);
    }

    if (req.body.phone !== undefined) {
      updates.push('phone = ?');
      params.push(req.body.phone);
    }

    if (req.body.email !== undefined) {
      // 检查邮箱是否已被其他用户使用
      const [existingUsers] = await pool.execute(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [req.body.email, req.user.id]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          details: 'Email already exists'
        });
      }

      updates.push('email = ?');
      params.push(req.body.email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No fields to update'
      });
    }

    params.push(req.user.id);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.update',
      resource: 'user',
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 修改密码
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const pool = getMySQLPool();

    // 获取当前密码
    const [users] = await pool.execute(
      `SELECT password_hash FROM users WHERE id = ?`,
      [req.user.id]
    );

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Current password is incorrect'
      });
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await pool.execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, req.user.id]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.password.change',
      resource: 'user',
      metadata: { passwordChanged: true }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 用户登出
 */
async function logout(req, res, next) {
  try {
    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.logout',
      resource: 'auth',
      metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取用户列表
 */
async function getUsers(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, phone, status, last_login_at, created_at
      FROM users ORDER BY created_at DESC
    `);

    // 获取用户角色
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const [userRoles] = await pool.execute(`
          SELECT r.name FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = ?
        `, [user.id]);

        return {
          ...user,
          fullName: user.full_name,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          roles: userRoles.map(role => role.name)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 根据 ID 获取用户
 */
async function getUserById(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = parseInt(req.params.id);

    const [users] = await pool.execute(`
      SELECT id, username, email, full_name, phone, status, last_login_at, created_at
      FROM users WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      });
    }

    const [userRoles] = await pool.execute(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [userId]);

    res.status(200).json({
      success: true,
      data: {
        ...users[0],
        fullName: users[0].full_name,
        lastLoginAt: users[0].last_login_at,
        createdAt: users[0].created_at,
        roles: userRoles.map(role => role.name)
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 创建用户
 */
async function createUser(req, res, next) {
  try {
    return register(req, res, next);
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 更新用户
 */
async function updateUser(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = parseInt(req.params.id);

    // 验证用户是否存在
    const [users] = await pool.execute(
      `SELECT id FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      });
    }

    const updates = [];
    const params = [];

    if (req.body.fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(req.body.fullName);
    }

    if (req.body.phone !== undefined) {
      updates.push('phone = ?');
      params.push(req.body.phone);
    }

    if (req.body.email !== undefined) {
      // 检查邮箱是否已被其他用户使用
      const [existingUsers] = await pool.execute(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [req.body.email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          details: 'Email already exists'
        });
      }

      updates.push('email = ?');
      params.push(req.body.email);
    }

    if (req.body.status !== undefined) {
      updates.push('status = ?');
      params.push(req.body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No fields to update'
      });
    }

    params.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.update',
      resource: 'user',
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 删除用户
 */
async function deleteUser(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = parseInt(req.params.id);

    // 防止删除自己
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'You cannot delete your own account'
      });
    }

    await pool.execute(
      `DELETE FROM users WHERE id = ?`,
      [userId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.delete',
      resource: 'user',
      metadata: { userId }
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取角色列表
 */
async function getRoles(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [roles] = await pool.execute(`
      SELECT id, name, description FROM roles ORDER BY name
    `);

    res.status(200).json({
      success: true,
      data: roles
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 根据 ID 获取角色
 */
async function getRoleById(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = parseInt(req.params.id);

    const [roles] = await pool.execute(`
      SELECT id, name, description FROM roles WHERE id = ?
    `, [roleId]);

    if (roles.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Role not found'
      });
    }

    const [permissions] = await pool.execute(`
      SELECT p.id, p.name, p.description FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [roleId]);

    res.status(200).json({
      success: true,
      data: {
        ...roles[0],
        permissions
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 创建角色
 */
async function createRole(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [result] = await pool.execute(
      `INSERT INTO roles (name, description) VALUES (?, ?)`,
      [req.body.name, req.body.description]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'role.create',
      resource: 'role',
      metadata: req.body
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 更新角色
 */
async function updateRole(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = parseInt(req.params.id);

    const [result] = await pool.execute(
      `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
      [req.body.name, req.body.description, roleId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'role.update',
      resource: 'role',
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Role updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 删除角色
 */
async function deleteRole(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = parseInt(req.params.id);

    await pool.execute(
      `DELETE FROM roles WHERE id = ?`,
      [roleId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'role.delete',
      resource: 'role',
      metadata: { roleId }
    });

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取权限列表
 */
async function getPermissions(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [permissions] = await pool.execute(`
      SELECT id, name, description, resource, action FROM permissions
      ORDER BY resource, action
    `);

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 根据 ID 获取权限
 */
async function getPermissionById(req, res, next) {
  try {
    const pool = getMySQLPool();
    const permissionId = parseInt(req.params.id);

    const [permissions] = await pool.execute(`
      SELECT id, name, description, resource, action FROM permissions
      WHERE id = ?
    `, [permissionId]);

    if (permissions.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Permission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: permissions[0]
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取用户角色
 */
async function getUserRoles(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = parseInt(req.params.id);

    const [userRoles] = await pool.execute(`
      SELECT r.id, r.name, r.description FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [userId]);

    res.status(200).json({
      success: true,
      data: userRoles
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 分配角色
 */
async function assignRole(req, res, next) {
  try {
    const pool = getMySQLPool();

    await pool.execute(
      `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [req.body.userId, req.body.roleId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.role.assign',
      resource: 'user',
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 移除角色
 */
async function removeRole(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = parseInt(req.params.id);
    const roleId = parseInt(req.params.roleId);

    await pool.execute(
      `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`,
      [userId, roleId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'user.role.remove',
      resource: 'user',
      metadata: { userId, roleId }
    });

    res.status(200).json({
      success: true,
      message: 'Role removed successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取角色权限
 */
async function getRolePermissions(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = parseInt(req.params.id);

    const [permissions] = await pool.execute(`
      SELECT p.id, p.name, p.description FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `, [roleId]);

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 分配权限
 */
async function assignPermission(req, res, next) {
  try {
    const pool = getMySQLPool();

    await pool.execute(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [req.body.roleId, req.body.permissionId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'role.permission.assign',
      resource: 'role',
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Permission assigned successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 移除权限
 */
async function removePermission(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = parseInt(req.params.id);
    const permissionId = parseInt(req.params.permissionId);

    await pool.execute(
      `DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
      [roleId, permissionId]
    );

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'role.permission.remove',
      resource: 'role',
      metadata: { roleId, permissionId }
    });

    res.status(200).json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取审计日志
 */
async function getAuditLogs(req, res, next) {
  try {
    const pool = getMySQLPool();

    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (req.query.userId) {
      query += ` AND user_id = ?`;
      params.push(req.query.userId);
    }

    if (req.query.action) {
      query += ` AND action LIKE ?`;
      params.push(`%${req.query.action}%`);
    }

    if (req.query.resource) {
      query += ` AND resource LIKE ?`;
      params.push(`%${req.query.resource}%`);
    }

    if (req.query.startTime) {
      query += ` AND created_at >= ?`;
      params.push(req.query.startTime);
    }

    if (req.query.endTime) {
      query += ` AND created_at <= ?`;
      params.push(req.query.endTime);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(req.query.limit), parseInt(req.query.offset));

    const [logs] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        username: log.username,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        ip: log.ip_address,
        userAgent: log.user_agent,
        requestMethod: log.request_method,
        requestPath: log.request_path,
        statusCode: log.status_code,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        createdAt: log.created_at
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 创建审计日志
 */
async function createAuditLog(data) {
  try {
    const pool = getMySQLPool();

    await pool.execute(`
      INSERT INTO audit_logs (
        user_id,
        username,
        action,
        resource,
        resource_id,
        ip_address,
        user_agent,
        request_method,
        request_path,
        status_code,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.userId,
      data.username,
      data.action,
      data.resource,
      data.resourceId,
      data.ip,
      data.userAgent,
      data.requestMethod,
      data.requestPath,
      data.statusCode,
      JSON.stringify(data.metadata)
    ]);
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getPermissionById,
  getUserRoles,
  assignRole,
  removeRole,
  getRolePermissions,
  assignPermission,
  removePermission,
  getAuditLogs
};
