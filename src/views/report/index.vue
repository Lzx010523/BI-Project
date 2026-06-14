<template>
  <div class="report-page">
    <!-- 顶部：报表分类 Tabs -->
    <el-card shadow="never" class="top-card">
      <div class="top-content">
        <el-tabs v-model="activeCategory" class="category-tabs">
          <el-tab-pane
            v-for="cat in categories"
            :key="cat.key"
            :name="cat.key"
          >
            <template #label>
              <span class="cat-label">
                <el-icon><component :is="cat.icon" /></el-icon>
                {{ cat.label }}
                <el-badge :value="cat.count" class="cat-badge" />
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
        <div class="top-right">
          <el-input v-model="searchKw" :prefix-icon="Search" placeholder="搜索报表名称/编码" clearable style="width: 240px" />
          <el-button type="primary" :icon="Plus" @click="showDesigner = true">新建报表</el-button>
        </div>
      </div>
    </el-card>

    <!-- 视图切换 + 排序 -->
    <div class="view-bar">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button value="grid"><el-icon><Grid /></el-icon> 看板</el-radio-button>
        <el-radio-button value="list"><el-icon><List /></el-icon> 列表</el-radio-button>
      </el-radio-group>
      <div class="view-right">
        <span class="total-info">共 {{ filteredReports.length }} 张报表</span>
        <el-select v-model="sortBy" size="small" style="width: 140px">
          <el-option label="最近访问" value="recent" />
          <el-option label="创建时间" value="created" />
          <el-option label="访问次数" value="visits" />
          <el-option label="收藏优先" value="favorited" />
        </el-select>
      </div>
    </div>

    <!-- 看板视图 -->
    <div v-if="viewMode === 'grid'" class="grid-view">
      <div
        v-for="r in filteredReports"
        :key="r.id"
        class="report-card"
        :class="{ favorited: r.favorited }"
        @click="previewReport(r)"
      >
        <div class="rc-thumb" :style="{ background: r.thumb }">
          <el-icon :size="32" color="#fff" style="opacity: 0.6"><component :is="r.icon" /></el-icon>
          <el-tag v-if="r.favorited" type="warning" size="small" effect="dark" class="rc-fav">★ 收藏</el-tag>
          <el-tag v-if="r.scheduled" type="success" size="small" effect="dark" class="rc-sch">定时推送</el-tag>
        </div>
        <div class="rc-body">
          <div class="rc-title">{{ r.name }}</div>
          <div class="rc-desc">{{ r.description }}</div>
          <div class="rc-meta">
            <span><el-icon><User /></el-icon> {{ r.owner }}</span>
            <span><el-icon><View /></el-icon> {{ r.visits }}</span>
            <span><el-icon><Clock /></el-icon> {{ r.updateTime }}</span>
          </div>
        </div>
        <div class="rc-actions" @click.stop>
          <el-tooltip content="收藏" placement="top">
            <el-icon :class="['rc-act', { active: r.favorited }]" @click="toggleFav(r)"><StarFilled v-if="r.favorited" /><Star v-else /></el-icon>
          </el-tooltip>
          <el-tooltip content="编辑" placement="top">
            <el-icon class="rc-act" @click="editReport(r)"><Edit /></el-icon>
          </el-tooltip>
          <el-tooltip content="订阅推送" placement="top">
            <el-icon class="rc-act" @click="subscribeReport(r)"><Bell /></el-icon>
          </el-tooltip>
          <el-tooltip content="更多" placement="top">
            <el-dropdown trigger="click" @command="handleMore($event, r)">
              <el-icon class="rc-act"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="copy">复制报表</el-dropdown-item>
                  <el-dropdown-item command="export">导出</el-dropdown-item>
                  <el-dropdown-item command="share">分享链接</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <el-card v-else shadow="never">
      <el-table :data="filteredReports" stripe v-loading="loading" :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column label="报表名称" min-width="220">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="previewReport(row)">
              <el-icon><component :is="row.icon" /></el-icon>
              {{ row.name }}
            </el-link>
            <el-icon v-if="row.favorited" color="#faad14" style="margin-left: 4px"><StarFilled /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="categoryLabel" label="分类" width="120" />
        <el-table-column prop="owner" label="负责人" width="100" />
        <el-table-column prop="visits" label="访问次数" width="100" align="right" sortable />
        <el-table-column prop="updateTime" label="更新时间" width="160" />
        <el-table-column label="推送" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.scheduled" type="success" size="small">已订阅</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">未订阅</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="previewReport(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="editReport(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="subscribeReport(row)">订阅</el-button>
            <el-popconfirm title="确定删除？" @confirm="deleteReport(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 报表设计器（拖拽式） -->
    <el-dialog v-model="showDesigner" :title="editing ? '编辑报表' : '自助式报表设计器'" width="90%" top="3vh" destroy-on-close>
      <div class="designer">
        <!-- 左侧：字段树 -->
        <div class="designer-left">
          <div class="left-header">
            <el-input v-model="dsKw" :prefix-icon="Search" placeholder="搜索字段" size="small" />
            <el-select v-model="dsName" size="small" style="margin-top: 8px">
              <el-option v-for="d in datasets" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </div>
          <div class="field-tree">
            <div v-for="dim in currentDataset.dimensions" :key="dim.id" class="field-item">
              <el-icon color="#fa8c16"><Calendar /></el-icon>
              <span class="fname">{{ dim.name }}</span>
              <el-tag size="small" type="warning" effect="plain">{{ dim.type }}</el-tag>
            </div>
            <div class="divider">指标</div>
            <div v-for="m in currentDataset.metrics" :key="m.id" class="field-item">
              <el-icon color="#1890ff"><DataLine /></el-icon>
              <span class="fname">{{ m.name }}</span>
              <el-tag size="small" type="primary" effect="plain">{{ m.unit }}</el-tag>
            </div>
          </div>
        </div>

        <!-- 中间：画布 -->
        <div class="designer-center">
          <div class="center-toolbar">
            <el-radio-group v-model="chartType" size="small">
              <el-radio-button value="table">表格</el-radio-button>
              <el-radio-button value="bar">柱图</el-radio-button>
              <el-radio-button value="line">折线</el-radio-button>
              <el-radio-button value="pie">饼图</el-radio-button>
            </el-radio-group>
            <el-button-group>
              <el-button size="small" :icon="Refresh" @click="refreshPreview">刷新</el-button>
              <el-button size="small" :icon="Download">导出</el-button>
            </el-button-group>
          </div>
          <div class="preview-area">
            <el-table v-if="chartType === 'table'" :data="previewData" border>
              <el-table-column v-for="c in currentDataset.previewColumns" :key="c.prop" :prop="c.prop" :label="c.label" />
            </el-table>
            <div v-else ref="previewChartRef" style="height: 100%"></div>
          </div>
        </div>

        <!-- 右侧：属性配置 -->
        <div class="designer-right">
          <el-tabs v-model="propTab">
            <el-tab-pane label="数据" name="data">
              <el-form label-position="top" size="small">
                <el-form-item label="行维度">
                  <el-select v-model="config.rowDim" multiple placeholder="选择维度" style="width: 100%">
                    <el-option v-for="d in currentDataset.dimensions" :key="d.id" :label="d.name" :value="d.name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="指标">
                  <el-select v-model="config.metric" multiple placeholder="选择指标" style="width: 100%">
                    <el-option v-for="m in currentDataset.metrics" :key="m.id" :label="m.name" :value="m.name" />
                  </el-select>
                </el-form-item>
                <el-form-item label="过滤条件">
                  <el-input v-model="config.filter" type="textarea" :rows="3" placeholder="如：region = '华东' AND status = '已支付'" />
                </el-form-item>
                <el-form-item label="排序">
                  <el-select v-model="config.sort" style="width: 100%">
                    <el-option label="指标值降序" value="metric_desc" />
                    <el-option label="指标值升序" value="metric_asc" />
                    <el-option label="维度升序" value="dim_asc" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="样式" name="style">
              <el-form label-position="top" size="small">
                <el-form-item label="主题色">
                  <el-color-picker v-model="config.themeColor" />
                </el-form-item>
                <el-form-item label="显示标题">
                  <el-switch v-model="config.showTitle" />
                </el-form-item>
                <el-form-item label="显示图例">
                  <el-switch v-model="config.showLegend" />
                </el-form-item>
                <el-form-item label="显示数据标签">
                  <el-switch v-model="config.showLabel" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            <el-tab-pane label="高级" name="advance">
              <el-form label-position="top" size="small">
                <el-form-item label="刷新策略">
                  <el-select v-model="config.refresh" style="width: 100%">
                    <el-option label="实时刷新" value="realtime" />
                    <el-option label="每5分钟" value="5m" />
                    <el-option label="每小时" value="1h" />
                    <el-option label="每天" value="1d" />
                  </el-select>
                </el-form-item>
                <el-form-item label="缓存时间(秒)">
                  <el-input-number v-model="config.cacheTtl" :min="0" :max="3600" style="width: 100%" />
                </el-form-item>
                <el-form-item label="权限">
                  <el-select v-model="config.permission" multiple placeholder="选择可见部门" style="width: 100%">
                    <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDesigner = false">取消</el-button>
        <el-button @click="saveDraft">存为草稿</el-button>
        <el-button type="primary" @click="saveReport">发布</el-button>
      </template>
    </el-dialog>

    <!-- 报表预览 -->
    <el-dialog v-model="previewVisible" :title="previewing?.name" width="80%" top="5vh">
      <div class="preview-container">
        <el-row :gutter="16" class="preview-kpi">
          <el-col :span="6" v-for="k in previewing?.kpis" :key="k.label">
            <div class="kpi-item">
              <span class="kpi-label">{{ k.label }}</span>
              <span class="kpi-value">{{ k.value }}</span>
            </div>
          </el-col>
        </el-row>
        <div ref="previewChartRef" style="height: 360px; margin-top: 20px"></div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="subscribeReport(previewing)">订阅推送</el-button>
      </template>
    </el-dialog>

    <!-- 订阅推送弹窗 -->
    <el-dialog v-model="subVisible" :title="`订阅推送 - ${subscribing?.name}`" width="600px">
      <el-form :model="subForm" label-width="100px">
        <el-form-item label="推送周期" required>
          <el-select v-model="subForm.cron" style="width: 100%">
            <el-option label="每天 09:00" value="0 0 9 * * ?" />
            <el-option label="每周一 09:00" value="0 0 9 ? * MON" />
            <el-option label="每月1号 09:00" value="0 0 9 1 * ?" />
            <el-option label="自定义 Cron" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="subForm.cron === 'custom'" label="Cron 表达式">
          <el-input v-model="subForm.customCron" placeholder="如：0 0 9 * * ?" />
        </el-form-item>
        <el-form-item label="推送渠道" required>
          <el-checkbox-group v-model="subForm.channels">
            <el-checkbox value="email"><el-icon><Message /></el-icon> 邮件</el-checkbox>
            <el-checkbox value="dingtalk"><el-icon><ChatDotRound /></el-icon> 钉钉</el-checkbox>
            <el-checkbox value="wechat"><el-icon><ChatLineRound /></el-icon> 企业微信</el-checkbox>
            <el-checkbox value="feishu"><el-icon><Promotion /></el-icon> 飞书</el-checkbox>
            <el-checkbox value="sms"><el-icon><Iphone /></el-icon> 短信</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="收件人">
          <el-select v-model="subForm.receivers" multiple filterable allow-create style="width: 100%">
            <el-option label="销售部全体" value="销售部全体" />
            <el-option label="市场部全体" value="市场部全体" />
            <el-option label="财务总监" value="财务总监" />
            <el-option label="CEO" value="CEO" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件格式">
          <el-radio-group v-model="subForm.format">
            <el-radio value="pdf">PDF</el-radio>
            <el-radio value="excel">Excel</el-radio>
            <el-radio value="image">图片</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSubscribe">保存订阅</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  Search, Plus, Grid, List, Star, StarFilled, Edit, Bell, MoreFilled, View, User, Clock,
  Calendar, DataLine, Refresh, Download, Message, ChatDotRound, ChatLineRound, Promotion, Iphone,
  Document, DataAnalysis, TrendCharts, Coin, OfficeBuilding, ShoppingCart, Wallet
} from '@element-plus/icons-vue'

