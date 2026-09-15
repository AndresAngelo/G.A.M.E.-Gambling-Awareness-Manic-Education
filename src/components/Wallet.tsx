import type { LedgerEntry } from '../domain/types'

interface Props {
  balance: number
  ledger: LedgerEntry[]
  onPurchaseAttempt(): void
}

export function Wallet({ balance, ledger, onPurchaseAttempt }: Props) {
  return (
    <section aria-labelledby="wallet-title">
      <h2 id="wallet-title">Learning credits: {balance.toLocaleString()}</h2>
      <div className="notice"><strong>Simulation only.</strong> No payment method can be entered and no credits have real-world value.</div>
      <h3>Simulated credit offers</h3>
      <div className="offer-grid">
        {[1000, 2500, 5000].map((amount) => <button key={amount} className="offer" onClick={onPurchaseAttempt}><span>{amount.toLocaleString()} credits</span><small>Simulate checkout</small></button>)}
      </div>
      <h3>Local transaction history</h3>
      <ol className="ledger">
        {ledger.slice(-8).reverse().map((entry) => <li key={entry.id}><span>{entry.label}</span><strong className={entry.delta < 0 ? 'negative' : 'positive'}>{entry.delta > 0 ? '+' : ''}{entry.delta}</strong></li>)}
      </ol>
    </section>
  )
}
