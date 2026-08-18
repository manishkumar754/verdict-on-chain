import { useState } from 'react'
import { Scale, Clock, FileText, Loader2, ExternalLink } from 'lucide-react'
import type { Dispute } from '../lib/store'
import StatusPill from './StatusPill'
import VoteBar from './VoteBar'
import { truncAddr, formatXLM, timeLeft, formatDate, winnerLabel } from '../lib/mockData'
import { useVerdictStore } from '../lib/store'
import { VOTE_OPTIONS } from '../lib/constants'
import { clsx } from 'clsx'

export default function DisputeCard({ dispute, compact = false }: { dispute: Dispute; compact?: boolean }) {
  const { isConnected, pubKey, addToast } = useVerdictStore()
  const [selectedSide, setSelectedSide] = useState<number | null>(null)
  const [votingFor, setVotingFor] = useState<number | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  const statusStr  = Array.isArray(dispute.status) ? dispute.status[0] : dispute.status
  const isParty    = pubKey === dispute.claimant || pubKey === dispute.respondent
  const canVote    = isConnected && !isParty && statusStr === 'Voting' && !hasVoted
  const isResolved = statusStr === 'Resolved'

  const handleVote = async (side: 1 | 2 | 3) => {
    if (!isConnected || !pubKey) { addToast('error', 'Connect your Juror ID to vote'); return }
    if (isParty) { addToast('error', 'You cannot vote on your own case'); return }
    if (hasVoted) return
    
    setVotingFor(side)
    try {
      const m = await import('../lib/soroban')
      const hash = await m.castVote(pubKey, dispute.id, side)
      setHasVoted(true)
      addToast('success', `Vote submitted! Stake of ${dispute.stake_per_juror} XLM locked.`, {
        label: 'View Tx on Explorer',
        href: `https://stellar.expert/explorer/testnet/tx/${hash}`
      })
    } catch (e: any) {
      addToast('error', `Failed to vote: ${e.message || 'Unknown'}`)
    } finally {
      setVotingFor(null)
    }
  }

  return (
    <div className="case-card p-5 group">
      {/* Case header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="case-label">Case #{String(dispute.id).padStart(4,'0')}</span>
            <span className="case-label">·</span>
            <span className="case-label">{dispute.category}</span>
          </div>
          <h3 className="font-display text-base text-ivory leading-snug line-clamp-2">{dispute.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill status={statusStr as any} />
          {statusStr === 'Voting' && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted">
              <Clock size={9} />{timeLeft(dispute.voting_ends)}
            </div>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-4">
        <div className="court-card p-2.5">
          <div className="case-label mb-1">Claimant</div>
          <div className="font-mono text-[11px] text-brass-gradient">{truncAddr(dispute.claimant)}</div>
        </div>
        <div className="text-muted text-xs font-display italic">vs</div>
        <div className="court-card p-2.5">
          <div className="case-label mb-1">Respondent</div>
          <div className="font-mono text-[11px] text-muted">{truncAddr(dispute.respondent)}</div>
        </div>
      </div>

      {!compact && (
        <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-2">{dispute.description}</p>
      )}

      {/* Vote tally */}
      <div className="mb-4">
        <VoteBar
          claimant={dispute.votes_claimant}
          respondent={dispute.votes_respondent}
          abstain={dispute.votes_abstain}
          total={dispute.total_jurors}
          winnerSide={isResolved ? dispute.winning_side : undefined}
        />
      </div>

      {/* Resolved verdict stamp */}
      {isResolved && (
        <div className="flex items-center justify-between mb-4 pt-3 border-t border-white/[0.05]">
          <div className="text-xs text-muted font-mono">Resolved {formatDate(dispute.resolved_at)}</div>
          <span
            className="verdict-stamp text-[10px]"
            style={{
              color:       dispute.winning_side === 1 ? '#B8892A' : '#7B1D3A',
              borderColor: dispute.winning_side === 1 ? '#B8892A' : '#7B1D3A',
            }}
          >
            {winnerLabel(dispute.winning_side)} Prevails
          </span>
        </div>
      )}

      {/* Stake info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-3">
        <span className="flex items-center gap-1">
          <Scale size={9} className="text-brass" />
          {formatXLM(dispute.stake_per_juror)} stake per juror
        </span>
        {dispute.evidence && (
          <a href="#" className="flex items-center gap-1 text-muted hover:text-brass transition-colors" onClick={e => e.preventDefault()}>
            <FileText size={9} />Evidence
            <ExternalLink size={9} />
          </a>
        )}
      </div>

      {/* Voting interface */}
      {!compact && canVote && !hasVoted && (
        <div className="pt-4 border-t border-white/[0.05] space-y-3">
          <div className="case-label">Cast Your Vote</div>
          <div className="grid grid-cols-3 gap-2">
            {VOTE_OPTIONS.map(opt => (
              <button
                key={opt.side}
                onClick={() => setSelectedSide(opt.side)}
                className={clsx(
                  'rounded border p-2.5 text-[11px] font-display text-center transition-all duration-150',
                  selectedSide === opt.side
                    ? 'border-opacity-70 scale-[1.02]'
                    : 'border-white/10 text-muted hover:border-white/20 hover:text-ivory'
                )}
                style={selectedSide === opt.side ? {
                  borderColor: opt.color,
                  color: opt.color,
                  background: `${opt.color}12`,
                } : {}}
              >
                <div className="font-bold mb-0.5">{opt.side === 1 ? 'C' : opt.side === 2 ? 'R' : 'A'}</div>
                <div className="leading-tight">{opt.label}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (selectedSide) handleVote(selectedSide as 1|2|3) }}
            disabled={votingFor !== null || !selectedSide}
            className={clsx('btn-brass w-full flex items-center justify-center gap-2 py-2',
              (!selectedSide || votingFor !== null) && 'opacity-50 cursor-not-allowed')}
          >
            {votingFor !== null
              ? <><Loader2 size={13} className="animate-spin" />Submitting vote…</>
              : 'Submit Vote & Stake'
            }
          </button>
        </div>
      )}

      {hasVoted && (
        <div className="pt-3 border-t border-white/[0.05] text-center text-xs text-muted font-mono">
          ✓ Vote recorded on-chain
        </div>
      )}
    </div>
  )
}
