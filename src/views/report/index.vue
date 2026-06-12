<template>
  <div class="report-page">
    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="周报周期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已生成" value="generated" />
            <el-option label="已发送" value="sent" />
            <el-option label="生成中" value="generating" />
            <el-option label="发送失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchList">查询</el-button>
          <el-button :icon="RefreshIcon" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">周报列表</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Plus" @click="showGenerateDialog">手动生成周报</el-button>
            <el-button :icon="Setting" @click="showRecipientsDialog">收件人配置</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="reportList"
        stripe
        highlight-current-row
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
        v-loading="loading"
      >
        <el-table-column prop="reportNo" label="周报编号" width="160" />
        <el-table-column prop="weekRange" label="统计周期" width="220">
          <template #default="{ row }">
            {{ row.startDate }} ~ {{ row.endDate }}
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="订单总量" width="100" align="center" />
        <el-table-column prop="totalRevenue" label="销售总额(¥)" width="140" align="right">
          <template #default="{ row }">
            {{ Number(row.totalRevenue).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="newUsers" label="新增用户" width="100" align="center" />
        <el-table-column prop="growthRate" label="环比增长" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.growthRate >= 0 ? '#52c41a' : '#ff4d4f' }">
              {{ row.growthRate >= 0 ? '+' : '' }}{{ row.growthRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="reportStatusType(row.status)" size="small" round>{{ reportStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="generateTime" label="生成时间" width="170" />
        <el-table-column prop="sendTime" label="发送时间" width="170" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="View" @click="previewReport(row)">预览</el-button>
            <el-button link type="primary" size="small" :icon="Promotion" @click="sendReport(row)">发送</el-button>
            <el-button link type="primary" size="small" :icon="Download" @click="downloadReport(row)">下载</el-button>
            <el-popconfirm title="确定删除该周报？" @confirm="deleteReport(row)">
              <template #reference>
                <el-button link type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 手动生成周报弹窗 -->
    <el-dialog v-model="generateVisible" title="手动生成周报" width="500px" destroy-on-close>
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="统计周期" required>
          <el-date-picker
            v-model="generateForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="包含模块">
          <el-checkbox-group v-model="generateForm.modules">
            <el-checkbox value="orderTrend">订单趋势分析</el-checkbox>
            <el-checkbox value="salesRanking">销量排行</el-checkbox>
            <el-checkbox value="regionDist">区域分布</el-checkbox>
            <el-checkbox value="userGrowth">用户增长</el-checkbox>
            <el-checkbox value="revenueAnalysis">营收分析</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="自动发送">
          <el-switch v-model="generateForm.autoSend" active-text="生成后自动发送邮件" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">生成周报</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="周报预览" width="80%" top="5vh" destroy-on-close>
      <div class="preview-container">
        <div class="preview-header">
          <h2>{{ previewData.title }}</h2>
          <p>统计周期：{{ previewData.weekRange }}</p>
        </div>
        <el-divider />
        <el-row :gutter="16" class="preview-kpi">
          <el-col :span="6" v-for="kpi in previewData.kpis" :key="kpi.label">
            <div class="preview-kpi-item">
              <span class="preview-kpi-label">{{ kpi.label }}</span>
              <span class="preview-kpi-value">{{ kpi.value }}</span>
            </div>
          </el-col>
        </el-row>
        <el-divider />
        <div ref="previewChartRef" style="height: 300px"></div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Promotion" @click="sendReport(previewData)">发送邮件</el-button>
      </template>
    </el-dialog>

    <!-- 收件人配置弹窗 -->
    <el-dialog v-model="recipientsVisible" title="收件人配置" width="600px" destroy-on-close>
      <el-form :model="recipientsForm" label-width="100px">
        <el-form-item label="收件人列表">
          <el-tag
            v-for="(email, idx) in recipientsForm.emails"
            :key="idx"
            closable
            @close="recipientsForm.emails.splice(idx, 1)"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ email }}
          </el-tag>
          <div style="display: flex; gap: 8px; margin-top: 8px">
            <el-input v-model="newEmail" placeholder="输入邮箱地址" style="flex: 1" />
            <el-button type="primary" @click="addEmail">添加</el-button>
          </div>
        </el-form-item>
        <el-form-item label="发送时间">
          <el-time-picker v-model="recipientsForm.sendTime" format="HH:mm" placeholder="默认每周一 00:00" />
          <span style="margin-left: 12px; color: #999; font-size: 12px">XXL-JOB 定时任务自动执行</span>
        </el-form-item>
        <el-form-item label="邮件主题">
          <el-input v-model="recipientsForm.subject" placeholder="【BI周报】{weekRange} 销售情况周报" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recipientsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRecipients">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { reportApi } from '@/api'
import { Search, Refresh as RefreshIcon, Plus, Setting, View, Promotion, Download, Delete } from '@element-plus/icons-vue'

// ===== 列表 =====
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(56)
const searchForm = reactive({ dateRange: null, status: '' })

const reportList = ref([
  { reportNo: 'WR20260608', startDate: '2026-06-01', endDate: '2026-06-07', totalOrders: 24580, totalRevenue: 1856400, newUsers: 3260, growthRate: 12.5, status: 'sent', generateTime: '2026-06-08 00:00:15', sendTime: '2026-06-08 00:01:32' },
  { reportNo: 'WR20260601', startDate: '2026-05-25', endDate: '2026-05-31', totalOrders: 21850, totalRevenue: 1652300, newUsers: 2890, growthRate: -3.2, status: 'sent', generateTime: '2026-06-01 00:00:12', sendTime: '2026-06-01 00:01:28' },
  { reportNo: 'WR20260525', startDate: '2026-05-18', endDate: '2026-05-24', totalOrders: 22570, totalRevenue: 1705800, newUsers: 3120, growthRate: 8.7, status: 'sent', generateTime: '2026-05-25 00:00:10', sendTime: '2026-05-25 00:01:25' },
  { reportNo: 'WR20260518', startDate: '2026-05-11', endDate: '2026-05-17', totalOrders: 20760, totalRevenue: 1568200, newUsers: 2750, growthRate: 5.1, status: 'sent', generateTime: '2026-05-18 00:00:08', sendTime: '2026-05-18 00:01:20' },
  { reportNo: 'WR20260612', startDate: '2026-06-08', endDate: '2026-06-14', totalOrders: 0, totalRevenue: 0, newUsers: 0, growthRate: 0, status: 'generating', generateTime: '', sendTime: '' }
])

function reportStatusType(s) { return { sent: 'success', generated: 'warning', generating: 'info', failed: 'danger' }[s] || 'info' }
function reportStatusText(s) { return { sent: '已发送', generated: '已生成', generating: '生成中', failed: '发送失败' }[s] || s }

function fetchList() {
  loading.value = true
  // 调用接口: GET /api/report/weekly/list?page=1&size=10&startDate=&endDate=&status=
  setTimeout(() => { loading.value = false }, 500)
}

function resetSearch() {
  searchForm.dateRange = null
  searchForm.status = ''
  fetchList()
}

// ===== 生成周报 =====
const generateVisible = ref(false)
const generating = ref(false)
const generateForm = reactive({ dateRange: null, modules: ['orderTrend', 'salesRanking', 'regionDist'], autoSend: true })

function showGenerateDialog() { generateVisible.value = true }

async function handleGenerate() {
  if (!generateForm.dateRange) { ElMessage.warning('请选择统计周期'); return }
  generating.value = true
  // 调用接口: POST /api/report/weekly/generate
  setTimeout(() => {
    generating.value = false
    generateVisible.value = false
    ElMessage.success('周报生成任务已提交，XXL-JOB 将自动聚合数据并生成')
    fetchList()
  }, 1000)
}

// ===== 预览 =====
const previewVisible = ref(false)
const previewChartRef = ref(null)
const previewData = reactive({
  title: '销售情况周报',
  weekRange: '2026-06-01 ~ 2026-06-07',
  kpis: [
    { label: '订单总量', value: '24,580' },
    { label: '销售总额', value: '¥1,856,400' },
    { label: '新增用户', value: '3,260' },
    { label: '环比增长', value: '+12.5%' }
  ]
})

async function previewReport(row) {
  previewData.title = `销售情况周报（${row.reportNo}）`
  previewData.weekRange = `${row.startDate} ~ ${row.endDate}`
  previewVisible.value = true
  // 调用接口: GET /api/report/weekly/preview/:id
  await nextTick()
  if (previewChartRef.value) {
    const chart = echarts.init(previewChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
      yAxis: { type: 'value', name: '订单量' },
      series: [
        { name: '订单量', type: 'line', smooth: true, data: [3200, 3800, 3500, 4100, 3900, 2800, 3280], areaStyle: { color: 'rgba(24,144,255,0.15)' }, lineStyle: { color: '#1890ff' }, itemStyle: { color: '#1890ff' } },
        { name: '销售额(百)', type: 'bar', data: [240, 285, 263, 308, 293, 210, 246], itemStyle: { color: 'rgba(24,144,255,0.3)', borderRadius: [4, 4, 0, 0] } }
      ],
      legend: { data: ['订单量', '销售额(百)'] },
      grid: { left: '3%', right: '4%', containLabel: true }
    })
  }
}

function sendReport(row) {
  // 调用接口: POST /api/report/weekly/send/:id
  ElMessage.success('邮件发送任务已提交，FreeMarker 模板渲染后将推送至收件人邮箱')
}

function downloadReport(row) {
  // 调用接口: GET /api/report/weekly/:id 下载 HTML 文件
  ElMessage.info('周报文件下载中...')
}

async function deleteReport(row) {
  // 调用接口: DELETE /api/report/weekly/:id
  ElMessage.success('删除成功')
  fetchList()
}

// ===== 收件人配置 =====
const recipientsVisible = ref(false)
const newEmail = ref('')
const recipientsForm = reactive({
  emails: ['ceo@company.com', 'cto@company.com', 'market.director@company.com', 'finance.vp@company.com'],
  sendTime: null,
  subject: '【BI周报】{weekRange} 销售情况周报'
})

function showRecipientsDialog() { recipientsVisible.value = true }

function addEmail() {
  const email = newEmail.value.trim()
  if (!email) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ElMessage.warning('邮箱格式不正确'); return }
  recipientsForm.emails.push(email)
  newEmail.value = ''
}

function saveRecipients() {
  // 调用接口: PUT /api/report/weekly/recipients
  ElMessage.success('收件人配置已保存')
  recipientsVisible.value = false
}
</script>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 16px; }
.search-card { border-radius: 8px; }
.table-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.header-actions { display: flex; gap: 8px; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }

.preview-container { padding: 20px; }
.preview-header { text-align: center; }
.preview-header h2 { margin: 0 0 8px; color: #262626; }
.preview-header p { color: #8c8c8c; margin: 0; }
.preview-kpi { margin: 20px 0; }
.preview-kpi-item { text-align: center; padding: 16px; background: #f5f5f5; border-radius: 8px; }
.preview-kpi-label { display: block; font-size: 13px; color: #8c8c8c; margin-bottom: 8px; }
.preview-kpi-value { display: block; font-size: 24px; font-weight: 700; color: #1890ff; }
</style>
