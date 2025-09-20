import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 REPORTS API DEBUG:')
    console.log('Session:', session?.user?.id ? `User ID: ${session.user.id}` : 'No session')
    
    if (!session?.user?.id) {
      console.log('❌ No session - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const reportType = searchParams.get('type') || 'overview'

    const restaurantId = session.user.id

    // Default to last 30 days if no date range provided
    const now = new Date()
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const defaultEndDate = now

    const dateFilter = {
      gte: startDate ? new Date(startDate) : defaultStartDate,
      lte: endDate ? new Date(endDate) : defaultEndDate
    }

    console.log('📅 Date filter:', {
      startDate: startDate || 'default',
      endDate: endDate || 'default',
      actualStart: dateFilter.gte.toISOString(),
      actualEnd: dateFilter.lte.toISOString()
    })
    console.log('🏪 Restaurant ID:', restaurantId)

    // Get restaurant info
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        isPublished: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Base queries for the date range
    const ordersInRange = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: dateFilter
      },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        },
        table: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('📦 Orders found:', ordersInRange.length)
    
    // Calculate comprehensive metrics
    const totalOrders = ordersInRange.length
    const totalRevenue = ordersInRange.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    console.log('📊 Calculated metrics:', {
      totalOrders,
      totalRevenue,
      averageOrderValue
    })

    // Order status breakdown
    const ordersByStatus = ordersInRange.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Daily revenue breakdown
    const dailyRevenue = ordersInRange.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + Number(order.totalAmount)
      return acc
    }, {} as Record<string, number>)

    // Hourly order distribution
    const hourlyOrders = ordersInRange.reduce((acc, order) => {
      const hour = order.createdAt.getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // Top menu items by quantity and revenue
    const menuItemStats = ordersInRange.flatMap(order => order.orderItems).reduce((acc, item) => {
      const menuItemId = item.menuItemId
      if (!acc[menuItemId]) {
        acc[menuItemId] = {
          id: menuItemId,
          name: item.menuItem.name,
          category: item.menuItem.category,
          quantity: 0,
          revenue: 0,
          orders: new Set()
        }
      }
      acc[menuItemId].quantity += item.quantity
      acc[menuItemId].revenue += Number(item.price) * item.quantity
      acc[menuItemId].orders.add(item.orderId)
      return acc
    }, {} as Record<string, any>)

    const topMenuItems = Object.values(menuItemStats)
      .map((item: any) => ({
        ...item,
        orders: item.orders.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Table performance
    const tableStats = ordersInRange.reduce((acc, order) => {
      const tableId = order.tableId
      if (!acc[tableId]) {
        acc[tableId] = {
          tableId,
          tableNumber: order.table?.tableNumber || 'Unknown',
          orders: 0,
          revenue: 0,
          averageOrderValue: 0
        }
      }
      acc[tableId].orders += 1
      acc[tableId].revenue += Number(order.totalAmount)
      acc[tableId].averageOrderValue = acc[tableId].revenue / acc[tableId].orders
      return acc
    }, {} as Record<string, any>)

    const topTables = Object.values(tableStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)

    // Category performance
    const categoryStats = ordersInRange.flatMap(order => order.orderItems).reduce((acc, item) => {
      const category = item.menuItem.category
      if (!acc[category]) {
        acc[category] = {
          category,
          quantity: 0,
          revenue: 0,
          orders: new Set()
        }
      }
      acc[category].quantity += item.quantity
      acc[category].revenue += Number(item.price) * item.quantity
      acc[category].orders.add(item.orderId)
      return acc
    }, {} as Record<string, any>)

    const categoryPerformance = Object.values(categoryStats)
      .map((cat: any) => ({
        ...cat,
        orders: cat.orders.size
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Customer behavior metrics
    const uniqueCustomers = new Set(ordersInRange.map(order => order.tableId)).size
    const repeatCustomers = ordersInRange.reduce((acc, order) => {
      acc[order.tableId] = (acc[order.tableId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const repeatCustomerCount = Object.values(repeatCustomers).filter(count => count > 1).length
    const customerRetentionRate = uniqueCustomers > 0 ? (repeatCustomerCount / uniqueCustomers) * 100 : 0

    // Peak hours analysis
    const peakHours = Object.entries(hourlyOrders)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, orders]) => ({ hour: parseInt(hour), orders }))

    // Order completion metrics
    const completedOrders = ordersInRange.filter(order => order.status === OrderStatus.DELIVERED).length
    const cancelledOrders = ordersInRange.filter(order => order.status === OrderStatus.CANCELLED).length
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0

    // Average preparation time (for completed orders)
    const completedOrdersWithTimes = ordersInRange
      .filter(order => order.status === OrderStatus.DELIVERED && order.updatedAt)
      .map(order => {
        const prepTime = (order.updatedAt!.getTime() - order.createdAt.getTime()) / (1000 * 60) // minutes
        return prepTime
      })

    const averagePrepTime = completedOrdersWithTimes.length > 0 
      ? completedOrdersWithTimes.reduce((sum, time) => sum + time, 0) / completedOrdersWithTimes.length 
      : 0

    // Growth metrics (compare with previous period)
    const periodLength = dateFilter.lte.getTime() - dateFilter.gte.getTime()
    const previousPeriodStart = new Date(dateFilter.gte.getTime() - periodLength)
    const previousPeriodEnd = dateFilter.gte

    const previousPeriodOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    })

    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const orderGrowth = previousPeriodOrders.length > 0 ? ((totalOrders - previousPeriodOrders.length) / previousPeriodOrders.length) * 100 : 0

    // Additional business metrics
    const totalTables = await prisma.table.count({ where: { restaurantId } })
    const activeTables = await prisma.table.count({ where: { restaurantId, isActive: true } })
    const totalMenuItems = await prisma.menuItem.count({ where: { restaurantId } })
    const activeMenuItems = await prisma.menuItem.count({ where: { restaurantId, isAvailable: true } })

    // Return comprehensive report
    return NextResponse.json({
      restaurant,
      dateRange: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte
      },
      overview: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        uniqueCustomers,
        repeatCustomers: repeatCustomerCount,
        customerRetentionRate,
        completionRate,
        cancellationRate,
        averagePrepTime,
        revenueGrowth,
        orderGrowth
      },
      orderMetrics: {
        ordersByStatus,
        dailyRevenue,
        hourlyOrders,
        peakHours,
        completedOrders,
        cancelledOrders
      },
      menuPerformance: {
        topMenuItems,
        categoryPerformance,
        totalMenuItems,
        activeMenuItems
      },
      tablePerformance: {
        topTables,
        totalTables,
        activeTables
      },
      trends: {
        dailyRevenue,
        hourlyDistribution: hourlyOrders
      },
      businessMetrics: {
        averageOrderValue,
        customerRetentionRate,
        averagePrepTime,
        revenueGrowth,
        orderGrowth
      }
    })

  } catch (error) {
    console.error('Error generating reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
