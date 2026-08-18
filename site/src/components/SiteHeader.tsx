import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Button } from './ui.tsx'
import { SCHOOL } from '../config.ts'

const navLinks = [
  { label: 'Início', href: '/#topo' },
  { label: 'Sobre nós', href: '/#sobre' },
  { label: 'Segmentos', href: '/#segmentos' },
  { label: 'Atividades', href: '/#atividades' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <Container className="flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/logo-escola.png" alt={SCHOOL.nome} className="h-11 w-11 rounded-full object-cover" />
          <span className="font-display text-lg font-semibold leading-tight text-navy">
            Vital Brazil
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-ink/80 hover:text-navy">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a href={`tel:${SCHOOL.telefones[0].replace(/\D/g, '')}`} className="text-sm font-medium text-ink/70 hover:text-navy">
            {SCHOOL.telefones[0]}
          </a>
          <Button to="/agende-visita">Agende sua visita</Button>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-navy lg:hidden"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </Container>

      {open && (
        <div className="border-t border-line bg-paper lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-navy/5"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href={`tel:${SCHOOL.telefones[0].replace(/\D/g, '')}`} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/70">
              {SCHOOL.telefones[0]}
            </a>
            <Button to="/agende-visita" className="mt-2 w-full" onClick={() => setOpen(false)}>
              Agende sua visita
            </Button>
          </Container>
        </div>
      )}
    </header>
  )
}
