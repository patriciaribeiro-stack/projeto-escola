import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from 'react'
import { twMerge } from 'tailwind-merge'

type PillTone = 'amber' | 'green' | 'red' | 'blue' | 'muted'

const pillTones: Record<PillTone, string> = {
  amber: 'bg-amber-light text-amber',
  green: 'bg-green-light text-green-dark',
  red: 'bg-red-light text-red',
  blue: 'bg-blue-light text-blue',
  muted: 'bg-paper-sunken text-muted',
}

export function Pill({ tone, children, dot }: { tone: PillTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${pillTones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export type Categoria = 'saude' | 'cantina' | 'licoes' | 'eventos'

const categoriaTom: Record<Categoria, { bg: string; text: string; border: string }> = {
  saude: { bg: 'bg-red-light', text: 'text-red', border: 'border-l-red' },
  cantina: { bg: 'bg-amber-light', text: 'text-amber', border: 'border-l-mostarda' },
  licoes: { bg: 'bg-blue-light', text: 'text-blue', border: 'border-l-blue' },
  eventos: { bg: 'bg-blue-light', text: 'text-blue', border: 'border-l-blue' },
}

export function Card({ children, className = '', accent }: { children: ReactNode; className?: string; accent?: Categoria }) {
  const accentCls = accent ? `border-l-4 ${categoriaTom[accent].border}` : ''
  return (
    <div className={`rounded-xl border border-line bg-paper-raised p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,.06)] ${accentCls} ${className}`}>
      {children}
    </div>
  )
}

export function CategoriaChip({ categoria, icon: Icon, children }: {
  categoria: Categoria
  icon: ComponentType<SVGProps<SVGSVGElement>>
  children: ReactNode
}) {
  const t = categoriaTom[categoria]
  return (
    <span className={`inline-flex self-start items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold ${t.bg} ${t.text}`}>
      <Icon className="h-4 w-4" />
      {children}
    </span>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider text-faint">{children}</div>
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', children, ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-blue text-white active:bg-blue-dark disabled:opacity-40',
    secondary: 'bg-transparent text-blue border-[1.5px] border-blue active:bg-blue-light disabled:opacity-40',
    ghost: 'bg-paper-sunken text-ink active:bg-line disabled:opacity-40',
    danger: 'bg-red text-white active:opacity-90 disabled:opacity-40',
  }
  return (
    <button
      className={twMerge('w-full rounded-xl px-4 py-3 text-[15px] font-bold font-display transition-colors', styles[variant], className)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
        selected ? 'border-green bg-green text-white' : 'border-line text-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-muted">{children}</div>
}

export function PhotoBlock({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={`aspect-square rounded-xl object-cover ${className}`} />
}

export function Avatar({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'green' }) {
  const cls = tone === 'blue' ? 'bg-blue-light text-blue' : 'bg-green-light text-green-dark'
  return (
    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${cls}`}>
      {label}
    </div>
  )
}

export function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

export function formatDateBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatBRL(valor: number | null | undefined) {
  const n = typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
  return n.toFixed(2).replace('.', ',')
}

const SUBJECT_PALETTE = [
  { bg: '#E1EEF6', text: '#235F8A' }, // azul-céu
  { bg: '#DFF0EC', text: '#166253' }, // verde-vital
  { bg: '#FBEDD1', text: '#8C6724' }, // mostarda
  { bg: '#DCEEEA', text: '#1F7A68' }, // teal
  { bg: '#E7E1F5', text: '#5B3FA0' }, // roxo
  { bg: '#F5E1E8', text: '#A03F6E' }, // rosa
]

export function subjectColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]
}

export function SubjectChip({ children }: { children: string }) {
  const c = subjectColor(children)
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      {children}
    </span>
  )
}
