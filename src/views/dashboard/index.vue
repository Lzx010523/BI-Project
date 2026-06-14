<template>
  <div class="dashboard-page">
    <!-- 顶部：业务域切换 + 时间范围 + 同比环比 + 自动刷新 -->
    <el-card shadow="never" class="top-bar">
      <div class="top-bar-content">
        <div class="domain-tabs">
          <div
            v-for="d in domains"
            :key="d.key"
            :class="['domain-tab', { active: currentDomain === d.key }]"
            @click="currentDomain = d.key"
          >
            <el-icon :size="20"><component :is="d.icon" /></el-icon>
            <span>{{ d.label }}</span>
            <span class="tab-sub">{{ d.subLabel }}</span>
          </div>
        </div>
        <div class="top-right">
          <el-radio-group v-model="timeRange" size="small" @change="refreshAll">
            <el-radio-button value="today">今日</el-radio-button>
            <el-radio-button value="week">本周</el-radio-button>
            <el-radio-button value="month">本月</el-radio-button>
            <el-radio-button value="quarter">本季</el-radio-button>
            <el-radio-button value="year">本年</el-radio-button>
          </el-radio-group>
          <el-radio-group v-model="compareMode" size="small" @change="refreshAll" style="margin-left: 8px">
            <el-radio-button value="mom">环比</el-radio-button>
            <el-radio-button value="yoy">同比</el-radio-button>
            <el-radio-button value="target">对比目标</el-radio-button>
          </el-radio-group>
          <el-button :icon="Refresh" size="small" :loading="refreshing" @click="refreshAll" style="margin-left: 8px">刷新</el-button>
          <el-tooltip content="全屏" placement="bottom">
            <el-icon class="action-icon" @click="toggleFullscreen"><FullScreen /></el-icon>
          </el-tooltip>
        </div>
      </div>
    </el-card>

    <!-- 第一行：核心 KPI（绑定到当前域） -->
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6" v-for="(kpi, i) in currentKpis" :key="i">
        <el-card shadow="hover" class="kpi-card" :body-style="{ padding: '20px 24px' }">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">{{ kpi.label }}</span>
              <div class="kpi-value">
                <span class="kpi-prefix">{{ kpi.prefix }}</span>
                <span class="kpi-num">{{ kpi.value }}</span>
                <span class="kpi-unit">{{ kpi.unit }}</span>
              </div>
              <div class="kpi-footer">
                <span :class="['kpi-trend', kpi.compare >= 0 ? 'up' : 'down']">
                  <el-icon><CaretTop v-if="kpi.compare >= 0" /><CaretBottom v-else /></el-icon>
                  {{ Math.abs(kpi.compare) }}%
                </span>
                <span class="kpi-compare">{{ compareText }}</span>
                <el-progress v-if="compareMode === 'target'" :percentage="kpi.targetRate" :stroke-width="4" :show-text="false" style="margin-top: 4px" />
                <span v-if="compareMode === 'target'" class="kpi-target">目标完成 {{ kpi.targetRate }}%</span>
              </div>
            </div>
            <div class="kpi-icon" :style="{ background: kpi.bgColor }">
              <el-icon :size="28" color="#fff"><component :is="kpi.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行：核心趋势 + 漏斗/分布 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ currentDomainLabel }}核心指标趋势</span>
              <el-radio-group v-model="trendMetric" size="small">
                <el-radio-button v-for="m in currentKpis.slice(0, 3)" :key="m.key" :value="m.key">{{ m.label }}</el-radio-button>
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
              <span class="card-title">{{ funnelTitle }}</span>
              <el-tag size="small" type="info">{{ funnelSubTitle }}</el-tag>
            </div>
          </template>
          <div ref="funnelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第三行：Top榜 + 区域分布 + 明细 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ topListTitle }}</span>
              <el-button text type="primary" size="small" @click="showMore = true">查看更多</el-button>
            </div>
          </template>
          <div ref="topChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">区域/组织分布</span>
              <el-select v-model="regionDim" size="small" style="width: 120px">
                <el-option label="按地区" value="region" />
                <el-option label="按部门" value="dept" />
                <el-option label="按渠道" value="channel" />
              </el-select>
            </div>
          </template>
          <div ref="regionChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">异常预警 Top5</span>
              <el-button text type="warning" size="small" @click="$router.push('/alert')">查看告警</el-button>
            </div>
          </template>
          <el-table :data="alerts" size="small" :show-header="true">
            <el-table-column prop="metric" label="指标" min-width="100" />
            <el-table-column prop="current" label="当前" width="80" align="right" />
            <el-table-column prop="threshold" label="阈值" width="80" align="right" />
            <el-table-column prop="level" label="级别" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.level === '严重' ? 'danger' : row.level === '高' ? 'warning' : 'info'" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="时间" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第四行：明细 + 对比 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">业务明细（点击行可下钻）</span>
              <div>
                <el-input v-model="detailKw" :prefix-icon="Search" placeholder="搜索" clearable size="small" style="width: 180px" />
                <el-button size="small" :icon="Download" style="margin-left: 8px" @click="exportDetail">导出</el-button>
              </div>
            </div>
          </template>
          <el-table :data="filteredDetails" stripe size="small" max-height="320" @row-click="drillDown">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column v-for="col in detailColumns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width" :align="col.align" :sortable="col.sortable">
              <template #default="{ row }">
                <span v-if="col.isTrend" :style="{ color: row[col.prop] >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }">
                  {{ row[col.prop] >= 0 ? '+' : '' }}{{ row[col.prop] }}%
                </span>
                <span v-else-if="col.isMoney" style="color: #f5222d; font-weight: 600">¥{{ Number(row[col.prop]).toLocaleString() }}</span>
                <el-tag v-else-if="col.isTag" :type="col.tagType(row[col.prop])" size="small">{{ row[col.prop] }}</el-tag>
                <span v-else>{{ row[col.prop] }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <span class="card-title">目标完成进度</span>
          </template>
          <div ref="targetChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下钻弹窗 -->
    <el-dialog v-model="drillVisible" :title="`${drillRow?.name || ''} - 业务下钻`" width="80%" top="5vh">
      <el-tabs v-model="drillTab">
        <el-tab-pane label="趋势" name="trend">
          <div ref="drillTrendChartRef" style="height: 320px"></div>
        </el-tab-pane>
        <el-tab-pane label="构成" name="structure">
          <div ref="drillPieChartRef" style="height: 320px"></div>
        </el-tab-pane>
        <el-tab-pane label="明细" name="detail">
          <el-table :data="drillDetails" border size="small" max-height="320">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="metric" label="指标" />
            <el-table-column prop="value" label="值" align="right" />
            <el-table-column prop="growth" label="环比" align="right">
              <template #default="{ row }">
                <span :style="{ color: row.growth >= 0 ? '#52c41a' : '#ff4d4f' }">
                  {{ row.growth >= 0 ? '+' : '' }}{{ row.growth }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import {
  Refresh, Search, Download, FullScreen,
  CaretTop, CaretBottom,
  ShoppingCart, Money, UserFilled, TrendCharts,
  Van, OfficeBuilding, ShoppingBag, Wallet
} from '@element-plus/icons-vue'

const router = useRouter()

// ===== 业务域 =====
const domains = [
  { key: 'sales', label: '销售域', subLabel: 'Sales', icon: 'ShoppingCart' },
  { key: 'finance', label: '财务域', subLabel: 'Finance', icon: 'Money' },
  { key: 'operation', label: '运营域', subLabel: 'Operation', icon: 'TrendCharts' },
  { key: 'supply', label: '供应链域', subLabel: 'Supply Chain', icon: 'Van' }
]
const currentDomain = ref('sales')
const currentDomainLabel = computed(() => domains.find(d => d.key === currentDomain.value)?.label || '')

// ===== 时间范围 + 对比 =====
const timeRange = ref('month')
const compareMode = ref('mom')
const compareText = computed(() => ({ mom: '环比上周/上月', yoy: '同比去年同期', target: '对比本期目标' }[compareMode.value]))

// ===== 域 → KPI 配置 =====
const kpiConfig = {
  sales: {
    trendMetric: 'orders',
    kpis: [
      { key: 'orders', label: '订单量', value: '3,826', prefix: '', unit: '单', compare: 12.5, icon: 'ShoppingCart', bgColor: 'linear-gradient(135deg,#1890ff,#096dd9)', targetRate: 76 },
      { key: 'revenue', label: '销售总额', value: '286,450', prefix: '¥', unit: '', compare: 8.3, icon: 'Money', bgColor: 'linear-gradient(135deg,#f5222d,#cf1322)', targetRate: 82 },
      { key: 'newCust', label: '新增客户', value: '542', prefix: '', unit: '位', compare: -2.1, icon: 'UserFilled', bgColor: 'linear-gradient(135deg,#52c41a,#389e0d)', targetRate: 65 },
      { key: 'conv', label: '转化率', value: '23.6', prefix: '', unit: '%', compare: 3.8, icon: 'TrendCharts', bgColor: 'linear-gradient(135deg,#fa8c16,#d46b08)', targetRate: 78 }
    ],
    detail: {
      title: '销售区域明细', columns: [
        { prop: 'region', label: '地区', width: 90 },
        { prop: 'orders', label: '订单量', width: 100, align: 'right' },
        { prop: 'revenue', label: '销售额(¥)', width: 130, align: 'right', isMoney: true },
        { prop: 'growth', label: '环比', width: 90, align: 'right', isTrend: true },
        { prop: 'status', label: '状态', width: 90, isTag: true, tagType: v => v === '达标' ? 'success' : v === '预警' ? 'warning' : 'danger' }
      ],
      rows: [
        { region: '华东大区', orders: 1820, revenue: 142800, growth: 15.2, status: '达标' },
        { region: '华南大区', orders: 956, revenue: 78320, growth: 8.5, status: '达标' },
        { region: '华北大区', orders: 612, revenue: 51800, growth: -3.2, status: '预警' },
        { region: '华中大区', orders: 285, revenue: 18900, growth: -12.5, status: '严重' },
        { region: '西南大区', orders: 153, revenue: 9450, growth: 5.2, status: '达标' }
      ]
    }
  },
  finance: {
    trendMetric: 'revenue',
    kpis: [
      { key: 'revenue', label: '营业收入', value: '586.4', prefix: '¥', unit: '万', compare: 6.8, icon: 'Wallet', bgColor: 'linear-gradient(135deg,#1890ff,#096dd9)', targetRate: 78 },
      { key: 'profit', label: '净利润', value: '128.6', prefix: '¥', unit: '万', compare: 12.3, icon: 'Money', bgColor: 'linear-gradient(135deg,#52c41a,#389e0d)', targetRate: 85 },
      { key: 'cost', label: '营业成本', value: '382.5', prefix: '¥', unit: '万', compare: -2.5, icon: 'ShoppingBag', bgColor: 'linear-gradient(135deg,#fa8c16,#d46b08)', targetRate: 70 },
      { key: 'ar', label: '应收账款', value: '156.8', prefix: '¥', unit: '万', compare: -5.2, icon: 'OfficeBuilding', bgColor: 'linear-gradient(135deg,#722ed1,#531dab)', targetRate: 65 }
    ],
    detail: {
      title: '科目余额',
      columns: [
        { prop: 'subject', label: '科目', width: 140 },
        { prop: 'debit', label: '借方', width: 120, align: 'right', isMoney: true },
        { prop: 'credit', label: '贷方', width: 120, align: 'right', isMoney: true },
        { prop: 'balance', label: '余额', width: 120, align: 'right', isMoney: true },
        { prop: 'growth', label: '环比', width: 90, align: 'right', isTrend: true }
      ],
      rows: [
        { subject: '主营业务收入', debit: 0, credit: 5864000, balance: 5864000, growth: 6.8 },
        { subject: '主营业务成本', debit: 3825000, credit: 0, balance: 3825000, growth: 2.5 },
        { subject: '销售费用', debit: 285000, credit: 0, balance: 285000, growth: -3.5 },
        { subject: '管理费用', debit: 165000, credit: 0, balance: 165000, growth: 1.2 },
        { subject: '应收账款', debit: 1568000, credit: 0, balance: 1568000, growth: -5.2 }
      ]
    }
  },
  operation: {
    trendMetric: 'dau',
    kpis: [
      { key: 'dau', label: '日活用户', value: '128,560', prefix: '', unit: '人', compare: 8.5, icon: 'UserFilled', bgColor: 'linear-gradient(135deg,#1890ff,#096dd9)', targetRate: 88 },
      { key: 'retention', label: '次日留存', value: '62.5', prefix: '', unit: '%', compare: 2.1, icon: 'TrendCharts', bgColor: 'linear-gradient(135deg,#52c41a,#389e0d)', targetRate: 75 },
      { key: 'duration', label: '人均时长', value: '18.6', prefix: '', unit: '分钟', compare: 5.3, icon: 'ShoppingCart', bgColor: 'linear-gradient(135deg,#fa8c16,#d46b08)', targetRate: 70 },
      { key: 'pv', label: '日 PV', value: '856K', prefix: '', unit: '', compare: 12.8, icon: 'Money', bgColor: 'linear-gradient(135deg,#722ed1,#531dab)', targetRate: 92 }
    ],
    detail: {
      title: '渠道运营明细',
      columns: [
        { prop: 'channel', label: '渠道', width: 120 },
        { prop: 'uv', label: '访客数', width: 100, align: 'right' },
        { prop: 'cvr', label: '转化率', width: 100, align: 'right' },
        { prop: 'cpa', label: '获客成本', width: 110, align: 'right', isMoney: true },
        { prop: 'roi', label: 'ROI', width: 90, align: 'right' }
      ],
      rows: [
        { channel: '百度SEM', uv: 28560, cvr: 3.2, cpa: 28.5, roi: 3.8 },
        { channel: '抖音广告', uv: 42800, cvr: 4.5, cpa: 22.8, roi: 5.2 },
        { channel: '微信朋友圈', uv: 18650, cvr: 5.8, cpa: 35.6, roi: 4.1 },
        { channel: '小红书种草', uv: 12380, cvr: 6.2, cpa: 45.2, roi: 2.8 },
        { channel: '自然搜索', uv: 35200, cvr: 2.8, cpa: 0, roi: 0 }
      ]
    }
  },
  supply: {
    trendMetric: 'turnover',
    kpis: [
      { key: 'turnover', label: '库存周转率', value: '4.8', prefix: '', unit: '次/月', compare: 0.5, icon: 'Van', bgColor: 'linear-gradient(135deg,#1890ff,#096dd9)', targetRate: 80 },
      { key: 'fulfill', label: '履约时效', value: '28.5', prefix: '', unit: '小时', compare: -8.2, icon: 'ShoppingBag', bgColor: 'linear-gradient(135deg,#52c41a,#389e0d)', targetRate: 85 },
      { key: 'stockout', label: '缺货率', value: '2.3', prefix: '', unit: '%', compare: -1.5, icon: 'OfficeBuilding', bgColor: 'linear-gradient(135deg,#fa8c16,#d46b08)', targetRate: 92 },
      { key: 'return', label: '退货率', value: '5.6', prefix: '', unit: '%', compare: -0.8, icon: 'TrendCharts', bgColor: 'linear-gradient(135deg,#722ed1,#531dab)', targetRate: 78 }
    ],
    detail: {
      title: '仓库运营明细',
      columns: [
        { prop: 'warehouse', label: '仓库', width: 120 },
        { prop: 'inbound', label: '入库量', width: 100, align: 'right' },
        { prop: 'outbound', label: '出库量', width: 100, align: 'right' },
        { prop: 'stock', label: '在库量', width: 100, align: 'right' },
        { prop: 'util', label: '利用率', width: 90, align: 'right' }
      ],
      rows: [
        { warehouse: '上海中心仓', inbound: 12800, outbound: 11560, stock: 45820, util: 85 },
        { warehouse: '广州南沙仓', inbound: 8560, outbound: 7820, stock: 32560, util: 72 },
        { warehouse: '北京顺义仓', inbound: 6230, outbound: 5980, stock: 28950, util: 65 },
        { warehouse: '成都龙泉仓', inbound: 4520, outbound: 4120, stock: 18650, util: 58 }
      ]
    }
  }
}

const currentKpis = computed(() => kpiConfig[currentDomain.value].kpis)
const trendMetric = ref('orders')
watch(currentDomain, (v) => { trendMetric.value = kpiConfig[v].trendMetric })

// ===== 详情列表 =====
const detailKw = ref('')
const detailColumns = computed(() => kpiConfig[currentDomain.value].detail.columns)
const detailRows = computed(() => kpiConfig[currentDomain.value].detail.rows)
const filteredDetails = computed(() => {
  if (!detailKw.value) return detailRows.value
  return detailRows.value.filter(r => Object.values(r).some(v => String(v).includes(detailKw.value)))
})

// ===== 异常预警 =====
const alerts = ref([
  { metric: '华中大区销售额', current: '¥1.89万', threshold: '¥5万', level: '严重', time: '10:32' },
  { metric: '华北大区转化率', current: '1.8%', threshold: '3%', level: '高', time: '10:15' },
  { metric: '订单支付成功率', current: '92.5%', threshold: '95%', level: '高', time: '09:58' },
  { metric: '上海仓利用率', current: '85%', threshold: '80%', level: '中', time: '09:30' },
  { metric: '客服平均响应', current: '156s', threshold: '60s', level: '中', time: '08:45' }
])

// ===== 图表 =====
const trendChartRef = ref(null)
const funnelChartRef = ref(null)
const topChartRef = ref(null)
const regionChartRef = ref(null)
const targetChartRef = ref(null)
const drillTrendChartRef = ref(null)
const drillPieChartRef = ref(null)
let charts = {}

const funnelTitle = computed(() => ({
  sales: '销售漏斗', finance: '回款漏斗', operation: '用户转化漏斗', supply: '订单履约漏斗'
}[currentDomain.value]))
const funnelSubTitle = computed(() => ({
  sales: '访问→下单→支付→完成', finance: '应收→催收→回款→核销', operation: '曝光→点击→注册→活跃', supply: '下单→拣货→出库→签收'
}[currentDomain.value]))
const topListTitle = computed(() => ({
  sales: '商品销售TOP10', finance: '客户欠款TOP10', operation: '渠道拉新TOP10', supply: '仓库出库TOP10'
}[currentDomain.value]))

const regionDim = ref('region')

// ===== 刷新 =====
const refreshing = ref(false)
async function refreshAll() {
  refreshing.value = true
  await new Promise(r => setTimeout(r, 600))
  await nextTick()
  initCharts()
  refreshing.value = false
}

// ===== 初始化图表 =====
async function initCharts() {
  if (trendChartRef.value) renderTrend()
  if (funnelChartRef.value) renderFunnel()
  if (topChartRef.value) renderTop()
  if (regionChartRef.value) renderRegion()
  if (targetChartRef.value) renderTarget()
}

function renderTrend() {
  if (!charts.trend) charts.trend = echarts.init(trendChartRef.value)
  const days = 30
  const xData = Array.from({ length: days }, (_, i) => dayjs().subtract(days - i - 1, 'day').format('MM-DD'))
  const current = xData.map(() => Math.floor(Math.random() * 1000) + 500)
  const compare = xData.map(() => Math.floor(Math.random() * 900) + 450)
  const kpi = currentKpis.value.find(k => k.key === trendMetric.value)
  charts.trend.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['本期', compareText.value], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: xData, boundaryGap: false, axisLine: { lineStyle: { color: '#d9d9d9' } } },
    yAxis: { type: 'value' },
    series: [
      {
        name: '本期', type: 'line', smooth: true, data: current,
        lineStyle: { width: 3, color: '#1890ff' }, itemStyle: { color: '#1890ff' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24,144,255,0.35)' },
          { offset: 1, color: 'rgba(24,144,255,0.02)' }
        ]) }
      },
      {
        name: compareText.value, type: 'line', smooth: true, data: compare,
        lineStyle: { width: 2, color: '#bfbfbf', type: 'dashed' }, itemStyle: { color: '#bfbfbf' }
      }
    ]
  }, true)
}

