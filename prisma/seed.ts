import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo restaurant (idempotent - only create if doesn't exist)
  const demoEmail = 'demo@restaurant.com'
  const existingRestaurant = await prisma.restaurant.findUnique({
    where: { email: demoEmail }
  })

  if (!existingRestaurant) {
    const hashedPassword = await bcrypt.hash('demo123', 10)
    
    const restaurant = await prisma.restaurant.create({
      data: {
        email: demoEmail,
        password: hashedPassword,
        name: 'Demo Restaurant',
        description: 'A demo restaurant for testing the QR ordering system',
        address: '123 Demo Street, Demo City, DC 12345',
        phone: '+1 (555) 123-4567',
        website: 'https://demo-restaurant.com',
        currency: '€',
        isActive: true,
        isPublished: true,
      }
    })

    console.log('✅ Created demo restaurant:', restaurant.name)

    // Create demo menu items
    const menuCategories = [
      {
        category: 'Appetizers',
        items: [
          { name: 'Garlic Bread', description: 'Crispy bread with garlic butter', price: 6.50 },
          { name: 'Caesar Salad', description: 'Fresh romaine with caesar dressing', price: 8.90 },
          { name: 'Buffalo Wings', description: 'Spicy chicken wings with blue cheese', price: 12.50 }
        ]
      },
      {
        category: 'Pizza',
        items: [
          { name: 'Margherita Pizza', description: 'Fresh tomato, mozzarella, and basil', price: 14.90 },
          { name: 'Pepperoni Pizza', description: 'Classic pepperoni with mozzarella', price: 16.90 },
          { name: 'Supreme Pizza', description: 'Pepperoni, mushrooms, peppers, onions', price: 19.90 }
        ]
      },
      {
        category: 'Burgers',
        items: [
          { name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, onion', price: 13.50 },
          { name: 'Cheeseburger', description: 'Classic burger with melted cheese', price: 14.90 },
          { name: 'BBQ Bacon Burger', description: 'BBQ sauce, bacon, onion rings', price: 17.50 }
        ]
      },
      {
        category: 'Desserts',
        items: [
          { name: 'Chocolate Cake', description: 'Rich chocolate cake with frosting', price: 7.50 },
          { name: 'Tiramisu', description: 'Italian coffee-flavored dessert', price: 8.90 },
          { name: 'Ice Cream', description: 'Vanilla, chocolate, or strawberry', price: 5.50 }
        ]
      }
    ]

    for (const categoryData of menuCategories) {
      for (const item of categoryData.items) {
        await prisma.menuItem.create({
          data: {
            name: item.name,
            description: item.description,
            price: item.price,
            category: categoryData.category,
            isAvailable: true,
            restaurantId: restaurant.id
          }
        })
      }
    }

    console.log('✅ Created demo menu items')

    // Create demo tables
    const tableNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    
    for (const tableNumber of tableNumbers) {
      await prisma.table.create({
        data: {
          tableNumber,
          qrCode: `QR-${restaurant.id}-TABLE-${tableNumber}`,
          isActive: true,
          restaurantId: restaurant.id
        }
      })
    }

    console.log('✅ Created demo tables')
    console.log('')
    console.log('🎉 Seed completed successfully!')
    console.log('📧 Demo restaurant email: demo@restaurant.com')
    console.log('🔑 Demo restaurant password: demo123')
    console.log('')
  } else {
    console.log('ℹ️  Demo restaurant already exists, skipping seed')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
