import { JUROR_TIER_META } from '../lib/constants'
interface TierBadgeProps { tier: string; size?: 'sm' | 'md' | 'lg'; showGlyph?: boolean }
export default function TierBadge({ tier, size = 'md', showGlyph = true }: TierBadgeProps) {
  const meta  = JUROR_TIER_META[tier] || JUROR_TIER_META['Observer']
  const sizes = { sm: 'text-[10px] px-2 py-0.5 gap-1', md: 'text-xs px-3 py-1 gap-1.5', lg: 'text-sm px-4 py-1.5 gap-2' }
  return (
    <span className={`tier-badge ${sizes[size]}`}
      style={{ color: meta.color, background: `${meta.color}14`, border: `1px solid ${meta.color}35` }}>
      {showGlyph && <span className="font-mono text-[10px]">{meta.glyph}</span>}
      {meta.label}
    </span>
  )
}
