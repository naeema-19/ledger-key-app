import React from 'react'

export function Button({
  children, onClick, variant = 'primary', size = 'md', type = 'button', className = '', disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'brass' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}) {
  const base = 'rounded-lg font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4.5 py-2.5 text-[14.5px]'
  const variants: Record<string, string> = {
    primary: 'bg-ink text-parchment hover:bg-inksoft',
    brass: 'bg-brass text-white hover:bg-brassdark',
    ghost: 'bg-transparent text-inksoft border border-line hover:border-brass hover:text-ink',
    danger: 'bg-transparent text-due border border-due hover:bg-duebg',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-line rounded-xl shadow-sm p-5 ${className}`}>{children}</div>
}

export function StatCard({ num, label }: { num: string | number; label: string }) {
  return (
    <Card className="p-4">
      <div className="font-display text-3xl font-semibold leading-none mono">{num}</div>
      <div className="text-[12.5px] text-inksoft mt-1.5 uppercase tracking-wide">{label}</div>
    </Card>
  )
}

export function Stamp({ status }: { status: 'paid' | 'due' | 'overdue' }) {
  const styles: Record<string, string> = {
    paid: 'text-paid border-paid bg-paidbg',
    due: 'text-due border-due bg-duebg',
    overdue: 'text-overdue border-overdue bg-overduebg',
  }
  return (
    <span className={`stamp inline-block px-3 py-1 rounded-full text-[11.5px] font-bold uppercase tracking-wider border-[1.5px] ${styles[status]}`}>
      {status}
    </span>
  )
}

export function StatusTag({ status }: { status: 'open' | 'in-progress' | 'resolved' }) {
  const styles: Record<string, string> = {
    open: 'bg-duebg text-due',
    'in-progress': 'bg-[#F4EBD8] text-brassdark',
    resolved: 'bg-paidbg text-paid',
  }
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status.replace('-', ' ')}
    </span>
  )
}

export function PriorityTag({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const styles: Record<string, string> = {
    low: 'bg-paidbg text-paid',
    medium: 'bg-[#F4EBD8] text-brassdark',
    high: 'bg-duebg text-due',
  }
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${styles[priority]}`}>
      {priority}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] uppercase tracking-wide text-inksoft mb-1.5 font-semibold">{label}</label>
      {children}
    </div>
  )
}

export const inputCls = 'w-full px-3.5 py-2.5 border border-line rounded-lg bg-white text-[15px] text-ink outline-none focus:border-brass transition'

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink/45 flex items-center justify-center p-5 z-[100]" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl max-w-[480px] w-full max-h-[88vh] overflow-y-auto p-6">
        <h2 className="text-[19px] font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function RowItem({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 flex-wrap p-3.5 bg-card border border-line rounded-lg">{children}</div>
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="text-inksoft text-sm text-center py-5 px-2">{children}</div>
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-parchment px-5 py-2.5 rounded-lg text-[13.5px] font-medium shadow-lg z-[200]">
      {message}
    </div>
  )
}