function renderFunnel() {
  if (!charts.funnel) charts.funnel = echarts.init(funnelChartRef.value)
  const data = {
    sales: [{ name: '访问', value: 28600 }, { name: '下单', value: 8560 }, { name: '支付', value: 5230 }, { name: '完成', value: 4820 }],
    finance: [{ name: '应收', value: 1856 }, { name: '催收', value: 1280 }, { name: '回款', value: 1056 }, { name: '核销', value: 980 }],
    operation: [{ name: '曝光', value: 1280000 }, { name: '点击', value: 85600 }, { name: '注册', value: 12800 }, { name: '活跃', value: 8560 }],
    supply: [{ name: '下单', value: 8560 }, { name: '拣货', value: 8520 }, { name: '出库', value: 8480 }, { name: '签收', value: 8230 }]
  }[currentDomain.value]
  charts.funnel.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'funnel',
      left: '10%', right: '10%', top: 20, bottom: 20,
      sort: 'descending', gap: 2,
      label: { show: true, position: 'inside', formatter: '{b}\n{c}' },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data: data.map((d, i) => ({ ...d, itemStyle: { color: ['#1890ff', '#36cfc9', '#52c41a', '#faad14'][i] } }))
    }]
  }, true)
}

function renderTop() {
  if (!charts.top) charts.top = echarts.init(topChartRef.value)
  const lists = {
    sales: { names: ['智能手机Pro', '无线耳机X3', '平板Air', '机械键盘K1', '4K显示器', '蓝牙音箱S2', '智能手表W5', '游戏手柄G1', '充电宝', '数据线套装'], values: [856, 743, 621, 580, 524, 486, 432, 398, 356, 312] },
    finance: { names: ['客户A-华东大客户', '客户B-华南连锁', '客户C-华北政府', '客户D-华中制造', '客户E-西南分销', '客户F-西北', '客户G-东北', '客户H-华东', '客户I-华南', '客户J-华北'], values: [186, 152, 128, 98, 85, 72, 65, 58, 52, 45] },
    operation: { names: ['抖音广告', '百度SEM', '微信朋友圈', '小红书种草', '知乎问答', 'B站UP主', 'KOL直播', '信息流', '应用商店', '自然搜索'], values: [42800, 28560, 18650, 12380, 8520, 6280, 5860, 4520, 3850, 3520] },
    supply: { names: ['上海中心仓', '广州南沙仓', '北京顺义仓', '成都龙泉仓', '武汉江夏仓', '杭州萧山仓', '南京六合仓', '西安经开仓', '重庆西永仓', '苏州相城仓'], values: [11560, 7820, 5980, 4120, 3850, 3520, 2850, 2350, 1980, 1620] }
  }[currentDomain.value]
  charts.top.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: lists.names.slice().reverse() },
    series: [{
      type: 'bar',
      data: lists.values.slice().reverse(),
      barWidth: 14,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#1890ff' }, { offset: 1, color: '#36cfc9' }
      ]) },
      label: { show: true, position: 'right', fontSize: 11, color: '#666' }
    }]
  }, true)
}

