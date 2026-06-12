import request from '@/utils/request'

export const alertApi = {
  // 获取告警规则列表
  getAlertRules: (params) => request.get('/alert/rules/list', { params }),
  // 创建告警规则
  createAlertRule: (data) => request.post('/alert/rules', data),
  // 更新告警规则
  updateAlertRule: (id, data) => request.put(`/alert/rules/${id}`, data),
  // 删除告警规则
  deleteAlertRule: (id) => request.delete(`/alert/rules/${id}`),
  // 获取告警历史记录（分页）
  getAlertHistory: (params) => request.get('/alert/history/list', { params }),
  // 标记告警为已处理
  markAlertResolved: (id, data) => request.put(`/alert/history/resolve/${id}`, data),
  // 获取告警统计概览（今日告警数、未处理数等）
  getAlertSummary: () => request.get('/alert/summary'),
  // 测试企业微信 Webhook 连通性
  testWebhook: (data) => request.post('/alert/webhook/test', data),
  // 获取 Webhook 配置
  getWebhookConfig: () => request.get('/alert/webhook/config'),
  // 更新 Webhook 配置
  updateWebhookConfig: (data) => request.put('/alert/webhook/config', data)
}
