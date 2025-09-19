'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Restaurant {
  id: string
  name: string
  email: string
  description: string | null
  address: string
  phone: string
  website: string | null
  logo: string | null
  currency: string
  isActive: boolean
  isPublished: boolean
}

const CURRENCIES = [
  { code: '€', name: 'Euro (€)', symbol: '€' },
  { code: '$', name: 'US Dollar ($)', symbol: '$' },
  { code: '£', name: 'British Pound (£)', symbol: '£' },
  { code: '¥', name: 'Japanese Yen (¥)', symbol: '¥' },
  { code: '₹', name: 'Indian Rupee (₹)', symbol: '₹' },
  { code: '₽', name: 'Russian Ruble (₽)', symbol: '₽' },
  { code: '₩', name: 'South Korean Won (₩)', symbol: '₩' },
  { code: '₪', name: 'Israeli Shekel (₪)', symbol: '₪' },
  { code: '₦', name: 'Nigerian Naira (₦)', symbol: '₦' },
  { code: '₨', name: 'Pakistani Rupee (₨)', symbol: '₨' },
  { code: '₴', name: 'Ukrainian Hryvnia (₴)', symbol: '₴' },
  { code: '₡', name: 'Costa Rican Colón (₡)', symbol: '₡' },
  { code: '₫', name: 'Vietnamese Dong (₫)', symbol: '₫' },
  { code: '₱', name: 'Philippine Peso (₱)', symbol: '₱' },
  { code: '₲', name: 'Paraguayan Guarani (₲)', symbol: '₲' },
  { code: '₵', name: 'Ghanaian Cedi (₵)', symbol: '₵' },
  { code: '₸', name: 'Kazakhstani Tenge (₸)', symbol: '₸' },
  { code: '₼', name: 'Azerbaijani Manat (₼)', symbol: '₼' },
  { code: '₾', name: 'Georgian Lari (₾)', symbol: '₾' },
  { code: '₿', name: 'Bitcoin (₿)', symbol: '₿' }
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchRestaurantData()
    }
  }, [status, router])

  const fetchRestaurantData = async () => {
    try {
      const response = await fetch('/api/restaurant/settings')
      if (response.ok) {
        const data = await response.json()
        setRestaurant(data.restaurant)
      } else {
        setError('Failed to fetch restaurant data')
      }
    } catch (error) {
      setError('Error fetching restaurant data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurant) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/restaurant/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address,
          phone: restaurant.phone,
          website: restaurant.website,
          logo: restaurant.logo,
          currency: restaurant.currency
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Settings updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update settings')
      }
    } catch (error) {
      setError('Error updating settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof Restaurant, value: string) => {
    if (restaurant) {
      setRestaurant({ ...restaurant, [field]: value })
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h2>
          <p className="text-gray-600">Unable to load restaurant data.</p>
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
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-primary-600">Restaurant Settings</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={restaurant.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    value={restaurant.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.symbol}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={restaurant.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Brief description of your restaurant..."
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={restaurant.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={restaurant.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={restaurant.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://your-restaurant.com"
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Logo</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={restaurant.logo || ''}
                  onChange={(e) => handleInputChange('logo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/logo.jpg"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter a URL to an image file (JPG, PNG, etc.) for your restaurant logo.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
