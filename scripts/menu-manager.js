const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Menu templates for different types of restaurants
const menuTemplates = {
  irish: [
    // Starters
    { name: "Irish Smoked Salmon", description: "Fresh Irish smoked salmon served with brown bread, capers, and lemon", price: 12.95, category: "Starters" },
    { name: "Traditional Irish Stew", description: "Hearty lamb stew with root vegetables and fresh herbs", price: 8.95, category: "Starters" },
    { name: "Dublin Bay Prawns", description: "Fresh Dublin Bay prawns with garlic butter and lemon", price: 14.95, category: "Starters" },
    { name: "Black Pudding", description: "Traditional Irish black pudding with apple compote", price: 7.95, category: "Starters" },
    
    // Main Courses
    { name: "Fish and Chips", description: "Fresh cod in crispy batter with hand-cut chips and mushy peas", price: 16.95, category: "Main Courses" },
    { name: "Irish Beef and Guinness Pie", description: "Rich beef and Guinness pie with flaky pastry and seasonal vegetables", price: 18.95, category: "Main Courses" },
    { name: "Roast Irish Lamb", description: "Tender Irish lamb with rosemary, roasted potatoes, and mint sauce", price: 22.95, category: "Main Courses" },
    { name: "Seafood Chowder", description: "Creamy chowder with fresh fish, mussels, and Dublin Bay prawns", price: 15.95, category: "Main Courses" },
    { name: "Bangers and Mash", description: "Traditional Irish sausages with creamy mashed potatoes and onion gravy", price: 14.95, category: "Main Courses" },
    { name: "Chicken and Ham Pie", description: "Succulent chicken and ham in rich sauce with golden pastry", price: 17.95, category: "Main Courses" },
    
    // Vegetarian
    { name: "Vegetarian Irish Stew", description: "Hearty vegetable stew with barley and fresh herbs", price: 13.95, category: "Vegetarian" },
    { name: "Mushroom and Leek Pie", description: "Wild mushrooms and leeks in creamy sauce with puff pastry", price: 15.95, category: "Vegetarian" },
    { name: "Roasted Vegetable Platter", description: "Seasonal roasted vegetables with herb oil and Irish cheese", price: 14.95, category: "Vegetarian" },
    
    // Desserts
    { name: "Irish Apple Crumble", description: "Traditional apple crumble with custard and fresh cream", price: 6.95, category: "Desserts" },
    { name: "Baileys Cheesecake", description: "Rich Baileys cheesecake with chocolate sauce", price: 7.95, category: "Desserts" },
    { name: "Sticky Toffee Pudding", description: "Warm sticky toffee pudding with vanilla ice cream", price: 6.95, category: "Desserts" },
    { name: "Irish Coffee", description: "Traditional Irish coffee with whiskey and cream", price: 8.95, category: "Desserts" },
    
    // Beverages
    { name: "Guinness", description: "Pint of the black stuff - Ireland's most famous export", price: 5.95, category: "Beverages" },
    { name: "Irish Whiskey", description: "Selection of premium Irish whiskeys", price: 12.95, category: "Beverages" },
    { name: "Fresh Orange Juice", description: "Freshly squeezed orange juice", price: 3.95, category: "Beverages" },
    { name: "Tea and Coffee", description: "Selection of teas and freshly brewed coffee", price: 2.95, category: "Beverages" }
  ],

  italian: [
    // Appetizers
    { name: "Bruschetta", description: "Toasted bread with fresh tomatoes, basil, and garlic", price: 8.95, category: "Appetizers" },
    { name: "Antipasto Platter", description: "Selection of Italian cured meats, cheeses, and olives", price: 16.95, category: "Appetizers" },
    { name: "Calamari Fritti", description: "Crispy fried squid rings with marinara sauce", price: 12.95, category: "Appetizers" },
    
    // Pasta
    { name: "Spaghetti Carbonara", description: "Classic Roman pasta with eggs, cheese, and pancetta", price: 15.95, category: "Pasta" },
    { name: "Penne Arrabbiata", description: "Spicy tomato sauce with garlic and red peppers", price: 13.95, category: "Pasta" },
    { name: "Fettuccine Alfredo", description: "Creamy pasta with parmesan cheese and butter", price: 14.95, category: "Pasta" },
    { name: "Lasagna", description: "Layered pasta with meat sauce, cheese, and béchamel", price: 16.95, category: "Pasta" },
    
    // Pizza
    { name: "Margherita Pizza", description: "Classic pizza with tomato, mozzarella, and basil", price: 12.95, category: "Pizza" },
    { name: "Pepperoni Pizza", description: "Spicy pepperoni with mozzarella and tomato sauce", price: 14.95, category: "Pizza" },
    { name: "Quattro Stagioni", description: "Four seasons pizza with artichokes, mushrooms, ham, and olives", price: 16.95, category: "Pizza" },
    
    // Main Courses
    { name: "Chicken Parmigiana", description: "Breaded chicken breast with marinara and mozzarella", price: 18.95, category: "Main Courses" },
    { name: "Osso Buco", description: "Braised veal shanks with risotto milanese", price: 24.95, category: "Main Courses" },
    { name: "Saltimbocca", description: "Veal with prosciutto and sage in white wine sauce", price: 22.95, category: "Main Courses" },
    
    // Desserts
    { name: "Tiramisu", description: "Classic Italian dessert with coffee and mascarpone", price: 7.95, category: "Desserts" },
    { name: "Gelato", description: "Selection of Italian ice cream flavors", price: 5.95, category: "Desserts" },
    { name: "Cannoli", description: "Crispy pastry shells filled with sweet ricotta", price: 6.95, category: "Desserts" }
  ],

  american: [
    // Appetizers
    { name: "Buffalo Wings", description: "Spicy chicken wings with blue cheese dip", price: 10.95, category: "Appetizers" },
    { name: "Nachos Supreme", description: "Loaded nachos with cheese, jalapeños, and sour cream", price: 12.95, category: "Appetizers" },
    { name: "Mozzarella Sticks", description: "Breaded mozzarella with marinara sauce", price: 8.95, category: "Appetizers" },
    
    // Burgers
    { name: "Classic Cheeseburger", description: "Beef patty with cheese, lettuce, tomato, and onion", price: 13.95, category: "Burgers" },
    { name: "BBQ Bacon Burger", description: "Beef patty with bacon, BBQ sauce, and cheddar", price: 15.95, category: "Burgers" },
    { name: "Veggie Burger", description: "Plant-based patty with all the fixings", price: 12.95, category: "Burgers" },
    
    // Main Courses
    { name: "Ribeye Steak", description: "12oz ribeye steak with mashed potatoes and vegetables", price: 28.95, category: "Main Courses" },
    { name: "BBQ Ribs", description: "Fall-off-the-bone ribs with BBQ sauce and coleslaw", price: 22.95, category: "Main Courses" },
    { name: "Fried Chicken", description: "Crispy fried chicken with biscuits and gravy", price: 16.95, category: "Main Courses" },
    
    // Desserts
    { name: "Chocolate Brownie", description: "Warm chocolate brownie with vanilla ice cream", price: 6.95, category: "Desserts" },
    { name: "Apple Pie", description: "Classic American apple pie with cinnamon", price: 5.95, category: "Desserts" },
    { name: "Milkshake", description: "Thick vanilla, chocolate, or strawberry milkshake", price: 4.95, category: "Desserts" }
  ]
}