function renderRegion() {
  if (!charts.region) charts.region = echarts.init(regionChartRef.value)
  const data = {
    region: [{ name: '华东', value: 142800, color: '#1890ff' }, { name: '华南', value: 78320, color: '#52c41a' }, { name: '华北', value: 51800, color: '#faad14' }, { name: '华中', value: 18900, color: '#f5222d' }, { name: '西南', value: 9450, color: '#722ed1' }, { name: '西北', value: 6280, color: '#13c2c2' }, { name: '东北', value: 4520, color: '#fa8c16' }],
    dept: [{ name: '销售部', value: 156800, color: '#1890ff' }, { name: '市场部', value: 89500, color: '#52c41a' }, { name: '运营部', value: 56200, color: '#faad14' }, { name: '财务部', value: 32600, color: '#722ed1' }, { name: '客服部', value: 18800, color: '#13c2c2' }],
    channel: [{ name: '线上直营', value: 128600, color: '#1890ff' }, { name: '第三方平台', value: 96500, color: '#52c41a' }, { name: '线下门店', value: 56200, color: '#faad14' }, { name: 'O2O', value: 28500, color: '#722ed1' }]
  }[regionDim.value]
  charts.region.setOption({
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', orient: 'vertical', right: '2%', top: 'middle' },
    series: [{
      type: 'pie', radius: ['35%', '65%'], center: ['38%', '50%'], roseType: 'area',
      avoidLabelOverlap: false, label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: data.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
    }]
  }, true)
}

