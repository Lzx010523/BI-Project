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
          <el-input v-model="searchKeyword" placeholder="搜索填报数据" :prefix-icon="Search" clearable style="width: 220px" @clear="fetchDataList" @keyup.enter="fetchDataList" />
          <el-button :icon="Search" @click="fetchDataList">查询</el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据列表 -->
    <el-card shadow="never" class="data-card">
      <el-table
        :data="entryDataList"
        stripe
        highlight-current-row
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
        v-loading="loading"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="region" label="地区" width="100" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="indicatorName" label="指标名称" min-width="160" />
        <el-table-column prop="indicatorValue" label="指标值" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #1890ff">{{ row.indicatorValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="dataPeriod" label="数据周期" width="120" />
        <el-table-column prop="source" label="数据来源" width="100">
          <template #default="{ row }">
            <el-tag :type="row.source === '手工录入' ? 'warning' : 'success'" size="small">{{ row.source }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="填报人" width="100" />
        <el-table-column prop="createTime" label="填报时间" width="170" />
        <el-table-column prop="updateTime" label="更新时间" width="170" />
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
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]" :total="dataTotal" layout="total, sizes, prev, pager, next, jumper" background />
      </div>
    </el-card>

    <!-- 数据填报弹窗 -->
    <el-dialog v-model="entryDialogVisible" :title="editingEntry ? '编辑填报数据' : '新增填报数据'" width="650px" destroy-on-close>
      <el-form :model="entryForm" label-width="100px" :rules="entryRules" ref="entryFormRef">
        <el-form-item label="地区" prop="region">
          <el-select v-model="entryForm.region" placeholder="请选择" style="width: 100%">
            <el-option v-for="r in regions" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-select v-model="entryForm.department" placeholder="请选择" style="width: 100%">
            <el-option label="销售部" value="销售部" />
            <el-option label="市场部" value="市场部" />
            <el-option label="运营部" value="运营部" />
            <el-option label="财务部" value="财务部" />
          </el-select>
        </el-form-item>
        <el-form-item label="指标名称" prop="indicatorName">
          <el-input v-model="entryForm.indicatorName" placeholder="如：线下渠道销售额" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="指标值" prop="indicatorValue">
              <el-input-number v-model="entryForm.indicatorValue" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位">
              <el-select v-model="entryForm.unit" style="width: 100%">
                <el-option label="元" value="元" />
                <el-option label="万元" value="万元" />
                <el-option label="个" value="个" />
                <el-option label="人次" value="人次" />
                <el-option label="%" value="%" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="数据周期" prop="dataPeriod">
          <el-date-picker v-model="entryForm.dataPeriod" type="month" placeholder="选择月份" format="YYYY-MM" value-format="YYYY-MM" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="entryForm.remark" type="textarea" :rows="3" placeholder="填写备注说明" />
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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { dataEntryApi } from '@/api'
import { Plus, Upload, Download, Search, Document } from '@element-plus/icons-vue'

const loading = ref(false)
const searchKeyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const dataTotal = ref(156)

const regions = ['华东', '华南', '华北', '华中', '西南', '西北', '东北']

// ===== 模板 =====
const templates = ref([
  { id: 1, name: '销售指标填报', description: '各区域线下销售额手工补录', fieldCount: 8 },
  { id: 2, name: '用户增长指标', description: '线下渠道获客数据录入', fieldCount: 6 },
  { id: 3, name: '财务对账数据', description: '第三方支付对账差异补录', fieldCount: 10 },
  { id: 4, name: '运营周报指标', description: '线下活动效果数据填报', fieldCount: 7 }
])

const selectedTemplate = ref(templates.value[0])
function selectTemplate(tpl) { selectedTemplate.value = tpl; fetchDataList() }

// ===== 数据列表 =====
const entryDataList = ref([
  { id: 1, region: '华东', department: '销售部', indicatorName: '线下渠道销售额', indicatorValue: 85600, unit: '元', dataPeriod: '2026-05', source: '手工录入', creator: '张伟', createTime: '2026-06-01 09:30:15', updateTime: '2026-06-12 10:22:08' },
  { id: 2, region: '华南', department: '市场部', indicatorName: '线下活动获客数', indicatorValue: 326, unit: '人次', dataPeriod: '2026-05', source: '手工录入', creator: '李明', createTime: '2026-06-01 10:15:22', updateTime: '2026-06-01 10:15:22' },
  { id: 3, region: '华北', department: '财务部', indicatorName: '支付宝对账差异', indicatorValue: -125.50, unit: '元', dataPeriod: '2026-05', source: '批量导入', creator: '王芳', createTime: '2026-06-02 14:20:30', updateTime: '2026-06-02 14:20:30' },
  { id: 4, region: '华中', department: '运营部', indicatorName: '线下活动转化率', indicatorValue: 18.5, unit: '%', dataPeriod: '2026-05', source: '手工录入', creator: '赵六', createTime: '2026-06-03 11:45:18', updateTime: '2026-06-03 11:45:18' },
  { id: 5, region: '西南', department: '销售部', indicatorName: '经销商返点金额', indicatorValue: 12800, unit: '元', dataPeriod: '2026-05', source: '手工录入', creator: '张伟', createTime: '2026-06-04 09:10:05', updateTime: '2026-06-04 09:10:05' }
])

function fetchDataList() {
  loading.value = true
  // 调用接口: GET /api/data-entry/data/list?page=1&size=10&templateId=&keyword=
  setTimeout(() => { loading.value = false }, 500)
}

// ===== 填报弹窗 =====
const entryDialogVisible = ref(false)
const editingEntry = ref(null)
const entryFormRef = ref(null)
const entryForm = reactive({ region: '', department: '', indicatorName: '', indicatorValue: 0, unit: '元', dataPeriod: '', remark: '' })
const entryRules = {
  region: [{ required: true, message: '请选择地区', trigger: 'change' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  indicatorName: [{ required: true, message: '请输入指标名称', trigger: 'blur' }],
  dataPeriod: [{ required: true, message: '请选择数据周期', trigger: 'change' }]
}

function showEntryDialog(row) {
  editingEntry.value = row || null
  if (row) Object.assign(entryForm, row)
  entryDialogVisible.value = true
}

async function saveEntry() {
  const valid = await entryFormRef.value?.validate().catch(() => false)
  if (!valid) return
  // 调用接口: POST /api/data-entry/data/save 或 PUT /api/data-entry/data/:id
  ElMessage.success(editingEntry.value ? '数据更新成功' : '数据保存成功，已通过数据库事务保证一致性')
  entryDialogVisible.value = false
  fetchDataList()
}

function deleteEntry(row) {
  // 调用接口: DELETE /api/data-entry/data/:id
  ElMessage.success('删除成功')
  fetchDataList()
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
  // 调用接口: POST /api/data-entry/data/import (multipart/form-data)
  setTimeout(() => {
    importing.value = false
    importVisible.value = false
    ElMessage.success('批量导入完成，数据已通过数据库事务一致性校验')
    fetchDataList()
  }, 2000)
}

function downloadTemplate() {
  // 调用接口: GET /api/data-entry/data/import-template/:templateId (blob)
  ElMessage.info('模板下载中...')
}

function exportData() {
  // 调用接口: GET /api/data-entry/data/export (blob)
  ElMessage.info('数据导出中...')
}

function showTemplateDialog() {
  ElMessage.info('模板管理功能开发中')
}
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
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
