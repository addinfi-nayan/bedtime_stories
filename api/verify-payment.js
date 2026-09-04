import crypto from 'crypto'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields' })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) return res.status(500).json({ error: 'Razorpay secret not configured' })

  const body             = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSig      = crypto.createHmac('sha256', keySecret).update(body).digest('hex')
  const verified         = expectedSig === razorpay_signature

  if (verified) {
    res.json({ verified: true, credits: Number(credits) })
  } else {
    res.status(400).json({ verified: false, error: 'Signature mismatch' })
  }
}
