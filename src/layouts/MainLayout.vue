<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="logo-wrapper" @click="goHome" title="返回首页">
        <img src="/favicon.svg" alt="logo" class="logo-icon" />
        <span v-show="!appStore.sidebarCollapsed" class="logo-text">BI 智能分析平台</span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="appStore.sidebarCollapsed"
          :collapse-transition="false"
          router
          background-color="#001529"
          text-color="#ffffffa6"
          active-text-color="#1890ff"
          class="sidebar-menu"
        >
          <template v-for="route in menuRoutes" :key="route.path">
            <!-- 单级菜单 -->
            <el-menu-item v-if="!route.children || route.children.length === 1" :index="getMenuIndex(route)">
              <el-icon><component :is="getMenuIcon(route)" /></el-icon>
              <template #title>{{ route.meta?.title }}</template>
            </el-menu-item>
            <!-- 多级菜单 -->
            <el-sub-menu v-else :index="route.path">
              <template #title>
                <el-icon><component :is="route.meta?.icon || 'Folder'" /></el-icon>
                <span>{{ route.meta?.title }}</span>
              </template>
              <el-menu-item
                v-for="child in route.children"
                :key="child.path"
                :index="`${route.path}/${child.path}`"
              >
                <el-icon><component :is="child.meta?.icon || 'Document'" /></el-icon>
                <template #title>{{ child.meta?.title }}</template>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 右侧主体 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="header" height="56px">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="appStore.toggleSidebar">
            <Expand v-if="appStore.sidebarCollapsed" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.meta?.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 实时时间 -->
          <span class="current-time">{{ currentTime }}</span>
          <!-- 全屏按钮 -->
          <el-tooltip content="全屏" placement="bottom">
            <el-icon class="header-action" @click="toggleFullscreen"><FullScreen /></el-icon>
          </el-tooltip>
          <!-- 消息通知 -->
          <el-badge :value="3" :max="99" class="notification-badge">
            <el-icon class="header-action"><Bell /></el-icon>
          </el-badge>
          <!-- 用户信息 -->
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="32" :src="userStore.avatar" class="user-avatar">
                {{ userStore.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <span class="username">{{ userStore.username || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <!-- 底部 -->
      <el-footer class="footer" height="36px">
        <span>BI 智能分析平台 © 2026 Powered by Vue 3 + Element Plus</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, useUserStore } from '@/stores'
import { ElMessageBox } from 'element-plus'
import { Expand, Fold, FullScreen, Bell, ArrowDown } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

// 当前时间
const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 菜单路由（过滤掉 hidden）
const mainRoute = router.options.routes.find(r => r.path === '/')
const menuRoutes = computed(() => {
  return (mainRoute?.children || []).filter(r => !r.meta?.hidden)
})

// 点击 logo 跳转首页
function goHome() {
  router.push('/dashboard')
}

// 当前激活菜单
const activeMenu = computed(() => {
  const { path } = route
  return path
})

// 面包屑
const breadcrumbs = computed(() => {
  return route.matched.filter(item => item.meta?.title)
})

// 获取菜单索引路径
function getMenuIndex(route) {
  if (route.children && route.children.length === 1) {
    return `${route.path}/${route.children[0].path}`.replace('//', '/')
  }
  return route.path
}

// 获取菜单图标
function getMenuIcon(route) {
  if (route.children && route.children.length === 1) {
    return route.children[0].meta?.icon || route.meta?.icon || 'Document'
  }
  return route.meta?.icon || 'Folder'
}

// 全屏切换
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// 用户操作
function handleUserCommand(command) {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'password':
      ElMessageBox.alert('修改密码功能开发中', '提示')
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userStore.logout()
        router.push('/login')
      }).catch(() => {})
      break
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.logo-wrapper {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid #ffffff1a;
  padding: 0 16px;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logo-wrapper:hover {
  background-color: #ffffff14;
}

.logo-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}

.sidebar-menu {
  border-right: none;
}

.main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #333;
}

.collapse-btn:hover {
  color: #1890ff;
}

.breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.current-time {
  color: #666;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.header-action {
  font-size: 18px;
  cursor: pointer;
  color: #666;
}

.header-action:hover {
  color: #1890ff;
}

.notification-badge {
  line-height: 1;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  color: #fff;
  font-size: 14px;
}

.username {
  color: #333;
  font-size: 14px;
}

.main-content {
  background: #f0f2f5;
  overflow-y: auto;
  padding: 20px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  color: #999;
  font-size: 12px;
}

/* 路由过渡动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.25s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
