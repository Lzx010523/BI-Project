import request from '@/utils/request'

export const userApi = {
  // 获取用户列表（分页）
  getUserList: (params) => request.get('/system/user/list', { params }),
  // 获取用户详情
  getUserDetail: (id) => request.get(`/system/user/${id}`),
  // 创建用户
  createUser: (data) => request.post('/system/user', data),
  // 更新用户
  updateUser: (id, data) => request.put(`/system/user/${id}`, data),
  // 删除用户
  deleteUser: (id) => request.delete(`/system/user/${id}`),
  // 重置用户密码
  resetPassword: (id) => request.put(`/system/user/reset-password/${id}`),
  // 启用/禁用用户
  toggleUserStatus: (id, status) => request.put(`/system/user/status/${id}`, { status }),
  // 获取角色列表
  getRoleList: (params) => request.get('/system/role/list', { params }),
  // 创建角色
  createRole: (data) => request.post('/system/role', data),
  // 更新角色
  updateRole: (id, data) => request.put(`/system/role/${id}`, data),
  // 删除角色
  deleteRole: (id) => request.delete(`/system/role/${id}`),
  // 获取权限菜单树
  getPermissionTree: () => request.get('/system/permission/tree'),
  // 获取系统配置
  getSystemConfig: () => request.get('/system/config'),
  // 更新系统配置
  updateSystemConfig: (data) => request.put('/system/config', data)
}
