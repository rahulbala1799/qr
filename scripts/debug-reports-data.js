const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugReportsData() {
  try {
    console.log('🔍 DEBUGGING REPORTS DATA...\n')

    // Check if we have a restaurant
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })
    console.log('📍 RESTAURANTS:', restaurants.length)
    restaurants.forEach(r => console.log(`  - ${r.name} (${r.email}) - ${r.id}`))

    if (restaurants.length === 0) {
      console.log('❌ No restaurants found! Reports will be empty.')
      return
    }

    const restaurantId = restaurants[0].id
    console.log(`\n🏪 USING RESTAURANT: ${restaurants[0].name} (${restaurantId})`)

    // Check orders for this restaurant
    const orders = await prisma.order.findMany({
      where: { restaurantId },
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

    console.log(`\n📦 ORDERS FOUND: ${orders.length}`)
    
    if (orders.length === 0) {
      console.log('❌ No orders found! This is why reports show 0.')
      console.log('💡 Try placing some test orders first.')
      return
    }

    // Show order details
    orders.slice(0, 3).forEach((order, index) => {
      console.log(`\n  📋 ORDER ${index + 1}:`)
      console.log(`    - ID: ${order.id}`)
      console.log(`    - Number: ${order.orderNumber}`)
      console.log(`    - Status: ${order.status}`)
      console.log(`    - Total: $${order.totalAmount}`)
      console.log(`    - Created: ${order.createdAt}`)
      console.log(`    - Table: ${order.table?.tableNumber || 'Unknown'}`)
      console.log(`    - Items: ${order.orderItems.length}`)
      order.orderItems.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.quantity}x ${item.menuItem.name} - $${item.price}`)
      })
    })

    // Calculate basic metrics
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0
    
    console.log(`\n📊 BASIC METRICS:`)
    console.log(`  - Total Orders: ${orders.length}`)
    console.log(`  - Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`  - Average Order Value: $${averageOrderValue.toFixed(2)}`)

    // Check date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart)
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekStart)
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthStart)

    console.log(`\n📅 DATE RANGE BREAKDOWN:`)
    console.log(`  - Today: ${todayOrders.length} orders`)
    console.log(`  - This Week: ${weekOrders.length} orders`)
    console.log(`  - This Month: ${monthOrders.length} orders`)

    // Check menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId },
      select: { id: true, name: true, category: true }
    })
    console.log(`\n🍽️ MENU ITEMS: ${menuItems.length}`)

    // Check tables
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      select: { id: true, tableNumber: true, isActive: true }
    })
    console.log(`🪑 TABLES: ${tables.length} (${tables.filter(t => t.isActive).length} active)`)

    console.log('\n✅ DEBUG COMPLETE!')

  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugReportsData()
