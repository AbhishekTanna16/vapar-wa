import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendText, markAsRead, saveOutbound } from '@/lib/whatsapp'

// ── GET — Meta verification handshake ──────────────────────────────
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta')
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST — incoming messages from Meta ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Meta sends a test ping with no messages — just acknowledge
    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('OK', { status: 200 })
    }

    const entry   = body.entry?.[0]
    const change  = entry?.changes?.[0]?.value
    const message = change?.messages?.[0]
    const contact = change?.contacts?.[0]

    // Handle status updates (delivered, read) — just acknowledge
    if (!message && change?.statuses) {
      return new NextResponse('OK', { status: 200 })
    }

    if (!message) return new NextResponse('OK', { status: 200 })

    const phone     = message.from
    const waId      = message.id
    const name      = contact?.profile?.name ?? null
    const msgType   = message.type
    const text      = message.text?.body ?? ''

    console.log(`📨 Incoming from ${phone}: ${text}`)

    // 1. Upsert contact
    const dbContact = await prisma.contact.upsert({
      where:  { phone },
      update: { name: name ?? undefined },
      create: { phone, name },
    })

    // 2. Save inbound message (avoid duplicate processing)
    const existing = await prisma.message.findUnique({
      where: { waMessageId: waId }
    })
    if (existing) return new NextResponse('OK', { status: 200 })

    await prisma.message.create({
      data: {
        waMessageId: waId,
        contactId:   dbContact.id,
        direction:   'INBOUND',
        type:        msgType,
        body:        text || `[${msgType}]`,
        status:      'received',
      }
    })

    // 3. Mark as read
    await markAsRead(waId)

    // 4. Run flow engine — find matching auto-reply
    if (text) {
      const reply = await getAutoReply(text)
      if (reply) {
        await sendText(phone, reply)
        await saveOutbound(dbContact.id, reply)
        console.log(`✅ Auto-replied to ${phone}: ${reply}`)
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    // Always return 200 to Meta — otherwise Meta retries endlessly
    return new NextResponse('OK', { status: 200 })
  }
}

// ── Flow engine ─────────────────────────────────────────────────────
async function getAutoReply(text: string): Promise<string | null> {
  const normalised = text.trim().toLowerCase()

  const rules = await prisma.flowRule.findMany({
    where:   { isActive: true },
    orderBy: { createdAt: 'asc' },
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

  return null
}