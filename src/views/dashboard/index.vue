<template>
  <div class="dashboard-page">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="12" :sm="6" v-for="(kpi, idx) in kpiCards" :key="idx">
        <el-card shadow="hover" class="kpi-card" :body-style="{ padding: '20px 24px' }">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">{{ kpi.label }}</span>
              <div class="kpi-value">
                <span class="kpi-prefix">{{ kpi.prefix }}</span>
                {{ kpi.value }}
              </div>
              <div class="kpi-footer">
                <span :class="['kpi-trend', kpi.trend >= 0 ? 'up' : 'down']">
                  <el-icon><Top v-if="kpi.trend >= 0" /><Bottom v-else /></el-icon>
                  {{ Math.abs(kpi.trend) }}%
                </span>
                <span class="kpi-compare">较昨日</span>
              </div>
            </div>
            <div class="kpi-icon" :style="{ background: kpi.bgColor }">
              <el-icon :size="28" color="#fff"><component :is="kpi.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时状态指示器 -->
    <el-row :gutter="16" class="status-row">
      <el-col :span="24">
        <el-card shadow="never" class="status-bar" :body-style="{ padding: '10px 24px' }">
          <div class="status-content">
            <div class="status-left">
              <el-tag type="success" effect="dark" round>
                <el-icon class="pulse-dot"><CircleCheck /></el-icon>
                实时数据流运行中
              </el-tag>
              <span class="status-text">XXL-JOB 预聚合任务每 5 秒刷新 · 最近更新时间: {{ lastUpdateTime }}</span>
            </div>
            <div class="status-right">
              <el-button :icon="Refresh" text @click="refreshData" :loading="refreshing">刷新数据</el-button>
              <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="" inline-prompt />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 - 第一行 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">今日订单趋势（按小时）</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button value="orders">订单量</el-radio-button>
                <el-radio-button value="revenue">销售额</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">订单状态分布</span>
              <el-tag size="small" type="info">实时</el-tag>
            </div>
          </template>
          <div ref="statusChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 - 第二行 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">商品销量排行 TOP10</span>
              <el-date-picker
                v-model="rankingDate"
                type="date"
                placeholder="选择日期"
                size="small"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 140px"
              />
            </div>
          </template>
          <div ref="rankingChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">区域销售分布</span>
              <el-tag size="small" type="info">全国</el-tag>
            </div>
          </template>
          <div ref="regionChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最新订单明细表 -->
    <el-row class="table-row">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">最新订单明细</span>
              <div>
                <el-input
                  v-model="orderSearch"
                  placeholder="搜索订单号/客户名"
                  size="small"
                  :prefix-icon="Search"
                  style="width: 200px; margin-right: 12px"
                  clearable
                />
                <el-button type="primary" size="small" :icon="Download" @click="exportOrders">导出</el-button>
              </div>
            </div>
          </template>
          <el-table
            :data="filteredOrders"
            stripe
            highlight-current-row
            :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
            style="width: 100%"
            max-height="400"
          >
            <el-table-column prop="orderNo" label="订单编号" width="180" fixed />
            <el-table-column prop="customerName" label="客户名称" width="140" />
            <el-table-column prop="productName" label="商品名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="category" label="商品分类" width="110" />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column prop="unitPrice" label="单价(¥)" width="100" align="right">
              <template #default="{ row }">
                {{ Number(row.unitPrice).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="总金额(¥)" width="120" align="right">
              <template #default="{ row }">
                <span style="color: #f5222d; font-weight: 600">{{ Number(row.totalAmount).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="region" label="地区" width="100" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small" round>{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="paymentMethod" label="支付方式" width="100" />
            <el-table-column prop="createTime" label="下单时间" width="170" />
          </el-table>
          <div class="table-pagination">
            <el-pagination
              v-model:current-page="orderPage"
              v-model:page-size="orderPageSize"
              :page-sizes="[10, 20, 50]"
              :total="orderTotal"
              layout="total, sizes, prev, pager, next, jumper"
              background
              small
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi } from '@/api'
import dayjs from 'dayjs'
import {
  ShoppingCart, Money, UserFilled, TrendCharts,
  Top, Bottom, Refresh, Search, Download, CircleCheck
} from '@element-plus/icons-vue'

// ===== KPI 卡片数据 =====
const kpiCards = reactive([
  { label: '今日订单量', value: '3,826', prefix: '', trend: 12.5, icon: 'ShoppingCart', bgColor: 'linear-gradient(135deg, #1890ff, #096dd9)' },
  { label: '今日销售额', value: '286,450', prefix: '¥', trend: 8.3, icon: 'Money', bgColor: 'linear-gradient(135deg, #f5222d, #cf1322)' },
  { label: '新增用户数', value: '542', prefix: '', trend: -2.1, icon: 'UserFilled', bgColor: 'linear-gradient(135deg, #52c41a, #389e0d)' },
  { label: '转化率', value: '23.6', prefix: '', trend: 3.8, icon: 'TrendCharts', bgColor: 'linear-gradient(135deg, #fa8c16, #d46b08)' }
])

// ===== 实时刷新 =====
const lastUpdateTime = ref(dayjs().format('HH:mm:ss'))
const refreshing = ref(false)
const autoRefresh = ref(true)
let pollTimer = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!autoRefresh.value) return
    try {
      // 调用接口: GET /api/dashboard/realtime/stats
      // const data = await dashboardApi.getRealtimeStats()
      // 更新 KPI 数据...
      lastUpdateTime.value = dayjs().format('HH:mm:ss')
    } catch (e) { /* 静默处理 */ }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function refreshData() {
  refreshing.value = true
  try {
    // 调用接口: GET /api/dashboard/kpi-cards
    // const data = await dashboardApi.getKpiCards({ date: dayjs().format('YYYY-MM-DD') })
    lastUpdateTime.value = dayjs().format('HH:mm:ss')
  } finally {
    refreshing.value = false
  }
}

// ===== 图表 =====
const trendType = ref('orders')
const rankingDate = ref(dayjs().format('YYYY-MM-DD'))
const trendChartRef = ref(null)
const statusChartRef = ref(null)
const rankingChartRef = ref(null)
const regionChartRef = ref(null)
let trendChart, statusChart, rankingChart, regionChart

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
  const ordersData = [12, 8, 5, 3, 2, 6, 28, 85, 156, 210, 245, 198, 230, 215, 195, 220, 260, 310, 285, 240, 180, 120, 65, 30]
  const revenueData = ordersData.map(v => v * (50 + Math.random() * 80))
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: hours, boundaryGap: false, axisLine: { lineStyle: { color: '#d9d9d9' } } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      name: trendType.value === 'orders' ? '订单量' : '销售额',
      data: trendType.value === 'orders' ? ordersData : revenueData,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 3, color: '#1890ff' },
      itemStyle: { color: '#1890ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24, 144, 255, 0.35)' },
          { offset: 1, color: 'rgba(24, 144, 255, 0.02)' }
        ])
      }
    }]
  }
  trendChart.setOption(option)
}

