import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/tables/[id] - Update a table
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableNumber, isActive } = await request.json()

    // Verify the table belongs to the authenticated restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Check if table number already exists for this restaurant (excluding current table)
    if (tableNumber && tableNumber !== existingTable.tableNumber) {
      const duplicateTable = await prisma.table.findFirst({
        where: {
          restaurantId: session.user.id,
          tableNumber: tableNumber.toString(),
          id: { not: params.id }
        }
      })

      if (duplicateTable) {
        return NextResponse.json(
          { error: 'Table number already exists' },
          { status: 400 }
        )
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id: params.id },
      data: {
        ...(tableNumber && { tableNumber: tableNumber.toString() }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      message: 'Table updated successfully',
      table: updatedTable
    })
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tables/[id] - Delete a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the table belongs to the authenticated restaurant
    const existingTable = await prisma.table.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    await prisma.table.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Table deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
