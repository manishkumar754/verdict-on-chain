export const NETWORK_PASSPHRASE   = 'Test SDF Network ; September 2015'
export const SOROBAN_RPC_URL      = 'https://soroban-testnet.stellar.org'
export const FRIENDBOT_URL        = 'https://friendbot.stellar.org'

export const DISPUTE_COURT_ID     = import.meta.env.VITE_DISPUTE_COURT_ID    || ''
export const JUROR_REGISTRY_ID    = import.meta.env.VITE_JUROR_REGISTRY_ID   || ''

export const JUROR_TIER_META: Record<string, { label: string; color: string; glyph: string; min: number; desc: string }> = {
  Observer:      { label: 'Observer',       color: '#6B6080', glyph: '○',   min: 0,    desc: 'New to the court' },
  Associate:     { label: 'Associate',      color: '#7A8A6E', glyph: '◎',   min: 150,  desc: 'Building a track record' },
  Adjudicator:   { label: 'Adjudicator',    color: '#B8892A', glyph: '⚖',   min: 350,  desc: 'Reliable and consistent' },
  SeniorCounsel: { label: 'Senior Counsel', color: '#D4A843', glyph: '⚖⚖', min: 700,  desc: 'Highly accurate juror' },
  ChiefJustice:  { label: 'Chief Justice',  color: '#EDE8DC', glyph: '✦',   min: 1100, desc: 'Elite arbitrator' },
}

export const DISPUTE_STATUS_META: Record<string, { label: string; color: string; desc: string }> = {
  Voting:       { label: 'Voting Open',   color: '#B8892A', desc: 'Jurors may cast votes'           },
  Deliberating: { label: 'Deliberating',  color: '#7A8A6E', desc: 'Voting closed, awaiting finalization' },
  Resolved:     { label: 'Resolved',      color: '#27AE60', desc: 'Verdict has been reached'        },
  Cancelled:    { label: 'Cancelled',     color: '#6B6080', desc: 'Dispute was withdrawn or lapsed' },
}

export const DISPUTE_CATEGORIES = [
  'Freelance & Services', 'Product & Delivery', 'DAO Governance',
  'Smart Contract Dispute', 'NFT & Digital Assets', 'DeFi Protocol',
  'Employment & Contracts', 'Intellectual Property', 'Community Standards',
  'Token Distribution', 'Grant & Funding', 'Partnership Dispute',
]

export const VOTE_OPTIONS = [
  { side: 1, label: 'Claimant Prevails',   color: '#B8892A', desc: 'The claimant\'s case is valid' },
  { side: 2, label: 'Respondent Prevails', color: '#7B1D3A', desc: 'The respondent\'s case is valid' },
  { side: 3, label: 'Abstain',             color: '#6B6080', desc: 'Insufficient evidence to decide' },
]
