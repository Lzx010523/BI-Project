import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bi_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 文件下载（blob）直接返回整个 response
    if (response.config.responseType === 'blob') {
      const contentType = response.headers['content-type'] || ''
      // 如果后端返回的是 JSON 错误而非文件流，解析并拒绝
      if (contentType.includes('json')) {
        return response.data.text().then((text) => {
          try {
            const res = JSON.parse(text)
            if (res.code !== 200 && res.code !== 0) {
              ElMessage.error(res.msg || res.message || '请求失败')
              return Promise.reject(new Error(res.msg || '请求失败'))
            }
          } catch {}
          return response
        })
      }
      return response
    }
    const { code, message, data } = response.data
    if (code === 200 || code === 0) {
      return data
    }
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        localStorage.removeItem('bi_token')
        localStorage.removeItem('bi_user')
        router.push('/login')
        ElMessage.error('登录已过期，请重新登录')
      } else if (status === 403) {
        ElMessage.error('没有权限访问')
      } else if (status === 500) {
        ElMessage.error('服务器内部错误')
      }
    } else {
      ElMessage.error('网络连接异常')
    }
    return Promise.reject(error)
  }
)

export default service
