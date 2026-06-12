<template>
  <div class="alert-page">
    <!-- 告警概览统计 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6" v-for="item in summaryCards" :key="item.label">
        <el-card shadow="hover" :body-style="{ padding: '20px 24px' }" class="summary-card">
          <div class="summary-content">
            <div>
              <span class="summary-label">{{ item.label }}</span>
              <div class="summary-value" :style="{ color: item.color }">{{ item.value }}</div>
            </div>
            <el-icon :size="40" :style="{ color: item.color, opacity: 0.3 }"><component :is="item.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 告警规则管理 -->
    <el-card shadow="never" class="rules-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">告警规则配置</span>
          <div class="header-actions">
            <el-button type="primary" size="small" :icon="Plus" @click="showRuleDialog()">新增规则</el-button>
            <el-button size="small" :icon="Setting" @click="showWebhookDialog">Webhook 配置</el-button>
            <el-button size="small" :icon="Connection" @click="testWebhook">测试连通性</el-button>
          </div>
        </div>
      </template>
      <el-table
        :data="ruleList"
        stripe
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
      >
        <el-table-column prop="ruleName" label="规则名称" min-width="180" />
        <el-table-column prop="monitorTarget" label="监控目标" width="180" />
        <el-table-column prop="condition" label="触发条件" width="200">
          <template #default="{ row }">
            <span>连续 <el-tag size="small" type="danger">{{ row.threshold }}</el-tag> 次异常</span>
          </template>
        </el-table-column>
        <el-table-column prop="notifyChannel" label="通知渠道" width="150">
          <template #default="{ row }">
            <el-tag v-for="ch in row.notifyChannel" :key="ch" size="small" style="margin-right: 4px">{{ ch }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRule(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="lastTriggered" label="最近触发" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showRuleDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该规则？" @confirm="deleteRule(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 告警历史记录 -->
    <el-card shadow="never" class="history-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">告警历史记录</span>
          <el-form :model="historySearch" inline>
            <el-form-item>
              <el-date-picker v-model="historySearch.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" format="YYYY-MM-DD" value-format="YYYY-MM-DD" size="small" style="width: 240px" />
            </el-form-item>
            <el-form-item>
              <el-select v-model="historySearch.level" placeholder="告警级别" clearable size="small" style="width: 120px">
                <el-option label="严重" value="critical" />
                <el-option label="警告" value="warning" />
                <el-option label="提示" value="info" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-select v-model="historySearch.status" placeholder="处理状态" clearable size="small" style="width: 120px">
                <el-option label="未处理" value="pending" />
                <el-option label="已处理" value="resolved" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="small" :icon="Search" @click="fetchHistory">查询</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>
      <el-table
        :data="historyList"
        stripe
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
      >
        <el-table-column prop="alertId" label="告警ID" width="160" />
        <el-table-column prop="ruleName" label="触发规则" min-width="160" />
        <el-table-column prop="level" label="级别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small" round>{{ levelText(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="告警详情" min-width="280" show-overflow-tooltip />
        <el-table-column prop="triggerCount" label="异常次数" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #f5222d; font-weight: 600">{{ row.triggerCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="notifyResult" label="推送结果" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.notifyResult === 'success' ? 'success' : 'danger'" size="small">
              {{ row.notifyResult === 'success' ? '推送成功' : '推送失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="处理状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'resolved' ? 'success' : 'warning'" size="small" round>
              {{ row.status === 'resolved' ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="triggerTime" label="触发时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              link type="primary" size="small"
              @click="resolveAlert(row)"
            >标记处理</el-button>
            <span v-else style="color: #999; font-size: 12px">{{ row.resolver }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="historyPage" :page-size="10" :total="historyTotal" layout="total, prev, pager, next" background />
      </div>
    </el-card>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="ruleDialogVisible" :title="editingRule ? '编辑告警规则' : '新增告警规则'" width="600px" destroy-on-close>
      <el-form :model="ruleForm" label-width="110px">
        <el-form-item label="规则名称" required><el-input v-model="ruleForm.ruleName" placeholder="如：预聚合任务异常告警" /></el-form-item>
        <el-form-item label="监控目标" required>
          <el-select v-model="ruleForm.monitorTarget" placeholder="请选择" style="width: 100%">
            <el-option label="XXL-JOB 预聚合任务" value="xxl_job_aggregation" />
            <el-option label="周报生成任务" value="weekly_report" />
            <el-option label="数据导出任务" value="data_export" />
            <el-option label="API 接口可用性" value="api_availability" />
            <el-option label="Redis 连接状态" value="redis_connection" />
          </el-select>
        </el-form-item>
        <el-form-item label="异常阈值" required>
          <el-input-number v-model="ruleForm.threshold" :min="1" :max="10" />
          <span style="margin-left: 12px; color: #999">连续达到该次数时触发（Redis 原子计数器）</span>
        </el-form-item>
        <el-form-item label="通知渠道">
          <el-checkbox-group v-model="ruleForm.notifyChannel">
            <el-checkbox value="企业微信">企业微信</el-checkbox>
            <el-checkbox value="邮件">邮件</el-checkbox>
            <el-checkbox value="短信">短信</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="告警级别">
          <el-radio-group v-model="ruleForm.level">
            <el-radio value="critical">严重</el-radio>
            <el-radio value="warning">警告</el-radio>
            <el-radio value="info">提示</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="告警消息模板">
          <el-input v-model="ruleForm.messageTemplate" type="textarea" :rows="3" placeholder="[BI告警] {ruleName} 触发告警，连续异常 {count} 次，时间：{time}，服务器IP：{ip}" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- Webhook 配置弹窗 -->
    <el-dialog v-model="webhookVisible" title="企业微信 Webhook 配置" width="500px" destroy-on-close>
      <el-form :model="webhookForm" label-width="100px">
        <el-form-item label="Webhook URL"><el-input v-model="webhookForm.url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" /></el-form-item>
        <el-form-item label="密钥(Secret)"><el-input v-model="webhookForm.secret" type="password" show-password placeholder="可选，用于加签验证" /></el-form-item>
        <el-form-item label="@成员手机号"><el-input v-model="webhookForm.atMobiles" placeholder="多个手机号用逗号分隔" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webhookVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWebhook">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { alertApi } from '@/api'
import { Plus, Setting, Connection, Search } from '@element-plus/icons-vue'

const summaryCards = ref([
  { label: '今日告警数', value: 5, color: '#f5222d', icon: 'Bell' },
  { label: '未处理告警', value: 2, color: '#faad14', icon: 'WarningFilled' },
  { label: '活跃规则数', value: 8, color: '#1890ff', icon: 'SetUp' },
  { label: '本周推送成功率', value: '98.5%', color: '#52c41a', icon: 'CircleCheck' }
])

// ===== 告警规则 =====
const ruleList = ref([
  { ruleName: '预聚合任务异常告警', monitorTarget: 'XXL-JOB 预聚合任务', threshold: 3, notifyChannel: ['企业微信', '邮件'], enabled: true, lastTriggered: '2026-06-12 10:15:33' },
  { ruleName: '周报生成失败告警', monitorTarget: '周报生成任务', threshold: 1, notifyChannel: ['企业微信'], enabled: true, lastTriggered: '2026-06-08 00:05:12' },
  { ruleName: '导出任务超时告警', monitorTarget: '数据导出任务', threshold: 2, notifyChannel: ['邮件'], enabled: true, lastTriggered: '2026-06-11 16:10:22' },
  { ruleName: 'API 可用性监控', monitorTarget: 'API 接口可用性', threshold: 5, notifyChannel: ['企业微信'], enabled: false, lastTriggered: '' },
  { ruleName: 'Redis 连接异常告警', monitorTarget: 'Redis 连接状态', threshold: 3, notifyChannel: ['企业微信', '短信'], enabled: true, lastTriggered: '2026-06-10 08:30:15' }
])

const ruleDialogVisible = ref(false)
const editingRule = ref(null)
const ruleForm = reactive({ ruleName: '', monitorTarget: '', threshold: 3, notifyChannel: ['企业微信'], level: 'critical', messageTemplate: '[BI告警] {ruleName} 触发告警，连续异常 {count} 次，时间：{time}' })

function showRuleDialog(rule) {
  editingRule.value = rule || null
  if (rule) Object.assign(ruleForm, rule)
  ruleDialogVisible.value = true
}

function saveRule() {
  // 调用接口: POST/PUT /api/alert/rules
  ElMessage.success('规则保存成功')
  ruleDialogVisible.value = false
}

function toggleRule(row) {
  // 调用接口: PUT /api/alert/rules/:id
}

function deleteRule(row) {
  // 调用接口: DELETE /api/alert/rules/:id
  ElMessage.success('规则已删除')
}

// ===== Webhook =====
const webhookVisible = ref(false)
const webhookForm = reactive({ url: '', secret: '', atMobiles: '' })

function showWebhookDialog() { webhookVisible.value = true }

function saveWebhook() {
  // 调用接口: PUT /api/alert/webhook/config
  ElMessage.success('Webhook 配置已保存')
  webhookVisible.value = false
}

function testWebhook() {
  // 调用接口: POST /api/alert/webhook/test
  ElMessage.success('测试消息已发送至企业微信群')
}

// ===== 告警历史 =====
const historySearch = reactive({ dateRange: null, level: '', status: '' })
const historyPage = ref(1)
const historyTotal = ref(86)
const historyList = ref([
  { alertId: 'ALT20260612001', ruleName: '预聚合任务异常告警', level: 'critical', message: 'XXL-JOB 预聚合任务连续 3 次执行失败，Redis 原子计数器值=3，异常原因：SQL Timeout', triggerCount: 3, notifyResult: 'success', status: 'pending', triggerTime: '2026-06-12 10:15:33', resolver: '' },
  { alertId: 'ALT20260612002', ruleName: '预聚合任务异常告警', level: 'critical', message: 'XXL-JOB 预聚合任务连续 3 次执行失败，Redis 原子计数器值=3，异常原因：数据库连接池耗尽', triggerCount: 3, notifyResult: 'success', status: 'pending', triggerTime: '2026-06-12 08:30:15', resolver: '' },
  { alertId: 'ALT20260611003', ruleName: '导出任务超时告警', level: 'warning', message: '数据导出任务 EXP20260611005 执行超时，当前进度 35%，已持续运行 45 分钟', triggerCount: 2, notifyResult: 'success', status: 'resolved', triggerTime: '2026-06-11 16:10:22', resolver: '张工' },
  { alertId: 'ALT20260610004', ruleName: 'Redis 连接异常告警', level: 'critical', message: 'Redis 主节点连接异常，连续 3 次心跳检测失败，IP: 192.168.1.100:6379', triggerCount: 3, notifyResult: 'success', status: 'resolved', triggerTime: '2026-06-10 08:30:15', resolver: '李工' },
  { alertId: 'ALT20260608005', ruleName: '周报生成失败告警', level: 'warning', message: '周报 WR20260608 自动生成过程中 FreeMarker 模板渲染异常：数据源为空', triggerCount: 1, notifyResult: 'failed', status: 'resolved', triggerTime: '2026-06-08 00:05:12', resolver: '王工' }
])

function levelType(l) { return { critical: 'danger', warning: 'warning', info: 'info' }[l] || 'info' }
function levelText(l) { return { critical: '严重', warning: '警告', info: '提示' }[l] || l }

function fetchHistory() {
  // 调用接口: GET /api/alert/history/list?page=1&size=10&startDate=&endDate=&level=&status=
}

function resolveAlert(row) {
  // 调用接口: PUT /api/alert/history/resolve/:id
  row.status = 'resolved'
  row.resolver = '当前用户'
  ElMessage.success('已标记为已处理')
}
</script>

<style scoped>
.alert-page { display: flex; flex-direction: column; gap: 16px; }
.summary-card { border-radius: 8px; }
.summary-content { display: flex; justify-content: space-between; align-items: center; }
.summary-label { font-size: 13px; color: #8c8c8c; }
.summary-value { font-size: 28px; font-weight: 700; margin-top: 4px; }
.rules-card, .history-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.header-actions { display: flex; gap: 8px; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
