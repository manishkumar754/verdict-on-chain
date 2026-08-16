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
          <p className="text-sm text-ivory flex-1 leading-snug">{n.message}</p>
          <button onClick={() => removeToast(n.id)} className="text-muted hover:text-ivory shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}
