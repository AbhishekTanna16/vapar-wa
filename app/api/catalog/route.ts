import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } }
    })
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, price, imageUrl } = body
    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }
    const product = await prisma.product.create({
      data: { name, description, price: parseFloat(price), imageUrl }
    })
    return NextResponse.json(product, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}