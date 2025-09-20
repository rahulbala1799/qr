const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkProductionData() {
  try {
    console.log('🔍 Checking production database contents...')
    
    // Check restaurants
    const restaurants = await prisma.restaurant.findMany({
      include: {
        menuItems: true,
        tables: true,
        _count: {
          select: {
            menuItems: true,
            tables: true,
            orders: true
          }
        }
      }
    })

    console.log(`\n📊 Database Status:`)
    console.log(`   - ${restaurants.length} restaurants found`)
    
    for (const restaurant of restaurants) {
      console.log(`\n🏪 Restaurant: ${restaurant.name}`)
      console.log(`   - Email: ${restaurant.email}`)
      console.log(`   - Active: ${restaurant.isActive}`)
      console.log(`   - Published: ${restaurant.isPublished}`)
      console.log(`   - Currency: ${restaurant.currency}`)
      console.log(`   - Menu Items: ${restaurant._count.menuItems}`)
      console.log(`   - Tables: ${restaurant._count.tables}`)
      console.log(`   - Orders: ${restaurant._count.orders}`)
      
      if (restaurant.tables.length > 0) {
        console.log(`   - Table Numbers: ${restaurant.tables.map(t => t.tableNumber).join(', ')}`)
      }
      
      if (restaurant.menuItems.length > 0) {
        const categories = [...new Set(restaurant.menuItems.map(item => item.category))]
        console.log(`   - Categories: ${categories.join(', ')}`)
      }
    }
    
    if (restaurants.length === 0) {
      console.log('\n❌ No restaurants found in production database!')
      console.log('   This explains why the online version appears empty.')
    } else {
      console.log('\n✅ Production database has data!')
      console.log('   If the online version appears empty, there might be a different issue.')
    }
    
  } catch (error) {
    console.error('❌ Error checking production data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductionData()