// ===== 分类 =====
const categories = [
  { key: 'all', label: '全部报表', icon: 'Grid', count: 56 },
  { key: 'finance', label: '财务报表', icon: 'Coin', count: 18 },
  { key: 'sales', label: '销售报表', icon: 'ShoppingCart', count: 12 },
  { key: 'operation', label: '运营报表', icon: 'TrendCharts', count: 10 },
  { key: 'hr', label: '人力报表', icon: 'User', count: 6 },
  { key: 'supply', label: '供应链报表', icon: 'OfficeBuilding', count: 10 }
]
const activeCategory = ref('all')
const searchKw = ref('')
const viewMode = ref('grid')
const sortBy = ref('recent')
const loading = ref(false)

// ===== 报表数据 =====
const reports = ref([
  { id: 1, code: 'RPT_SALES_001', name: '销售业绩月报', description: '各区域销售业绩、达成率、同环比分析', category: 'sales', categoryLabel: '销售报表', owner: '张伟', visits: 1280, updateTime: '2 小时前', favorited: true, scheduled: true, icon: 'ShoppingCart', thumb: 'linear-gradient(135deg,#1890ff,#36cfc9)', kpis: [{ label: '本月销售', value: '¥286.4万' }, { label: '订单量', value: '3,826' }, { label: '达成率', value: '82%' }, { label: '同比', value: '+12.5%' }] },
  { id: 2, code: 'RPT_FIN_001', name: '利润分析表', description: '营收、成本、净利润、毛利率多维分析', category: 'finance', categoryLabel: '财务报表', owner: '李娜', visits: 856, updateTime: '1 天前', favorited: true, scheduled: true, icon: 'Coin', thumb: 'linear-gradient(135deg,#f5222d,#cf1322)', kpis: [{ label: '营业收入', value: '¥586.4万' }, { label: '净利润', value: '¥128.6万' }, { label: '毛利率', value: '34.7%' }, { label: '净利率', value: '21.9%' }] },
  { id: 3, code: 'RPT_OP_001', name: '运营日报', description: 'DAU、新增、留存、转化核心指标', category: 'operation', categoryLabel: '运营报表', owner: '王芳', visits: 2350, updateTime: '10 分钟前', favorited: true, scheduled: true, icon: 'TrendCharts', thumb: 'linear-gradient(135deg,#52c41a,#389e0d)', kpis: [{ label: 'DAU', value: '128,560' }, { label: '新增', value: '8,560' }, { label: '次日留存', value: '62.5%' }, { label: '转化率', value: '4.8%' }] },
  { id: 4, code: 'RPT_HR_001', name: '人力成本分析', description: '各部门人力成本、人效、流失率', category: 'hr', categoryLabel: '人力报表', owner: '陈晨', visits: 320, updateTime: '3 天前', favorited: false, scheduled: false, icon: 'User', thumb: 'linear-gradient(135deg,#722ed1,#531dab)', kpis: [{ label: '在职人数', value: '856' }, { label: '人力成本', value: '¥128.5万' }, { label: '人效', value: '¥1.5万/人' }, { label: '流失率', value: '3.2%' }] },
  { id: 5, code: 'RPT_SUP_001', name: '库存周转分析', description: '各仓库库存周转、出入库、利用率', category: 'supply', categoryLabel: '供应链报表', owner: '赵六', visits: 568, updateTime: '昨天', favorited: false, scheduled: false, icon: 'OfficeBuilding', thumb: 'linear-gradient(135deg,#fa8c16,#d46b08)', kpis: [{ label: '周转率', value: '4.8次/月' }, { label: '在库量', value: '128,560' }, { label: '缺货率', value: '2.3%' }, { label: '利用率', value: '75%' }] },
  { id: 6, code: 'RPT_SALES_002', name: '商品销售排行榜', description: 'TOP 100 商品销量、销售额、毛利', category: 'sales', categoryLabel: '销售报表', owner: '张伟', visits: 980, updateTime: '5 小时前', favorited: false, scheduled: false, icon: 'ShoppingCart', thumb: 'linear-gradient(135deg,#13c2c2,#08979c)', kpis: [{ label: '商品数', value: '8,560' }, { label: 'TOP1 销量', value: '856' }, { label: 'TOP10 占比', value: '35.2%' }, { label: '总销售', value: '¥286.4万' }] },
  { id: 7, code: 'RPT_FIN_002', name: '应收账款账龄', description: '应收账款账龄分布、客户欠款排名', category: 'finance', categoryLabel: '财务报表', owner: '李娜', visits: 425, updateTime: '2 天前', favorited: false, scheduled: true, icon: 'Coin', thumb: 'linear-gradient(135deg,#eb2f96,#c41d7f)', kpis: [{ label: '应收总额', value: '¥156.8万' }, { label: '30天内', value: '¥98.2万' }, { label: '30-90天', value: '¥42.5万' }, { label: '90天+', value: '¥16.1万' }] },
  { id: 8, code: 'RPT_OP_002', name: '渠道效果对比', description: '各渠道 ROI、CPA、转化对比', category: 'operation', categoryLabel: '运营报表', owner: '王芳', visits: 685, updateTime: '4 小时前', favorited: false, scheduled: true, icon: 'TrendCharts', thumb: 'linear-gradient(135deg,#fa541c,#d4380d)', kpis: [{ label: '渠道数', value: '12' }, { label: '总 UV', value: '148.5K' }, { label: '平均 CPA', value: '¥28.5' }, { label: '平均 ROI', value: '3.8' }] }
])

