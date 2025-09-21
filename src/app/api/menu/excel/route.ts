import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// Helper function to create Excel template
function createMenuTemplate() {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  
  // Example data
  const exampleData = [
    {
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and basil',
      price: '12.99',
      category: 'Pizza',
      isAvailable: 'true',
      image: 'https://example.com/pizza.jpg (optional)'
    },
    {
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with Caesar dressing and croutons',
      price: '8.99',
      category: 'Salads',
      isAvailable: 'true',
      image: ''
    }
  ]
  
  // Create worksheet with example data
  const ws = XLSX.utils.json_to_sheet(exampleData)
  
  // Add column headers
  ws['!cols'] = [
    { wch: 30 }, // name
    { wch: 50 }, // description
    { wch: 10 }, // price
    { wch: 20 }, // category
    { wch: 10 }, // isAvailable
    { wch: 50 }  // image
  ]
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Menu Items')
  
  return wb
}

// Helper function to validate menu item data
function validateMenuItem(item: any) {
  const errors = []
  
  if (!item.name?.trim()) errors.push('Name is required')
  if (!item.category?.trim()) errors.push('Category is required')
  
  const price = parseFloat(item.price)
  if (isNaN(price) || price < 0) errors.push('Price must be a positive number')
  
  if (item.isAvailable && !['true', 'false'].includes(item.isAvailable.toString().toLowerCase())) {
    errors.push('isAvailable must be true or false')
  }
  
  if (item.image && typeof item.image !== 'string') {
    errors.push('Image must be a URL string')
  }
  
  return errors
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create template workbook
    const wb = createMenuTemplate()
    
    // Convert to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    // Return the Excel file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="menu_template.xlsx"'
      }
    })
  } catch (error) {
    console.error('Error generating Excel template:', error)
    return NextResponse.json(
      { error: 'Error generating Excel template' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }
    
    // Read the file buffer
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'buffer' })
    
    // Get the first worksheet
    const ws = wb.Sheets[wb.SheetNames[0]]
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(ws)
    
    // Validate all items first
    const errors: { row: number; errors: string[] }[] = []
    data.forEach((item: any, index: number) => {
      const itemErrors = validateMenuItem(item)
      if (itemErrors.length > 0) {
        errors.push({ row: index + 2, errors: itemErrors })
      }
    })
    
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation errors', details: errors },
        { status: 400 }
      )
    }
    
    // Create all menu items
    const menuItems = await Promise.all(
      data.map((item: any) => 
        prisma.menuItem.create({
          data: {
            name: item.name.trim(),
            description: item.description?.trim() || null,
            price: parseFloat(item.price),
            category: item.category.trim(),
            isAvailable: item.isAvailable?.toString().toLowerCase() === 'true',
            image: item.image?.trim() || null,
            restaurantId: session.user.id
          }
        })
      )
    )
    
    return NextResponse.json({
      message: `Successfully imported ${menuItems.length} menu items`,
      menuItems
    })
  } catch (error) {
    console.error('Error processing Excel upload:', error)
    return NextResponse.json(
      { error: 'Error processing Excel upload' },
      { status: 500 }
    )
  }
}
