import type { ReactNode } from 'react'

export function Sucesso({ children }: { children: string }) {
  return <div className="rounded-xl bg-green-light px-4 py-3 text-[13px] font-semibold text-green-dark">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-faint">{label}</span>
      {children}
    </label>
  )
}

export const inputCls = 'rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-[13.5px] outline-none focus:border-blue'
