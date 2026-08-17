import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useVerdictStore } from '../lib/store'
export default function Toasts() {
  const { toasts, removeToast } = useVerdictStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map(n => (
        <div key={n.id} className="court-card flex items-start gap-3 p-4"
          style={{ borderColor: n.type === 'success' ? 'rgba(39,174,96,0.3)' : n.type === 'error' ? 'rgba(192,57,43,0.3)' : 'rgba(184,137,42,0.3)' }}>
          {n.type === 'success' && <CheckCircle size={15} style={{ color: '#27AE60' }} className="shrink-0 mt-0.5" />}
          {n.type === 'error'   && <XCircle     size={15} className="text-ruby shrink-0 mt-0.5" />}
          {n.type === 'info'    && <Info         size={15} className="text-brass shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="text-sm text-ivory leading-snug">{n.message}</p>
            {n.link && (
              <a href={n.link.href} target="_blank" rel="noopener noreferrer" 
                 className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald hover:underline">
                {n.link.label}
              </a>
            )}
          </div>
          <button onClick={() => removeToast(n.id)} className="text-muted hover:text-ivory shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}
