import request from '@/utils/request'

export const etlApi = {
  // 任务列表
  list: (params) => request.get('/etl/task/list', { params }),
  // 任务详情
  detail: (id) => request.get(`/etl/task/${id}`),
  // 创建
  create: (data) => request.post('/etl/task', data),
  // 更新
  update: (id, data) => request.put(`/etl/task/${id}`, data),
  // 删除
  remove: (id) => request.delete(`/etl/task/${id}`),
  // 运行
  run: (id) => request.post(`/etl/task/${id}/run`),
  // 停止
  stop: (id) => request.post(`/etl/task/${id}/stop`),
  // 校验
  validate: (data) => request.post('/etl/task/validate', data),
  // 节点库
  nodeLib: () => request.get('/etl/node/lib'),
  // 节点详情
  nodeDetail: (key) => request.get(`/etl/node/${key}`),
  // 运行日志
  runLog: (id, params) => request.get(`/etl/task/${id}/log`, { params }),
  // 节点日志
  nodeLog: (id, nodeId) => request.get(`/etl/task/${id}/node-log`, { params: { nodeId } })
}
