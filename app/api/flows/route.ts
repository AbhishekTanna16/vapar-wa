import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const rules = await prisma.flowRule.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { trigger, matchType, response } = body
    if (!trigger || !response) {
      return NextResponse.json({ error: 'Trigger and response are required' }, { status: 400 })
    }
    const rule = await prisma.flowRule.create({
      data: { trigger, matchType: matchType ?? 'CONTAINS', response }
    })
    return NextResponse.json(rule, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}