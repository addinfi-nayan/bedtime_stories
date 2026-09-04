import { useState } from 'react'

const PACKAGES = [
  { id: 'starter', credits: 30,  amount: 99,  label: 'Starter',   per: '₹3.3/story',  badge: null },
  { id: 'popular', credits: 75,  amount: 199, label: 'Popular',   per: '₹2.6/story',  badge: 'Best Value' },
  { id: 'power',   credits: 180, amount: 399, label: 'Power Pack', per: '₹2.2/story',  badge: 'Save 33%' },
]

export default function OutOfCreditsModal({ onClose, onRefill }) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState('popular')

  async function handleBuy() {
    const pkg = PACKAGES.find((p) => p.id === selected)
    if (!pkg) return

    setLoading(true)
    setError(null)

    try {
      // 1 — Create Razorpay order via API route
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pkg.amount, credits: pkg.credits }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error || 'Could not create order')

      // 2 — Open Razorpay checkout
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    'INR',
        name:        'Bedtime Stories',
        description: `${pkg.credits} Story Credits`,
        order_id:    order.id,
        prefill:     {},
        theme:       { color: '#000000' },
        handler: async (response) => {
          try {
            // 3 — Verify payment on backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, credits: pkg.credits }),
            })
            const result = await verifyRes.json()
            if (result.verified) {
              onRefill(result.credits)
              onClose()
            } else {
              setError('Payment verification failed. Please contact support.')
            }
          } catch {
            setError('Verification error. Please contact support.')
          } finally {
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (res) => {
        setError(res.error?.description || 'Payment failed. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal modal-payment">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-icon">✨</div>
        <h2 id="modal-title" className="modal-title">Get More Credits</h2>
        <p className="modal-body">Pick a pack to keep creating magical stories.</p>

        <div className="payment-packages">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              className={`payment-pkg${selected === pkg.id ? ' selected' : ''}${pkg.badge === 'Best Value' ? ' featured' : ''}`}
              onClick={() => setSelected(pkg.id)}
            >
              {pkg.badge && <span className="pkg-badge">{pkg.badge}</span>}
              <span className="pkg-credits">{pkg.credits}</span>
              <span className="pkg-credits-label">credits</span>
              <span className="pkg-amount">₹{pkg.amount}</span>
              <span className="pkg-per">{pkg.per}</span>
            </button>
          ))}
        </div>

        {error && <p className="payment-error">{error}</p>}

        <button
          className="btn-primary btn-large btn-pay"
          onClick={handleBuy}
          disabled={loading}
        >
          {loading ? 'Processing…' : `Pay ₹${PACKAGES.find(p => p.id === selected)?.amount} with Razorpay`}
        </button>

        <p className="payment-legal">
          By purchasing you agree to our{' '}
          <a href="/terms" target="_blank">Terms</a>,{' '}
          <a href="/privacy" target="_blank">Privacy Policy</a>, and{' '}
          <a href="/refund" target="_blank">Refund Policy</a>.
          Payments are secured by Razorpay.
        </p>
      </div>
    </div>
  )
}
