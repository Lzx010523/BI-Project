<template>
  <div class="datasource-page">
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
          <el-button type="primary" :icon="Plus" @click="showDialog()">新增数据源</el-button>
          <el-button :icon="Connection" @click="testAll">测试全部连接</el-button>
          <el-button :icon="Refresh" @click="loadList">刷新</el-button>
        </div>
        <el-input v-model="searchKw" placeholder="搜索数据源名称" :prefix-icon="Search" clearable style="width: 240px" />
      </div>
    </el-card>

    <!-- 数据源卡片网格 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="ds in filteredList" :key="ds.id">
        <el-card shadow="hover" class="ds-card" :class="`ds-${ds.status}`">
          <div class="ds-header">
            <div class="ds-icon" :style="{ background: getTypeColor(ds.type) }">
              <el-icon :size="20" color="#fff"><component :is="getTypeIcon(ds.type)" /></el-icon>
            </div>
            <div class="ds-meta">
              <div class="ds-name">{{ ds.name }}</div>
              <el-tag size="small" :type="getStatusType(ds.status)">{{ getStatusText(ds.status) }}</el-tag>
            </div>
          </div>
          <div class="ds-info">
            <div class="info-row"><span>类型</span><b>{{ ds.typeLabel }}</b></div>
            <div class="info-row"><span>主机</span><b>{{ ds.host }}:{{ ds.port }}</b></div>
            <div class="info-row"><span>数据库</span><b>{{ ds.database }}</b></div>
            <div class="info-row"><span>同步方式</span><b>{{ ds.syncMode }}</b></div>
            <div class="info-row"><span>最近同步</span><b>{{ ds.lastSync }}</b></div>
          </div>
          <div class="ds-stats">
            <div class="ds-stat-item">
              <div class="num">{{ ds.tableCount }}</div>
              <div class="label">表数</div>
            </div>
            <div class="ds-stat-item">
              <div class="num">{{ formatSize(ds.dataSize) }}</div>
              <div class="label">数据量</div>
            </div>
            <div class="ds-stat-item">
              <div class="num">{{ ds.healthScore }}%</div>
              <div class="label">健康度</div>
            </div>
          </div>
          <div class="ds-actions">
            <el-button size="small" :icon="Connection" @click="testConnection(ds)" :loading="testingIds.includes(ds.id)">测试</el-button>
            <el-button size="small" :icon="View" @click="showSchema(ds)">Schema</el-button>
            <el-button size="small" :icon="Edit" @click="showDialog(ds)">编辑</el-button>
            <el-popconfirm title="确定删除该数据源？" @confirm="deleteDs(ds)">
              <template #reference>
                <el-button size="small" type="danger" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑数据源' : '新增数据源'" width="720px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="数据源类型" prop="type">
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio-button value="mysql">MySQL</el-radio-button>
            <el-radio-button value="oracle">Oracle</el-radio-button>
            <el-radio-button value="postgresql">PostgreSQL</el-radio-button>
            <el-radio-button value="sqlserver">SQLServer</el-radio-button>
            <el-radio-button value="excel">Excel</el-radio-button>
            <el-radio-button value="api">REST API</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="数据源显示名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编码" prop="code">
              <el-input v-model="form.code" placeholder="唯一编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <template v-if="form.type !== 'api' && form.type !== 'excel'">
          <el-row :gutter="16">
            <el-col :span="14">
              <el-form-item label="主机" prop="host">
                <el-input v-model="form.host" placeholder="127.0.0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="端口" prop="port">
                <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="数据库" prop="database">
            <el-input v-model="form.database" placeholder="数据库名" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="form.username" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="密码" prop="password">
                <el-input v-model="form.password" type="password" show-password />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
        <template v-else-if="form.type === 'excel'">
          <el-form-item label="文件">
            <el-upload :auto-upload="false" :limit="1" accept=".xlsx,.xls,.csv">
              <el-button :icon="Upload">选择文件</el-button>
            </el-upload>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="接口地址" prop="host">
            <el-input v-model="form.host" placeholder="https://api.example.com/data" />
          </el-form-item>
          <el-form-item label="请求方式">
            <el-radio-group v-model="form.syncMode">
              <el-radio value="GET">GET</el-radio>
              <el-radio value="POST">POST</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="同步方式">
              <el-select v-model="form.syncMode" style="width: 100%">
                <el-option label="实时同步" value="实时同步" />
                <el-option label="定时同步(5分钟)" value="定时5分钟" />
                <el-option label="定时同步(1小时)" value="定时1小时" />
                <el-option label="手动同步" value="手动" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="描述">
              <el-input v-model="form.description" placeholder="数据源用途说明" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="testForm">测试连接</el-button>
        <el-button type="primary" @click="saveDs">保存</el-button>
      </template>
    </el-dialog>

    <!-- Schema 浏览 -->
    <el-dialog v-model="schemaVisible" :title="`Schema 浏览 - ${schemaDs?.name || ''}`" width="900px">
      <el-input v-model="tableKw" placeholder="搜索表名" :prefix-icon="Search" clearable style="width: 240px; margin-bottom: 12px" />
      <el-table :data="filteredTables" border size="small" :default-expand-all="false">
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-table :data="row.columns" size="small" border>
              <el-table-column prop="name" label="列名" width="160" />
              <el-table-column prop="type" label="类型" width="120" />
              <el-table-column prop="nullable" label="可空" width="80" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.nullable ? 'warning' : 'success'">{{ row.nullable ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="注释" />
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="表名" width="200" />
        <el-table-column prop="comment" label="表注释" />
        <el-table-column prop="rows" label="行数" width="120" align="right" />
        <el-table-column prop="size" label="大小" width="100" align="right">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, Refresh, Plus, Edit, Delete, View,
  Connection, Upload,
  Coin, DataLine, Document, Connection as HttpIcon,
  Histogram, ChatLineRound, DataBoard
} from '@element-plus/icons-vue'

