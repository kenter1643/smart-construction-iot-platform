const Device = require('../../../../shared/models/device');
const SensorMetadata = require('../../../../shared/models/sensor');
const { pgPool } = require('../utils/db');

class DeviceController {
  static applyDataScope(req, conditions, queryParams) {
    const dataScope = req.accessProfile?.dataScope;
    const userId = req.user?.id;

    if (!dataScope) return;

    const scopeTypes = dataScope.scopeTypes || [];
    if (scopeTypes.includes('ALL')) return;

    const scopeClauses = [];
    const departmentIds = Array.isArray(dataScope.departmentIds)
      ? dataScope.departmentIds.filter((item) => Number.isInteger(item) || /^\d+$/.test(String(item))).map((item) => Number(item))
      : [];

    if (departmentIds.length > 0) {
      queryParams.push(departmentIds);
      scopeClauses.push(`department_id = ANY($${queryParams.length}::int[])`);
    }

    const allowSelf = dataScope.selfOnly || scopeTypes.includes('SELF');
    if (allowSelf && userId) {
      queryParams.push(Number(userId));
      scopeClauses.push(`owner_user_id = $${queryParams.length}`);
    }

    if (scopeClauses.length === 0) {
      conditions.push('1 = 0');
    } else {
      conditions.push(`(${scopeClauses.join(' OR ')})`);
    }
  }

  static async getScopedDeviceById(id, req) {
    const queryParams = [id];
    const conditions = ['id = $1'];
    DeviceController.applyDataScope(req, conditions, queryParams);

    return pgPool.query(
      `SELECT * FROM devices WHERE ${conditions.join(' AND ')}`,
      queryParams
    );
  }

  static extractDepartmentId(req) {
    if (req.body.departmentId !== undefined && req.body.departmentId !== null) {
      const value = Number(req.body.departmentId);
      return Number.isInteger(value) && value > 0 ? value : null;
    }

    const departments = req.accessProfile?.departments || [];
    const primary = departments.find((item) => item.is_primary === 1);
    if (primary) return Number(primary.id);
    if (departments.length > 0) return Number(departments[0].id);

    return null;
  }

  // 注册设备
  static async registerDevice(req, res) {
    try {
      const { error, value } = Device.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const existingDevice = await pgPool.query(
        'SELECT * FROM devices WHERE device_id = $1',
        [value.deviceId]
      );

      if (existingDevice.rows.length > 0) {
        return res.status(409).json({
          error: 'Device already exists',
          details: `Device with ID "${value.deviceId}" already registered`
        });
      }

      const departmentId = DeviceController.extractDepartmentId(req);
      const ownerUserId = req.user?.id ? Number(req.user.id) : null;

      const result = await pgPool.query(
        `INSERT INTO devices (device_id, name, type, protocol, configuration, department_id, owner_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          value.deviceId,
          value.name,
          value.type,
          value.protocol,
          JSON.stringify(value.configuration || {}),
          departmentId,
          ownerUserId
        ]
      );

      const device = new Device(result.rows[0]);

      return res.status(201).json({
        success: true,
        data: {
          ...device.toJSON(),
          departmentId: result.rows[0].department_id,
          ownerUserId: result.rows[0].owner_user_id
        }
      });
    } catch (error) {
      console.error('Error registering device:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 获取设备列表
  static async getDevices(req, res) {
    try {
      const { page = '1', limit = '10', status, type, protocol } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const queryParams = [];
      let query = 'SELECT * FROM devices';
      const conditions = [];

      if (status) {
        queryParams.push(status);
        conditions.push(`status = $${queryParams.length}`);
      }
      if (type) {
        queryParams.push(type);
        conditions.push(`type = $${queryParams.length}`);
      }
      if (protocol) {
        queryParams.push(protocol);
        conditions.push(`protocol = $${queryParams.length}`);
      }

      DeviceController.applyDataScope(req, conditions, queryParams);

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(parseInt(limit, 10), offset);

      const result = await pgPool.query(query, queryParams);
      const devices = result.rows.map((row) => new Device(row));

      let countQuery = 'SELECT COUNT(*) FROM devices';
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      const countResult = await pgPool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].count, 10);

      return res.status(200).json({
        success: true,
        data: {
          devices: devices.map((device) => device.toJSON()),
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10))
          }
        }
      });
    } catch (error) {
      console.error('Error getting devices:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 获取单个设备
  static async getDeviceById(req, res) {
    try {
      const { id } = req.params;

      const result = await DeviceController.getScopedDeviceById(id, req);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${id}" not found`
        });
      }

      const device = new Device(result.rows[0]);

