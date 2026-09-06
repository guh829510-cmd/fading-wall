'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

export default function BuyCredits() {
  const [credits, setCredits] = useState(10)
  const [loading, setLoading] = useState(false)

  const handleBuy = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits })
      })
      const { orderId, amount, key } = await res.json()

      const options = {
        key,
        amount,
        currency: 'INR',
        name: 'The Fading Wall',
        description: `${credits} Pixel Credits`,
        order_id: orderId,
        handler: async (response: any) => {
          await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              credits
            })
          })
          window.location.reload()
        },
        theme: { color: '#000000' }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          Buy Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy Pixel Credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Credits</span>
            <span className="text-2xl font-bold">{credits}</span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>10</span>
            <span>1000</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <span className="text-3xl font-bold">₹{credits * 10}</span>
            <span className="text-gray-500 ml-2">INR</span>
          </div>
          <Button onClick={handleBuy} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            Pay Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
