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
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const { amount, credits } = req.body
  if (!amount || !credits) return res.status(400).json({ error: 'Missing amount or credits' })

  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' })

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount:   Math.round(amount * 100), // convert to paise
        currency: 'INR',
        receipt:  `bs_${credits}cr_${Date.now()}`,
        notes: { credits: String(credits), user_id: userId },
      }),
    })

    const order = await response.json()
    if (!response.ok) return res.status(response.status).json(order)
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
