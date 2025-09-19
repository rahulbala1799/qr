import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/menu/[restaurantId] - Get published menu for customers
export async function GET(
  request: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    // Get the restaurant and verify it's published
    const restaurant = await prisma.restaurant.findFirst({
      where: { 
        id: params.restaurantId,
        isPublished: true,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        website: true,
        logo: true,
        currency: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or menu not published' },
        { status: 404 }
      )
    }

    // Get available menu items
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: params.restaurantId,
        isAvailable: true
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group menu items by category
    const menuByCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price.toString()),
        image: item.image
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      restaurant,
      menu: menuByCategory,
      categories: Object.keys(menuByCategory).sort()
    })
  } catch (error) {
    console.error('Error fetching public menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
