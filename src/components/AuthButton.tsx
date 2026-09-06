'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogIn, User } from 'lucide-react'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('profiles').select('*').eq('id', data.user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (!user) {
    return (
      <Button onClick={signIn} variant="outline" className="gap-2">
        <LogIn size={16} /> Sign In
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <span className="text-gray-500">Credits:</span>
        <span className="font-bold ml-1">{profile?.credits || 0}</span>
      </div>
      <Button onClick={signOut} variant="ghost" size="sm" className="gap-2">
        <User size={16} /> {profile?.username || user.email}
      </Button>
    </div>
  )
}
