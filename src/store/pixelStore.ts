import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Pixel {
  x: number
  y: number
  color: string
  user_id: string | null
  intensity: number
  is_permanent: boolean
}

interface PixelStore {
  pixels: Pixel[]
  fetchPixels: () => Promise<void>
  placePixel: (x: number, y: number, color: string) => Promise<void>
  subscribeToPixels: () => () => void
}

export const usePixelStore = create<PixelStore>((set, get) => ({
  pixels: [],

  fetchPixels: async () => {
    const { data } = await supabase
      .from('pixels')
      .select('*')
      .gt('intensity', 0)
    if (data) set({ pixels: data })
  },

  subscribeToPixels: () => {
    const subscription = supabase
      .channel('pixels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pixels' }, () => {
        const { fetchPixels } = get()
        fetchPixels() // Refetch on any change
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  },

  placePixel: async (x, y, color) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Login required')
      return
    }

    // Check free pixel availability
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const now = new Date()
    const freeAvailable = new Date(profile.free_pixel_available_at) <= now
    const hasCredits = profile.credits > 0

    if (!freeAvailable && !hasCredits) {
      alert('No free pixel available and no credits. Buy credits to place more.')
      return
    }

    const isFree = freeAvailable

    // Place pixel
    const { error } = await supabase
      .from('pixels')
      .upsert({
        x, y, color,
        user_id: user.id,
        intensity: 100,
        last_refreshed_at: now.toISOString(),
        is_permanent: false
      })

    if (error) {
      console.error(error)
      alert('Failed to place pixel')
      return
    }

    // Deduct credits or update free pixel timer
    if (isFree) {
      await supabase
        .from('profiles')
        .update({ free_pixel_available_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'free',
        credits_amount: 1,
        metadata: { x, y }
      })
    } else {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'place',
        credits_amount: 1,
        metadata: { x, y, color }
      })
    }

    // Optimistic update
    const current = get().pixels.filter(p => !(p.x === x && p.y === y))
    set({ pixels: [...current, { x, y, color, user_id: user.id, intensity: 100, is_permanent: false }] })
  }
}))
