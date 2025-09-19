import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/menu/[id] - Update a menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, price, category, image, isAvailable } = await request.json()

    // Verify the menu item belongs to the authenticated restaurant
    const existingMenuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      }
    })

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    // Validate price if provided
    if (price !== undefined) {
      const priceNumber = parseFloat(price)
      if (isNaN(priceNumber) || priceNumber <= 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number' },
          { status: 400 }
        )
      }
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category && { category: category.trim() }),
        ...(image !== undefined && { image: image?.trim() || null }),
        ...(isAvailable !== undefined && { isAvailable })
      }
    })

    return NextResponse.json({
      message: 'Menu item updated successfully',
      menuItem: updatedMenuItem
    })
  } catch (error) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/menu/[id] - Delete a menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the menu item belongs to the authenticated restaurant
    const existingMenuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      }
    })

    if (!existingMenuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    await prisma.menuItem.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Menu item deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
