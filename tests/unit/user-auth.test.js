const authController = require('../../backend/services/user-auth/src/controllers/authController');
const { getMySQLPool } = require('../../backend/services/user-auth/src/utils/db');
const bcrypt = require('bcryptjs');

// 模拟数据库操作
jest.mock('../../backend/services/user-auth/src/utils/db');

describe('用户身份认证系统单元测试', () => {
  describe('用户注册', () => {
    it('应该成功注册新用户', async () => {
      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockResolvedValue([{ insertId: 1 }, []])
      });

      // 准备测试数据
      const req = {
        body: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User',
          phone: '1234567890'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.register(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('应该拒绝重复用户名注册', async () => {
      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation(query => {
          if (query.includes('WHERE username')) {
            return [[{ id: 1 }], []];
          }
          return [[], []];
        })
      });

      // 准备测试数据
      const req = {
        body: {
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123',
          fullName: 'New User',
          phone: '1234567890'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.register(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('用户登录', () => {
    it('应该成功登录', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation(query => {
          if (query.includes('SELECT id, username')) {
            return [[{
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              password_hash: passwordHash,
              status: 'active'
            }], []];
          }
          return [[], []];
        })
      });

      // 准备测试数据
      const req = {
        body: {
          username: 'testuser',
          password: 'password123'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('jest-test-agent')
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.login(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该拒绝不存在的用户', async () => {
      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockResolvedValue([[], []])
      });

      // 准备测试数据
      const req = {
        body: {
          username: 'nonexistent',
          password: 'password123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.login(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('密码修改', () => {
    it('应该成功修改密码', async () => {
      const oldPasswordHash = await bcrypt.hash('oldpassword', 10);

      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation(query => {
          if (query.includes('password_hash')) {
            return [[{ password_hash: oldPasswordHash }], []];
          }
          return [[], []];
        })
      });

      // 准备测试数据
      const req = {
        user: { id: 1 },
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.changePassword(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('应该拒绝无效的当前密码', async () => {
      const oldPasswordHash = await bcrypt.hash('oldpassword', 10);

      // 模拟数据库操作
      getMySQLPool.mockReturnValue({
        execute: jest.fn().mockImplementation(query => {
          if (query.includes('password_hash')) {
            return [[{ password_hash: oldPasswordHash }], []];
          }
          return [[], []];
        })
      });

      // 准备测试数据
      const req = {
        user: { id: 1 },
        body: {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 执行测试
      await authController.changePassword(req, res);

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
