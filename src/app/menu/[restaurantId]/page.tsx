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

interface Restaurant {
  id: string
  name: string
  description: string | null
  address: string
  phone: string
  website: string | null
  logo: string | null
}

export default function PublicMenuPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menu, setMenu] = useState<Record<string, MenuItem[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMenu = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/menu/${restaurantId}`)
      if (response.ok) {
        const data = await response.json()
        setRestaurant(data.restaurant)
        setMenu(data.menu)
        setCategories(data.categories)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Menu not found')
      }
    } catch (error) {
      setError('Error loading menu')
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (restaurantId) {
      fetchMenu()
    }
  }, [restaurantId, fetchMenu])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Menu Not Available</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant you&apos;re looking for doesn&apos;t exist or the menu is not published.</p>
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

      {/* Menu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                              <p className="text-lg font-bold text-primary-600">${item.price.toFixed(2)}</p>
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

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500">
            <p>Powered by QR Order - Contactless Restaurant Ordering</p>
          </div>
        </div>
      </div>
    </div>
  )
}
