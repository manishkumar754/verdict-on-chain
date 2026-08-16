import { DISPUTE_STATUS_META } from '../lib/constants'
import type { DisputeStatus } from '../lib/store'
export default function StatusPill({ status }: { status: DisputeStatus }) {
  const meta = DISPUTE_STATUS_META[status] || DISPUTE_STATUS_META['Voting']
  return (
    <span className="status-pill" style={{ color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}` }} />
      {meta.label}
    </span>
  )
}
