import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/restaurant/publish - Toggle menu publish status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isPublished } = await request.json()

    if (typeof isPublished !== 'boolean') {
      return NextResponse.json(
        { error: 'isPublished must be a boolean value' },
        { status: 400 }
      )
    }

    // Update the restaurant's publish status
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: session.user.id },
      data: { isPublished },
      select: {
        id: true,
        name: true,
        isPublished: true
      }
    })

    return NextResponse.json({
      message: `Menu ${isPublished ? 'published' : 'unpublished'} successfully`,
      restaurant: updatedRestaurant
    })
  } catch (error) {
    console.error('Error updating publish status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/restaurant/publish - Get current publish status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        isPublished: true,
        _count: {
          select: {
            menuItems: {
              where: { isAvailable: true }
            }
          }
        }
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      restaurant: {
        ...restaurant,
        availableMenuItemsCount: restaurant._count.menuItems
      }
    })
  } catch (error) {
    console.error('Error fetching publish status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
