import request from '@/utils/request'

export const datasourceApi = {
  // 数据源列表
  list: () => request.get('/datasource/list'),
  // 详情
  detail: (id) => request.get(`/datasource/${id}`),
  // 新增
  create: (data) => request.post('/datasource', data),
  // 更新
  update: (id, data) => request.put(`/datasource/${id}`, data),
  // 删除
  remove: (id) => request.delete(`/datasource/${id}`),
  // 测试单个连接
  testConnection: (id) => request.post(`/datasource/${id}/test`),
  // 测试全部连接
  testAll: () => request.post('/datasource/test-all'),
  // 浏览 Schema
  schema: (id, params) => request.get(`/datasource/${id}/schema`, { params }),
  // 同步
  sync: (id) => request.post(`/datasource/${id}/sync`),
  // 健康度
  health: (id) => request.get(`/datasource/${id}/health`)
}
