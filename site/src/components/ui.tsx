import type { ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark' | 'onGreen'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-green text-white hover:bg-green-dark',
  secondary: 'bg-white text-navy border border-navy/15 hover:border-navy/35',
  ghost: 'bg-transparent text-navy hover:bg-navy/5',
  // for buttons placed on navy/dark backgrounds — kept as its own variant
  // instead of a className override, so utility classes never collide
  onDark: 'bg-transparent text-white border border-white/25 hover:border-white/50 hover:bg-white/10',
  // for buttons placed on the green CTA band
  onGreen: 'bg-white text-green-dark border border-transparent hover:bg-white/90',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display font-medium text-[0.95rem] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green'

export function Button({
  variant = 'primary',
  to,
  href,
  className = '',
  children,
  ...rest
}: {
  variant?: Variant
  to?: string
  href?: string
  className?: string
  children: ReactNode
} & AnchorHTMLAttributes<HTMLAnchorElement> &
  ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = twMerge(base, variantClasses[variant], className)
  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}

export function PhotoSlot({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/15 bg-navy/[0.03] p-6 text-center',
        className,
      )}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-navy/30">
        <path d="M4 8a2 2 0 0 1 2-2h1.2l.9-1.5a1 1 0 0 1 .86-.5h6.08a1 1 0 0 1 .86.5L16.8 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <circle cx="12" cy="13" r="3.3" />
      </svg>
      <span className="text-xs font-medium leading-snug text-navy/40">{label}</span>
    </div>
  )
}

export function Eyebrow({ children, tone = 'navy' }: { children: ReactNode; tone?: 'navy' | 'green' | 'blue' | 'mostarda' | 'red' }) {
  const toneClasses: Record<string, string> = {
    navy: 'text-navy bg-navy/8',
    green: 'text-green-dark bg-green-light',
    blue: 'text-blue-dark bg-blue-light',
    mostarda: 'text-amber bg-amber-light',
    red: 'text-red bg-red-light',
  }
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
