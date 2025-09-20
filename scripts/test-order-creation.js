const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testOrderCreation() {
  try {
    console.log('🔄 Testing order creation...')
    
    // Get restaurant and table
    const restaurant = await prisma.restaurant.findFirst({
      where: { email: 'rahulbala1799@gmail.com' }
    })
    
    if (!restaurant) {
      console.error('❌ Restaurant not found')
      return
    }
    
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id }
    })
    
    if (!table) {
      console.error('❌ Table not found')
      return
    }
    
    // Get a menu item
    const menuItem = await prisma.menuItem.findFirst({
      where: { restaurantId: restaurant.id }
    })
    
    if (!menuItem) {
      console.error('❌ Menu item not found')
      return
    }
    
    console.log(`🏪 Restaurant: ${restaurant.name}`)
    console.log(`🪑 Table: ${table.tableNumber}`)
    console.log(`🍔 Menu Item: ${menuItem.name}`)
    
    // Test order creation
    const orderNumber = `TEST-${Date.now()}`
    const totalAmount = parseFloat(menuItem.price.toString())
    
    console.log('🔄 Creating test order...')
    
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        totalAmount,
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        notes: 'Test order',
        restaurantId: restaurant.id,
        tableId: table.id,
        orderItems: {
          create: [{
            quantity: 1,
            price: parseFloat(menuItem.price.toString()),
            notes: 'Test item',
            status: 'PENDING',
            menuItemId: menuItem.id
          }]
        }
      },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    })
    
    console.log('✅ Test order created successfully!')
    console.log(`📝 Order ID: ${order.id}`)
    console.log(`📝 Order Number: ${order.orderNumber}`)
    console.log(`💰 Total: €${order.totalAmount}`)
    
    // Clean up test order
    await prisma.order.delete({
      where: { id: order.id }
    })
    
    console.log('🧹 Test order cleaned up')
    
  } catch (error) {
    console.error('❌ Error testing order creation:', error)
    console.error('Error details:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testOrderCreation()
