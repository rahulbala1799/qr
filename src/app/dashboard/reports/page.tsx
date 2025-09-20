'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface ReportData {
  restaurant: {
    id: string
    name: string
    email: string
    currency: string
    isPublished: boolean
    isActive: boolean
    createdAt: string
  }
  dateRange: {
    startDate: string
    endDate: string
  }
  overview: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    uniqueCustomers: number
    repeatCustomers: number
    customerRetentionRate: number
    completionRate: number
    cancellationRate: number
    averagePrepTime: number
    revenueGrowth: number
    orderGrowth: number
  }
  orderMetrics: {
    ordersByStatus: Record<string, number>
    dailyRevenue: Record<string, number>
    hourlyOrders: Record<string, number>
    peakHours: Array<{ hour: number; orders: number }>
    completedOrders: number
    cancelledOrders: number
  }
  menuPerformance: {
    topMenuItems: Array<{
      id: string
      name: string
      category: string
      quantity: number
      revenue: number
      orders: number
    }>
    categoryPerformance: Array<{
      category: string
      quantity: number
      revenue: number
      orders: number
    }>
    totalMenuItems: number
    activeMenuItems: number
  }
  tablePerformance: {
    topTables: Array<{
      tableId: string
      tableNumber: string
      orders: number
      revenue: number
      averageOrderValue: number
    }>
    totalTables: number
    activeTables: number
  }
  trends: {
    dailyRevenue: Record<string, number>
    hourlyDistribution: Record<string, number>
  }
  businessMetrics: {
    averageOrderValue: number
    customerRetentionRate: number
    averagePrepTime: number
    revenueGrowth: number
    orderGrowth: number
  }
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [selectedView, setSelectedView] = useState<'overview' | 'sales' | 'menu' | 'tables' | 'customers'>('overview')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf')

  const fetchReports = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: 'comprehensive'
      })

      const response = await fetch(`/api/reports?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`)
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, dateRange])

  useEffect(() => {
    if (session?.user?.id) {
      fetchReports()
    }
  }, [fetchReports])

  const exportReport = useCallback(async () => {
    if (!reportData) return

    try {
      // Create export data
      const exportData = {
        restaurant: reportData.restaurant.name,
        dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
        overview: reportData.overview,
        topMenuItems: reportData.menuPerformance.topMenuItems,
        topTables: reportData.tablePerformance.topTables,
        categoryPerformance: reportData.menuPerformance.categoryPerformance
      }

      if (exportFormat === 'csv') {
        // Create CSV content
        const csvContent = [
          ['Metric', 'Value'],
          ['Restaurant', reportData.restaurant.name],
          ['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`],
          ['Total Orders', reportData.overview.totalOrders],
          ['Total Revenue', `${reportData.restaurant.currency}${reportData.overview.totalRevenue.toFixed(2)}`],
          ['Average Order Value', `${reportData.restaurant.currency}${reportData.overview.averageOrderValue.toFixed(2)}`],
          ['Completion Rate', `${reportData.overview.completionRate.toFixed(1)}%`],
          ['Customer Retention', `${reportData.overview.customerRetentionRate.toFixed(1)}%`],
          ['Revenue Growth', `${reportData.overview.revenueGrowth.toFixed(1)}%`]
        ].map(row => row.join(',')).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportData.restaurant.name}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // For PDF, we would need a PDF generation library
        alert('PDF export feature coming soon! Use CSV export for now.')
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export report')
    }
  }, [reportData, dateRange, exportFormat])

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!reportData) return null

    const dailyRevenueChart = Object.entries(reportData.trends.dailyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }))

    const hourlyOrdersChart = Object.entries(reportData.trends.hourlyDistribution)
      .map(([hour, orders]) => ({ hour: parseInt(hour), orders }))
      .sort((a, b) => a.hour - b.hour)

    const statusChart = Object.entries(reportData.orderMetrics.ordersByStatus)
      .map(([status, count]) => ({ status, count }))

    return {
      dailyRevenue: dailyRevenueChart,
      hourlyOrders: hourlyOrdersChart,
      orderStatus: statusChart
    }
  }, [reportData])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Reports</h3>
            <p className="text-slate-600 mb-6">{error || 'Unable to generate reports at this time'}</p>
            <button
              onClick={fetchReports}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-emerald-600'
    if (value < 0) return 'text-red-600'
    return 'text-slate-600'
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return '↗️'
    if (value < 0) return '↘️'
    return '➡️'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">📊 Reports & Analytics</h1>
              <p className="text-slate-600 mt-2">
                Comprehensive insights for <span className="font-semibold">{reportData.restaurant.name}</span>
              </p>
            </div>
            
            {/* Date Range & Export Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={fetchReports}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Update
                </button>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv')}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex space-x-1 mt-6 bg-slate-100 p-1 rounded-lg">
            {[
              { key: 'overview', label: '📈 Overview', icon: '📊' },
              { key: 'sales', label: '💰 Sales', icon: '💵' },
              { key: 'menu', label: '🍽️ Menu', icon: '📋' },
              { key: 'tables', label: '🪑 Tables', icon: '📍' },
              { key: 'customers', label: '👥 Customers', icon: '🎯' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedView === tab.key
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Metrics */}
        {selectedView === 'overview' && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {reportData.restaurant.currency}{reportData.overview.totalRevenue.toFixed(2)}
                    </p>
                    <p className={`text-sm ${getGrowthColor(reportData.overview.revenueGrowth)}`}>
                      {getGrowthIcon(reportData.overview.revenueGrowth)} {Math.abs(reportData.overview.revenueGrowth).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Orders</p>
                    <p className="text-2xl font-bold text-slate-900">{reportData.overview.totalOrders.toLocaleString()}</p>
                    <p className={`text-sm ${getGrowthColor(reportData.overview.orderGrowth)}`}>
                      {getGrowthIcon(reportData.overview.orderGrowth)} {Math.abs(reportData.overview.orderGrowth).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {reportData.restaurant.currency}{reportData.overview.averageOrderValue.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500">Per order</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-slate-900">{reportData.overview.completionRate.toFixed(1)}%</p>
                    <p className="text-sm text-slate-500">Orders completed</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Daily Revenue Chart */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Daily Revenue Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {chartData?.dailyRevenue.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t w-full"
                        style={{
                          height: `${Math.max(10, (day.revenue / Math.max(...chartData.dailyRevenue.map(d => d.revenue))) * 200)}px`
                        }}
                      ></div>
                      <p className="text-xs text-slate-600 mt-2 transform -rotate-45">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Orders Distribution */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">🕐 Hourly Order Distribution</h3>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {chartData?.hourlyOrders.map((hour) => (
                    <div key={hour.hour} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t w-full"
                        style={{
                          height: `${Math.max(10, (hour.orders / Math.max(...chartData.hourlyOrders.map(h => h.orders))) * 200)}px`
                        }}
                      ></div>
                      <p className="text-xs text-slate-600 mt-2">
                        {hour.hour}:00
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Metrics */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">👥 Customer Insights</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Unique Customers</span>
                    <span className="font-semibold">{reportData.overview.uniqueCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Repeat Customers</span>
                    <span className="font-semibold">{reportData.overview.repeatCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Retention Rate</span>
                    <span className="font-semibold text-emerald-600">
                      {reportData.overview.customerRetentionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Peak Hours */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">⏰ Peak Hours</h3>
                <div className="space-y-3">
                  {reportData.orderMetrics.peakHours.map((peak, index) => (
                    <div key={peak.hour} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-slate-600">{peak.hour}:00</span>
                      </div>
                      <span className="font-semibold">{peak.orders} orders</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Prep Time</span>
                    <span className="font-semibold">{reportData.overview.averagePrepTime.toFixed(0)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cancellation Rate</span>
                    <span className="font-semibold text-red-600">
                      {reportData.overview.cancellationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Success Rate</span>
                    <span className="font-semibold text-emerald-600">
                      {reportData.overview.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Menu Performance View */}
        {selectedView === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Menu Items */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">🏆 Top Performing Items</h3>
              <div className="space-y-4">
                {reportData.menuPerformance.topMenuItems.slice(0, 10).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {reportData.restaurant.currency}{item.revenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-600">{item.quantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">📊 Category Performance</h3>
              <div className="space-y-4">
                {reportData.menuPerformance.categoryPerformance.map((category, index) => (
                  <div key={category.category} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-900">{category.category}</h4>
                      <span className="text-lg font-bold text-emerald-600">
                        {reportData.restaurant.currency}{category.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>{category.quantity} items sold</span>
                      <span>{category.orders} orders</span>
                    </div>
                    <div className="mt-2 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${(category.revenue / Math.max(...reportData.menuPerformance.categoryPerformance.map(c => c.revenue))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table Performance View */}
        {selectedView === 'tables' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">🪑 Table Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.tablePerformance.topTables.map((table, index) => (
                <div key={table.tableId} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index < 3 ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-slate-900">Table {table.tableNumber}</h4>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">
                      {reportData.restaurant.currency}{table.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Orders:</span>
                      <span className="font-medium">{table.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Order:</span>
                      <span className="font-medium">
                        {reportData.restaurant.currency}{table.averageOrderValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
