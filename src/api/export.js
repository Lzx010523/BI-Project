import request from '@/utils/request'

export const exportApi = {
  // 创建异步导出任务（埋点数据等大数据量导出）
  createExportTask: (data) => request.post('/export/task/create', data),
  // 查询导出任务列表
  getExportTaskList: (params) => request.get('/export/task/list', { params }),
  // 查询导出任务状态
  getExportTaskStatus: (taskId) => request.get(`/export/task/status/${taskId}`),
  // 下载已完成的导出文件
  downloadExportFile: (taskId) => request.get(`/export/task/download/${taskId}`, { responseType: 'blob' }),
  // 取消导出任务
  cancelExportTask: (taskId) => request.put(`/export/task/cancel/${taskId}`),
  // 删除导出任务记录
  deleteExportTask: (taskId) => request.delete(`/export/task/${taskId}`),
  // 获取可导出的数据类型列表
  getExportTypes: () => request.get('/export/types')
}
