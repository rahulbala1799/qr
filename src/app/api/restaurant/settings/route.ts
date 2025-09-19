import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/restaurant/settings - Get restaurant settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        description: true,
        address: true,
        phone: true,
        website: true,
        logo: true,
        currency: true,
        isActive: true,
        isPublished: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ restaurant })
  } catch (error) {
    console.error('Error fetching restaurant settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/restaurant/settings - Update restaurant settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, address, phone, website, logo, currency } = await request.json()

    // Validate required fields
    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: 'Name, address, and phone are required' },
        { status: 400 }
      )
    }

    // Validate currency
    if (currency && currency.length > 5) {
      return NextResponse.json(
        { error: 'Currency symbol must be 5 characters or less' },
        { status: 400 }
      )
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: session.user.id },
      data: {
        name,
        description: description || null,
        address,
        phone,
        website: website || null,
        logo: logo || null,
        currency: currency || '€'
      },
      select: {
        id: true,
        name: true,
        email: true,
        description: true,
        address: true,
        phone: true,
        website: true,
        logo: true,
        currency: true,
        isActive: true,
        isPublished: true
      }
    })

    return NextResponse.json({
      message: 'Settings updated successfully',
      restaurant: updatedRestaurant
    })
  } catch (error) {
    console.error('Error updating restaurant settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
