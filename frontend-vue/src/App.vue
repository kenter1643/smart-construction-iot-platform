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
        <el-menu-item index="overview">
          <el-icon><Monitor /></el-icon>
          <span>总览</span>
        </el-menu-item>
        <el-menu-item index="device">
          <el-icon><Setting /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        <el-menu-item index="video">
          <el-icon><VideoCamera /></el-icon>
          <span>视频监控</span>
        </el-menu-item>
        <el-menu-item index="alert">
          <el-icon><Warning /></el-icon>
          <span>告警中心</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="workspace">
      <!-- 总览视图 -->
      <div v-if="currentView === 'overview'" class="overview-view">
        <el-row :gutter="16" class="stats">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-title">设备总数</div>
              <div class="stat-value">{{ overviewStats.total }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card online">
              <div class="stat-title">在线设备</div>
              <div class="stat-value">{{ overviewStats.online }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card offline">
              <div class="stat-title">离线设备</div>
              <div class="stat-value">{{ overviewStats.offline }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card alerts">
              <div class="stat-title">告警数</div>
              <div class="stat-value">{{ overviewStats.alerts }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="charts-section">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>温度趋势</span>
              </template>
              <RealTimeChart
                title="温度传感器"
                :data="temperatureData"
                chart-type="line"
                style="height: 300px;"
              />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>设备状态分布</span>
              </template>
              <RealTimeChart
                title="设备状态"
                :data="deviceStatusData"
                x-axis-field="name"
                y-axis-field="count"
                chart-type="bar"
                style="height: 300px;"
              />
            </el-card>
          </el-col>
        </el-row>

        <el-row class="device-status-section">
          <el-col :span="24">
            <DeviceStatusMonitor />
          </el-col>
        </el-row>
      </div>

      <!-- 设备管理视图 -->
      <div v-if="currentView === 'device'" class="device-view">
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
      </div>

      <!-- 视频监控视图 -->
      <div v-if="currentView === 'video'" class="video-view">
        <el-card class="panel">
          <template #header>
            <div class="panel-head"><span>视频查看播放器组件</span></div>
          </template>
          <div class="video-grid">
            <div>
              <video ref="videoElement" class="video" controls :src="videoSource" @fullscreenchange="onFullscreenChange" />
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
                <el-button @click="toggleFullscreen">全屏</el-button>
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

      <!-- 告警中心视图 -->
      <div v-if="currentView === 'alert'" class="alert-view">
        <AlertManager />
      </div>
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
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Monitor, Setting, VideoCamera, Warning } from '@element-plus/icons-vue';
import { useDeviceStore } from './stores/deviceStore';
import RealTimeChart from './components/RealTimeChart.vue';
import DeviceStatusMonitor from './components/DeviceStatusMonitor.vue';
import AlertManager from './components/AlertManager.vue';

const store = useDeviceStore();
const dialogVisible = ref(false);
const editingId = ref(null);
const currentView = ref('overview');
const form = reactive({
  deviceId: '',
  name: '',
  type: 'sensor',
  protocol: 'mqtt',
  status: 'online'
});

const videoMode = ref('live');
const videoQuality = ref('auto');
const videoElement = ref(null);
const isPlaying = ref(false);

const overviewStats = reactive({
  total: 25,
  online: 20,
  offline: 3,
  alerts: 8
});

// 温度趋势数据
const temperatureData = ref([
  { time: new Date(Date.now() - 3600000), value: 28 },
  { time: new Date(Date.now() - 3000000), value: 30 },
  { time: new Date(Date.now() - 2400000), value: 32 },
  { time: new Date(Date.now() - 1800000), value: 31 },
  { time: new Date(Date.now() - 1200000), value: 33 },
  { time: new Date(Date.now() - 600000), value: 35 },
  { time: new Date(), value: 34 }
]);

// 设备状态分布数据
const deviceStatusData = ref([
  { name: '在线', count: 20 },
  { name: '离线', count: 3 },
  { name: '断连', count: 1 },
  { name: '错误', count: 1 }
]);

const videoSource = computed(() => {
  if (videoMode.value === 'live') {
    const suffix = videoQuality.value === 'auto' ? '' : `?quality=${videoQuality.value}`;
    return `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8${suffix}`;
  }
  return 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
});

const handleViewChange = (index) => {
  currentView.value = index;
};

const togglePlay = () => {
  if (videoElement.value) {
    if (videoElement.value.paused) {
      videoElement.value.play();
      isPlaying.value = true;
    } else {
      videoElement.value.pause();
      isPlaying.value = false;
    }
  }
};

const stopVideo = () => {
  if (videoElement.value) {
    videoElement.value.pause();
    videoElement.value.currentTime = 0;
    isPlaying.value = false;
  }
};

const fastForward = () => {
  if (videoElement.value) {
    videoElement.value.currentTime += 10;
  }
};

const toggleFullscreen = () => {
  if (videoElement.value) {
    if (!document.fullscreenElement) {
      videoElement.value.requestFullscreen().catch(err => {
        console.error('全屏请求失败:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }
};

const onFullscreenChange = () => {
  // 全屏状态变化时的处理
};

const resetForm = () => {
  form.deviceId = '';
  form.name = '';
  form.type = 'sensor';
  form.protocol = 'mqtt';
  form.status = 'online';
};

const openCreate = () => {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (row) => {
  editingId.value = row.id;
  form.deviceId = row.deviceId;
  form.name = row.name;
  form.type = row.type;
  form.protocol = row.protocol;
  form.status = row.status;
  dialogVisible.value = true;
};

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

const setLive = () => {
  videoMode.value = 'live';
};

const setPlayback = () => {
  videoMode.value = 'playback';
};

onMounted(() => {
  store.reload().catch(() => {
    ElMessage.error('设备加载失败，请检查后端服务');
  });

  // 模拟实时数据更新
  setInterval(() => {
    temperatureData.value.push({
      time: new Date(),
      value: 30 + Math.random() * 10
    });
    if (temperatureData.value.length > 10) {
      temperatureData.value.shift();
    }
  }, 5000);
});
</script>
