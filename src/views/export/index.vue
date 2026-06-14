<template>
  <div class="export-page">
    <!-- 顶部统计 -->
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6" v-for="(s, i) in stats" :key="i">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div>
              <div class="stat-label">{{ s.label }}</div>
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-sub" v-if="s.sub">{{ s.sub }}</div>
            </div>
            <el-icon :size="32" :color="s.color"><component :is="s.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tabs：任务/订阅/发送历史/收件人 -->
    <el-card shadow="never" class="tab-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane name="task" label="导出任务">
          <!-- 创建任务 -->
          <el-form :model="exportForm" label-width="100px" inline>
            <el-form-item label="数据类型" required>
              <el-select v-model="exportForm.dataType" placeholder="请选择" style="width: 200px">
                <el-option v-for="d in dataTypeOptions" :key="d.value" :label="d.label" :value="d.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围" required>
              <el-date-picker v-model="exportForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 280px" />
            </el-form-item>
            <el-form-item label="文件格式">
              <el-radio-group v-model="exportForm.fileFormat">
                <el-radio-button value="xlsx">Excel</el-radio-button>
                <el-radio-button value="csv">CSV</el-radio-button>
                <el-radio-button value="pdf">PDF</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="筛选条件">
              <el-input v-model="exportForm.filter" placeholder="可选：如地区=华东" style="width: 240px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Upload" @click="createTask" :loading="creating">提交导出任务</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane name="subscribe" label="订阅计划">
          <div class="sub-toolbar">
            <el-button type="primary" :icon="Plus" @click="showSubDialog()">新建订阅</el-button>
            <el-button :icon="Refresh" @click="loadSubscribes">刷新</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane name="history" label="发送历史">
          <div class="history-toolbar">
            <el-select v-model="historyChannel" placeholder="全部渠道" clearable size="small" style="width: 140px">
              <el-option label="邮件" value="email" />
              <el-option label="钉钉" value="dingtalk" />
              <el-option label="企业微信" value="wechat" />
              <el-option label="飞书" value="feishu" />
            </el-select>
            <el-date-picker v-model="historyDate" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" size="small" style="width: 280px" />
            <el-input v-model="historyKw" placeholder="搜索报表/收件人" size="small" :prefix-icon="Search" clearable style="width: 200px" />
          </div>
        </el-tab-pane>
        <el-tab-pane name="receivers" label="收件人组">
          <div class="sub-toolbar">
            <el-button type="primary" :icon="Plus" @click="showReceiverDialog()">新建收件人组</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 导出任务列表 -->
    <el-card v-if="activeTab === 'task'" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">导出任务列表</span>
          <el-radio-group v-model="taskFilter" size="small" @change="loadTasks">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="pending">排队中</el-radio-button>
            <el-radio-button value="processing">导出中</el-radio-button>
            <el-radio-button value="completed">已完成</el-radio-button>
            <el-radio-button value="failed">失败</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="taskList" stripe v-loading="listLoading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="taskId" label="任务ID" width="200" />
        <el-table-column prop="dataTypeLabel" label="数据类型" width="150" />
        <el-table-column label="数据范围" width="220">
          <template #default="{ row }">{{ row.startDate }} ~ {{ row.endDate }}</template>
        </el-table-column>
        <el-table-column prop="fileFormat" label="格式" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.fileFormat.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dataCount" label="数据量" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.dataCount">{{ Number(row.dataCount).toLocaleString() }} 条</span>
            <span v-else style="color: #999">统计中</span>
          </template>
        </el-table-column>
        <el-table-column prop="fileSize" label="文件大小" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.fileSize">{{ formatFileSize(row.fileSize) }}</span>
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="160">
          <template #default="{ row }">
            <el-progress :percentage="row.progress || 0" :status="taskProgressStatus(row.status)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="taskStatusType(row.status)" size="small" round>{{ taskStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button v-if="row.status === 'completed'" link type="primary" size="small" :icon="Download" @click="downloadFile(row)">下载</el-button>
            <el-button v-if="row.status === 'pending' || row.status === 'processing'" link type="warning" size="small" :icon="Close" @click="cancelTask(row)">取消</el-button>
            <el-button link type="success" size="small" :icon="Promotion" @click="shareFile(row)">分享</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteTask(row)">
              <template #reference>
                <el-button link type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 订阅计划列表 -->
    <el-card v-if="activeTab === 'subscribe'" shadow="never">
      <el-table :data="subscribeList" stripe v-loading="subLoading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="name" label="订阅名称" min-width="180" />
        <el-table-column prop="reportName" label="关联报表" min-width="200" />
        <el-table-column prop="cronText" label="推送周期" width="200" />
        <el-table-column label="推送渠道" width="220">
          <template #default="{ row }">
            <el-tag v-for="c in row.channels" :key="c" size="small" :type="channelTagType(c)" effect="plain" style="margin-right: 4px">
              <el-icon style="vertical-align: middle"><component :is="channelIcon(c)" /></el-icon>
              {{ channelLabel(c) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receivers" label="收件人" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="r in row.receivers.slice(0, 2)" :key="r" size="small" style="margin-right: 4px">{{ r }}</el-tag>
            <el-tag v-if="row.receivers.length > 2" size="small" type="info">+{{ row.receivers.length - 2 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastRun" label="最近执行" width="160" />
        <el-table-column prop="nextRun" label="下次执行" width="160" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.status" active-value="running" inactive-value="paused" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="View">日志</el-button>
            <el-button link type="primary" size="small" :icon="Edit" @click="showSubDialog(row)">编辑</el-button>
            <el-button link type="warning" size="small" :icon="VideoPlay" @click="runNow(row)">立即执行</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteSub(row)">
              <template #reference>
                <el-button link type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 发送历史 -->
    <el-card v-if="activeTab === 'history'" shadow="never">
      <el-table :data="historyList" stripe v-loading="historyLoading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="sendTime" label="发送时间" width="170" />
        <el-table-column prop="reportName" label="报表" min-width="200" />
        <el-table-column label="渠道" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="channelTagType(row.channel)">
              <el-icon><component :is="channelIcon(row.channel)" /></el-icon>
              {{ channelLabel(row.channel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receivers" label="收件人" min-width="180" />
        <el-table-column prop="fileSize" label="大小" width="100">
          <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="100" align="right" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="View">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 收件人组 -->
    <el-card v-if="activeTab === 'receivers'" shadow="never">
      <el-table :data="receivers" stripe v-loading="receiverLoading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="name" label="组名" min-width="160" />
        <el-table-column prop="description" label="说明" min-width="240" />
        <el-table-column prop="memberCount" label="成员数" width="100" align="center" />
        <el-table-column prop="createBy" label="创建人" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="User" @click="showReceiverDialog(row)">成员</el-button>
            <el-button link type="primary" size="small" :icon="Edit" @click="showReceiverDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteReceiver(row)">
              <template #reference>
                <el-button link type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑订阅弹窗 -->
    <el-dialog v-model="subDialogVisible" :title="editingSub ? '编辑订阅' : '新建订阅'" width="700px">
      <el-form :model="subForm" :rules="subRules" ref="subFormRef" label-width="100px">
        <el-form-item label="订阅名称" prop="name">
          <el-input v-model="subForm.name" placeholder="如：销售日报推送" />
        </el-form-item>
        <el-form-item label="关联报表" prop="reportId">
          <el-select v-model="subForm.reportId" placeholder="选择要推送的报表" filterable style="width: 100%">
            <el-option v-for="r in reportOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="推送周期" prop="cron">
          <el-select v-model="subForm.cron" style="width: 100%">
            <el-option label="每天 09:00" value="0 0 9 * * ?" />
            <el-option label="每周一 09:00" value="0 0 9 ? * MON" />
            <el-option label="每月1号 09:00" value="0 0 9 1 * ?" />
            <el-option label="每5分钟（实时）" value="0 */5 * * * ?" />
            <el-option value="custom">自定义 Cron 表达式</el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="subForm.cron === 'custom'" label="Cron 表达式" prop="customCron">
          <el-input v-model="subForm.customCron" placeholder="如：0 30 8 * * ? (每天 8:30)" />
        </el-form-item>
        <el-form-item label="推送渠道" prop="channels">
          <el-checkbox-group v-model="subForm.channels">
            <el-checkbox value="email"><el-icon><Message /></el-icon> 邮件</el-checkbox>
            <el-checkbox value="dingtalk"><el-icon><ChatDotRound /></el-icon> 钉钉</el-checkbox>
            <el-checkbox value="wechat"><el-icon><ChatLineRound /></el-icon> 企业微信</el-checkbox>
            <el-checkbox value="feishu"><el-icon><Promotion /></el-icon> 飞书</el-checkbox>
            <el-checkbox value="sms"><el-icon><Iphone /></el-icon> 短信</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="收件人组" prop="receivers">
          <el-select v-model="subForm.receivers" multiple filterable allow-create placeholder="选择收件人组或手动输入" style="width: 100%">
            <el-option v-for="g in receivers" :key="g.id" :label="g.name" :value="g.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件格式">
          <el-radio-group v-model="subForm.format">
            <el-radio value="pdf">PDF</el-radio>
            <el-radio value="excel">Excel</el-radio>
            <el-radio value="image">图片</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="推送说明">
          <el-input v-model="subForm.remark" type="textarea" :rows="2" placeholder="如：包含昨日销售数据，请知悉" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSubscribe">保存</el-button>
      </template>
    </el-dialog>

    <!-- 收件人组弹窗 -->
    <el-dialog v-model="receiverDialogVisible" :title="editingReceiver ? '编辑收件人组' : '新建收件人组'" width="600px">
      <el-form :model="receiverForm" label-width="100px">
        <el-form-item label="组名">
          <el-input v-model="receiverForm.name" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="receiverForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="成员">
          <el-select v-model="receiverForm.members" multiple filterable style="width: 100%">
            <el-option v-for="u in userOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receiverDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveReceiver">保存</el-button>
      </template>
    </el-dialog>

    <!-- 技术说明 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <span class="card-title">平台架构（异步分发）</span>
      </template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="消息队列">RabbitMQ — 异步解耦导出/推送请求，避免阻塞主线程</el-descriptions-item>
        <el-descriptions-item label="查询方式">MyBatis Cursor — 流式查询逐行拉取，避免 OOM 内存溢出</el-descriptions-item>
        <el-descriptions-item label="写入方式">EasyExcel — 磁盘流式写入，边查边写低内存占用</el-descriptions-item>
        <el-descriptions-item label="定时调度">XXL-JOB — 分布式定时任务调度，推送订阅可靠执行</el-descriptions-item>
        <el-descriptions-item label="渲染引擎">Freemarker + Flying-Saucer — 报表模板渲染为 PDF</el-descriptions-item>
        <el-descriptions-item label="渠道适配">统一推送网关 — 邮件/钉钉/企微/飞书/短信统一封装</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Upload, Refresh, Download, Delete, Close, Plus, View, Edit, VideoPlay, Search, Promotion,
  Message, ChatDotRound, ChatLineRound, Iphone, User,
  DataLine, Promotion as PromotionIcon
} from '@element-plus/icons-vue'

// ===== 统计 =====
const stats = [
  { label: '本月推送', value: '1,286', sub: '环比 +12%', icon: 'Promotion', color: '#1890ff' },
  { label: '订阅计划', value: '32', sub: '运行中 28', icon: 'VideoPlay', color: '#52c41a' },
  { label: '收件人组', value: '15', sub: '覆盖 280 人', icon: 'User', color: '#722ed1' },
  { label: '失败率', value: '0.8%', sub: '近30天', icon: 'DataLine', color: '#fa8c16' }
]

// ===== Tabs =====
const activeTab = ref('task')

// ===== 导出任务 =====
const creating = ref(false)
const exportForm = reactive({ dataType: 'order_detail', dateRange: null, fileFormat: 'xlsx', filter: '' })
const dataTypeOptions = [
  { value: 'order_detail', label: '订单明细数据' },
  { value: 'user_behavior', label: '用户行为埋点' },
  { value: 'sales_stats', label: '销售统计' },
  { value: 'user_profile', label: '用户画像' },
  { value: 'audit_log', label: '审计日志' },
  { value: 'finance_data', label: '财务数据' },
  { value: 'inventory', label: '库存数据' }
]

const listLoading = ref(false)
const taskFilter = ref('')
const taskList = ref([
  { taskId: 'EXP20260614001', dataType: 'order_detail', dataTypeLabel: '订单明细数据', startDate: '2026-05-01', endDate: '2026-05-31', fileFormat: 'xlsx', dataCount: 1256800, fileSize: 85600000, progress: 100, status: 'completed', createTime: '2026-06-14 10:30:15', completeTime: '2026-06-14 10:35:42' },
  { taskId: 'EXP20260614002', dataType: 'user_behavior', dataTypeLabel: '用户行为埋点', startDate: '2026-06-01', endDate: '2026-06-14', fileFormat: 'xlsx', dataCount: 45600, fileSize: 0, progress: 67, status: 'processing', createTime: '2026-06-14 11:15:30', completeTime: '' },
  { taskId: 'EXP20260614003', dataType: 'user_profile', dataTypeLabel: '用户画像', startDate: '2026-01-01', endDate: '2026-06-14', fileFormat: 'csv', dataCount: 0, fileSize: 0, progress: 0, status: 'pending', createTime: '2026-06-14 11:20:08', completeTime: '' },
  { taskId: 'EXP20260613004', dataType: 'sales_stats', dataTypeLabel: '销售统计', startDate: '2026-05-01', endDate: '2026-05-31', fileFormat: 'xlsx', dataCount: 8920, fileSize: 1250000, progress: 100, status: 'completed', createTime: '2026-06-13 14:20:15', completeTime: '2026-06-13 14:20:38' },
  { taskId: 'EXP20260613005', dataType: 'audit_log', dataTypeLabel: '审计日志', startDate: '2026-06-01', endDate: '2026-06-13', fileFormat: 'xlsx', dataCount: 0, fileSize: 0, progress: 35, status: 'failed', createTime: '2026-06-13 16:05:22', completeTime: '' }
])

function taskStatusType(s) { return { completed: 'success', processing: 'primary', pending: 'info', failed: 'danger', cancelled: 'warning' }[s] || 'info' }
function taskStatusText(s) { return { completed: '已完成', processing: '导出中', pending: '排队中', failed: '失败', cancelled: '已取消' }[s] || s }
function taskProgressStatus(s) { return s === 'completed' ? 'success' : s === 'failed' ? 'exception' : '' }

function createTask() {
  if (!exportForm.dateRange) { ElMessage.warning('请选择时间范围'); return }
  creating.value = true
  setTimeout(() => {
    creating.value = false
    ElMessage.success('导出任务已提交至 RabbitMQ 队列，将通过流式查询 + 边写边出完成')
    loadTasks()
  }, 1000)
}
function resetForm() { exportForm.dataType = 'order_detail'; exportForm.dateRange = null; exportForm.fileFormat = 'xlsx'; exportForm.filter = '' }
function loadTasks() {}
function downloadFile(row) { ElMessage.success('文件下载中...') }
function cancelTask(row) { row.status = 'cancelled'; ElMessage.success('任务已取消') }
function deleteTask(row) { taskList.value = taskList.value.filter(t => t.taskId !== row.taskId); ElMessage.success('已删除') }
function shareFile(row) { ElMessage.success('分享链接已复制到剪贴板') }
function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

// ===== 订阅 =====
const subLoading = ref(false)
const subDialogVisible = ref(false)
const editingSub = ref(false)
const subFormRef = ref(null)
const subForm = reactive({ id: null, name: '', reportId: null, cron: '0 0 9 * * ?', customCron: '', channels: ['email'], receivers: [], format: 'pdf', remark: '' })
const subRules = {
  name: [{ required: true, message: '请输入订阅名称', trigger: 'blur' }],
  reportId: [{ required: true, message: '请选择报表', trigger: 'change' }],
  channels: [{ type: 'array', required: true, min: 1, message: '至少选择一个渠道', trigger: 'change' }],
  receivers: [{ type: 'array', required: true, min: 1, message: '至少选择/输入一个收件人', trigger: 'change' }]
}

const reportOptions = ref([
  { id: 1, name: '销售业绩月报' },
  { id: 2, name: '利润分析表' },
  { id: 3, name: '运营日报' },
  { id: 4, name: '人力成本分析' },
  { id: 5, name: '库存周转分析' },
  { id: 6, name: '商品销售排行榜' }
])

const subscribeList = ref([
  { id: 1, name: '销售日报推送', reportName: '销售业绩月报', cron: '0 0 9 * * ?', cronText: '每天 09:00', channels: ['email', 'dingtalk'], receivers: ['销售部全体', '市场部全体'], lastRun: '2026-06-14 09:00:00', nextRun: '2026-06-15 09:00:00', status: 'running' },
  { id: 2, name: '财务周报', reportName: '利润分析表', cron: '0 0 9 ? * MON', cronText: '每周一 09:00', channels: ['email'], receivers: ['财务总监', 'CEO'], lastRun: '2026-06-09 09:00:00', nextRun: '2026-06-16 09:00:00', status: 'running' },
  { id: 3, name: '运营日报-渠道', reportName: '渠道效果对比', cron: '0 0 8 * * ?', cronText: '每天 08:00', channels: ['dingtalk', 'wechat'], receivers: ['运营部全体'], lastRun: '2026-06-14 08:00:00', nextRun: '2026-06-15 08:00:00', status: 'running' },
  { id: 4, name: '库存预警', reportName: '库存周转分析', cron: '0 0 7 * * ?', cronText: '每天 07:00', channels: ['feishu'], receivers: ['供应链总监'], lastRun: '2026-06-14 07:00:00', nextRun: '2026-06-15 07:00:00', status: 'paused' }
])

function showSubDialog(row) {
  editingSub.value = !!row
  if (row) Object.assign(subForm, row)
  else Object.assign(subForm, { id: null, name: '', reportId: null, cron: '0 0 9 * * ?', customCron: '', channels: ['email'], receivers: [], format: 'pdf', remark: '' })
  subDialogVisible.value = true
}
async function saveSubscribe() {
  const valid = await subFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editingSub.value) {
    const idx = subscribeList.value.findIndex(s => s.id === subForm.id)
    subscribeList.value[idx] = { ...subscribeList.value[idx], ...subForm }
  } else {
    subscribeList.value.unshift({ ...subForm, id: Date.now(), cronText: cronToText(subForm.cron === 'custom' ? subForm.customCron : subForm.cron), reportName: reportOptions.value.find(r => r.id === subForm.reportId)?.name || '', lastRun: '尚未执行', nextRun: '按计划执行', status: 'running' })
  }
  ElMessage.success('订阅保存成功')
  subDialogVisible.value = false
}
function deleteSub(row) { subscribeList.value = subscribeList.value.filter(s => s.id !== row.id); ElMessage.success('已删除') }
function runNow(row) { ElMessage.success('已触发立即执行') }
function loadSubscribes() {}
function cronToText(c) {
  const map = { '0 0 9 * * ?': '每天 09:00', '0 0 9 ? * MON': '每周一 09:00', '0 0 9 1 * ?': '每月1号 09:00', '0 */5 * * * ?': '每5分钟' }
  return map[c] || c
}

// ===== 发送历史 =====
const historyLoading = ref(false)
const historyChannel = ref('')
const historyDate = ref(null)
const historyKw = ref('')
const historyList = ref([
  { sendTime: '2026-06-14 09:00:32', reportName: '销售业绩月报', channel: 'email', receivers: '销售部全体 (28人)', fileSize: 1250000, status: 'success', duration: '1.2s' },
  { sendTime: '2026-06-14 09:00:30', reportName: '销售业绩月报', channel: 'dingtalk', receivers: '销售部全体群', fileSize: 1250000, status: 'success', duration: '0.8s' },
  { sendTime: '2026-06-14 08:00:15', reportName: '渠道效果对比', channel: 'wechat', receivers: '运营部全体 (15人)', fileSize: 856000, status: 'success', duration: '0.6s' },
  { sendTime: '2026-06-13 14:20:38', reportName: '销售统计', channel: 'email', receivers: '管理层 (5人)', fileSize: 1250000, status: 'success', duration: '1.5s' },
  { sendTime: '2026-06-13 09:00:42', reportName: '利润分析表', channel: 'email', receivers: '财务总监', fileSize: 0, status: 'failed', duration: '5.2s' }
])

// ===== 收件人组 =====
const receiverLoading = ref(false)
const receiverDialogVisible = ref(false)
const editingReceiver = ref(false)
const receiverForm = reactive({ id: null, name: '', description: '', members: [], createBy: '管理员', createTime: '' })
const userOptions = ref(['张伟', '李娜', '王芳', '陈晨', '赵六', '孙七', '周八', '吴九', '郑十', '财务总监', 'CEO', '运营总监', '销售总监'])
const receivers = ref([
  { id: 1, name: '销售部全体', description: '销售部所有员工', memberCount: 28, createBy: '张伟', createTime: '2026-01-15 10:00:00' },
  { id: 2, name: '财务部', description: '财务部相关人员', memberCount: 12, createBy: '李娜', createTime: '2026-01-15 10:00:00' },
  { id: 3, name: '管理层', description: 'CEO/CTO/CFO 等高管', memberCount: 8, createBy: '管理员', createTime: '2026-01-15 10:00:00' },
  { id: 4, name: '运营部', description: '运营团队', memberCount: 15, createBy: '王芳', createTime: '2026-01-15 10:00:00' },
  { id: 5, name: '供应链团队', description: '供应链管理人员', memberCount: 10, createBy: '赵六', createTime: '2026-01-15 10:00:00' }
])

function showReceiverDialog(row) {
  editingReceiver.value = !!row
  if (row) Object.assign(receiverForm, row, { members: [] })
  else Object.assign(receiverForm, { id: null, name: '', description: '', members: [], createBy: '管理员', createTime: '' })
  receiverDialogVisible.value = true
}
function saveReceiver() {
  if (!receiverForm.name) { ElMessage.warning('请输入组名'); return }
  if (editingReceiver.value) {
    const idx = receivers.value.findIndex(r => r.id === receiverForm.id)
    receivers.value[idx] = { ...receivers.value[idx], ...receiverForm, memberCount: receiverForm.members.length }
  } else {
    receivers.value.unshift({ ...receiverForm, id: Date.now(), memberCount: receiverForm.members.length, createTime: new Date().toLocaleString() })
  }
  ElMessage.success('收件人组保存成功')
  receiverDialogVisible.value = false
}
function deleteReceiver(row) { receivers.value = receivers.value.filter(r => r.id !== row.id); ElMessage.success('已删除') }

// ===== 渠道辅助 =====
function channelLabel(c) { return { email: '邮件', dingtalk: '钉钉', wechat: '企业微信', feishu: '飞书', sms: '短信' }[c] || c }
function channelIcon(c) { return { email: 'Message', dingtalk: 'ChatDotRound', wechat: 'ChatLineRound', feishu: 'Promotion', sms: 'Iphone' }[c] || 'Message' }
function channelTagType(c) { return { email: '', dingtalk: 'primary', wechat: 'success', feishu: 'warning', sms: 'danger' }[c] || '' }
</script>

<style scoped>
.export-page { display: flex; flex-direction: column; gap: 16px; }
.stat-card { border-radius: 8px; }
.stat-content { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 13px; color: #8c8c8c; }
.stat-value { font-size: 24px; font-weight: 700; color: #262626; margin-top: 6px; }
.stat-sub { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.tab-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.sub-toolbar, .history-toolbar { display: flex; gap: 8px; align-items: center; }
.info-card { border-radius: 8px; }
</style>
