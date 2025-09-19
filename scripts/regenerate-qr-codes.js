const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Current production URL
const PRODUCTION_URL = 'https://qr-7dkji49l3-rahulbala1799s-projects.vercel.app'

async function regenerateQRCodes() {
  try {
    console.log('Regenerating QR codes for all tables...')
    
    // Get all tables
    const tables = await prisma.table.findMany({
      include: {
        restaurant: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`Found ${tables.length} tables to update`)

    for (const table of tables) {
      // Update the QR code URL in the database
      const qrCodeUrl = `${PRODUCTION_URL}/order/${table.restaurantId}/${table.id}`
      
      await prisma.table.update({
        where: { id: table.id },
        data: {
          qrCode: qrCodeUrl
        }
      })

      console.log(`✓ Updated QR code for Table ${table.tableNumber} at ${table.restaurant.name}`)
      console.log(`  URL: ${qrCodeUrl}`)
    }

    console.log('✅ All QR codes have been updated!')
    console.log(`🌐 New production URL: ${PRODUCTION_URL}`)

  } catch (error) {
    console.error('Error regenerating QR codes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
regenerateQRCodes()
