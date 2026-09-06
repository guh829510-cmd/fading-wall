import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = await req.json()

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = getServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Add credits
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
    await supabase.from('profiles').update({ credits: (profile?.credits || 0) + credits }).eq('id', user.id)

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_inr: credits * 1000,
      credits_amount: credits,
      status: 'completed',
      metadata: { razorpay_order_id, razorpay_payment_id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
