import axios from "axios";

const deviceClient = axios.create({
  baseURL: import.meta.env.VITE_DEVICE_API_BASE || "http://localhost:3001/api/v1",
  timeout: 10000
});

const authClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_BASE || "http://localhost:3005/api/v1/auth",
  timeout: 10000
});

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

authClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

deviceClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchDevices() {
  const { data } = await deviceClient.get("/devices");
  return data?.data?.devices || [];
}

export async function createDevice(payload) {
  const { data } = await deviceClient.post("/devices", payload);
  return data?.data;
}

export async function updateDevice(id, payload) {
  const { data } = await deviceClient.put(`/devices/${id}`, payload);
  return data?.data;
}

export async function removeDevice(id) {
  await deviceClient.delete(`/devices/${id}`);
}

export async function getAccessProfile() {
  const { data } = await authClient.get("/access/profile");
  return data?.data;
}

export async function getUsers() {
  const { data } = await authClient.get("/users");
  return data?.data || [];
}

export async function createUser(payload) {
  const { data } = await authClient.post("/users", payload);
  return data?.data;
}

export async function updateUser(id, payload) {
  const { data } = await authClient.put(`/users/${id}`, payload);
  return data?.data;
}

export async function deleteUser(id) {
  await authClient.delete(`/users/${id}`);
}

export async function getRoles() {
  const { data } = await authClient.get("/roles");
  return data?.data || [];
}

export async function createRole(payload) {
  const { data } = await authClient.post("/roles", payload);
  return data?.data;
}

export async function updateRole(id, payload) {
  const { data } = await authClient.put(`/roles/${id}`, payload);
  return data?.data;
}

export async function getPermissions() {
  const { data } = await authClient.get("/permissions");
  return data?.data || [];
}

export async function getRolePermissionIds(roleId) {
  const { data } = await authClient.get(`/roles/${roleId}/permission-ids`);
  return data?.data || [];
}

export async function setRolePermissionIds(roleId, permissionIds) {
  await authClient.put(`/roles/${roleId}/permission-ids`, { permissionIds });
}

export async function getRoleMenus(roleId) {
  const { data } = await authClient.get(`/roles/${roleId}/menus`);
  return data?.data || [];
}

export async function setRoleMenus(roleId, menuIds) {
  await authClient.put(`/roles/${roleId}/menus`, { menuIds });
}

export async function getRoleDataRule(roleId) {
  const { data } = await authClient.get(`/roles/${roleId}/data-rule`);
  return data?.data || { scopeType: "SELF", departmentIds: [] };
}

export async function setRoleDataRule(roleId, payload) {
  await authClient.put(`/roles/${roleId}/data-rule`, payload);
}

export async function getDepartments() {
  const { data } = await authClient.get("/departments");
  return data?.data || [];
}

export async function createDepartment(payload) {
  const { data } = await authClient.post("/departments", payload);
  return data?.data;
}

export async function updateDepartment(id, payload) {
  const { data } = await authClient.put(`/departments/${id}`, payload);
  return data?.data;
}

export async function deleteDepartment(id) {
  await authClient.delete(`/departments/${id}`);
}

export async function getMenus() {
  const { data } = await authClient.get("/menus");
  return data?.data || [];
}

export async function createMenu(payload) {
  const { data } = await authClient.post("/menus", payload);
  return data?.data;
}

export async function updateMenu(id, payload) {
  const { data } = await authClient.put(`/menus/${id}`, payload);
  return data?.data;
}

export async function deleteMenu(id) {
  await authClient.delete(`/menus/${id}`);
}

export async function getUserRoles(userId) {
  const { data } = await authClient.get(`/users/${userId}/roles`);
  return data?.data || [];
}

export async function assignUserRole(userId, roleId) {
  await authClient.post(`/users/${userId}/roles`, { userId, roleId });
}

export async function removeUserRole(userId, roleId) {
  await authClient.delete(`/users/${userId}/roles/${roleId}`);
}

export async function getUserDepartments(userId) {
  const { data } = await authClient.get(`/users/${userId}/departments`);
  return data?.data || [];
}

export async function setUserDepartments(userId, departmentIds, primaryDepartmentId) {
  await authClient.put(`/users/${userId}/departments`, { departmentIds, primaryDepartmentId });
}
