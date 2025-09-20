import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

// POST /api/orders/[id]/add-items - Intelligent order reopening and item addition
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

    // Get the existing order with all items
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        restaurant: true,
        table: true,
        orderItems: {
          include: { menuItem: true },
          orderBy: { createdAt: 'asc' }
        }
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

    // 🧠 INTELLIGENT ORDER STATE ANALYSIS
    const currentOrderStatus = existingOrder.status
    // const existingItemStatuses = existingOrder.orderItems.map(item => item.status)
    
    // Determine the next batch number for new items
    const maxBatch = Math.max(...existingOrder.orderItems.map(item => item.addedInBatch), 0)
    const nextBatch = maxBatch + 1

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
        status: OrderStatus.PENDING, // New items always start as PENDING
        addedInBatch: nextBatch, // Track which batch this item belongs to
        menuItemId: item.menuItemId,
        orderId: params.id
      })
    }

    // 🚀 INTELLIGENT ORDER STATUS DETERMINATION
    let newOrderStatus: OrderStatus
    let statusReason: string

    if (currentOrderStatus === OrderStatus.DELIVERED) {
      // Order was completed, now reopened with new items
      newOrderStatus = OrderStatus.REOPENED
      statusReason = `Order reopened with ${items.length} new items`
    } else if (currentOrderStatus === OrderStatus.CANCELLED) {
      // Cannot add items to cancelled order
      return NextResponse.json(
        { error: 'Cannot add items to a cancelled order' },
        { status: 400 }
      )
    } else {
      // Order is still active (PENDING, CONFIRMED, PREPARING, READY)
      // Keep current status but items will have mixed states
      newOrderStatus = currentOrderStatus
      statusReason = `${items.length} new items added to active order`
    }

    // 💾 DATABASE TRANSACTION - Add items and update order
    await prisma.$transaction([
      // Create new order items with batch tracking
      prisma.orderItem.createMany({
        data: newOrderItems
      }),
      // Update order with new status and total amount
      prisma.order.update({
        where: { id: params.id },
        data: {
          status: newOrderStatus,
          totalAmount: {
            increment: additionalAmount
          }
        }
      })
    ])

    // Get the fully updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: {
          include: { menuItem: true },
          orderBy: [
            { addedInBatch: 'asc' }, // Group by batch
            { createdAt: 'asc' }     // Then by creation time
          ]
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

    // 📊 ANALYTICS - Count items by batch and status
    const itemsByBatch = updatedOrder?.orderItems.reduce((acc, item) => {
      const batch = item.addedInBatch
      if (!acc[batch]) acc[batch] = { total: 0, statuses: {} }
      acc[batch].total++
      acc[batch].statuses[item.status] = (acc[batch].statuses[item.status] || 0) + 1
      return acc
    }, {} as Record<number, { total: number, statuses: Record<string, number> }>)

    return NextResponse.json({
      message: statusReason,
      order: updatedOrder,
      reopening: {
        wasReopened: currentOrderStatus === OrderStatus.DELIVERED,
        previousStatus: currentOrderStatus,
        newStatus: newOrderStatus,
        newItemsBatch: nextBatch,
        itemsByBatch,
        totalBatches: nextBatch
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error in intelligent order addition:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
