import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getMyProfile } from '../services/supabaseApi'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const p = await getMyProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  const signOut = useCallback(async () => {
    if (window.google) window.google.accounts.id.disableAutoSelect()
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return {
    session,
    user: session?.user
      ? { id: session.user.id, name: profile?.name, email: profile?.email, picture: profile?.picture }
      : null,
    profile,
    credits: profile?.credits ?? 0,
    isAdmin: profile?.is_admin === true,
    loading,
    refreshProfile,
    setLocalCredits: (n) => setProfile((p) => (p ? { ...p, credits: n } : p)),
    signOut,
  }
}
