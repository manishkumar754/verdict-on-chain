import { create } from 'zustand'

export type DisputeStatus = 'Voting' | 'Deliberating' | 'Resolved' | 'Cancelled'

export interface Dispute {
  id: number
  claimant: string
  respondent: string
  title: string
  description: string
  category: string
  evidence: string
  stake_per_juror: number
  voting_ends: number
  status: DisputeStatus
  created_at: number
  resolved_at: number
  winning_side: number
  votes_claimant: number
  votes_respondent: number
  votes_abstain: number
  total_jurors: number
}

export interface JurorProfile {
  juror: string
  reputation: number
  tier: string
  votes_cast: number
  votes_correct: number
  votes_incorrect: number
  votes_abstained: number
  total_staked: number
  total_earned: number
  joined_at: number
  last_active: number
}

/** A toast can carry a plain string or a full ReactNode (rendered via dangerouslySetInnerHTML trick) */
interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  /** Optional link to display inside the toast (e.g. Stellar Explorer) */
  link?: { label: string; href: string }
}

interface VerdictStore {
  pubKey: string
  isConnected: boolean
  balance: string

  setWallet: (pub: string) => void
  setBalance: (b: string) => void
  disconnect: () => void

  disputes: Dispute[]
  setDisputes: (d: Dispute[]) => void
  upsertDispute: (d: Dispute) => void

  jurorProfile: JurorProfile | null
  setJurorProfile: (p: JurorProfile | null) => void

  activeTab: 'docket' | 'file' | 'mydisputes' | 'profile'
  setTab: (t: 'docket' | 'file' | 'mydisputes' | 'profile') => void

  toasts: Toast[]
  addToast: (type: Toast['type'], msg: string, link?: Toast['link']) => void
  removeToast: (id: string) => void
}

export const useVerdictStore = create<VerdictStore>((set, get) => ({
  // ── Wallet ──────────────────────────────────────────────────────────────────
  pubKey: '',
  isConnected: false,
  balance: '—',

  setWallet: (pub) => set({ pubKey: pub, isConnected: true }),
  setBalance: (b) => set({ balance: b }),
  disconnect: () => set({ pubKey: '', isConnected: false, balance: '—', jurorProfile: null }),

  // ── Disputes ─────────────────────────────────────────────────────────────────
  disputes: [],
  setDisputes: (d) => set({ disputes: d }),
  upsertDispute: (d) => set(s => {
    const i = s.disputes.findIndex(x => x.id === d.id)
    if (i >= 0) { const a = [...s.disputes]; a[i] = d; return { disputes: a } }
    return { disputes: [d, ...s.disputes] }
  }),

  // ── Profile ──────────────────────────────────────────────────────────────────
  jurorProfile: null,
  setJurorProfile: (p) => set({ jurorProfile: p }),

  // ── Navigation ───────────────────────────────────────────────────────────────
  activeTab: 'docket',
  setTab: (t) => set({ activeTab: t }),

  // ── Toasts ───────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (type, message, link?) => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, type, message, link }] }))
    setTimeout(() => get().removeToast(id), 8000)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(n => n.id !== id) })),
}))
