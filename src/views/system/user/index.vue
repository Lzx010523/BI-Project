<template>
  <div class="user-manage-page">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名"><el-input v-model="searchForm.username" placeholder="搜索用户名" clearable style="width: 150px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="启用" value="active" /><el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="全部" clearable style="width: 150px">
            <el-option label="超级管理员" value="1" /><el-option label="数据分析师" value="2" /><el-option label="运营人员" value="3" /><el-option label="只读用户" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchList">查询</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">用户管理</span>
          <el-button type="primary" :icon="Plus" @click="showUserDialog()">新增用户</el-button>
        </div>
      </template>
      <el-table :data="userList" stripe :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="roleName" label="角色" width="120">
          <template #default="{ row }"><el-tag size="small">{{ row.roleName }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }"><el-switch v-model="row.status" active-value="active" inactive-value="disabled" @change="toggleStatus(row)" /></template>
        </el-table-column>
        <el-table-column prop="lastLoginTime" label="最后登录" width="170" />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showUserDialog(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="resetPwd(row)">重置密码</el-button>
            <el-popconfirm title="确定删除该用户？" @confirm="deleteUser(row)">
              <template #reference><el-button link type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper" background />
      </div>
    </el-card>

    <el-dialog v-model="userDialogVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="550px" destroy-on-close>
      <el-form :model="userForm" label-width="80px" :rules="userRules" ref="userFormRef">
        <el-form-item label="用户名" prop="username"><el-input v-model="userForm.username" :disabled="!!editingUser" /></el-form-item>
        <el-form-item label="姓名" prop="realName"><el-input v-model="userForm.realName" /></el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="userForm.email" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="userForm.phone" /></el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="userForm.roleId" placeholder="请选择" style="width: 100%">
            <el-option label="超级管理员" value="1" /><el-option label="数据分析师" value="2" /><el-option label="运营人员" value="3" /><el-option label="只读用户" value="4" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingUser" label="初始密码" prop="password"><el-input v-model="userForm.password" type="password" show-password /></el-form-item>
        <el-form-item label="备注"><el-input v-model="userForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(28)
const searchForm = reactive({ username: '', status: '', roleId: '' })

const userList = ref([
  { id: 1, username: 'admin', realName: '系统管理员', email: 'admin@company.com', phone: '13800138000', roleName: '超级管理员', status: 'active', lastLoginTime: '2026-06-12 14:30:15', createTime: '2025-01-01 00:00:00' },
  { id: 2, username: 'zhangwei', realName: '张伟', email: 'zhangwei@company.com', phone: '13800138001', roleName: '数据分析师', status: 'active', lastLoginTime: '2026-06-12 10:22:08', createTime: '2025-03-15 09:30:00' },
  { id: 3, username: 'liming', realName: '李明', email: 'liming@company.com', phone: '13800138002', roleName: '数据分析师', status: 'active', lastLoginTime: '2026-06-12 09:15:33', createTime: '2025-04-20 14:00:00' },
  { id: 4, username: 'wangfang', realName: '王芳', email: 'wangfang@company.com', phone: '13800138003', roleName: '运营人员', status: 'active', lastLoginTime: '2026-06-11 17:45:22', createTime: '2025-06-10 11:20:00' },
  { id: 5, username: 'zhaoliu', realName: '赵六', email: 'zhaoliu@company.com', phone: '13800138004', roleName: '运营人员', status: 'disabled', lastLoginTime: '2026-05-28 16:30:18', createTime: '2025-08-01 08:45:00' }
])

function fetchList() { loading.value = true; setTimeout(() => { loading.value = false }, 500) }
function resetSearch() { Object.assign(searchForm, { username: '', status: '', roleId: '' }); fetchList() }

const userDialogVisible = ref(false)
const editingUser = ref(null)
const userFormRef = ref(null)
const userForm = reactive({ username: '', realName: '', email: '', phone: '', roleId: '', password: '', remark: '' })
const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function showUserDialog(row) {
  editingUser.value = row || null
  if (row) Object.assign(userForm, row)
  else Object.assign(userForm, { username: '', realName: '', email: '', phone: '', roleId: '', password: '', remark: '' })
  userDialogVisible.value = true
}

async function saveUser() {
  const valid = await userFormRef.value?.validate().catch(() => false)
  if (!valid) return
  ElMessage.success('保存成功')
  userDialogVisible.value = false
  fetchList()
}

function toggleStatus(row) { ElMessage.success(`用户 ${row.username} 已${row.status === 'active' ? '启用' : '禁用'}`) }
function resetPwd(row) { ElMessage.success(`已重置 ${row.realName} 的密码为默认密码`) }
function deleteUser(row) { ElMessage.success('删除成功'); fetchList() }
</script>

<style scoped>
.user-manage-page { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
