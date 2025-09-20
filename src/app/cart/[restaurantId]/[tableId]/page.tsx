'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  isMeal?: boolean
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

export default function ModernCartPage() {
  const router = useRouter()
  const params = useParams()
  const restaurantId = params.restaurantId as string
  const tableId = params.tableId as string

  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  
  // Customer info
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  
  // Promo and totals
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(15)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch restaurant and table data in parallel
      const [restaurantRes, tableRes] = await Promise.all([
        fetch(`/api/public/menu/${restaurantId}`),
        fetch(`/api/public/tables/${restaurantId}`)
      ])

      if (restaurantRes.ok) {
        const restaurantData = await restaurantRes.json()
        setRestaurant(restaurantData.restaurant)
      }

      if (tableRes.ok) {
        const tableData = await tableRes.json()
        const currentTable = tableData.tables.find((t: Table) => t.id === tableId)
        setTable(currentTable || null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load restaurant information')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, tableId])

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${restaurantId}_${tableId}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error('Error parsing cart:', error)
      }
    }
  }, [restaurantId, tableId])

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate estimated time
  useEffect(() => {
    const baseTime = 15
    const itemTime = cart.reduce((total, item) => total + (item.quantity * 2), 0)
    setEstimatedTime(baseTime + itemTime)
  }, [cart])

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`cart_${restaurantId}_${tableId}`, JSON.stringify(cart))
    } else {
      localStorage.removeItem(`cart_${restaurantId}_${tableId}`)
    }
  }, [cart, restaurantId, tableId])

  // Cart calculations
  const getSubtotal = () => {
    return cart.reduce((total, item) => {
      const itemPrice = item.menuItem.price + (item.isMeal ? 4.50 : 0)
      return total + (itemPrice * item.quantity)
    }, 0)
  }

  const getTotalAmount = () => {
    return getSubtotal() - discount
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  // Cart actions
  const updateQuantity = (menuItemId: string, isMeal: boolean, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId, isMeal)
      return
    }

    setCart(prev => prev.map(item =>
      item.menuItem.id === menuItemId && (item.isMeal || false) === isMeal
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const removeFromCart = (menuItemId: string, isMeal: boolean) => {
    setCart(prev => prev.filter(item => 
      !(item.menuItem.id === menuItemId && (item.isMeal || false) === isMeal)
    ))
  }

  const updateNotes = (menuItemId: string, isMeal: boolean, newNotes: string) => {
    setCart(prev => prev.map(item =>
      item.menuItem.id === menuItemId && (item.isMeal || false) === isMeal
        ? { ...item, notes: newNotes }
        : item
    ))
  }

  // Apply promo code
  const applyPromoCode = () => {
    const validCodes = {
      'SAVE10': 0.10,
      'WELCOME': 5.00,
      'STUDENT': 0.15
    }

    const code = promoCode.toUpperCase()
    if (validCodes[code as keyof typeof validCodes]) {
      const discountValue = validCodes[code as keyof typeof validCodes]
      const discountAmount = discountValue < 1 ? getSubtotal() * discountValue : discountValue
      setDiscount(Math.min(discountAmount, getSubtotal()))
      setSuccess(`Promo code applied! Saved ${restaurant?.currency || '€'}${discountAmount.toFixed(2)}`)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('Invalid promo code')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty')
      return
    }

    if (!customerName.trim()) {
      setError('Please enter your name')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Check for existing order
      const existingOrderData = localStorage.getItem(`placed_order_${restaurantId}_${tableId}`)
      let response: Response

      if (existingOrderData) {
        // Add items to existing order
        const { order } = JSON.parse(existingOrderData)
        
        const addItemsData = {
          items: cart.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes,
            isMeal: item.isMeal || false,
            price: item.menuItem.price + (item.isMeal ? 4.50 : 0)
          }))
        }

        response = await fetch(`/api/orders/${order.id}/add-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
            isMeal: item.isMeal || false,
            price: item.menuItem.price + (item.isMeal ? 4.50 : 0)
          })),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim(),
          totalAmount: getTotalAmount(),
          estimatedTime
        }

        response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        })
      }

      if (response.ok) {
        const result = await response.json()
        
        // Clear cart
        setCart([])
        localStorage.removeItem(`cart_${restaurantId}_${tableId}`)
        
        // Store order for tracking
        localStorage.setItem(`placed_order_${restaurantId}_${tableId}`, JSON.stringify({
          order: result.order,
          timestamp: Date.now()
        }))
        
        // Success message
        const message = existingOrderData 
          ? `✅ Items added to Order #${result.order.orderNumber}!`
          : `🎉 Order placed successfully! Order #${result.order.orderNumber}`
        
        setSuccess(message)
        
        // Redirect to tracking
        setTimeout(() => {
          router.push(`/order/${restaurantId}/${tableId}?tracking=true`)
        }, 1500)
        
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to place order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your cart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href={`/order/${restaurantId}/${tableId}`}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Menu</span>
            </Link>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">Your Cart</h1>
              {table && (
                <p className="text-sm text-slate-500">Table {table.tableNumber}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h3>
            <p className="text-slate-600 mb-8">Add some delicious items from our menu to get started!</p>
            <Link
              href={`/order/${restaurantId}/${tableId}`}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Browse Menu
            </Link>
          </div>
        ) : (
          /* Cart Items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Column */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Order Items</h2>
              
              {cart.map((item, index) => (
                <div key={`${item.menuItem.id}-${item.isMeal || false}`} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    {/* Item Image Placeholder */}
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Item Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-slate-900">{item.menuItem.name}</h3>
                            {item.isMeal && (
                              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                                <span>🍟</span>
                                <span>MEAL</span>
                              </span>
                            )}
                          </div>
                          {item.menuItem.description && (
                            <p className="text-slate-600 text-sm line-clamp-2 mb-2">{item.menuItem.description}</p>
                          )}
                          <div className="flex items-center space-x-2">
                            {item.isMeal ? (
                              <div>
                                <p className="text-sm text-slate-500 line-through">
                                  {restaurant?.currency || '€'}{item.menuItem.price.toFixed(2)} each
                                </p>
                                <p className="text-orange-600 font-semibold">
                                  {restaurant?.currency || '€'}{(item.menuItem.price + 4.50).toFixed(2)} each (Meal +{restaurant?.currency || '€'}4.50)
                                </p>
                              </div>
                            ) : (
                              <p className="text-indigo-600 font-semibold">
                                {restaurant?.currency || '€'}{item.menuItem.price.toFixed(2)} each
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item.menuItem.id, item.isMeal || false)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 bg-slate-50 rounded-xl p-2">
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.isMeal || false, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center font-semibold text-slate-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.isMeal || false, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-900">
                            {restaurant?.currency || '€'}{((item.menuItem.price + (item.isMeal ? 4.50 : 0)) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Special Instructions */}
                      <div className="mt-4">
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateNotes(item.menuItem.id, item.isMeal || false, e.target.value)}
                          placeholder="Special instructions for this item..."
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none bg-slate-50 hover:bg-white"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({getTotalItems()} items)</span>
                      <span>{restaurant?.currency || '€'}{getSubtotal().toFixed(2)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{restaurant?.currency || '€'}{discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between text-xl font-bold text-slate-900">
                        <span>Total</span>
                        <span>{restaurant?.currency || '€'}{getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-indigo-900 font-semibold">Estimated time: {estimatedTime} min</span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Promo Code</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Try: SAVE10, WELCOME, STUDENT</p>
                </div>

                {/* Customer Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone (optional)</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter your phone"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Special requests</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special instructions..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={placeOrder}
                  disabled={submitting || cart.length === 0 || !customerName.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:scale-100 hover:scale-105"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Placing Order...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Place Order • {restaurant?.currency || '€'}{getTotalAmount().toFixed(2)}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}