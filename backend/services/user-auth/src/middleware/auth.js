const jwt = require('jsonwebtoken');
const { getMySQLPool } = require('../utils/db');

/**
 * JWT 认证中间件
 */
function authenticateToken(req, res, next) {
  // 从请求头获取授权信息
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'No token provided'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', async (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Invalid or expired token'
      });
    }

    try {
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        `SELECT id, username, email, status, last_login_at, created_at FROM users WHERE id = ?`,
        [user.userId]
      );

      if (users.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'User not found'
        });
      }

      if (users[0].status !== 'active') {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'User account is not active'
        });
      }

      // 将用户信息添加到 req 中
      req.user = {
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        status: users[0].status
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: 'Token verification failed'
      });
    }
  });
}

/**
 * 权限检查中间件
 */
async function requirePermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const pool = getMySQLPool();

      // 获取用户角色
      const [userRoles] = await pool.execute(`
        SELECT r.name, r.id FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `, [req.user.id]);

      // 如果是管理员，直接允许
      if (userRoles.some(role => role.name === 'admin')) {
        return next();
      }

      // 检查用户是否具有所需权限
      const [permissions] = await pool.execute(`
        SELECT p.name FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id IN (${userRoles.map(role => role.id).join(',')})
          AND (p.name = ? OR p.name = '${requiredPermission.split('.')[0]}.*')
      `, [requiredPermission]);

      if (permissions.length > 0) {
        return next();
      }

      return res.status(403).json({
        error: 'Forbidden',
        details: `You do not have the required permission: ${requiredPermission}`
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: 'Permission check failed'
      });
    }
  };
}

/**
 * 角色检查中间件
 */
async function requireRole(requiredRole) {
  return async (req, res, next) => {
    try {
      const pool = getMySQLPool();

      // 获取用户角色
      const [userRoles] = await pool.execute(`
        SELECT r.name FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `, [req.user.id]);

      if (userRoles.some(role => role.name === requiredRole || role.name === 'admin')) {
        return next();
      }

      return res.status(403).json({
        error: 'Forbidden',
        details: `You do not have the required role: ${requiredRole}`
      });
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: 'Role check failed'
      });
    }
  };
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole
};
