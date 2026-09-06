import { NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { getServerClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const { credits } = await req.json() // credits = number of pixels to buy
    const supabase = getServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const amount = credits * 1000 // ₹10 per credit = 1000 paise

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `credits_${user.id}_${Date.now()}`,
      notes: {
        user_id: user.id,
        credits: credits.toString()
      }
    })

    return NextResponse.json({ orderId: order.id, amount, key: process.env.RAZORPAY_KEY_ID })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
