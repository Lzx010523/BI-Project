<template>
  <div class="metric-page">
    <!-- 顶部统计 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6" v-for="(s, i) in stats" :key="i">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div>
              <div class="stat-label">{{ s.label }}</div>
              <div class="stat-value">{{ s.value }}</div>
            </div>
            <el-icon :size="32" :color="s.color"><component :is="s.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="指标名称">
          <el-input v-model="filterForm.keyword" placeholder="搜索指标名称/编码" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="指标分类">
          <el-select v-model="filterForm.category" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已发布" value="published" />
            <el-option label="草稿" value="draft" />
            <el-option label="已下线" value="offline" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作工具栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div>
          <el-button type="primary" :icon="Plus" @click="showDialog()">新建指标</el-button>
          <el-button type="success" :icon="Upload">批量导入</el-button>
          <el-button :icon="Download" @click="exportMetrics">导出</el-button>
        </div>
        <el-button :icon="Connection" @click="showDimensionDialog" plain>维度管理</el-button>
      </div>
    </el-card>

    <!-- 指标列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="pagedList" border stripe v-loading="loading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column type="selection" width="45" />
        <el-table-column type="index" label="#" width="55" />
        <el-table-column prop="code" label="指标编码" width="140" />
        <el-table-column prop="name" label="指标名称" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="showDialog(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="categoryTag(row.category)">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="period" label="统计周期" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.period }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="负责人" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="dark">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDialog(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="previewMetric(row)">数据预览</el-button>
            <el-button link type="warning" size="small" @click="toggleStatus(row)">
              {{ row.status === 'published' ? '下线' : '发布' }}
            </el-button>
            <el-popconfirm title="确定删除该指标？" @confirm="deleteMetric(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
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
          :total="filteredList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 新建/编辑指标弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑指标' : '新建指标'" width="780px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="指标编码" prop="code">
              <el-input v-model="form.code" placeholder="如：sales_amt_month" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="指标名称" prop="name">
              <el-input v-model="form.name" placeholder="如：月度销售额" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="指标分类" prop="category">
              <el-select v-model="form.category" placeholder="选择分类" style="width: 100%">
                <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="form.unit" style="width: 100%">
                <el-option label="元" value="元" />
                <el-option label="万元" value="万元" />
                <el-option label="个" value="个" />
                <el-option label="%" value="%" />
                <el-option label="人次" value="人次" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="统计周期" prop="period">
              <el-select v-model="form.period" style="width: 100%">
                <el-option label="实时" value="实时" />
                <el-option label="日" value="日" />
                <el-option label="周" value="周" />
                <el-option label="月" value="月" />
                <el-option label="季" value="季" />
                <el-option label="年" value="年" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="负责人" prop="owner">
          <el-input v-model="form.owner" placeholder="指标负责人" />
        </el-form-item>
        <el-form-item label="计算公式" prop="formula">
          <el-input v-model="form.formula" type="textarea" :rows="2" placeholder="如：SUM(order_amount) WHERE status='paid'" />
        </el-form-item>
        <el-form-item label="业务口径" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述指标业务含义、口径、特殊说明..." />
        </el-form-item>
        <el-form-item label="关联维度">
          <el-select v-model="form.dimensions" multiple placeholder="选择维度" style="width: 100%">
            <el-option v-for="d in dimensions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="saveAsDraft">存为草稿</el-button>
        <el-button type="primary" @click="saveMetric">保存并发布</el-button>
      </template>
    </el-dialog>

    <!-- 维度管理弹窗 -->
    <el-dialog v-model="dimDialogVisible" title="维度管理" width="700px">
      <div class="dim-toolbar">
        <el-button type="primary" :icon="Plus" size="small" @click="addDimension">新增维度</el-button>
      </div>
      <el-table :data="dimensions" border size="small">
        <el-table-column prop="code" label="维度编码" width="140" />
        <el-table-column prop="name" label="维度名称" width="140" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="dimensions.splice(dimensions.indexOf(row), 1)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 数据预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="`数据预览 - ${previewing?.name || ''}`" width="700px">
      <div ref="previewChartRef" style="height: 360px"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import {
  Search, Refresh, Plus, Download, Upload, Connection,
  DataLine, DataBoard, Coin, Histogram
} from '@element-plus/icons-vue'

