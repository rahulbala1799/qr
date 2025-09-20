const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testReportsAPI() {
  try {
    console.log('🧪 TESTING REPORTS API LOGIC...\n')

    const restaurantId = 'cmfsd7y0y0000rqr24yk3ax0y' // From debug output

    // Test the same logic as the API
    const now = new Date()
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const defaultEndDate = now

    console.log(`📅 DATE RANGE:`)
    console.log(`  Start: ${defaultStartDate.toISOString()}`)
    console.log(`  End: ${defaultEndDate.toISOString()}`)

    const dateFilter = {
      gte: defaultStartDate,
      lte: defaultEndDate
    }

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

    console.log(`\n🏪 RESTAURANT:`, restaurant)

    if (!restaurant) {
      console.log('❌ Restaurant not found!')
      return
    }

    // Base queries for the date range - EXACT SAME AS API
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

    console.log(`\n📦 ORDERS IN RANGE: ${ordersInRange.length}`)

    if (ordersInRange.length === 0) {
      console.log('❌ No orders found in date range! This is the problem.')
      
      // Check all orders without date filter
      const allOrders = await prisma.order.findMany({
        where: { restaurantId }
      })
      console.log(`📊 ALL ORDERS FOR RESTAURANT: ${allOrders.length}`)
      
      if (allOrders.length > 0) {
        console.log('🔍 SAMPLE ORDER DATES:')
        allOrders.slice(0, 3).forEach(order => {
          console.log(`  - ${order.createdAt.toISOString()} (${order.orderNumber})`)
        })
      }
      
      return
    }

    // Calculate comprehensive metrics - EXACT SAME AS API
    const totalOrders = ordersInRange.length
    const totalRevenue = ordersInRange.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    console.log(`\n📊 CALCULATED METRICS:`)
    console.log(`  - Total Orders: ${totalOrders}`)
    console.log(`  - Total Revenue: ${restaurant.currency}${totalRevenue.toFixed(2)}`)
    console.log(`  - Average Order Value: ${restaurant.currency}${averageOrderValue.toFixed(2)}`)

    // Order status breakdown
    const ordersByStatus = ordersInRange.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})

    console.log(`\n📈 ORDER STATUS BREAKDOWN:`)
    Object.entries(ordersByStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`)
    })

    // Daily revenue breakdown
    const dailyRevenue = ordersInRange.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + Number(order.totalAmount)
      return acc
    }, {})

    console.log(`\n📅 DAILY REVENUE:`)
    Object.entries(dailyRevenue).forEach(([date, revenue]) => {
      console.log(`  - ${date}: ${restaurant.currency}${Number(revenue).toFixed(2)}`)
    })

    console.log('\n✅ TEST COMPLETE - This should match the API!')

  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testReportsAPI()
