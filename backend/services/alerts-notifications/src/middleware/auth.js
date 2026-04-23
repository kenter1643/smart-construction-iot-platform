const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getMySQLPool } = require('../utils/db');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7);
}

function authenticateToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', details: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden', details: 'Invalid or expired token' });
    }

    req.token = token;
    req.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email
    };

    return next();
  });
}

async function attachAccessProfile(req, res, next) {
  try {
    const authBase = process.env.AUTH_SERVICE_BASE || 'http://localhost:3005/api/v1/auth';
    const { data } = await axios.get(`${authBase}/access/profile`, {
      headers: { Authorization: `Bearer ${req.token}` },
      timeout: 5000
    });

    req.accessProfile = data?.data || {
      permissions: [],
      dataScope: { scopeTypes: ['SELF'], departmentIds: [], selfOnly: true },
      departments: []
    };

    return next();
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return res.status(status).json(error.response.data);
    }

    return res.status(502).json({
      error: 'Bad Gateway',
      details: 'Failed to load access profile from auth service'
    });
  }
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    const permissions = new Set((req.accessProfile?.permissions || []).map((item) => String(item)));
    const wildcard = `${permissionCode.split('.')[0]}.*`;

    if (permissions.has(permissionCode) || permissions.has(wildcard)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      details: `You do not have the required permission: ${permissionCode}`
    });
  };
}

async function canAccessDevice(req, deviceId) {
  const dataScope = req.accessProfile?.dataScope || {};
  const scopeTypes = dataScope.scopeTypes || [];

  if (scopeTypes.includes('ALL')) return true;
  if (!deviceId) return false;

  const departmentIds = Array.isArray(dataScope.departmentIds)
    ? dataScope.departmentIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
    : [];

  if (departmentIds.length === 0) return false;

  const placeholders = departmentIds.map(() => '?').join(', ');
  const pool = getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT 1 FROM device_departments WHERE device_id = ? AND department_id IN (${placeholders}) LIMIT 1`,
    [deviceId, ...departmentIds]
  );

  return rows.length > 0;
}

function requireDeviceScope(getDeviceId) {
  return async (req, res, next) => {
    try {
      const deviceId = getDeviceId(req);
      const allowed = await canAccessDevice(req, deviceId);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Device data scope denied'
        });
      }
      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: 'Data scope check failed'
      });
    }
  };
}

const requireScopedDeviceIdInQuery = (key = 'deviceId') => requireDeviceScope((req) => req.query?.[key]);
const requireScopedDeviceIdInBody = (key = 'deviceId') => requireDeviceScope((req) => req.body?.[key]);

function requireAlertRuleScope(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const ruleId = req.params?.[paramName];
      const pool = getMySQLPool();
      const [rows] = await pool.execute('SELECT device_id FROM alert_rules WHERE id = ?', [ruleId]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          details: 'Alert rule not found'
        });
      }

      const allowed = await canAccessDevice(req, rows[0].device_id);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Alert rule scope denied'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: 'Alert rule scope check failed'
      });
    }
  };
}

function requireAlertRuleScopeByBody(key = 'alertRuleId') {
  return async (req, res, next) => {
    try {
      const ruleId = req.body?.[key];
      const pool = getMySQLPool();
      const [rows] = await pool.execute('SELECT device_id FROM alert_rules WHERE id = ?', [ruleId]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          details: 'Alert rule not found'
        });
      }

      const allowed = await canAccessDevice(req, rows[0].device_id);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Alert rule scope denied'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: 'Alert rule scope check failed'
      });
    }
  };
}

function requireAlertHistoryScope(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const historyId = req.params?.[paramName];
      const pool = getMySQLPool();
      const [rows] = await pool.execute('SELECT device_id FROM alert_history WHERE id = ?', [historyId]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          details: 'Alert history not found'
        });
      }

      const allowed = await canAccessDevice(req, rows[0].device_id);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Alert history scope denied'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: 'Alert history scope check failed'
      });
    }
  };
}

function requireNotificationScope(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const notificationId = req.params?.[paramName];
      const pool = getMySQLPool();
      const [rows] = await pool.execute(
        `SELECT ar.device_id
         FROM notification_configs nc
         JOIN alert_rules ar ON ar.id = nc.alert_rule_id
         WHERE nc.id = ?`,
        [notificationId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          details: 'Notification config not found'
        });
      }

      const allowed = await canAccessDevice(req, rows[0].device_id);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Notification scope denied'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: 'Notification scope check failed'
      });
    }
  };
}

module.exports = {
  authenticateToken,
  attachAccessProfile,
  requirePermission,
  requireDeviceScope,
  requireScopedDeviceIdInQuery,
  requireScopedDeviceIdInBody,
  requireAlertRuleScope,
  requireAlertRuleScopeByBody,
  requireAlertHistoryScope,
  requireNotificationScope
};