function renderTarget() {
  if (!charts.target) charts.target = echarts.init(targetChartRef.value)
  const kpis = currentKpis.value
  charts.target.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', max: 100 },
    yAxis: { type: 'category', data: kpis.map(k => k.label).reverse() },
    series: [
      {
        name: '完成率', type: 'bar', barWidth: 16,
        data: kpis.map(k => k.targetRate).reverse(),
        itemStyle: {
          color: p => p.value >= 80 ? '#52c41a' : p.value >= 60 ? '#faad14' : '#ff4d4f',
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right', formatter: '{c}%' },
        markLine: { data: [{ xAxis: 100, label: { formatter: '目标' } }] }
      }
    ]
  }, true)
}

// ===== 下钻 =====
const drillVisible = ref(false)
const drillTab = ref('trend')
const drillRow = ref(null)
const drillDetails = ref([])

function drillDown(row) {
  drillRow.value = row
  drillVisible.value = true
  // 生成下钻明细
  drillDetails.value = Array.from({ length: 14 }, (_, i) => ({
    date: dayjs().subtract(13 - i, 'day').format('YYYY-MM-DD'),
    metric: row.region || row.subject || row.channel || row.warehouse || '指标',
    value: Math.floor(Math.random() * 50000) + 10000,
    growth: (Math.random() * 30 - 10).toFixed(1) * 1
  }))
  nextTick(() => {
    setTimeout(() => {
      if (drillTrendChartRef.value) {
        if (!charts.drillTrend) charts.drillTrend = echarts.init(drillTrendChartRef.value)
        charts.drillTrend.setOption({
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', data: drillDetails.value.map(d => d.date.slice(5)) },
          yAxis: { type: 'value' },
          series: [{ type: 'line', smooth: true, data: drillDetails.value.map(d => d.value), areaStyle: { color: 'rgba(24,144,255,0.3)' }, itemStyle: { color: '#1890ff' } }]
        }, true)
      }
      if (drillPieChartRef.value) {
        if (!charts.drillPie) charts.drillPie = echarts.init(drillPieChartRef.value)
        charts.drillPie.setOption({
          tooltip: { trigger: 'item' },
          legend: { bottom: 0 },
          series: [{
            type: 'pie', radius: '60%',
            data: [
              { name: '品类A', value: Math.floor(Math.random() * 30000) + 10000, itemStyle: { color: '#1890ff' } },
              { name: '品类B', value: Math.floor(Math.random() * 30000) + 10000, itemStyle: { color: '#52c41a' } },
              { name: '品类C', value: Math.floor(Math.random() * 30000) + 10000, itemStyle: { color: '#faad14' } },
              { name: '品类D', value: Math.floor(Math.random() * 30000) + 10000, itemStyle: { color: '#722ed1' } }
            ]
          }]
        }, true)
      }
    }, 100)
  })
}