// ===== 统计 =====
const stats = [
  { label: '数据源总数', value: '12', sub: '含 5 类', icon: 'DataBoard', color: '#1890ff' },
  { label: '运行中', value: '10', icon: 'Coin', color: '#52c41a' },
  { label: '同步失败', value: '1', sub: '需处理', icon: 'DataLine', color: '#ff4d4f' },
  { label: '总数据量', value: '128.5 GB', icon: 'Histogram', color: '#fa8c16' }
]

// ===== 数据源列表 =====
const list = ref([
  { id: 1, name: '订单库-主库', code: 'mysql_order_main', type: 'mysql', typeLabel: 'MySQL', host: '192.168.1.10', port: 3306, database: 'bi_order', username: 'bi_read', password: '***', syncMode: '实时同步', lastSync: '2 分钟前', tableCount: 28, dataSize: 12.5 * 1024 * 1024 * 1024, healthScore: 98, status: 'online', description: '主订单库，核心业务数据' },
  { id: 2, name: '用户库-从库', code: 'mysql_user_slave', type: 'mysql', typeLabel: 'MySQL', host: '192.168.1.11', port: 3306, database: 'bi_user', username: 'bi_read', password: '***', syncMode: '定时5分钟', lastSync: '5 分钟前', tableCount: 16, dataSize: 8.2 * 1024 * 1024 * 1024, healthScore: 95, status: 'online', description: '用户主数据' },
  { id: 3, name: '财务Oracle', code: 'oracle_finance', type: 'oracle', typeLabel: 'Oracle', host: '192.168.2.20', port: 1521, database: 'ORCL', username: 'fin_read', password: '***', syncMode: '定时1小时', lastSync: '38 分钟前', tableCount: 64, dataSize: 45.6 * 1024 * 1024 * 1024, healthScore: 88, status: 'online', description: '财务核算系统' },
  { id: 4, name: '日志-Elasticsearch', code: 'es_log', type: 'postgresql', typeLabel: 'PostgreSQL', host: '192.168.3.30', port: 5432, database: 'logs', username: 'log_read', password: '***', syncMode: '实时同步', lastSync: '10 秒前', tableCount: 8, dataSize: 56.8 * 1024 * 1024 * 1024, healthScore: 92, status: 'online', description: '系统日志/行为日志' },
  { id: 5, name: 'CRM-SQLServer', code: 'mssql_crm', type: 'sqlserver', typeLabel: 'SQLServer', host: '192.168.4.40', port: 1433, database: 'CRM_DB', username: 'crm', password: '***', syncMode: '定时1小时', lastSync: '1 小时前', tableCount: 22, dataSize: 4.3 * 1024 * 1024 * 1024, healthScore: 75, status: 'warning', description: 'CRM 客户关系管理' },
  { id: 6, name: '线下门店Excel', code: 'excel_store', type: 'excel', typeLabel: 'Excel', host: '', port: null, database: '', username: '', password: '', syncMode: '手动', lastSync: '昨天 18:20', tableCount: 5, dataSize: 12 * 1024 * 1024, healthScore: 100, status: 'online', description: '线下门店日报数据' },
  { id: 7, name: '微信小程序API', code: 'api_wx_mp', type: 'api', typeLabel: 'REST API', host: 'https://api.weixin.qq.com/data', port: null, database: '', username: '', password: '', syncMode: '定时1小时', lastSync: '失败', tableCount: 0, dataSize: 0, healthScore: 0, status: 'error', description: '微信小程序开放数据' },
  { id: 8, name: '数仓-ADS层', code: 'mysql_dw_ads', type: 'mysql', typeLabel: 'MySQL', host: '192.168.5.50', port: 3306, database: 'dw_ads', username: 'bi_read', password: '***', syncMode: '实时同步', lastSync: '1 分钟前', tableCount: 35, dataSize: 18.2 * 1024 * 1024 * 1024, healthScore: 99, status: 'online', description: '数据仓库 ADS 层' }
])

