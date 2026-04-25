import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  sendText, 
  markAsRead, 
  saveOutbound,
  sendListMenu,
  sendButtonMenu,
} from '@/lib/whatsapp'

// ── GET — Meta verification handshake ──────────────────────────────
export async function GET(req: NextRequest) {
  // ... your existing code
}

// ── POST — incoming messages from Meta ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.object !== 'whatsapp_business_account') {
      return new NextResponse('OK', { status: 200 })
    }

    const entry   = body.entry?.[0]
    const change  = entry?.changes?.[0]?.value
    const message = change?.messages?.[0]
    const contact = change?.contacts?.[0]

    if (!message && change?.statuses) {
      return new NextResponse('OK', { status: 200 })
    }
    if (!message) return new NextResponse('OK', { status: 200 })

    const phone   = message.from
    const waId    = message.id
    const name    = contact?.profile?.name ?? null
    const msgType = message.type
    const text    = message.text?.body ?? ''

    console.log(`📨 Incoming from ${phone}: ${text}`)

    // 1. Upsert contact
    const dbContact = await prisma.contact.upsert({
      where:  { phone },
      update: { name: name ?? undefined },
      create: { phone, name },
    })

    // 2. Save inbound message
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

    // 4. Handle interactive messages (button/list taps)
    if (msgType === 'interactive') {
      const interactiveType = message.interactive?.type

      if (interactiveType === 'list_reply') {
        const selectedId = message.interactive.list_reply.id
        await handleMenuSelection(phone, selectedId, dbContact.id)
      }

      if (interactiveType === 'button_reply') {
        const selectedId = message.interactive.button_reply.id
        await handleMenuSelection(phone, selectedId, dbContact.id)
      }

      return new NextResponse('OK', { status: 200 })
    }

    // 5. Handle text messages
    if (text) {
      const reply = await getAutoReply(text, phone, dbContact.id)
      if (reply) {
        await sendText(phone, reply)
        await saveOutbound(dbContact.id, reply)
        console.log(`✅ Auto-replied to ${phone}: ${reply}`)
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

// ── handleMenuSelection ─────────────────────────────────────────────
async function handleMenuSelection(
  phone: string,
  selectedId: string,
  contactId: string
) {
  switch(selectedId) {

    case 'view_products':
      await sendButtonMenu(phone,
        '🛍️ Our Netsurf Products:\n\n' +
        '1. 🧴 Face Cream - ₹499\n' +
        '2. 💆 Hair Oil - ₹399\n' +
        '3. 🧴 Body Lotion - ₹299\n\n' +
        'Select a product to order:',
        [
          { id: 'order_face_cream', title: '🧴 Face Cream' },
          { id: 'order_hair_oil', title: '💆 Hair Oil' },
          { id: 'order_body_lotion', title: '🧴 Body Lotion' }
        ]
      )
      break

    case 'order_face_cream':
      await sendText(phone,
        '🧴 Netsurf Face Cream - ₹499\n\n' +
        'How many units would you like?\n' +
        'Reply with a number (e.g. 2)'
      )
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: 'PENDING_ORDER:Face Cream:499' }
      })
      break

    case 'order_hair_oil':
      await sendText(phone,
        '💆 Netsurf Hair Oil - ₹399\n\n' +
        'How many units would you like?\n' +
        'Reply with a number (e.g. 2)'
      )
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: 'PENDING_ORDER:Hair Oil:399' }
      })
      break

    case 'order_body_lotion':
      await sendText(phone,
        '🧴 Netsurf Body Lotion - ₹299\n\n' +
        'How many units would you like?\n' +
        'Reply with a number (e.g. 2)'
      )
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: 'PENDING_ORDER:Body Lotion:299' }
      })
      break

    case 'confirm_order':
      const contactData = await prisma.contact.findUnique({
        where: { id: contactId }
      })
      const [, productName, price, quantity, total] = 
        contactData?.notes?.split(':') ?? []

      // Clear pending state
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: null }
      })

      // Send thank you
      await sendText(phone,
        `🎉 Thank You for Your Order!\n\n` +
        `✅ Product: ${productName}\n` +
        `✅ Quantity: ${quantity}\n` +
        `✅ Total: ₹${total}\n\n` +
        `We will deliver within 3-5 business days!\n\n` +
        `For queries: +91 88495 90557\n\n` +
        `Thank you for choosing WeSupply! 🙏`
      )

      // Show main menu again
      await sendListMenu(phone)
      break

    case 'cancel_order':
      await prisma.contact.update({
        where: { id: contactId },
        data: { notes: null }
      })
      await sendText(phone, '❌ Order cancelled!\n\nHow else can we help you?')
      await sendListMenu(phone)
      break

    case 'check_price':
      await sendText(phone,
        '💰 Current Prices:\n\n' +
        '🧴 Face Cream - ₹499\n' +
        '💆 Hair Oil - ₹399\n' +
        '🧴 Body Lotion - ₹299\n' +
        '🧴 Shampoo - ₹349\n\n' +
        '🚚 Free delivery above ₹999!'
      )
      await sendListMenu(phone)
      break

    case 'track_order':
      await sendText(phone,
        '📦 To track your order\n' +
        'Please share your order number.\n\n' +
        'Example: ORD001'
      )
      break

    case 'contact_us':
      await sendButtonMenu(phone,
        '📞 Contact WeSupply:\n\n' +
        '📍 Surat, Gujarat\n' +
        '📞 +91 88495 90557\n' +
        '🌐 wesupply.store\n' +
        '⏰ Mon-Sat: 9AM - 7PM',
        [
          { id: 'main_menu', title: '🏠 Main Menu' },
          { id: 'view_products', title: '🛍️ View Products' }
        ]
      )
      break

    case 'become_distributor':
      await sendText(phone,
        '🤝 Become a WeSupply Distributor!\n\n' +
        '✅ Earn up to ₹50,000/month\n' +
        '✅ Free training provided\n' +
        '✅ Marketing support\n' +
        '✅ Product supply guaranteed\n\n' +
        'Our team will contact you shortly!\n\n' +
        'Call: +91 88495 90557'
      )
      break

    case 'main_menu':
      await sendListMenu(phone)
      break

    default:
      await sendListMenu(phone)
      break
  }
}

