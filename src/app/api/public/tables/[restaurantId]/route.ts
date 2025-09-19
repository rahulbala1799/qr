import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/tables/[restaurantId] - Get active tables for a restaurant
export async function GET(
  request: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    // Verify restaurant exists and is published
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: params.restaurantId,
        isPublished: true,
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or not accepting orders' },
        { status: 404 }
      )
    }

    // Get active tables for the restaurant
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: params.restaurantId,
        isActive: true
      },
      select: {
        id: true,
        tableNumber: true
      },
      orderBy: {
        tableNumber: 'asc'
      }
    })

    return NextResponse.json({
      restaurant,
      tables
    })

  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
