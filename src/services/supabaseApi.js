import { supabase } from '../lib/supabaseClient'

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export async function spendCredits(amount, type = 'story_deduct') {
  const { data, error } = await supabase.rpc('spend_credits', { p_amount: amount, p_type: type })
  if (error) throw error
  return data // new balance
}

export async function refundCredits(amount) {
  const { data, error } = await supabase.rpc('refund_credits', { p_amount: amount })
  if (error) throw error
  return data // new balance
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export async function getHistory() {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((s) => ({
    ...s,
    fullText: s.body,
    createdAt: s.created_at,
    deliveryMode: s.delivery_mode,
  }))
}

export async function saveStory(story) {
  const { error } = await supabase.from('stories').insert({
    id: story.id,
    user_id: story.user_id,
    title: story.title,
    body: story.body,
    settings: story.settings,
    delivery_mode: story.deliveryMode,
    created_at: story.createdAt,
  })
  if (error) throw error
}

export async function deleteStory(id) {
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw error
}

export async function clearHistory(userId) {
  const { error } = await supabase.from('stories').delete().eq('user_id', userId)
  if (error) throw error
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function adminListProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminListTransactions(userId) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminListStories(userId) {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, delivery_mode, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminListPurchases(userId) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function adminAdjustCredits(userId, amount, note) {
  const { data, error } = await supabase.rpc('admin_adjust_credits', {
    p_user_id: userId, p_amount: amount, p_note: note || null,
  })
  if (error) throw error
  return data // new balance
}

export async function adminSetTier(userId, tier) {
  const { error } = await supabase.rpc('admin_set_tier', { p_user_id: userId, p_tier: tier })
  if (error) throw error
}

export async function adminUpdateNotesTags(userId, notes, tags) {
  const { error } = await supabase.rpc('admin_update_notes_tags', {
    p_user_id: userId, p_notes: notes, p_tags: tags,
  })
  if (error) throw error
}

export async function adminStats(profiles, allPurchases) {
  const totalUsers = profiles.length
  const creditsOutstanding = profiles.reduce((sum, p) => sum + (p.credits || 0), 0)
  const revenue = allPurchases
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount_inr || 0), 0)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const signupsThisWeek = profiles.filter((p) => new Date(p.created_at).getTime() > weekAgo).length
  return { totalUsers, creditsOutstanding, revenue, signupsThisWeek }
}

export async function adminListAllPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
