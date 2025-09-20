'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  isAvailable: boolean
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes: string
  customizations?: string[]
}

interface Restaurant {
  id: string
  name: string
  description: string | null
  address: string
  phone: string
  website: string | null
  logo: string | null
  currency: string
}

interface Table {
  id: string
  tableNumber: string
  restaurantId: string
}

export default function CartPage() {
  const router = useRouter()
  const params = useParams()
  const restaurantId = params.restaurantId as string
  const tableId = params.tableId as string

  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOrdering, setIsOrdering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch restaurant and table data
      const [restaurantResponse, tableResponse] = await Promise.all([
        fetch(`/api/public/menu/${restaurantId}`),
        fetch(`/api/public/tables/${restaurantId}`)
      ])

      if (restaurantResponse.ok) {
        const restaurantData = await restaurantResponse.json()
        setRestaurant(restaurantData.restaurant)
      }

      if (tableResponse.ok) {
        const tablesData = await tableResponse.json()
        const currentTable = tablesData.tables.find((t: Table) => t.id === tableId)
        setTable(currentTable)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load restaurant information')
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId, tableId])

  // Load cart from localStorage and fetch data
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}_${tableId}`)
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
    fetchData()
  }, [restaurantId, tableId, fetchData])

  // Calculate estimated preparation time
  useEffect(() => {
    const baseTime = 15 // Base 15 minutes
    const itemTime = cart.reduce((total, item) => total + (item.quantity * 2), 0) // 2 min per item
    setEstimatedTime(baseTime + itemTime)
  }, [cart])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`cart_${restaurantId}_${tableId}`, JSON.stringify(cart))
    } else {
      localStorage.removeItem(`cart_${restaurantId}_${tableId}`)
    }
  }, [cart, restaurantId, tableId])

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId)
      return
    }

    setCart(prev => prev.map(item =>
      item.menuItem.id === menuItemId
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(item => item.menuItem.id !== menuItemId))
  }

  const updateNotes = (menuItemId: string, newNotes: string) => {
    setCart(prev => prev.map(item =>
      item.menuItem.id === menuItemId
        ? { ...item, notes: newNotes }
        : item
    ))
  }

  const getTotalAmount = () => {
    const subtotal = cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
    return subtotal - discount
  }

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const applyPromoCode = async () => {
    // Simulate promo code validation
    if (promoCode.toLowerCase() === 'welcome10') {
      setDiscount(getSubtotal() * 0.1)
      setSuccess('10% discount applied!')
      setTimeout(() => setSuccess(''), 3000)
    } else if (promoCode.toLowerCase() === 'firstorder') {
      setDiscount(5)
      setSuccess('€5 discount applied!')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('Invalid promo code')
      setTimeout(() => setError(''), 3000)
    }
  }

  const placeOrder = async () => {
    if (cart.length === 0) return

    setIsOrdering(true)
    setError('')

    try {
      // Check if there's an existing order to add items to
      const existingOrderData = localStorage.getItem(`placed_order_${restaurantId}_${tableId}`)
      let response

      if (existingOrderData) {
        // Add items to existing order
        const { order } = JSON.parse(existingOrderData)
        
        const addItemsData = {
          items: cart.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes
          }))
        }

        response = await fetch(`/api/orders/${order.id}/add-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addItemsData),
        })
      } else {
        // Create new order
        const orderData = {
          restaurantId,
          tableId,
          items: cart.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes,
            price: item.menuItem.price
          })),
          customerName: customerName || 'Guest',
          customerPhone,
          notes,
          totalAmount: getTotalAmount(),
          estimatedTime
        }

        response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        })
      }

      if (response.ok) {
        const result = await response.json()
        
        if (existingOrderData) {
          setSuccess(`✅ Items added to existing Order #${result.order.orderNumber}! Same bill, more deliciousness!`)
        } else {
          setSuccess('Order placed successfully! Your order number is #' + result.order.orderNumber)
        }
        
        // Clear cart
        setCart([])
        localStorage.removeItem(`cart_${restaurantId}_${tableId}`)
        
        // Store order data for tracking
        localStorage.setItem(`placed_order_${restaurantId}_${tableId}`, JSON.stringify({
          order: result.order,
          timestamp: Date.now()
        }))
        
        // Redirect back to order page with tracking immediately after success message
        setTimeout(() => {
          router.push(`/order/${restaurantId}/${tableId}?tracking=true`)
        }, 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to place order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order. Please try again.')
    } finally {
      setIsOrdering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/order/${restaurantId}/${tableId}`}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-sm text-gray-600">
                  {restaurant?.name} • Table {table?.tableNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{getTotalItems()} items</p>
              <p className="text-lg font-bold text-primary-600">
                {restaurant?.currency || '€'}{getTotalAmount().toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven&apos;t added any items to your cart yet.</p>
            <Link 
              href={`/order/${restaurantId}/${tableId}`}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Order Items</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Est. {estimatedTime} min</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {cart.map((item, index) => (
                    <div 
                      key={item.menuItem.id} 
                      className="group relative bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300"
                      style={{
                        animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Item Image */}
                        {item.menuItem.image && (
                          <div className="w-20 h-20 relative flex-shrink-0 rounded-xl overflow-hidden">
                            <Image
                              src={item.menuItem.image}
                              alt={item.menuItem.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          {/* Item Info */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                                {item.menuItem.name}
                              </h3>
                              {item.menuItem.description && (
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                  {item.menuItem.description}
                                </p>
                              )}
                              <p className="text-primary-600 font-semibold mt-2">
                                {restaurant?.currency || '€'}{item.menuItem.price.toFixed(2)} each
                              </p>
                            </div>
                            
                            {/* Remove Button */}
                            <button
                              onClick={() => removeFromCart(item.menuItem.id)}
                              className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all duration-200 opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3 bg-white rounded-full p-1 shadow-sm border-2 border-gray-100">
                              <button
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="w-12 text-center font-bold text-lg text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                              <p className="text-xl font-bold text-gray-900">
                                {restaurant?.currency || '€'}{(item.menuItem.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Special Instructions */}
                          <div className="relative">
                            <textarea
                              value={item.notes}
                              onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                              placeholder="Special instructions for this item..."
                              className="w-full p-4 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 resize-none"
                              rows={2}
                            />
                            {item.notes && (
                              <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Items */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Link 
                    href={`/order/${restaurantId}/${tableId}`}
                    className="flex items-center justify-center w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add more items
                  </Link>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({getTotalItems()} items)</span>
                      <span>{restaurant?.currency || '€'}{getSubtotal().toFixed(2)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{restaurant?.currency || '€'}{discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-600">
                      <span>Service charge</span>
                      <span>Free</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-primary-600">
                        {restaurant?.currency || '€'}{getTotalAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="mb-6">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo code"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        onClick={applyPromoCode}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900">Estimated Time</p>
                        <p className="text-blue-700 text-sm">{estimatedTime} minutes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Your Information</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        rows={3}
                        placeholder="Any special requests for your order..."
                      />
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={placeOrder}
                    disabled={isOrdering || cart.length === 0}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isOrdering ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Placing Order...
                      </div>
                    ) : (
                      `Place Order • ${restaurant?.currency || '€'}${getTotalAmount().toFixed(2)}`
                    )}
                  </button>

                  {/* Messages */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-700 text-sm">{success}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
