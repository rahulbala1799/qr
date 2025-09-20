'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface MenuItem {
  id: string
  name: string
  description: string
  category: string
  price: number
}

interface OrderInfo {
  id: string
  orderNumber: string
  customerName: string | null
  customerPhone: string | null
  tableNumber: string
  createdAt: string
  orderStatus: string
  isReopened: boolean
  totalBatches: number
}

interface BatchInfo {
  number: number
  isOriginal: boolean
  isNewAddition: boolean
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  notes: string | null
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'REOPENED'
  addedInBatch: number
  createdAt: string
  updatedAt: string
  menuItem: MenuItem
  order: OrderInfo
  batch: BatchInfo
}

interface CategoryStats {
  category: string
  totalItems: number
  pendingItems: number
  preparingItems: number
  readyItems: number
}

interface KitchenData {
  orders: any[]
  itemsByCategory: Record<string, OrderItem[]>
  allItems: OrderItem[]
  categoryStats: CategoryStats[]
  totalOrders: number
  totalItems: number
  pendingItems: number
  preparingItems: number
  readyItems: number
}

export default function KitchenManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kitchenData, setKitchenData] = useState<KitchenData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'category' | 'timeline'>('category')
  const [isConnected, setIsConnected] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  // Play kitchen notification sound
  const playKitchenSound = useCallback(() => {
    if (!soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Kitchen-appropriate sound (like a timer ding)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.error('Error playing kitchen sound:', error)
    }
  }, [soundEnabled])

  const fetchKitchenData = useCallback(async () => {
    try {
      setIsConnected(true)
      const url = selectedCategory === 'all' 
        ? '/api/kitchen/orders'
        : `/api/kitchen/orders?category=${selectedCategory}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setKitchenData(data)
        setError('')
      } else {
        setError('Failed to fetch kitchen data')
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error fetching kitchen data:', error)
      setError('Error loading kitchen data')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory])

  // Initial fetch and setup polling
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchKitchenData()
      
      // Set up polling for live updates every 3 seconds (faster for kitchen)
      const pollInterval = setInterval(() => {
        fetchKitchenData()
      }, 3000)
      
      return () => clearInterval(pollInterval)
    }
  }, [status, router, fetchKitchenData])

  // Update individual order item status
  const updateItemStatus = useCallback(async (itemId: string, newStatus: string, notes?: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId))
    
    try {
      const response = await fetch(`/api/orders/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, notes }),
      })

      if (response.ok) {
        playKitchenSound()
        // Refresh data to show updated status
        await fetchKitchenData()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update item status')
      }
    } catch (error) {
      setError('Error updating item status')
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }, [playKitchenSound, fetchKitchenData])

  // Get status color for items
  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-100 text-red-800 border-red-200'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'READY': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get next status for item
  const getNextItemStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'PREPARING'
      case 'CONFIRMED': return 'PREPARING'
      case 'PREPARING': return 'READY'
      default: return null
    }
  }

  // Get time since order was placed
  const getTimeAgo = (dateString: string) => {
    const now = new Date().getTime()
    const orderTime = new Date(dateString).getTime()
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  // Get priority based on order age
  const getPriority = (dateString: string) => {
    const now = new Date().getTime()
    const orderTime = new Date(dateString).getTime()
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60))
    
    if (diffMinutes > 30) return 'urgent'
    if (diffMinutes > 15) return 'high'
    return 'normal'
  }

  const categories = useMemo(() => {
    if (!kitchenData) return []
    return Object.keys(kitchenData.itemsByCategory).sort()
  }, [kitchenData])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading kitchen management...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to sign in...</h2>
        </div>
      </div>
    )
  }

  // Kitchen Item Card Component
  const KitchenItemCard = ({ item }: { item: OrderItem }) => {
    const isUpdating = updatingItems.has(item.id)
    const priority = getPriority(item.order.createdAt)
    const nextStatus = getNextItemStatus(item.status)
    
    return (
      <div className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${
        priority === 'urgent' ? 'border-red-400 ring-4 ring-red-100' :
        priority === 'high' ? 'border-orange-400 ring-2 ring-orange-100' :
        'border-gray-200 hover:border-orange-300'
      } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="p-4">
          {/* Priority and Time */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {priority === 'urgent' && (
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  🚨 URGENT
                </span>
              )}
              {priority === 'high' && (
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  ⚠️ HIGH
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {getTimeAgo(item.order.createdAt)}
            </span>
          </div>

          {/* Order Info */}
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">#{item.order.orderNumber}</span>
              <span className="text-sm text-gray-600">Table {item.order.tableNumber}</span>
            </div>
            {item.order.customerName && (
              <p className="text-sm text-gray-600">👤 {item.order.customerName}</p>
            )}
          </div>

          {/* Menu Item */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-900">{item.menuItem.name}</h3>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                {item.quantity}x
              </span>
            </div>
            {item.menuItem.description && (
              <p className="text-sm text-gray-600 mb-2">{item.menuItem.description}</p>
            )}
            {item.notes && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">💬 {item.notes}</p>
              </div>
            )}
          </div>

          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getItemStatusColor(item.status)}`}>
              {item.status}
            </span>
            
            {nextStatus && (
              <button
                onClick={() => updateItemStatus(item.id, nextStatus)}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  nextStatus === 'PREPARING' 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                } text-white shadow-lg hover:shadow-xl`}
              >
                {isUpdating ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    {nextStatus === 'PREPARING' ? '👨‍🍳 Start Cooking' : '✅ Mark Ready'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100">
      {/* Kitchen Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/orders')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Orders</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Kitchen Management</h1>
                  <p className="text-sm text-gray-500">Real-time Order Preparation</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Kitchen Stats */}
              <div className="hidden md:flex items-center space-x-4 bg-white/60 rounded-xl px-4 py-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{kitchenData?.pendingItems || 0}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{kitchenData?.preparingItems || 0}</div>
                  <div className="text-xs text-gray-600">Cooking</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{kitchenData?.readyItems || 0}</div>
                  <div className="text-xs text-gray-600">Ready</div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
              
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  soundEnabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-lg' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={soundEnabled ? 'Kitchen sounds enabled' : 'Kitchen sounds disabled'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {soundEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-5a3 3 0 00-6 0v5zM9 12H6a3 3 0 00-3 3v2a3 3 0 003 3h3v-8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="bg-gray-100 rounded-xl p-1 flex">
                <button
                  onClick={() => setViewMode('category')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    viewMode === 'category' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🍽️ By Category
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    viewMode === 'timeline' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⏰ By Time
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                🌟 All Items ({kitchenData?.totalItems || 0})
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category} ({kitchenData?.itemsByCategory[category]?.length || 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kitchen Content */}
        {!kitchenData || kitchenData.totalItems === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kitchen is Clear! 🎉</h2>
            <p className="text-gray-600">No orders to prepare right now. Great job!</p>
          </div>
        ) : viewMode === 'category' ? (
          /* Category View */
          <div className="space-y-8">
            {categories.map((category) => {
              const items = kitchenData.itemsByCategory[category] || []
              if (selectedCategory !== 'all' && selectedCategory !== category) return null
              if (items.length === 0) return null

              return (
                <div key={category} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                    <div className="flex items-center space-x-4">
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                        {items.filter(item => item.status === 'PENDING').length} Pending
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                        {items.filter(item => item.status === 'PREPARING').length} Cooking
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                        {items.filter(item => item.status === 'READY').length} Ready
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items
                      .sort((a, b) => {
                        // Sort by status (pending first), then by time
                        const statusOrder = { 'PENDING': 0, 'CONFIRMED': 1, 'PREPARING': 2, 'READY': 3 }
                        const aStatus = statusOrder[a.status as keyof typeof statusOrder] ?? 4
                        const bStatus = statusOrder[b.status as keyof typeof statusOrder] ?? 4
                        if (aStatus !== bStatus) return aStatus - bStatus
                        return new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime()
                      })
                      .map((item) => (
                        <KitchenItemCard key={item.id} item={item} />
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Timeline View */
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">⏰ Order Timeline (Oldest First)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {kitchenData.allItems
                .filter(item => selectedCategory === 'all' || item.menuItem.category === selectedCategory)
                .sort((a, b) => {
                  // Sort by time (oldest first), then by status
                  const timeA = new Date(a.order.createdAt).getTime()
                  const timeB = new Date(b.order.createdAt).getTime()
                  if (timeA !== timeB) return timeA - timeB
                  
                  const statusOrder = { 'PENDING': 0, 'CONFIRMED': 1, 'PREPARING': 2, 'READY': 3 }
                  const aStatus = statusOrder[a.status as keyof typeof statusOrder] ?? 4
                  const bStatus = statusOrder[b.status as keyof typeof statusOrder] ?? 4
                  return aStatus - bStatus
                })
                .map((item) => (
                  <KitchenItemCard key={item.id} item={item} />
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// 🎨 INTELLIGENT KITCHEN ITEM CARD WITH BATCH VISUALIZATION
function KitchenItemCard({ item }: { item: OrderItem }) {
  const [isUpdating, setIsUpdating] = useState(false)
  
  const updateItemStatus = async (newStatus: 'PREPARING' | 'READY') => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/orders/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item status')
      }
      
      // The parent component will refresh the data
    } catch (error) {
      console.error('Error updating item status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // 🎨 INTELLIGENT VISUAL STYLING BASED ON BATCH AND ORDER STATE
  const getBatchStyling = () => {
    if (item.order.isReopened && item.batch.isNewAddition) {
      // New items in reopened order - bright blue/purple gradient
      return {
        border: 'border-l-4 border-purple-500',
        bg: 'bg-gradient-to-r from-purple-50 to-blue-50',
        badge: 'bg-purple-100 text-purple-800',
        badgeText: `NEW BATCH ${item.batch.number}`
      }
    } else if (item.batch.isOriginal && item.order.isReopened) {
      // Original items in reopened order - subtle green
      return {
        border: 'border-l-4 border-green-400',
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        badge: 'bg-green-100 text-green-700',
        badgeText: 'ORIGINAL'
      }
    } else if (item.batch.isNewAddition && !item.order.isReopened) {
      // New addition to active order - orange
      return {
        border: 'border-l-4 border-orange-400',
        bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
        badge: 'bg-orange-100 text-orange-700',
        badgeText: `ADDED BATCH ${item.batch.number}`
      }
    } else {
      // Regular item - default styling
      return {
        border: 'border-l-4 border-gray-300',
        bg: 'bg-white',
        badge: 'bg-gray-100 text-gray-600',
        badgeText: 'ORIGINAL'
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-red-100 text-red-800 border-red-200'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'READY': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityLevel = () => {
    const now = new Date()
    const orderTime = new Date(item.order.createdAt)
    const minutesOld = (now.getTime() - orderTime.getTime()) / (1000 * 60)
    
    if (minutesOld > 20) return { level: 'urgent', color: 'text-red-600', icon: '🚨' }
    if (minutesOld > 10) return { level: 'high', color: 'text-orange-600', icon: '⚠️' }
    return { level: 'normal', color: 'text-gray-600', icon: '⏰' }
  }

  const styling = getBatchStyling()
  const priority = getPriorityLevel()

  return (
    <div className={`${styling.bg} ${styling.border} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
      {/* Header with Order Info and Batch Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-gray-900">#{item.order.orderNumber}</span>
          <span className="text-xs text-gray-500">Table {item.order.tableNumber}</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Batch Badge */}
          <span className={`${styling.badge} px-2 py-1 rounded-full text-xs font-bold`}>
            {styling.badgeText}
          </span>
          {/* Priority Indicator */}
          <span className={`${priority.color} text-lg`} title={`${priority.level} priority`}>
            {priority.icon}
          </span>
        </div>
      </div>

      {/* Reopened Order Alert */}
      {item.order.isReopened && (
        <div className="mb-3 bg-purple-100 border border-purple-200 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <span className="text-purple-600 text-sm">🔄</span>
            <span className="text-purple-800 text-xs font-semibold">
              REOPENED ORDER - {item.order.totalBatches} batches total
            </span>
          </div>
        </div>
      )}

      {/* Menu Item Info */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1">{item.menuItem.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-indigo-600">×{item.quantity}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        </div>
        {item.notes && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-yellow-800 text-sm">📝 {item.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {item.status === 'PENDING' && (
          <button
            onClick={() => updateItemStatus('PREPARING')}
            disabled={isUpdating}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isUpdating ? '⏳' : '👨‍🍳 Start Cooking'}
          </button>
        )}
        
        {item.status === 'PREPARING' && (
          <button
            onClick={() => updateItemStatus('READY')}
            disabled={isUpdating}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isUpdating ? '⏳' : '✅ Mark Ready'}
          </button>
        )}
        
        {item.status === 'READY' && (
          <div className="flex-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 py-2 px-4 rounded-xl text-center font-semibold text-sm border border-green-200">
            🎉 Ready for Pickup
          </div>
        )}
      </div>

      {/* Time Info */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Added {new Date(item.createdAt).toLocaleTimeString()} 
        {item.batch.isNewAddition && (
          <span className="ml-2 text-purple-600 font-semibold">
            (Batch {item.batch.number})
          </span>
        )}
      </div>
    </div>
  )
}
