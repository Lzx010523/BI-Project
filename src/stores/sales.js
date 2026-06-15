import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSalesStore = defineStore('sales', () => {
  // 销售数据列表（匹配 sales_data_entry 表结构）
  const salesList = ref([
    { id: 1, order_no: 'ORD20260601001', product_name: '智能手机Pro', sale_time: '2026-06-01 09:30:00', region: '华东', department: '销售部', channel_type: '线下门店', sales_amount: 42800, sales_qty: 12, data_source: 'MANUAL_ENTRY', creator_name: '张伟', created_at: '2026-06-01 09:30:15', updated_at: '2026-06-01 09:30:15' },
    { id: 2, order_no: 'ORD20260601002', product_name: '无线耳机X3', sale_time: '2026-06-02 10:15:00', region: '华南', department: '市场部', channel_type: '小程序', sales_amount: 18600, sales_qty: 45, data_source: 'MANUAL_ENTRY', creator_name: '李明', created_at: '2026-06-02 10:15:22', updated_at: '2026-06-02 10:15:22' },
    { id: 3, order_no: 'ORD20260602003', product_name: '平板Air', sale_time: '2026-06-03 14:20:00', region: '华北', department: '运营部', channel_type: '分销商', sales_amount: 35200, sales_qty: 8, data_source: 'BATCH_IMPORT', creator_name: '王芳', created_at: '2026-06-03 14:20:30', updated_at: '2026-06-03 14:20:30' },
    { id: 4, order_no: 'ORD20260603004', product_name: '机械键盘K1', sale_time: '2026-06-04 11:45:00', region: '华中', department: '销售部', channel_type: '线下门店', sales_amount: 12500, sales_qty: 30, data_source: 'MANUAL_ENTRY', creator_name: '赵六', created_at: '2026-06-04 11:45:18', updated_at: '2026-06-04 11:45:18' },
    { id: 5, order_no: 'ORD20260604005', product_name: '4K显示器', sale_time: '2026-06-05 09:10:00', region: '西南', department: '销售部', channel_type: '线上直营', sales_amount: 56800, sales_qty: 15, data_source: 'MANUAL_ENTRY', creator_name: '张伟', created_at: '2026-06-05 09:10:05', updated_at: '2026-06-05 09:10:05' },
    { id: 6, order_no: 'ORD20260605006', product_name: '蓝牙音箱S2', sale_time: '2026-06-06 16:30:00', region: '华东', department: '市场部', channel_type: '小程序', sales_amount: 28900, sales_qty: 60, data_source: 'SYSTEM_AUTO', creator_name: '系统', created_at: '2026-06-06 16:30:10', updated_at: '2026-06-06 16:30:10' },
    { id: 7, order_no: 'ORD20260606007', product_name: '智能手表W5', sale_time: '2026-06-07 08:20:00', region: '华南', department: '运营部', channel_type: '分销商', sales_amount: 22400, sales_qty: 25, data_source: 'MANUAL_ENTRY', creator_name: '李明', created_at: '2026-06-07 08:20:45', updated_at: '2026-06-07 08:20:45' },
    { id: 8, order_no: 'ORD20260607008', product_name: '游戏手柄G1', sale_time: '2026-06-08 13:50:00', region: '华北', department: '销售部', channel_type: '线下门店', sales_amount: 9800, sales_qty: 40, data_source: 'BATCH_IMPORT', creator_name: '王芳', created_at: '2026-06-08 13:50:22', updated_at: '2026-06-08 13:50:22' }
  ])

  let nextId = 9

  // ===== 汇总计算 =====
  const totalCount = computed(() => salesList.value.length)
  const totalAmount = computed(() => salesList.value.reduce((sum, item) => sum + item.sales_amount, 0))
  const totalQty = computed(() => salesList.value.reduce((sum, item) => sum + item.sales_qty, 0))

  // 按地区汇总
  const regionSummary = computed(() => {
    const map = {}
    salesList.value.forEach(item => {
      if (!map[item.region]) map[item.region] = { region: item.region, orders: 0, revenue: 0, qty: 0 }
      map[item.region].orders++
      map[item.region].revenue += item.sales_amount
      map[item.region].qty += item.sales_qty
    })
    return Object.values(map)
  })

  // 按部门汇总
  const deptSummary = computed(() => {
    const map = {}
    salesList.value.forEach(item => {
      if (!map[item.department]) map[item.department] = { department: item.department, orders: 0, revenue: 0, qty: 0 }
      map[item.department].orders++
      map[item.department].revenue += item.sales_amount
      map[item.department].qty += item.sales_qty
    })
    return Object.values(map)
  })

  // 按渠道汇总
  const channelSummary = computed(() => {
    const map = {}
    salesList.value.forEach(item => {
      if (!map[item.channel_type]) map[item.channel_type] = { channel: item.channel_type, orders: 0, revenue: 0, qty: 0 }
      map[item.channel_type].orders++
      map[item.channel_type].revenue += item.sales_amount
      map[item.channel_type].qty += item.sales_qty
    })
    return Object.values(map)
  })

  // 按商品汇总 (用于 TOP 排行)
  const productSummary = computed(() => {
    const map = {}
    salesList.value.forEach(item => {
      if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
      map[item.product_name].qty += item.sales_qty
      map[item.product_name].revenue += item.sales_amount
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty)
  })

  // ===== CRUD 操作 =====
  function addSalesData(data) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    salesList.value.push({
      ...data,
      id: nextId++,
      created_at: now,
      updated_at: now
    })
  }

  function updateSalesData(id, data) {
    const idx = salesList.value.findIndex(item => item.id === id)
    if (idx !== -1) {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      salesList.value[idx] = { ...salesList.value[idx], ...data, updated_at: now }
    }
  }

  function deleteSalesData(id) {
    const idx = salesList.value.findIndex(item => item.id === id)
    if (idx !== -1) salesList.value.splice(idx, 1)
  }

  return {
    salesList,
    totalCount, totalAmount, totalQty,
    regionSummary, deptSummary, channelSummary, productSummary,
    addSalesData, updateSalesData, deleteSalesData
  }
})