const departments = ['销售部', '市场部', '运营部', '财务部', '客服部', '技术部', '人力部']

const filteredReports = computed(() => {
  let list = reports.value
  if (activeCategory.value !== 'all') list = list.filter(r => r.category === activeCategory.value)
  if (searchKw.value) {
    const kw = searchKw.value.toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw))
  }
  // 排序
  if (sortBy.value === 'favorited') list = [...list].sort((a, b) => (b.favorited ? 1 : 0) - (a.favorited ? 1 : 0))
  if (sortBy.value === 'visits') list = [...list].sort((a, b) => b.visits - a.visits)
  return list
})

function toggleFav(r) { r.favorited = !r.favorited }
function editReport(r) { editing.value = true; showDesigner.value = true }
function deleteReport(r) { reports.value = reports.value.filter(x => x.id !== r.id); ElMessage.success('已删除') }
function handleMore(cmd, r) {
  const map = {
    copy: () => { ElMessage.success('已复制') },
    export: () => { ElMessage.success('导出中') },
    share: () => { ElMessage.success('链接已复制到剪贴板') },
    delete: () => deleteReport(r)
  }
  map[cmd]?.()
}

// ===== 设计器 =====
const showDesigner = ref(false)
const editing = ref(false)
const dsKw = ref('')
const dsName = ref(1)
const datasets = ref([
  { id: 1, name: '订单数据集', dimensions: [{ name: '地区', type: '字符串' }, { name: '时间', type: '日期' }, { name: '渠道', type: '字符串' }, { name: '商品', type: '字符串' }], metrics: [{ name: '销售额', unit: '元' }, { name: '订单量', unit: '单' }, { name: '客户数', unit: '位' }], previewColumns: [{ prop: 'region', label: '地区' }, { prop: 'amount', label: '销售额' }, { prop: 'orders', label: '订单数' }, { prop: 'customers', label: '客户数' }] },
  { id: 2, name: '用户数据集', dimensions: [{ name: '注册时间', type: '日期' }, { name: '渠道', type: '字符串' }, { name: '用户标签', type: '字符串' }], metrics: [{ name: '新增用户', unit: '人' }, { name: '活跃用户', unit: '人' }, { name: '留存率', unit: '%' }] }
])
const currentDataset = computed(() => datasets.value.find(d => d.id === dsName.value) || datasets.value[0])
const chartType = ref('table')
const config = reactive({ rowDim: ['地区'], metric: ['销售额'], filter: '', sort: 'metric_desc', themeColor: '#1890ff', showTitle: true, showLegend: true, showLabel: false, refresh: '5m', cacheTtl: 300, permission: [] })
const propTab = ref('data')
const previewChartRef = ref(null)
let previewChart = null
const previewData = ref([
  { region: '华东', amount: 142800, orders: 1820, customers: 956 },
  { region: '华南', amount: 78320, orders: 956, customers: 568 },
  { region: '华北', amount: 51800, orders: 612, customers: 358 },
  { region: '华中', amount: 18900, orders: 285, customers: 156 },
  { region: '西南', amount: 9450, orders: 153, customers: 86 }
])

