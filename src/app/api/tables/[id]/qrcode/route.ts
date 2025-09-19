import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

// GET /api/tables/[id]/qrcode - Generate QR code for a table
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the table and verify it belongs to the authenticated restaurant
    const table = await prisma.table.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      }
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Create the URL that customers will scan
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const qrUrl = `${baseUrl}/order/${table.restaurantId}`

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      qrUrl,
      tableNumber: table.tableNumber
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
