'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

interface QRCodeData {
  qrCode: string
  qrUrl: string
  tableNumber: string
}

interface Restaurant {
  id: string
  name: string
  currency: string
}

export default function QRCodePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tableId = params.tableId as string
  
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchQRData()
    }
  }, [status, router, tableId, fetchQRData])

  const fetchQRData = useCallback(async () => {
    try {
      const [qrResponse, restaurantResponse] = await Promise.all([
        fetch(`/api/tables/${tableId}/qrcode`),
        fetch('/api/restaurant/settings')
      ])

      if (qrResponse.ok && restaurantResponse.ok) {
        const qrData = await qrResponse.json()
        const restaurantData = await restaurantResponse.json()
        
        setQrData(qrData)
        setRestaurant(restaurantData.restaurant)
      } else {
        setError('Failed to load QR code data')
      }
    } catch (error) {
      setError('Error loading QR code data')
    } finally {
      setIsLoading(false)
    }
  }, [tableId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/tables/${tableId}/qrcode/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `QR-Code-Table-${qrData?.tableNumber || 'Unknown'}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Failed to generate PDF')
      }
    } catch (error) {
      setError('Error generating PDF')
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

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'QR code not found'}</p>
          <button
            onClick={() => router.push('/dashboard/tables')}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Back to Tables
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/tables')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to Tables
              </button>
              <h1 className="text-2xl font-bold text-primary-600">QR Code - Table {qrData.tableNumber}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Print QR Code
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            {/* Restaurant Info */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {restaurant?.name || 'Restaurant'}
              </h2>
              <p className="text-lg text-gray-600">Table {qrData.tableNumber}</p>
            </div>

            {/* QR Code */}
            <div className="mb-8">
              <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
                <Image
                  src={qrData.qrCode}
                  alt={`QR Code for Table ${qrData.tableNumber}`}
                  width={300}
                  height={300}
                  className="mx-auto"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl mb-2">📱</div>
                  <h4 className="font-semibold text-blue-900 mb-2">1. Scan QR Code</h4>
                  <p className="text-blue-800 text-sm">Use your phone camera to scan this QR code</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl mb-2">🍽️</div>
                  <h4 className="font-semibold text-green-900 mb-2">2. Browse Menu</h4>
                  <p className="text-green-800 text-sm">View our menu and add items to your cart</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <h4 className="font-semibold text-purple-900 mb-2">3. Place Order</h4>
                  <p className="text-purple-800 text-sm">Complete your order and we&apos;ll bring it to your table</p>
                </div>
              </div>
            </div>

            {/* URL Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Direct URL:</p>
              <p className="text-sm font-mono text-gray-800 break-all">{qrData.qrUrl}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