function refreshPreview() {
  if (chartType.value === 'table') return
  nextTick(() => {
    if (!previewChartRef.value) return
    if (previewChart) previewChart.dispose()
    previewChart = echarts.init(previewChartRef.value)
    const xs = previewData.value.map(d => d.region)
    const ys = previewData.value.map(d => d.amount)
    const opt = chartType.value === 'pie' ? {
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: '60%', data: xs.map((x, i) => ({ name: x, value: ys[i] })) }]
    } : {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xs },
      yAxis: { type: 'value' },
      series: [{ type: chartType.value, data: ys, itemStyle: { color: config.themeColor }, barWidth: '40%' }]
    }
    previewChart.setOption(opt)
  })
}

watch(chartType, refreshPreview)

function saveReport() { ElMessage.success('报表已发布'); showDesigner.value = false }
function saveDraft() { ElMessage.success('已保存为草稿'); showDesigner.value = false }

// ===== 预览 =====
const previewVisible = ref(false)
const previewing = ref(null)

function previewReport(r) {
  previewing.value = r
  previewVisible.value = true
  nextTick(() => {
    setTimeout(() => {
      if (!previewChartRef.value) return
      if (previewChart) previewChart.dispose()
      previewChart = echarts.init(previewChartRef.value)
      const months = ['1月', '2月', '3月', '4月', '5月', '6月']
      const seriesData = months.map(() => Math.floor(Math.random() * 1000) + 500)
      previewChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['本期', '同期'], top: 0 },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series: [
          { name: '本期', type: 'line', smooth: true, data: seriesData, areaStyle: { color: 'rgba(24,144,255,0.3)' }, itemStyle: { color: '#1890ff' } },
          { name: '同期', type: 'line', smooth: true, data: seriesData.map(v => v * 0.85), lineStyle: { type: 'dashed' }, itemStyle: { color: '#bfbfbf' } }
        ]
      })
    }, 100)
  })
}

