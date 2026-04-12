import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// GET single contact with messages
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        orders: { include: { product: true } }
      }
    })
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(contact)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}

// PATCH update contact
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const contact = await prisma.contact.update({
      where: { id },
      data: body
    })
    return NextResponse.json(contact)
  } catch {
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

// DELETE contact
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}