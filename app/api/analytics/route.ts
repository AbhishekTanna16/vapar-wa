import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const [
      totalContacts,
      totalMessages,
      inboundMessages,
      outboundMessages,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      totalCampaigns,
      completedCampaigns,
      activeRules,
      recentMessages,
      recentOrders,
      last7DaysMessages,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.message.count(),
      prisma.message.count({ where: { direction: 'INBOUND' } }),
      prisma.message.count({ where: { direction: 'OUTBOUND' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'COMPLETED' } }),
      prisma.flowRule.count({ where: { isActive: true } }),
      prisma.message.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { contact: true }
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { contact: true, product: true }
      }),
      // Get messages from last 7 days
      prisma.message.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: { createdAt: true, direction: true }
      }),
    ])

    // Build last7Days chart data manually
    const days: Record<string, { date: string; inbound: number; outbound: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days[key] = { date: key, inbound: 0, outbound: 0 }
    }
    for (const msg of last7DaysMessages) {
      const key = msg.createdAt.toISOString().split('T')[0]
      if (days[key]) {
        if (msg.direction === 'INBOUND') days[key].inbound++
        else days[key].outbound++
      }
    }
    const last7Days = Object.values(days)

    // Revenue
    const revenueOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { product: true }
    })
    const totalRevenue = revenueOrders.reduce(
      (sum, o) => sum + o.product.price * o.quantity, 0
    )

    return NextResponse.json({
      contacts:  { total: totalContacts },
      messages:  { total: totalMessages, inbound: inboundMessages, outbound: outboundMessages },
      orders:    { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders, cancelled: cancelledOrders, revenue: totalRevenue },
      products:  { active: totalProducts },
      campaigns: { total: totalCampaigns, completed: completedCampaigns },
      flows:     { active: activeRules },
      recentMessages,
      recentOrders,
      last7Days,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}