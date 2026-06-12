import request from '@/utils/request'

export const dashboardApi = {
  // 获取当日实时订单统计（预聚合数据，5秒轮询）
  getRealtimeStats: () => request.get('/dashboard/realtime/stats'),
  // 获取当日订单趋势数据（按小时）
  getHourlyTrend: (params) => request.get('/dashboard/hourly-trend', { params }),
  // 获取商品销量排行 TOP10
  getSalesRanking: (params) => request.get('/dashboard/sales-ranking', { params }),
  // 获取区域销售分布
  getRegionDistribution: (params) => request.get('/dashboard/region-distribution', { params }),
  // 获取订单状态分布
  getOrderStatusDist: () => request.get('/dashboard/order-status'),
  // 获取核心指标卡片数据（订单量、销售额、新增用户、转化率等）
  getKpiCards: (params) => request.get('/dashboard/kpi-cards', { params }),
  // 获取昨日对比数据
  getComparisonData: (params) => request.get('/dashboard/comparison', { params })
}
