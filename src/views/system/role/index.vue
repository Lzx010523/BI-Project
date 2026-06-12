<template>
  <div class="role-manage-page">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">角色管理</span>
          <el-button type="primary" :icon="Plus" @click="showRoleDialog()">新增角色</el-button>
        </div>
      </template>
      <el-table :data="roleList" stripe :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="roleName" label="角色名称" width="150" />
        <el-table-column prop="roleKey" label="角色标识" width="150" />
        <el-table-column prop="description" label="角色描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="userCount" label="用户数" width="80" align="center" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small" round>{{ row.status === 'active' ? '启用' : '禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showRoleDialog(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="showPermissionDialog(row)">权限</el-button>
            <el-popconfirm title="确定删除该角色？" @confirm="deleteRole(row)">
              <template #reference><el-button link type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色编辑弹窗 -->
    <el-dialog v-model="roleDialogVisible" :title="editingRole ? '编辑角色' : '新增角色'" width="500px" destroy-on-close>
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="角色名称" required><el-input v-model="roleForm.roleName" /></el-form-item>
        <el-form-item label="角色标识" required><el-input v-model="roleForm.roleKey" placeholder="如：admin, analyst" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="roleForm.sort" :min="0" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="roleForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 权限配置弹窗 -->
    <el-dialog v-model="permDialogVisible" title="权限配置" width="500px" destroy-on-close>
      <el-tree :data="permissionTree" show-checkbox node-key="id" :default-checked-keys="checkedPermissions" ref="treeRef" :props="{ label: 'name', children: 'children' }" />
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermissions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'
import { Plus } from '@element-plus/icons-vue'

const roleList = ref([
  { id: 1, roleName: '超级管理员', roleKey: 'admin', description: '拥有系统全部权限，可管理用户、角色和系统配置', userCount: 1, sort: 0, status: 'active', createTime: '2025-01-01 00:00:00' },
  { id: 2, roleName: '数据分析师', roleKey: 'analyst', description: '可访问数据大屏、周报、导出及数据填报模块', userCount: 5, sort: 1, status: 'active', createTime: '2025-01-15 10:00:00' },
  { id: 3, roleName: '运营人员', roleKey: 'operator', description: '可访问数据大屏和数据填报模块', userCount: 8, sort: 2, status: 'active', createTime: '2025-02-01 09:00:00' },
  { id: 4, roleName: '只读用户', roleKey: 'viewer', description: '仅可查看数据大屏和周报，无编辑和导出权限', userCount: 14, sort: 3, status: 'active', createTime: '2025-03-01 08:00:00' }
])

const roleDialogVisible = ref(false)
const editingRole = ref(null)
const roleForm = reactive({ roleName: '', roleKey: '', sort: 0, description: '' })

function showRoleDialog(row) {
  editingRole.value = row || null
  if (row) Object.assign(roleForm, row)
  else Object.assign(roleForm, { roleName: '', roleKey: '', sort: 0, description: '' })
  roleDialogVisible.value = true
}

function saveRole() { ElMessage.success('保存成功'); roleDialogVisible.value = false }
function deleteRole(row) { ElMessage.success('删除成功') }

// ===== 权限树 =====
const permDialogVisible = ref(false)
const treeRef = ref(null)
const checkedPermissions = ref([101, 201, 202, 301, 401])
const permissionTree = ref([
  { id: 1, name: '实时数据大屏', children: [{ id: 101, name: '查看大屏' }, { id: 102, name: '导出数据' }] },
  { id: 2, name: '周报管理', children: [{ id: 201, name: '查看周报' }, { id: 202, name: '生成周报' }, { id: 203, name: '发送周报' }, { id: 204, name: '删除周报' }] },
  { id: 3, name: '数据导出', children: [{ id: 301, name: '创建导出任务' }, { id: 302, name: '下载文件' }, { id: 303, name: '删除任务' }] },
  { id: 4, name: '告警监控', children: [{ id: 401, name: '查看告警' }, { id: 402, name: '管理规则' }, { id: 403, name: 'Webhook配置' }] },
  { id: 5, name: '操作审计', children: [{ id: 501, name: '查看日志' }, { id: 502, name: '导出日志' }] },
  { id: 6, name: '数据填报', children: [{ id: 601, name: '查看数据' }, { id: 602, name: '新增数据' }, { id: 603, name: '编辑数据' }, { id: 604, name: '批量导入' }, { id: 605, name: '删除数据' }] },
  { id: 7, name: '系统管理', children: [{ id: 701, name: '用户管理' }, { id: 702, name: '角色管理' }, { id: 703, name: '系统配置' }] }
])

function showPermissionDialog(row) { permDialogVisible.value = true }
function savePermissions() { ElMessage.success('权限配置已保存'); permDialogVisible.value = false }
</script>

<style scoped>
.role-manage-page { display: flex; flex-direction: column; gap: 16px; }
.table-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #262626; }
</style>
