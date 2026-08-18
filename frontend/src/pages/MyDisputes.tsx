import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import DisputeCard from '../components/DisputeCard'
import { useVerdictStore } from '../lib/store'
import type { DisputeStatus, Dispute } from '../lib/store'
import { clsx } from 'clsx'

const TABS: { label: string; value: DisputeStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Voting',   value: 'Voting'   },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Cancelled',value: 'Cancelled'},
]

export default function MyDisputes() {
  const { isConnected, setTab, pubKey } = useVerdictStore()
  const [filter, setFilter] = useState<DisputeStatus | 'all'>('all')
  const [userDisputes, setUserDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !pubKey) { setLoading(false); return }
    import('../lib/soroban').then(async m => {
      try {
        const results = await m.getUserDisputes(pubKey)
        setUserDisputes(results.reverse())
      } catch (e) {
        console.error('Failed to load user disputes', e)
      } finally {
        setLoading(false)
      }
    })
  }, [isConnected, pubKey])

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 pb-20 pt-16 text-center">
        <div className="court-card p-10">
          <div className="font-legal text-5xl text-burgundy/30 italic mb-4">§</div>
          <h2 className="font-display text-xl text-ivory mb-2">No wallet connected</h2>
          <p className="text-sm text-muted mb-6">Connect your wallet to view your cases.</p>
          <button onClick={async () => {
             const { connectWallet, fetchBalance } = await import('../lib/wallet')
             const address = await connectWallet()
             useVerdictStore.getState().setWallet(address)
             const bal = await fetchBalance(address)
             useVerdictStore.getState().setBalance(bal)
          }} className="btn-brass">Connect Wallet</button>
        </div>
      </div>
    )
  }

  const filtered = userDisputes.filter(d => {
    const statusStr = Array.isArray(d.status) ? d.status[0] : d.status
    return filter === 'all' || statusStr === filter
  })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-ivory">My Cases</h1>
          <p className="text-sm text-muted mt-0.5">{userDisputes.length} cases on record</p>
        </div>
        <button onClick={() => setTab('file')} className="btn-brass text-xs py-2">+ File Case</button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-white/[0.05] pb-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={clsx('px-3 py-1.5 text-xs font-mono whitespace-nowrap rounded transition-all',
              filter === t.value ? 'bg-burgundy/20 text-ivory border border-burgundy/20' : 'text-muted hover:text-ivory')}>
            {t.label}
            <span className="ml-1.5 text-muted">({t.value === 'all' ? userDisputes.length : userDisputes.filter(d => d.status === t.value).length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="court-card p-12 flex justify-center">
            <Loader2 size={24} className="animate-spin text-brass" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="court-card p-10 text-center">
            <p className="font-display text-lg text-ivory mb-2">No cases here</p>
            <p className="text-sm text-muted">File a new dispute to begin.</p>
          </div>
        ) : filtered.map(d => <DisputeCard key={d.id} dispute={d} />)}
      </div>
    </div>
  )
}
