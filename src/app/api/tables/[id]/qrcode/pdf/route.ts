import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the table and verify it belongs to the authenticated restaurant
    const table = await prisma.table.findFirst({
      where: {
        id: params.id,
        restaurantId: session.user.id
      },
      include: {
        restaurant: {
          select: {
            name: true,
            currency: true
          }
        }
      }
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const page = pdfDoc.addPage([612, 792]) // Letter size
    const { width, height } = page.getSize()

    // Create QR code URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    const qrUrl = `${baseUrl}/order/${table.restaurantId}/${table.id}`

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
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
    const qrCodeDims = qrCodeImage.scale(0.6)

    // Center the QR code
    const qrCodeX = (width - qrCodeDims.width) / 2
    const qrCodeY = height - 250

    // Draw QR code
    page.drawImage(qrCodeImage, {
      x: qrCodeX,
      y: qrCodeY,
      width: qrCodeDims.width,
      height: qrCodeDims.height,
    })

    // Add restaurant name
    page.drawText(table.restaurant.name, {
      x: 50,
      y: height - 50,
      size: 28,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    // Add table number
    page.drawText(`Table ${table.tableNumber}`, {
      x: 50,
      y: height - 85,
      size: 20,
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

    let yPosition = qrCodeY - 60
    instructions.forEach((instruction, index) => {
      page.drawText(instruction, {
        x: 50,
        y: yPosition,
        size: index === 0 ? 16 : 14,
        font: index === 0 ? boldFont : font,
        color: rgb(0, 0, 0),
      })
      yPosition -= 25
    })

    // Add URL at bottom
    page.drawText(`URL: ${qrUrl}`, {
      x: 50,
      y: 50,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QR-Code-Table-${table.tableNumber}.pdf"`,
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
