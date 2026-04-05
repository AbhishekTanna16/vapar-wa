import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText, markAsRead } from '@/lib/whatsapp'

// Meta calls GET to verify the webhook
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Meta calls POST for every incoming message/status
export async function POST(req: NextRequest) {
  const body = await req.json()

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]?.value
  const message = change?.messages?.[0]
  const contact = change?.contacts?.[0]

  if (!message) return new NextResponse('OK', { status: 200 })

  const phone = message.from
  const name = contact?.profile?.name ?? null
  const messageId = message.id
  const text = message.text?.body ?? ''

  // 1. Upsert contact
  const dbContact = await prisma.contact.upsert({
    where: { phone },
    update: { name: name ?? undefined },
    create: { phone, name },
  })

  // 2. Save incoming message
  await prisma.message.create({
    data: {
      waMessageId: messageId,
      contactId: dbContact.id,
      direction: 'INBOUND',
      type: message.type,
      body: text,
      status: 'received',
    },
  })

  // 3. Mark as read
  await markAsRead(messageId)

  // 4. Run through flow rules
  const reply = await getAutoReply(text)
  if (reply) {
    await sendText(phone, reply)
    await prisma.message.create({
      data: {
        contactId: dbContact.id,
        direction: 'OUTBOUND',
        body: reply,
        status: 'sent',
      },
    })
  }

  return new NextResponse('OK', { status: 200 })
}

// Flow engine — matches incoming text to rules in the DB
async function getAutoReply(text: string): Promise<string | null> {
  const normalised = text.trim().toLowerCase()

  const rules = await prisma.flowRule.findMany({
    where: { isActive: true },
  })

  for (const rule of rules) {
    const trigger = rule.trigger.toLowerCase()
    const matched =
      rule.matchType === 'EXACT'       ? normalised === trigger :
      rule.matchType === 'CONTAINS'    ? normalised.includes(trigger) :
      rule.matchType === 'STARTS_WITH' ? normalised.startsWith(trigger) :
      false

    if (matched) return rule.response
  }

  return null // no match → no reply
}