interface VoteBarProps {
  claimant: number
  respondent: number
  abstain: number
  total: number
  winnerSide?: number
}
export default function VoteBar({ claimant, respondent, abstain, total, winnerSide }: VoteBarProps) {
  if (total === 0) return <div className="vote-bar w-full"><div className="h-full bg-white/10 w-full" /></div>
  const pC = (claimant   / total) * 100
  const pR = (respondent / total) * 100
  const pA = (abstain    / total) * 100
  return (
    <div>
      <div className="flex rounded overflow-hidden h-1.5 gap-px">
        {claimant   > 0 && <div style={{ width: `${pC}%`, background: winnerSide === 1 ? '#B8892A' : 'rgba(184,137,42,0.5)' }} className="transition-all duration-500" />}
        {respondent > 0 && <div style={{ width: `${pR}%`, background: winnerSide === 2 ? '#7B1D3A' : 'rgba(123,29,58,0.5)'  }} className="transition-all duration-500" />}
        {abstain    > 0 && <div style={{ width: `${pA}%`, background: 'rgba(107,96,128,0.5)' }} className="transition-all duration-500" />}
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted">
        <span style={{ color: '#B8892A' }}>{claimant}C</span>
        <span style={{ color: '#A0284E' }}>{respondent}R</span>
        {abstain > 0 && <span>{abstain}A</span>}
        <span className="ml-auto">{total} jurors</span>
      </div>
    </div>
  )
}