function initStatusChart() {
  if (!statusChartRef.value) return
  statusChart = echarts.init(statusChartRef.value)
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center', itemGap: 16 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: 1580, name: '已完成', itemStyle: { color: '#52c41a' } },
        { value: 620, name: '待支付', itemStyle: { color: '#faad14' } },
        { value: 380, name: '配送中', itemStyle: { color: '#1890ff' } },
        { value: 150, name: '已取消', itemStyle: { color: '#ff4d4f' } },
        { value: 96, name: '退款中', itemStyle: { color: '#722ed1' } }
      ]
    }]
  }
  statusChart.setOption(option)
}

function initRankingChart() {
  if (!rankingChartRef.value) return
  rankingChart = echarts.init(rankingChartRef.value)
  const products = ['智能手机Pro', '无线耳机X3', '平板电脑Air', '机械键盘K1', '4K显示器', '蓝牙音箱S2', '智能手表W5', '游戏手柄G1', '充电宝20000mAh', '数据线套装']
  const sales = [856, 743, 621, 580, 524, 486, 432, 398, 356, 312]
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    yAxis: { type: 'category', data: products.reverse(), axisLine: { lineStyle: { color: '#d9d9d9' } }, axisLabel: { width: 100, overflow: 'truncate' } },
    series: [{
      type: 'bar',
      data: sales.reverse(),
      barWidth: 16,
      itemStyle: {
        borderRadius: [0, 8, 8, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#1890ff' },
          { offset: 1, color: '#36cfc9' }
        ])
      },
      label: { show: true, position: 'right', fontSize: 12, color: '#666' }
    }]
  }
  rankingChart.setOption(option)
}

function initRegionChart() {
  if (!regionChartRef.value) return
  regionChart = echarts.init(regionChartRef.value)
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { type: 'scroll', orient: 'vertical', right: '2%', top: 'center', itemGap: 12 },
    series: [{
      type: 'pie',
      radius: '65%',
      center: ['40%', '50%'],
      roseType: 'area',
      label: { show: false },
      data: [
        { value: 85600, name: '华东地区', itemStyle: { color: '#1890ff' } },
        { value: 62300, name: '华南地区', itemStyle: { color: '#52c41a' } },
        { value: 51200, name: '华北地区', itemStyle: { color: '#faad14' } },
        { value: 38700, name: '华中地区', itemStyle: { color: '#f5222d' } },
        { value: 28400, name: '西南地区', itemStyle: { color: '#722ed1' } },
        { value: 19800, name: '西北地区', itemStyle: { color: '#13c2c2' } },
        { value: 15200, name: '东北地区', itemStyle: { color: '#fa8c16' } }
      ]
    }]
  }
  regionChart.setOption(option)
}

watch(trendType, () => initTrendChart())

