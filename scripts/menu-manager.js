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
  ],

  fastfood: [
    // Starters
    { name: "Hotline Rings", description: "Golden fried, thick-cut Onion Rings. Contains Gluten (Wheat).", price: 6.50, category: "Starters" },
    { name: "Popcorn Chicken", description: "Pop it like it's hot. Contains Gluten (Wheat).", price: 7.50, category: "Starters" },
    { name: "Halloumi Lover", description: "Fried Halloumi Sticks with signature Toppings. Contains Dairy.", price: 7.50, category: "Starters" },
    { name: "Sliders", description: "3 Mini Beef Patties topped with crispy Onions, Cheese & Pickles on toasted Mini Buns. Contains Gluten (Wheat), Eggs, Milk", price: 8.50, category: "Starters" },
    { name: "Love Me Tenders", description: "Fresh Chicken Strips seasoned just right. Contains Gluten (Wheat).", price: 7.50, category: "Starters" },
    { name: "Put a Wing on It", description: "Juicy Buffalo Wings bursting with flavour served with Blue Cheese Dip.", price: 7.50, category: "Starters" },
    { name: "Let's Nacho", description: "Hot, crispy Tortilla Chips topped with our house Sides. Contains Gluten (Wheat).", price: 8.50, category: "Starters" },
    
    // Burgers
    { name: "Original Burger", description: "Double Beef Patties topped with Cheese, Lettuce, Tomatoes, Onions & Secret Burger Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 10.50, category: "Burgers" },
    { name: "The Guac Burger", description: "Double Beef Burger topped with Guacamole, Monterey Jack Cheese & Ranch Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 13.50, category: "Burgers" },
    { name: "Smoky Bandit Burger", description: "Double Beef Burger topped with Crispy Fried Onions, Smoky Apple Wood Cheese & House BBQ Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 12.50, category: "Burgers" },
    { name: "The Italian Job Burger", description: "Grilled Chicken Breast topped with Pico De Gallo, Avocado & Pesto Mayonnaise. Contains Gluten (Wheat), Eggs, Milk", price: 12.50, category: "Burgers" },
    { name: "The Classic Burger", description: "Crisp Fillet topped with Melted Cheese Lettuce & Burger Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 10.50, category: "Burgers" },
    { name: "Chipotle Crunch Burger", description: "Double Beef Burger topped with Crunchy Homemade Onion Rings, Spicy Cheese & Chipotle Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 12.50, category: "Burgers" },
    { name: "Shroom Service Burger", description: "Double Beef Burger topped with Sautéed Mushrooms, Caramelized Onions & Peppers with Swiss Cheese & Dijon Mustard Mayonnaise. Contains Gluten (Wheat), Eggs, Milk", price: 13.50, category: "Burgers" },
    { name: "Angry Bird Burger", description: "Fried Buttermilk Battered Chicken Breast topped with House Slaw, Cheese, Jalapeños & Chilli Mayonnaise. Contains Gluten (Wheat), Eggs, Milk", price: 12.50, category: "Burgers" },
    { name: "O'Falafel Burger", description: "Homemade Chickpea Patty topped with Halloumi Grilled Red Peppers & Harissa Mayonnaise. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Burgers" },
    { name: "Eggcelence Burger", description: "Double Beef Patty with a Free-Range Fried Egg, Bacon Rashers, Crispy Onions, Hash Brown, Cheese, Tomatoes, Lettuce & Cashel Blue Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 14.99, category: "Burgers" },
    { name: "Chuck E Cheese Burger", description: "Triple Beef Patty topped with Pepperoni, Hotdogs, Bacon Rashers & Gouda Cheese with Mustard & Ketchup. Contains Gluten (Wheat), Eggs, Milk", price: 14.99, category: "Burgers" },
    { name: "Double or Nothing Burger", description: "Popular!! Fried or grilled? Why not one of each? Sink your teeth into our loaded fried & grilled Chicken burger with Smoked Cheese, Red Onions, Lettuce Cajun Mayonnaise & Hot BBQ Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 14.99, category: "Burgers" },
    { name: "Big Hulk Burger", description: "Triple Beef Patties topped with Cheese, Pickles, Tomatoes, Onions & Secret Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 13.99, category: "Burgers" },
    { name: "The Tower Burger", description: "Crisp Fillet topped with Hash Browns, Bacon & Melted Cheese, Fried Onions & 2 Tenders. Contains Gluten (Wheat), Eggs, Milk", price: 13.99, category: "Burgers" },
    { name: "Pleased to Meat You Burger", description: "Folded Pizza with Beef Mince, Red Onions, Peppers & Jalapeños. Contains Gluten (Wheat), Eggs, Milk", price: 14.99, category: "Burgers" },
    
    // Wraps
    { name: "Straight Outta' Philly Wrap", description: "Slices of Tender Beef Steak topped with Peppers, Onions, & smothered in Cheese Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 12.99, category: "Wraps" },
    { name: "Boom Chicka Boom Wrap", description: "Popular!! Grilled Chicken Kebab Pieces with Onions, Tomatoes, Lettuce & Homemade Kebab Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 11.99, category: "Wraps" },
    { name: "The Mashup Wrap", description: "Buttermilk Fried Chicken with Crispy Bacon, Greens & Secret Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 10.50, category: "Wraps" },
    { name: "Donatello Doner Wrap", description: "Donner Meat paired with Onions, Tomatoes, Lettuce & Homemade Kebab Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 11.99, category: "Wraps" },
    { name: "The Rooster Wrap", description: "Crispy Chicken Goujon with Cheese, Salad & choice of your Sauce (BBQ or Sweet Chilli or Peri Peri). Contains Gluten (Wheat), Eggs, Milk", price: 10.50, category: "Wraps" },
    { name: "Fella Falafel Wrap", description: "Homemade Falafel Patty topped with Hummus Salad & House Dressing. Contains Gluten (Wheat), Eggs, Milk", price: 9.50, category: "Wraps" },
    
    // Pizza
    { name: "Cheese Please (The Classic)", description: "Loaded with Mozzarella Cheese, a sprinkle of mix herbs. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Tandoori Nights (Asian)", description: "Asian style Tandoori Chicken, topped with Red Onions, Peppers, Sweetcorn, Jalapeños. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Farm House (Real Fresh)", description: "A fresh Veggies overload of Onions, crunchy Peppers, succulent Mushrooms, juicy Tomatoes & Sweetcorn. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Show Me the Pepperoni (American)", description: "Only for passionate Pepperoni fans. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Pollo (Tuscan)", description: "Smoked Chicken, Sausage, Olives, Green Peppers, Mushrooms. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Blazing Behari (Pakistani)", description: "Behari Masala marinated Chicken, Onions & Green Chillies topped with Mozzarella Cheese. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Capriciosa (Hawaiian)", description: "Classic Ham & Mushrooms. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Smokin' Hot (Mexican)", description: "Mince, Jalapeños, Onions, Mixed Peppers with a sprinkle of crushed Chilli Flakes. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Pizza À Portuguesa (Portuguese)", description: "Fire up your taste buds with Spiced Chicken, Olives, Jalapeños & drizzled with Hot Peri Peri Sauce. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Gyro (Greek)", description: "Carved Donner Kebab Meat topped with Mixed Salad, a drizzle of Garlic Acile. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Achari (Picklish)", description: "Chilli Chicken, onions, peppers, olives, jalapenos and pickle. Contains Gluten (Wheat), Eggs, Milk", price: 9.99, category: "Pizza" },
    { name: "Ranch Sicilian Pizza", description: "Spicy Pulled Beef, Bacon, Mushrooms, Cherry Tomatoes, Peppers & Black Olives topped with Ranch Sauce & a touch of Garlic Oil. Contains Gluten (Wheat), Eggs, Milk", price: 10.99, category: "Pizza" },
    { name: "Paneer Tikka", description: "Spicy Paneer, red onions, tomatoes, jalapenos and topped with spicy mayo. Contains Gluten (Wheat), Eggs, Milk", price: 10.99, category: "Pizza" },
    
    // Calzone
    { name: "Chicken Fiesta Calzone", description: "Folded Pizza with Chicken, Spinach, Mushrooms, Olives & Onions. Contains Gluten (Wheat), Eggs, Milk", price: 11.99, category: "Calzone" },
    { name: "Donner Trump Calzone", description: "10\". Why have abs when you can have Kebabs? Folded Pizza loaded with Donner Meat. Contains Gluten (Wheat), Eggs, Milk", price: 11.99, category: "Calzone" },
    { name: "Prince of Mince Calzone", description: "Folded Pizza with Beef Mince, Red Onions, Peppers & Jalapeños. Contains Gluten (Wheat), Eggs, Milk", price: 11.99, category: "Calzone" },
    { name: "Desi Fold", description: "Spicy chicken Tikka, Jalapenos, Onions and peppers", price: 11.99, category: "Calzone" },
    
    // Sides
    { name: "Fiery Chicken Wings", description: "Tossed in Melted Butter & Hot Sauce.", price: 7.50, category: "Sides" },
    { name: "Wild Wedges", description: "Seasoned to perfection.", price: 6.50, category: "Sides" },
    { name: "Garlic Cheesy Bread", description: "Hot & Cheesy, enough said. Contains Gluten (Wheat), Eggs, Milk", price: 6.50, category: "Sides" },
    { name: "Crispy Onion Rings", description: "Contains Gluten (Wheat)", price: 6.50, category: "Sides" },
    { name: "Popcorn Bites", description: "Contains Gluten (Wheat)", price: 6.50, category: "Sides" },
    { name: "Love the Way You Fry", description: "Classic fries", price: 5.00, category: "Sides" },
    { name: "Masala Punched", description: "Spiced fries", price: 6.50, category: "Sides" },
    { name: "Dead in Cheese", description: "Cheesy fries. Contains Milk", price: 6.50, category: "Sides" },
    { name: "Mix It Up", description: "Mixed fries", price: 5.99, category: "Sides" },
    { name: "Garlic Cheese Fries", description: "Garlic and cheese fries. Contains Eggs, Milk", price: 6.50, category: "Sides" },
    { name: "Chic Bit", description: "Chicken bites. Contains Gluten (Wheat)", price: 9.99, category: "Sides" },
    { name: "Gravy One", description: "Fries with gravy. Contains Gluten (Wheat)", price: 5.50, category: "Sides" },
    { name: "Tub of Coleslaw", description: "Contains Eggs", price: 3.50, category: "Sides" },
    { name: "Tub of Gravy", description: "Contains Gluten (Wheat)", price: 3.50, category: "Sides" },
    
    // Desserts
    { name: "Nutella Rolls", description: "Contains Gluten (Wheat)", price: 6.50, category: "Desserts" },
    { name: "Selection of Ice Cream", description: "Various ice cream flavors", price: 5.50, category: "Desserts" },
    { name: "Sweetie Pie", description: "Contains Gluten (Wheat)", price: 6.50, category: "Desserts" },
    { name: "Cookie Monster", description: "Soft Gooey, chocolate chip cookies", price: 6.50, category: "Desserts" },
    
    // Sauces
    { name: "Garlic Sauce", description: "Contains Eggs", price: 1.50, category: "Sauces" },
    { name: "Peri Peri Mayonnaise", description: "Contains Eggs", price: 1.50, category: "Sauces" },
    { name: "Cheese Sauce", description: "Contains Milk", price: 1.50, category: "Sauces" },
    { name: "Curry Sauce", description: "Spicy curry sauce", price: 1.50, category: "Sauces" },
    { name: "Hot Sauce", description: "Spicy hot sauce", price: 1.50, category: "Sauces" },
    { name: "Sweet Chilli Sauce", description: "Sweet and spicy", price: 1.50, category: "Sauces" },
    { name: "Ranch Sauce", description: "Contains Eggs, Milk", price: 1.50, category: "Sauces" },
    { name: "Mustard Mayonnaise", description: "Contains Eggs, Mustard", price: 1.50, category: "Sauces" },
    { name: "BBQ Sauce", description: "Classic BBQ flavor", price: 1.50, category: "Sauces" },
    
    // Milkshakes
    { name: "Oreo Crush Milkshake", description: "Oreo cookie milkshake", price: 6.50, category: "Milkshakes" },
    { name: "Strawberry Sensation Milkshake", description: "Strawberry milkshake", price: 6.50, category: "Milkshakes" },
    { name: "Nutty Nutella Milkshake", description: "Nutella milkshake", price: 6.50, category: "Milkshakes" },
    { name: "Fudgey Chocolate Milkshake", description: "Chocolate milkshake", price: 6.50, category: "Milkshakes" },
    { name: "Mango Man Milkshake", description: "Mango milkshake", price: 6.50, category: "Milkshakes" },
    
    // Drinks
    { name: "Coca-Cola Classic 330ml", description: "Soda", price: 2.50, category: "Drinks" },
    { name: "Fanta Orange 330ml", description: "Soda", price: 2.50, category: "Drinks" },
    { name: "Water", description: "Still water", price: 2.50, category: "Drinks" },
    { name: "Diet Coke 330ml", description: "Soda", price: 2.50, category: "Drinks" },
    { name: "7 Up 330ml", description: "Soda", price: 2.50, category: "Drinks" },
    { name: "Absolute Healthy Drink", description: "Healthy drink option", price: 3.50, category: "Drinks" }
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
    console.log('Menu types: irish, italian, american, fastfood')
    console.log('Publish: true/false (default: true)')
    console.log('')
    console.log('Examples:')
    console.log('  node menu-manager.js cmfqyolxc0000i904t9o3vrb4 fastfood true')
    console.log('  node menu-manager.js cmfqyolxc0000i904t9o3vrb4 irish false')
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
