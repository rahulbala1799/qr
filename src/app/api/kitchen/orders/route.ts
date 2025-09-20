import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

// GET /api/kitchen/orders - Get all orders for kitchen management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    // Build where clause - Include REOPENED orders for kitchen attention
    const whereClause: any = {
      restaurantId: session.user.id,
      status: {
        notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] // Include REOPENED orders
      }
    }

    if (status && status !== 'all') {
      whereClause.status = status
    }

    // Get orders with detailed item information
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                price: true
              }
            }
          },
          orderBy: [
            { addedInBatch: 'asc' }, // Group by batch (original items first)
            { status: 'asc' },       // Then by status (pending first)
            { createdAt: 'asc' }     // Finally by creation time
          ]
        },
        table: {
          select: {
            id: true,
            tableNumber: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },    // REOPENED orders get priority
        { createdAt: 'asc' }  // Then oldest orders first (FIFO)
      ]
    })

    // Filter by category if specified
    let filteredOrders = orders
    if (category && category !== 'all') {
      filteredOrders = orders.map(order => ({
        ...order,
        orderItems: order.orderItems.filter(item => 
          item.menuItem.category.toLowerCase() === category.toLowerCase()
        )
      })).filter(order => order.orderItems.length > 0)
    }

    // Group items by category for better kitchen organization
    const itemsByCategory: Record<string, any[]> = {}
    const allItems: any[] = []

    filteredOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const category = item.menuItem.category
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = []
        }

        const enrichedItem = {
          ...item,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            tableNumber: order.table.tableNumber,
            createdAt: order.createdAt,
            orderStatus: order.status,
            isReopened: order.status === OrderStatus.REOPENED,
            totalBatches: Math.max(...order.orderItems.map(oi => oi.addedInBatch))
          },
          batch: {
            number: item.addedInBatch,
            isOriginal: item.addedInBatch === 1,
            isNewAddition: item.addedInBatch > 1
          }
        }

        itemsByCategory[category].push(enrichedItem)
        allItems.push(enrichedItem)
      })
    })

    // Get category statistics
    const categoryStats = Object.keys(itemsByCategory).map(cat => ({
      category: cat,
      totalItems: itemsByCategory[cat].length,
      pendingItems: itemsByCategory[cat].filter(item => item.status === 'PENDING').length,
      preparingItems: itemsByCategory[cat].filter(item => item.status === 'PREPARING').length,
      readyItems: itemsByCategory[cat].filter(item => item.status === 'READY').length
    }))

    return NextResponse.json({
      orders: filteredOrders,
      itemsByCategory,
      allItems,
      categoryStats,
      totalOrders: filteredOrders.length,
      totalItems: allItems.length,
      pendingItems: allItems.filter(item => item.status === 'PENDING').length,
      preparingItems: allItems.filter(item => item.status === 'PREPARING').length,
      readyItems: allItems.filter(item => item.status === 'READY').length
    })

  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
