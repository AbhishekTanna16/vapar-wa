import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import axios from 'axios'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'RUNNING') {
      return NextResponse.json({ error: 'Campaign already running' }, { status: 400 })
    }

    // Mark as running
    await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', sentCount: 0, failedCount: 0 }
    })

    let sentCount = 0
    let failedCount = 0

    // Send to each recipient with a small delay to respect Meta rate limits
    for (const phone of campaign.recipients) {
      try {
        // Only send if WhatsApp token is configured
        if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
          await axios.post(
            `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: campaign.message }
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          )
        }

        // Save outbound message to DB
        const contact = await prisma.contact.upsert({
          where: { phone },
          update: {},
          create: { phone }
        })
        await prisma.message.create({
          data: {
            contactId: contact.id,
            direction: 'OUTBOUND',
            body: campaign.message,
            status: 'sent'
          }
        })
        sentCount++

        // 500ms delay between messages — avoids Meta rate limit ban
        await new Promise(r => setTimeout(r, 500))
      } catch {
        failedCount++
      }
    }

    // Mark as completed
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'COMPLETED', sentCount, failedCount }
    })

    return NextResponse.json(updated)
  } catch {
    await prisma.campaign.update({
      where: { id },
      data: { status: 'FAILED' }
    })
    return NextResponse.json({ error: 'Campaign failed' }, { status: 500 })
  }
}