// ===== 顶部统计 =====
const stats = [
  { label: '指标总数', value: '128', icon: 'DataLine', color: '#1890ff' },
  { label: '已发布', value: '96', icon: 'Coin', color: '#52c41a' },
  { label: '草稿中', value: '24', icon: 'DataBoard', color: '#faad14' },
  { label: '已下线', value: '8', icon: 'Histogram', color: '#ff4d4f' }
]

// ===== 分类 =====
const categories = ['销售指标', '运营指标', '财务指标', '用户指标', '供应链指标', '商品指标']

// ===== 维度 =====
const dimensions = ref([
  { id: 1, code: 'region', name: '地区', type: '字符串', description: '华东/华南/华北等' },
  { id: 2, code: 'dept', name: '部门', type: '字符串', description: '销售部/市场部等' },
  { id: 3, code: 'product', name: '商品', type: '字符串', description: '商品分类或 SKU' },
  { id: 4, code: 'time', name: '时间', type: '日期', description: '年月日时' },
  { id: 5, code: 'channel', name: '渠道', type: '字符串', description: '线上/线下/O2O' }
])

// ===== 指标数据 =====
const loading = ref(false)
const list = ref([
  { id: 1, code: 'sales_amt_month', name: '月度销售额', category: '销售指标', unit: '万元', period: '月', owner: '张伟', status: 'published', updateTime: '2026-06-12 10:30:15', formula: 'SUM(order_amount)', description: '所有支付成功订单金额之和', dimensions: [1, 4] },
  { id: 2, code: 'order_count_day', name: '日订单量', category: '销售指标', unit: '个', period: '日', owner: '张伟', status: 'published', updateTime: '2026-06-12 09:15:22', formula: 'COUNT(order_id)', description: '当日创建的有效订单数', dimensions: [1, 4] },
  { id: 3, code: 'new_user_day', name: '日新增用户', category: '用户指标', unit: '人', period: '日', owner: '李明', status: 'published', updateTime: '2026-06-11 18:42:00', formula: 'COUNT(DISTINCT user_id)', description: '当日首次注册的用户数', dimensions: [1, 4, 5] },
  { id: 4, code: 'conversion_rate', name: '转化率', category: '运营指标', unit: '%', period: '日', owner: '王芳', status: 'published', updateTime: '2026-06-12 11:20:30', formula: 'paid_users/visit_users', description: '支付用户数 / 访客数', dimensions: [1, 4, 5] },
  { id: 5, code: 'gmv_quarter', name: '季度GMV', category: '销售指标', unit: '万元', period: '季', owner: '张伟', status: 'published', updateTime: '2026-06-10 14:30:00', formula: 'SUM(gmv)', description: '商品交易总额，含未支付', dimensions: [1, 4] },
  { id: 6, code: 'refund_rate', name: '退款率', category: '财务指标', unit: '%', period: '月', owner: '赵六', status: 'draft', updateTime: '2026-06-09 16:18:42', formula: 'refund_amt/sales_amt', description: '月退款金额 / 月销售额', dimensions: [1, 4] },
  { id: 7, code: 'stock_turnover', name: '库存周转率', category: '供应链指标', unit: '%', period: '月', owner: '陈晨', status: 'published', updateTime: '2026-06-08 10:00:00', formula: 'sales_cost/avg_inventory', description: '销售成本 / 平均库存', dimensions: [3, 4] },
  { id: 8, code: 'cart_abandon_rate', name: '购物车放弃率', category: '运营指标', unit: '%', period: '日', owner: '李明', status: 'draft', updateTime: '2026-06-07 09:30:00', formula: '1 - paid_carts/created_carts', description: '未支付的购物车 / 创建的购物车', dimensions: [1, 4, 5] },
  { id: 9, code: 'sku_sales_top10', name: '商品销售TOP10', category: '商品指标', unit: '个', period: '月', owner: '王芳', status: 'published', updateTime: '2026-06-12 12:00:00', formula: 'RANK() OVER', description: '按销量排序的前10名商品', dimensions: [3, 4] },
  { id: 10, code: 'arpu', name: '客单价', category: '销售指标', unit: '元', period: '日', owner: '张伟', status: 'offline', updateTime: '2026-05-30 17:00:00', formula: 'sales_amt/order_count', description: '销售额 / 订单数', dimensions: [1, 4, 5] }
])

// ===== 过滤 =====
const filterForm = reactive({ keyword: '', category: '', status: '' })
const page = ref(1)
const pageSize = ref(10)

