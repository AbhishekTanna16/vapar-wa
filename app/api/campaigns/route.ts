import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, message, recipients } = body
    if (!name || !message || !recipients?.length) {
      return NextResponse.json({ error: 'Name, message and recipients are required' }, { status: 400 })
    }
    const campaign = await prisma.campaign.create({
      data: { name, message, recipients, status: 'DRAFT' }
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}