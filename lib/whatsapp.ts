import axios from 'axios'
import { prisma } from './db'

const BASE = 'https://graph.facebook.com/v21.0'
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_TOKEN!

const api = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
})

// Send plain text
export async function sendText(to: string, body: string) {
  if (!TOKEN || !PHONE_ID) {
    console.log(`[WA MOCK] To: ${to} | Message: ${body}`)
    return { mock: true }
  }
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  })
  return res.data
}

// Send template (e.g. hello_world)
export async function sendTemplate(to: string, templateName: string, langCode = 'en_US') {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: langCode } },
  })
  return res.data
}

// Mark message as read
export async function markAsRead(messageId: string) {
  if (!TOKEN || !PHONE_ID) return
  await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}

// Send product catalog card
export async function sendProduct(to: string, bodyText: string, catalogId: string, productId: string) {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'product',
      body: { text: bodyText },
      action: { catalog_id: catalogId, product_retailer_id: productId },
    },
  })
  return res.data
}

// Save outbound message to DB
export async function saveOutbound(contactId: string, body: string, waMessageId?: string) {
  return prisma.message.create({
    data: {
      contactId,
      direction: 'OUTBOUND',
      body,
      status: 'sent',
      waMessageId,
    }
  })
}
export async function sendListMenu(to: string) {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: '🌟 Welcome to WeSupply!'
      },
      body: {
        text: 'We provide premium Netsurf products in Surat.\n\nPlease select an option below:'
      },
      footer: {
        text: 'Powered by WeSupply.store'
      },
      action: {
        button: 'View Options 📋',
        sections: [
          {
            title: '🛍️ Shopping',
            rows: [
              {
                id: 'view_products',
                title: 'View Products',
                description: 'Browse our product catalog'
              },
              {
                id: 'check_price',
                title: 'Check Price',
                description: 'Get latest pricing'
              },
              {
                id: 'place_order',
                title: 'Place Order',
                description: 'Order your products'
              }
            ]
          },
          {
            title: '📦 Orders',
            rows: [
              {
                id: 'track_order',
                title: 'Track My Order',
                description: 'Check order status'
              },
              {
                id: 'order_history',
                title: 'Order History',
                description: 'View past orders'
              }
            ]
          },
          {
            title: '💬 Support',
            rows: [
              {
                id: 'contact_us',
                title: 'Contact Us',
                description: 'Talk to our team'
              }
            ]
          }
        ]
      }
    }
  })
  return res.data
}

export async function sendButtonMenu(
  to: string,
  bodyText: string,
  buttons: { id: string, title: string }[]
) {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  })
  return res.data
}
