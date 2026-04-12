import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendText, saveOutbound } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json()
    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message required' }, { status: 400 })
    }

    // Upsert contact
    const contact = await prisma.contact.upsert({
      where:  { phone },
      update: {},
      create: { phone },
    })

    // Send via WhatsApp
    const result = await sendText(phone, message)

    // Save to DB
    await saveOutbound(contact.id, message, result?.messages?.[0]?.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}