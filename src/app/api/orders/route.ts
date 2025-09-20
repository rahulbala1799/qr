import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const { 
      restaurantId, 
      tableId, 
      customerName, 
      customerPhone, 
      notes, 
      items 
    } = await request.json()

    if (!restaurantId || !tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant ID, table ID, and items are required' },
        { status: 400 }
      )
    }

    // Verify restaurant exists and is published
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        isPublished: true,
        isActive: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or not accepting orders' },
        { status: 404 }
      )
    }

    // Verify table exists and is active
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurantId,
        isActive: true
      }
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or not available' },
        { status: 404 }
      )
    }

    // Calculate total amount
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          restaurantId: restaurantId,
          isAvailable: true
        }
      })

      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found or not available` },
          { status: 400 }
        )
      }

      const itemTotal = parseFloat(menuItem.price.toString()) * item.quantity
      totalAmount += itemTotal

      orderItems.push({
        quantity: item.quantity,
        price: parseFloat(menuItem.price.toString()),
        notes: item.notes || null,
        status: 'PENDING',
        menuItemId: item.menuItemId
      })
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Create order with order items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        totalAmount,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        restaurantId,
        tableId,
        orderItems: {
          create: orderItems
        }
      },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        },
        table: true,
        restaurant: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Order placed successfully',
      order
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/orders - Get orders for a restaurant (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const tableId = searchParams.get('tableId')
    const status = searchParams.get('status')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      restaurantId
    }

    if (tableId) {
      whereClause.tableId = tableId
    }

    if (status) {
      whereClause.status = status
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        },
        table: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ orders })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
