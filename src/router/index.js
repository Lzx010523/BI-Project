import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '实时数据大屏', icon: 'Odometer' }
      },
      {
        path: 'report',
        name: 'WeeklyReport',
        component: () => import('@/views/report/index.vue'),
        meta: { title: '周报管理', icon: 'Document' }
      },
      {
        path: 'export',
        name: 'DataExport',
        component: () => import('@/views/export/index.vue'),
        meta: { title: '数据导出中心', icon: 'Download' }
      },
      {
        path: 'alert',
        name: 'AlertMonitor',
        component: () => import('@/views/alert/index.vue'),
        meta: { title: '告警监控', icon: 'Bell' }
      },
      {
        path: 'audit',
        name: 'AuditLog',
        component: () => import('@/views/audit/index.vue'),
        meta: { title: '操作审计日志', icon: 'Notebook' }
      },
      {
        path: 'excel-chart',
        name: 'ExcelChart',
        component: () => import('@/views/excelChart/index.vue'),
        meta: { title: '数据导入生成图表', icon: 'DataLine' }
      },
      {
        path: 'data-entry',
        name: 'DataEntry',
        component: () => import('@/views/dataEntry/index.vue'),
        meta: { title: '数据填报', icon: 'Edit' }
      },
      {
        path: 'system',
        name: 'System',
        redirect: '/system/user',
        meta: { title: '系统管理', icon: 'Setting' },
        children: [
          {
            path: 'user',
            name: 'UserManage',
            component: () => import('@/views/system/user/index.vue'),
            meta: { title: '用户管理', icon: 'User' }
          },
          {
            path: 'role',
            name: 'RoleManage',
            component: () => import('@/views/system/role/index.vue'),
            meta: { title: '角色管理', icon: 'UserFilled' }
          },
          {
            path: 'config',
            name: 'SystemConfig',
            component: () => import('@/views/system/config/index.vue'),
            meta: { title: '系统配置', icon: 'Tools' }
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', hidden: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫（暂时关闭登录拦截，方便预览页面）
router.beforeEach((to, from, next) => {
  NProgress.start()
  document.title = `${to.meta.title || ''} - BI 智能分析平台`

  // const token = localStorage.getItem('bi_token')
  // if (to.path === '/login') {
  //   next()
  // } else if (!token) {
  //   next('/login')
  // } else {
  //   next()
  // }
  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
