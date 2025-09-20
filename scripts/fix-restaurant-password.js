const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function fixRestaurantPassword() {
  try {
    console.log('🔄 Fixing restaurant password...')
    
    // Find the restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { email: 'rahulbala1799@gmail.com' }
    })
    
    if (!restaurant) {
      console.error('❌ Restaurant not found with email: rahulbala1799@gmail.com')
      return
    }
    
    console.log(`🏪 Found restaurant: ${restaurant.name}`)
    
    // Hash the password "password"
    const hashedPassword = await bcrypt.hash('password', 10)
    
    // Update the password
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { password: hashedPassword }
    })
    
    console.log('✅ Password updated successfully!')
    console.log('🔐 Login credentials:')
    console.log('   Email: rahulbala1799@gmail.com')
    console.log('   Password: password')
    
  } catch (error) {
    console.error('❌ Error fixing password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixRestaurantPassword()