// ── getAutoReply ────────────────────────────────────────────────────
async function getAutoReply(
  text: string,
  phone: string,
  contactId: string
): Promise<string | null> {
  const normalised = text.trim().toLowerCase()

  // Check pending order state
  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  })

  if (contact?.notes?.startsWith('PENDING_ORDER:')) {
    const [, productName, price] = contact.notes.split(':')
    const quantity = parseInt(text)

    if (!isNaN(quantity) && quantity > 0) {
      const total = parseInt(price) * quantity
      await sendButtonMenu(phone,
        `✅ Order Summary:\n\n` +
        `🛍️ Product: ${productName}\n` +
        `📦 Quantity: ${quantity}\n` +
        `💰 Total: ₹${total}\n\n` +
        `Confirm your order?`,
        [
          { id: 'confirm_order', title: '✅ Confirm Order' },
          { id: 'cancel_order', title: '❌ Cancel' }
        ]
      )
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          notes: `CONFIRMING_ORDER:${productName}:${price}:${quantity}:${total}`
        }
      })
      return null
    } else {
      await sendText(phone,
        '❌ Please reply with a valid number.\nExample: 2'
      )
      return null
    }
  }

  // Trigger main menu
  if (['hi','hello','menu','start','hii','hey'].includes(normalised)) {
    await sendListMenu(phone)
    return null
  }

  // Check flow rules
  const rules = await prisma.flowRule.findMany({
    where: { isActive: true },
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

  // Default - show menu
  await sendListMenu(phone)
  return null
}