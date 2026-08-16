import { useState } from 'react'
import { Keypair } from '@stellar/stellar-sdk'
import { Eye, EyeOff, Loader2, Copy, ExternalLink, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { useVerdictStore } from '../lib/store'
import TierBadge from '../components/TierBadge'
import ScalesIcon from '../components/ScalesIcon'
import { MOCK_JURORS, truncAddr, formatXLM } from '../lib/mockData'
import { JUROR_TIER_META } from '../lib/constants'

export default function JurorProfile() {
  const { isConnected, pubKey, setWallet, disconnect, setJurorProfile, jurorProfile, addToast } = useVerdictStore()
  const [secretInput, setSecretInput] = useState('')
  const [showSecret,  setShowSecret]  = useState(false)
  const [loading,     setLoading]     = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      const kp = secretInput.trim() ? Keypair.fromSecret(secretInput.trim()) : Keypair.random()
      if (!secretInput.trim()) addToast('info', 'New testnet keypair generated — save your secret key!')
      setWallet(kp.publicKey(), kp.secret())
      const mock = MOCK_JURORS[0]
      setJurorProfile({ ...mock, juror: kp.publicKey() })
      addToast('success', 'Juror ID connected!')
    } catch { addToast('error', 'Invalid secret key') }
    finally  { setLoading(false); setSecretInput('') }
  }

  const copy = (s: string) => { navigator.clipboard.writeText(s); addToast('info', 'Copied') }

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 pb-20 pt-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-5"><ScalesIcon size={80} /></div>
          <h1 className="font-display text-3xl text-ivory mb-2">Juror ID</h1>
          <p className="text-sm text-muted">Connect your wallet to participate as a juror, track your accuracy, and earn staking rewards.</p>
        </div>
        <div className="case-card p-6 space-y-4">
          <div>
            <label className="case-label block mb-2">Secret Key</label>
            <div className="relative">
              <input type={showSecret ? 'text' : 'password'} className="court-input pr-10 font-mono text-xs" placeholder="S… (empty to generate)" value={secretInput} onChange={e => setSecretInput(e.target.value)} />
              <button onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ivory">
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="text-xs text-muted bg-black/20 rounded p-3 border border-white/[0.05]">⚠ Testnet only. Never enter a mainnet secret key.</div>
          <button onClick={handleConnect} disabled={loading} className="btn-brass w-full flex items-center justify-center gap-2 py-3">
            {loading ? <><Loader2 size={14} className="animate-spin" />Connecting…</> : secretInput ? 'Connect Wallet' : 'Generate & Connect'}
          </button>
        </div>
      </div>
    )
  }

  const profile   = jurorProfile || MOCK_JURORS[0]
  const meta      = JUROR_TIER_META[profile.tier] || JUROR_TIER_META['Observer']
  const accuracy  = profile.votes_cast > 0 ? Math.round((profile.votes_correct / profile.votes_cast) * 100) : 0
  const tierOrder = ['Observer','Associate','Adjudicator','SeniorCounsel','ChiefJustice']
  const currIdx   = tierOrder.indexOf(profile.tier)
  const nextTier  = tierOrder[currIdx + 1]
  const nextMeta  = nextTier ? JUROR_TIER_META[nextTier] : null
  const progress  = nextMeta
    ? Math.min(((profile.reputation - meta.min) / (nextMeta.min - meta.min)) * 100, 100)
    : 100

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-20 pt-8 space-y-5">

      {/* Wallet */}
      <div className="court-card p-5" style={{ borderColor: 'rgba(184,137,42,0.12)' }}>
        <div className="case-label mb-3">Connected Wallet</div>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-xs text-ivory break-all flex-1">{pubKey}</div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => copy(pubKey)} className="btn-ghost py-1.5 px-2"><Copy size={12} /></button>
            <a href={`https://stellar.expert/explorer/testnet/account/${pubKey}`} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-2"><ExternalLink size={12} /></a>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          <span className="font-mono text-muted">Testnet · Active</span>
        </div>
      </div>

      {/* Juror standing */}
      <div className="case-card p-6">
        <div className="case-label mb-5">Juror Standing</div>
        <div className="flex items-center gap-5 mb-5">
          <div className="w-20 h-20 rounded border flex items-center justify-center shrink-0"
               style={{ borderColor: `${meta.color}35`, background: `${meta.color}10` }}>
            <span className="font-mono text-2xl" style={{ color: meta.color }}>{meta.glyph}</span>
          </div>
          <div className="space-y-2">
            <TierBadge tier={profile.tier} size="lg" />
            <p className="text-xs text-muted">{meta.desc}</p>
            <div className="font-mono text-xs" style={{ color: meta.color }}>{profile.reputation} reputation pts</div>
          </div>
        </div>

        {nextMeta && (
          <div className="mb-5">
            <div className="flex justify-between text-[10px] font-mono text-muted mb-1.5">
              <span>{meta.label}</span>
              <span>{nextMeta.label} ({nextMeta.min} pts)</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${meta.color}, ${nextMeta.color})` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle, label: 'Correct',   value: profile.votes_correct,   color: '#27AE60' },
            { icon: XCircle,     label: 'Incorrect', value: profile.votes_incorrect,  color: '#C0392B' },
            { icon: TrendingUp,  label: 'Accuracy',  value: `${accuracy}%`,           color: '#B8892A' },
            { icon: TrendingUp,  label: 'Total Cast', value: profile.votes_cast,       color: '#D4C9B0' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="court-card p-3 text-center">
                <Icon size={12} className="mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-display text-xl text-ivory">{s.value}</div>
                <div className="case-label">{s.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Earnings */}
      <div className="court-card p-5">
        <div className="case-label mb-3">Staking Activity</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="case-label mb-1">Total Staked</div><div className="font-mono text-brass-gradient">{formatXLM(profile.total_staked)}</div></div>
          <div><div className="case-label mb-1">Total Earned</div><div className="font-mono" style={{ color: '#27AE60' }}>{formatXLM(profile.total_earned)}</div></div>
        </div>
      </div>

      {/* Scoring breakdown */}
      <div className="court-card p-5">
        <div className="case-label mb-3">How Reputation is Calculated</div>
        <div className="space-y-1.5 text-xs text-muted font-mono">
          <div className="flex gap-3"><span className="text-brass w-28">+100 base</span><span>per correct majority vote</span></div>
          <div className="flex gap-3"><span className="text-brass w-28">+0–50 bonus</span><span>accuracy bonus (% correct × factor)</span></div>
          <div className="flex gap-3"><span className="text-muted w-28">+15 pts</span><span>per abstain vote (neutral)</span></div>
          <div className="flex gap-3"><span className="text-ruby w-28">−15×n penalty</span><span>per minority vote (escalates)</span></div>
          <div className="flex gap-3"><span className="text-ruby w-28">−max 100</span><span>penalty cap regardless of streak</span></div>
        </div>
      </div>

      <button onClick={disconnect} className="btn-ghost w-full border-ruby/20 text-ruby hover:border-ruby/40">Disconnect Wallet</button>
    </div>
  )
}
