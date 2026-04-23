const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const accessController = require('../controllers/accessController');
const validate = require('../middleware/validate');
const { authValidationSchema } = require('../models/validators');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// 公共接口（无需认证）
router.post('/register', validate(authValidationSchema.register), authController.register);
router.post('/login', validate(authValidationSchema.login), authController.login);

// 当前用户访问画像
router.get('/access/profile', authenticateToken, accessController.getAccessProfileForCurrentUser);
router.get('/access/data-scope', authenticateToken, accessController.getDataScopeForCurrentUser);

// 需要认证的接口
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validate(authValidationSchema.updateUser), authController.updateProfile);
router.put('/password', authenticateToken, validate(authValidationSchema.changePassword), authController.changePassword);
router.get('/logout', authenticateToken, authController.logout);

// 用户管理接口（需要权限）
router.get('/users', authenticateToken, requirePermission('user.read'), authController.getUsers);
router.get('/users/:id', authenticateToken, requirePermission('user.read'), authController.getUserById);
router.post('/users', authenticateToken, requirePermission('user.create'), validate(authValidationSchema.register), authController.createUser);
router.put('/users/:id', authenticateToken, requirePermission('user.update'), validate(authValidationSchema.updateUser), authController.updateUser);
router.delete('/users/:id', authenticateToken, requirePermission('user.delete'), authController.deleteUser);

// 用户部门管理（需要权限）
router.get('/users/:id/departments', authenticateToken, requirePermission('department.manage'), accessController.getUserDepartments);
router.put('/users/:id/departments', authenticateToken, requirePermission('department.manage'), validate(authValidationSchema.setUserDepartments), accessController.setUserDepartments);

// 角色管理接口（需要权限）
router.get('/roles', authenticateToken, requirePermission('role.manage'), authController.getRoles);
router.get('/roles/:id', authenticateToken, requirePermission('role.manage'), authController.getRoleById);
router.post('/roles', authenticateToken, requirePermission('role.manage'), validate(authValidationSchema.createRole), authController.createRole);
router.put('/roles/:id', authenticateToken, requirePermission('role.manage'), validate(authValidationSchema.createRole), authController.updateRole);
router.delete('/roles/:id', authenticateToken, requirePermission('role.manage'), authController.deleteRole);

// 权限管理接口（需要权限）
router.get('/permissions', authenticateToken, requirePermission('role.manage'), authController.getPermissions);
router.get('/permissions/:id', authenticateToken, requirePermission('role.manage'), authController.getPermissionById);

// 用户角色管理接口（需要权限）
router.get('/users/:id/roles', authenticateToken, requirePermission('role.manage'), authController.getUserRoles);
router.post('/users/:id/roles', authenticateToken, requirePermission('role.manage'), validate(authValidationSchema.assignRole), authController.assignRole);
router.delete('/users/:id/roles/:roleId', authenticateToken, requirePermission('role.manage'), authController.removeRole);

// 角色权限管理接口（需要权限）
router.get('/roles/:id/permissions', authenticateToken, requirePermission('role.manage'), authController.getRolePermissions);
router.post('/roles/:id/permissions', authenticateToken, requirePermission('role.manage'), validate(authValidationSchema.assignPermission), authController.assignPermission);
router.delete('/roles/:id/permissions/:permissionId', authenticateToken, requirePermission('role.manage'), authController.removePermission);
router.get('/roles/:id/permission-ids', authenticateToken, requirePermission('role.manage'), accessController.getRolePermissionIds);
router.put('/roles/:id/permission-ids', authenticateToken, requirePermission('role.manage'), validate(authValidationSchema.setRolePermissions), accessController.setRolePermissionIds);

// 角色菜单管理（需要权限）
router.get('/roles/:id/menus', authenticateToken, requirePermission('menu.manage'), accessController.getRoleMenus);
router.put('/roles/:id/menus', authenticateToken, requirePermission('menu.manage'), validate(authValidationSchema.setRoleMenus), accessController.setRoleMenus);

// 角色数据规则管理（需要权限）
router.get('/roles/:id/data-rule', authenticateToken, requirePermission('data.rule.manage'), accessController.getRoleDataRule);
router.put('/roles/:id/data-rule', authenticateToken, requirePermission('data.rule.manage'), validate(authValidationSchema.setRoleDataRule), accessController.setRoleDataRule);

// 部门管理（需要权限）
router.get('/departments', authenticateToken, requirePermission('department.manage'), accessController.listDepartments);
router.post('/departments', authenticateToken, requirePermission('department.manage'), validate(authValidationSchema.departmentUpsert), accessController.createDepartment);
router.put('/departments/:id', authenticateToken, requirePermission('department.manage'), validate(authValidationSchema.departmentUpsert), accessController.updateDepartment);
router.delete('/departments/:id', authenticateToken, requirePermission('department.manage'), accessController.deleteDepartment);

// 菜单管理（需要权限）
router.get('/menus', authenticateToken, requirePermission('menu.manage'), accessController.listMenus);
router.post('/menus', authenticateToken, requirePermission('menu.manage'), validate(authValidationSchema.menuUpsert), accessController.createMenu);
router.put('/menus/:id', authenticateToken, requirePermission('menu.manage'), validate(authValidationSchema.menuUpsert), accessController.updateMenu);
router.delete('/menus/:id', authenticateToken, requirePermission('menu.manage'), accessController.deleteMenu);

// 审计日志接口（需要权限）
router.get('/audit', authenticateToken, requirePermission('system.config'), validate(authValidationSchema.auditLogQuery), authController.getAuditLogs);

module.exports = router;