function exportDetail() {
  ElMessage.success('已提交导出任务，可在"导出中心"查看进度')
}

// ===== 全屏 =====
function toggleFullscreen() {
  if (!document.fullscreenElement) document.document.documentElement.requestFullscreen()
  else document.exitFullscreen()
}

// ===== 自适应 =====
function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

onMounted(async () => {
  await nextTick()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(charts).forEach(c => c?.dispose())
})
</script>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 16px; }
.top-bar { border-radius: 8px; padding: 0; }
.top-bar :deep(.el-card__body) { padding: 12px 20px; }
.top-bar-content { display: flex; justify-content: space-between; align-items: center; }
.domain-tabs { display: flex; gap: 4px; }
.domain-tab { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; color: #595959; }
.domain-tab:hover { background: #f5f5f5; }
.domain-tab.active { background: linear-gradient(135deg, #e6f7ff, #bae7ff); color: #1890ff; font-weight: 600; }
.tab-sub { font-size: 11px; color: #8c8c8c; }
.domain-tab.active .tab-sub { color: #1890ff; }
.top-right { display: flex; align-items: center; }
.action-icon { font-size: 18px; cursor: pointer; color: #666; padding: 4px; }
.action-icon:hover { color: #1890ff; }

.kpi-card { border-radius: 8px; }
.kpi-content { display: flex; justify-content: space-between; align-items: center; }
.kpi-label { font-size: 13px; color: #8c8c8c; }
.kpi-value { font-size: 24px; font-weight: 700; color: #262626; margin: 6px 0; font-variant-numeric: tabular-nums; display: flex; align-items: baseline; }
.kpi-prefix { font-size: 14px; font-weight: 400; margin-right: 2px; color: #262626; }
.kpi-num { font-size: 24px; }
.kpi-unit { font-size: 12px; font-weight: 400; color: #8c8c8c; margin-left: 4px; }
.kpi-footer { display: flex; align-items: center; gap: 6px; font-size: 12px; flex-wrap: wrap; }
.kpi-trend { display: flex; align-items: center; gap: 2px; font-weight: 600; }
.kpi-trend.up { color: #52c41a; }
.kpi-trend.down { color: #ff4d4f; }
.kpi-compare { color: #bfbfbf; }
.kpi-target { color: #1890ff; font-weight: 600; }
.kpi-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.chart-card, .chart-row .el-card { border-radius: 8px; }
.chart-container { height: 300px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
</style>
