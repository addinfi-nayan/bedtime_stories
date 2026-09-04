export default function CreditDisplay({ credits, onBuyCredits }) {
  const empty = credits < 1

  return (
    <div className="credit-display">
      <button
        className={`credit-badge clickable${empty ? ' empty' : ''}`}
        onClick={onBuyCredits}
        title={empty ? 'Out of credits — click to buy' : 'Click to buy more credits'}
      >
        {empty ? '⭐ Out of credits' : `⭐ ${credits} ${credits === 1 ? 'credit' : 'credits'}`}
      </button>
    </div>
  )
}
