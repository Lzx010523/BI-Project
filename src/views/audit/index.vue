<template>
  <div class="audit-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="操作人">
          <el-input v-model="searchForm.operator" placeholder="用户名/姓名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.operationType" placeholder="全部" clearable style="width: 150px">
            <el-option label="数据删除" value="DELETE" />
            <el-option label="权限变更" value="PERMISSION" />
            <el-option label="数据修改" value="UPDATE" />
            <el-option label="数据导入" value="IMPORT" />
            <el-option label="数据导出" value="EXPORT" />
            <el-option label="系统配置" value="CONFIG" />
            <el-option label="用户登录" value="LOGIN" />
            <el-option label="用户登出" value="LOGOUT" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="searchForm.riskLevel" placeholder="全部" clearable style="width: 120px">
            <el-option label="高风险" value="high" />
            <el-option label="中风险" value="medium" />
            <el-option label="低风险" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input v-model="searchForm.ip" placeholder="操作IP" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="操作时间">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchList">查询</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
          <el-button type="success" :icon="Download" @click="exportLog">导出日志</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">操作审计日志</span>
          <el-tag type="info" effect="plain">Spring AOP 全局拦截 · 全链路日志记录</el-tag>
        </div>
      </template>

      <el-table
        :data="logList"
        stripe
        highlight-current-row
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
        v-loading="loading"
        @row-click="showDetail"
        style="cursor: pointer"
      >
        <el-table-column prop="logId" label="日志ID" width="160" />
        <el-table-column prop="operator" label="操作人" width="120">
          <template #default="{ row }">
            <div>
              <span>{{ row.operatorName }}</span>
              <div style="font-size: 11px; color: #999">{{ row.operatorAccount }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="operationType" label="操作类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="opTypeColor(row.operationType)" size="small">{{ opTypeText(row.operationType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="操作模块" width="130" />
        <el-table-column prop="description" label="操作描述" min-width="240" show-overflow-tooltip />
        <el-table-column prop="riskLevel" label="风险等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="riskColor(row.riskLevel)" size="small" round>{{ riskText(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="操作IP" width="140" />
        <el-table-column prop="userAgent" label="客户端" width="130" show-overflow-tooltip />
        <el-table-column prop="duration" label="耗时(ms)" width="90" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.duration > 1000 ? '#f5222d' : '#333' }">{{ row.duration }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-icon :color="row.result === 'success' ? '#52c41a' : '#f5222d'" :size="16">
              <CircleCheck v-if="row.result === 'success'" /><CircleClose v-else />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="operateTime" label="操作时间" width="170" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 日志详情抽屉 -->
    <el-drawer v-model="detailVisible" title="操作日志详情" size="600px" destroy-on-close>
      <template v-if="currentLog">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="日志ID">{{ currentLog.logId }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentLog.operatorName }}（{{ currentLog.operatorAccount }}）</el-descriptions-item>
          <el-descriptions-item label="操作类型">{{ opTypeText(currentLog.operationType) }}</el-descriptions-item>
          <el-descriptions-item label="操作模块">{{ currentLog.module }}</el-descriptions-item>
          <el-descriptions-item label="操作描述" :span="2">{{ currentLog.description }}</el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="riskColor(currentLog.riskLevel)" size="small" round>{{ riskText(currentLog.riskLevel) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行结果">
            <el-tag :type="currentLog.result === 'success' ? 'success' : 'danger'" size="small">{{ currentLog.result === 'success' ? '成功' : '失败' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作IP">{{ currentLog.ip }}</el-descriptions-item>
          <el-descriptions-item label="IP归属地">{{ currentLog.ipLocation || '中国 广东 深圳' }}</el-descriptions-item>
          <el-descriptions-item label="客户端" :span="2">{{ currentLog.userAgent }}</el-descriptions-item>
          <el-descriptions-item label="请求方法">{{ currentLog.method }}</el-descriptions-item>
          <el-descriptions-item label="请求URL">{{ currentLog.url }}</el-descriptions-item>
          <el-descriptions-item label="请求参数" :span="2">
            <el-input type="textarea" :rows="3" :model-value="currentLog.requestParams" readonly />
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ currentLog.operateTime }}</el-descriptions-item>
          <el-descriptions-item label="执行耗时">{{ currentLog.duration }} ms</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">数据变更快照（Before / After）</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="snapshot-label">变更前（Before）</div>
            <el-input type="textarea" :rows="8" :model-value="currentLog.beforeSnapshot" readonly class="snapshot-code" />
          </el-col>
          <el-col :span="12">
            <div class="snapshot-label">变更后（After）</div>
            <el-input type="textarea" :rows="8" :model-value="currentLog.afterSnapshot" readonly class="snapshot-code" />
          </el-col>
        </el-row>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { auditApi } from '@/api'
import { Search, Refresh, Download, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(1580)
const searchForm = reactive({ operator: '', operationType: '', riskLevel: '', ip: '', dateRange: null })

const logList = ref([
  { logId: 'LOG20260612001', operatorName: '张伟', operatorAccount: 'zhangwei', operationType: 'DELETE', module: '数据集管理', description: '删除数据集「2025年度用户行为分析」，涉及 125,680 条记录', riskLevel: 'high', ip: '192.168.1.56', userAgent: 'Chrome 125 / Windows', duration: 1250, result: 'success', operateTime: '2026-06-12 14:32:18', method: 'DELETE', url: '/api/dataset/10086', requestParams: '{"datasetId": 10086}', beforeSnapshot: '{\n  "datasetId": 10086,\n  "name": "2025年度用户行为分析",\n  "recordCount": 125680,\n  "createTime": "2025-12-01",\n  "owner": "zhangwei"\n}', afterSnapshot: '{\n  "deleted": true,\n  "deletedBy": "zhangwei",\n  "deleteTime": "2026-06-12 14:32:18"\n}' },
  { logId: 'LOG20260612002', operatorName: '李明', operatorAccount: 'liming', operationType: 'PERMISSION', module: '权限管理', description: '修改用户「王芳」角色权限：新增"数据导出"权限，移除"系统配置"权限', riskLevel: 'high', ip: '192.168.1.23', userAgent: 'Chrome 125 / Windows', duration: 320, result: 'success', operateTime: '2026-06-12 13:45:22', method: 'PUT', url: '/api/system/user/1005/role', requestParams: '{"userId": 1005, "addPermissions": ["EXPORT"], "removePermissions": ["CONFIG"]}', beforeSnapshot: '{\n  "userId": 1005,\n  "username": "wangfang",\n  "role": "analyst",\n  "permissions": ["VIEW", "EDIT", "CONFIG"]\n}', afterSnapshot: '{\n  "userId": 1005,\n  "username": "wangfang",\n  "role": "analyst",\n  "permissions": ["VIEW", "EDIT", "EXPORT"]\n}' },
  { logId: 'LOG20260612003', operatorName: '王芳', operatorAccount: 'wangfang', operationType: 'EXPORT', module: '数据导出', description: '创建导出任务：用户行为埋点数据 2026-05月，预计 125 万条', riskLevel: 'medium', ip: '192.168.1.78', userAgent: 'Firefox 128 / MacOS', duration: 850, result: 'success', operateTime: '2026-06-12 11:30:15', method: 'POST', url: '/api/export/task/create', requestParams: '{"dataType":"user_behavior","startDate":"2026-05-01","endDate":"2026-05-31"}', beforeSnapshot: '', afterSnapshot: '{"taskId":"EXP20260612001","status":"pending"}' },
  { logId: 'LOG20260612004', operatorName: '赵六', operatorAccount: 'zhaoliu', operationType: 'UPDATE', module: '数据填报', description: '修改指标数据：华东区 2026-05 销售额由 85600 修改为 86200', riskLevel: 'medium', ip: '10.0.0.15', userAgent: 'Chrome 125 / Windows', duration: 180, result: 'success', operateTime: '2026-06-12 10:22:08', method: 'PUT', url: '/api/data-entry/data/20088', requestParams: '{"fieldValue": 86200}', beforeSnapshot: '{"region":"华东","month":"2026-05","salesAmount":85600}', afterSnapshot: '{"region":"华东","month":"2026-05","salesAmount":86200}' },
  { logId: 'LOG20260612005', operatorName: '系统', operatorAccount: 'system', operationType: 'CONFIG', module: '系统配置', description: 'XXL-JOB 预聚合任务调度频率由 5 秒调整为 10 秒（已回滚）', riskLevel: 'high', ip: '127.0.0.1', userAgent: 'Internal/Scheduler', duration: 50, result: 'failed', operateTime: '2026-06-12 09:15:33', method: 'PUT', url: '/api/system/config/job-interval', requestParams: '{"key":"aggregation.interval","value":10}', beforeSnapshot: '{"aggregation.interval": 5}', afterSnapshot: '{"aggregation.interval": 5, "changeAttempt": "rolled_back"}' }
])

function opTypeColor(t) { return { DELETE: 'danger', PERMISSION: 'warning', UPDATE: 'primary', IMPORT: 'success', EXPORT: '', CONFIG: 'warning', LOGIN: 'info', LOGOUT: 'info' }[t] || 'info' }
function opTypeText(t) { return { DELETE: '数据删除', PERMISSION: '权限变更', UPDATE: '数据修改', IMPORT: '数据导入', EXPORT: '数据导出', CONFIG: '系统配置', LOGIN: '用户登录', LOGOUT: '用户登出' }[t] || t }
function riskColor(l) { return { high: 'danger', medium: 'warning', low: 'success' }[l] || 'info' }
function riskText(l) { return { high: '高风险', medium: '中风险', low: '低风险' }[l] || l }

function fetchList() {
  loading.value = true
  // 调用接口: GET /api/audit/log/list?page=1&size=20&operator=&type=&riskLevel=&ip=&startDate=&endDate=
  setTimeout(() => { loading.value = false }, 500)
}

function resetSearch() {
  Object.assign(searchForm, { operator: '', operationType: '', riskLevel: '', ip: '', dateRange: null })
  fetchList()
}

function exportLog() {
  // 调用接口: GET /api/audit/log/export
  ElMessage.info('日志导出中...')
}

// ===== 详情 =====
const detailVisible = ref(false)
const currentLog = ref(null)

function showDetail(row) {
  currentLog.value = row
  // 调用接口: GET /api/audit/log/:id
  detailVisible.value = true
}
</script>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.snapshot-label { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; }
.snapshot-code :deep(textarea) { font-family: 'Consolas', monospace; font-size: 12px; background: #1e1e1e; color: #d4d4d4; }
</style>
