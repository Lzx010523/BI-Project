<template>
  <div class="excel-chart-page">
    <!-- 顶部说明卡片 -->
    <el-card shadow="never" class="intro-card">
      <div class="intro-content">
        <div class="intro-left">
          <el-icon :size="32" color="#1890ff"><DataAnalysis /></el-icon>
          <div>
            <div class="intro-title">数据导入生成图表</div>
            <div class="intro-desc">上传 Excel/CSV 文件，系统将自动解析并生成对应可视化图表（样例模式：前端模拟数据）</div>
          </div>
        </div>
        <el-tag type="info" effect="plain">样例页面</el-tag>
      </div>
    </el-card>

    <!-- 上传区域 -->
    <el-card shadow="never" class="upload-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">第一步：上传文件</span>
          <el-button text type="primary" @click="loadDemoData">使用示例数据</el-button>
        </div>
      </template>
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls,.csv"
        :on-change="handleFileChange"
      >
        <el-icon :size="56" color="#1890ff"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .xlsx / .xls / .csv 格式 · 文件大小不超过 10MB
          </div>
        </template>
      </el-upload>

      <div v-if="fileInfo" class="file-info">
        <el-icon color="#52c41a"><CircleCheckFilled /></el-icon>
        <span>已选择文件：<b>{{ fileInfo.name }}</b>（{{ formatSize(fileInfo.size) }}）</span>
        <el-button type="primary" :loading="parsing" @click="parseFile">解析并生成图表</el-button>
      </div>
    </el-card>

    <!-- 图表配置 -->
    <el-card v-if="parsedData.headers.length" shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">第二步：配置图表</span>
        </div>
      </template>
      <el-form :inline="true" :model="chartConfig">
        <el-form-item label="图表类型">
          <el-select v-model="chartConfig.type" style="width: 160px" @change="renderChart">
            <el-option label="柱状图" value="bar" />
            <el-option label="折线图" value="line" />
            <el-option label="饼图" value="pie" />
            <el-option label="散点图" value="scatter" />
          </el-select>
        </el-form-item>
        <el-form-item label="X 轴 / 类别">
          <el-select v-model="chartConfig.xAxis" style="width: 160px" @change="renderChart">
            <el-option v-for="h in parsedData.headers" :key="h" :label="h" :value="h" />
          </el-select>
        </el-form-item>
        <el-form-item label="Y 轴 / 数值">
          <el-select v-model="chartConfig.yAxis" style="width: 160px" @change="renderChart">
            <el-option v-for="h in parsedData.headers" :key="h" :label="h" :value="h" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图表展示 -->
    <el-card v-if="parsedData.rows.length" shadow="hover" class="chart-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">第三步：图表预览（{{ chartConfig.type }}）</span>
          <el-button type="primary" :icon="Download" size="small" @click="downloadChart">导出图片</el-button>
        </div>
      </template>
      <div ref="chartRef" class="chart-container"></div>
    </el-card>

    <!-- 数据预览 -->
    <el-card v-if="parsedData.rows.length" shadow="never" class="data-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">数据预览（前 10 条）</span>
          <span class="data-stat">共 {{ parsedData.rows.length }} 条</span>
        </div>
      </template>
      <el-table :data="parsedData.rows.slice(0, 10)" border stripe size="small">
        <el-table-column
          v-for="h in parsedData.headers"
          :key="h"
          :prop="h"
          :label="h"
          min-width="120"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  DataAnalysis, UploadFilled, CircleCheckFilled, Download
} from '@element-plus/icons-vue'

// ===== 文件信息 =====
const uploadRef = ref(null)
const fileInfo = ref(null)
const parsing = ref(false)

// ===== 解析后的数据 =====
const parsedData = reactive({
  headers: [],
  rows: []
})

// ===== 图表配置 =====
const chartConfig = reactive({
  type: 'bar',
  xAxis: '',
  yAxis: ''
})

// ===== 图表实例 =====
const chartRef = ref(null)
let chartInstance = null

