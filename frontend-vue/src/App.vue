<template>
  <el-container class="shell">
    <el-aside width="240px" class="sidebar">
      <div class="brand">智慧工地后台</div>
      <el-menu default-active="device" class="menu" background-color="#172033" text-color="#cbd5e1" active-text-color="#ffffff">
        <el-menu-item index="overview">总览</el-menu-item>
        <el-menu-item index="device">设备管理</el-menu-item>
        <el-menu-item index="video">视频监控</el-menu-item>
        <el-menu-item index="alert">告警中心</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="workspace">
      <el-row :gutter="16" class="stats">
        <el-col :span="8">
          <el-card><div class="stat-title">设备总数</div><div class="stat-value">{{ store.stats.total }}</div></el-card>
        </el-col>
        <el-col :span="8">
          <el-card><div class="stat-title">在线设备</div><div class="stat-value">{{ store.stats.online }}</div></el-card>
        </el-col>
        <el-col :span="8">
          <el-card><div class="stat-title">离线设备</div><div class="stat-value">{{ store.stats.offline }}</div></el-card>
        </el-col>
      </el-row>

      <el-card class="panel">
        <template #header>
          <div class="panel-head">
            <span>设备管理</span>
            <div class="actions">
              <el-button @click="store.reload">刷新</el-button>
              <el-button type="primary" @click="openCreate">新增设备</el-button>
            </div>
          </div>
        </template>

        <el-row :gutter="12" class="filters">
          <el-col :span="10">
            <el-input v-model="store.keyword" placeholder="搜索设备名/ID" clearable />
          </el-col>
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
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="onDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card class="panel">
        <template #header>
          <div class="panel-head"><span>视频查看播放器组件</span></div>
        </template>
        <div class="video-grid">
          <div>
            <video class="video" controls :src="videoSource" />
            <div class="video-actions">
              <el-button type="primary" @click="setLive">实时流</el-button>
              <el-button @click="setPlayback">录制回放</el-button>
              <el-select v-model="videoQuality" style="width: 130px">
                <el-option label="自适应" value="auto" />
                <el-option label="高清" value="hd" />
                <el-option label="标清" value="sd" />
              </el-select>
            </div>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="模式">{{ videoMode === 'live' ? '实时流' : '录制回放' }}</el-descriptions-item>
            <el-descriptions-item label="清晰度">{{ videoQuality }}</el-descriptions-item>
            <el-descriptions-item label="来源">{{ videoSource }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>
    </el-main>
  </el-container>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑设备' : '新增设备'" width="520px">
    <el-form :model="form" label-width="90px">
      <el-form-item label="设备ID"><el-input v-model="form.deviceId" /></el-form-item>
      <el-form-item label="设备名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="类型">
        <el-select v-model="form.type" style="width: 100%">
          <el-option label="传感器" value="sensor" />
          <el-option label="摄像头" value="camera" />
          <el-option label="控制器" value="controller" />
          <el-option label="执行器" value="actuator" />
        </el-select>
      </el-form-item>
      <el-form-item label="协议">
        <el-select v-model="form.protocol" style="width: 100%">
          <el-option label="MQTT" value="mqtt" />
          <el-option label="HTTP" value="http" />
          <el-option label="Modbus TCP" value="modbus-tcp" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="断连" value="disconnected" />
          <el-option label="错误" value="error" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useDeviceStore } from "./stores/deviceStore";

const store = useDeviceStore();
const dialogVisible = ref(false);
const editingId = ref(null);
const form = reactive({
  deviceId: "",
  name: "",
  type: "sensor",
  protocol: "mqtt",
  status: "online"
});

const videoMode = ref("live");
const videoQuality = ref("auto");
const videoSource = computed(() => {
  if (videoMode.value === "live") {
    const suffix = videoQuality.value === "auto" ? "" : `?quality=${videoQuality.value}`;
    return `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8${suffix}`;
  }
  return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
});

function resetForm() {
  form.deviceId = "";
  form.name = "";
  form.type = "sensor";
  form.protocol = "mqtt";
  form.status = "online";
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
      ElMessage.success("设备更新成功");
    } else {
      await store.add({ ...form });
      ElMessage.success("设备创建成功");
    }
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error?.message || "操作失败");
  }
}

async function onDelete(id) {
  await ElMessageBox.confirm("确认删除该设备？", "提示", { type: "warning" });
  await store.remove(id);
  ElMessage.success("设备删除成功");
}

function setLive() {
  videoMode.value = "live";
}

function setPlayback() {
  videoMode.value = "playback";
}

onMounted(() => {
  store.reload().catch(() => {
    ElMessage.error("设备加载失败，请检查后端服务");
  });
});
</script>
