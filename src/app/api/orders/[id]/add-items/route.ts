import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/orders/[id]/add-items - Add items to an existing order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { items } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    // Get the existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        restaurant: true,
        table: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify restaurant is still active and published
    if (!existingOrder.restaurant.isActive || !existingOrder.restaurant.isPublished) {
      return NextResponse.json(
        { error: 'Restaurant is not accepting orders' },
        { status: 400 }
      )
    }

    // Calculate additional amount and prepare new order items
    let additionalAmount = 0
    const newOrderItems = []

    for (const item of items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          restaurantId: existingOrder.restaurantId,
          isAvailable: true
        }
      })

      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found or not available` },
          { status: 400 }
        )
      }

      const itemTotal = parseFloat(menuItem.price.toString()) * item.quantity
      additionalAmount += itemTotal

      newOrderItems.push({
        quantity: item.quantity,
        price: parseFloat(menuItem.price.toString()),
        notes: item.notes || null,
        status: 'PENDING',
        menuItemId: item.menuItemId,
        orderId: params.id
      })
    }

    // Add new items to the order and update total amount
    await prisma.$transaction([
      // Create new order items
      prisma.orderItem.createMany({
        data: newOrderItems
      }),
      // Update order total amount
      prisma.order.update({
        where: { id: params.id },
        data: {
          totalAmount: {
            increment: additionalAmount
          }
        }
      })
    ])

    // Get the updated order with all items
    const updatedOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: {
          include: {
            menuItem: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        table: true,
        restaurant: {
          select: {
            name: true,
            phone: true,
            currency: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Items added to order successfully',
      order: updatedOrder
    }, { status: 200 })

  } catch (error) {
    console.error('Error adding items to order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
