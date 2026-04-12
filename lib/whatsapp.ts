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