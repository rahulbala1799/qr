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

    // Transform data to show complete orders with their items (ORDER-BASED DISPLAY)
    const kitchenOrders = filteredOrders.map(order => {
      // Filter out delivered items from kitchen display
      const activeItems = order.orderItems.filter(item => item.status !== OrderStatus.DELIVERED)
      
      // Calculate order completion metrics
      const totalItems = activeItems.length
      const completedItems = activeItems.filter(item => item.status === OrderStatus.READY).length
      const preparingItems = activeItems.filter(item => item.status === OrderStatus.PREPARING).length
      const pendingItems = activeItems.filter(item => item.status === OrderStatus.PENDING).length
      
      // Determine if order is complete (all items ready) - will be removed from display
      const isOrderComplete = totalItems > 0 && completedItems === totalItems
      
      // Calculate total batches for this order
      const totalBatches = Math.max(...order.orderItems.map(oi => oi.addedInBatch), 1)
      
      // Group items by batch for better kitchen organization
      const itemsByBatch: Record<number, any[]> = {}
      activeItems.forEach(item => {
        const batchNum = item.addedInBatch
        if (!itemsByBatch[batchNum]) {
          itemsByBatch[batchNum] = []
        }
        itemsByBatch[batchNum].push({
          ...item,
          batch: {
            number: item.addedInBatch,
            isOriginal: item.addedInBatch === 1,
            isNewAddition: item.addedInBatch > 1
          }
        })
      })

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        tableNumber: order.table?.tableNumber || 'Unknown',
        isReopened: order.status === OrderStatus.REOPENED,
        totalBatches,
        
        // Order completion metrics
        totalItems,
        completedItems,
        preparingItems,
        pendingItems,
        isOrderComplete,
        completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        
        // Items grouped by batch for kitchen display
        itemsByBatch,
        
        // All active items (for easy access)
        items: activeItems.map(item => ({
          ...item,
          batch: {
            number: item.addedInBatch,
            isOriginal: item.addedInBatch === 1,
            isNewAddition: item.addedInBatch > 1
          }
        })),

        // Time-based priority calculation
        orderAge: Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)), // minutes
        priority: order.status === OrderStatus.REOPENED ? 'HIGH' : 
                 Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)) > 30 ? 'URGENT' : 'NORMAL'
      }
    })

    // 🚀 FILTER OUT COMPLETED ORDERS (they disappear from kitchen display when all items are ready)
    const activeKitchenOrders = kitchenOrders.filter(order => !order.isOrderComplete)

    // 🕐 TIME-BASED ORDERING: FIFO with priority for reopened orders
    activeKitchenOrders.sort((a, b) => {
      // First: REOPENED orders get highest priority
      if (a.isReopened && !b.isReopened) return -1
      if (!a.isReopened && b.isReopened) return 1
      
      // Then: By order creation time (FIFO - oldest orders first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    // Calculate summary statistics
    const totalActiveItems = activeKitchenOrders.reduce((sum, order) => sum + order.totalItems, 0)
    const totalPendingItems = activeKitchenOrders.reduce((sum, order) => sum + order.pendingItems, 0)
    const totalPreparingItems = activeKitchenOrders.reduce((sum, order) => sum + order.preparingItems, 0)
    const totalReadyItems = activeKitchenOrders.reduce((sum, order) => sum + order.completedItems, 0)

    return NextResponse.json({
      orders: activeKitchenOrders, // ORDER-BASED DISPLAY (not individual items)
      summary: {
        totalActiveOrders: activeKitchenOrders.length,
        totalActiveItems,
        totalPendingItems,
        totalPreparingItems,
        totalReadyItems,
        urgentOrders: activeKitchenOrders.filter(order => order.priority === 'URGENT').length,
        reopenedOrders: activeKitchenOrders.filter(order => order.isReopened).length
      }
    })

  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
