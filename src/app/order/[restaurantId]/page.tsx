'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

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
  const router = useRouter()
  const restaurantId = params.restaurantId as string
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      // Fetch restaurant data
      const menuResponse = await fetch(`/api/public/menu/${restaurantId}`)
      if (!menuResponse.ok) {
        throw new Error('Restaurant not found')
      }
      const menuData = await menuResponse.json()
      setRestaurant(menuData.restaurant)

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

  useEffect(() => {
    if (restaurantId) {
      fetchData()
    }
  }, [restaurantId, fetchData])

  const selectTable = (tableId: string) => {
    router.push(`/order/${restaurantId}/${tableId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">{error || 'The restaurant you&apos;re looking for doesn&apos;t exist or is not accepting orders.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            {restaurant.logo && (
              <div className="w-16 h-16 relative">
                <Image
                  src={restaurant.logo}
                  alt={restaurant.name}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              {restaurant.description && (
                <p className="text-gray-600 mt-1">{restaurant.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>📍 {restaurant.address}</span>
                <span>📞 {restaurant.phone}</span>
                {restaurant.website && (
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    🌐 Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Selection */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Table</h2>
          <p className="text-gray-600">Choose your table number to start ordering</p>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tables Available</h3>
            <p className="text-gray-600">This restaurant hasn&apos;t set up any tables yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => selectTable(table.id)}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-primary-500"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-600 font-bold text-lg">{table.tableNumber}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Table {table.tableNumber}</h3>
                  <p className="text-sm text-gray-600 mt-1">Click to order</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Order</h3>
          <div className="text-blue-800 space-y-2">
            <p>1. <strong>Select your table</strong> - Click on your table number above</p>
            <p>2. <strong>Browse the menu</strong> - Add items to your cart</p>
            <p>3. <strong>Review your order</strong> - Check items and add any special notes</p>
            <p>4. <strong>Place your order</strong> - Your order will be delivered to your table</p>
          </div>
        </div>
      </div>
    </div>
  )
}