// ===== 过滤 =====
const searchKw = ref('')
const filteredList = computed(() => {
  if (!searchKw.value) return list.value
  return list.value.filter(d => d.name.includes(searchKw.value) || d.code.includes(searchKw.value))
})

// ===== 状态 =====
function getStatusType(s) { return { online: 'success', warning: 'warning', error: 'danger', offline: 'info' }[s] }
function getStatusText(s) { return { online: '运行中', warning: '异常', error: '失败', offline: '已下线' }[s] }
function getTypeColor(t) {
  return { mysql: 'linear-gradient(135deg,#00758f,#00556f)', oracle: 'linear-gradient(135deg,#f80000,#c00)', postgresql: 'linear-gradient(135deg,#336791,#264b6d)', sqlserver: 'linear-gradient(135deg,#cc2927,#a31c1a)', excel: 'linear-gradient(135deg,#1d6f42,#155232)', api: 'linear-gradient(135deg,#ff6b35,#d9531c)' }[t]
}
function getTypeIcon(t) { return { mysql: 'Coin', oracle: 'DataLine', postgresql: 'Document', sqlserver: 'DataBoard', excel: 'Document', api: 'ChatLineRound' }[t] || 'Document' }

// ===== 测试连接 =====
const testingIds = ref([])
async function testConnection(ds) {
  testingIds.value.push(ds.id)
  await new Promise(r => setTimeout(r, 1000))
  const idx = list.value.findIndex(d => d.id === ds.id)
  // 模拟：API 数据源总是失败
  if (ds.type === 'api') {
    list.value[idx].status = 'error'
    list.value[idx].healthScore = 0
    ElMessage.error(`${ds.name} 连接失败：网络超时`)
  } else {
    list.value[idx].status = 'online'
    list.value[idx].healthScore = Math.floor(Math.random() * 20) + 80
    ElMessage.success(`${ds.name} 连接成功`)
  }
  testingIds.value = testingIds.value.filter(i => i !== ds.id)
}

async function testAll() {
  ElMessage.info('正在测试全部数据源连接...')
  for (const ds of list.value) await testConnection(ds)
  ElMessage.success('全部测试完成')
}

// ===== 弹窗 =====
const dialogVisible = ref(false)
const editing = ref(false)
const formRef = ref(null)
const form = reactive(getDefaultForm())
const rules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

