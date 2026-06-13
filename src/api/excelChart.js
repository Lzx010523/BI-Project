import request from '@/utils/request'

export const excelChartApi = {
  // 上传 Excel/CSV 并解析为图表数据
  parseFile: (formData) => request.post('/excel-chart/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // 导出图表为图片（可选：后端生成）
  exportChart: (params) => request.get('/excel-chart/export', { params, responseType: 'blob' })
}
