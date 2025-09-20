const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function restoreRestaurantsAndMenus() {
  try {
    console.log('🔄 Starting restore of restaurants and menus...')
    
    // Read backup file
    const backupPath = path.join(process.cwd(), 'backup-restaurants-menus.json')
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath)
      process.exit(1)
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    console.log(`📊 Found backup from ${backupData.timestamp}`)
    console.log(`📊 Restoring ${backupData.restaurants.length} restaurants...`)
    
    for (const restaurantData of backupData.restaurants) {
      console.log(`🏪 Restoring restaurant: ${restaurantData.name}`)
      
      // Create restaurant (keep existing password hash if available, otherwise create new)
      const restaurant = await prisma.restaurant.create({
        data: {
          email: restaurantData.email,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Default password hash for "password"
          name: restaurantData.name,
          description: restaurantData.description,
          address: restaurantData.address,
          phone: restaurantData.phone,
          website: restaurantData.website,
          logo: restaurantData.logo,
          currency: restaurantData.currency || '€',
          isActive: restaurantData.isActive,
          isPublished: restaurantData.isPublished
        }
      })
      
      console.log(`   ✅ Created restaurant: ${restaurant.name} (ID: ${restaurant.id})`)
      
      // Create menu items
      if (restaurantData.menuItems && restaurantData.menuItems.length > 0) {
        const menuItems = await prisma.menuItem.createMany({
          data: restaurantData.menuItems.map(item => ({
            name: item.name,
            description: item.description,
            price: parseFloat(item.price),
            category: item.category,
            image: item.image,
            isAvailable: item.isAvailable,
            restaurantId: restaurant.id
          }))
        })
        
        console.log(`   ✅ Created ${menuItems.count} menu items`)
      }
      
      // Create tables
      if (restaurantData.tables && restaurantData.tables.length > 0) {
        const tables = await prisma.table.createMany({
          data: restaurantData.tables.map(table => ({
            tableNumber: table.tableNumber,
            qrCode: `${restaurant.id}-table-${table.tableNumber}-${Date.now()}`,
            isActive: table.isActive,
            restaurantId: restaurant.id
          }))
        })
        
        console.log(`   ✅ Created ${tables.count} tables`)
      }
    }
    
    console.log('✅ Restore completed successfully!')
    console.log('🔐 Default login credentials:')
    console.log('   Email: (use existing restaurant email)')
    console.log('   Password: password')
    
  } catch (error) {
    console.error('❌ Error during restore:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

restoreRestaurantsAndMenus()
