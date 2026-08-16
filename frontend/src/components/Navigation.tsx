import { BookOpen, FilePlus, Layers, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useVerdictStore } from '../lib/store'
import { truncAddr } from '../lib/mockData'
import ScalesIcon from './ScalesIcon'

const TABS = [
  { id: 'docket',     label: 'Docket',      icon: BookOpen  },
  { id: 'file',       label: 'File Case',    icon: FilePlus  },
  { id: 'mydisputes', label: 'My Cases',     icon: Layers    },
  { id: 'profile',    label: 'Juror ID',     icon: User      },
] as const

export default function Navigation() {
  const { activeTab, setTab, isConnected, pubKey, disconnect } = useVerdictStore()
  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.05]"
         style={{ background: 'rgba(10,6,8,0.93)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-4">

        {/* Wordmark */}
        <button onClick={() => setTab('docket')} className="flex items-center gap-2.5 shrink-0">
          <ScalesIcon size={32} />
          <div>
            <div className="font-display text-base text-ivory leading-none">
              Verdict<span className="text-brass-gradient">Chain</span>
            </div>
            <div className="text-[9px] font-mono text-muted tracking-widest uppercase">Decentralized Arbitration</div>
          </div>
        </button>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-0.5 bg-black/20 rounded border border-white/[0.05] p-1">
          {TABS.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setTab(tab.id)}
                className={clsx('flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-body font-medium transition-all',
                  active ? 'bg-burgundy/25 text-ivory border border-burgundy/25' : 'text-muted hover:text-ivory')}>
                <Icon size={12} className={active ? 'text-brass' : ''} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Wallet */}
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs border border-white/[0.06] rounded px-3 py-1.5 bg-black/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="font-mono text-muted">{truncAddr(pubKey)}</span>
            </div>
            <button onClick={disconnect} className="btn-ghost text-xs py-1.5 px-3">Disconnect</button>
          </div>
        ) : (
          <button onClick={() => setTab('profile')} className="btn-brass text-xs py-1.5 px-4">Connect Wallet</button>
        )}
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden flex border-t border-white/[0.05]">
        {TABS.map(tab => {
          const Icon = tab.icon; const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={clsx('flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-mono uppercase tracking-wide transition-colors',
                active ? 'text-ivory' : 'text-muted')}>
              <Icon size={14} className={active ? 'text-brass' : ''} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
