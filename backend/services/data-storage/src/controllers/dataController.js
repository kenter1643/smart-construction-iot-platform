const { getMySQLPool, getInfluxClient } = require('../utils/db');

/**
 * 存储传感器数据
 */
async function storeSensorData(req, res, next) {
  try {
    const { deviceId, type, location, value, unit, timestamp } = req.body;
    if (!deviceId || !type || value === undefined || value === null) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'deviceId, type and value are required'
      });
    }
    const time = timestamp ? new Date(timestamp) : new Date();

    // 使用 InfluxDB 存储时间序列数据
    const influx = getInfluxClient();
    await influx.writePoints([
      {
        measurement: 'sensor_data',
        tags: {
          deviceId,
          type,
          location: location || 'unknown'
        },
        fields: {
          value,
          unit: unit || 'unknown'
        },
        timestamp: time
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Sensor data stored successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 存储设备数据
 */
async function storeDeviceData(req, res, next) {
  try {
    const { deviceId, status, metadata, timestamp } = req.body;
    const time = timestamp ? new Date(timestamp) : new Date();

    // 使用 MySQL 存储设备数据
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'INSERT INTO device_data (device_id, status, metadata, created_at) VALUES (?, ?, ?, ?)',
      [deviceId, status, JSON.stringify(metadata), time]
    );

    res.status(201).json({
      success: true,
      message: 'Device data stored successfully',
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
 * 获取传感器数据
 */
async function getSensorData(req, res, next) {
  try {
    const { deviceId, startTime, endTime, limit, offset, aggregate } = req.query;
    const influx = getInfluxClient();

    // 构建查询条件
    let query = `SELECT mean(value) as value, first(unit) as unit FROM sensor_data WHERE deviceId = '${deviceId}'`;

    if (startTime) {
      query += ` AND time >= '${startTime}'`;
    }

    if (endTime) {
      query += ` AND time <= '${endTime}'`;
    }

    if (aggregate) {
      query += ` GROUP BY time(${aggregate})`;
    }

    query += ` ORDER BY time DESC LIMIT ${limit} OFFSET ${offset}`;

    const results = await influx.query(query);
    const data = results.map(result => ({
      deviceId: result.deviceId,
      type: result.type,
      location: result.location,
      value: result.value,
      unit: result.unit,
      timestamp: result.time
    }));

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取设备数据统计
 */
async function getDeviceStats(req, res, next) {
  try {
    const { deviceId, startTime, endTime } = req.query;
    const pool = getMySQLPool();

    let query = `
      SELECT
        status,
        COUNT(*) as count,
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_duration
      FROM device_data
      WHERE created_at >= ? AND created_at <= ?
    `;

    const params = [startTime, endTime];

    if (deviceId) {
      query += ' AND device_id = ?';
      params.push(deviceId);
    }

    query += ' GROUP BY status';

    const [results] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取传感器数据趋势
 */
async function getSensorTrends(req, res, next) {
  try {
    const { deviceId, startTime, endTime, interval } = req.query;
    const influx = getInfluxClient();

    const query = `
      SELECT mean(value) as value, first(unit) as unit
      FROM sensor_data
      WHERE deviceId = '${deviceId}'
        AND time >= '${startTime}'
        AND time <= '${endTime}'
      GROUP BY time(${interval})
      ORDER BY time ASC
    `;

    const results = await influx.query(query);
    const data = results.map(result => ({
      time: result.time,
      value: result.value,
      unit: result.unit
    }));

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取设备状态历史
 */
async function getDeviceHistory(req, res, next) {
  try {
    const { deviceId, startTime, endTime, limit } = req.query;
    const pool = getMySQLPool();

    let query = `
      SELECT
        id,
        device_id,
        status,
        metadata,
        created_at as timestamp
      FROM device_data
      WHERE device_id = ?
    `;

    const params = [deviceId];

    if (startTime) {
      query += ' AND created_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND created_at <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [results] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: results.map(row => ({
        id: row.id,
        deviceId: row.device_id,
        status: row.status,
        metadata: JSON.parse(row.metadata || '{}'),
        timestamp: row.timestamp
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 数据分析
 */
async function analyzeData(req, res, next) {
  try {
    const { deviceId, startTime, endTime, analysisType } = req.body;
    const influx = getInfluxClient();
    const pool = getMySQLPool();

    const results = {};

    if (analysisType === 'basic' || analysisType === 'all') {
      // 基本分析：统计信息
      const stats = await influx.query(`
        SELECT
          mean(value) as avg,
          max(value) as max,
          min(value) as min,
          stddev(value) as std
        FROM sensor_data
        WHERE deviceId = '${deviceId}'
          AND time >= '${startTime}'
          AND time <= '${endTime}'
      `);
      results.stats = stats[0];
    }

    if (analysisType === 'statistics' || analysisType === 'all') {
      // 详细统计分析
      results.statistics = await influx.query(`
        SELECT
          percentile(value, 25) as p25,
          percentile(value, 50) as p50,
          percentile(value, 75) as p75,
          percentile(value, 95) as p95,
          percentile(value, 99) as p99
        FROM sensor_data
        WHERE deviceId = '${deviceId}'
          AND time >= '${startTime}'
          AND time <= '${endTime}'
      `);
    }

    if (analysisType === 'anomalies' || analysisType === 'all') {
      // 异常检测
      results.anomalies = await detectAnomalies(influx, deviceId, startTime, endTime);
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 导出数据
 */
async function exportData(req, res, next) {
  try {
    const { deviceId, startTime, endTime, format } = req.query;

    // 根据 format 参数选择导出格式
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${deviceId}_data.csv"`);

      // 构建 CSV 数据
      res.send(await generateCSVData(deviceId, startTime, endTime));
    } else {
      // 默认 JSON 格式
      const [sensorData, deviceData] = await Promise.all([
        getSensorDataInternal(deviceId, startTime, endTime),
        getDeviceDataInternal(deviceId, startTime, endTime)
      ]);

      res.status(200).json({
        success: true,
        data: {
          sensorData,
          deviceData
        }
      });
    }
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 内部函数：获取传感器数据
 */
async function getSensorDataInternal(deviceId, startTime, endTime) {
  const influx = getInfluxClient();

  const query = `
    SELECT * FROM sensor_data
    WHERE deviceId = '${deviceId}'
      AND time >= '${startTime}'
      AND time <= '${endTime}'
    ORDER BY time DESC
  `;

  const results = await influx.query(query);

  return results.map(row => ({
    deviceId: row.deviceId,
    type: row.type,
    location: row.location,
    value: row.value,
    unit: row.unit,
    timestamp: row.time
  }));
}

/**
 * 内部函数：获取设备数据
 */
async function getDeviceDataInternal(deviceId, startTime, endTime) {
  const pool = getMySQLPool();
  const [results] = await pool.execute(
    `SELECT * FROM device_data WHERE device_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
    [deviceId, startTime, endTime]
  );

  return results.map(row => ({
    id: row.id,
    deviceId: row.device_id,
    status: row.status,
    metadata: JSON.parse(row.metadata || '{}'),
    timestamp: row.created_at
  }));
}

/**
 * 内部函数：生成 CSV 数据
 */
async function generateCSVData(deviceId, startTime, endTime) {
  const [sensorData, deviceData] = await Promise.all([
    getSensorDataInternal(deviceId, startTime, endTime),
    getDeviceDataInternal(deviceId, startTime, endTime)
  ]);

  let csv = 'timestamp,deviceId,type,location,value,unit,status\n';

  sensorData.forEach(row => {
    csv += `${row.timestamp.toISOString()},${row.deviceId},${row.type},${row.location},${row.value},${row.unit},\n`;
  });

  deviceData.forEach(row => {
    csv += `${row.timestamp.toISOString()},${row.deviceId},,${row.status}\n`;
  });

  return csv;
}

/**
 * 内部函数：检测异常数据
 */
async function detectAnomalies(influx, deviceId, startTime, endTime) {
  // 异常检测逻辑：基于标准偏差的方法
  const stats = await influx.query(`
    SELECT mean(value) as mean, stddev(value) as std FROM sensor_data
    WHERE deviceId = '${deviceId}'
      AND time >= '${startTime}'
      AND time <= '${endTime}'
  `);

  const { mean, std } = stats[0];
  const threshold = mean + 2 * std; // 2σ 阈值

  const anomalies = await influx.query(`
    SELECT time, value FROM sensor_data
    WHERE deviceId = '${deviceId}'
      AND time >= '${startTime}'
      AND time <= '${endTime}'
      AND value > ${threshold}
  `);

  return anomalies.map(row => ({
    time: row.time,
    value: row.value
  }));
}

module.exports = {
  storeSensorData,
  storeDeviceData,
  getSensorData,
  getDeviceStats,
  getSensorTrends,
  getDeviceHistory,
  analyzeData,
  exportData
};
