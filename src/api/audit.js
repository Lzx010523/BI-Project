import request from '@/utils/request'

export const auditApi = {
  // 获取操作日志列表（分页，支持多条件筛选）
  getAuditLogList: (params) => request.get('/audit/log/list', { params }),
  // 获取操作日志详情（含变更快照）
  getAuditLogDetail: (id) => request.get(`/audit/log/${id}`),
  // 获取操作类型字典
  getOperationTypes: () => request.get('/audit/operation-types'),
  // 导出操作日志
  exportAuditLog: (params) => request.get('/audit/log/export', { params, responseType: 'blob' }),
  // 获取日志保留策略配置
  getRetentionPolicy: () => request.get('/audit/retention-policy'),
  // 更新日志保留策略
  updateRetentionPolicy: (data) => request.put('/audit/retention-policy', data)
}
