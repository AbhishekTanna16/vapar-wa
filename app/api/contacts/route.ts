import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// GET all contacts
export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { messages: true } }
      }
    })
    return NextResponse.json(contacts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

// POST create contact manually
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, name, email, notes, tags } = body

    if (!phone) return NextResponse.json({ error: 'Phone is required' }, { status: 400 })

    const contact = await prisma.contact.create({
      data: { phone, name, email, notes, tags: tags ?? [] }
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}