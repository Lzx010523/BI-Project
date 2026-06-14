import request from '@/utils/request'

export const aiAnalysisApi = {
  // 智能问答
  ask: (data) => request.post('/ai/ask', data),
  // 历史会话
  historyList: (params) => request.get('/ai/history', { params }),
  // 删除会话
  removeHistory: (id) => request.delete(`/ai/history/${id}`),
  // 使用统计
  usageStat: () => request.get('/ai/usage'),
  // 模型列表
  modelList: () => request.get('/ai/models')
}
