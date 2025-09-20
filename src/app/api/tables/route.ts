import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// GET /api/tables - Get all tables for the authenticated restaurant
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tables = await prisma.table.findMany({
      where: {
        restaurantId: session.user.id
      },
      orderBy: {
        tableNumber: 'asc'
      }
    })

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableNumber } = await request.json()

    if (!tableNumber) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      )
    }

    // Check if table number already exists for this restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        restaurantId: session.user.id,
        tableNumber: tableNumber.toString()
      }
    })

    if (existingTable) {
      return NextResponse.json(
        { error: 'Table number already exists' },
        { status: 400 }
      )
    }

    // Generate unique QR code
    const qrCode = uuidv4()

    const table = await prisma.table.create({
      data: {
        tableNumber: tableNumber.toString(),
        qrCode,
        restaurantId: session.user.id
      }
    })

    return NextResponse.json(
      { 
        message: 'Table created successfully',
        table 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
