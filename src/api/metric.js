import request from '@/utils/request'

export const metricApi = {
  // 指标列表
  list: (params) => request.get('/metric/list', { params }),
  // 指标详情
  detail: (id) => request.get(`/metric/${id}`),
  // 创建指标
  create: (data) => request.post('/metric', data),
  // 更新指标
  update: (id, data) => request.put(`/metric/${id}`, data),
  // 删除指标
  remove: (id) => request.delete(`/metric/${id}`),
  // 发布/下线
  toggleStatus: (id, status) => request.patch(`/metric/${id}/status`, { status }),
  // 数据预览
  preview: (id, params) => request.get(`/metric/${id}/preview`, { params }),
  // 维度列表
  dimensionList: () => request.get('/metric/dimensions'),
  // 导入
  import: (formData) => request.post('/metric/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  // 导出
  export: (params) => request.get('/metric/export', { params, responseType: 'blob' })
}
