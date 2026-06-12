import request from '@/utils/request'

export const authApi = {
  // 用户登录
  login: (data) => request.post('/auth/login', data),
  // 用户登出
  logout: () => request.post('/auth/logout'),
  // 获取当前用户信息
  getUserInfo: () => request.get('/auth/userinfo'),
  // 修改密码
  changePassword: (data) => request.put('/auth/password', data),
  // 刷新Token
  refreshToken: () => request.post('/auth/refresh-token')
}
