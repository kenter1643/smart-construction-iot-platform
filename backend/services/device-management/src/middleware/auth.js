const jwt = require('jsonwebtoken');
const axios = require('axios');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7);
}

function authenticateToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'No token provided'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, payload) => {
    if (err) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Invalid or expired token'
      });
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
    if (!req.token) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'No token provided'
      });
    }

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

module.exports = {
  authenticateToken,
  attachAccessProfile,
  requirePermission
};
