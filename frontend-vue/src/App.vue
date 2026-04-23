<template>
  <el-container class="shell">
    <el-aside width="240px" class="sidebar">
      <div class="brand">智慧工地后台</div>
      <el-menu
        :default-active="currentView"
        class="menu"
        background-color="#172033"
        text-color="#cbd5e1"
        active-text-color="#ffffff"
        @select="handleViewChange"
      >
        <el-menu-item v-for="item in visibleSideMenus" :key="item.key" :index="item.key">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-main class="workspace">
      <el-alert
        v-if="accessFallback"
        title="当前未检测到登录态，已启用本地管理员预览权限（仅用于前端调试）"
        type="warning"
        :closable="false"
        class="mb-12"
      />

      <div v-if="currentView === 'overview'" class="overview-view">
        <el-row :gutter="16" class="stats">
          <el-col :span="6"><el-card class="stat-card"><div class="stat-title">设备总数</div><div class="stat-value">{{ overviewStats.total }}</div></el-card></el-col>
          <el-col :span="6"><el-card class="stat-card online"><div class="stat-title">在线设备</div><div class="stat-value">{{ overviewStats.online }}</div></el-card></el-col>
          <el-col :span="6"><el-card class="stat-card offline"><div class="stat-title">离线设备</div><div class="stat-value">{{ overviewStats.offline }}</div></el-card></el-col>
          <el-col :span="6"><el-card class="stat-card alerts"><div class="stat-title">告警数</div><div class="stat-value">{{ overviewStats.alerts }}</div></el-card></el-col>
        </el-row>

        <el-row :gutter="16" class="charts-section">
          <el-col :span="12">
            <el-card>
              <template #header><span>温度趋势</span></template>
              <RealTimeChart title="温度传感器" :data="temperatureData" chart-type="line" style="height: 300px;" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><span>设备状态分布</span></template>
              <RealTimeChart title="设备状态" :data="deviceStatusData" x-axis-field="name" y-axis-field="count" chart-type="bar" style="height: 300px;" />
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div v-if="currentView === 'device'" class="device-view">
        <el-card class="panel">
          <template #header>
            <div class="panel-head">
              <span>设备管理</span>
              <div class="actions">
                <el-button @click="store.reload">刷新</el-button>
                <el-button v-if="hasPerm('device.create')" type="primary" @click="openCreate">新增设备</el-button>
              </div>
            </div>
          </template>

          <el-row :gutter="12" class="filters">
            <el-col :span="10"><el-input v-model="store.keyword" placeholder="搜索设备名/ID" clearable /></el-col>
            <el-col :span="6">
              <el-select v-model="store.status" placeholder="状态筛选" clearable style="width: 100%">
                <el-option label="在线" value="online" />
                <el-option label="离线" value="offline" />
                <el-option label="断连" value="disconnected" />
                <el-option label="错误" value="error" />
              </el-select>
            </el-col>
          </el-row>

          <el-table :data="store.filteredDevices" v-loading="store.loading" stripe>
            <el-table-column prop="deviceId" label="设备ID" min-width="160" />
            <el-table-column prop="name" label="设备名称" min-width="180" />
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="protocol" label="协议" width="140" />
            <el-table-column prop="status" label="状态" width="120" />
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button v-if="hasPerm('device.update')" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="hasPerm('device.delete')" size="small" type="danger" @click="onDelete(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <div v-if="currentView === 'video'" class="video-view">
        <el-card class="panel">
          <template #header><div class="panel-head"><span>视频查看播放器组件</span></div></template>
          <div class="video-grid">
            <div>
              <video ref="videoElement" class="video" controls :src="videoSource" />
              <div class="video-actions">
                <el-button type="primary" @click="setLive">实时流</el-button>
                <el-button @click="setPlayback">录制回放</el-button>
                <el-select v-model="videoQuality" style="width: 130px">
                  <el-option label="自适应" value="auto" />
                  <el-option label="高清" value="hd" />
                  <el-option label="标清" value="sd" />
                </el-select>
                <el-button @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</el-button>
                <el-button @click="stopVideo">停止</el-button>
                <el-button @click="fastForward">快进</el-button>
              </div>
            </div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="模式">{{ videoMode === 'live' ? '实时流' : '录制回放' }}</el-descriptions-item>
              <el-descriptions-item label="清晰度">{{ videoQuality }}</el-descriptions-item>
              <el-descriptions-item label="来源">{{ videoSource }}</el-descriptions-item>
              <el-descriptions-item label="播放状态">{{ isPlaying ? '正在播放' : '已暂停' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </div>

      <div v-if="currentView === 'alert'" class="alert-view">
        <AlertManager />
      </div>

      <div v-if="currentView === 'users'" class="user-view">
        <el-card class="panel">
          <template #header>
            <div class="panel-head">
              <span>用户管理</span>
              <div class="actions">
                <el-button @click="loadUsers">刷新</el-button>
                <el-button v-if="hasPerm('user.create')" type="primary" @click="openUserCreate">新增用户</el-button>
              </div>
            </div>
          </template>
          <el-table :data="users" v-loading="usersLoading" stripe>
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="email" label="邮箱" min-width="180" />
            <el-table-column prop="fullName" label="姓名" min-width="120" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="roles" label="角色" min-width="200">
              <template #default="{ row }">{{ (row.roles || []).join(', ') }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button v-if="hasPerm('user.update')" size="small" @click="openUserEdit(row)">编辑</el-button>
                <el-button v-if="hasPerm('user.delete')" size="small" type="danger" @click="onDeleteUser(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <div v-if="currentView === 'permissions'" class="permission-view">
        <el-card class="panel">
          <template #header><div class="panel-head"><span>权限设置（角色、菜单、按钮、数据规则）</span></div></template>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-table :data="roles" highlight-current-row @current-change="onRoleSelect" row-key="id">
                <el-table-column prop="name" label="角色" />
                <el-table-column prop="description" label="说明" />
              </el-table>
            </el-col>
            <el-col :span="16">
              <el-empty v-if="!selectedRoleId" description="请选择左侧角色" />
              <div v-else>
                <el-tabs>
                  <el-tab-pane label="按钮权限">
                    <el-checkbox-group v-model="selectedPermissionIds" class="check-grid">
                      <el-checkbox v-for="perm in permissions" :key="perm.id" :label="perm.id">{{ perm.name }}</el-checkbox>
                    </el-checkbox-group>
                    <div class="mt-12"><el-button type="primary" @click="saveRolePermissions">保存按钮权限</el-button></div>
                  </el-tab-pane>
                  <el-tab-pane label="菜单权限">
                    <el-checkbox-group v-model="selectedMenuIds" class="check-grid">
                      <el-checkbox v-for="menu in flatMenus" :key="menu.id" :label="menu.id">{{ menuLabel(menu) }}</el-checkbox>
                    </el-checkbox-group>
                    <div class="mt-12"><el-button type="primary" @click="saveRoleMenus">保存菜单权限</el-button></div>
                  </el-tab-pane>
                  <el-tab-pane label="数据规则">
                    <el-form label-width="120px">
                      <el-form-item label="数据范围">
                        <el-select v-model="roleDataRule.scopeType" style="width: 300px">
                          <el-option label="全部数据" value="ALL" />
                          <el-option label="本部门及子部门" value="DEPT_AND_CHILD" />
                          <el-option label="本部门" value="DEPT" />
                          <el-option label="仅本人" value="SELF" />
                          <el-option label="自定义部门" value="CUSTOM" />
                        </el-select>
                      </el-form-item>
                      <el-form-item v-if="roleDataRule.scopeType === 'CUSTOM'" label="自定义部门">
                        <el-select v-model="roleDataRule.departmentIds" multiple filterable style="width: 100%">
                          <el-option v-for="dept in flatDepartments" :key="dept.id" :label="deptLabel(dept)" :value="dept.id" />
                        </el-select>
                      </el-form-item>
                      <el-button type="primary" @click="saveRoleDataRule">保存数据规则</el-button>
                    </el-form>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </div>

      <div v-if="currentView === 'menus'" class="menu-view">
        <el-card class="panel">
          <template #header>
            <div class="panel-head">
              <span>菜单管理</span>
              <div class="actions">
                <el-button @click="loadMenus">刷新</el-button>
                <el-button type="primary" @click="openMenuCreate">新增菜单</el-button>
              </div>
            </div>
          </template>
          <el-table :data="flatMenus" row-key="id" stripe>
            <el-table-column label="名称" min-width="180"><template #default="{ row }">{{ menuLabel(row) }}</template></el-table-column>
            <el-table-column prop="menu_key" label="Key" min-width="130" />
            <el-table-column prop="type" label="类型" width="110" />
            <el-table-column prop="permission_code" label="权限码" min-width="150" />
            <el-table-column prop="path" label="路径" min-width="140" />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" @click="openMenuEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="onDeleteMenu(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>

      <div v-if="currentView === 'departments'" class="department-view">
        <el-card class="panel">
          <template #header>
            <div class="panel-head">
              <span>部门管理</span>
              <div class="actions">
                <el-button @click="loadDepartments">刷新</el-button>
                <el-button type="primary" @click="openDeptCreate">新增部门</el-button>
              </div>
            </div>
          </template>
          <el-table :data="flatDepartments" row-key="id" stripe>
            <el-table-column label="部门名称" min-width="220"><template #default="{ row }">{{ deptLabel(row) }}</template></el-table-column>
            <el-table-column prop="code" label="编码" min-width="140" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">{{ row.status === 1 ? '启用' : '停用' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" @click="openDeptEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="onDeleteDept(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-main>
  </el-container>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑设备' : '新增设备'" width="520px">
    <el-form :model="form" label-width="90px">
      <el-form-item label="设备ID"><el-input v-model="form.deviceId" /></el-form-item>
      <el-form-item label="设备名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="类型"><el-select v-model="form.type" style="width: 100%"><el-option label="传感器" value="sensor" /><el-option label="摄像头" value="camera" /><el-option label="控制器" value="controller" /><el-option label="执行器" value="actuator" /></el-select></el-form-item>
      <el-form-item label="协议"><el-select v-model="form.protocol" style="width: 100%"><el-option label="MQTT" value="mqtt" /><el-option label="HTTP" value="http" /><el-option label="Modbus TCP" value="modbus-tcp" /></el-select></el-form-item>
      <el-form-item label="状态"><el-select v-model="form.status" style="width: 100%"><el-option label="在线" value="online" /><el-option label="离线" value="offline" /><el-option label="断连" value="disconnected" /><el-option label="错误" value="error" /></el-select></el-form-item>
    </el-form>
    <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="onSubmit">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="userDialogVisible" :title="userEditingId ? '编辑用户' : '新增用户'" width="620px">
    <el-form :model="userForm" label-width="110px">
      <el-form-item label="用户名"><el-input v-model="userForm.username" :disabled="!!userEditingId" /></el-form-item>
      <el-form-item label="邮箱"><el-input v-model="userForm.email" /></el-form-item>
      <el-form-item label="密码" v-if="!userEditingId"><el-input v-model="userForm.password" type="password" /></el-form-item>
      <el-form-item label="姓名"><el-input v-model="userForm.fullName" /></el-form-item>
      <el-form-item label="手机号"><el-input v-model="userForm.phone" /></el-form-item>
      <el-form-item label="状态" v-if="userEditingId"><el-select v-model="userForm.status" style="width: 100%"><el-option label="active" value="active" /><el-option label="inactive" value="inactive" /><el-option label="suspended" value="suspended" /></el-select></el-form-item>
      <el-form-item label="角色"><el-select v-model="userForm.roleIds" multiple style="width: 100%"><el-option v-for="role in roles" :key="role.id" :value="role.id" :label="role.name" /></el-select></el-form-item>
      <el-form-item label="部门（可多选）"><el-select v-model="userForm.departmentIds" multiple style="width: 100%"><el-option v-for="dept in flatDepartments" :key="dept.id" :value="dept.id" :label="deptLabel(dept)" /></el-select></el-form-item>
      <el-form-item label="主部门"><el-select v-model="userForm.primaryDepartmentId" style="width: 100%"><el-option v-for="deptId in userForm.departmentIds" :key="deptId" :value="deptId" :label="deptNameById(deptId)" /></el-select></el-form-item>
    </el-form>
    <template #footer><el-button @click="userDialogVisible = false">取消</el-button><el-button type="primary" @click="submitUser">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="menuDialogVisible" :title="menuEditingId ? '编辑菜单' : '新增菜单'" width="620px">
    <el-form :model="menuForm" label-width="110px">
      <el-form-item label="父级"><el-select v-model="menuForm.parentId" clearable style="width: 100%"><el-option v-for="menu in flatMenus" :key="menu.id" :value="menu.id" :label="menuLabel(menu)" /></el-select></el-form-item>
      <el-form-item label="名称"><el-input v-model="menuForm.name" /></el-form-item>
      <el-form-item label="菜单Key"><el-input v-model="menuForm.menuKey" /></el-form-item>
      <el-form-item label="类型"><el-select v-model="menuForm.type" style="width: 100%"><el-option label="directory" value="directory" /><el-option label="menu" value="menu" /><el-option label="button" value="button" /></el-select></el-form-item>
      <el-form-item label="路径"><el-input v-model="menuForm.path" /></el-form-item>
      <el-form-item label="组件"><el-input v-model="menuForm.component" /></el-form-item>
      <el-form-item label="权限码"><el-input v-model="menuForm.permissionCode" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="menuForm.sortOrder" :min="0" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="menuDialogVisible = false">取消</el-button><el-button type="primary" @click="submitMenu">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="deptDialogVisible" :title="deptEditingId ? '编辑部门' : '新增部门'" width="620px">
    <el-form :model="deptForm" label-width="110px">
      <el-form-item label="父级"><el-select v-model="deptForm.parentId" clearable style="width: 100%"><el-option v-for="dept in flatDepartments" :key="dept.id" :value="dept.id" :label="deptLabel(dept)" /></el-select></el-form-item>
      <el-form-item label="部门名称"><el-input v-model="deptForm.name" /></el-form-item>
      <el-form-item label="编码"><el-input v-model="deptForm.code" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="deptForm.status" style="width: 100%"><el-option label="启用" :value="1" /><el-option label="停用" :value="0" /></el-select></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="deptForm.sortOrder" :min="0" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="deptDialogVisible = false">取消</el-button><el-button type="primary" @click="submitDept">保存</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Monitor, Setting, VideoCamera, Warning, User, Lock, Menu, OfficeBuilding } from '@element-plus/icons-vue';
import { useDeviceStore } from './stores/deviceStore';
import RealTimeChart from './components/RealTimeChart.vue';
import AlertManager from './components/AlertManager.vue';
import {
  getAccessProfile,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getPermissions,
  getRolePermissionIds,
  setRolePermissionIds,
  getRoleMenus,
  setRoleMenus,
  getRoleDataRule,
  setRoleDataRule,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getUserRoles,
  assignUserRole,
  removeUserRole,
  getUserDepartments,
  setUserDepartments
} from './api';

const store = useDeviceStore();
const currentView = ref('overview');
const accessFallback = ref(false);
const permissionsSet = ref(new Set());
const menuKeySet = ref(new Set());

const sideMenus = [
  { key: 'overview', label: '总览', icon: Monitor, perm: null },
  { key: 'device', label: '设备管理', icon: Setting, perm: 'device.read' },
  { key: 'video', label: '视频监控', icon: VideoCamera, perm: 'video.view' },
  { key: 'alert', label: '告警中心', icon: Warning, perm: 'alert.read' },
  { key: 'users', label: '用户管理', icon: User, perm: 'user.read' },
  { key: 'permissions', label: '权限设置', icon: Lock, perm: 'role.manage' },
  { key: 'menus', label: '菜单管理', icon: Menu, perm: 'menu.manage' },
  { key: 'departments', label: '部门管理', icon: OfficeBuilding, perm: 'department.manage' }
];

const visibleSideMenus = computed(() => sideMenus.filter((item) => {
  if (accessFallback.value) return true;
  const allowByPerm = !item.perm || permissionsSet.value.has(item.perm);
  const allowByMenu = menuKeySet.value.size === 0 || menuKeySet.value.has(item.key) || menuKeySet.value.has(`${item.key}-mgmt`);
  return allowByPerm && allowByMenu;
}));

function hasPerm(permissionCode) {
  return accessFallback.value || permissionsSet.value.has(permissionCode);
}

function handleViewChange(index) {
  currentView.value = index;
}

const overviewStats = reactive({ total: 25, online: 20, offline: 3, alerts: 8 });
const temperatureData = ref([
  { time: new Date(Date.now() - 3600000), value: 28 },
  { time: new Date(Date.now() - 3000000), value: 30 },
  { time: new Date(Date.now() - 2400000), value: 32 },
  { time: new Date(Date.now() - 1800000), value: 31 },
  { time: new Date(Date.now() - 1200000), value: 33 },
  { time: new Date(Date.now() - 600000), value: 35 },
  { time: new Date(), value: 34 }
]);
const deviceStatusData = ref([
  { name: '在线', count: 20 },
  { name: '离线', count: 3 },
  { name: '断连', count: 1 },
  { name: '错误', count: 1 }
]);

const videoMode = ref('live');
const videoQuality = ref('auto');
const videoElement = ref(null);
const isPlaying = ref(false);
const videoSource = computed(() => (videoMode.value === 'live'
  ? `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8${videoQuality.value === 'auto' ? '' : `?quality=${videoQuality.value}`}`
  : 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'));

function setLive() { videoMode.value = 'live'; }
function setPlayback() { videoMode.value = 'playback'; }
function togglePlay() {
  if (!videoElement.value) return;
  if (videoElement.value.paused) {
    videoElement.value.play();
    isPlaying.value = true;
  } else {
    videoElement.value.pause();
    isPlaying.value = false;
  }
}
function stopVideo() {
  if (!videoElement.value) return;
  videoElement.value.pause();
  videoElement.value.currentTime = 0;
  isPlaying.value = false;
}
function fastForward() {
  if (videoElement.value) videoElement.value.currentTime += 10;
}

const dialogVisible = ref(false);
const editingId = ref(null);
const form = reactive({ deviceId: '', name: '', type: 'sensor', protocol: 'mqtt', status: 'online' });

function resetForm() {
  form.deviceId = '';
  form.name = '';
  form.type = 'sensor';
  form.protocol = 'mqtt';
  form.status = 'online';
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.deviceId = row.deviceId;
  form.name = row.name;
  form.type = row.type;
  form.protocol = row.protocol;
  form.status = row.status;
  dialogVisible.value = true;
}

async function onSubmit() {
  try {
    if (editingId.value) {
      await store.edit(editingId.value, { ...form });
      ElMessage.success('设备更新成功');
    } else {
      await store.add({ ...form });
      ElMessage.success('设备创建成功');
    }
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error?.message || '操作失败');
  }
}

async function onDelete(id) {
  await ElMessageBox.confirm('确认删除该设备？', '提示', { type: 'warning' });
  await store.remove(id);
  ElMessage.success('设备删除成功');
}

const users = ref([]);
const usersLoading = ref(false);
const roles = ref([]);
const permissions = ref([]);
const menus = ref([]);
const departments = ref([]);
const selectedRoleId = ref(null);
const selectedPermissionIds = ref([]);
const selectedMenuIds = ref([]);
const roleDataRule = reactive({ scopeType: 'DEPT_AND_CHILD', departmentIds: [] });

const userDialogVisible = ref(false);
const userEditingId = ref(null);
const userForm = reactive({
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
  status: 'active',
  roleIds: [],
  departmentIds: [],
  primaryDepartmentId: null
});

function flattenTree(nodes, level = 0, parentId = null, acc = []) {
  (nodes || []).forEach((node) => {
    acc.push({ ...node, level, parentId });
    if (node.children && node.children.length) {
      flattenTree(node.children, level + 1, node.id, acc);
    }
  });
  return acc;
}

const flatMenus = computed(() => flattenTree(menus.value || []));
const flatDepartments = computed(() => flattenTree(departments.value || []));

function menuLabel(menu) {
  return `${' '.repeat(menu.level * 2)}${menu.name}`;
}

function deptLabel(dept) {
  return `${' '.repeat(dept.level * 2)}${dept.name}`;
}

function deptNameById(id) {
  const found = flatDepartments.value.find((item) => item.id === id);
  return found ? found.name : String(id);
}

async function loadUsers() {
  usersLoading.value = true;
  try {
    users.value = await getUsers();
  } finally {
    usersLoading.value = false;
  }
}

async function loadRolesAndPermissions() {
  [roles.value, permissions.value] = await Promise.all([getRoles(), getPermissions()]);
}

async function loadMenus() {
  menus.value = await getMenus();
}

async function loadDepartments() {
  departments.value = await getDepartments();
}

async function bootstrapAccess() {
  try {
    const profile = await getAccessProfile();
    permissionsSet.value = new Set(profile?.permissions || []);
    menuKeySet.value = new Set((flattenTree(profile?.menus || [])).map((m) => m.menu_key));
    accessFallback.value = false;
  } catch {
    accessFallback.value = true;
    const fallbackPerms = [
      'device.read', 'device.create', 'device.update', 'device.delete',
      'video.view', 'alert.read', 'user.read', 'user.create', 'user.update', 'user.delete',
      'role.manage', 'menu.manage', 'department.manage', 'data.rule.manage'
    ];
    permissionsSet.value = new Set(fallbackPerms);
  }
}

function resetUserForm() {
  userForm.username = '';
  userForm.email = '';
  userForm.password = '';
  userForm.fullName = '';
  userForm.phone = '';
  userForm.status = 'active';
  userForm.roleIds = [];
  userForm.departmentIds = [];
  userForm.primaryDepartmentId = null;
}

function openUserCreate() {
  userEditingId.value = null;
  resetUserForm();
  userDialogVisible.value = true;
}

async function openUserEdit(row) {
  userEditingId.value = row.id;
  userForm.username = row.username;
  userForm.email = row.email;
  userForm.password = '';
  userForm.fullName = row.fullName || '';
  userForm.phone = row.phone || '';
  userForm.status = row.status || 'active';

  const [userRoleRows, userDeptRows] = await Promise.all([
    getUserRoles(row.id),
    getUserDepartments(row.id)
  ]);

  userForm.roleIds = userRoleRows.map((item) => item.id);
  userForm.departmentIds = userDeptRows.map((item) => item.department_id);
  const primary = userDeptRows.find((item) => item.is_primary === 1);
  userForm.primaryDepartmentId = primary ? primary.department_id : (userForm.departmentIds[0] || null);

  userDialogVisible.value = true;
}

async function syncUserRoles(userId, targetRoleIds) {
  const current = await getUserRoles(userId);
  const currentRoleIds = current.map((item) => item.id);
  const toAdd = targetRoleIds.filter((id) => !currentRoleIds.includes(id));
  const toRemove = currentRoleIds.filter((id) => !targetRoleIds.includes(id));

  await Promise.all(toAdd.map((roleId) => assignUserRole(userId, roleId)));
  await Promise.all(toRemove.map((roleId) => removeUserRole(userId, roleId)));
}

async function submitUser() {
  try {
    if (userEditingId.value) {
      await updateUser(userEditingId.value, {
        email: userForm.email,
        fullName: userForm.fullName,
        phone: userForm.phone,
        status: userForm.status
      });
      await syncUserRoles(userEditingId.value, userForm.roleIds);
      await setUserDepartments(
        userEditingId.value,
        userForm.departmentIds,
        userForm.primaryDepartmentId || userForm.departmentIds[0]
      );
      ElMessage.success('用户更新成功');
    } else {
      await createUser({
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        fullName: userForm.fullName,
        phone: userForm.phone
      });
      ElMessage.success('用户创建成功，请在列表中继续分配角色和部门');
    }

    userDialogVisible.value = false;
    await loadUsers();
  } catch (error) {
    ElMessage.error(error?.response?.data?.details || error?.message || '用户保存失败');
  }
}

async function onDeleteUser(userId) {
  await ElMessageBox.confirm('确认删除该用户？', '提示', { type: 'warning' });
  await deleteUser(userId);
  ElMessage.success('用户删除成功');
  await loadUsers();
}

async function onRoleSelect(role) {
  if (!role) return;
  selectedRoleId.value = role.id;
  const [permIds, menuIds, dataRule] = await Promise.all([
    getRolePermissionIds(role.id),
    getRoleMenus(role.id),
    getRoleDataRule(role.id)
  ]);
  selectedPermissionIds.value = permIds;
  selectedMenuIds.value = menuIds;
  roleDataRule.scopeType = dataRule.scopeType || 'DEPT_AND_CHILD';
  roleDataRule.departmentIds = dataRule.departmentIds || [];
}

async function saveRolePermissions() {
  if (!selectedRoleId.value) return;
  await setRolePermissionIds(selectedRoleId.value, selectedPermissionIds.value);
  ElMessage.success('按钮权限已保存');
}

async function saveRoleMenus() {
  if (!selectedRoleId.value) return;
  await setRoleMenus(selectedRoleId.value, selectedMenuIds.value);
  ElMessage.success('菜单权限已保存');
}

async function saveRoleDataRule() {
  if (!selectedRoleId.value) return;
  await setRoleDataRule(selectedRoleId.value, {
    scopeType: roleDataRule.scopeType,
    departmentIds: roleDataRule.scopeType === 'CUSTOM' ? roleDataRule.departmentIds : []
  });
  ElMessage.success('数据规则已保存');
}

const menuDialogVisible = ref(false);
const menuEditingId = ref(null);
const menuForm = reactive({
  parentId: null,
  name: '',
  menuKey: '',
  path: '',
  component: '',
  type: 'menu',
  permissionCode: '',
  sortOrder: 0,
  visible: 1,
  status: 1
});

function resetMenuForm() {
  menuForm.parentId = null;
  menuForm.name = '';
  menuForm.menuKey = '';
  menuForm.path = '';
  menuForm.component = '';
  menuForm.type = 'menu';
  menuForm.permissionCode = '';
  menuForm.sortOrder = 0;
  menuForm.visible = 1;
  menuForm.status = 1;
}

function openMenuCreate() {
  menuEditingId.value = null;
  resetMenuForm();
  menuDialogVisible.value = true;
}

function openMenuEdit(row) {
  menuEditingId.value = row.id;
  menuForm.parentId = row.parent_id || null;
  menuForm.name = row.name;
  menuForm.menuKey = row.menu_key;
  menuForm.path = row.path || '';
  menuForm.component = row.component || '';
  menuForm.type = row.type;
  menuForm.permissionCode = row.permission_code || '';
  menuForm.sortOrder = row.sort_order || 0;
  menuForm.visible = row.visible;
  menuForm.status = row.status;
  menuDialogVisible.value = true;
}

async function submitMenu() {
  const payload = { ...menuForm };
  if (menuEditingId.value) {
    await updateMenu(menuEditingId.value, payload);
    ElMessage.success('菜单更新成功');
  } else {
    await createMenu(payload);
    ElMessage.success('菜单创建成功');
  }
  menuDialogVisible.value = false;
  await loadMenus();
}

async function onDeleteMenu(id) {
  await ElMessageBox.confirm('确认删除该菜单？', '提示', { type: 'warning' });
  await deleteMenu(id);
  ElMessage.success('菜单删除成功');
  await loadMenus();
}

const deptDialogVisible = ref(false);
const deptEditingId = ref(null);
const deptForm = reactive({
  parentId: null,
  name: '',
  code: '',
  status: 1,
  sortOrder: 0
});

function resetDeptForm() {
  deptForm.parentId = null;
  deptForm.name = '';
  deptForm.code = '';
  deptForm.status = 1;
  deptForm.sortOrder = 0;
}

function openDeptCreate() {
  deptEditingId.value = null;
  resetDeptForm();
  deptDialogVisible.value = true;
}

function openDeptEdit(row) {
  deptEditingId.value = row.id;
  deptForm.parentId = row.parent_id || null;
  deptForm.name = row.name;
  deptForm.code = row.code;
  deptForm.status = row.status;
  deptForm.sortOrder = row.sort_order || 0;
  deptDialogVisible.value = true;
}

async function submitDept() {
  const payload = { ...deptForm };
  if (deptEditingId.value) {
    await updateDepartment(deptEditingId.value, payload);
    ElMessage.success('部门更新成功');
  } else {
    await createDepartment(payload);
    ElMessage.success('部门创建成功');
  }
  deptDialogVisible.value = false;
  await loadDepartments();
}

async function onDeleteDept(id) {
  await ElMessageBox.confirm('确认删除该部门？', '提示', { type: 'warning' });
  await deleteDepartment(id);
  ElMessage.success('部门删除成功');
  await loadDepartments();
}

onMounted(async () => {
  try {
    await Promise.all([
      bootstrapAccess(),
      store.reload(),
      loadUsers(),
      loadRolesAndPermissions(),
      loadMenus(),
      loadDepartments()
    ]);
  } catch {
    ElMessage.warning('部分数据加载失败，请检查服务状态与登录态');
  }

  setInterval(() => {
    temperatureData.value.push({ time: new Date(), value: 30 + Math.random() * 10 });
    if (temperatureData.value.length > 10) temperatureData.value.shift();
  }, 5000);
});
</script>
