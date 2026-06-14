<template>
  <div class="etl-page">
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

    <!-- 工具栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div>
          <el-button type="primary" :icon="Plus" @click="showDesigner()">新建ETL任务</el-button>
          <el-button :icon="VideoPlay" @click="runAll">全部执行</el-button>
          <el-button :icon="Refresh" @click="loadList">刷新</el-button>
        </div>
        <el-input v-model="searchKw" placeholder="搜索任务名称" :prefix-icon="Search" clearable style="width: 240px" />
      </div>
    </el-card>

    <!-- ETL 任务列表 -->
    <el-card shadow="never">
      <el-table :data="filteredList" stripe v-loading="loading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="id" label="任务ID" width="120" />
        <el-table-column prop="name" label="任务名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="showDesigner(row)">
              <el-icon><DataLine /></el-icon>
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="sourceDs" label="数据源" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="dsTypeTag(row.sourceDsType)">{{ row.sourceDs }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetDs" label="输出到" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ row.targetDs }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="流水线节点" min-width="280">
          <template #default="{ row }">
            <div class="pipeline">
              <template v-for="(node, idx) in row.nodes" :key="idx">
                <span class="node" :class="`node-${node.type}`">
                  <el-icon><component :is="nodeIcon(node.type)" /></el-icon>
                  {{ node.label }}
                </span>
                <el-icon v-if="idx < row.nodes.length - 1" class="arrow"><ArrowRight /></el-icon>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="schedule" label="调度" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.schedule }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastRun" label="最近执行" width="160">
          <template #default="{ row }">
            <div>{{ row.lastRun }}</div>
            <div style="font-size: 12px; color: #8c8c8c">耗时 {{ row.duration }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="dark">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="View" @click="viewLog(row)">日志</el-button>
            <el-button link type="primary" size="small" :icon="Edit" @click="showDesigner(row)">编辑</el-button>
            <el-button link type="warning" size="small" :icon="VideoPlay" @click="runTask(row)">运行</el-button>
            <el-button link type="success" size="small" :icon="Download" @click="downloadOutput(row)">下载结果</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteTask(row)">
              <template #reference>
                <el-button link type="danger" size="small" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ETL 设计器：可视化拖拽流水线 -->
    <el-dialog v-model="designerVisible" :title="editing ? '编辑ETL任务' : 'ETL 流水线设计器'" width="95%" top="3vh" destroy-on-close>
      <div class="etl-designer">
        <!-- 左侧：节点库 -->
        <div class="designer-left">
          <div class="left-title">节点库</div>
          <el-input v-model="leftKw" :prefix-icon="Search" placeholder="搜索节点" size="small" />
          <div class="node-categories">
            <div v-for="cat in nodeCategories" :key="cat.key" class="node-cat">
              <div class="cat-title">
                <el-icon><component :is="cat.icon" /></el-icon>
                {{ cat.label }}
              </div>
              <div
                v-for="node in filterNodes(cat.nodes)"
                :key="node.key"
                class="draggable-node"
                :class="`node-${node.type}`"
                draggable="true"
                @dragstart="dragStart($event, node)"
              >
                <el-icon><component :is="node.icon" /></el-icon>
                <div>
                  <div class="dn-name">{{ node.name }}</div>
                  <div class="dn-desc">{{ node.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：画布 -->
        <div class="designer-canvas">
          <div class="canvas-toolbar">
            <span class="canvas-title">{{ designerForm.name || '未命名ETL' }}</span>
            <div>
              <el-button size="small" :icon="Plus" @click="autoLayout">自动布局</el-button>
              <el-button size="small" :icon="VideoPlay" @click="runDesigner">测试运行</el-button>
              <el-button size="small" :icon="Check" @click="validatePipeline">校验</el-button>
            </div>
          </div>
          <div class="canvas-area" @drop="dropNode($event)" @dragover.prevent @dragenter.prevent>
            <div v-if="designerForm.nodes.length === 0" class="canvas-empty">
              <el-icon :size="64" color="#d9d9d9"><Promotion /></el-icon>
              <div class="empty-title">将左侧节点拖拽到此处开始构建流水线</div>
              <div class="empty-desc">从左侧节点库拖入"输入 → 清洗 → 转换 → 输出"节点</div>
            </div>
            <div v-else class="canvas-flow">
              <template v-for="(node, idx) in designerForm.nodes" :key="node.uid">
                <div class="flow-node" :class="`node-${node.type}`">
                  <div class="fn-header">
                    <el-icon><component :is="nodeIcon(node.type)" /></el-icon>
                    <span class="fn-type">{{ nodeTypeLabel(node.type) }}</span>
                    <el-button :icon="Delete" link size="small" @click="designerForm.nodes.splice(idx, 1)" />
                  </div>
                  <div class="fn-body" @click="selectNode(idx)">
                    <div class="fn-name">{{ node.name }}</div>
                    <div class="fn-config">{{ node.configHint }}</div>
                  </div>
                </div>
                <el-icon v-if="idx < designerForm.nodes.length - 1" class="flow-arrow"><ArrowRight /></el-icon>
              </template>
            </div>
          </div>
        </div>

        <!-- 右侧：节点配置 -->
        <div class="designer-right">
          <div class="right-title">任务配置</div>
          <el-form :model="designerForm" label-width="80px" size="small">
            <el-form-item label="任务名称" required>
              <el-input v-model="designerForm.name" />
            </el-form-item>
            <el-form-item label="任务编码" required>
              <el-input v-model="designerForm.code" />
            </el-form-item>
            <el-form-item label="调度策略">
              <el-select v-model="designerForm.schedule" style="width: 100%">
                <el-option label="手动触发" value="手动触发" />
                <el-option label="每5分钟" value="每5分钟" />
                <el-option label="每小时" value="每小时" />
                <el-option label="每天 02:00" value="每天02:00" />
                <el-option label="每周一 03:00" value="每周一03:00" />
                <el-option label="依赖上游" value="依赖上游" />
              </el-select>
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="designerForm.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
          <el-divider>选中节点配置</el-divider>
          <div v-if="selectedNode" class="node-config">
            <el-form label-width="80px" size="small">
              <el-form-item label="节点名称">
                <el-input v-model="selectedNode.name" />
              </el-form-item>
              <template v-if="selectedNode.type === 'input'">
                <el-form-item label="数据源">
                  <el-select v-model="selectedNode.config.source" style="width: 100%">
                    <el-option v-for="d in dataSources" :key="d" :label="d" :value="d" />
                  </el-select>
                </el-form-item>
                <el-form-item label="表名">
                  <el-input v-model="selectedNode.config.table" />
                </el-form-item>
                <el-form-item label="过滤条件">
                  <el-input v-model="selectedNode.config.filter" type="textarea" :rows="2" />
                </el-form-item>
              </template>
              <template v-if="selectedNode.type === 'transform'">
                <el-form-item label="转换类型">
                  <el-select v-model="selectedNode.config.transformType" style="width: 100%">
                    <el-option label="字段映射" value="mapping" />
                    <el-option label="字段计算" value="calculate" />
                    <el-option label="数据脱敏" value="mask" />
                    <el-option label="字段拆分" value="split" />
                    <el-option label="字段合并" value="merge" />
                  </el-select>
                </el-form-item>
                <el-form-item label="规则">
                  <el-input v-model="selectedNode.config.rule" type="textarea" :rows="3" placeholder="如：amount = price * quantity" />
                </el-form-item>
              </template>
              <template v-if="selectedNode.type === 'clean'">
                <el-form-item label="清洗规则">
                  <el-checkbox-group v-model="selectedNode.config.rules">
                    <el-checkbox value="null">去除空值</el-checkbox>
                    <el-checkbox value="duplicate">去重</el-checkbox>
                    <el-checkbox value="outlier">异常值</el-checkbox>
                    <el-checkbox value="format">格式化</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </template>
              <template v-if="selectedNode.type === 'join'">
                <el-form-item label="关联方式">
                  <el-radio-group v-model="selectedNode.config.joinType">
                    <el-radio value="inner">INNER</el-radio>
                    <el-radio value="left">LEFT</el-radio>
                    <el-radio value="right">RIGHT</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="关联字段">
                  <el-input v-model="selectedNode.config.on" placeholder="如：a.user_id = b.id" />
                </el-form-item>
              </template>
              <template v-if="selectedNode.type === 'output'">
                <el-form-item label="输出目标">
                  <el-select v-model="selectedNode.config.target" style="width: 100%">
                    <el-option v-for="d in dataSources" :key="d" :label="d" :value="d" />
                  </el-select>
                </el-form-item>
                <el-form-item label="写入方式">
                  <el-radio-group v-model="selectedNode.config.mode">
                    <el-radio value="overwrite">覆盖</el-radio>
                    <el-radio value="append">追加</el-radio>
                    <el-radio value="upsert">更新插入</el-radio>
                  </el-radio-group>
                </el-form-item>
              </template>
            </el-form>
          </div>
          <div v-else class="empty-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>点击画布中的节点进行配置</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="designerVisible = false">取消</el-button>
        <el-button @click="saveEtlDraft">存为草稿</el-button>
        <el-button type="primary" @click="saveEtl">保存并发布</el-button>
      </template>
    </el-dialog>

    <!-- 运行日志 -->
    <el-dialog v-model="logVisible" :title="`运行日志 - ${logTask?.name}`" width="900px">
      <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
        <el-descriptions-item label="任务ID">{{ logTask?.id }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ logTask?.lastRun }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ logTask?.duration }}</el-descriptions-item>
        <el-descriptions-item label="读取行数">{{ logTask?.rowsIn?.toLocaleString() || '-' }}</el-descriptions-item>
        <el-descriptions-item label="写出行数">{{ logTask?.rowsOut?.toLocaleString() || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusType(logTask?.status)" effect="dark">{{ statusText(logTask?.status) }}</el-tag></el-descriptions-item>
      </el-descriptions>
      <el-tabs v-model="logTab">
        <el-tab-pane label="节点详情" name="nodes">
          <el-table :data="logTask?.nodeLogs || []" border size="small">
            <el-table-column prop="name" label="节点" width="160" />
            <el-table-column prop="type" label="类型" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small" effect="dark">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rowsIn" label="入" width="100" align="right" />
            <el-table-column prop="rowsOut" label="出" width="100" align="right" />
            <el-table-column prop="duration" label="耗时" width="100" align="right" />
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="结束时间" width="160" />
            <el-table-column prop="message" label="说明" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="执行日志" name="log">
          <div class="log-content">
            <div v-for="(l, i) in mockLogs" :key="i" :class="['log-line', `log-${l.level}`]">
              <span class="log-time">{{ l.time }}</span>
              <span class="log-level">[{{ l.level.toUpperCase() }}]</span>
              <span class="log-msg">{{ l.msg }}</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus, Refresh, Search, View, Edit, VideoPlay, Download, Delete, ArrowRight,
  Check, InfoFilled, Promotion,
  DataLine, Coin, OfficeBuilding, Filter, DataAnalysis, Connection, Aim, Promotion as PromotionIcon
} from '@element-plus/icons-vue'

// ===== 统计 =====
const stats = [
  { label: 'ETL 任务数', value: '36', sub: '运行中 28', icon: 'DataLine', color: '#1890ff' },
  { label: '今日执行', value: '128', sub: '成功率 96%', icon: 'VideoPlay', color: '#52c41a' },
  { label: '数据产出', value: '1.2 GB', sub: '近 24h', icon: 'Coin', color: '#722ed1' },
  { label: '平均耗时', value: '3.2 s', sub: '较昨日 -8%', icon: 'DataAnalysis', color: '#fa8c16' }
]

// ===== 任务列表 =====
const loading = ref(false)
const searchKw = ref('')
const list = ref([
  { id: 'ETL001', name: '订单数据标准化', code: 'etl_order_std', sourceDs: '订单库-主库', sourceDsType: 'mysql', targetDs: '数仓-ADS层', schedule: '每5分钟', lastRun: '2026-06-14 14:30:00', duration: '12.5s', status: 'running', rowsIn: 285600, rowsOut: 282100, nodes: [{ type: 'input', label: 'MySQL' }, { type: 'clean', label: '清洗' }, { type: 'transform', label: '脱敏' }, { type: 'output', label: 'ADS' }] },
  { id: 'ETL002', name: '用户画像构建', code: 'etl_user_profile', sourceDs: '用户库', sourceDsType: 'mysql', targetDs: '画像库', schedule: '每天 02:00', lastRun: '2026-06-14 02:00:00', duration: '5分钟 32秒', status: 'success', rowsIn: 1285600, rowsOut: 1285600, nodes: [{ type: 'input', label: 'MySQL' }, { type: 'join', label: '关联' }, { type: 'transform', label: '计算' }, { type: 'clean', label: '清洗' }, { type: 'output', label: '画像库' }] },
  { id: 'ETL003', name: '销售日报聚合', code: 'etl_sales_daily', sourceDs: '订单明细', sourceDsType: 'mysql', targetDs: '报表数据集', schedule: '每小时', lastRun: '2026-06-14 14:00:00', duration: '8.2s', status: 'success', rowsIn: 28560, rowsOut: 156, nodes: [{ type: 'input', label: '订单' }, { type: 'transform', label: '聚合' }, { type: 'output', label: '报表' }] },
  { id: 'ETL004', name: '日志解析入库', code: 'etl_log_ingest', sourceDs: 'Kafka', sourceDsType: 'api', targetDs: '日志库', schedule: '实时', lastRun: '2026-06-14 14:32:00', duration: '0.5s', status: 'running', rowsIn: 12800, rowsOut: 12800, nodes: [{ type: 'input', label: 'Kafka' }, { type: 'transform', label: '解析' }, { type: 'clean', label: '清洗' }, { type: 'output', label: 'ES' }] },
  { id: 'ETL005', name: '财务数据合并', code: 'etl_finance_merge', sourceDs: '财务Oracle', sourceDsType: 'oracle', targetDs: '财务数仓', schedule: '每天 03:00', lastRun: '2026-06-14 03:00:00', duration: '2分钟 15秒', status: 'failed', rowsIn: 0, rowsOut: 0, nodes: [{ type: 'input', label: 'Oracle' }, { type: 'clean', label: '清洗' }, { type: 'join', label: '关联' }, { type: 'output', label: '数仓' }] },
  { id: 'ETL006', name: '库存数据同步', code: 'etl_inventory_sync', sourceDs: 'WMS系统', sourceDsType: 'api', targetDs: '库存库', schedule: '每30分钟', lastRun: '2026-06-14 14:00:00', duration: '15.6s', status: 'success', rowsIn: 12580, rowsOut: 12580, nodes: [{ type: 'input', label: 'API' }, { type: 'transform', label: '转换' }, { type: 'output', label: 'MySQL' }] }
])

const filteredList = computed(() => {
  if (!searchKw.value) return list.value
  return list.value.filter(t => t.name.includes(searchKw.value) || t.code.includes(searchKw.value))
})

function statusType(s) { return { running: 'primary', success: 'success', failed: 'danger', pending: 'info' }[s] || 'info' }
function statusText(s) { return { running: '运行中', success: '成功', failed: '失败', pending: '排队中' }[s] || s }
function dsTypeTag(t) { return { mysql: 'primary', oracle: 'danger', postgresql: 'info', sqlserver: 'warning', api: 'success', excel: 'info' }[t] || '' }
function loadList() {}

function runTask(row) { ElMessage.success(`已触发 ${row.name}`) }
function runAll() { ElMessage.info('已触发全部任务，按依赖顺序执行') }
function downloadOutput(row) { ElMessage.success('正在准备下载') }
function deleteTask(row) { list.value = list.value.filter(t => t.id !== row.id); ElMessage.success('已删除') }

// ===== 节点库 =====
const leftKw = ref('')
const nodeCategories = [
  { key: 'io', label: '输入/输出', icon: 'Connection', nodes: [
    { key: 'mysql_input', name: 'MySQL 输入', type: 'input', icon: 'Coin', desc: '从 MySQL 读取' },
    { key: 'oracle_input', name: 'Oracle 输入', type: 'input', icon: 'Coin', desc: '从 Oracle 读取' },
    { key: 'api_input', name: 'API 输入', type: 'input', icon: 'Connection', desc: '调用 REST API' },
    { key: 'excel_input', name: 'Excel 输入', type: 'input', icon: 'OfficeBuilding', desc: '读取 Excel/CSV' },
    { key: 'kafka_input', name: 'Kafka 输入', type: 'input', icon: 'DataLine', desc: '消费 Kafka 消息' },
    { key: 'mysql_output', name: 'MySQL 输出', type: 'output', icon: 'Coin', desc: '写入 MySQL' },
    { key: 'es_output', name: 'Elasticsearch 输出', type: 'output', icon: 'Coin', desc: '写入 ES' },
    { key: 'hdfs_output', name: 'HDFS 输出', type: 'output', icon: 'Coin', desc: '写入 HDFS' }
  ] },
  { key: 'transform', label: '数据转换', icon: 'DataAnalysis', nodes: [
    { key: 'mapping', name: '字段映射', type: 'transform', icon: 'DataAnalysis', desc: '字段重命名/类型转换' },
    { key: 'calculate', name: '字段计算', type: 'transform', icon: 'DataAnalysis', desc: '表达式计算' },
    { key: 'mask', name: '数据脱敏', type: 'transform', icon: 'DataAnalysis', desc: '手机号/身份证脱敏' },
    { key: 'split', name: '字段拆分', type: 'transform', icon: 'DataAnalysis', desc: '一列拆多列' },
    { key: 'merge', name: '字段合并', type: 'transform', icon: 'DataAnalysis', desc: '多列合一' },
    { key: 'join', name: '关联', type: 'join', icon: 'Aim', desc: 'JOIN 操作' }
  ] },
  { key: 'clean', label: '数据清洗', icon: 'Filter', nodes: [
    { key: 'null_clean', name: '空值处理', type: 'clean', icon: 'Filter', desc: '填充/删除空值' },
    { key: 'dedup', name: '去重', type: 'clean', icon: 'Filter', desc: '按字段去重' },
    { key: 'outlier', name: '异常值', type: 'clean', icon: 'Filter', desc: '3σ/分位点过滤' },
    { key: 'format', name: '格式化', type: 'clean', icon: 'Filter', desc: '日期/字符串格式化' }
  ] }
]
function filterNodes(nodes) {
  if (!leftKw.value) return nodes
  return nodes.filter(n => n.name.includes(leftKw.value) || n.desc.includes(leftKw.value))
}
function nodeIcon(type) { return { input: 'Connection', output: 'Promotion', transform: 'DataAnalysis', clean: 'Filter', join: 'Aim' }[type] || 'Document' }
function nodeTypeLabel(type) { return { input: '输入', output: '输出', transform: '转换', clean: '清洗', join: '关联' }[type] || type }

// ===== 设计器 =====
const designerVisible = ref(false)
const editing = ref(false)
const designerForm = reactive({ id: null, name: '', code: '', schedule: '每天 02:00', description: '', nodes: [] })
const dataSources = ['订单库-主库', '用户库-从库', '财务Oracle', '数仓-ADS层', '画像库', '日志库', 'Kafka', 'WMS系统']
const selectedNodeIdx = ref(-1)
const selectedNode = computed(() => selectedNodeIdx.value >= 0 ? designerForm.nodes[selectedNodeIdx.value] : null)

function showDesigner(row) {
  editing.value = !!row
  if (row) Object.assign(designerForm, row, { nodes: row.nodes.map((n, i) => ({ ...n, uid: i + 1, config: getDefaultConfig(n.type) })) })
  else Object.assign(designerForm, { id: null, name: '', code: '', schedule: '每天 02:00', description: '', nodes: [] })
  selectedNodeIdx.value = -1
  designerVisible.value = true
}

function getDefaultConfig(type) {
  const map = {
    input: { source: '', table: '', filter: '' },
    transform: { transformType: 'mapping', rule: '' },
    clean: { rules: ['null', 'duplicate'] },
    join: { joinType: 'inner', on: '' },
    output: { target: '', mode: 'overwrite' }
  }
  return map[type] || {}
}

let dragNode = null
function dragStart(e, node) { dragNode = node }
function dropNode(e) {
  if (!dragNode) return
  const newNode = {
    uid: Date.now() + Math.random(),
    type: dragNode.type,
    name: dragNode.name,
    configHint: dragNode.desc,
    config: getDefaultConfig(dragNode.type)
  }
  designerForm.nodes.push(newNode)
  selectedNodeIdx.value = designerForm.nodes.length - 1
  dragNode = null
}
function selectNode(idx) { selectedNodeIdx.value = idx }
function autoLayout() { ElMessage.success('已自动布局') }
function runDesigner() { ElMessage.info('测试运行已开始，结果在日志中查看') }
function validatePipeline() {
  if (designerForm.nodes.length < 2) { ElMessage.warning('至少需要 2 个节点（输入+输出）'); return }
  if (designerForm.nodes[0].type !== 'input') { ElMessage.error('第一个节点必须是"输入"'); return }
  if (designerForm.nodes[designerForm.nodes.length - 1].type !== 'output') { ElMessage.error('最后一个节点必须是"输出"'); return }
  ElMessage.success('流水线校验通过')
}
function saveEtl() { ElMessage.success('ETL任务已发布'); designerVisible.value = false }
function saveEtlDraft() { ElMessage.success('已保存为草稿'); designerVisible.value = false }

// ===== 运行日志 =====
const logVisible = ref(false)
const logTask = ref(null)
const logTab = ref('nodes')
const mockLogs = ref([])
function viewLog(row) {
  logTask.value = row
  logTask.value.nodeLogs = row.nodes.map((n, i) => ({
    name: n.label, type: nodeTypeLabel(n.type), status: row.status === 'failed' && i === row.nodes.length - 1 ? 'failed' : 'success',
    rowsIn: row.rowsIn, rowsOut: i === row.nodes.length - 1 ? row.rowsOut : row.rowsIn,
    duration: ['2.1s', '0.8s', '5.3s', '0.2s', '4.1s'][i] || '0.5s',
    startTime: row.lastRun, endTime: row.lastRun,
    message: i === row.nodes.length - 1 && row.status === 'failed' ? '执行失败：连接超时' : '执行成功'
  }))
  mockLogs.value = [
    { time: row.lastRun, level: 'info', msg: `[${row.id}] 任务开始执行` },
    { time: row.lastRun, level: 'info', msg: `加载配置：${row.schedule}` },
    { time: row.lastRun, level: 'info', msg: `连接数据源 ${row.sourceDs} 成功` },
    { time: row.lastRun, level: 'info', msg: `开始执行节点1: ${row.nodes[0]?.label}` },
    { time: row.lastRun, level: 'info', msg: `读取 ${row.rowsIn?.toLocaleString()} 行数据` },
    { time: row.lastRun, level: 'info', msg: `执行节点2: ${row.nodes[1]?.label}` },
    ...(row.status === 'failed' ? [{ time: row.lastRun, level: 'error', msg: `节点 ${row.nodes[2]?.label} 执行失败：connection timeout` }, { time: row.lastRun, level: 'error', msg: `任务执行失败` }] : [{ time: row.lastRun, level: 'info', msg: `写出 ${row.rowsOut?.toLocaleString()} 行数据` }, { time: row.lastRun, level: 'success', msg: `任务执行成功，耗时 ${row.duration}` }])
  ]
  logVisible.value = true
}
</script>

<style scoped>
.etl-page { display: flex; flex-direction: column; gap: 16px; }
.stat-card, .toolbar-card { border-radius: 8px; }
.stat-content { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 13px; color: #8c8c8c; }
.stat-value { font-size: 24px; font-weight: 700; color: #262626; margin-top: 6px; }
.stat-sub { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.pipeline { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.node { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.node-input { background: #e6f7ff; color: #1890ff; }
.node-output { background: #f6ffed; color: #52c41a; }
.node-transform { background: #f9f0ff; color: #722ed1; }
.node-clean { background: #fff7e6; color: #fa8c16; }
.node-join { background: #e6fffb; color: #13c2c2; }
.arrow { color: #8c8c8c; font-size: 14px; }

/* 设计器 */
.etl-designer { display: flex; height: 70vh; gap: 12px; }
.designer-left { width: 240px; background: #fafafa; border-radius: 6px; padding: 12px; overflow-y: auto; }
.left-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #262626; }
.node-categories { margin-top: 12px; }
.node-cat { margin-bottom: 16px; }
.cat-title { font-size: 12px; color: #8c8c8c; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
.draggable-node { background: #fff; border: 1px solid #e8e8e8; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; cursor: grab; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
.draggable-node:hover { border-color: #1890ff; background: #e6f7ff; }
.dn-name { font-size: 13px; color: #262626; font-weight: 500; }
.dn-desc { font-size: 11px; color: #8c8c8c; }

.designer-canvas { flex: 1; background: #f5f5f5; border-radius: 6px; display: flex; flex-direction: column; }
.canvas-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border-radius: 6px 6px 0 0; border-bottom: 1px solid #e8e8e8; }
.canvas-title { font-size: 15px; font-weight: 600; color: #262626; }
.canvas-area { flex: 1; padding: 24px; overflow: auto; display: flex; align-items: center; justify-content: center; }
.canvas-empty { text-align: center; color: #bfbfbf; }
.empty-title { font-size: 16px; color: #8c8c8c; margin-top: 16px; }
.empty-desc { font-size: 13px; margin-top: 8px; }
.canvas-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.flow-node { background: #fff; border: 2px solid #1890ff; border-radius: 8px; min-width: 160px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.flow-node.node-input { border-color: #1890ff; }
.flow-node.node-output { border-color: #52c41a; }
.flow-node.node-transform { border-color: #722ed1; }
.flow-node.node-clean { border-color: #fa8c16; }
.flow-node.node-join { border-color: #13c2c2; }
.fn-header { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; background: #fafafa; border-radius: 6px 6px 0 0; }
.fn-type { flex: 1; font-size: 12px; color: #8c8c8c; }
.fn-body { padding: 10px; cursor: pointer; }
.fn-name { font-size: 14px; font-weight: 500; color: #262626; }
.fn-config { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.flow-arrow { font-size: 20px; color: #bfbfbf; }

.designer-right { width: 280px; background: #fafafa; border-radius: 6px; padding: 12px; overflow-y: auto; }
.right-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #262626; }
.empty-tip { display: flex; align-items: center; gap: 6px; color: #bfbfbf; font-size: 13px; padding: 20px 0; }
.log-content { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.8; max-height: 500px; overflow: auto; }
.log-line { display: flex; gap: 8px; }
.log-time { color: #8c8c8c; }
.log-level { font-weight: 600; }
.log-info .log-level { color: #4fc1ff; }
.log-success .log-level { color: #52c41a; }
.log-error .log-level { color: #ff6b6b; }
</style>
