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
  currency: string
}

export default function TableOrderPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  const tableId = params.tableId as string
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [menu, setMenu] = useState<Record<string, MenuItem[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOrdering, setIsOrdering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [cartAnimation, setCartAnimation] = useState('')
  const [itemAnimations, setItemAnimations] = useState<Record<string, string>>({})
  const [showOrderForm, setShowOrderForm] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Fetch menu and restaurant data
      const menuResponse = await fetch(`/api/public/menu/${restaurantId}`)
      if (!menuResponse.ok) {
        throw new Error('Menu not found')
      }
      const menuData = await menuResponse.json()
      setRestaurant(menuData.restaurant)

      // Fetch table data
      const tablesResponse = await fetch(`/api/public/tables/${restaurantId}`)
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json()
        const foundTable = tablesData.tables.find((t: Table) => t.id === tableId)
        if (foundTable) {
          setTable(foundTable)
          setMenu(menuData.menu)
          setCategories(menuData.categories)
          // Set first category as active
          if (menuData.categories.length > 0) {
            setActiveCategory(menuData.categories[0])
          }
        } else {
          throw new Error('Table not found')
        }
      } else {
        throw new Error('Unable to load table information')
      }
    } catch (error) {
      setError('Error loading restaurant data')
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId, tableId])

  useEffect(() => {
    if (restaurantId && tableId) {
      fetchData()
    }
  }, [restaurantId, tableId, fetchData])

  // Scroll detection for category navigation
  useEffect(() => {
    const handleScroll = () => {
      const categoryElements = categories.map(cat => ({
        id: cat,
        element: document.getElementById(`category-${cat}`)
      })).filter(cat => cat.element)

      if (categoryElements.length === 0) return

      const scrollPosition = window.scrollY + 200 // Offset for sticky header

      for (let i = categoryElements.length - 1; i >= 0; i--) {
        const category = categoryElements[i]
        if (category.element && category.element.offsetTop <= scrollPosition) {
          setActiveCategory(category.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [categories])

  // Prevent body scroll when cart is open on mobile
  useEffect(() => {
    if (showCart) {
      // More comprehensive scroll prevention
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
    }
  }, [showCart])

  const addToCart = (menuItem: MenuItem) => {
    // Add item animation
    setItemAnimations(prev => ({
      ...prev,
      [menuItem.id]: 'animate-bounce'
    }))

    // Clear animation after delay
    setTimeout(() => {
      setItemAnimations(prev => ({
        ...prev,
        [menuItem.id]: ''
      }))
    }, 600)

    // Cart shake animation
    setCartAnimation('animate-pulse')
    setTimeout(() => setCartAnimation(''), 300)

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

    // Show success toast
    const toast = document.createElement('div')
    toast.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in-right'
    toast.textContent = `${menuItem.name} added to cart!`
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.classList.add('animate-slide-out-right')
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 2000)
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

  const scrollToCategory = (category: string) => {
    setActiveCategory(category)
    const element = document.getElementById(`category-${category}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty')
      return
    }

    setIsOrdering(true)
    setError('')

    try {
      const orderData = {
        restaurantId,
        tableId,
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

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Table Not Found</h1>
          <p className="text-gray-600">This table is not available for ordering.</p>
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
                <p className="text-sm text-gray-600">
                  Table {table.tableNumber} • Order Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className={`relative bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all duration-300 hover:scale-105 ${cartAnimation}`}
            >
              <span className="hidden sm:inline">Cart ({cart.length})</span>
              <span className="sm:hidden">Cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 1 && (
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => scrollToCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
                  <div key={category} id={`category-${category}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-primary-600 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white">{category}</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {menu[category].map((item, index) => (
                        <div 
                          key={item.id} 
                          className="p-6 hover:bg-gray-50 transition-colors duration-200"
                          style={{
                            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            {item.image && (
                              <div className="w-20 h-20 relative flex-shrink-0 overflow-hidden rounded-lg hover:scale-105 transition-transform duration-300">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 mr-4">
                                  <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">{item.name}</h3>
                                  {item.description && (
                                    <p className="text-gray-600 mt-1 text-sm leading-relaxed">{item.description}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xl font-bold text-primary-600 mb-2">{restaurant?.currency || '€'}{item.price.toFixed(2)}</p>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className={`bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-full hover:from-primary-700 hover:to-primary-800 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 ${itemAnimations[item.id] || ''}`}
                                  >
                                    <span className="flex items-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                      <span>Add to Cart</span>
                                    </span>
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
            {/* Mobile Cart Overlay */}
            {showCart && (
              <div 
                className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
                onClick={() => setShowCart(false)}
                style={{ touchAction: 'none' }}
              ></div>
            )}
            
            {/* CLEAN SIMPLE CART - NO MORE BULLSHIT */}
            <div className={`bg-white rounded-lg shadow-sm ${showCart ? 'block' : 'hidden lg:block'} ${showCart ? 'fixed inset-4 z-50 animate-slide-in-right' : ''}`}>
              
              {/* Cart Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Your Order</h2>
                  {showCart && (
                    <button
                      onClick={() => setShowCart(false)}
                      className="lg:hidden p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Table Info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium text-blue-900">Table {table.tableNumber}</span>
                  </div>
                </div>
              </div>

              {/* Cart Items - PROPER SPACE */}
              <div className={`${showCart ? 'max-h-96' : 'max-h-80'} overflow-y-auto p-6`}>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">Your cart is empty</h3>
                    <p className="text-gray-500 text-sm">Add items from the menu</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.menuItem.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                            <p className="text-primary-600 font-medium text-sm">{restaurant?.currency || '€'}{item.menuItem.price.toFixed(2)} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.menuItem.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                              className="w-7 h-7 rounded bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                              className="w-7 h-7 rounded bg-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-200"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{restaurant?.currency || '€'}{(item.menuItem.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                          placeholder="Special instructions..."
                          className="w-full p-2 border border-gray-200 rounded text-sm"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Footer */}
              {cart.length > 0 && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6">
                  <div className="flex justify-between text-lg font-semibold mb-4">
                    <span>Total:</span>
                    <span>{restaurant?.currency || '€'}{getTotalAmount().toFixed(2)}</span>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Your name (optional)"
                    />

                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Phone number (optional)"
                    />

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="Special instructions (optional)"
                    />

                    <button
                      onClick={placeOrder}
                      disabled={isOrdering}
                      className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                    >
                      {isOrdering ? 'Placing Order...' : `Place Order - ${restaurant?.currency || '€'}${getTotalAmount().toFixed(2)}`}
                    </button>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm">{success}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Buttons */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col space-y-2">
        {/* Back to Top Button */}
        {categories.length > 1 && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
            title="Back to top"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}
        
        {/* Cart Button for Mobile */}
        {!showCart && cart.length > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {restaurant?.currency || '€'}{getTotalAmount().toFixed(0)}
            </div>
          </button>
        )}
      </div>
      {/* Custom CSS Animations */}
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

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }

        .animate-slide-out-right {
          animation: slideOutRight 0.3s ease-in forwards;
        }

        /* Enhanced scrollbar for cart */
        .cart-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .cart-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .cart-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .cart-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Loading shimmer effect */
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }

        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}
