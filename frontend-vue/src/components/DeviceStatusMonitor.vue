<template>
  <div class="device-status-monitor">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>设备状态监控</span>
          <el-button type="primary" size="small" @click="refreshDevices">刷新</el-button>
        </div>
      </template>

      <el-table :data="devices" style="width: 100%" stripe>
        <el-table-column prop="deviceId" label="设备ID" width="140" />
        <el-table-column prop="name" label="设备名称" min-width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getDeviceTypeTag(row.type)">
              {{ getDeviceTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <div class="status-cell">
              <div :class="['status-indicator', row.status]"></div>
              <span class="status-text">{{ getStatusName(row.status) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdate" label="最后更新" width="180">
          <template #default="{ row }">
            {{ formatTime(row.lastUpdate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewDeviceDetails(row)">详情</el-button>
            <el-button size="small" type="primary" @click="controlDevice(row)">控制</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const devices = ref([
  {
    id: 1,
    deviceId: 'DEV-001',
    name: '温度传感器 #1',
    type: 'sensor',
    status: 'online',
    lastUpdate: new Date(Date.now() - 60000)
  },
  {
    id: 2,
    deviceId: 'DEV-002',
    name: '摄像头 #1',
    type: 'camera',
    status: 'online',
    lastUpdate: new Date(Date.now() - 30000)
  },
  {
    id: 3,
    deviceId: 'DEV-003',
    name: '控制器 #1',
    type: 'controller',
    status: 'offline',
    lastUpdate: new Date(Date.now() - 3600000)
  },
  {
    id: 4,
    deviceId: 'DEV-004',
    name: '执行器 #1',
    type: 'actuator',
    status: 'error',
    lastUpdate: new Date(Date.now() - 7200000)
  }
]);

const getStatusName = (status) => {
  const statusMap = {
    online: '在线',
    offline: '离线',
    disconnected: '断连',
    error: '错误'
  };
  return statusMap[status] || status;
};

const getDeviceTypeName = (type) => {
  const typeMap = {
    sensor: '传感器',
    camera: '摄像头',
    controller: '控制器',
    actuator: '执行器'
  };
  return typeMap[type] || type;
};

const getDeviceTypeTag = (type) => {
  const tagMap = {
    sensor: 'info',
    camera: 'success',
    controller: 'warning',
    actuator: 'danger'
  };
  return tagMap[type] || '';
};

const formatTime = (time) => {
  if (!time) return '-';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const refreshDevices = () => {
  ElMessage.success('设备状态已刷新');
};

const viewDeviceDetails = (device) => {
  ElMessageBox.alert(`设备详情：\nID: ${device.deviceId}\n名称: ${device.name}`, '设备详情', {
    confirmButtonText: '确定'
  });
};

const controlDevice = (device) => {
  ElMessageBox.prompt('请输入控制命令', '设备控制', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    ElMessage.success(`已发送命令 "${value}" 到设备 ${device.name}`);
  }).catch(() => {
    ElMessage.info('已取消');
  });
};

onMounted(() => {
  // 模拟实时更新
  setInterval(() => {
    devices.value = devices.value.map(device => ({
      ...device,
      lastUpdate: new Date()
    }));
  }, 10000);
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #999;
}

.status-indicator.online {
  background-color: #67c23a;
}

.status-indicator.offline {
  background-color: #909399;
}

.status-indicator.disconnected {
  background-color: #e6a23c;
}

.status-indicator.error {
  background-color: #f56c6c;
}

.status-text {
  font-size: 14px;
}
</style>