async function addMenuToRestaurant(restaurantId, menuType = 'irish', publish = true) {
  try {
    console.log(`Adding ${menuType} menu to restaurant ID: ${restaurantId}`)
    
    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    })

    if (!restaurant) {
      console.error(`Restaurant with ID ${restaurantId} not found!`)
      return false
    }

    console.log(`Found restaurant: ${restaurant.name}`)

    // Get menu items for the specified type
    const menuItems = menuTemplates[menuType]
    if (!menuItems) {
      console.error(`Menu type '${menuType}' not found. Available types: ${Object.keys(menuTemplates).join(', ')}`)
      return false
    }

    // Clear existing menu items for this restaurant
    console.log('Clearing existing menu items...')
    await prisma.menuItem.deleteMany({
      where: { restaurantId: restaurantId }
    })

    // Add new menu items
    console.log(`Adding ${menuItems.length} menu items...`)
    
    for (const item of menuItems) {
      const menuItem = await prisma.menuItem.create({
        data: {
          ...item,
          restaurantId: restaurantId,
          isAvailable: true,
          image: null
        }
      })
      console.log(`✓ Added: ${menuItem.name} - €${menuItem.price}`)
    }

    // Publish the menu if requested
    if (publish) {
      console.log('Publishing menu...')
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { isPublished: true }
      })
    }

    console.log('✅ Menu successfully added!')
    if (publish) {
      console.log('✅ Menu published!')
    }
    console.log(`🌐 Public menu URL: https://qr-ivn57g0gh-rahulbala1799s-projects.vercel.app/menu/${restaurantId}`)

    return true

  } catch (error) {
    console.error('Error adding menu items:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.log('Usage: node menu-manager.js <restaurant-id> [menu-type] [publish]')
    console.log('Menu types: irish, italian, american')
    console.log('Publish: true/false (default: true)')
    console.log('')
    console.log('Examples:')
    console.log('  node menu-manager.js cmfqyolxc0000i904t9o3vrb4 irish true')
    console.log('  node menu-manager.js cmfqyolxc0000i904t9o3vrb4 italian false')
    return
  }

  const restaurantId = args[0]
  const menuType = args[1] || 'irish'
  const publish = args[2] !== 'false'

  await addMenuToRestaurant(restaurantId, menuType, publish)
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { addMenuToRestaurant, menuTemplates }