// ===== 订单明细 =====
const orderSearch = ref('')
const orderPage = ref(1)
const orderPageSize = ref(10)
const orderTotal = ref(128)
const latestOrders = ref([
  { orderNo: 'ORD20260612001', customerName: '张三科技有限公司', productName: '智能手机Pro 256GB', category: '电子产品', quantity: 2, unitPrice: 5999, totalAmount: 11998, region: '华东', status: '已完成', paymentMethod: '支付宝', createTime: '2026-06-12 14:32:15' },
  { orderNo: 'ORD20260612002', customerName: '李氏贸易集团', productName: '无线耳机X3 降噪版', category: '数码配件', quantity: 50, unitPrice: 399, totalAmount: 19950, region: '华南', status: '待支付', paymentMethod: '银行转账', createTime: '2026-06-12 14:28:40' },
  { orderNo: 'ORD20260612003', customerName: '王五电子商务', productName: '平板电脑Air 128GB', category: '电子产品', quantity: 5, unitPrice: 3299, totalAmount: 16495, region: '华北', status: '配送中', paymentMethod: '微信支付', createTime: '2026-06-12 14:15:22' },
  { orderNo: 'ORD20260612004', customerName: '星辰网络科技', productName: '机械键盘K1 青轴', category: '外设', quantity: 20, unitPrice: 599, totalAmount: 11980, region: '华东', status: '已完成', paymentMethod: '对公转账', createTime: '2026-06-12 13:58:07' },
  { orderNo: 'ORD20260612005', customerName: '赵六信息技术', productName: '4K显示器 27英寸', category: '电子产品', quantity: 3, unitPrice: 2499, totalAmount: 7497, region: '华中', status: '已取消', paymentMethod: '支付宝', createTime: '2026-06-12 13:42:33' },
  { orderNo: 'ORD20260612006', customerName: '远景投资管理', productName: '蓝牙音箱S2 旗舰版', category: '数码配件', quantity: 10, unitPrice: 899, totalAmount: 8990, region: '西南', status: '已完成', paymentMethod: '微信支付', createTime: '2026-06-12 13:20:18' },
  { orderNo: 'ORD20260612007', customerName: '华夏文化传媒', productName: '智能手表W5 GPS版', category: '穿戴设备', quantity: 8, unitPrice: 1899, totalAmount: 15192, region: '华南', status: '配送中', paymentMethod: '银行转账', createTime: '2026-06-12 12:55:42' },
  { orderNo: 'ORD20260612008', customerName: '锐智软件开发', productName: '游戏手柄G1 无线版', category: '游戏外设', quantity: 15, unitPrice: 299, totalAmount: 4485, region: '东北', status: '已完成', paymentMethod: '支付宝', createTime: '2026-06-12 12:30:11' }
])

const filteredOrders = computed(() => {
  if (!orderSearch.value) return latestOrders.value
  const kw = orderSearch.value.toLowerCase()
  return latestOrders.value.filter(o =>
    o.orderNo.toLowerCase().includes(kw) || o.customerName.toLowerCase().includes(kw)
  )
})

function statusTagType(status) {
  const map = { '已完成': 'success', '待支付': 'warning', '配送中': 'primary', '已取消': 'danger', '退款中': 'info' }
  return map[status] || 'info'
}

function exportOrders() {
  // 调用接口: GET /api/dashboard/orders/export
}

// ===== 窗口自适应 =====
function handleResize() {
  trendChart?.resize()
  statusChart?.resize()
  rankingChart?.resize()
  regionChart?.resize()
}

onMounted(async () => {
  await nextTick()
  initTrendChart()
  initStatusChart()
  initRankingChart()
  initRegionChart()
  startPolling()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  statusChart?.dispose()
  rankingChart?.dispose()
  regionChart?.dispose()
})
</script>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 16px; }
.kpi-card { border-radius: 8px; }
.kpi-content { display: flex; justify-content: space-between; align-items: center; }
.kpi-label { font-size: 13px; color: #8c8c8c; }
.kpi-value { font-size: 28px; font-weight: 700; color: #262626; margin: 6px 0; font-variant-numeric: tabular-nums; }
.kpi-prefix { font-size: 16px; font-weight: 400; margin-right: 2px; }
.kpi-footer { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.kpi-trend { display: flex; align-items: center; gap: 2px; font-weight: 600; }
.kpi-trend.up { color: #52c41a; }
.kpi-trend.down { color: #ff4d4f; }
.kpi-compare { color: #bfbfbf; }
.kpi-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.status-bar { border-radius: 8px; border: 1px solid #b7eb8f; background: #f6ffed; }
.status-content { display: flex; justify-content: space-between; align-items: center; }
.status-left { display: flex; align-items: center; gap: 16px; }
.status-text { font-size: 13px; color: #666; }
.status-right { display: flex; align-items: center; gap: 12px; }
.pulse-dot { animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.chart-row { margin: 0 !important; }
.chart-card { border-radius: 8px; }
.chart-container { height: 320px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }

.table-row { margin: 0 !important; }
.table-pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
