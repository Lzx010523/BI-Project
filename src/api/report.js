import request from '@/utils/request'

export const reportApi = {
  // 获取周报列表（分页）
  getReportList: (params) => request.get('/report/weekly/list', { params }),
  // 获取周报详情
  getReportDetail: (id) => request.get(`/report/weekly/${id}`),
  // 手动触发周报生成
  generateReport: (data) => request.post('/report/weekly/generate', data),
  // 预览周报HTML
  previewReport: (id) => request.get(`/report/weekly/preview/${id}`),
  // 手动发送周报邮件
  sendReport: (id, data) => request.post(`/report/weekly/send/${id}`, data),
  // 删除周报
  deleteReport: (id) => request.delete(`/report/weekly/${id}`),
  // 获取周报收件人配置
  getRecipients: () => request.get('/report/weekly/recipients'),
  // 更新周报收件人配置
  updateRecipients: (data) => request.put('/report/weekly/recipients', data)
}
