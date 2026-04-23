jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn() }));

jest.mock('../../backend/services/data-storage/src/utils/db', () => ({
  getMySQLPool: jest.fn()
}));

jest.mock('../../backend/services/alerts-notifications/src/utils/db', () => ({
  getMySQLPool: jest.fn()
}));

const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getMySQLPool: getDataStoragePool } = require('../../backend/services/data-storage/src/utils/db');
const { getMySQLPool: getAlertsPool } = require('../../backend/services/alerts-notifications/src/utils/db');
const dataAuth = require('../../backend/services/data-storage/src/middleware/auth');
const alertsAuth = require('../../backend/services/alerts-notifications/src/middleware/auth');

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

describe('service authz parity middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('data-storage authenticateToken should return 401 when token missing', () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    dataAuth.authenticateToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('alerts attachAccessProfile should attach permissions', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          permissions: ['alert.read']
        }
      }
    });

    const req = { token: 'abc' };
    const res = createRes();
    const next = jest.fn();

    await alertsAuth.attachAccessProfile(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.accessProfile.permissions).toContain('alert.read');
  });

  test('alerts requirePermission should return 403 when missing permission', () => {
    const req = { accessProfile: { permissions: ['device.read'] } };
    const res = createRes();
    const next = jest.fn();

    alertsAuth.requirePermission('alert.manage')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('data-storage scoped middleware should return 403 for denied device', async () => {
    getDataStoragePool.mockReturnValue({
      execute: jest.fn().mockResolvedValueOnce([[], []])
    });

    const req = {
      query: { deviceId: 'DEV-999' },
      accessProfile: {
        dataScope: {
          scopeTypes: ['DEPT_AND_CHILD'],
          departmentIds: [1, 2],
          selfOnly: false
        }
      }
    };
    const res = createRes();
    const next = jest.fn();

    await dataAuth.requireScopedDeviceIdInQuery('deviceId')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('alerts rule scope middleware should allow accessible rule', async () => {
    getAlertsPool.mockReturnValue({
      execute: jest
        .fn()
        .mockResolvedValueOnce([[{ device_id: 'DEV-001' }], []])
        .mockResolvedValueOnce([[{ 1: 1 }], []])
    });

    const req = {
      params: { id: '10' },
      accessProfile: {
        dataScope: {
          scopeTypes: ['DEPT'],
          departmentIds: [1],
          selfOnly: false
        }
      }
    };
    const res = createRes();
    const next = jest.fn();

    await alertsAuth.requireAlertRuleScope('id')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('authenticateToken should pass when jwt valid', () => {
    jwt.verify.mockImplementationOnce((token, secret, cb) => {
      cb(null, { userId: 1, username: 'u', email: 'u@test.com' });
    });

    const req = { headers: { authorization: 'Bearer token-x' } };
    const res = createRes();
    const next = jest.fn();

    dataAuth.authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
  });
});
