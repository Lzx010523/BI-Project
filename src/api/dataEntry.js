import request from '@/utils/request'
import axios from 'axios'

const saleRequest = axios.create({
  baseURL: 'http://localhost:9201',
  timeout: 30000
})
// 复用 token
saleRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('bi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const dataEntryApi = {
  // 获取表单模板列表
  getFormTemplates: (params) => request.get('/data-entry/templates/list', { params }),
  // 获取表单模板详情（字段配置）
  getFormTemplateDetail: (id) => request.get(`/data-entry/templates/${id}`),
  // 创建表单模板
  createFormTemplate: (data) => request.post('/data-entry/templates', data),
  // 更新表单模板
  updateFormTemplate: (id, data) => request.put(`/data-entry/templates/${id}`, data),
  // 删除表单模板
  deleteFormTemplate: (id) => request.delete(`/data-entry/templates/${id}`),
  // 保存单条填报数据
  saveEntryData: (data) => request.post('/data-entry/data/save', data),
  // 批量保存填报数据
  batchSaveEntryData: (data) => request.post('/data-entry/data/batch-save', data),
  // 获取填报数据列表（分页）
  getEntryDataList: (params) => request.get('/data-entry/data/list', { params }),
  // 更新填报数据
  updateEntryData: (id, data) => request.put(`/data-entry/data/${id}`, data),
  // 删除填报数据
  deleteEntryData: (id) => request.delete(`/data-entry/data/${id}`),
  // 批量导入（文件上传）
  importEntryData: (formData) => request.post('/data-entry/data/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // 下载导入模板
  downloadImportTemplate: () => saleRequest.post('/sale/exportTemplateExcelFile', {}, { responseType: 'blob' }),
  // 导出填报数据
  exportEntryData: (params) => request.get('/data-entry/data/export', { params, responseType: 'blob' })
}
