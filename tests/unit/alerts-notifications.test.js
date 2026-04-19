const alertController = require('../../backend/services/alerts-notifications/src/controllers/alertController');

// 模拟数据库操作
jest.mock('../../backend/services/alerts-notifications/src/utils/db', () => ({
  getMySQLPool: jest.fn()
}));

const { getMySQLPool } = require('../../backend/services/alerts-notifications/src/utils/db');

describe('告警与通知模块单元测试', () => {
  // 在每个测试前配置模拟
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 模拟 MySQL 连接池
    const mockMySQLPool = {
      execute: jest.fn().mockResolvedValue([[], []])
    };

    getMySQLPool.mockReturnValue(mockMySQLPool);
  });
  describe('告警规则管理', () => {
    it('应该成功创建告警规则', async () => {
      // 准备测试数据
      const req = {
        body: {
          deviceId: 'DEV-001',
          ruleName: '温度过高告警',
          conditionType: 'threshold',
          conditionValue: {
            value: 30,
            operator: 'greater'
          },
          severity: 'high',
          enabled: true
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.createAlertRule(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('应该成功更新告警规则', async () => {
      // 准备测试数据
      const req = {
        params: { id: '1' },
        body: {
          ruleName: '更新后的告警规则',
          severity: 'medium'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.updateAlertRule(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该成功删除告警规则', async () => {
      // 准备测试数据
      const req = { params: { id: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.deleteAlertRule(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('告警规则启用/禁用', () => {
    it('应该成功启用告警规则', async () => {
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation((query) => {
          if (query.includes('SELECT enabled FROM alert_rules')) {
            return Promise.resolve([[{ enabled: false }], []]);
          }
          return Promise.resolve([{}, []]);
        })
      });

      // 准备测试数据
      const req = { params: { id: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.toggleAlertRule(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该成功禁用告警规则', async () => {
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation((query) => {
          if (query.includes('SELECT enabled FROM alert_rules')) {
            return Promise.resolve([[{ enabled: true }], []]);
          }
          return Promise.resolve([{}, []]);
        })
      });

      // 准备测试数据
      const req = { params: { id: '1' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.toggleAlertRule(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('告警历史查询', () => {
    it('应该成功查询告警历史', async () => {
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
      const next = jest.fn();
      await alertController.getAlertHistory(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该成功查询未处理的告警', async () => {
      // 准备测试数据
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.getUnresolvedAlerts(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('通知管理', () => {
    it('应该成功创建通知配置', async () => {
      // 准备测试数据
      const req = {
        body: {
          alertRuleId: 1,
          notificationType: 'email',
          recipient: 'user@example.com',
          enabled: true
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.createNotification(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('应该成功发送测试通知', async () => {
      // 准备测试数据
      const req = {
        body: {
          notificationType: 'email',
          recipient: 'test@example.com',
          message: 'This is a test notification'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      const next = jest.fn();
      await alertController.testNotification(req, res, next);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
