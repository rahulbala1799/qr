const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupRestaurantsAndMenus() {
  try {
    console.log('🔄 Starting backup of restaurants and menus...')
    
    // Fetch all restaurants with their menu items and tables
    const restaurants = await prisma.restaurant.findMany({
      include: {
        menuItems: true,
        tables: true
      }
    })

    console.log(`📊 Found ${restaurants.length} restaurants to backup`)
    
    // Create backup data structure
    const backupData = {
      timestamp: new Date().toISOString(),
      restaurants: restaurants.map(restaurant => ({
        // Restaurant data
        email: restaurant.email,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        logo: restaurant.logo,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
        isPublished: restaurant.isPublished,
        
        // Menu items
        menuItems: restaurant.menuItems.map(item => ({
          name: item.name,
          description: item.description,
          price: item.price.toString(), // Convert Decimal to string
          category: item.category,
          image: item.image,
          isAvailable: item.isAvailable
        })),
        
        // Tables
        tables: restaurant.tables.map(table => ({
          tableNumber: table.tableNumber,
          isActive: table.isActive
        }))
      }))
    }

    // Write backup to file
    const backupPath = path.join(process.cwd(), 'backup-restaurants-menus.json')
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))
    
    console.log(`✅ Backup completed successfully!`)
    console.log(`📁 Backup saved to: ${backupPath}`)
    console.log(`📊 Backed up:`)
    console.log(`   - ${restaurants.length} restaurants`)
    console.log(`   - ${backupData.restaurants.reduce((sum, r) => sum + r.menuItems.length, 0)} menu items`)
    console.log(`   - ${backupData.restaurants.reduce((sum, r) => sum + r.tables.length, 0)} tables`)
    
  } catch (error) {
    console.error('❌ Error during backup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backupRestaurantsAndMenus()
