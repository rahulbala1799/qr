import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tableIds } = await request.json()

    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json(
        { error: 'Table IDs are required' },
        { status: 400 }
      )
    }

    // Get restaurant info
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        currency: true
      }
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Get tables
    const tables = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        restaurantId: session.user.id,
        isActive: true
      }
    })

    if (tables.length === 0) {
      return NextResponse.json(
        { error: 'No valid tables found' },
        { status: 404 }
      )
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Generate QR codes and create pages
    for (const table of tables) {
      const page = pdfDoc.addPage([612, 792]) // Letter size
      const { width, height } = page.getSize()

      // Create QR code URL
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      const host = request.headers.get('host') || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`
      const qrUrl = `${baseUrl}/order/${table.restaurantId}/${table.id}`

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      // Convert data URL to buffer
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64')

      // Embed QR code image
      const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)
      const qrCodeDims = qrCodeImage.scale(0.5)

      // Center the QR code
      const qrCodeX = (width - qrCodeDims.width) / 2
      const qrCodeY = height - 200

      // Draw QR code
      page.drawImage(qrCodeImage, {
        x: qrCodeX,
        y: qrCodeY,
        width: qrCodeDims.width,
        height: qrCodeDims.height,
      })

      // Add restaurant name
      page.drawText(restaurant.name, {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      })

      // Add table number
      page.drawText(`Table ${table.tableNumber}`, {
        x: 50,
        y: height - 80,
        size: 18,
        font: font,
        color: rgb(0, 0, 0),
      })

      // Add instructions
      const instructions = [
        'How to Order:',
        '1. Scan the QR code with your phone camera',
        '2. Browse the menu and add items to your cart',
        '3. Place your order and we\'ll bring it to your table'
      ]

      let yPosition = qrCodeY - 50
      instructions.forEach((instruction, index) => {
        page.drawText(instruction, {
          x: 50,
          y: yPosition,
          size: index === 0 ? 14 : 12,
          font: index === 0 ? boldFont : font,
          color: rgb(0, 0, 0),
        })
        yPosition -= 20
      })

      // Add URL at bottom
      page.drawText(`URL: ${qrUrl}`, {
        x: 50,
        y: 50,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QR-Codes-${restaurant.name}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
