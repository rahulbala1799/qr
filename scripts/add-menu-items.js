const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Restaurant ID provided by user
const RESTAURANT_ID = 'cmfqyolxc0000i904t9o3vrb4'

// Sample menu items based on typical Irish restaurant menu
const menuItems = [
  // Starters
  {
    name: "Irish Smoked Salmon",
    description: "Fresh Irish smoked salmon served with brown bread, capers, and lemon",
    price: 12.95,
    category: "Starters",
    image: null
  },
  {
    name: "Traditional Irish Stew",
    description: "Hearty lamb stew with root vegetables and fresh herbs",
    price: 8.95,
    category: "Starters",
    image: null
  },
  {
    name: "Dublin Bay Prawns",
    description: "Fresh Dublin Bay prawns with garlic butter and lemon",
    price: 14.95,
    category: "Starters",
    image: null
  },
  {
    name: "Black Pudding",
    description: "Traditional Irish black pudding with apple compote",
    price: 7.95,
    category: "Starters",
    image: null
  },

  // Main Courses
  {
    name: "Fish and Chips",
    description: "Fresh cod in crispy batter with hand-cut chips and mushy peas",
    price: 16.95,
    category: "Main Courses",
    image: null
  },
  {
    name: "Irish Beef and Guinness Pie",
    description: "Rich beef and Guinness pie with flaky pastry and seasonal vegetables",
    price: 18.95,
    category: "Main Courses",
    image: null
  },
  {
    name: "Roast Irish Lamb",
    description: "Tender Irish lamb with rosemary, roasted potatoes, and mint sauce",
    price: 22.95,
    category: "Main Courses",
    image: null
  },
  {
    name: "Seafood Chowder",
    description: "Creamy chowder with fresh fish, mussels, and Dublin Bay prawns",
    price: 15.95,
    category: "Main Courses",
    image: null
  },
  {
    name: "Bangers and Mash",
    description: "Traditional Irish sausages with creamy mashed potatoes and onion gravy",
    price: 14.95,
    category: "Main Courses",
    image: null
  },
  {
    name: "Chicken and Ham Pie",
    description: "Succulent chicken and ham in rich sauce with golden pastry",
    price: 17.95,
    category: "Main Courses",
    image: null
  },

  // Vegetarian Options
  {
    name: "Vegetarian Irish Stew",
    description: "Hearty vegetable stew with barley and fresh herbs",
    price: 13.95,
    category: "Vegetarian",
    image: null
  },
  {
    name: "Mushroom and Leek Pie",
    description: "Wild mushrooms and leeks in creamy sauce with puff pastry",
    price: 15.95,
    category: "Vegetarian",
    image: null
  },
  {
    name: "Roasted Vegetable Platter",
    description: "Seasonal roasted vegetables with herb oil and Irish cheese",
    price: 14.95,
    category: "Vegetarian",
    image: null
  },

  // Desserts
  {
    name: "Irish Apple Crumble",
    description: "Traditional apple crumble with custard and fresh cream",
    price: 6.95,
    category: "Desserts",
    image: null
  },
  {
    name: "Baileys Cheesecake",
    description: "Rich Baileys cheesecake with chocolate sauce",
    price: 7.95,
    category: "Desserts",
    image: null
  },
  {
    name: "Sticky Toffee Pudding",
    description: "Warm sticky toffee pudding with vanilla ice cream",
    price: 6.95,
    category: "Desserts",
    image: null
  },
  {
    name: "Irish Coffee",
    description: "Traditional Irish coffee with whiskey and cream",
    price: 8.95,
    category: "Desserts",
    image: null
  },

  // Beverages
  {
    name: "Guinness",
    description: "Pint of the black stuff - Ireland's most famous export",
    price: 5.95,
    category: "Beverages",
    image: null
  },
  {
    name: "Irish Whiskey",
    description: "Selection of premium Irish whiskeys",
    price: 12.95,
    category: "Beverages",
    image: null
  },
  {
    name: "Fresh Orange Juice",
    description: "Freshly squeezed orange juice",
    price: 3.95,
    category: "Beverages",
    image: null
  },
  {
    name: "Tea and Coffee",
    description: "Selection of teas and freshly brewed coffee",
    price: 2.95,
    category: "Beverages",
    image: null
  }
]

async function addMenuItems() {
  try {
    console.log(`Adding menu items for restaurant ID: ${RESTAURANT_ID}`)
    
    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID }
    })

    if (!restaurant) {
      console.error(`Restaurant with ID ${RESTAURANT_ID} not found!`)
      return
    }

    console.log(`Found restaurant: ${restaurant.name}`)

    // Clear existing menu items for this restaurant
    console.log('Clearing existing menu items...')
    await prisma.menuItem.deleteMany({
      where: { restaurantId: RESTAURANT_ID }
    })

    // Add new menu items
    console.log(`Adding ${menuItems.length} menu items...`)
    
    for (const item of menuItems) {
      const menuItem = await prisma.menuItem.create({
        data: {
          ...item,
          restaurantId: RESTAURANT_ID,
          isAvailable: true
        }
      })
      console.log(`✓ Added: ${menuItem.name} - €${menuItem.price}`)
    }

    // Publish the menu
    console.log('Publishing menu...')
    await prisma.restaurant.update({
      where: { id: RESTAURANT_ID },
      data: { isPublished: true }
    })

    console.log('✅ Menu successfully added and published!')
    console.log(`🌐 Public menu URL: https://qr-ivn57g0gh-rahulbala1799s-projects.vercel.app/menu/${RESTAURANT_ID}`)

  } catch (error) {
    console.error('Error adding menu items:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addMenuItems()
