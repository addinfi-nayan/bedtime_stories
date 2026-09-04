export default function RefundPolicy({ onBack }) {
  return (
    <div className="legal-page">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <div className="legal-inner">
        <h1>Refund & Cancellation Policy</h1>
        <p className="legal-date">Last updated: April 27, 2025</p>

        <section>
          <h2>1. Credit Purchases</h2>
          <p>Credits purchased on Bedtime Stories are digital goods consumed upon use. Once credits are used to generate a story or access voice playback, those credits cannot be refunded.</p>
        </section>

        <section>
          <h2>2. Eligibility for Refund</h2>
          <p>You may be eligible for a refund in the following cases:</p>
          <ul>
            <li>Your payment was successfully charged but credits were not added to your account</li>
            <li>Duplicate payment was made for the same order</li>
            <li>A technical error on our platform prevented you from using purchased credits</li>
          </ul>
        </section>

        <section>
          <h2>3. Non-Refundable Cases</h2>
          <ul>
            <li>Credits that have already been used to generate stories</li>
            <li>Credits that have already been used for voice playback</li>
            <li>Change of mind after purchase</li>
            <li>Dissatisfaction with AI-generated story quality (we encourage you to try the free credits first)</li>
          </ul>
        </section>

        <section>
          <h2>4. How to Request a Refund</h2>
          <p>To request a refund, email us at <a href="mailto:support@addinfi.com">support@addinfi.com</a> within <strong>7 days</strong> of your purchase with:</p>
          <ul>
            <li>Your registered email address</li>
            <li>Razorpay Payment ID (available in your payment confirmation email)</li>
            <li>Reason for the refund request</li>
          </ul>
          <p>We will review and respond within 3–5 business days. Approved refunds are processed within 5–7 business days to your original payment method.</p>
        </section>

        <section>
          <h2>5. Cancellation</h2>
          <p>Bedtime Stories does not currently offer subscription plans. All credit purchases are one-time payments. There is nothing to "cancel" — you simply use credits as needed.</p>
        </section>

        <section>
          <h2>6. Grievance Officer</h2>
          <p>In accordance with the Information Technology Act, 2000 and the Consumer Protection Act, 2019:</p>
          <p><strong>Grievance Officer:</strong> Addinfi Support Team<br />
          <strong>Email:</strong> <a href="mailto:support@addinfi.com">support@addinfi.com</a><br />
          <strong>Response time:</strong> Within 15 business days</p>
        </section>
      </div>
    </div>
  )
}
