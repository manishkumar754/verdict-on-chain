import type { Dispute, JurorProfile } from './store'

export const truncAddr = (a: string, n = 6) => `${a.slice(0,n)}…${a.slice(-4)}`
export const formatXLM = (stroops: number) =>
  (stroops / 10_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' XLM'
export const timeLeft = (ts: number) => {
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`
  return `${h}h ${m}m`
}
export const formatDate = (ts: number) => {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
export const winnerLabel = (side: number) =>
  side === 1 ? 'Claimant' : side === 2 ? 'Respondent' : side === 3 ? 'Tie' : 'Pending'

const A = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37'
const B = 'GBUHRWJBKGRAOXA5VD4DQNWH7NG3QKZXHQMK6QNMKK2FOPWWK3UXPBS'
const C = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGB9ABODAZDBEKVX7BBHPS'
const D = 'GBHSCSZBKS5SFXNM5OLZJR4E2MGBDKJBCQZQKGXFB5MBVKX4IIYOQK'
const E = 'GCHNPAHOGVKZVN3KG4DNUXQRRLXBCFSCHHZRXZRN4MMRHVZQMFUKYOF'

export const MOCK_DISPUTES: Dispute[] = [
  {
    id: 0, claimant: A, respondent: B,
    title: 'Freelancer failed to deliver agreed smart contract audit',
    description: 'I paid 500 XLM for a Soroban contract audit with a 2-week turnaround. After 5 weeks, I received a 2-page document that covered only 30% of the codebase.',
    category: 'Freelance & Services',
    evidence: 'ipfs://QmXkHGsample1234 — Payment TX hash, original agreement screenshot, incomplete audit doc',
    stake_per_juror: 100_0000000,
    voting_ends: Math.floor(Date.now()/1000) + 3 * 3600,
    status: 'Voting', created_at: Math.floor(Date.now()/1000) - 86400,
    resolved_at: 0, winning_side: 0,
    votes_claimant: 7, votes_respondent: 3, votes_abstain: 1, total_jurors: 11,
  },
  {
    id: 1, claimant: C, respondent: D,
    title: 'DAO treasury funds misallocated against governance vote',
    description: 'A community vote (67% majority) approved 10,000 XLM for protocol development. The treasurer allocated 3,000 XLM to unrelated marketing spend without a subsequent vote.',
    category: 'DAO Governance',
    evidence: 'ipfs://QmDaoGov5678 — Snapshot vote record, treasury TX logs, DAO constitution',
    stake_per_juror: 200_0000000,
    voting_ends: Math.floor(Date.now()/1000) + 18 * 3600,
    status: 'Voting', created_at: Math.floor(Date.now()/1000) - 43200,
    resolved_at: 0, winning_side: 0,
    votes_claimant: 4, votes_respondent: 4, votes_abstain: 2, total_jurors: 10,
  },
  {
    id: 2, claimant: E, respondent: A,
    title: 'NFT collection delivered below agreed specification',
    description: 'Commissioned 50 unique generative NFTs with Soroban metadata. Received 50 items but 12 were duplicates with only palette swaps — not unique as contracted.',
    category: 'NFT & Digital Assets',
    evidence: 'ipfs://QmNftSpec9012 — Original brief, delivered assets, pixel diff analysis',
    stake_per_juror: 50_0000000,
    voting_ends: Math.floor(Date.now()/1000) - 3600,
    status: 'Resolved', created_at: Math.floor(Date.now()/1000) - 259200,
    resolved_at: Math.floor(Date.now()/1000) - 3600,
    winning_side: 1,
    votes_claimant: 9, votes_respondent: 2, votes_abstain: 1, total_jurors: 12,
  },
  {
    id: 3, claimant: B, respondent: C,
    title: 'Protocol upgrade caused unannounced breaking changes',
    description: 'A DeFi protocol pushed an upgrade that changed the interface of a core contract, bricking 3 integrations that had 2-week notice in the governance docs.',
    category: 'DeFi Protocol',
    evidence: 'ipfs://QmDefiUpgrade3456 — Old ABI vs new ABI, integration code, governance notice',
    stake_per_juror: 150_0000000,
    voting_ends: Math.floor(Date.now()/1000) + 36 * 3600,
    status: 'Voting', created_at: Math.floor(Date.now()/1000) - 7200,
    resolved_at: 0, winning_side: 0,
    votes_claimant: 2, votes_respondent: 1, votes_abstain: 0, total_jurors: 3,
  },
  {
    id: 4, claimant: D, respondent: E,
    title: 'Grant recipient failed to deliver milestones on schedule',
    description: '15,000 XLM grant was released in full upfront. 6 months later, only 1 of 4 promised milestones has shipped with no communication.',
    category: 'Grant & Funding',
    evidence: 'ipfs://QmGrant7890 — Grant proposal, milestone schedule, on-chain TX, Slack logs',
    stake_per_juror: 300_0000000,
    voting_ends: Math.floor(Date.now()/1000) - 86400,
    status: 'Resolved', created_at: Math.floor(Date.now()/1000) - 604800,
    resolved_at: Math.floor(Date.now()/1000) - 86400,
    winning_side: 1,
    votes_claimant: 11, votes_respondent: 3, votes_abstain: 2, total_jurors: 16,
  },
]

export const MOCK_JURORS: JurorProfile[] = [
  { juror: A, reputation: 1240, tier: 'ChiefJustice',  votes_cast: 42, votes_correct: 38, votes_incorrect: 3, votes_abstained: 1, total_staked: 4200_0000000, total_earned: 5100_0000000, joined_at: Math.floor(Date.now()/1000)-7776000, last_active: Math.floor(Date.now()/1000)-3600   },
  { juror: B, reputation: 820,  tier: 'SeniorCounsel', votes_cast: 28, votes_correct: 24, votes_incorrect: 3, votes_abstained: 1, total_staked: 2800_0000000, total_earned: 3100_0000000, joined_at: Math.floor(Date.now()/1000)-5184000, last_active: Math.floor(Date.now()/1000)-86400  },
  { juror: C, reputation: 490,  tier: 'Adjudicator',   votes_cast: 18, votes_correct: 14, votes_incorrect: 3, votes_abstained: 1, total_staked: 1800_0000000, total_earned: 1950_0000000, joined_at: Math.floor(Date.now()/1000)-2592000, last_active: Math.floor(Date.now()/1000)-172800 },
  { juror: D, reputation: 240,  tier: 'Associate',     votes_cast: 9,  votes_correct: 7,  votes_incorrect: 2, votes_abstained: 0, total_staked: 900_0000000,  total_earned: 950_0000000,  joined_at: Math.floor(Date.now()/1000)-1296000, last_active: Math.floor(Date.now()/1000)-259200 },
  { juror: E, reputation: 60,   tier: 'Observer',      votes_cast: 3,  votes_correct: 2,  votes_incorrect: 1, votes_abstained: 0, total_staked: 300_0000000,  total_earned: 280_0000000,  joined_at: Math.floor(Date.now()/1000)-432000,  last_active: Math.floor(Date.now()/1000)-43200  },
]
