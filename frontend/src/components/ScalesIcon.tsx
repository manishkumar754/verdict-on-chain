export default function ScalesIcon({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} fill="none">
      {/* Center pillar */}
      <line x1="40" y1="8" x2="40" y2="72" stroke="rgba(184,137,42,0.6)" strokeWidth="2" strokeLinecap="round"/>
      {/* Top crossbar */}
      <line x1="16" y1="20" x2="64" y2="20" stroke="rgba(184,137,42,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Top ornament */}
      <circle cx="40" cy="10" r="3" fill="rgba(184,137,42,0.5)" />

      {/* Left chain */}
      <line x1="18" y1="20" x2="18" y2="44" stroke="rgba(184,137,42,0.4)" strokeWidth="1" strokeDasharray="3,2"/>
      {/* Right chain */}
      <line x1="62" y1="20" x2="62" y2="40" stroke="rgba(184,137,42,0.4)" strokeWidth="1" strokeDasharray="3,2"/>

      {/* Left pan (lower — claimant winning) */}
      <ellipse cx="18" cy="48" rx="12" ry="4" fill="none" stroke="rgba(184,137,42,0.5)" strokeWidth="1.5" className="scales-left"/>
      {/* Right pan (higher) */}
      <ellipse cx="62" cy="44" rx="12" ry="4" fill="none" stroke="rgba(123,29,58,0.5)" strokeWidth="1.5" className="scales-right"/>

      {/* Base */}
      <line x1="28" y1="72" x2="52" y2="72" stroke="rgba(184,137,42,0.4)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
