<template>
  <div class="data-entry-page">
    <!-- 模板选择 -->
    <el-card shadow="never" class="template-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">表单模板</span>
          <el-button type="primary" size="small" :icon="Plus" @click="showTemplateDialog">新建模板</el-button>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col :span="6" v-for="tpl in templates" :key="tpl.id">
          <div
            :class="['tpl-item', { active: selectedTemplate?.id === tpl.id }]"
            @click="selectTemplate(tpl)"
          >
            <div class="tpl-icon"><el-icon :size="24"><Document /></el-icon></div>
            <div class="tpl-info">
              <span class="tpl-name">{{ tpl.name }}</span>
              <span class="tpl-desc">{{ tpl.description }}</span>
            </div>
            <el-tag size="small" type="info">{{ tpl.fieldCount }} 个字段</el-tag>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 操作工具栏 -->
    <el-card shadow="never" class="toolbar-card" :body-style="{ padding: '12px 24px' }">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" :icon="Plus" @click="showEntryDialog()">新增数据</el-button>
          <el-button type="success" :icon="Upload" @click="showImportDialog">批量导入</el-button>
          <el-button :icon="Download" @click="downloadTemplate">下载导入模板</el-button>
          <el-button :icon="Download" @click="exportData">导出填报数据</el-button>
        </div>
        <div class="toolbar-right">
          <el-input v-model="searchKeyword" placeholder="搜索订单号/商品名/地区" :prefix-icon="Search" clearable style="width: 260px" @clear="handleSearch" @keyup.enter="handleSearch" />
          <el-button :icon="Search" @click="handleSearch">查询</el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据列表 -->
    <el-card shadow="never" class="data-card">
      <el-table
        :data="displayList"
        stripe
        highlight-current-row
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
        v-loading="loading"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="order_no" label="订单编号" width="160" />
        <el-table-column prop="product_name" label="商品名称" min-width="140" />
        <el-table-column prop="sale_time" label="销售时间" width="170" />
        <el-table-column prop="region" label="地区" width="90" />
        <el-table-column prop="department" label="部门" width="100" />
        <el-table-column prop="channel_type" label="渠道" width="100" />
        <el-table-column prop="sales_amount" label="销售金额" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#f5222d">¥{{ row.sales_amount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sales_qty" label="数量" width="80" align="right" />
        <el-table-column prop="data_source" label="数据来源" width="110">
          <template #default="{ row }">
            <el-tag :type="sourceTagType(row.data_source)" size="small">{{ sourceLabel(row.data_source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="90" />
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showEntryDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该条数据？" @confirm="deleteEntry(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <span class="total-info">共 {{ displayList.length }} 条 · 总金额 ¥{{ totalAmount.toLocaleString() }} · 总数量 {{ totalQty }}</span>
      </div>
    </el-card>

    <!-- 新增/编辑销售数据弹窗 -->
    <el-dialog v-model="entryDialogVisible" :title="editingEntry ? '编辑销售数据' : '新增销售数据'" width="680px" destroy-on-close>
      <el-form :model="entryForm" label-width="100px" :rules="entryRules" ref="entryFormRef">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="订单编号" prop="order_no">
              <el-input v-model="entryForm.order_no" placeholder="如 ORD20260608001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品名称" prop="product_name">
              <el-input v-model="entryForm.product_name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="销售时间" prop="sale_time">
              <el-date-picker v-model="entryForm.sale_time" type="datetime" placeholder="选择销售时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地区" prop="region">
              <el-select v-model="entryForm.region" placeholder="请选择地区" style="width:100%">
                <el-option v-for="r in regions" :key="r" :label="r" :value="r" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="归属部门" prop="department">
              <el-select v-model="entryForm.department" placeholder="请选择部门" style="width:100%">
                <el-option label="销售部" value="销售部" />
                <el-option label="市场部" value="市场部" />
                <el-option label="运营部" value="运营部" />
                <el-option label="财务部" value="财务部" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="渠道类型" prop="channel_type">
              <el-select v-model="entryForm.channel_type" placeholder="请选择渠道" style="width:100%">
                <el-option label="线下门店" value="线下门店" />
                <el-option label="小程序" value="小程序" />
                <el-option label="线上直营" value="线上直营" />
                <el-option label="分销商" value="分销商" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="销售金额" prop="sales_amount">
              <el-input-number v-model="entryForm.sales_amount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="销售数量" prop="sales_qty">
              <el-input-number v-model="entryForm.sales_qty" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="数据来源" prop="data_source">
          <el-select v-model="entryForm.data_source" style="width:100%">
            <el-option label="人工补录" value="MANUAL_ENTRY" />
            <el-option label="Excel导入" value="BATCH_IMPORT" />
            <el-option label="系统自动" value="SYSTEM_AUTO" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建人">
          <el-input v-model="entryForm.creator_name" placeholder="填写创建人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="entryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEntry">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importVisible" title="批量导入数据" width="500px" destroy-on-close>
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.csv"
        :on-change="handleFileChange"
      >
        <el-icon :size="48" color="#c0c4cc"><Upload /></el-icon>
        <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx / .csv 格式，单次最大 10MB</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload, Download, Search, Document } from '@element-plus/icons-vue'
import { useSalesStore } from '@/stores'
import { dataEntryApi } from '@/api'

const salesStore = useSalesStore()
const loading = ref(false)
const searchKeyword = ref('')

const regions = ['华东', '华南', '华北', '华中', '西南', '西北', '东北']

// ===== 数据来源标签 =====
function sourceLabel(v) {
  return { MANUAL_ENTRY: '人工补录', BATCH_IMPORT: 'Excel导入', SYSTEM_AUTO: '系统自动' }[v] || v
}
function sourceTagType(v) {
  return { MANUAL_ENTRY: 'warning', BATCH_IMPORT: '', SYSTEM_AUTO: 'success' }[v] || 'info'
}

// ===== 模板 =====
const templates = ref([
  { id: 1, name: '补充销售数据', description: '全渠道销售数据手工补录', fieldCount: 10 },
  { id: 2, name: '用户增长指标', description: '线下渠道获客数据录入', fieldCount: 6 },
  { id: 3, name: '财务对账数据', description: '第三方支付对账差异补录', fieldCount: 10 },
  { id: 4, name: '运营周报指标', description: '线下活动效果数据填报', fieldCount: 7 }
])

const selectedTemplate = ref(templates.value[0])
function selectTemplate(tpl) { selectedTemplate.value = tpl }

// ===== 数据列表（从 salesStore 获取） =====
const displayList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return salesStore.salesList
  return salesStore.salesList.filter(r =>
    (r.order_no && r.order_no.toLowerCase().includes(kw)) ||
    (r.product_name && r.product_name.toLowerCase().includes(kw)) ||
    (r.region && r.region.includes(kw))
  )
})

const totalAmount = computed(() => displayList.value.reduce((s, r) => s + r.sales_amount, 0))
const totalQty = computed(() => displayList.value.reduce((s, r) => s + r.sales_qty, 0))

function handleSearch() { /* computed 自动响应，无需额外操作 */ }

// ===== 填报弹窗 =====
const entryDialogVisible = ref(false)
const editingEntry = ref(null)
const entryFormRef = ref(null)
const entryForm = reactive({
  order_no: '', product_name: '', sale_time: '', region: '', department: '',
  channel_type: '', sales_amount: 0, sales_qty: 0, data_source: 'MANUAL_ENTRY', creator_name: ''
})
const entryRules = {
  order_no: [{ required: true, message: '请输入订单编号', trigger: 'blur' }],
  product_name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  sale_time: [{ required: true, message: '请选择销售时间', trigger: 'change' }],
  region: [{ required: true, message: '请选择地区', trigger: 'change' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  channel_type: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  sales_amount: [{ required: true, message: '请输入销售金额', trigger: 'blur' }],
  sales_qty: [{ required: true, message: '请输入销售数量', trigger: 'blur' }]
}

function showEntryDialog(row) {
  editingEntry.value = row || null
  if (row) {
    Object.assign(entryForm, {
      order_no: row.order_no, product_name: row.product_name, sale_time: row.sale_time,
      region: row.region, department: row.department, channel_type: row.channel_type,
      sales_amount: row.sales_amount, sales_qty: row.sales_qty,
      data_source: row.data_source, creator_name: row.creator_name || ''
    })
  } else {
    Object.assign(entryForm, {
      order_no: '', product_name: '', sale_time: '', region: '', department: '',
      channel_type: '', sales_amount: 0, sales_qty: 0, data_source: 'MANUAL_ENTRY', creator_name: ''
    })
  }
  entryDialogVisible.value = true
}

async function saveEntry() {
  const valid = await entryFormRef.value?.validate().catch(() => false)
  if (!valid) return
  const data = { ...entryForm }
  if (editingEntry.value) {
    salesStore.updateSalesData(editingEntry.value.id, data)
    ElMessage.success('数据更新成功')
  } else {
    salesStore.addSalesData(data)
    ElMessage.success('数据保存成功')
  }
  entryDialogVisible.value = false
}

function deleteEntry(row) {
  salesStore.deleteSalesData(row.id)
  ElMessage.success('删除成功')
}

// ===== 批量导入 =====
const importVisible = ref(false)
const importing = ref(false)
const uploadRef = ref(null)
let importFile = null

function showImportDialog() { importVisible.value = true }
function handleFileChange(file) { importFile = file.raw }

function handleImport() {
  if (!importFile) { ElMessage.warning('请选择文件'); return }
  importing.value = true
  setTimeout(() => {
    importing.value = false
    importVisible.value = false
    ElMessage.success('批量导入完成')
  }, 2000)
}

async function downloadTemplate() {
  try {
    const res = await dataEntryApi.downloadImportTemplate()
    const blob = new Blob([res.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 从响应头获取文件名，默认使用 "导入模板.xlsx"
    const disposition = res.headers['content-disposition']
    const filename = disposition
      ? decodeURIComponent(disposition.split('filename=')[1]?.replace(/"/g, '') || '导入模板.xlsx')
      : '导入模板.xlsx'
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch (e) {
    ElMessage.error('模板下载失败')
  }
}
function exportData() { ElMessage.info('数据导出中...') }
function showTemplateDialog() { ElMessage.info('模板管理功能开发中') }
</script>

<style scoped>
.data-entry-page { display: flex; flex-direction: column; gap: 16px; }
.template-card, .toolbar-card, .data-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }

.tpl-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 2px solid #f0f0f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.tpl-item:hover { border-color: #91d5ff; background: #e6f7ff; }
.tpl-item.active { border-color: #1890ff; background: #e6f7ff; }
.tpl-icon { width: 40px; height: 40px; background: #e6f7ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #1890ff; }
.tpl-info { flex: 1; }
.tpl-name { display: block; font-weight: 600; font-size: 14px; color: #262626; }
.tpl-desc { display: block; font-size: 12px; color: #8c8c8c; margin-top: 2px; }

.toolbar { display: flex; justify-content: space-between; align-items: center; }
.toolbar-left, .toolbar-right { display: flex; gap: 8px; align-items: center; }
.table-footer { margin-top: 12px; display: flex; justify-content: flex-end; }
.total-info { color: #8c8c8c; font-size: 13px; }
</style>