      return res.status(200).json({
        success: true,
        data: device.toJSON()
      });
    } catch (error) {
      console.error('Error getting device:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 更新设备信息
  static async updateDevice(req, res) {
    try {
      const { id } = req.params;

      const { error, value } = Device.validate({
        ...req.body,
        deviceId: req.body.deviceId || id
      });

      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const existingDevice = await DeviceController.getScopedDeviceById(id, req);

      if (existingDevice.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${id}" not found`
        });
      }

      const departmentId = DeviceController.extractDepartmentId(req) || existingDevice.rows[0].department_id;

      const result = await pgPool.query(
        `UPDATE devices
         SET device_id = $1, name = $2, type = $3, protocol = $4,
             configuration = $5, status = $6, department_id = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          value.deviceId,
          value.name,
          value.type,
          value.protocol,
          JSON.stringify(value.configuration || {}),
          value.status || 'offline',
          departmentId,
          id
        ]
      );

      const device = new Device(result.rows[0]);

      return res.status(200).json({
        success: true,
        data: device.toJSON()
      });
    } catch (error) {
      console.error('Error updating device:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 删除设备
  static async deleteDevice(req, res) {
    try {
      const { id } = req.params;

      const existingDevice = await DeviceController.getScopedDeviceById(id, req);

      if (existingDevice.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${id}" not found`
        });
      }

      await pgPool.query('DELETE FROM sensor_metadata WHERE device_id = $1', [id]);
      await pgPool.query('DELETE FROM video_recordings WHERE device_id = $1', [id]);
      await pgPool.query('DELETE FROM alerts WHERE device_id = $1', [id]);
      await pgPool.query('DELETE FROM devices WHERE id = $1', [id]);

      return res.status(200).json({
        success: true,
        data: { message: 'Device deleted successfully' }
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 获取设备状态
  static async getDeviceStatus(req, res) {
    try {
      const { id } = req.params;

      const scoped = await DeviceController.getScopedDeviceById(id, req);
      if (scoped.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${id}" not found`
        });
      }

      const result = await pgPool.query('SELECT id, device_id, status FROM devices WHERE id = $1', [id]);

      return res.status(200).json({
        success: true,
        data: {
          id: result.rows[0].id,
          deviceId: result.rows[0].device_id,
          status: result.rows[0].status
        }
      });
    } catch (error) {
      console.error('Error getting device status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 更新设备状态
  static async updateDeviceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Device.DeviceStatus[status.toUpperCase()]) {
        return res.status(400).json({
          error: 'Invalid status',
          details: `Status "${status}" is not valid. Valid statuses: ${Object.values(Device.DeviceStatus).join(', ')}`
        });
      }

      const scoped = await DeviceController.getScopedDeviceById(id, req);
      if (scoped.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${id}" not found`
        });
      }

      const result = await pgPool.query(
        'UPDATE devices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );

      const device = new Device(result.rows[0]);

      return res.status(200).json({
        success: true,
        data: device.toJSON()
      });
    } catch (error) {
      console.error('Error updating device status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 添加传感器元数据
  static async addSensorMetadata(req, res) {
    try {
      const { deviceId } = req.params;
      const { error, value } = SensorMetadata.validate({
        ...req.body,
        deviceId: parseInt(deviceId, 10)
      });

      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const deviceResult = await DeviceController.getScopedDeviceById(deviceId, req);
      if (deviceResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${deviceId}" not found`
        });
      }

      const result = await pgPool.query(
        `INSERT INTO sensor_metadata (device_id, sensor_name, sensor_type, unit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [value.deviceId, value.sensorName, value.sensorType, value.unit]
      );

      const sensorMetadata = new SensorMetadata(result.rows[0]);

      return res.status(201).json({
        success: true,
        data: sensorMetadata.toJSON()
      });
    } catch (error) {
      console.error('Error adding sensor metadata:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // 获取设备的传感器元数据
  static async getSensorMetadata(req, res) {
    try {
      const { deviceId } = req.params;

      const deviceResult = await DeviceController.getScopedDeviceById(deviceId, req);
      if (deviceResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Device not found',
          details: `Device with ID "${deviceId}" not found`
        });
      }

      const result = await pgPool.query(
        'SELECT * FROM sensor_metadata WHERE device_id = $1 ORDER BY created_at',
        [deviceId]
      );

      const sensors = result.rows.map((row) => new SensorMetadata(row));

      return res.status(200).json({
        success: true,
        data: sensors.map((sensor) => sensor.toJSON())
      });
    } catch (error) {
      console.error('Error getting sensor metadata:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

module.exports = DeviceController;
