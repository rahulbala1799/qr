import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.id

    // Get current date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Parallel queries for better performance
    const [
      todayOrders,
      weekOrders,
      monthOrders,
      lastMonthOrders,
      totalTables,
      activeTables,
      totalMenuItems,
      activeMenuItems,
      recentOrders,
      topMenuItems,
      ordersByStatus,
      hourlyOrders,
      restaurant
    ] = await Promise.all([
      // Today's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart }
        },
        include: { orderItems: true }
      }),

      // Week's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: weekStart }
        },
        include: { orderItems: true }
      }),

      // Month's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: monthStart }
        },
        include: { orderItems: true }
      }),

      // Last month's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { 
            gte: lastMonthStart,
            lte: lastMonthEnd
          }
        },
        include: { orderItems: true }
      }),

      // Total tables
      prisma.table.count({
        where: { restaurantId }
      }),

      // Active tables
      prisma.table.count({
        where: { 
          restaurantId,
          isActive: true
        }
      }),

      // Total menu items
      prisma.menuItem.count({
        where: { restaurantId }
      }),

      // Active menu items
      prisma.menuItem.count({
        where: { 
          restaurantId,
          isAvailable: true
        }
      }),

      // Recent orders (last 10)
      prisma.order.findMany({
        where: { restaurantId },
        include: {
          orderItems: {
            include: { menuItem: true }
          },
          table: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Top menu items (by quantity sold this month)
      prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: {
          order: {
            restaurantId,
            createdAt: { gte: monthStart }
          }
        },
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      }),

      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        where: {
          restaurantId,
          createdAt: { gte: weekStart }
        },
        _count: true
      }),

      // Hourly orders for today
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart }
        },
        select: { createdAt: true, totalAmount: true }
      }),

      // Restaurant info
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          name: true,
          currency: true,
          isPublished: true,
          isActive: true
        }
      })
    ])

    // Calculate revenue metrics
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const weekRevenue = weekOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

    // Calculate growth percentages
    const monthGrowth = lastMonthRevenue > 0 
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : monthRevenue > 0 ? 100 : 0

    // Process hourly data for chart
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = hourlyOrders.filter(order => 
        new Date(order.createdAt).getHours() === hour
      )
      return {
        hour,
        orders: hourOrders.length,
        revenue: hourOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      }
    })

    // Get menu item details for top items
    const topMenuItemIds = topMenuItems.map(item => item.menuItemId)
    const menuItemDetails = await prisma.menuItem.findMany({
      where: { id: { in: topMenuItemIds } },
      select: { id: true, name: true, price: true }
    })

    const topMenuItemsWithDetails = topMenuItems.map(item => {
      const details = menuItemDetails.find(detail => detail.id === item.menuItemId)
      return {
        ...item,
        name: details?.name || 'Unknown Item',
        price: details?.price || 0
      }
    })

    // Calculate average order value
    const avgOrderValue = weekOrders.length > 0 
      ? weekRevenue / weekOrders.length 
      : 0

    return NextResponse.json({
      restaurant,
      metrics: {
        today: {
          orders: todayOrders.length,
          revenue: todayRevenue,
          items: todayOrders.reduce((sum, order) => sum + order.orderItems.length, 0)
        },
        week: {
          orders: weekOrders.length,
          revenue: weekRevenue,
          items: weekOrders.reduce((sum, order) => sum + order.orderItems.length, 0)
        },
        month: {
          orders: monthOrders.length,
          revenue: monthRevenue,
          items: monthOrders.reduce((sum, order) => sum + order.orderItems.length, 0),
          growth: monthGrowth
        },
        averageOrderValue: avgOrderValue
      },
      inventory: {
        totalTables,
        activeTables,
        totalMenuItems,
        activeMenuItems
      },
      charts: {
        hourlyOrders: hourlyData,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        topMenuItems: topMenuItemsWithDetails
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        itemCount: order.orderItems.length,
        tableNumber: order.table?.tableNumber || 'N/A',
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }))
    })

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
