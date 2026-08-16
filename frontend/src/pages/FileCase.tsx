import { useState } from 'react'
import { FileText, Loader2, CheckCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useVerdictStore } from '../lib/store'
import { DISPUTE_CATEGORIES } from '../lib/constants'
import { truncAddr, formatXLM } from '../lib/mockData'

export default function FileCase() {
  const { isConnected, pubKey, addToast, setTab } = useVerdictStore()
  const [form, setForm] = useState({
    respondent: '', title: '', description: '',
    category: '', evidence: '', stakePerJuror: 100,
  })
  const [submitting, setSubmitting] = useState(false)
  const [caseId,     setCaseId]     = useState<string | null>(null)
  const [txHash,     setTxHash]     = useState('')

  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!isConnected)             { addToast('error', 'Connect your wallet first'); return }
    if (!form.respondent.trim())  { addToast('error', 'Respondent address required'); return }
    if (form.respondent === pubKey) { addToast('error', 'Cannot file a dispute against yourself'); return }
    if (!form.title.trim())       { addToast('error', 'Case title required'); return }
    if (!form.description.trim()) { addToast('error', 'Description required'); return }
    if (!form.category)           { addToast('error', 'Select a category'); return }
    if (form.stakePerJuror < 10)  { addToast('error', 'Minimum stake is 10 XLM per juror'); return }

    setSubmitting(true)
    try {
      await new Promise(r => setTimeout(r, 2200))
      const id   = String(Math.floor(Math.random() * 9000 + 1000))
      const hash = Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('')
      setCaseId(id)
      setTxHash(hash)
      addToast('success', `Case #${id} filed on-chain. Jurors may now vote.`)
    } catch (e) {
      addToast('error', `Failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (caseId) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 pb-20 pt-8">
        <div className="case-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded border border-emerald/40 bg-emerald/10 flex items-center justify-center">
            <CheckCircle size={28} style={{ color: '#27AE60' }} />
          </div>
          <h2 className="font-display text-2xl text-ivory mb-2">Case Filed</h2>
          <p className="text-sm text-muted mb-6">Your dispute has been submitted to the VerdictChain court. Community jurors will review the evidence and cast their votes.</p>
          <div className="space-y-2 text-left mb-6">
            <div className="court-card p-3"><div className="case-label mb-1">Case Number</div><div className="font-display text-lg text-brass-gradient">#{caseId}</div></div>
            <div className="court-card p-3"><div className="case-label mb-1">Transaction Hash</div><div className="font-mono text-xs text-emerald break-all">{txHash}</div></div>
            <div className="court-card p-3 text-xs">
              <div className="case-label mb-2">Voting Opens Now</div>
              <p className="text-muted">Jurors stake {form.stakePerJuror} XLM each to vote. Majority wins; minority forfeits stake.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTab('docket')} className="btn-brass flex-1">View Docket</button>
            <button onClick={() => { setCaseId(null); setForm({ respondent:'',title:'',description:'',category:'',evidence:'',stakePerJuror:100 }) }} className="btn-ghost flex-1">New Case</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-20 pt-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ivory mb-1">File a Dispute</h1>
        <p className="text-sm text-muted">Submit your case for community arbitration. Provide clear evidence for jurors to evaluate.</p>
      </div>

      {!isConnected && (
        <div className="court-card p-4 mb-5 flex items-start gap-3" style={{ borderColor: 'rgba(184,137,42,0.2)' }}>
          <Info size={14} className="text-brass shrink-0 mt-0.5" />
          <p className="text-sm text-muted">Connect in <strong className="text-ivory">Juror ID</strong> to file real on-chain cases.</p>
        </div>
      )}

      <div className="case-card p-6 space-y-5">
        <div>
          <label className="case-label block mb-2">Respondent Address <span className="text-ruby">*</span></label>
          <input className="court-input font-mono text-xs" placeholder="G… (Stellar public key of the other party)" value={form.respondent} onChange={e => set('respondent', e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="case-label block mb-2">Category <span className="text-ruby">*</span></label>
            <select className="court-input" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select…</option>
              {DISPUTE_CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#120C10' }}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="case-label block mb-2">Juror Stake (XLM each) <span className="text-ruby">*</span></label>
            <input type="number" min={10} step={10} className="court-input font-mono" value={form.stakePerJuror} onChange={e => set('stakePerJuror', parseInt(e.target.value) || 10)} />
            <p className="text-[10px] text-muted mt-1">Min 10 XLM · Higher stake attracts senior jurors</p>
          </div>
        </div>

        <div>
          <label className="case-label block mb-2">Case Title <span className="text-ruby">*</span></label>
          <input className="court-input" placeholder="Concise summary of the dispute" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>

        <div>
          <label className="case-label block mb-2">Description <span className="text-ruby">*</span></label>
          <textarea className="court-input resize-none h-28 text-xs" placeholder="Describe the dispute in full. Include dates, amounts, and what resolution you seek…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <label className="case-label block mb-2">Evidence (IPFS CID or summary)</label>
          <input className="court-input font-mono text-xs" placeholder="ipfs://Qm… or link to supporting documents" value={form.evidence} onChange={e => set('evidence', e.target.value)} />
        </div>

        {/* Preview */}
        <div className="rounded border border-dashed border-white/10 p-4 space-y-1.5 text-xs">
          <div className="case-label mb-2">On-Chain Preview</div>
          <div className="flex gap-2"><span className="text-muted w-24">Claimant:</span><span className="font-mono text-ivory">{pubKey ? truncAddr(pubKey) : '(not connected)'}</span></div>
          <div className="flex gap-2"><span className="text-muted w-24">Respondent:</span><span className="font-mono text-ivory">{form.respondent ? truncAddr(form.respondent) : '—'}</span></div>
          <div className="flex gap-2"><span className="text-muted w-24">Category:</span><span className="text-ivory">{form.category || '—'}</span></div>
          <div className="flex gap-2"><span className="text-muted w-24">Stake/juror:</span><span className="text-brass-gradient font-mono">{formatXLM(form.stakePerJuror * 10_000_000)}</span></div>
        </div>

        <button onClick={handleSubmit} disabled={submitting} className={clsx('btn-brass w-full flex items-center justify-center gap-2 py-3', submitting && 'opacity-70 cursor-not-allowed')}>
          {submitting ? <><Loader2 size={14} className="animate-spin" />Submitting to Soroban…</> : <><FileText size={14} />File Case</>}
        </button>
      </div>
    </div>
  )
}