// ===== 订阅 =====
const subVisible = ref(false)
const subscribing = ref(null)
const subForm = reactive({ cron: '0 0 9 * * ?', customCron: '', channels: ['email'], receivers: [], format: 'pdf' })

function subscribeReport(r) {
  subscribing.value = r
  subVisible.value = true
}

function confirmSubscribe() {
  if (!subForm.channels.length) { ElMessage.warning('请选择至少一个渠道'); return }
  if (!subForm.receivers.length) { ElMessage.warning('请选择收件人'); return }
  // 调用接口: POST /api/report/subscribe
  if (subscribing.value) subscribing.value.scheduled = true
  ElMessage.success('订阅创建成功，将按计划推送')
  subVisible.value = false
}

onMounted(() => {
  setTimeout(refreshPreview, 100)
})
</script>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 16px; }
.top-card { border-radius: 8px; }
.top-card :deep(.el-card__body) { padding: 0 20px; }
.top-content { display: flex; justify-content: space-between; align-items: center; }
.category-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }
.cat-label { display: flex; align-items: center; gap: 4px; }
.cat-badge { margin-left: 6px; }
.top-right { display: flex; gap: 8px; align-items: center; }

.view-bar { display: flex; justify-content: space-between; align-items: center; }
.view-right { display: flex; align-items: center; gap: 12px; }
.total-info { color: #8c8c8c; font-size: 13px; }

.grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.report-card { background: #fff; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.report-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.rc-thumb { height: 120px; display: flex; align-items: center; justify-content: center; position: relative; }
.rc-fav { position: absolute; top: 8px; right: 8px; }
.rc-sch { position: absolute; top: 8px; left: 8px; }
.rc-body { padding: 12px 16px; }
.rc-title { font-size: 15px; font-weight: 600; color: #262626; margin-bottom: 4px; }
.rc-desc { font-size: 12px; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rc-meta { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #8c8c8c; }
.rc-meta span { display: flex; align-items: center; gap: 2px; }
.rc-actions { display: flex; justify-content: space-around; padding: 8px 0; border-top: 1px solid #f0f0f0; }
.rc-act { font-size: 16px; color: #8c8c8c; cursor: pointer; padding: 4px; transition: all 0.2s; }
.rc-act:hover { color: #1890ff; }
.rc-act.active { color: #faad14; }

/* 设计器 */
.designer { display: flex; height: 70vh; gap: 12px; }
.designer-left { width: 220px; border: 1px solid #e8e8e8; border-radius: 6px; padding: 12px; overflow-y: auto; }
.left-header { margin-bottom: 12px; }
.field-tree { display: flex; flex-direction: column; gap: 6px; }
.field-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 4px; cursor: grab; transition: all 0.2s; font-size: 13px; }
.field-item:hover { background: #e6f7ff; }
.fname { flex: 1; color: #262626; }
.divider { font-size: 12px; color: #8c8c8c; padding: 8px 0 4px; border-bottom: 1px solid #f0f0f0; margin: 6px 0; }

.designer-center { flex: 1; display: flex; flex-direction: column; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden; }
.center-toolbar { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
.preview-area { flex: 1; padding: 12px; overflow: auto; }

.designer-right { width: 280px; border: 1px solid #e8e8e8; border-radius: 6px; padding: 12px; }
.designer-right :deep(.el-tabs__nav-wrap::after) { display: none; }
.designer-right :deep(.el-tabs__header) { margin-bottom: 12px; }

.preview-kpi { margin-bottom: 16px; }
.kpi-item { display: flex; flex-direction: column; padding: 12px; background: #fafafa; border-radius: 6px; }
.kpi-label { font-size: 12px; color: #8c8c8c; }
.kpi-value { font-size: 18px; font-weight: 600; color: #262626; margin-top: 4px; }
</style>
