require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.flowRule.createMany({
    data: [
      { trigger: 'hi',      matchType: 'CONTAINS',    response: 'Hello! Welcome. How can I help you today?' },
      { trigger: 'hello',   matchType: 'CONTAINS',    response: 'Hi there! How can we assist you?' },
      { trigger: 'price',   matchType: 'CONTAINS',    response: 'Please visit our catalog or type CATALOG to see all products with prices.' },
      { trigger: 'catalog', matchType: 'EXACT',       response: 'Here are our products: [you can list them here]' },
      { trigger: 'order',   matchType: 'CONTAINS',    response: 'To place an order, please share the product name and quantity.' },
      { trigger: 'help',    matchType: 'EXACT',       response: 'Commands:\nHi - Greeting\nPrice - Pricing info\nCatalog - View products\nOrder - Place an order' },
    ],
  })
  console.log('✅ Flow rules seeded')
}

main().catch(console.error).finally(() => prisma.$disconnect())