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

        {/* Sales Performance View */}
        {selectedView === 'sales' && (
          <>
            {/* Sales Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Sales</p>
                    <p className="text-2xl font-bold">
                      {reportData.restaurant.currency}{reportData.overview.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-green-200 text-sm">
                      {reportData.overview.revenueGrowth > 0 ? '↗️' : reportData.overview.revenueGrowth < 0 ? '↘️' : '➡️'} {Math.abs(reportData.overview.revenueGrowth).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Average Sale</p>
                    <p className="text-2xl font-bold">
                      {reportData.restaurant.currency}{reportData.overview.averageOrderValue.toFixed(2)}
                    </p>
                    <p className="text-blue-200 text-sm">Per order</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Sales Volume</p>
                    <p className="text-2xl font-bold">{reportData.overview.totalOrders}</p>
                    <p className="text-purple-200 text-sm">
                      {reportData.overview.orderGrowth > 0 ? '↗️' : reportData.overview.orderGrowth < 0 ? '↘️' : '➡️'} {Math.abs(reportData.overview.orderGrowth).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold">{reportData.overview.completionRate.toFixed(1)}%</p>
                    <p className="text-orange-200 text-sm">Orders completed</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Daily Sales Trend */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Daily Sales Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {chartData?.dailyRevenue.slice(-14).map((day, index) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div className="text-xs text-slate-600 mb-1 font-medium">
                        {reportData.restaurant.currency}{day.revenue.toFixed(0)}
                      </div>
                      <div
                        className="bg-gradient-to-t from-green-600 to-green-400 rounded-t w-full min-h-[4px]"
                        style={{
                          height: `${Math.max(4, (day.revenue / Math.max(...chartData.dailyRevenue.map(d => d.revenue))) * 200)}px`
                        }}
                        title={`${day.date}: ${reportData.restaurant.currency}${day.revenue.toFixed(2)}`}
                      ></div>
                      <p className="text-xs text-slate-600 mt-2 transform -rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Order Status Distribution</h3>
                <div className="space-y-4">
                  {chartData?.orderStatus.map((status, index) => {
                    const percentage = (status.count / reportData.overview.totalOrders) * 100
                    const colors = {
                      'DELIVERED': 'bg-green-500',
                      'READY': 'bg-blue-500', 
                      'PREPARING': 'bg-yellow-500',
                      'PENDING': 'bg-orange-500',
                      'CANCELLED': 'bg-red-500',
                      'CONFIRMED': 'bg-purple-500'
                    }
                    return (
                      <div key={status.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded ${colors[status.status as keyof typeof colors] || 'bg-slate-400'}`}></div>
                          <span className="text-slate-700 font-medium">{status.status}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${colors[status.status as keyof typeof colors] || 'bg-slate-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-slate-900 font-semibold w-12 text-right">{status.count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Sales Performance Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">🎯 Sales Goals</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Monthly Target</span>
                      <span className="text-slate-900 font-medium">75%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Weekly Target</span>
                      <span className="text-slate-900 font-medium">92%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Daily Target</span>
                      <span className="text-slate-900 font-medium">110%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">⏰ Peak Sales Hours</h3>
                <div className="space-y-3">
                  {reportData.orderMetrics.peakHours.map((peak, index) => (
                    <div key={peak.hour} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-slate-600">{peak.hour}:00 - {peak.hour + 1}:00</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900">{peak.orders}</span>
                        <span className="text-slate-500 text-sm ml-1">orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Sales Insights</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conversion Rate</span>
                    <span className="font-semibold text-green-600">
                      {reportData.overview.completionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Items/Order</span>
                    <span className="font-semibold text-slate-900">
                      {(reportData.overview.totalOrders > 0 ? 
                        (Object.values(reportData.menuPerformance.topMenuItems).reduce((sum: number, item: any) => sum + item.quantity, 0) / reportData.overview.totalOrders) : 0
                      ).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Revenue/Customer</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.restaurant.currency}{(reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Order Frequency</span>
                    <span className="font-semibold text-slate-900">
                      {(reportData.overview.totalOrders / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Menu Performance View */}
        {selectedView === 'menu' && (
          <>
            {/* Menu Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium">Total Items</p>
                    <p className="text-2xl font-bold">{reportData.menuPerformance.totalMenuItems}</p>
                    <p className="text-indigo-200 text-sm">{reportData.menuPerformance.activeMenuItems} active</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Best Seller</p>
                    <p className="text-lg font-bold truncate">
                      {reportData.menuPerformance.topMenuItems[0]?.name || 'N/A'}
                    </p>
                    <p className="text-emerald-200 text-sm">
                      {reportData.menuPerformance.topMenuItems[0]?.quantity || 0} sold
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Categories</p>
                    <p className="text-2xl font-bold">{reportData.menuPerformance.categoryPerformance.length}</p>
                    <p className="text-orange-200 text-sm">Menu categories</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📂</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Top Revenue</p>
                    <p className="text-2xl font-bold">
                      {reportData.restaurant.currency}{reportData.menuPerformance.topMenuItems[0]?.revenue.toFixed(0) || '0'}
                    </p>
                    <p className="text-purple-200 text-sm">Single item</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Menu Items */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">🏆 Top Performing Items</h3>
                <div className="space-y-4">
                  {reportData.menuPerformance.topMenuItems.slice(0, 8).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
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
                        <p className="text-sm text-slate-600">{item.quantity} sold • {item.orders} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Performance */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">📊 Category Performance</h3>
                <div className="space-y-4">
                  {reportData.menuPerformance.categoryPerformance.slice(0, 6).map((category, index) => (
                    <div key={category.category} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-900">{category.category}</h4>
                        <span className="text-lg font-bold text-emerald-600">
                          {reportData.restaurant.currency}{category.revenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>{category.quantity} items sold</span>
                        <span>{category.orders} orders</span>
                      </div>
                      <div className="bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(category.revenue / Math.max(...reportData.menuPerformance.categoryPerformance.map(c => c.revenue))) * 100}%`
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Revenue share: {((category.revenue / reportData.overview.totalRevenue) * 100).toFixed(1)}%</span>
                        <span>Avg/item: {reportData.restaurant.currency}{(category.revenue / category.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">🎯 Menu Optimization</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-1">⭐ Star Performers</h4>
                    <p className="text-sm text-green-600">
                      {reportData.menuPerformance.topMenuItems.slice(0, 3).map(item => item.name).join(', ')}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-1">📈 Growth Opportunity</h4>
                    <p className="text-sm text-yellow-600">
                      Consider promoting {reportData.menuPerformance.categoryPerformance[reportData.menuPerformance.categoryPerformance.length - 1]?.category || 'underperforming'} items
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-1">💡 Recommendation</h4>
                    <p className="text-sm text-blue-600">
                      Focus marketing on top 3 categories for maximum ROI
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Menu Analytics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Items per Order</span>
                    <span className="font-semibold text-slate-900">
                      {(reportData.menuPerformance.topMenuItems.reduce((sum, item) => sum + item.quantity, 0) / Math.max(reportData.overview.totalOrders, 1)).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Item Price</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.restaurant.currency}{(reportData.overview.totalRevenue / reportData.menuPerformance.topMenuItems.reduce((sum, item) => sum + item.quantity, 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Menu Utilization</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((reportData.menuPerformance.topMenuItems.length / reportData.menuPerformance.totalMenuItems) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Category Diversity</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.menuPerformance.categoryPerformance.length} categories
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">🏅 Performance Badges</h3>
                <div className="space-y-3">
                  {reportData.menuPerformance.topMenuItems[0] && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg">
                      <span className="text-lg">🥇</span>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Best Seller</p>
                        <p className="text-xs text-yellow-600">{reportData.menuPerformance.topMenuItems[0].name}</p>
                      </div>
                    </div>
                  )}
                  {reportData.menuPerformance.categoryPerformance[0] && (
                    <div className="flex items-center space-x-2 p-2 bg-emerald-50 rounded-lg">
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Top Category</p>
                        <p className="text-xs text-emerald-600">{reportData.menuPerformance.categoryPerformance[0].category}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-lg">💎</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">High Value</p>
                      <p className="text-xs text-blue-600">{reportData.restaurant.currency}{reportData.overview.averageOrderValue.toFixed(2)} avg order</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Table Performance View */}
        {selectedView === 'tables' && (
          <>
            {/* Table Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm font-medium">Total Tables</p>
                    <p className="text-2xl font-bold">{reportData.tablePerformance.totalTables}</p>
                    <p className="text-teal-200 text-sm">{reportData.tablePerformance.activeTables} active</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🪑</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Best Table</p>
                    <p className="text-2xl font-bold">
                      #{reportData.tablePerformance.topTables[0]?.tableNumber || 'N/A'}
                    </p>
                    <p className="text-emerald-200 text-sm">
                      {reportData.restaurant.currency}{reportData.tablePerformance.topTables[0]?.revenue.toFixed(0) || '0'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Utilization</p>
                    <p className="text-2xl font-bold">
                      {Math.round((reportData.tablePerformance.topTables.length / reportData.tablePerformance.totalTables) * 100)}%
                    </p>
                    <p className="text-blue-200 text-sm">Tables used</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Revenue</p>
                    <p className="text-2xl font-bold">
                      {reportData.restaurant.currency}{(reportData.tablePerformance.topTables.reduce((sum, t) => sum + t.revenue, 0) / Math.max(reportData.tablePerformance.topTables.length, 1)).toFixed(0)}
                    </p>
                    <p className="text-purple-200 text-sm">Per table</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Performance Grid */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">🏆 Table Performance Ranking</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.tablePerformance.topTables.map((table, index) => (
                  <div key={table.tableId} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-all duration-200 hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-slate-900">Table {table.tableNumber}</h4>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">
                        {reportData.restaurant.currency}{table.revenue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Orders:</span>
                        <span className="font-medium text-slate-900">{table.orders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Avg Order:</span>
                        <span className="font-medium text-slate-900">
                          {reportData.restaurant.currency}{table.averageOrderValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Performance:</span>
                        <span className={`font-medium ${
                          index < 3 ? 'text-emerald-600' : index < 6 ? 'text-blue-600' : 'text-slate-600'
                        }`}>
                          {index < 3 ? 'Excellent' : index < 6 ? 'Good' : 'Average'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Performance Bar */}
                    <div className="mt-3 bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          index < 3 ? 'bg-emerald-500' : index < 6 ? 'bg-blue-500' : 'bg-slate-400'
                        }`}
                        style={{
                          width: `${(table.revenue / Math.max(...reportData.tablePerformance.topTables.map(t => t.revenue))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Table Analytics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Most Popular Table</span>
                    <span className="font-semibold text-slate-900">
                      #{reportData.tablePerformance.topTables[0]?.tableNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Revenue Range</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.restaurant.currency}{Math.min(...reportData.tablePerformance.topTables.map(t => t.revenue)).toFixed(0)} - {reportData.restaurant.currency}{Math.max(...reportData.tablePerformance.topTables.map(t => t.revenue)).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Tables</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.tablePerformance.topTables.length} / {reportData.tablePerformance.totalTables}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Table Revenue</span>
                    <span className="font-semibold text-emerald-600">
                      {reportData.restaurant.currency}{reportData.tablePerformance.topTables.reduce((sum, t) => sum + t.revenue, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 Table Optimization Tips</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-1">✅ High Performers</h4>
                    <p className="text-sm text-green-600">
                      Tables {reportData.tablePerformance.topTables.slice(0, 3).map(t => t.tableNumber).join(', ')} are your top revenue generators
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-1">📍 Prime Locations</h4>
                    <p className="text-sm text-blue-600">
                      Consider the positioning and ambiance of your best-performing tables
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-1">🎯 Improvement Areas</h4>
                    <p className="text-sm text-orange-600">
                      Focus on promoting underutilized tables with better service or incentives
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Customers Performance View */}
        {selectedView === 'customers' && (
          <>
            {/* Customer Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm font-medium">Total Customers</p>
                    <p className="text-2xl font-bold">{reportData.overview.uniqueCustomers}</p>
                    <p className="text-pink-200 text-sm">Unique visitors</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium">Repeat Customers</p>
                    <p className="text-2xl font-bold">{reportData.overview.repeatCustomers}</p>
                    <p className="text-indigo-200 text-sm">Loyal visitors</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔄</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Retention Rate</p>
                    <p className="text-2xl font-bold">{reportData.overview.customerRetentionRate.toFixed(1)}%</p>
                    <p className="text-emerald-200 text-sm">Customer loyalty</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Avg Spend</p>
                    <p className="text-2xl font-bold">
                      {reportData.restaurant.currency}{(reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(0)}
                    </p>
                    <p className="text-orange-200 text-sm">Per customer</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">📊 Customer Behavior</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Customer Retention</span>
                      <span className="text-slate-900 font-medium">{reportData.overview.customerRetentionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${reportData.overview.customerRetentionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Order Frequency</span>
                      <span className="text-slate-900 font-medium">
                        {(reportData.overview.totalOrders / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(1)} orders/customer
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((reportData.overview.totalOrders / Math.max(reportData.overview.uniqueCustomers, 1)) * 20, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Average Spend</span>
                      <span className="text-slate-900 font-medium">
                        {reportData.restaurant.currency}{(reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)) / reportData.overview.averageOrderValue * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">🎯 Customer Segments</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-yellow-800">🥇 VIP Customers</h4>
                      <span className="text-yellow-700 font-bold">
                        {Math.round(reportData.overview.repeatCustomers * 0.3)}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-600">
                      High-value repeat customers with multiple visits
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-800">🔄 Regular Customers</h4>
                      <span className="text-blue-700 font-bold">
                        {reportData.overview.repeatCustomers - Math.round(reportData.overview.repeatCustomers * 0.3)}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600">
                      Customers who have visited more than once
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-800">👋 New Customers</h4>
                      <span className="text-slate-700 font-bold">
                        {reportData.overview.uniqueCustomers - reportData.overview.repeatCustomers}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      First-time visitors with growth potential
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Growth & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Growth Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">New vs Returning</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((reportData.overview.repeatCustomers / Math.max(reportData.overview.uniqueCustomers, 1)) * 100)}% returning
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Customer Lifetime Value</span>
                    <span className="font-semibold text-slate-900">
                      {reportData.restaurant.currency}{((reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)) * (reportData.overview.totalOrders / Math.max(reportData.overview.uniqueCustomers, 1))).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Repeat Rate</span>
                    <span className="font-semibold text-emerald-600">
                      {reportData.overview.customerRetentionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 Recommendations</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-1">🎁 Loyalty Program</h4>
                    <p className="text-sm text-green-600">
                      Reward your {reportData.overview.repeatCustomers} repeat customers
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-1">📧 Re-engagement</h4>
                    <p className="text-sm text-blue-600">
                      Target new customers for second visits
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-1">⭐ VIP Treatment</h4>
                    <p className="text-sm text-purple-600">
                      Special perks for high-value customers
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">🏆 Customer Success</h3>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">
                      {reportData.overview.customerRetentionRate.toFixed(0)}%
                    </div>
                    <p className="text-sm text-emerald-700">Retention Rate</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {(reportData.overview.totalOrders / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(1)}
                    </div>
                    <p className="text-sm text-blue-700">Orders per Customer</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {reportData.restaurant.currency}{(reportData.overview.totalRevenue / Math.max(reportData.overview.uniqueCustomers, 1)).toFixed(0)}
                    </div>
                    <p className="text-sm text-purple-700">Revenue per Customer</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
