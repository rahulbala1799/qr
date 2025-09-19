'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes: string
}

interface Table {
  id: string
  tableNumber: string
}

interface Restaurant {
  id: string
  name: string
  description: string | null
  address: string
  phone: string
  website: string | null
  logo: string | null
}

export default function OrderPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menu, setMenu] = useState<Record<string, MenuItem[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOrdering, setIsOrdering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    if (restaurantId) {
      fetchData()
    }
  }, [restaurantId])

  const fetchData = useCallback(async () => {
    try {
      // Fetch menu and restaurant data
      const menuResponse = await fetch(`/api/public/menu/${restaurantId}`)
      if (!menuResponse.ok) {
        throw new Error('Menu not found')
      }
      const menuData = await menuResponse.json()
      setRestaurant(menuData.restaurant)
      setMenu(menuData.menu)
      setCategories(menuData.categories)

      // Fetch tables
      const tablesResponse = await fetch(`/api/public/tables/${restaurantId}`)
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json()
        setTables(tablesData.tables)
      }
    } catch (error) {
      setError('Error loading restaurant data')
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menuItem.id === menuItem.id)
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prev, { menuItem, quantity: 1, notes: '' }]
      }
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(item => item.menuItem.id !== menuItemId))
  }

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const updateNotes = (menuItemId: string, notes: string) => {
    setCart(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, notes }
          : item
      )
    )
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
  }

  const placeOrder = async () => {
    if (!selectedTable) {
      setError('Please select a table')
      return
    }
    if (cart.length === 0) {
      setError('Your cart is empty')
      return
    }

    setIsOrdering(true)
    setError('')

    try {
      const orderData = {
        restaurantId,
        tableId: selectedTable,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        items: cart.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes
        }))
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Order placed successfully! Order #${data.order.orderNumber}`)
        setCart([])
        setSelectedTable('')
        setCustomerName('')
        setCustomerPhone('')
        setNotes('')
        setShowCart(false)
      } else {
        setError(data.error || 'Failed to place order')
      }
    } catch (error) {
      setError('Error placing order')
    } finally {
      setIsOrdering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {restaurant?.logo && (
                <div className="w-12 h-12 relative">
                  <Image
                    src={restaurant.logo}
                    alt={restaurant.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{restaurant?.name}</h1>
                <p className="text-sm text-gray-600">Order Online</p>
              </div>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Cart ({cart.length})
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Menu Items Available</h2>
                <p className="text-gray-600">This restaurant hasn&apos;t added any menu items yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {categories.map((category) => (
                  <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-primary-600 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white">{category}</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {menu[category].map((item) => (
                        <div key={item.id} className="p-6">
                          <div className="flex items-start space-x-4">
                            {item.image && (
                              <div className="w-20 h-20 relative flex-shrink-0">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover rounded-lg"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                  {item.description && (
                                    <p className="text-gray-600 mt-1">{item.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary-600">€{item.price.toFixed(2)}</p>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                                  >
                                    Add to Cart
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className={`bg-white rounded-lg shadow-sm ${showCart ? 'block' : 'hidden lg:block'}`}>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Order</h2>
                
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.menuItem.id} className="border-b border-gray-200 pb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                              <p className="text-sm text-gray-600">€{item.menuItem.price.toFixed(2)} each</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.menuItem.id)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                          <textarea
                            value={item.notes}
                            onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                            placeholder="Special instructions..."
                            className="w-full mt-2 p-2 border border-gray-300 rounded text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-lg font-semibold mb-4">
                        <span>Total:</span>
                        <span>€{getTotalAmount().toFixed(2)}</span>
                      </div>

                      {/* Order Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Table Number *
                          </label>
                          <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            required
                          >
                            <option value="">Select Table</option>
                            {tables.map((table) => (
                              <option key={table.id} value={table.id}>
                                Table {table.tableNumber}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Your Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Enter your name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number (Optional)
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Enter your phone number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Order Notes (Optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                            placeholder="Any special requests or notes for your order..."
                          />
                        </div>

                        <button
                          onClick={placeOrder}
                          disabled={isOrdering || !selectedTable}
                          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isOrdering ? 'Placing Order...' : 'Place Order'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