// 选择文件
function handleFileChange(file) {
  fileInfo.value = file
  parsedData.headers = []
  parsedData.rows = []
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// 解析文件（样例：直接生成模拟数据）
async function parseFile() {
  if (!fileInfo.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  parsing.value = true
  try {
    // TODO: 实际开发时这里调用后端接口
    // const formData = new FormData()
    // formData.append('file', fileInfo.value.raw)
    // const res = await axios.post('/api/excel-chart/parse', formData)
    // parsedData.headers = res.data.headers
    // parsedData.rows = res.data.rows

    // 样例：模拟解析结果
    await new Promise(r => setTimeout(r, 800))
    const demo = generateDemoData()
    parsedData.headers = demo.headers
    parsedData.rows = demo.rows

    // 默认选前两列
    chartConfig.xAxis = demo.headers[0]
    chartConfig.yAxis = demo.headers[1]

    ElMessage.success('解析成功，已生成图表')
    await nextTick()
    renderChart()
  } finally {
    parsing.value = false
  }
}

// 使用示例数据
function loadDemoData() {
  fileInfo.value = { name: 'demo-data.csv', size: 2048 }
  parseFile()
}

// 生成示例数据
function generateDemoData() {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const products = ['智能手机', '笔记本电脑', '平板电脑', '智能手表', '耳机']
  const headers = ['月份', '销售额(万元)', '订单量', '客户数']
  const rows = months.map(m => ({
    '月份': m,
    '销售额(万元)': Math.floor(Math.random() * 500) + 100,
    '订单量': Math.floor(Math.random() * 1000) + 200,
    '客户数': Math.floor(Math.random() * 800) + 150
  }))
  return { headers, rows }
}

// 渲染图表
function renderChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)

  const xData = parsedData.rows.map(r => r[chartConfig.xAxis])
  const yData = parsedData.rows.map(r => Number(r[chartConfig.yAxis]) || 0)

  const baseOption = {
    tooltip: { trigger: chartConfig.type === 'pie' ? 'item' : 'axis' },
    legend: { data: [chartConfig.yAxis], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
  }

  let option
  if (chartConfig.type === 'pie') {
    option = {
      ...baseOption,
      series: [{
        name: chartConfig.yAxis,
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '55%'],
        roseType: 'area',
        data: xData.map((x, i) => ({ name: x, value: yData[i] }))
      }]
    }
  } else if (chartConfig.type === 'scatter') {
    option = {
      ...baseOption,
      xAxis: { type: 'value', name: chartConfig.xAxis },
      yAxis: { type: 'value', name: chartConfig.yAxis },
      series: [{
        type: 'scatter',
        data: xData.map((x, i) => [i, yData[i]]),
        symbolSize: 14
      }]
    }
  } else {
    option = {
      ...baseOption,
      xAxis: { type: 'category', data: xData, name: chartConfig.xAxis },
      yAxis: { type: 'value', name: chartConfig.yAxis },
      series: [{
        name: chartConfig.yAxis,
        type: chartConfig.type,
        data: yData,
        smooth: chartConfig.type === 'line',
        itemStyle: { color: '#1890ff' },
        areaStyle: chartConfig.type === 'line' ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24,144,255,0.4)' },
            { offset: 1, color: 'rgba(24,144,255,0.02)' }
          ])
        } : undefined
      }]
    }
  }
  chartInstance.setOption(option)
}

// 导出图表为图片
function downloadChart() {
  if (!chartInstance) return
  const url = chartInstance.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-${Date.now()}.png`
  a.click()
}

// 文件大小格式化
function formatSize(size) {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / 1024 / 1024).toFixed(2) + ' MB'
}

// 自适应
function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.excel-chart-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.intro-card,
.upload-card,
.config-card,
.chart-card,
.data-card {
  border-radius: 8px;
}

.intro-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.intro-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.intro-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.intro-desc {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.data-stat {
  font-size: 13px;
  color: #1890ff;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
}

.chart-container {
  height: 420px;
}
</style>
