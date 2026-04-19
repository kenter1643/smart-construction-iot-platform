const { describe, it, expect, beforeAll, afterAll, jest } = require('jest');
const axios = require('axios');

// 配置
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('智慧工地物联网平台端到端集成测试', () => {
  let authToken;
  let testDeviceId;
  let testUserId;

  beforeAll(async () => {
    // 清理环境
    console.log('开始端到端集成测试...');
  });

  afterAll(async () => {
    // 清理环境
    console.log('端到端集成测试完成');
  });

  describe('用户身份认证流程', () => {
    it('应该成功注册新用户', async () => {
      const response = await axios.post(`${API_BASE}/api/v1/auth/register`, {
        username: 'e2e_test_user',
        email: 'e2e_test@example.com',
        password: 'password123',
        fullName: 'E2E Test User',
        phone: '1234567890'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      testUserId = response.data.data.id;
    });

    it('应该成功登录', async () => {
      const response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
        username: 'e2e_test_user',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.token).toBeDefined();
      authToken = response.data.data.token;
    });

    it('应该成功获取用户配置文件', async () => {
      const response = await axios.get(`${API_BASE}/api/v1/auth/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.username).toBe('e2e_test_user');
    });
  });

  describe('设备管理流程', () => {
    it('应该成功创建设备', async () => {
      const response = await axios.post(`${API_BASE}/api/v1/devices`, {
        deviceId: 'E2E-DEV-001',
        name: 'E2E 测试设备',
        type: 'sensor',
        protocol: 'mqtt',
        status: 'online'
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      testDeviceId = response.data.data.id;
    });

    it('应该成功获取设备列表', async () => {
      const response = await axios.get(`${API_BASE}/api/v1/devices`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('应该成功更新设备', async () => {
      const response = await axios.put(`${API_BASE}/api/v1/devices/${testDeviceId}`, {
        name: 'E2E 测试设备（已更新）',
        status: 'online'
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('数据存储与分析流程', () => {
    it('应该成功存储传感器数据', async () => {
      const response = await axios.post(`${API_BASE}/api/v1/data/sensor`, {
        deviceId: 'E2E-DEV-001',
        type: 'temperature',
        location: 'site-1',
        value: 25.5,
        unit: '°C'
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    it('应该成功查询传感器数据', async () => {
      const response = await axios.get(`${API_BASE}/api/v1/data/sensor`, {
        params: {
          deviceId: 'E2E-DEV-001',
          limit: 10
        },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('告警与通知流程', () => {
    it('应该成功创建告警规则', async () => {
      const response = await axios.post(`${API_BASE}/api/v1/alerts/rules`, {
        deviceId: 'E2E-DEV-001',
        ruleName: 'E2E 测试告警规则',
        conditionType: 'threshold',
        conditionValue: {
          value: 30,
          operator: 'greater'
        },
        severity: 'high',
        enabled: true
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    it('应该成功获取告警历史', async () => {
      const response = await axios.get(`${API_BASE}/api/v1/alerts/history`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('清理操作', () => {
    it('应该成功删除测试设备', async () => {
      const response = await axios.delete(`${API_BASE}/api/v1/devices/${testDeviceId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });
});
