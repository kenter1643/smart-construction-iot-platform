<template>
  <div class="real-time-chart">
    <h3>{{ title }}</h3>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  xAxisField: {
    type: String,
    default: 'time'
  },
  yAxisField: {
    type: String,
    default: 'value'
  },
  chartType: {
    type: String,
    default: 'line'
  }
});

const chartRef = ref(null);
let chartInstance = null;

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    updateChart();
  }
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
});

watch(() => props.data, () => {
  if (chartInstance) {
    updateChart();
  }
}, { deep: true });

const updateChart = () => {
  if (!chartInstance) return;

  const option = {
    title: {
      text: props.title,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const dataPoint = params[0];
        return `${dataPoint.name}<br/>${props.title}: ${dataPoint.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d[props.xAxisField]),
      axisLabel: {
        formatter: function(value) {
          return new Date(value).toLocaleTimeString();
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: '{value}'
      }
    }
  };

  if (props.chartType === 'line') {
    option.series = [{
      name: props.title,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      data: props.data.map(d => d[props.yAxisField]),
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(128, 188, 255, 0.5)' },
          { offset: 1, color: 'rgba(128, 188, 255, 0.1)' }
        ])
      },
      itemStyle: {
        color: '#5470c6'
      },
      lineStyle: {
        color: '#5470c6'
      }
    }];
  } else if (props.chartType === 'bar') {
    option.series = [{
      name: props.title,
      type: 'bar',
      data: props.data.map(d => d[props.yAxisField]),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#1890ff' },
          { offset: 1, color: '#0050b3' }
        ])
      }
    }];
  }

  chartInstance.setOption(option);
};

// 窗口大小调整
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.real-time-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 200px;
  width: 100%;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}
</style>