function getDefaultForm() { return { id: null, type: 'mysql', name: '', code: '', host: '', port: 3306, database: '', username: '', password: '', syncMode: '定时1小时', description: '' } }

function showDialog(row) {
  editing.value = !!row
  Object.assign(form, getDefaultForm(), row || {})
  dialogVisible.value = true
}

function onTypeChange() {
  form.port = { mysql: 3306, oracle: 1521, postgresql: 5432, sqlserver: 1433, excel: null, api: null }[form.type] || null
  if (form.type === 'api' || form.type === 'excel') form.database = ''
}

async function saveDs() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editing.value) {
    const idx = list.value.findIndex(d => d.id === form.id)
    list.value[idx] = { ...list.value[idx], ...form }
    ElMessage.success('保存成功')
  } else {
    list.value.unshift({ ...form, id: Date.now(), typeLabel: getTypeLabel(form.type), lastSync: '未同步', tableCount: 0, dataSize: 0, healthScore: 100, status: 'online' })
    ElMessage.success('数据源添加成功')
  }
  dialogVisible.value = false
}

function getTypeLabel(t) { return { mysql: 'MySQL', oracle: 'Oracle', postgresql: 'PostgreSQL', sqlserver: 'SQLServer', excel: 'Excel', api: 'REST API' }[t] || t }

async function testForm() {
  await new Promise(r => setTimeout(r, 800))
  if (form.type === 'api') ElMessage.error('API 连接失败')
  else ElMessage.success('连接测试成功')
}

function deleteDs(row) {
  list.value = list.value.filter(d => d.id !== row.id)
  ElMessage.success('删除成功')
}

// ===== Schema =====
const schemaVisible = ref(false)
const schemaDs = ref(null)
const tableKw = ref('')
const tables = ref([])
const filteredTables = computed(() => {
  if (!tableKw.value) return tables.value
  return tables.value.filter(t => t.name.includes(tableKw.value) || t.comment.includes(tableKw.value))
})

function showSchema(ds) {
  schemaDs.value = ds
  // 模拟表数据
  tables.value = Array.from({ length: 12 }, (_, i) => ({
    name: `t_${ds.code}_${i + 1}`,
    comment: ['订单主表', '订单明细', '用户信息', '商品SKU', '支付流水', '退款记录', '优惠券', '活动规则', '日志', '配置', '字典', '审计'][i],
    rows: Math.floor(Math.random() * 1000000),
    size: Math.floor(Math.random() * 500 * 1024 * 1024),
    columns: [
      { name: 'id', type: 'BIGINT', nullable: false, description: '主键' },
      { name: 'create_time', type: 'DATETIME', nullable: false, description: '创建时间' },
      { name: 'update_time', type: 'DATETIME', nullable: false, description: '更新时间' },
      { name: 'name', type: 'VARCHAR(64)', nullable: true, description: '名称' }
    ]
  }))
  schemaVisible.value = true
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function loadList() { ElMessage.success('刷新成功') }
</script>

<style scoped>
.datasource-page { display: flex; flex-direction: column; gap: 16px; }
.stat-card { border-radius: 8px; }
.stat-content { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 13px; color: #8c8c8c; }
.stat-value { font-size: 24px; font-weight: 700; color: #262626; margin-top: 6px; }
.stat-sub { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
.toolbar-card { border-radius: 8px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.ds-card { border-radius: 8px; transition: all 0.2s; margin-bottom: 16px; }
.ds-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.ds-card.ds-error { border: 1px solid #ff4d4f; }
.ds-card.ds-warning { border: 1px solid #faad14; }
.ds-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ds-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.ds-meta { flex: 1; }
.ds-name { font-size: 15px; font-weight: 600; color: #262626; margin-bottom: 4px; }
.ds-info { background: #fafafa; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
.info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.info-row span { color: #8c8c8c; }
.ds-stats { display: flex; justify-content: space-around; padding: 8px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px; }
.ds-stat-item { text-align: center; }
.ds-stat-item .num { font-size: 16px; font-weight: 600; color: #1890ff; }
.ds-stat-item .label { font-size: 12px; color: #8c8c8c; }
.ds-actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
</style>
