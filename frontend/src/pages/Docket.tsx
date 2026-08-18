import { useState, useEffect } from 'react'
import { Search, Scale, Users, CheckCircle, Clock, Loader2 } from 'lucide-react'
import DisputeCard from '../components/DisputeCard'
import TierBadge from '../components/TierBadge'
import ScalesIcon from '../components/ScalesIcon'
import { MOCK_JURORS, truncAddr, formatXLM } from '../lib/mockData'
import { useVerdictStore } from '../lib/store'
import { DISPUTE_CATEGORIES } from '../lib/constants'
import type { DisputeStatus } from '../lib/store'
import { clsx } from 'clsx'

const FILTERS: { label: string; value: DisputeStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Voting',   value: 'Voting'   },
  { label: 'Resolved', value: 'Resolved' },
]

export default function Docket() {
  const { setTab, disputes, setDisputes, pubKey } = useVerdictStore()
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<DisputeStatus | 'all'>('all')
  const [category, setCategory] = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    import('../lib/soroban').then(async m => {
      try {
        const total = await m.getTotalDisputes(pubKey || '')
        const fetches = []
        for (let i = 0; i < total; i++) {
          fetches.push(m.getDispute(pubKey || '', i))
        }
        const results = await Promise.all(fetches)
        setDisputes(results.reverse()) // newest first
      } catch (e) {
        console.error('Failed to load disputes', e)
      } finally {
        setLoading(false)
      }
    })
  }, [pubKey, setDisputes])

  const filtered = disputes.filter(d => {
    const statusStr = Array.isArray(d.status) ? d.status[0] : d.status
    const fStatus = filter === 'all' || statusStr === filter
    const fCat    = !category || d.category === category
    const fSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    return fStatus && fCat && fSearch
  })

  const totalStaked = disputes.reduce((s, d) => s + Number(d.stake_per_juror) * Number(d.total_jurors), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 pt-8 space-y-10">

      {/* Hero */}
      <section className="relative py-6 text-center">
        <div className="absolute inset-0 bg-brass-glow pointer-events-none" />
        <div className="absolute inset-0 bg-burg-glow pointer-events-none" />
        <div className="relative">
          <div className="flex justify-center mb-6"><ScalesIcon size={80} /></div>
          <p className="case-label mb-3">Stellar Soroban · Testnet</p>
          <h1 className="font-display text-4xl sm:text-6xl text-ivory mb-3 leading-tight">
            Justice without<br />
            <span className="text-brass-gradient italic">institutions.</span>
          </h1>
          <p className="max-w-lg mx-auto text-muted text-sm leading-relaxed mb-8">
            VerdictChain is a decentralized arbitration protocol. Stake XLM to serve as a juror,
            vote on disputes, and earn rewards for accurate judgment. Every verdict is final, public, and on-chain.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setTab('file')}    className="btn-brass">File a Dispute</button>
            <button onClick={() => setTab('profile')} className="btn-ghost">Become a Juror</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Scale,       label: 'Active Cases',   value: disputes.filter(d => (Array.isArray(d.status) ? d.status[0] : d.status) === 'Voting').length },
          { icon: CheckCircle, label: 'Cases Resolved', value: disputes.filter(d => (Array.isArray(d.status) ? d.status[0] : d.status) === 'Resolved').length },
          { icon: Users,       label: 'Active Jurors',  value: MOCK_JURORS.length + 89 },
          { icon: Clock,       label: 'Total Staked',   value: formatXLM(totalStaked) },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="court-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-burgundy/20 border border-burgundy/20 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-brass" />
              </div>
              <div>
                <div className="font-display text-xl text-ivory">{s.value}</div>
                <div className="case-label mt-0.5">{s.label}</div>
              </div>
            </div>
          )
        })}
      </section>

      {/* How it works */}
      <section>
        <p className="case-label text-center mb-5">How VerdictChain Works</p>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { n: 'I',   title: 'File',    desc: 'Submit your dispute with evidence. No upfront fee.' },
            { n: 'II',  title: 'Jury',    desc: 'Community jurors stake XLM and cast their votes.' },
            { n: 'III', title: 'Verdict', desc: 'Majority rules. Minority jurors forfeit their stake.' },
            { n: 'IV',  title: 'Record',  desc: 'Outcome is permanent on-chain. Juror accuracy tracked.' },
          ].map(s => (
            <div key={s.n} className="court-card p-4">
              <div className="font-legal text-2xl text-burgundy/50 italic mb-2">{s.n}</div>
              <h3 className="font-display text-base text-ivory mb-1">{s.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filters + case list */}
      <section>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="court-input pl-9 text-xs" placeholder="Search cases…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="court-input text-xs max-w-[180px]" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {DISPUTE_CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#120C10' }}>{c}</option>)}
          </select>
          <div className="flex gap-1 border border-white/[0.05] rounded p-1 bg-black/20">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={clsx('px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all',
                  filter === f.value ? 'bg-burgundy/20 text-ivory border border-burgundy/20' : 'text-muted hover:text-ivory')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="court-card p-12 flex justify-center">
              <Loader2 size={24} className="animate-spin text-brass" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="court-card p-12 text-center">
              <p className="font-display text-lg text-ivory mb-2">No cases found</p>
              <p className="text-sm text-muted">Adjust your filters or file a new dispute.</p>
            </div>
          ) : (
            filtered.map(d => <DisputeCard key={d.id} dispute={d} />)
          )}
        </div>
      </section>

      {/* Juror leaderboard */}
      <section>
        <p className="case-label mb-4">Top Jurors by Reputation</p>
        <div className="court-card overflow-hidden">
          <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-4 p-3 border-b border-white/[0.05]">
            <span className="case-label">#</span>
            <span className="case-label">Juror</span>
            <span className="case-label hidden sm:block">Tier</span>
            <span className="case-label">Accuracy</span>
            <span className="case-label">Score</span>
          </div>
          {MOCK_JURORS.map((j, i) => {
            const acc = j.votes_cast > 0 ? Math.round((j.votes_correct / j.votes_cast) * 100) : 0
            return (
              <div key={j.juror} className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-4 items-center p-3 border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                <span className="font-mono text-xs text-muted">{i+1}</span>
                <div>
                  <div className="font-mono text-xs text-ivory">{truncAddr(j.juror)}</div>
                  <div className="text-[9px] text-muted">{j.votes_cast} votes cast</div>
                </div>
                <div className="hidden sm:block"><TierBadge tier={j.tier} size="sm" /></div>
                <div className="font-mono text-xs text-emerald">{acc}%</div>
                <div className="font-display text-sm text-brass-gradient">{j.reputation}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
