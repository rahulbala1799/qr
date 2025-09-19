'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Table {
  id: string
  tableNumber: string
  qrCode: string
  isActive: boolean
  createdAt: string
}

export default function TablesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [editTableNumber, setEditTableNumber] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchTables()
    }
  }, [status, router])

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables')
      if (response.ok) {
        const data = await response.json()
        setTables(data.tables)
      } else {
        setError('Failed to fetch tables')
      }
    } catch (error) {
      setError('Error fetching tables')
    } finally {
      setIsLoading(false)
    }
  }

  const createTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableNumber.trim()) {
      setError('Table number is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber: newTableNumber.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTables([...tables, data.table])
        setNewTableNumber('')
        setSuccess('Table created successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to create table')
      }
    } catch (error) {
      setError('Error creating table')
    } finally {
      setIsCreating(false)
    }
  }

  const updateTable = async (tableId: string) => {
    if (!editTableNumber.trim()) {
      setError('Table number is required')
      return
    }

    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber: editTableNumber.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTables(tables.map(table => 
          table.id === tableId ? { ...table, tableNumber: data.table.tableNumber } : table
        ))
        setEditingTable(null)
        setEditTableNumber('')
        setSuccess('Table updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update table')
      }
    } catch (error) {
      setError('Error updating table')
    }
  }

  const toggleTableStatus = async (tableId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTables(tables.map(table => 
          table.id === tableId ? { ...table, isActive: data.table.isActive } : table
        ))
        setSuccess(`Table ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update table status')
      }
    } catch (error) {
      setError('Error updating table status')
    }
  }

  const deleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTables(tables.filter(table => table.id !== tableId))
        setSuccess('Table deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete table')
      }
    } catch (error) {
      setError('Error deleting table')
    }
  }

  const generateQRCode = async (tableId: string) => {
    // Navigate to the proper QR code page
    router.push(`/dashboard/tables/qr/${tableId}`)
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
                onClick={() => router.push('/dashboard')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-primary-600">Manage Tables</h1>
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

          {/* Create New Table Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Add New Table</h2>
              {tables.length > 0 && (
                <button
                  onClick={() => router.push('/dashboard/tables/bulk-qr')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Generate Bulk QR Codes
                </button>
              )}
            </div>
            <form onSubmit={createTable} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Enter table number (e.g., 1, 2, A1, B2)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Add Table'}
              </button>
            </form>
          </div>

          {/* Tables List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Tables ({tables.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {tables.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No tables created yet. Add your first table above!</p>
                </div>
              ) : (
                tables.map((table) => (
                  <div key={table.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${table.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          {editingTable === table.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editTableNumber}
                                onChange={(e) => setEditTableNumber(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => updateTable(table.id)}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTable(null)
                                  setEditTableNumber('')
                                }}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-medium text-gray-900">
                              Table {table.tableNumber}
                            </h3>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(table.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => generateQRCode(table.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        QR Code
                      </button>
                      <button
                        onClick={() => {
                          setEditingTable(table.id)
                          setEditTableNumber(table.tableNumber)
                        }}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleTableStatus(table.id, table.isActive)}
                        className={`px-3 py-1 text-sm rounded ${
                          table.isActive
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {table.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteTable(table.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
