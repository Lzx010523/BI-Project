<template>
  <div class="config-page">
    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">系统参数配置</span></template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="任务调度" name="job">
              <el-form :model="jobConfig" label-width="160px">
                <el-form-item label="预聚合任务频率">
                  <el-select v-model="jobConfig.aggregationInterval" style="width: 200px">
                    <el-option label="每 5 秒" value="5" /><el-option label="每 10 秒" value="10" /><el-option label="每 30 秒" value="30" /><el-option label="每 1 分钟" value="60" />
                  </el-select>
                  <span class="config-hint">XXL-JOB 定时轮询当日订单数据写入统计表</span>
                </el-form-item>
                <el-form-item label="周报生成时间">
                  <el-time-picker v-model="jobConfig.weeklyReportTime" format="HH:mm" />
                  <span class="config-hint">默认每周一 00:00 自动执行</span>
                </el-form-item>
                <el-form-item label="任务超时阈值(秒)">
                  <el-input-number v-model="jobConfig.taskTimeout" :min="10" :max="3600" />
                </el-form-item>
                <el-form-item label="失败重试次数">
                  <el-input-number v-model="jobConfig.retryCount" :min="0" :max="5" />
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="告警配置" name="alert">
              <el-form :model="alertConfig" label-width="160px">
                <el-form-item label="异常触发阈值">
                  <el-input-number v-model="alertConfig.errorThreshold" :min="1" :max="10" />
                  <span class="config-hint">Redis 原子计数器连续异常达到该值时告警</span>
                </el-form-item>
                <el-form-item label="告警静默时间(分)">
                  <el-input-number v-model="alertConfig.silenceMinutes" :min="5" :max="1440" />
                  <span class="config-hint">同规则告警在该时间内不重复发送</span>
                </el-form-item>
                <el-form-item label="企业微信 Webhook">
                  <el-input v-model="alertConfig.webhookUrl" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" style="width: 400px" />
                </el-form-item>
                <el-form-item label="告警接收群">
                  <el-input v-model="alertConfig.notifyGroup" placeholder="内部开发群" />
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="数据导出" name="export">
              <el-form :model="exportConfig" label-width="160px">
                <el-form-item label="单次最大导出量">
                  <el-input-number v-model="exportConfig.maxRows" :min="10000" :max="10000000" :step="100000" />
                  <span class="config-hint">行，超出将分片处理</span>
                </el-form-item>
                <el-form-item label="MyBatis Cursor 批次大小">
                  <el-input-number v-model="exportConfig.cursorBatchSize" :min="100" :max="10000" :step="100" />
                </el-form-item>
                <el-form-item label="EasyExcel 行缓存">
                  <el-input-number v-model="exportConfig.excelRowCache" :min="100" :max="5000" :step="100" />
                </el-form-item>
                <el-form-item label="RabbitMQ 队列名">
                  <el-input v-model="exportConfig.queueName" style="width: 300px" />
                </el-form-item>
                <el-form-item label="文件保留天数">
                  <el-input-number v-model="exportConfig.fileRetentionDays" :min="1" :max="90" />
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="日志审计" name="audit">
              <el-form :model="auditConfig" label-width="160px">
                <el-form-item label="日志保留天数">
                  <el-input-number v-model="auditConfig.retentionDays" :min="30" :max="365" />
                </el-form-item>
                <el-form-item label="敏感操作关键词">
                  <el-select v-model="auditConfig.sensitiveKeywords" multiple filterable allow-create style="width: 400px">
                    <el-option label="DELETE" value="DELETE" /><el-option label="PERMISSION" value="PERMISSION" /><el-option label="CONFIG" value="CONFIG" /><el-option label="IMPORT" value="IMPORT" />
                  </el-select>
                </el-form-item>
                <el-form-item label="高风险操作自动标记">
                  <el-switch v-model="auditConfig.autoMarkHighRisk" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          <div style="text-align: right; margin-top: 20px">
            <el-button @click="resetConfig">恢复默认</el-button>
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="card-title">系统信息</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="系统版本">v2.1.0</el-descriptions-item>
            <el-descriptions-item label="前端框架">Vue 3.5 + Element Plus 2.14</el-descriptions-item>
            <el-descriptions-item label="图表引擎">ECharts 6.1</el-descriptions-item>
            <el-descriptions-item label="后端框架">Spring Boot 3.x</el-descriptions-item>
            <el-descriptions-item label="任务调度">XXL-JOB</el-descriptions-item>
            <el-descriptions-item label="消息队列">RabbitMQ</el-descriptions-item>
            <el-descriptions-item label="缓存">Redis</el-descriptions-item>
            <el-descriptions-item label="数据库">MySQL 8.0</el-descriptions-item>
            <el-descriptions-item label="模板引擎">FreeMarker</el-descriptions-item>
            <el-descriptions-item label="Excel 处理">EasyExcel</el-descriptions-item>
            <el-descriptions-item label="ORM">MyBatis Plus</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" style="margin-top: 16px">
          <template #header><span class="card-title">服务状态</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="API 服务"><el-tag type="success" size="small" round>运行中</el-tag></el-descriptions-item>
            <el-descriptions-item label="XXL-JOB"><el-tag type="success" size="small" round>运行中</el-tag></el-descriptions-item>
            <el-descriptions-item label="RabbitMQ"><el-tag type="success" size="small" round>运行中</el-tag></el-descriptions-item>
            <el-descriptions-item label="Redis"><el-tag type="success" size="small" round>运行中</el-tag></el-descriptions-item>
            <el-descriptions-item label="MySQL"><el-tag type="success" size="small" round>运行中</el-tag></el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('job')

const jobConfig = reactive({ aggregationInterval: '5', weeklyReportTime: null, taskTimeout: 300, retryCount: 3 })
const alertConfig = reactive({ errorThreshold: 3, silenceMinutes: 30, webhookUrl: '', notifyGroup: '内部开发群' })
const exportConfig = reactive({ maxRows: 5000000, cursorBatchSize: 1000, excelRowCache: 500, queueName: 'bi.export.queue', fileRetentionDays: 30 })
const auditConfig = reactive({ retentionDays: 180, sensitiveKeywords: ['DELETE', 'PERMISSION'], autoMarkHighRisk: true })

function saveConfig() { ElMessage.success('系统配置已保存') }
function resetConfig() { ElMessage.info('已恢复默认配置') }
</script>

<style scoped>
.config-page { }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.config-hint { margin-left: 12px; color: #999; font-size: 12px; }
</style>
