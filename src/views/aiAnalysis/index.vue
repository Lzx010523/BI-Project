<template>
  <div class="ai-page">
    <el-row :gutter="16">
      <!-- 左侧：对话区 -->
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="chat-card">
          <template #header>
            <div class="chat-header">
              <div class="title-area">
                <el-icon :size="20" color="#1890ff"><MagicStick /></el-icon>
                <span class="title">智能问数</span>
                <el-tag type="success" size="small" effect="dark">通义千问 / GPT 双模型</el-tag>
              </div>
              <div>
                <el-select v-model="currentModel" size="small" style="width: 160px">
                  <el-option label="通义千问 Qwen-Plus" value="qwen-plus" />
                  <el-option label="通义千问 Qwen-Max" value="qwen-max" />
                  <el-option label="GPT-4o" value="gpt-4o" />
                  <el-option label="DeepSeek-V3" value="deepseek" />
                </el-select>
                <el-button :icon="Delete" text @click="clearChat" style="margin-left: 8px">清空</el-button>
              </div>
            </div>
          </template>

          <div class="chat-list" ref="chatListRef">
            <!-- 欢迎语 -->
            <div v-if="messages.length === 0" class="welcome">
              <el-icon :size="56" color="#1890ff"><MagicStick /></el-icon>
              <div class="welcome-title">您好，我是您的数据分析助手</div>
              <div class="welcome-desc">用自然语言提问，自动生成 SQL 与图表。例如：</div>
              <div class="example-list">
                <el-tag
                  v-for="(q, i) in exampleQuestions"
                  :key="i"
                  class="example-tag"
                  @click="useExample(q)"
                  effect="plain"
                >
                  {{ q }}
                </el-tag>
              </div>
            </div>

            <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
              <el-avatar :size="36" :style="{ background: msg.role === 'user' ? '#1890ff' : 'linear-gradient(135deg,#722ed1,#531dab)' }">
                {{ msg.role === 'user' ? userStore.username?.charAt(0)?.toUpperCase() || 'U' : 'AI' }}
              </el-avatar>
              <div class="msg-content">
                <div class="msg-text">{{ msg.text }}</div>
                <!-- 生成的图表 -->
                <div v-if="msg.chart" class="msg-chart">
                  <div ref="chartRefs" class="chart" :id="`ai-chart-${idx}`" style="height: 280px"></div>
                </div>
                <!-- 生成的 SQL -->
                <div v-if="msg.sql" class="msg-sql">
                  <div class="sql-header">
                    <span><el-icon><DocumentCopy /></el-icon> 生成的 SQL</span>
                    <el-button link type="primary" size="small" @click="copyText(msg.sql)">复制</el-button>
                  </div>
                  <pre>{{ msg.sql }}</pre>
                </div>
                <!-- 表格结果 -->
                <div v-if="msg.table" class="msg-table">
                  <el-table :data="msg.table.rows" border size="small" max-height="240">
                    <el-table-column v-for="col in msg.table.columns" :key="col" :prop="col" :label="col" />
                  </el-table>
                </div>
                <!-- 推荐追问 -->
                <div v-if="msg.followUp?.length" class="follow-up">
                  <span class="follow-label">您可能还想问：</span>
                  <el-tag
                    v-for="(q, i) in msg.followUp"
                    :key="i"
                    size="small"
                    class="follow-tag"
                    @click="ask(q)"
                    effect="plain"
                  >
                    {{ q }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div v-if="loading" class="message assistant">
              <el-avatar :size="36" style="background: linear-gradient(135deg,#722ed1,#531dab)">AI</el-avatar>
              <div class="msg-content">
                <div class="msg-text typing">
                  <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区 -->
          <div class="input-area">
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="2"
              placeholder="请输入您的问题，例如：上个月各地区销售额对比"
              @keydown.ctrl.enter="ask()"
              :disabled="loading"
            />
            <div class="input-actions">
              <span class="hint">按 Ctrl + Enter 发送</span>
              <el-button type="primary" :icon="Promotion" :loading="loading" @click="ask()" :disabled="!inputText.trim()">发送</el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：历史与分析 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="side-card">
          <template #header>
            <span class="card-title">最近会话</span>
          </template>
          <div class="history-list">
            <div
              v-for="(h, i) in histories"
              :key="i"
              class="history-item"
              @click="useExample(h.question)"
            >
              <el-icon><ChatLineRound /></el-icon>
              <span class="hi-text">{{ h.question }}</span>
              <span class="hi-time">{{ h.time }}</span>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="side-card">
          <template #header>
            <span class="card-title">使用统计</span>
          </template>
          <div class="usage-stat">
            <div class="us-item">
              <div class="us-num">328</div>
              <div class="us-label">本月提问</div>
            </div>
            <div class="us-item">
              <div class="us-num">95.2%</div>
              <div class="us-label">回答准确率</div>
            </div>
            <div class="us-item">
              <div class="us-num">2.3s</div>
              <div class="us-label">平均响应</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  MagicStick, Promotion, Delete, DocumentCopy, ChatLineRound
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

// ===== 状态 =====
const currentModel = ref('qwen-plus')
const inputText = ref('')
const loading = ref(false)
const messages = ref([])
const chartRefs = ref([])
const chatListRef = ref(null)

// ===== 示例问题 =====
const exampleQuestions = [
  '上个月各地区销售额对比',
  '本月新增用户趋势',
  'TOP10 热销商品',
  '各部门绩效完成率',
  '用户留存率分析'
]

// ===== 历史 =====
const histories = ref([
  { question: '上个月各地区销售额对比', time: '10:30' },
  { question: '本月 GMV 同比环比', time: '09:15' },
  { question: '退款订单分析', time: '昨天' },
  { question: '华东区用户画像', time: '昨天' }
])

// ===== 模拟 AI 回复 =====
const answerTemplates = [
  {
    keywords: ['地区', '区域', 'sales', 'region'],
    text: '已为您分析上个月各地区销售额，请看下方图表：',
    chart: { type: 'bar', title: '各地区销售额对比' },
    sql: `SELECT region, SUM(amount) AS total_amount
FROM orders
WHERE create_time BETWEEN '2026-05-01' AND '2026-05-31'
  AND status = 'paid'
GROUP BY region
ORDER BY total_amount DESC;`,
    table: {
      columns: ['地区', '销售额(万元)', '订单数', '同比'],
      rows: [
        { '地区': '华东', '销售额(万元)': 128.5, '订单数': 8560, '同比': '+12.3%' },
        { '地区': '华南', '销售额(万元)': 98.2, '订单数': 6320, '同比': '+8.5%' },
        { '地区': '华北', '销售额(万元)': 85.6, '订单数': 5480, '同比': '-2.1%' },
        { '地区': '华中', '销售额(万元)': 62.3, '订单数': 4120, '同比': '+15.6%' },
        { '地区': '西南', '销售额(万元)': 45.8, '订单数': 3210, '同比': '+5.2%' }
      ]
    },
    followUp: ['华东地区增长原因分析', '对比去年同月数据', 'TOP 客户贡献占比']
  },
  {
    keywords: ['用户', 'user', '增长', '新增'],
    text: '本月新增用户趋势已生成，整体呈上升趋势：',
    chart: { type: 'line', title: '本月新增用户趋势' },
    sql: `SELECT DATE(create_time) AS date, COUNT(*) AS new_users
FROM users
WHERE create_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
GROUP BY DATE(create_time);`,
    followUp: ['用户来源渠道分布', '新用户次日留存', '高价值新用户占比']
  },
  {
    keywords: ['商品', 'product', 'top', '热销'],
    text: '本月 TOP10 热销商品如下：',
    chart: { type: 'pie', title: 'TOP10 热销商品占比' },
    followUp: ['商品类目销售对比', '滞销商品清单', '商品连带率分析']
  }
]

function mockAnswer(question) {
  for (const tpl of answerTemplates) {
    if (tpl.keywords.some(k => question.toLowerCase().includes(k.toLowerCase()))) {
      return tpl
    }
  }
  return {
    text: '已根据您的问题生成分析结果：',
    chart: { type: 'bar', title: '分析结果' },
    sql: `SELECT *
FROM analysis_result
WHERE condition = 'default'
LIMIT 10;`,
    followUp: ['查看明细数据', '对比历史数据', '保存为报表']
  }
}

// ===== 发送问题 =====
async function ask(q) {
  const text = (q || inputText.value).trim()
  if (!text) return
  if (q) inputText.value = q

  messages.value.push({ role: 'user', text })
  inputText.value = ''
  loading.value = true
  scrollToBottom()

  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))

  const tpl = mockAnswer(text)
  // 模拟图表数据
  let chartData = null
  if (tpl.chart) {
    if (tpl.chart.type === 'pie') {
      chartData = {
        type: 'pie',
        data: [
          { name: '智能手机Pro', value: 856 },
          { name: '无线耳机X3', value: 743 },
          { name: '平板Air', value: 621 },
          { name: '机械键盘', value: 580 },
          { name: '4K显示器', value: 524 }
        ]
      }
    } else if (tpl.chart.type === 'line') {
      chartData = {
        type: 'line',
        x: Array.from({ length: 30 }, (_, i) => `${i + 1}日`),
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 500) + 100)
      }
    } else {
      chartData = {
        type: 'bar',
        x: ['华东', '华南', '华北', '华中', '西南', '西北', '东北'],
        data: tpl.table?.rows?.map(r => r['销售额(万元)']) || [128, 98, 85, 62, 45, 32, 28]
      }
    }
  }

  messages.value.push({
    role: 'assistant',
    text: tpl.text,
    chart: chartData,
    sql: tpl.sql,
    table: tpl.table,
    followUp: tpl.followUp
  })

  loading.value = false
  await nextTick()
  renderAllCharts()
  scrollToBottom()
}

