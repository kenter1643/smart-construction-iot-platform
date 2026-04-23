const { getMySQLPool } = require('./db');

function buildInClause(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { clause: '(NULL)', params: [] };
  }
  const placeholders = values.map(() => '?').join(', ');
  return { clause: `(${placeholders})`, params: values };
}

function toUniqueNumberArray(items) {
  return [...new Set((items || []).map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
}

async function getUserRoles(pool, userId) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows;
}

async function getUserRoleIds(pool, userId) {
  const roles = await getUserRoles(pool, userId);
  return roles.map((role) => role.id);
}

async function isAdminUser(pool, userId) {
  const roles = await getUserRoles(pool, userId);
  return roles.some((role) => role.name === 'admin');
}

async function getUserPermissions(pool, userId) {
  const roleIds = await getUserRoleIds(pool, userId);
  if (roleIds.length === 0) return [];

  const inRole = buildInClause(roleIds);
  const [permissions] = await pool.execute(
    `SELECT DISTINCT p.name
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id IN ${inRole.clause}
     ORDER BY p.name`,
    inRole.params
  );

  return permissions.map((item) => item.name);
}

async function getUserDepartments(pool, userId) {
  const [rows] = await pool.execute(
    `SELECT d.id, d.name, d.parent_id, ud.is_primary
     FROM user_departments ud
     JOIN departments d ON ud.department_id = d.id
     WHERE ud.user_id = ?
     ORDER BY ud.is_primary DESC, d.id ASC`,
    [userId]
  );
  return rows;
}

async function getDepartmentDescendants(pool, departmentIds) {
  const normalized = toUniqueNumberArray(departmentIds);
  if (normalized.length === 0) return [];

  const inDept = buildInClause(normalized);
  const [rows] = await pool.execute(
    `WITH RECURSIVE dept_tree AS (
       SELECT id, parent_id
       FROM departments
       WHERE id IN ${inDept.clause}
       UNION ALL
       SELECT d.id, d.parent_id
       FROM departments d
       INNER JOIN dept_tree dt ON dt.id = d.parent_id
     )
     SELECT DISTINCT id FROM dept_tree`,
    inDept.params
  );

  return rows.map((row) => row.id);
}

async function getAllDepartmentIds(pool) {
  const [rows] = await pool.execute(`SELECT id FROM departments`);
  return rows.map((row) => row.id);
}

async function getUserDataScope(pool, userId) {
  if (await isAdminUser(pool, userId)) {
    return {
      scopeTypes: ['ALL'],
      departmentIds: await getAllDepartmentIds(pool),
      selfOnly: false
    };
  }

  const roleIds = await getUserRoleIds(pool, userId);
  if (roleIds.length === 0) {
    return {
      scopeTypes: ['SELF'],
      departmentIds: [],
      selfOnly: true
    };
  }

  const inRole = buildInClause(roleIds);
  const [rules] = await pool.execute(
    `SELECT id, role_id, scope_type
     FROM role_data_rules
     WHERE role_id IN ${inRole.clause}`,
    inRole.params
  );

  if (rules.length === 0) {
    return {
      scopeTypes: ['SELF'],
      departmentIds: [],
      selfOnly: true
    };
  }

  const scopeTypes = [...new Set(rules.map((rule) => rule.scope_type))];
  if (scopeTypes.includes('ALL')) {
    return {
      scopeTypes,
      departmentIds: await getAllDepartmentIds(pool),
      selfOnly: false
    };
  }

  const userDepartmentRows = await getUserDepartments(pool, userId);
  const userDepartmentIds = userDepartmentRows.map((row) => row.id);
  const scopeDepartmentIds = new Set();

  if (scopeTypes.includes('DEPT')) {
    userDepartmentIds.forEach((id) => scopeDepartmentIds.add(id));
  }

  if (scopeTypes.includes('DEPT_AND_CHILD')) {
    const descendants = await getDepartmentDescendants(pool, userDepartmentIds);
    descendants.forEach((id) => scopeDepartmentIds.add(id));
  }

  if (scopeTypes.includes('CUSTOM')) {
    const ruleIds = rules.filter((rule) => rule.scope_type === 'CUSTOM').map((rule) => rule.id);
    const inRule = buildInClause(ruleIds);
    if (ruleIds.length > 0) {
      const [customRows] = await pool.execute(
        `SELECT DISTINCT department_id
         FROM role_data_rule_departments
         WHERE role_data_rule_id IN ${inRule.clause}`,
        inRule.params
      );
      customRows.forEach((row) => scopeDepartmentIds.add(row.department_id));
    }
  }

  return {
    scopeTypes,
    departmentIds: [...scopeDepartmentIds],
    selfOnly: scopeTypes.length === 1 && scopeTypes[0] === 'SELF'
  };
}

function buildTree(rows) {
  const map = new Map();
  const roots = [];

  rows.forEach((row) => {
    map.set(row.id, { ...row, children: [] });
  });

  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if ((a.sort_order || 0) !== (b.sort_order || 0)) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return a.id - b.id;
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

async function getUserMenus(pool, userId) {
  const admin = await isAdminUser(pool, userId);

  if (admin) {
    const [rows] = await pool.execute(
      `SELECT id, parent_id, name, menu_key, path, component, type, permission_code, sort_order, visible, status
       FROM menus
       WHERE status = 1
       ORDER BY sort_order ASC, id ASC`
    );
    return buildTree(rows);
  }

  const roleIds = await getUserRoleIds(pool, userId);
  if (roleIds.length === 0) return [];

  const inRole = buildInClause(roleIds);
  const [rows] = await pool.execute(
    `SELECT DISTINCT m.id, m.parent_id, m.name, m.menu_key, m.path, m.component, m.type, m.permission_code, m.sort_order, m.visible, m.status
     FROM role_menus rm
     JOIN menus m ON rm.menu_id = m.id
     WHERE rm.role_id IN ${inRole.clause} AND m.status = 1
     ORDER BY m.sort_order ASC, m.id ASC`,
    inRole.params
  );

  return buildTree(rows);
}

async function getAccessProfile(userId) {
  const pool = getMySQLPool();
  const permissions = await getUserPermissions(pool, userId);
  const menuTree = await getUserMenus(pool, userId);
  const dataScope = await getUserDataScope(pool, userId);
  const departments = await getUserDepartments(pool, userId);

  return {
    permissions,
    menus: menuTree,
    dataScope,
    departments
  };
}

module.exports = {
  buildInClause,
  toUniqueNumberArray,
  getUserRoleIds,
  getUserRoles,
  getUserPermissions,
  getUserDepartments,
  getDepartmentDescendants,
  getUserDataScope,
  getUserMenus,
  getAccessProfile,
  isAdminUser,
  buildTree
};
