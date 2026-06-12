<template>
  <div class="export-page">
    <!-- 创建导出任务 -->
    <el-card shadow="never" class="task-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">创建导出任务</span>
          <el-tag type="info" effect="plain">支持百万级数据异步导出 · RabbitMQ + EasyExcel</el-tag>
        </div>
      </template>
      <el-form :model="exportForm" label-width="100px" inline>
        <el-form-item label="数据类型" required>
          <el-select v-model="exportForm.dataType" placeholder="请选择" style="width: 200px">
            <el-option label="用户行为埋点数据" value="user_behavior" />
            <el-option label="订单明细数据" value="order_detail" />
            <el-option label="销售统计数据" value="sales_stats" />
            <el-option label="用户画像数据" value="user_profile" />
            <el-option label="操作审计日志" value="audit_log" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围" required>
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="文件格式">
          <el-radio-group v-model="exportForm.fileFormat">
            <el-radio-button value="xlsx">Excel (.xlsx)</el-radio-button>
            <el-radio-button value="csv">CSV (.csv)</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="筛选条件">
          <el-input v-model="exportForm.filter" placeholder="可选：如地区=华东,状态=已完成" style="width: 300px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Upload" @click="createTask" :loading="creating">提交导出任务</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 导出任务列表 -->
    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">导出任务列表</span>
          <div class="header-actions">
            <el-button :icon="RefreshIcon" text @click="fetchTaskList">刷新</el-button>
            <el-radio-group v-model="taskFilter" size="small" @change="fetchTaskList">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="pending">排队中</el-radio-button>
              <el-radio-button value="processing">导出中</el-radio-button>
              <el-radio-button value="completed">已完成</el-radio-button>
              <el-radio-button value="failed">失败</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table
        :data="taskList"
        stripe
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
        v-loading="listLoading"
      >
        <el-table-column prop="taskId" label="任务ID" width="200" />
        <el-table-column prop="dataType" label="数据类型" width="150">
          <template #default="{ row }">{{ dataTypeMap[row.dataType] || row.dataType }}</template>
        </el-table-column>
        <el-table-column prop="dateRange" label="数据范围" width="220">
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
            <el-progress
              :percentage="row.progress || 0"
              :status="taskProgressStatus(row.status)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="taskStatusType(row.status)" size="small" round :effect="row.status === 'processing' ? 'dark' : 'light'">
              {{ taskStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column prop="completeTime" label="完成时间" width="170" />
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'completed'"
              link type="primary" size="small" :icon="Download"
              @click="downloadFile(row)"
            >下载</el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'processing'"
              link type="warning" size="small" :icon="Close"
              @click="cancelTask(row)"
            >取消</el-button>
            <el-popconfirm title="确定删除该任务记录？" @confirm="deleteTask(row)">
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
          :total="taskTotal"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 技术说明 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <span class="card-title">异步导出架构说明</span>
      </template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="消息队列">RabbitMQ — 异步解耦导出请求，避免阻塞主线程</el-descriptions-item>
        <el-descriptions-item label="查询方式">MyBatis Cursor — 流式查询逐行拉取，避免 OOM 内存溢出</el-descriptions-item>
        <el-descriptions-item label="写入方式">EasyExcel — 磁盘流式写入，边查边写低内存占用</el-descriptions-item>
        <el-descriptions-item label="超时策略">异步任务模式彻底规避网关超时，支持百万级数据平滑导出</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { exportApi } from '@/api'
import { Upload, Refresh as RefreshIcon, Download, Delete, Close } from '@element-plus/icons-vue'

// ===== 导出表单 =====
const creating = ref(false)
const exportForm = reactive({ dataType: 'user_behavior', dateRange: null, fileFormat: 'xlsx', filter: '' })
const dataTypeMap = { user_behavior: '用户行为埋点数据', order_detail: '订单明细数据', sales_stats: '销售统计数据', user_profile: '用户画像数据', audit_log: '操作审计日志' }

function createTask() {
  if (!exportForm.dateRange) { ElMessage.warning('请选择时间范围'); return }
  creating.value = true
  // 调用接口: POST /api/export/task/create { dataType, startDate, endDate, fileFormat, filter }
  setTimeout(() => {
    creating.value = false
    ElMessage.success('导出任务已提交至 RabbitMQ 队列，系统将通过 MyBatis Cursor 流式查询 + EasyExcel 边查边写完成导出')
    fetchTaskList()
  }, 1000)
}

// ===== 任务列表 =====
const listLoading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const taskTotal = ref(32)
const taskFilter = ref('')

const taskList = ref([
  { taskId: 'EXP20260612001', dataType: 'user_behavior', startDate: '2026-05-01', endDate: '2026-05-31', fileFormat: 'xlsx', dataCount: 1256800, fileSize: 85600000, progress: 100, status: 'completed', createTime: '2026-06-12 10:30:15', completeTime: '2026-06-12 10:35:42' },
  { taskId: 'EXP20260612002', dataType: 'order_detail', startDate: '2026-06-01', endDate: '2026-06-12', fileFormat: 'xlsx', dataCount: 45600, fileSize: 0, progress: 67, status: 'processing', createTime: '2026-06-12 11:15:30', completeTime: '' },
  { taskId: 'EXP20260612003', dataType: 'user_profile', startDate: '2026-01-01', endDate: '2026-06-12', fileFormat: 'csv', dataCount: 0, fileSize: 0, progress: 0, status: 'pending', createTime: '2026-06-12 11:20:08', completeTime: '' },
  { taskId: 'EXP20260611004', dataType: 'sales_stats', startDate: '2026-05-01', endDate: '2026-05-31', fileFormat: 'xlsx', dataCount: 8920, fileSize: 1250000, progress: 100, status: 'completed', createTime: '2026-06-11 14:20:15', completeTime: '2026-06-11 14:20:38' },
  { taskId: 'EXP20260611005', dataType: 'audit_log', startDate: '2026-06-01', endDate: '2026-06-11', fileFormat: 'xlsx', dataCount: 0, fileSize: 0, progress: 35, status: 'failed', createTime: '2026-06-11 16:05:22', completeTime: '' }
])

function taskStatusType(s) { return { completed: 'success', processing: 'primary', pending: 'info', failed: 'danger', cancelled: 'warning' }[s] || 'info' }
function taskStatusText(s) { return { completed: '已完成', processing: '导出中', pending: '排队中', failed: '失败', cancelled: '已取消' }[s] || s }
function taskProgressStatus(s) { return s === 'completed' ? 'success' : s === 'failed' ? 'exception' : '' }
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function fetchTaskList() {
  listLoading.value = true
  // 调用接口: GET /api/export/task/list?page=1&size=10&status=
  setTimeout(() => { listLoading.value = false }, 500)
}

function downloadFile(row) {
  // 调用接口: GET /api/export/task/download/:taskId (responseType: blob)
  ElMessage.success('文件下载中...')
}

function cancelTask(row) {
  // 调用接口: PUT /api/export/task/cancel/:taskId
  ElMessage.success('任务已取消')
  fetchTaskList()
}

function deleteTask(row) {
  // 调用接口: DELETE /api/export/task/:taskId
  ElMessage.success('已删除')
  fetchTaskList()
}
</script>

<style scoped>
.export-page { display: flex; flex-direction: column; gap: 16px; }
.task-card { border-radius: 8px; }
.list-card { border-radius: 8px; }
.info-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
