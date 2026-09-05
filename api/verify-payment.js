import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

async function getVerifiedUserId(req) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  const supabase = createClient(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const userId = await getVerifiedUserId(req)
  if (!userId) return res.status(401).json({ verified: false, error: 'Not authenticated' })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, amount } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !credits) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields' })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) return res.status(500).json({ error: 'Razorpay secret not configured' })

  const body        = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSig = crypto.createHmac('sha256', keySecret).update(body).digest('hex')
  const verified    = expectedSig === razorpay_signature

  if (!verified) {
    return res.status(400).json({ verified: false, error: 'Signature mismatch' })
  }

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ verified: false, error: 'Supabase service key not configured' })
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: newBalance, error } = await admin.rpc('redeem_purchase', {
      p_user_id:    userId,
      p_credits:    Number(credits),
      p_order_id:   razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_amount:     amount ?? null,
    })
    if (error) throw error

    res.json({ verified: true, credits: newBalance })
  } catch (err) {
    res.status(500).json({ verified: false, error: err.message })
  }
}