function useExample(q) { ask(q) }
function clearChat() {
  messages.value = []
  ElMessage.success('已清空对话')
}

// ===== 渲染图表 =====
function renderAllCharts() {
  messages.value.forEach((msg, idx) => {
    if (!msg.chart) return
    const el = document.getElementById(`ai-chart-${idx}`)
    if (!el) return
    const inst = echarts.init(el)
    let option
    if (msg.chart.type === 'pie') {
      option = {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: ['35%', '65%'],
          data: msg.chart.data,
          label: { formatter: '{b}: {d}%' }
        }]
      }
    } else if (msg.chart.type === 'line') {
      option = {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: msg.chart.x, boundaryGap: false },
        yAxis: { type: 'value' },
        series: [{
          type: 'line',
          smooth: true,
          data: msg.chart.data,
          areaStyle: { color: 'rgba(24,144,255,0.3)' },
          itemStyle: { color: '#1890ff' }
        }]
      }
    } else {
      option = {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: msg.chart.x },
        yAxis: { type: 'value' },
        series: [{
          type: 'bar',
          data: msg.chart.data,
          itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
          barWidth: '40%'
        }]
      }
    }
    inst.setOption(option)
  })
}

// ===== 工具 =====
function copyText(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

function scrollToBottom() {
  nextTick(() => {
    if (chatListRef.value) chatListRef.value.scrollTop = chatListRef.value.scrollHeight
  })
}

onMounted(() => {
  // 不自动加载示例，避免每次进入都"自问自答"
})
</script>

<style scoped>
.ai-page { display: flex; flex-direction: column; gap: 16px; }
.chat-card { height: calc(100vh - 200px); display: flex; flex-direction: column; border-radius: 8px; }
.chat-card :deep(.el-card__body) { flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.chat-header { display: flex; justify-content: space-between; align-items: center; }
.title-area { display: flex; align-items: center; gap: 8px; }
.title { font-size: 15px; font-weight: 600; color: #262626; }

.chat-list { flex: 1; overflow-y: auto; padding: 20px; background: #fafafa; }
.welcome { text-align: center; padding: 40px 20px; }
.welcome-title { font-size: 18px; font-weight: 600; color: #262626; margin: 16px 0 8px; }
.welcome-desc { font-size: 13px; color: #8c8c8c; margin-bottom: 16px; }
.example-list { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 600px; margin: 0 auto; }
.example-tag { cursor: pointer; transition: all 0.2s; }
.example-tag:hover { background: #e6f7ff; border-color: #1890ff; color: #1890ff; }

.message { display: flex; gap: 12px; margin-bottom: 20px; }
.message.user { flex-direction: row-reverse; }
.message.user .msg-content { align-items: flex-end; }
.msg-content { max-width: 75%; display: flex; flex-direction: column; gap: 8px; }
.msg-text { background: #fff; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #262626; box-shadow: 0 1px 3px rgba(0,0,0,0.05); word-break: break-word; }
.message.user .msg-text { background: #1890ff; color: #fff; }
.msg-chart, .msg-sql, .msg-table { background: #fff; padding: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.sql-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; color: #666; }
.sql-header span { display: flex; align-items: center; gap: 4px; }
.msg-sql pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.6; overflow-x: auto; margin: 0; }
.follow-up { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.follow-label { font-size: 12px; color: #8c8c8c; }
.follow-tag { cursor: pointer; }

.typing { display: flex; gap: 4px; padding: 14px; }
.dot { width: 6px; height: 6px; background: #1890ff; border-radius: 50%; animation: typing 1.4s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

.input-area { padding: 12px 16px; background: #fff; border-top: 1px solid #f0f0f0; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.hint { font-size: 12px; color: #bfbfbf; }

.side-card { border-radius: 8px; margin-bottom: 16px; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.history-item:hover { background: #f5f5f5; }
.hi-text { flex: 1; color: #262626; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hi-time { font-size: 12px; color: #bfbfbf; flex-shrink: 0; }
.usage-stat { display: flex; justify-content: space-around; }
.us-item { text-align: center; }
.us-num { font-size: 22px; font-weight: 700; color: #1890ff; }
.us-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }
</style>
