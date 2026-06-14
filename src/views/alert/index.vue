<template>
  <div class="alert-page">
    <!-- 顶部统计 -->
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6" v-for="(s, i) in summaryCards" :key="i">
        <el-card shadow="hover" class="summary-card" :body-style="{ padding: '20px 24px' }">
          <div class="summary-content">
            <div>
              <span class="summary-label">{{ s.label }}</span>
              <div class="summary-value" :style="{ color: s.color }">{{ s.value }}</div>
              <div class="summary-sub">{{ s.sub }}</div>
            </div>
            <el-icon :size="40" :style="{ color: s.color, opacity: 0.3 }"><component :is="s.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 当前值班 + 实时告警大屏 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="6">
        <el-card shadow="hover" class="duty-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon color="#52c41a"><UserFilled /></el-icon>
                当前值班
              </span>
              <el-button text type="primary" size="small" @click="activeTab = 'duty'">查看排班</el-button>
            </div>
          </template>
          <div class="duty-content">
            <el-avatar :size="48" style="background: linear-gradient(135deg,#1890ff,#36cfc9)">{{ currentDuty.name.charAt(0) }}</el-avatar>
            <div class="duty-info">
              <div class="duty-name">{{ currentDuty.name }}</div>
              <div class="duty-time">{{ currentDuty.shift }} · 至今 {{ currentDuty.handled }} 条</div>
            </div>
            <el-button type="primary" plain size="small">呼叫</el-button>
          </div>
          <el-divider />
          <div class="duty-stats">
            <div class="ds-item">
              <div class="ds-label">响应时长</div>
              <div class="ds-value">{{ currentDuty.avgResponse }}</div>
            </div>
            <div class="ds-item">
              <div class="ds-label">解决率</div>
              <div class="ds-value">{{ currentDuty.resolveRate }}%</div>
            </div>
            <div class="ds-item">
              <div class="ds-label">升级次数</div>
              <div class="ds-value">{{ currentDuty.escalateCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="18">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">告警趋势（最近 7 天）</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button value="all">全部</el-radio-button>
                <el-radio-button value="critical">严重</el-radio-button>
                <el-radio-button value="warning">警告</el-radio-button>
                <el-radio-button value="info">提示</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tabs -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane name="history" label="告警事件">
          <el-form :model="historySearch" inline>
            <el-form-item label="时间范围">
              <el-date-picker v-model="historySearch.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 260px" />
            </el-form-item>
            <el-form-item label="级别">
              <el-select v-model="historySearch.level" placeholder="全部" clearable style="width: 120px">
                <el-option label="严重" value="critical" />
                <el-option label="警告" value="warning" />
                <el-option label="提示" value="info" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="historySearch.status" placeholder="全部" clearable style="width: 120px">
                <el-option label="未处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已解决" value="resolved" />
                <el-option label="已抑制" value="silenced" />
                <el-option label="已升级" value="escalated" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键字">
              <el-input v-model="historySearch.keyword" placeholder="搜索告警内容" clearable :prefix-icon="Search" style="width: 200px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="fetchHistory">查询</el-button>
              <el-button @click="resetHistory">重置</el-button>
            </el-form-item>
          </el-form>
          <el-table :data="historyList" stripe v-loading="historyLoading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
            <el-table-column prop="alertId" label="告警ID" width="180" />
            <el-table-column label="级别" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="levelType(row.level)" size="small" effect="dark">{{ levelText(row.level) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ruleName" label="规则" width="180" />
            <el-table-column prop="message" label="告警内容" min-width="320" show-overflow-tooltip />
            <el-table-column prop="source" label="来源" width="120" />
            <el-table-column label="通知" width="160">
              <template #default="{ row }">
                <el-tag v-for="c in row.notifyChannel" :key="c" size="small" effect="plain" style="margin-right: 4px">{{ c }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="triggerTime" label="触发时间" width="170" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="resolver" label="处理人" width="100" />
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" :icon="View" @click="viewAlert(row)">详情</el-button>
                <el-button v-if="row.status === 'pending'" link type="primary" size="small" :icon="Check" @click="claimAlert(row)">认领</el-button>
                <el-button v-if="row.status !== 'resolved'" link type="success" size="small" :icon="Select" @click="resolveAlert(row)">解决</el-button>
                <el-button v-if="row.status !== 'resolved'" link type="warning" size="small" :icon="BellFilled" @click="escalateAlert(row)">升级</el-button>
                <el-button v-if="row.status !== 'resolved'" link type="info" size="small" :icon="Mute" @click="silenceAlert(row)">抑制</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="rules" label="告警规则">
          <div class="tab-toolbar">
            <el-button type="primary" :icon="Plus" @click="showRuleDialog()">新增规则</el-button>
            <el-button :icon="Setting" @click="showSilenceDialog">告警抑制</el-button>
            <el-button :icon="Connection" @click="showWebhookDialog">Webhook 配置</el-button>
          </div>
          <el-table :data="ruleList" stripe :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
            <el-table-column prop="ruleName" label="规则名称" min-width="180" />
            <el-table-column prop="monitorTarget" label="监控对象" min-width="200" show-overflow-tooltip />
            <el-table-column prop="level" label="级别" width="100">
              <template #default="{ row }">
                <el-tag :type="levelType(row.level)" size="small">{{ levelText(row.level) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="metric" label="监控指标" width="140" />
            <el-table-column label="触发条件" width="200">
              <template #default="{ row }">{ {{ row.threshold }} } {{ row.compare }}</template>
            </el-table-column>
            <el-table-column prop="window" label="评估窗口" width="120" />
            <el-table-column label="通知渠道" width="200">
              <template #default="{ row }">
                <el-tag v-for="c in row.notifyChannel" :key="c" size="small" effect="plain" style="margin-right: 4px">{{ c }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastTriggered" label="最近触发" width="160" />
            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="showRuleDialog(row)">编辑</el-button>
                <el-button link type="primary" size="small" @click="testRule(row)">测试</el-button>
                <el-popconfirm title="确定删除？" @confirm="deleteRule(row)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="duty" label="值班排班">
          <div class="tab-toolbar">
            <el-button type="primary" :icon="Plus" @click="showDutyDialog">新增排班</el-button>
            <el-button :icon="Calendar" @click="showCalendar">日历视图</el-button>
            <el-button :icon="Download">导出排班</el-button>
          </div>
          <el-table :data="dutyList" stripe :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="shift" label="班次" width="120">
              <template #default="{ row }">
                <el-tag :type="row.shift === '白班' ? 'primary' : 'warning'" size="small">{{ row.shift }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="timeRange" label="时段" width="160" />
            <el-table-column prop="members" label="值班成员" min-width="200">
              <template #default="{ row }">
                <el-avatar v-for="m in row.members" :key="m" :size="28" style="margin-right: -4px; border: 2px solid #fff">{{ m.charAt(0) }}</el-avatar>
                <span style="margin-left: 8px; color: #595959; font-size: 13px">{{ row.members.join('、') }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="leader" label="值班长" width="100" />
            <el-table-column prop="handled" label="处理告警" width="100" align="center" />
            <el-table-column prop="note" label="备注" min-width="160" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="showDutyDialog(row)">编辑</el-button>
                <el-button link type="primary" size="small">交接班</el-button>
                <el-popconfirm title="确定删除？" @confirm="dutyList.splice(dutyList.indexOf(row), 1)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="silence" label="抑制规则">
          <div class="tab-toolbar">
            <el-button type="primary" :icon="Plus" @click="showSilenceDialog()">新增抑制</el-button>
          </div>
          <el-table :data="silenceList" stripe :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
            <el-table-column prop="name" label="规则名称" min-width="200" />
            <el-table-column label="匹配条件" min-width="300">
              <template #default="{ row }">
                <el-tag v-for="(v, k) in row.matchers" :key="k" size="small" type="info" effect="plain" style="margin-right: 4px">{{ k }}={{ v }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="startTime" label="开始时间" width="170" />
            <el-table-column prop="endTime" label="结束时间" width="170" />
            <el-table-column prop="creator" label="创建人" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '生效中' : '已过期' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="showSilenceDialog(row)">编辑</el-button>
                <el-button link type="warning" size="small" @click="row.status = 'expired'">停止</el-button>
                <el-popconfirm title="确定删除？" @confirm="silenceList.splice(silenceList.indexOf(row), 1)">
                  <template #reference>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 告警详情 -->
    <el-drawer v-model="alertDetailVisible" title="告警详情" size="60%">
      <div v-if="alertDetail" class="alert-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="告警ID">{{ alertDetail.alertId }}</el-descriptions-item>
          <el-descriptions-item label="规则">{{ alertDetail.ruleName }}</el-descriptions-item>
          <el-descriptions-item label="级别"><el-tag :type="levelType(alertDetail.level)">{{ levelText(alertDetail.level) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="来源">{{ alertDetail.source }}</el-descriptions-item>
          <el-descriptions-item label="触发时间">{{ alertDetail.triggerTime }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusType(alertDetail.status)">{{ statusText(alertDetail.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="告警内容" :span="2">{{ alertDetail.message }}</el-descriptions-item>
          <el-descriptions-item label="通知渠道" :span="2">
            <el-tag v-for="c in alertDetail.notifyChannel" :key="c" style="margin-right: 4px">{{ c }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider>处理时间线</el-divider>
        <el-timeline>
          <el-timeline-item v-for="(log, idx) in alertLogs" :key="idx" :timestamp="log.time" :type="log.type" :hollow="idx !== alertLogs.length - 1">
            <strong>{{ log.action }}</strong>
            <div style="color: #595959; margin-top: 4px">{{ log.operator }} - {{ log.remark }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>

    <!-- 告警规则弹窗 -->
    <el-dialog v-model="ruleDialogVisible" :title="editingRule ? '编辑告警规则' : '新增告警规则'" width="720px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="规则名称" required>
          <el-input v-model="ruleForm.ruleName" />
        </el-form-item>
        <el-form-item label="监控对象" required>
          <el-input v-model="ruleForm.monitorTarget" placeholder="如：订单表同步延迟" />
        </el-form-item>
        <el-form-item label="监控指标" required>
          <el-input v-model="ruleForm.metric" placeholder="如：data_sync_lag" />
        </el-form-item>
        <el-form-item label="触发条件" required>
          <el-input v-model="ruleForm.threshold" style="width: 100px" placeholder="阈值" />
          <el-select v-model="ruleForm.compare" style="width: 100px; margin: 0 8px">
            <el-option label=">" value=">" />
            <el-option label=">=" value=">=" />
            <el-option label="<" value="<" />
            <el-option label="<=" value="<=" />
            <el-option label="==" value="==" />
          </el-select>
        </el-form-item>
        <el-form-item label="评估窗口">
          <el-input v-model="ruleForm.window" placeholder="如：5分钟" />
        </el-form-item>
        <el-form-item label="告警级别">
          <el-radio-group v-model="ruleForm.level">
            <el-radio-button value="critical">严重</el-radio-button>
            <el-radio-button value="warning">警告</el-radio-button>
            <el-radio-button value="info">提示</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="通知渠道">
          <el-checkbox-group v-model="ruleForm.notifyChannel">
            <el-checkbox value="邮件">邮件</el-checkbox>
            <el-checkbox value="钉钉">钉钉</el-checkbox>
            <el-checkbox value="企业微信">企业微信</el-checkbox>
            <el-checkbox value="飞书">飞书</el-checkbox>
            <el-checkbox value="短信">短信</el-checkbox>
            <el-checkbox value="电话">电话</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="升级策略">
          <el-select v-model="ruleForm.escalate" style="width: 100%">
            <el-option label="不升级" value="none" />
            <el-option label="15分钟未处理升级到主管" value="15m" />
            <el-option label="30分钟未处理升级到总监" value="30m" />
            <el-option label="1小时未处理升级到CEO" value="1h" />
          </el-select>
        </el-form-item>
        <el-form-item label="消息模板">
          <el-input v-model="ruleForm.messageTemplate" type="textarea" :rows="3" placeholder="支持变量：{ruleName} {count} {time} {value}" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 抑制规则弹窗 -->
    <el-dialog v-model="silenceVisible" :title="editingSilence ? '编辑抑制规则' : '新增抑制规则'" width="600px">
      <el-form :model="silenceForm" label-width="100px">
        <el-form-item label="规则名称" required>
          <el-input v-model="silenceForm.name" />
        </el-form-item>
        <el-form-item label="匹配规则" required>
          <div v-for="(m, idx) in silenceForm.matchers" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px">
            <el-input v-model="m.key" placeholder="标签键" style="width: 140px" />
            <el-input v-model="m.value" placeholder="值" style="flex: 1" />
            <el-button :icon="Delete" @click="silenceForm.matchers.splice(idx, 1)" />
          </div>
          <el-button :icon="Plus" @click="silenceForm.matchers.push({ key: '', value: '' })" size="small">添加匹配</el-button>
        </el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker v-model="silenceForm.startTime" type="datetime" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker v-model="silenceForm.endTime" type="datetime" style="width: 100%" />
        </el-form-item>
        <el-form-item label="创建人">
          <el-input v-model="silenceForm.creator" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="silenceVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSilence">保存</el-button>
      </template>
    </el-dialog>

    <!-- Webhook 配置 -->
    <el-dialog v-model="webhookVisible" title="Webhook 通道配置" width="600px">
      <el-form :model="webhookForm" label-width="120px">
        <el-form-item label="钉钉机器人">
          <el-input v-model="webhookForm.dingtalk" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
        </el-form-item>
        <el-form-item label="企业微信机器人">
          <el-input v-model="webhookForm.wechat" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
        </el-form-item>
        <el-form-item label="飞书机器人">
          <el-input v-model="webhookForm.feishu" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
        </el-form-item>
        <el-form-item label="通用 Webhook">
          <el-input v-model="webhookForm.webhook" placeholder="自定义接收端点" />
        </el-form-item>
        <el-form-item label="签名密钥">
          <el-input v-model="webhookForm.secret" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="webhookVisible = false">取消</el-button>
        <el-button @click="testWebhook">测试</el-button>
        <el-button type="primary" @click="saveWebhook">保存</el-button>
      </template>
    </el-dialog>

    <!-- 排班弹窗 -->
    <el-dialog v-model="dutyVisible" title="排班" width="600px">
      <el-form :model="dutyForm" label-width="100px">
        <el-form-item label="日期" required>
          <el-date-picker v-model="dutyForm.date" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="班次" required>
          <el-radio-group v-model="dutyForm.shift">
            <el-radio value="白班">白班 (09:00-18:00)</el-radio>
            <el-radio value="夜班">夜班 (18:00-09:00)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="值班成员" required>
          <el-select v-model="dutyForm.members" multiple filterable style="width: 100%">
            <el-option v-for="u in userOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
        <el-form-item label="值班长">
          <el-select v-model="dutyForm.leader" style="width: 100%">
            <el-option v-for="m in dutyForm.members" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dutyForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dutyVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDuty">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  Search, Plus, Setting, Connection, View, Check, Select, BellFilled, Mute, Delete,
  UserFilled, Calendar, Download,
  Bell, WarningFilled, SetUp, CircleCheck
} from '@element-plus/icons-vue'

// ===== 顶部统计 =====
const summaryCards = ref([
  { label: '今日告警', value: 12, sub: '较昨日 -3', color: '#f5222d', icon: 'Bell' },
  { label: '未处理', value: 5, sub: '其中严重 2', color: '#faad14', icon: 'WarningFilled' },
  { label: '活跃规则', value: 18, sub: '禁用 2', color: '#1890ff', icon: 'SetUp' },
  { label: '本月推送', value: '2,386', sub: '成功率 99.2%', color: '#52c41a', icon: 'CircleCheck' }
])

// ===== 当前值班 =====
const currentDuty = reactive({
  name: '张伟', shift: '白班', handled: 8, avgResponse: '3.2分钟', resolveRate: 95, escalateCount: 1
})

// ===== 图表 =====
const trendType = ref('all')
const trendChartRef = ref(null)
let trendChart = null

function renderTrend() {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const data = {
    all: [12, 18, 8, 25, 15, 12, 5],
    critical: [2, 5, 1, 8, 3, 2, 0],
    warning: [6, 9, 4, 12, 8, 6, 3],
    info: [4, 4, 3, 5, 4, 4, 2]
  }[trendType.value]
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value' },
    series: [{
      name: '告警数', type: 'bar', data,
      barWidth: '40%',
      itemStyle: {
        color: p => {
          const colors = { critical: '#f5222d', warning: '#faad14', info: '#1890ff' }
          if (trendType.value === 'all') return ['#52c41a', '#52c41a', '#52c41a', '#f5222d', '#faad14', '#52c41a', '#52c41a'][p.dataIndex] || '#52c41a'
          return colors[trendType.value]
        },
        borderRadius: [4, 4, 0, 0]
      }
    }]
  })
}

// ===== Tabs =====
const activeTab = ref('history')

// ===== 告警事件 =====
const historySearch = reactive({ dateRange: null, level: '', status: '', keyword: '' })
const historyPage = ref(1)
const historyTotal = ref(86)
const historyLoading = ref(false)
const historyList = ref([
  { alertId: 'ALT20260614001', ruleName: '预聚合任务异常告警', level: 'critical', message: 'XXL-JOB 预聚合任务连续 3 次执行失败，Redis 原子计数器值=3，异常原因：SQL Timeout', source: 'XXL-JOB', notifyChannel: ['企业微信', '短信'], triggerTime: '2026-06-14 10:15:33', status: 'pending', resolver: '' },
  { alertId: 'ALT20260614002', ruleName: '订单同步延迟告警', level: 'warning', message: '订单表同步延迟 8 分钟，超过阈值 5 分钟，请检查 Binlog 监听状态', source: 'MySQL Binlog', notifyChannel: ['企业微信'], triggerTime: '2026-06-14 09:32:15', status: 'processing', resolver: '张伟' },
  { alertId: 'ALT20260613003', ruleName: 'API 可用性告警', level: 'critical', message: '/api/dashboard/realtime 接口 5xx 错误率 28%，超过阈值 5%', source: 'Prometheus', notifyChannel: ['企业微信', '电话'], triggerTime: '2026-06-13 14:20:38', status: 'escalated', resolver: '李工' },
  { alertId: 'ALT20260613004', ruleName: '导出任务超时告警', level: 'warning', message: '数据导出任务 EXP20260613005 执行超时，当前进度 35%，已持续运行 45 分钟', source: 'RabbitMQ', notifyChannel: ['邮件'], triggerTime: '2026-06-13 16:10:22', status: 'resolved', resolver: '张工' },
  { alertId: 'ALT20260612005', ruleName: 'Redis 连接异常告警', level: 'critical', message: 'Redis 主节点连接异常，连续 3 次心跳检测失败，IP: 192.168.1.100:6379', source: 'Redis Sentinel', notifyChannel: ['企业微信', '短信'], triggerTime: '2026-06-12 08:30:15', status: 'resolved', resolver: '李工' },
  { alertId: 'ALT20260611006', ruleName: '数据源连接失败', level: 'warning', message: '数据源 "微信小程序API" 连接失败：connection timeout', source: 'DataSource', notifyChannel: ['企业微信'], triggerTime: '2026-06-11 11:30:00', status: 'silenced', resolver: '' },
  { alertId: 'ALT20260610007', ruleName: '周报生成失败告警', level: 'warning', message: '周报 WR20260608 自动生成过程中 FreeMarker 模板渲染异常：数据源为空', source: 'XXL-JOB', notifyChannel: ['邮件'], triggerTime: '2026-06-10 00:05:12', status: 'resolved', resolver: '王工' }
])

function fetchHistory() { historyLoading.value = true; setTimeout(() => historyLoading.value = false, 300) }
function resetHistory() { historySearch.dateRange = null; historySearch.level = ''; historySearch.status = ''; historySearch.keyword = '' }
function levelType(l) { return { critical: 'danger', warning: 'warning', info: 'info' }[l] || 'info' }
function levelText(l) { return { critical: '严重', warning: '警告', info: '提示' }[l] || l }
function statusType(s) { return { pending: 'danger', processing: 'warning', resolved: 'success', silenced: 'info', escalated: '' }[s] || 'info' }
function statusText(s) { return { pending: '未处理', processing: '处理中', resolved: '已解决', silenced: '已抑制', escalated: '已升级' }[s] || s }

function claimAlert(row) { row.status = 'processing'; row.resolver = '当前用户'; ElMessage.success('已认领') }
function resolveAlert(row) { row.status = 'resolved'; row.resolver = row.resolver || '当前用户'; ElMessage.success('已解决') }
function escalateAlert(row) { row.status = 'escalated'; ElMessage.warning('已升级到上级') }
function silenceAlert(row) {
  ElMessageBox?.prompt?.('请输入抑制时长（分钟）', '抑制告警', { inputValue: 60 }).then(({ value }) => {
    row.status = 'silenced'; ElMessage.success(`已抑制 ${value} 分钟`)
  }).catch(() => {})
}

// ===== 告警详情 =====
const alertDetailVisible = ref(false)
const alertDetail = ref(null)
const alertLogs = ref([])
function viewAlert(row) {
  alertDetail.value = row
  alertLogs.value = [
    { time: row.triggerTime, type: 'danger', action: '告警触发', operator: '系统', remark: '检测到异常，触发告警规则' },
    ...(row.resolver ? [{ time: new Date().toLocaleString(), type: 'success', action: '处理完成', operator: row.resolver, remark: '问题已解决' }] : [])
  ]
  alertDetailVisible.value = true
}

// ===== 告警规则 =====
const ruleDialogVisible = ref(false)
const editingRule = ref(null)
const ruleForm = reactive({ id: null, ruleName: '', monitorTarget: '', metric: '', threshold: 3, compare: '>', window: '5分钟', level: 'critical', notifyChannel: ['企业微信'], escalate: 'none', messageTemplate: '[BI告警] {ruleName} 触发，当前值 {value}，超过阈值 {threshold}' })
const ruleList = ref([
  { id: 1, ruleName: '预聚合任务异常告警', monitorTarget: 'XXL-JOB 预聚合任务', metric: 'job_fail_count', threshold: 3, compare: '>', window: '5分钟', level: 'critical', notifyChannel: ['企业微信', '短信'], enabled: true, lastTriggered: '2026-06-14 10:15:33' },
  { id: 2, ruleName: '订单同步延迟告警', monitorTarget: '订单 Binlog 同步', metric: 'sync_lag_seconds', threshold: 300, compare: '>', window: '3分钟', level: 'warning', notifyChannel: ['企业微信'], enabled: true, lastTriggered: '2026-06-14 09:32:15' },
  { id: 3, ruleName: 'API 可用性告警', monitorTarget: 'API 接口 5xx 错误率', metric: 'api_5xx_rate', threshold: 5, compare: '>', window: '1分钟', level: 'critical', notifyChannel: ['企业微信', '电话'], enabled: true, lastTriggered: '2026-06-13 14:20:38' },
  { id: 4, ruleName: '周报生成失败告警', monitorTarget: '周报生成任务', metric: 'report_generate_fail', threshold: 1, compare: '>=', window: '1小时', level: 'warning', notifyChannel: ['邮件'], enabled: true, lastTriggered: '2026-06-10 00:05:12' },
  { id: 5, ruleName: 'Redis 连接异常告警', monitorTarget: 'Redis 主节点', metric: 'redis_heartbeat_fail', threshold: 3, compare: '>=', window: '30秒', level: 'critical', notifyChannel: ['企业微信', '短信'], enabled: true, lastTriggered: '2026-06-12 08:30:15' },
  { id: 6, ruleName: '导出任务超时告警', monitorTarget: '数据导出任务', metric: 'export_duration_minutes', threshold: 30, compare: '>', window: '1分钟', level: 'warning', notifyChannel: ['邮件'], enabled: true, lastTriggered: '2026-06-13 16:10:22' }
])

function showRuleDialog(rule) {
  editingRule.value = !!rule
  if (rule) Object.assign(ruleForm, rule)
  else Object.assign(ruleForm, { id: null, ruleName: '', monitorTarget: '', metric: '', threshold: 3, compare: '>', window: '5分钟', level: 'critical', notifyChannel: ['企业微信'], escalate: 'none' })
  ruleDialogVisible.value = true
}
function saveRule() { ElMessage.success('规则保存成功'); ruleDialogVisible.value = false }
function deleteRule(row) { ruleList.value = ruleList.value.filter(r => r.id !== row.id); ElMessage.success('已删除') }
function testRule(row) { ElMessage.info(`已发送测试告警到渠道`) }

// ===== 排班 =====
const dutyVisible = ref(false)
const dutyForm = reactive({ date: '', shift: '白班', members: [], leader: '', note: '' })
const userOptions = ['张伟', '李娜', '王芳', '陈晨', '赵六', '孙七', '周八', '吴九']
const dutyList = ref([
  { date: '2026-06-14', shift: '白班', timeRange: '09:00 - 18:00', members: ['张伟', '李娜'], leader: '张伟', handled: 8, note: '' },
  { date: '2026-06-14', shift: '夜班', timeRange: '18:00 - 次日 09:00', members: ['王芳', '陈晨'], leader: '王芳', handled: 2, note: '周末加班' },
  { date: '2026-06-15', shift: '白班', timeRange: '09:00 - 18:00', members: ['赵六', '孙七'], leader: '赵六', handled: 0, note: '' },
  { date: '2026-06-15', shift: '夜班', timeRange: '18:00 - 次日 09:00', members: ['周八', '吴九'], leader: '周八', handled: 0, note: '' }
])

function showDutyDialog(row) {
  if (row) Object.assign(dutyForm, row)
  else Object.assign(dutyForm, { date: '', shift: '白班', members: [], leader: '', note: '' })
  dutyVisible.value = true
}
function saveDuty() { ElMessage.success('排班已保存'); dutyVisible.value = false }
function showCalendar() { ElMessage.info('日历视图开发中') }

// ===== 抑制规则 =====
const silenceVisible = ref(false)
const editingSilence = ref(false)
const silenceForm = reactive({ name: '', matchers: [{ key: 'ruleName', value: '' }], startTime: '', endTime: '', creator: '当前用户' })
const silenceList = ref([
  { name: '维护期抑制', matchers: { ruleName: '订单同步延迟告警' }, startTime: '2026-06-14 02:00:00', endTime: '2026-06-14 04:00:00', creator: '张伟', status: 'active' },
  { name: '已知问题', matchers: { ruleName: '数据源连接失败', source: 'DataSource' }, startTime: '2026-06-11 00:00:00', endTime: '2026-06-18 23:59:59', creator: '李娜', status: 'active' }
])

function showSilenceDialog(row) {
  editingSilence.value = !!row
  if (row) Object.assign(silenceForm, { name: row.name, matchers: Object.entries(row.matchers).map(([k, v]) => ({ key: k, value: v })), startTime: row.startTime, endTime: row.endTime, creator: row.creator })
  else Object.assign(silenceForm, { name: '', matchers: [{ key: '', value: '' }], startTime: '', endTime: '', creator: '当前用户' })
  silenceVisible.value = true
}
function saveSilence() { ElMessage.success('抑制规则已保存'); silenceVisible.value = false }

// ===== Webhook =====
const webhookVisible = ref(false)
const webhookForm = reactive({ dingtalk: '', wechat: '', feishu: '', webhook: '', secret: '' })
function showWebhookDialog() { webhookVisible.value = true }
function saveWebhook() { ElMessage.success('Webhook 配置已保存'); webhookVisible.value = false }
function testWebhook() { ElMessage.success('测试消息已发送') }

function handleResize() { trendChart?.resize() }
onMounted(async () => {
  await nextTick()
  renderTrend()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.alert-page { display: flex; flex-direction: column; gap: 16px; }
.summary-card, .duty-card, .chart-card { border-radius: 8px; }
.summary-content { display: flex; justify-content: space-between; align-items: center; }
.summary-label { font-size: 13px; color: #8c8c8c; }
.summary-value { font-size: 28px; font-weight: 700; margin-top: 4px; }
.summary-sub { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; display: flex; align-items: center; gap: 6px; }
.chart-container { height: 200px; }
.duty-content { display: flex; align-items: center; gap: 12px; }
.duty-info { flex: 1; }
.duty-name { font-size: 16px; font-weight: 600; color: #262626; }
.duty-time { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.duty-stats { display: flex; justify-content: space-around; }
.ds-item { text-align: center; }
.ds-label { font-size: 12px; color: #8c8c8c; }
.ds-value { font-size: 18px; font-weight: 600; color: #1890ff; margin-top: 4px; }
.tab-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.alert-detail { padding: 0 20px; }
</style>
