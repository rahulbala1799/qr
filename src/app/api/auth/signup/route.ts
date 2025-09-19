import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, address, phone, description, website } = await request.json()

    // Validate required fields
    if (!email || !password || !name || !address || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if restaurant already exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { email }
    })

    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Restaurant with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        email,
        password: hashedPassword,
        name,
        address,
        phone,
        description,
        website,
      },
      select: {
        id: true,
        email: true,
        name: true,
        address: true,
        phone: true,
        description: true,
        website: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      { 
        message: 'Restaurant created successfully',
        restaurant 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
