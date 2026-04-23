const mockQuery = jest.fn();

jest.mock('../src/utils/db', () => ({
  pgPool: {
    query: (...args) => mockQuery(...args)
  }
}));

class MockDevice {
  constructor(data) {
    this.data = data;
  }

  static validate(data) {
    if (!data || !data.deviceId || !data.name || !data.type || !data.protocol) {
      return {
        error: { details: [{ message: 'invalid device payload' }] }
      };
    }
    return { value: data };
  }

  static get DeviceStatus() {
    return {
      ONLINE: 'online',
      OFFLINE: 'offline',
      DISCONNECTED: 'disconnected',
      ERROR: 'error'
    };
  }

  toJSON() {
    return this.data;
  }
}

class MockSensorMetadata {
  constructor(data) {
    this.data = data;
  }

  static validate(data) {
    return { value: data };
  }

  toJSON() {
    return this.data;
  }
}

jest.mock('../../../shared/models/device', () => MockDevice);
jest.mock('../../../shared/models/sensor', () => MockSensorMetadata);

const DeviceController = require('../src/controllers/deviceController');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('DeviceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registerDevice should return 400 for invalid payload', async () => {
    const req = { body: { name: 'bad-device' } };
    const res = createRes();

    await DeviceController.registerDevice(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  test('registerDevice should return 409 if device already exists', async () => {
    const req = {
      body: {
        deviceId: 'dev-001',
        name: 'sensor 1',
        type: 'sensor',
        protocol: 'mqtt',
        configuration: {}
      }
    };
    const res = createRes();

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await DeviceController.registerDevice(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Device already exists');
  });

  test('registerDevice should return 201 for a valid new device', async () => {
    const req = {
      body: {
        deviceId: 'dev-100',
        name: 'camera 100',
        type: 'camera',
        protocol: 'http',
        configuration: {},
        status: 'online'
      }
    };
    const res = createRes();

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 100,
          deviceId: 'dev-100',
          name: 'camera 100',
          type: 'camera',
          protocol: 'http',
          configuration: {},
          status: 'online'
        }]
      });

    await DeviceController.registerDevice(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe('dev-100');
  });

  test('getDevices should return list and pagination', async () => {
    const req = { query: { page: '1', limit: '10', status: 'online' } };
    const res = createRes();

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          deviceId: 'dev-001',
          name: 'sensor',
          type: 'sensor',
          protocol: 'mqtt',
          status: 'online'
        }]
      })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    await DeviceController.getDevices(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.devices).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  test('getDevices should apply data-scope filter when access profile exists', async () => {
    const req = {
      query: { page: '1', limit: '10' },
      user: { id: 8 },
      accessProfile: {
        dataScope: {
          scopeTypes: ['DEPT_AND_CHILD'],
          departmentIds: [3, 4],
          selfOnly: false
        }
      }
    };
    const res = createRes();

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await DeviceController.getDevices(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('department_id = ANY');
  });

  test('getDeviceById should return 404 for non-existing device', async () => {
    const req = { params: { id: '999' } };
    const res = createRes();

    mockQuery.mockResolvedValueOnce({ rows: [] });

    await DeviceController.getDeviceById(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Device not found');
  });

  test('updateDevice should return 404 for non-existing device', async () => {
    const req = {
      params: { id: '9' },
      body: {
        deviceId: 'dev-009',
        name: 'sensor 9',
        type: 'sensor',
        protocol: 'mqtt',
        status: 'offline'
      }
    };
    const res = createRes();

    mockQuery.mockResolvedValueOnce({ rows: [] });

    await DeviceController.updateDevice(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Device not found');
  });

  test('updateDevice should return 200 for existing device', async () => {
    const req = {
      params: { id: '2' },
      body: {
        deviceId: 'dev-002',
        name: 'sensor 2',
        type: 'sensor',
        protocol: 'mqtt',
        status: 'online',
        configuration: {}
      }
    };
    const res = createRes();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 2,
          deviceId: 'dev-002',
          name: 'sensor 2',
          type: 'sensor',
          protocol: 'mqtt',
          status: 'online',
          configuration: {}
        }]
      });

    await DeviceController.updateDevice(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(2);
  });

  test('deleteDevice should delete related resources and return 200', async () => {
    const req = { params: { id: '3' } };
    const res = createRes();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await DeviceController.deleteDevice(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  test('updateDeviceStatus should reject invalid status', async () => {
    const req = { params: { id: '1' }, body: { status: 'bad-status' } };
    const res = createRes();

    await DeviceController.updateDeviceStatus(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid status');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
