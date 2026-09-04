export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="legal-page">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <div className="legal-inner">
        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: April 27, 2025</p>

        <section>
          <h2>1. Who We Are</h2>
          <p>Bedtime Stories ("we", "our", "us") is operated by Addinfi, India. We provide an AI-powered personalised children's bedtime story generation service accessible at this website and as a Progressive Web App.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <ul>
            <li><strong>Google Sign-In:</strong> When you sign in with Google, we receive your name, email address, and profile picture from Google. We do not receive your Google password.</li>
            <li><strong>Story data:</strong> Stories you generate are stored locally on your device using browser localStorage. We do not upload story content to our servers.</li>
            <li><strong>Payment data:</strong> When you purchase credits, payments are processed by Razorpay. We receive only a payment confirmation and do not store card details, UPI IDs, or bank information.</li>
            <li><strong>Usage data:</strong> We may collect anonymised analytics (pages visited, feature usage) to improve the service.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To authenticate you and maintain your session</li>
            <li>To process credit purchases and grant credits to your account</li>
            <li>To generate personalised stories using the Claude AI API (Anthropic)</li>
            <li>To send service-related communications (no marketing without consent)</li>
          </ul>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <ul>
            <li><strong>Google Sign-In</strong> — authentication; governed by Google's Privacy Policy</li>
            <li><strong>Anthropic Claude API</strong> — story generation; prompts may be processed by Anthropic</li>
            <li><strong>Razorpay</strong> — payment processing; governed by Razorpay's Privacy Policy</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Storage & Security</h2>
          <p>Story data and settings are stored in your browser's localStorage and never transmitted to our servers. User account data (name, email) is stored securely. We use HTTPS for all data transmission.</p>
        </section>

        <section>
          <h2>6. Children's Privacy</h2>
          <p>Our service is designed for use by parents and guardians to generate stories for children. We do not knowingly collect personal information directly from children under 13. Children's names entered in story prompts are processed only to personalise the story and are not stored on our servers.</p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You may request deletion of your account data at any time by contacting us. You can clear locally stored data by clearing your browser's localStorage.</p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>For privacy concerns, contact us at: <a href="mailto:privacy@addinfi.com">privacy@addinfi.com</a></p>
        </section>
      </div>
    </div>
  )
}
