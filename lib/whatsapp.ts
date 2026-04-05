import axios from 'axios'

const BASE_URL = 'https://graph.facebook.com/v19.0'
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_TOKEN!

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
})

// Send a plain text message
export async function sendText(to: string, message: string) {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
  })
  return res.data
}

// Send a template message (e.g. hello_world)
export async function sendTemplate(to: string, templateName: string, langCode = 'en_US') {
  const res = await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: langCode },
    },
  })
  return res.data
}

// Send a product catalog message
export async function sendCatalogMessage(to: string, bodyText: string, catalogId: string, productId: string) {
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

// Mark a message as read
export async function markAsRead(messageId: string) {
  await api.post(`/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}