const { describe, it, expect, beforeEach, afterEach, jest } = require('jest');
const dataController = require('../../backend/services/data-storage/src/controllers/dataController');

// 模拟数据库操作
jest.mock('../../backend/services/data-storage/src/utils/db');

describe('数据存储与分析模块单元测试', () => {
  describe('传感器数据存储', () => {
    it('应该成功存储传感器数据', async () => {
      // 准备测试数据
      const req = {
        body: {
          deviceId: 'DEV-001',
          type: 'temperature',
          location: 'site-1',
          value: 28.5,
          unit: '°C',
          timestamp: new Date().toISOString()
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await dataController.storeSensorData(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('应该拒绝缺少必需字段的数据', async () => {
      // 准备测试数据
      const req = {
        body: {
          // 缺少 deviceId 和 value
          type: 'temperature',
          unit: '°C'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await dataController.storeSensorData(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('传感器数据查询', () => {
    it('应该成功查询传感器数据', async () => {
      // 准备测试数据
      const req = {
        query: {
          deviceId: 'DEV-001',
          limit: 100,
          offset: 0
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await dataController.getSensorData(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('应该支持时间范围查询', async () => {
      // 准备测试数据
      const req = {
        query: {
          deviceId: 'DEV-001',
          startTime: new Date(Date.now() - 86400000).toISOString(),
          endTime: new Date().toISOString(),
          limit: 100,
          offset: 0
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await dataController.getSensorData(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('数据分析', () => {
    it('应该成功执行数据分析', async () => {
      // 准备测试数据
      const req = {
        body: {
          deviceId: 'DEV-001',
          startTime: new Date(Date.now() - 86400000).toISOString(),
          endTime: new Date().toISOString(),
          analysisType: 'basic'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await dataController.analyzeData(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该支持多种分析类型', async () => {
      // 准备测试数据
      const analysisTypes = ['basic', 'statistics', 'anomalies', 'all'];

      for (const analysisType of analysisTypes) {
        const req = {
          body: {
            deviceId: 'DEV-001',
            startTime: new Date(Date.now() - 86400000).toISOString(),
            endTime: new Date().toISOString(),
            analysisType
          }
        };

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        // 执行测试
        await dataController.analyzeData(req, res);

        // 验证结果
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });
  });
});