const filteredList = computed(() => {
  return list.value.filter(m => {
    const matchKw = !filterForm.keyword || m.name.includes(filterForm.keyword) || m.code.includes(filterForm.keyword)
    const matchCat = !filterForm.category || m.category === filterForm.category
    const matchSt = !filterForm.status || m.status === filterForm.status
    return matchKw && matchCat && matchSt
  })
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handleSearch() { page.value = 1 }
function handleReset() {
  filterForm.keyword = ''
  filterForm.category = ''
  filterForm.status = ''
}

// ===== 标签辅助 =====
function statusTag(s) { return { published: 'success', draft: 'warning', offline: 'info' }[s] }
function statusText(s) { return { published: '已发布', draft: '草稿', offline: '已下线' }[s] }
function categoryTag(c) { return { '销售指标': 'danger', '运营指标': 'warning', '财务指标': 'success', '用户指标': 'primary', '供应链指标': 'info', '商品指标': '' }[c] || '' }

// ===== 弹窗 =====
const dialogVisible = ref(false)
const editing = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, code: '', name: '', category: '', unit: '元', period: '日', owner: '', formula: '', description: '', dimensions: [] })
const rules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  owner: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}

function showDialog(row) {
  editing.value = !!row
  if (row) Object.assign(form, row)
  else Object.assign(form, { id: null, code: '', name: '', category: '', unit: '元', period: '日', owner: '', formula: '', description: '', dimensions: [] })
  dialogVisible.value = true
}

async function saveMetric() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  // 调用接口: POST /api/metric/save
  if (editing.value) {
    const idx = list.value.findIndex(m => m.id === form.id)
    list.value[idx] = { ...form, status: 'published', updateTime: formatNow() }
    ElMessage.success('指标更新成功')
  } else {
    list.value.unshift({ ...form, id: Date.now(), status: 'published', updateTime: formatNow() })
    ElMessage.success('指标创建成功')
  }
  dialogVisible.value = false
}

function saveAsDraft() {
  // 调用接口: POST /api/metric/draft
  list.value.unshift({ ...form, id: Date.now(), status: 'draft', updateTime: formatNow() })
  ElMessage.success('已保存为草稿')
  dialogVisible.value = false
}

function deleteMetric(row) {
  list.value = list.value.filter(m => m.id !== row.id)
  ElMessage.success('删除成功')
}

function toggleStatus(row) {
  row.status = row.status === 'published' ? 'offline' : 'published'
  row.updateTime = formatNow()
  ElMessage.success(`指标已${row.status === 'published' ? '发布' : '下线'}`)
}

function exportMetrics() {
  ElMessage.info('导出功能开发中')
}

// ===== 维度管理 =====
const dimDialogVisible = ref(false)
function showDimensionDialog() { dimDialogVisible.value = true }
function addDimension() {
  ElMessageBox.prompt('请输入维度名称', '新增维度', { confirmButtonText: '确定', cancelButtonText: '取消' })
    .then(({ value }) => {
      dimensions.value.push({ id: Date.now(), code: 'dim_' + Date.now(), name: value, type: '字符串', description: '' })
      ElMessage.success('维度添加成功')
    }).catch(() => {})
}

// ===== 数据预览 =====
const previewVisible = ref(false)
const previewing = ref(null)
const previewChartRef = ref(null)
let previewChart = null

async function previewMetric(row) {
  previewing.value = row
  previewVisible.value = true
  await nextTick()
  if (!previewChartRef.value) return
  previewChart = echarts.init(previewChartRef.value)
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
  const data = months.map(() => Math.floor(Math.random() * 5000) + 1000)
  previewChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: row.unit },
    series: [{
      name: row.name,
      type: 'line',
      smooth: true,
      data,
      areaStyle: { color: 'rgba(24,144,255,0.3)' },
      itemStyle: { color: '#1890ff' }
    }]
  })
}

// ===== 工具 =====
function formatNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onUnmounted(() => previewChart?.dispose())
</script>

<style scoped>
.metric-page { display: flex; flex-direction: column; gap: 16px; }
.stat-row, .filter-card, .toolbar-card, .table-card { border-radius: 8px; }
.stat-card { border-radius: 8px; }
.stat-content { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 13px; color: #8c8c8c; }
.stat-value { font-size: 24px; font-weight: 700; color: #262626; margin-top: 6px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.dim-toolbar { margin-bottom: 12px; }
</style>
