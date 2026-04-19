<template>
  <div class="alert-manager">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>告警管理</span>
          <div class="header-actions">
            <el-button size="small" @click="filterAlerts('all')">全部</el-button>
            <el-button size="small" type="warning" @click="filterAlerts('unresolved')">未处理</el-button>
            <el-button type="primary" size="small" @click="refreshAlerts">刷新</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16" class="alert-stats">
        <el-col :span="6">
          <el-card class="stat-card total">
            <div class="stat-title">总告警</div>
            <div class="stat-value">{{ totalAlerts }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card critical">
            <div class="stat-title">严重告警</div>
            <div class="stat-value">{{ criticalAlerts }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card high">
            <div class="stat-title">高优先级告警</div>
            <div class="stat-value">{{ highAlerts }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card medium">
            <div class="stat-title">中优先级告警</div>
            <div class="stat-value">{{ mediumAlerts }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-table :data="filteredAlerts" style="width: 100%" stripe>
        <el-table-column prop="id" label="告警ID" width="100" />
        <el-table-column prop="deviceId" label="设备ID" width="140" />
        <el-table-column prop="alertType" label="告警类型" min-width="180" />
        <el-table-column prop="severity" label="严重程度" width="120">
          <template #default="{ row }">
            <el-tag :type="getSeverityTag(row.severity)">
              {{ getSeverityName(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="告警信息" min-width="300" show-overflow-tooltip />
        <el-table-column prop="triggeredAt" label="触发时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.triggeredAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.resolved ? 'success' : 'warning'">
              {{ row.resolved ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewAlertDetails(row)">详情</el-button>
            <el-button
              v-if="!row.resolved"
              size="small"
              type="success"
              @click="resolveAlert(row)"
            >
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const alerts = ref([
  {
    id: 1,
    deviceId: 'DEV-001',
    alertType: '温度告警',
    severity: 'high',
    message: '温度传感器 #1 检测到温度异常，当前值为 85°C，超过阈值 70°C',
    triggeredAt: new Date(Date.now() - 3600000),
    resolved: false
  },
  {
    id: 2,
    deviceId: 'DEV-002',
    alertType: '连接告警',
    severity: 'medium',
    message: '摄像头 #1 连接断开',
    triggeredAt: new Date(Date.now() - 7200000),
    resolved: true,
    resolvedAt: new Date(Date.now() - 3600000)
  },
  {
    id: 3,
    deviceId: 'DEV-003',
    alertType: '错误告警',
    severity: 'critical',
    message: '控制器 #1 检测到严重错误，需要立即处理',
    triggeredAt: new Date(Date.now() - 1800000),
    resolved: false
  },
  {
    id: 4,
    deviceId: 'DEV-004',
    alertType: '预警',
    severity: 'low',
    message: '执行器 #1 运行时间过长，建议检查',
    triggeredAt: new Date(Date.now() - 10800000),
    resolved: false
  }
]);

const currentFilter = ref('all');

const totalAlerts = computed(() => alerts.value.length);
const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical' && !a.resolved).length);
const highAlerts = computed(() => alerts.value.filter(a => a.severity === 'high' && !a.resolved).length);
const mediumAlerts = computed(() => alerts.value.filter(a => a.severity === 'medium' && !a.resolved).length);

const filteredAlerts = computed(() => {
  if (currentFilter.value === 'all') {
    return alerts.value;
  } else if (currentFilter.value === 'unresolved') {
    return alerts.value.filter(a => !a.resolved);
  }
  return alerts.value;
});

const getSeverityName = (severity) => {
  const severityMap = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  };
  return severityMap[severity] || severity;
};

const getSeverityTag = (severity) => {
  const tagMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  };
  return tagMap[severity] || '';
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

const refreshAlerts = () => {
  ElMessage.success('告警列表已刷新');
};

const filterAlerts = (filterType) => {
  currentFilter.value = filterType;
  ElMessage.success(`已切换到${filterType === 'all' ? '全部告警' : '未处理告警'}视图`);
};

const viewAlertDetails = (alert) => {
  ElMessageBox.alert(
    `告警详情：\n\n` +
    `ID: ${alert.id}\n` +
    `设备ID: ${alert.deviceId}\n` +
    `类型: ${alert.alertType}\n` +
    `严重程度: ${getSeverityName(alert.severity)}\n` +
    `信息: ${alert.message}\n` +
    `触发时间: ${formatTime(alert.triggeredAt)}\n` +
    `状态: ${alert.resolved ? '已处理' : '未处理'}`,
    '告警详情',
    {
      confirmButtonText: '确定'
    }
  );
};

const resolveAlert = async (alert) => {
  try {
    await ElMessageBox.confirm(
      `确定要处理告警 #${alert.id}？`,
      '处理告警',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    alert.resolved = true;
    alert.resolvedAt = new Date();
    ElMessage.success(`告警 #${alert.id} 已处理`);
  } catch {
    ElMessage.info('已取消');
  }
};

onMounted(() => {
  // 模拟实时更新
  setInterval(() => {
    if (Math.random() > 0.9) {
      const severities = ['low', 'medium', 'high', 'critical'];
      const types = ['温度告警', '连接告警', '错误告警', '预警'];
      const newAlert = {
        id: alerts.value.length + 1,
        deviceId: `DEV-00${Math.floor(Math.random() * 4) + 1}`,
        alertType: types[Math.floor(Math.random() * types.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: '模拟告警信息，请查看详情',
        triggeredAt: new Date(),
        resolved: false
      };
      alerts.value.unshift(newAlert);
    }
  }, 30000);
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.alert-stats {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 10px;
}

.stat-card .stat-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stat-card .stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-card.total .stat-value {
  color: #409eff;
}

.stat-card.critical .stat-value {
  color: #f56c6c;
}

.stat-card.high .stat-value {
  color: #e6a23c;
}

.stat-card.medium .stat-value {
  color: #67c23a;
}
</style>
