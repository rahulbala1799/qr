'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

// ORDER-BASED Kitchen Display Interfaces
interface KitchenOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  updatedAt: string
  customerName: string | null
  customerPhone: string | null
  tableNumber: string
  isReopened: boolean
  totalBatches: number
  
  // Order completion metrics
  totalItems: number
  completedItems: number
  preparingItems: number
  pendingItems: number
  isOrderComplete: boolean
  completionPercentage: number
  
  // Items grouped by batch
  itemsByBatch: Record<number, OrderItem[]>
  
  // All active items
  items: OrderItem[]
  
  // Priority information
  orderAge: number // minutes
  priority: 'HIGH' | 'URGENT' | 'NORMAL'
}

interface OrderItem {
  id: string
  quantity: number
  price: string
  notes: string | null
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED'
  addedInBatch: number
  createdAt: string
  updatedAt: string
  menuItem: {
    id: string
    name: string
    description: string
    category: string
    price: string
  }
  batch: {
    number: number
    isOriginal: boolean
    isNewAddition: boolean
  }
}

interface KitchenSummary {
  totalActiveOrders: number
  totalActiveItems: number
  totalPendingItems: number
  totalPreparingItems: number
  totalReadyItems: number
  urgentOrders: number
  reopenedOrders: number
}

export default function KitchenPage() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [summary, setSummary] = useState<KitchenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop')
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchKitchenOrders = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/kitchen/orders')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch kitchen orders: ${response.status}`)
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setSummary(data.summary || null)
      setIsConnected(true)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching kitchen orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load kitchen orders')
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh every 3 seconds for live updates
  useEffect(() => {
    if (session?.user?.id) {
      fetchKitchenOrders()
      
      const interval = setInterval(fetchKitchenOrders, 3000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.id, fetchKitchenOrders])

  // Mobile detection and view mode management
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      if (mobile && deviceView === 'desktop') {
        setDeviceView('mobile')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [deviceView])

  const updateItemStatus = useCallback(async (itemId: string, newStatus: 'PREPARING' | 'READY') => {
    try {
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update item status')
      }

      // Refresh orders after status update
      await fetchKitchenOrders()
    } catch (err) {
      console.error('Error updating item status:', err)
      alert('Failed to update item status')
    }
  }, [fetchKitchenOrders])

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
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-6">
                  <div className="h-6 bg-slate-700 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-4 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Kitchen System Error</h3>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={fetchKitchenOrders}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'border-red-500 bg-red-900/20'
      case 'URGENT': return 'border-orange-500 bg-orange-900/20'
      default: return 'border-slate-600 bg-slate-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'PREPARING': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'READY': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getBatchStyling = (batch: { number: number; isOriginal: boolean; isNewAddition: boolean }, isReopened: boolean) => {
    if (isReopened && batch.isNewAddition) {
      return {
        border: 'border-l-4 border-purple-500',
        bg: 'bg-purple-900/20',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        badgeText: `NEW BATCH ${batch.number}`
      }
    } else if (batch.isOriginal && isReopened) {
      return {
        border: 'border-l-4 border-green-400',
        bg: 'bg-green-900/20',
        badge: 'bg-green-500/20 text-green-300 border-green-500/30',
        badgeText: 'ORIGINAL'
      }
    } else if (batch.isNewAddition) {
      return {
        border: 'border-l-4 border-orange-400',
        bg: 'bg-orange-900/20',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        badgeText: `ADDED BATCH ${batch.number}`
      }
    } else {
      return {
        border: 'border-l-4 border-slate-600',
        bg: 'bg-slate-800',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        badgeText: 'ORIGINAL'
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className={`${deviceView === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-7xl mx-auto'} p-6`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🍳 Kitchen Display System</h1>
            <p className="text-slate-400">
              Live order management • Time-based display • First order first
            </p>
          </div>

          {/* Connection Status & Summary */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setDeviceView('desktop')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  deviceView === 'desktop' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  deviceView === 'mobile' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Live Connected' : 'Disconnected'}
              </span>
            </div>
            
            {summary && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-slate-300">
                  <span className="font-bold text-white">{summary.totalActiveOrders}</span> Orders
                </span>
                <span className="text-slate-300">
                  <span className="font-bold text-white">{summary.totalActiveItems}</span> Items
                </span>
                {summary.urgentOrders > 0 && (
                  <span className="text-orange-300">
                    <span className="font-bold text-orange-200">{summary.urgentOrders}</span> Urgent
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Orders Display */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🍽️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-slate-400">No active orders in the kitchen. Great job! 🎉</p>
            <p className="text-slate-500 text-sm mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <div className={`${deviceView === 'mobile' ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'}`}>
            {orders.map((order) => (
              <div
                key={order.id}
                className={`rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-xl ${getPriorityColor(order.priority)}`}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {order.tableNumber}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{order.orderNumber}</h3>
                      <p className="text-slate-400 text-sm">
                        {order.orderAge}m ago • Table {order.tableNumber}
                      </p>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  {order.priority !== 'NORMAL' && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                    }`}>
                      {order.priority}
                    </div>
                  )}
                </div>

                {/* Reopened Order Banner */}
                {order.isReopened && (
                  <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-300">🔄</span>
                      <span className="text-purple-200 font-medium">REOPENED ORDER</span>
                      <span className="text-purple-400 text-sm">({order.totalBatches} batches)</span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Progress</span>
                    <span className="text-white font-medium">{order.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${order.completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{order.pendingItems} pending</span>
                    <span>{order.preparingItems} cooking</span>
                    <span>{order.completedItems} ready</span>
                  </div>
                </div>

                {/* Order Items by Batch */}
                <div className="space-y-4">
                  {Object.entries(order.itemsByBatch)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([batchNum, items]) => (
                      <div key={batchNum} className="space-y-2">
                        {/* Batch Header */}
                        {order.totalBatches > 1 && (
                          <div className={`px-2 py-1 rounded text-xs font-medium border ${getBatchStyling(items[0].batch, order.isReopened).badge}`}>
                            {getBatchStyling(items[0].batch, order.isReopened).badgeText}
                          </div>
                        )}

                        {/* Items in this batch */}
                        {items.map((item) => {
                          const styling = getBatchStyling(item.batch, order.isReopened)
                          
                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-lg border ${styling.border} ${styling.bg} transition-all duration-300`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-white mb-1">
                                    {item.quantity}x {item.menuItem.name}
                                  </h4>
                                  {item.notes && (
                                    <p className="text-amber-300 text-sm mb-2">
                                      📝 {item.notes}
                                    </p>
                                  )}
                                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                    {item.status.toLowerCase()}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex space-x-2 mt-3">
                                {item.status === 'PENDING' && (
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'PREPARING')}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    🍳 Start Cooking
                                  </button>
                                )}
                                {item.status === 'PREPARING' && (
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'READY')}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    ✅ Mark Ready
                                  </button>
                                )}
                                {item.status === 'READY' && (
                                  <div className="flex-1 bg-green-500/20 text-green-300 px-3 py-2 rounded-lg text-sm font-medium text-center border border-green-500/30">
                                    🎉 Ready for Pickup
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                </div>

                {/* Order Footer */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Created {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                    {order.completionPercentage === 100 && (
                      <span className="text-green-300 font-medium">
                        🚀 Ready for delivery!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Kitchen Display System • Auto-refresh every 3 seconds</p>
          <p>Orders disappear automatically when all items are marked ready</p>
        </div>
      </div>
    </div>
  )
}