const Joi = require('joi');

// 注册验证
const register = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  fullName: Joi.string().max(100),
  phone: Joi.string().max(50)
});

// 登录验证
const login = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// 更新用户验证
const updateUser = Joi.object({
  fullName: Joi.string().max(100),
  phone: Joi.string().max(50),
  email: Joi.string().email()
});

// 修改密码验证
const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(100).required()
});

// 分配角色验证
const assignRole = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required()
});

// 创建角色验证
const createRole = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500)
});

// 分配权限验证
const assignPermission = Joi.object({
  roleId: Joi.number().integer().required(),
  permissionId: Joi.number().integer().required()
});

// 审计日志查询验证
const auditLogQuery = Joi.object({
  userId: Joi.number().integer(),
  action: Joi.string(),
  resource: Joi.string(),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

module.exports = {
  authValidationSchema: {
    register,
    login,
    updateUser,
    changePassword,
    assignRole,
    createRole,
    assignPermission,
    auditLogQuery
  }
};
