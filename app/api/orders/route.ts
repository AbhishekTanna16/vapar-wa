import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        product: true
      }
    })
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contactId, productId, quantity } = body
    if (!contactId || !productId) {
      return NextResponse.json({ error: 'Contact and product are required' }, { status: 400 })
    }
    const order = await prisma.order.create({
      data: {
        contactId,
        productId,
        quantity: quantity ?? 1,
        status: 'PENDING'
      },
      include: { contact: true, product: true }
    })
    return NextResponse.json(order, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}