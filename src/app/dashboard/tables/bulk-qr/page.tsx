'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Table {
  id: string
  tableNumber: string
  isActive: boolean
}

interface Restaurant {
  id: string
  name: string
  currency: string
}

export default function BulkQRPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [tablesResponse, restaurantResponse] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/restaurant/settings')
      ])

      if (tablesResponse.ok && restaurantResponse.ok) {
        const tablesData = await tablesResponse.json()
        const restaurantData = await restaurantResponse.json()
        
        setTables(tablesData.tables.filter((table: Table) => table.isActive))
        setRestaurant(restaurantData.restaurant)
      } else {
        setError('Failed to load data')
      }
    } catch (error) {
      setError('Error loading data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTableSelect = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([])
    } else {
      setSelectedTables(tables.map(table => table.id))
    }
  }

  const handleGeneratePDF = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table')
      return
    }

    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/tables/bulk-qr/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableIds: selectedTables
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `QR-Codes-${restaurant?.name || 'Restaurant'}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setSuccess(`PDF generated successfully with ${selectedTables.length} QR codes!`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate PDF')
      }
    } catch (error) {
      setError('Error generating PDF')
    } finally {
      setIsGenerating(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/tables')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Tables
              </button>
              <h1 className="text-2xl font-bold text-primary-600">Bulk QR Code Generation</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Generate QR Codes for Printing</h2>
            <p className="text-blue-800 mb-4">
              Select the tables you want to generate QR codes for. The system will create a PDF file 
              with all selected QR codes that you can print and place on your tables.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">1</div>
                <span>Select tables below</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">2</div>
                <span>Click "Generate PDF"</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2">3</div>
                <span>Print and place on tables</span>
              </div>
            </div>
          </div>

          {/* Table Selection */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Select Tables ({selectedTables.length} of {tables.length} selected)
              </h2>
              <button
                onClick={handleSelectAll}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {selectedTables.length === tables.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {tables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No active tables found. Create some tables first.</p>
                <button
                  onClick={() => router.push('/dashboard/tables')}
                  className="mt-2 text-primary-600 hover:text-primary-700"
                >
                  Go to Tables
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTables.includes(table.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTableSelect(table.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Table {table.tableNumber}</h3>
                        <p className="text-sm text-gray-500">Active</p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedTables.includes(table.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedTables.includes(table.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Generate PDF</h3>
                <p className="text-sm text-gray-500">
                  {selectedTables.length > 0 
                    ? `Ready to generate PDF with ${selectedTables.length} QR codes`
                    : 'Select tables to generate QR codes'
                  }
                </p>
              </div>
              <button
                onClick={handleGeneratePDF}
                disabled={selectedTables.length === 0 || isGenerating}
                className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generate PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
