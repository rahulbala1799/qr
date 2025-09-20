'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface DashboardData {
  restaurant: {
    name: string
    currency: string
    isPublished: boolean
    isActive: boolean
  }
  metrics: {
    today: { orders: number; revenue: number; items: number }
    week: { orders: number; revenue: number; items: number }
    month: { orders: number; revenue: number; items: number; growth: number }
    averageOrderValue: number
  }
  inventory: {
    totalTables: number
    activeTables: number
    totalMenuItems: number
    activeMenuItems: number
  }
  charts: {
    hourlyOrders: Array<{ hour: number; orders: number; revenue: number }>
    ordersByStatus: Array<{ status: string; count: number }>
    topMenuItems: Array<{ menuItemId: string; name: string; _sum: { quantity: number } }>
  }
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    itemCount: number
    tableNumber: string
    createdAt: string
    customerName: string
    customerPhone: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
        setError(null)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, router, fetchDashboardData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (status === 'authenticated') {
      const interval = setInterval(fetchDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [status, fetchDashboardData])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to sign in...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return `${dashboardData?.restaurant.currency || '€'}${amount.toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{dashboardData?.restaurant.name || 'Restaurant Dashboard'}</h1>
                <p className="text-sm text-gray-500">Restaurant Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Indicators */}
              <div className="flex items-center space-x-2">
                {dashboardData?.restaurant.isPublished ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5"></div>
                    Draft
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">Welcome, {session?.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Revenue */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today&apos;s Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(dashboardData?.metrics.today.revenue || 0)}</p>
                <p className="text-sm text-gray-500">{dashboardData?.metrics.today.orders || 0} orders</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Weekly Orders */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData?.metrics.week.orders || 0}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData?.metrics.week.revenue || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Monthly Growth */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData?.metrics.month.growth ? 
                    `${dashboardData.metrics.month.growth > 0 ? '+' : ''}${dashboardData.metrics.month.growth.toFixed(1)}%` 
                    : '0%'
                  }
                </p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData?.metrics.month.revenue || 0)} this month</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                (dashboardData?.metrics.month.growth || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  (dashboardData?.metrics.month.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={(dashboardData?.metrics.month.growth || 0) >= 0 
                      ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                      : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    } 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(dashboardData?.metrics.averageOrderValue || 0)}</p>
                <p className="text-sm text-gray-500">Per order</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Hourly Orders Chart */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Orders by Hour</h3>
            <div className="h-64 flex items-end justify-between space-x-1">
              {dashboardData?.charts.hourlyOrders.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm min-h-[2px] transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${Math.max((data.orders / Math.max(...(dashboardData?.charts.hourlyOrders.map(d => d.orders) || [1]))) * 240, 2)}px` }}
                    title={`${data.hour}:00 - ${data.orders} orders (${formatCurrency(data.revenue)})`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{data.hour}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status (This Week)</h3>
            <div className="space-y-3">
              {dashboardData?.charts.ordersByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                    {status.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/orders')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Manage Orders</span>
              </button>
              
              <button
                onClick={() => router.push('/dashboard/menu')}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 p-3 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Update Menu</span>
              </button>
              
              <button
                onClick={() => router.push('/dashboard/tables')}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 p-3 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Manage Tables</span>
              </button>
            </div>

            {/* Restaurant Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Restaurant Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Tables</span>
                  <span className="font-medium">{dashboardData?.inventory.activeTables}/{dashboardData?.inventory.totalTables}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Menu Items</span>
                  <span className="font-medium">{dashboardData?.inventory.activeMenuItems}/{dashboardData?.inventory.totalMenuItems}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <button
                onClick={() => router.push('/dashboard/orders')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboardData?.recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No orders yet</p>
                  <p className="text-gray-400 text-xs">Orders will appear here once customers start placing them</p>
                </div>
              ) : (
                dashboardData?.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">#{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Table {order.tableNumber} • {order.itemCount} items • {order.customerName || 'Guest'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
