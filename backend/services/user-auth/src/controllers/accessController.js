const { getMySQLPool } = require('../utils/db');
const {
  buildTree,
  toUniqueNumberArray,
  buildInClause,
  getAccessProfile,
  getUserDataScope
} = require('../utils/accessControl');

async function getAccessProfileForCurrentUser(req, res, next) {
  try {
    const data = await getAccessProfile(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function getDataScopeForCurrentUser(req, res, next) {
  try {
    const pool = getMySQLPool();
    const data = await getUserDataScope(pool, req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function listDepartments(req, res, next) {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `SELECT id, parent_id, name, code, manager_user_id, status, sort_order, created_at, updated_at
       FROM departments
       ORDER BY sort_order ASC, id ASC`
    );

    res.status(200).json({
      success: true,
      data: buildTree(rows)
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function createDepartment(req, res, next) {
  try {
    const pool = getMySQLPool();
    const { parentId = null, name, code, managerUserId = null, status = 1, sortOrder = 0 } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO departments (parent_id, name, code, manager_user_id, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [parentId, name, code, managerUserId, status, sortOrder]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const pool = getMySQLPool();
    const departmentId = Number(req.params.id);
    const { parentId = null, name, code, managerUserId = null, status = 1, sortOrder = 0 } = req.body;

    await pool.execute(
      `UPDATE departments
       SET parent_id = ?, name = ?, code = ?, manager_user_id = ?, status = ?, sort_order = ?
       WHERE id = ?`,
      [parentId, name, code, managerUserId, status, sortOrder, departmentId]
    );

    res.status(200).json({
      success: true,
      message: 'Department updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const pool = getMySQLPool();
    const departmentId = Number(req.params.id);

    const [children] = await pool.execute(`SELECT id FROM departments WHERE parent_id = ? LIMIT 1`, [departmentId]);
    if (children.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Cannot delete department with children'
      });
    }

    await pool.execute(`DELETE FROM departments WHERE id = ?`, [departmentId]);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function getUserDepartments(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = Number(req.params.id);

    const [rows] = await pool.execute(
      `SELECT ud.department_id, ud.is_primary, d.name, d.code
       FROM user_departments ud
       JOIN departments d ON d.id = ud.department_id
       WHERE ud.user_id = ?
       ORDER BY ud.is_primary DESC, ud.department_id ASC`,
      [userId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function setUserDepartments(req, res, next) {
  try {
    const pool = getMySQLPool();
    const userId = Number(req.params.id);
    const departmentIds = toUniqueNumberArray(req.body.departmentIds || []);
    const primaryDepartmentId = Number(req.body.primaryDepartmentId || departmentIds[0] || 0);

    await pool.execute(`DELETE FROM user_departments WHERE user_id = ?`, [userId]);

    for (const departmentId of departmentIds) {
      const isPrimary = departmentId === primaryDepartmentId ? 1 : 0;
      await pool.execute(
        `INSERT INTO user_departments (user_id, department_id, is_primary)
         VALUES (?, ?, ?)`,
        [userId, departmentId, isPrimary]
      );
    }

    res.status(200).json({
      success: true,
      message: 'User departments updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function listMenus(req, res, next) {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `SELECT id, parent_id, name, menu_key, path, component, type, permission_code, sort_order, visible, status
       FROM menus
       ORDER BY sort_order ASC, id ASC`
    );

    res.status(200).json({
      success: true,
      data: buildTree(rows)
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function createMenu(req, res, next) {
  try {
    const pool = getMySQLPool();
    const {
      parentId = null,
      name,
      menuKey,
      path = null,
      component = null,
      type,
      permissionCode = null,
      sortOrder = 0,
      visible = 1,
      status = 1
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO menus
       (parent_id, name, menu_key, path, component, type, permission_code, sort_order, visible, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parentId, name, menuKey, path, component, type, permissionCode, sortOrder, visible, status]
    );

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function updateMenu(req, res, next) {
  try {
    const pool = getMySQLPool();
    const menuId = Number(req.params.id);
    const {
      parentId = null,
      name,
      menuKey,
      path = null,
      component = null,
      type,
      permissionCode = null,
      sortOrder = 0,
      visible = 1,
      status = 1
    } = req.body;

    await pool.execute(
      `UPDATE menus
       SET parent_id = ?, name = ?, menu_key = ?, path = ?, component = ?, type = ?,
           permission_code = ?, sort_order = ?, visible = ?, status = ?
       WHERE id = ?`,
      [parentId, name, menuKey, path, component, type, permissionCode, sortOrder, visible, status, menuId]
    );

    res.status(200).json({ success: true, message: 'Menu updated successfully' });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function deleteMenu(req, res, next) {
  try {
    const pool = getMySQLPool();
    const menuId = Number(req.params.id);

    const [children] = await pool.execute(`SELECT id FROM menus WHERE parent_id = ? LIMIT 1`, [menuId]);
    if (children.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Cannot delete menu with children'
      });
    }

    await pool.execute(`DELETE FROM menus WHERE id = ?`, [menuId]);
    res.status(200).json({ success: true, message: 'Menu deleted successfully' });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function getRoleMenus(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);

    const [rows] = await pool.execute(
      `SELECT menu_id FROM role_menus WHERE role_id = ? ORDER BY menu_id ASC`,
      [roleId]
    );

    res.status(200).json({
      success: true,
      data: rows.map((item) => item.menu_id)
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function setRoleMenus(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);
    const menuIds = toUniqueNumberArray(req.body.menuIds || []);

    await pool.execute(`DELETE FROM role_menus WHERE role_id = ?`, [roleId]);

    for (const menuId of menuIds) {
      await pool.execute(
        `INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)`,
        [roleId, menuId]
      );
    }

    res.status(200).json({ success: true, message: 'Role menus updated successfully' });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function getRoleDataRule(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);

    const [rules] = await pool.execute(
      `SELECT id, role_id, scope_type, custom_rule_json
       FROM role_data_rules
       WHERE role_id = ?
       LIMIT 1`,
      [roleId]
    );

    if (rules.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          roleId,
          scopeType: 'SELF',
          departmentIds: [],
          customRule: null
        }
      });
    }

    const rule = rules[0];
    const [departments] = await pool.execute(
      `SELECT department_id FROM role_data_rule_departments WHERE role_data_rule_id = ? ORDER BY department_id ASC`,
      [rule.id]
    );

    res.status(200).json({
      success: true,
      data: {
        roleId: rule.role_id,
        scopeType: rule.scope_type,
        departmentIds: departments.map((item) => item.department_id),
        customRule: rule.custom_rule_json ? JSON.parse(rule.custom_rule_json) : null
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function setRoleDataRule(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);
    const scopeType = req.body.scopeType;
    const customRule = req.body.customRule || null;
    const departmentIds = toUniqueNumberArray(req.body.departmentIds || []);

    const [existingRules] = await pool.execute(
      `SELECT id FROM role_data_rules WHERE role_id = ? LIMIT 1`,
      [roleId]
    );

    let ruleId = 0;
    if (existingRules.length === 0) {
      const [result] = await pool.execute(
        `INSERT INTO role_data_rules (role_id, scope_type, custom_rule_json)
         VALUES (?, ?, ?)`,
        [roleId, scopeType, customRule ? JSON.stringify(customRule) : null]
      );
      ruleId = result.insertId;
    } else {
      ruleId = existingRules[0].id;
      await pool.execute(
        `UPDATE role_data_rules
         SET scope_type = ?, custom_rule_json = ?
         WHERE id = ?`,
        [scopeType, customRule ? JSON.stringify(customRule) : null, ruleId]
      );
    }

    await pool.execute(`DELETE FROM role_data_rule_departments WHERE role_data_rule_id = ?`, [ruleId]);
    for (const departmentId of departmentIds) {
      await pool.execute(
        `INSERT INTO role_data_rule_departments (role_data_rule_id, department_id)
         VALUES (?, ?)`,
        [ruleId, departmentId]
      );
    }

    res.status(200).json({ success: true, message: 'Role data rule updated successfully' });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function getRolePermissionIds(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);

    const [rows] = await pool.execute(
      `SELECT permission_id FROM role_permissions WHERE role_id = ? ORDER BY permission_id ASC`,
      [roleId]
    );

    res.status(200).json({
      success: true,
      data: rows.map((item) => item.permission_id)
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

async function setRolePermissionIds(req, res, next) {
  try {
    const pool = getMySQLPool();
    const roleId = Number(req.params.id);
    const permissionIds = toUniqueNumberArray(req.body.permissionIds || []);

    await pool.execute(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);

    for (const permissionId of permissionIds) {
      await pool.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [roleId, permissionId]
      );
    }

    res.status(200).json({ success: true, message: 'Role permissions updated successfully' });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

module.exports = {
  getAccessProfileForCurrentUser,
  getDataScopeForCurrentUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getUserDepartments,
  setUserDepartments,
  listMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getRoleMenus,
  setRoleMenus,
  getRoleDataRule,
  setRoleDataRule,
  getRolePermissionIds,
  setRolePermissionIds
};
