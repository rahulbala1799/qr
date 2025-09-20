'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: string
  quantity: number
  price: number
  notes: string | null
  menuItem: {
    id: string
    name: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
  notes: string | null
  table: {
    id: string
    tableNumber: string
  }
  orderItems: OrderItem[]
  createdAt: string
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const [isConnected, setIsConnected] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return
    
    try {
      // Create audio context and generate notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a pleasant notification sound (like a bell)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }, [soundEnabled])

  const fetchOrders = useCallback(async () => {
    try {
      setIsConnected(true)
      const url = selectedStatus === 'all' 
        ? `/api/orders?restaurantId=${session?.user?.id}`
        : `/api/orders?restaurantId=${session?.user?.id}&status=${selectedStatus}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const newOrders = data.orders
        
        // Check for new orders (only if not initial load)
        if (!isLoading && orders.length > 0) {
          const currentOrderCount = newOrders.length
          const pendingOrders = newOrders.filter((order: Order) => order.status === 'PENDING')
          
          // If we have more orders than before, play sound
          if (currentOrderCount > lastOrderCount) {
            playNotificationSound()
            setNewOrdersCount(prev => prev + (currentOrderCount - lastOrderCount))
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              const newOrdersCount = currentOrderCount - lastOrderCount
              new Notification(`${newOrdersCount} New Order${newOrdersCount > 1 ? 's' : ''} Received!`, {
                body: `You have ${pendingOrders.length} pending orders`,
                icon: '/favicon.ico',
                tag: 'new-order'
              })
            }
          }
          
          setLastOrderCount(currentOrderCount)
        } else if (isLoading) {
          // Initial load
          setLastOrderCount(newOrders.length)
        }
        
        setOrders(newOrders)
        setError('')
      } else {
        setError('Failed to fetch orders')
        setIsConnected(false)
      }
    } catch (error) {
      setError('Error fetching orders')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, selectedStatus, isLoading, orders.length, lastOrderCount, playNotificationSound])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Initial fetch and setup polling
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchOrders()
      
      // Set up polling for live updates every 5 seconds
      const pollInterval = setInterval(() => {
        fetchOrders()
      }, 5000)
      
      return () => clearInterval(pollInterval)
    }
  }, [status, router, selectedStatus, fetchOrders])

  // Clear new orders count when user interacts
  const clearNewOrdersCount = () => {
    setNewOrdersCount(0)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh orders
        fetchOrders()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update order status')
      }
    } catch (error) {
      setError('Error updating order status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'DELIVERED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 'CONFIRMED'
      case 'CONFIRMED': return 'PREPARING'
      case 'PREPARING': return 'READY'
      case 'READY': return 'DELIVERED'
      default: return null
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to sign in...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-primary-600">Order Management</h1>
                <div className="flex items-center space-x-2 bg-green-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">LIVE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
              
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={soundEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {soundEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-5a3 3 0 00-6 0v5zM9 12H6a3 3 0 00-3 3v2a3 3 0 003 3h3v-8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  )}
                </svg>
              </button>
              
              {/* New Orders Indicator */}
              {newOrdersCount > 0 && (
                <button
                  onClick={clearNewOrdersCount}
                  className="relative bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse hover:bg-red-600"
                >
                  {newOrdersCount} New Order{newOrdersCount > 1 ? 's' : ''}!
                </button>
              )}
              
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Status Filter */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filter Orders</h2>
            <div className="flex flex-wrap gap-2">
              {['all', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedStatus === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All Orders' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
              <p className="text-gray-600">
                {selectedStatus === 'all' 
                  ? 'No orders have been placed yet.' 
                  : `No orders with status "${selectedStatus}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, index) => {
                const isNewOrder = index < newOrdersCount && order.status === 'PENDING'
                return (
                <div 
                  key={order.id} 
                  className={`bg-white shadow rounded-lg overflow-hidden transition-all duration-300 ${
                    isNewOrder ? 'ring-2 ring-red-400 shadow-lg animate-pulse' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{order.orderNumber}
                          </h3>
                          {isNewOrder && (
                            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                              NEW!
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Table {order.table.tableNumber} • {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700 transition-colors"
                          >
                            Mark as {getNextStatus(order.status)}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    {(order.customerName || order.customerPhone) && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-1">Customer Information</h4>
                        {order.customerName && <p className="text-sm text-gray-600">Name: {order.customerName}</p>}
                        {order.customerPhone && <p className="text-sm text-gray-600">Phone: {order.customerPhone}</p>}
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                      <div className="space-y-2">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.quantity}x {item.menuItem.name}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-gray-600 italic">Note: {item.notes}</p>
                              )}
                            </div>
                            <p className="text-gray-900">€{(Number(item.price || 0) * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-1">Order Notes</h4>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-lg font-bold text-primary-600">€{Number(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
