import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

// PUT /api/orders/items/[itemId] - Update individual order item status
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, notes } = await request.json()
    const itemId = params.itemId

    // Validate status
    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Find the order item and verify it belongs to this restaurant
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          select: { restaurantId: true, id: true }
        },
        menuItem: {
          select: { name: true }
        }
      }
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    if (orderItem.order.restaurantId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the order item status
    const updatedOrderItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: status,
        notes: notes || orderItem.notes,
        updatedAt: new Date()
      },
      include: {
        menuItem: {
          select: { name: true }
        }
      }
    })

    // Check if all items in the order are ready/completed
    const allOrderItems = await prisma.orderItem.findMany({
      where: { orderId: orderItem.order.id },
      select: { status: true }
    })

    // Determine overall order status based on item statuses
    let newOrderStatus: OrderStatus | null = null
    const itemStatuses = allOrderItems.map(item => item.status)
    
    if (itemStatuses.every(s => s === 'DELIVERED')) {
      newOrderStatus = OrderStatus.DELIVERED
    } else if (itemStatuses.some(s => s === 'READY') && itemStatuses.every(s => ['READY', 'DELIVERED'].includes(s))) {
      newOrderStatus = OrderStatus.READY
    } else if (itemStatuses.some(s => s === 'PREPARING') && itemStatuses.every(s => ['PREPARING', 'READY', 'DELIVERED'].includes(s))) {
      newOrderStatus = OrderStatus.PREPARING
    } else if (itemStatuses.every(s => ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].includes(s))) {
      newOrderStatus = OrderStatus.CONFIRMED
    }

    // Update order status if needed
    if (newOrderStatus) {
      await prisma.order.update({
        where: { id: orderItem.order.id },
        data: { status: newOrderStatus }
      })
    }

    return NextResponse.json({
      message: 'Order item updated successfully',
      orderItem: updatedOrderItem,
      orderStatus: newOrderStatus
    })

  } catch (error) {
    console.error('Error updating order item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/orders/items/[itemId] - Get individual order item details
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.itemId

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        menuItem: {
          select: { 
            id: true,
            name: true, 
            description: true,
            category: true,
            price: true 
          }
        },
        order: {
          select: { 
            id: true,
            orderNumber: true,
            restaurantId: true,
            customerName: true,
            customerPhone: true,
            createdAt: true,
            table: {
              select: { tableNumber: true }
            }
          }
        }
      }
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    if (orderItem.order.restaurantId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ orderItem })

  } catch (error) {
    console.error('Error fetching order item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
