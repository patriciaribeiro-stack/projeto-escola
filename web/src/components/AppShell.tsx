import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode, ComponentType, SVGProps } from 'react'
import { useSession } from '../session'
import { IconLogout } from './Icons'

export interface TabItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  badge?: number
}

export function AppShell({
  title,
  tabs,
  children,
  headerRight,
  banner,
}: {
  title: string
  tabs: TabItem[]
  children: ReactNode
  headerRight?: ReactNode
  banner?: ReactNode
}) {
  const { session, logout } = useSession()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-paper lg:max-w-4xl">
      <header className="flex items-center justify-between bg-navy px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white">
            <span className="font-display text-[13px] font-bold text-navy">VB</span>
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-tight text-white">{title}</div>
            <div className="text-[11px] text-white/70">{session?.nome}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            aria-label="Sair"
            className="rounded-full p-2 text-white/70 active:bg-white/10"
          >
            <IconLogout className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="hidden items-center justify-center gap-1 overflow-x-auto border-b border-line bg-paper-raised px-3 lg:flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to.split('/').length <= 2}
            className={({ isActive }) =>
              `relative flex items-center gap-2 whitespace-nowrap border-b-[2.5px] px-3.5 py-3 text-[13px] font-bold transition-colors ${
                isActive ? 'border-green text-ink' : 'border-transparent text-muted'
              }`
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {!!tab.badge && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red text-[9px] font-bold text-white">
                {tab.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {banner}

      <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6">{children}</main>

      <div className="relative border-t border-line bg-paper-raised lg:hidden">
        <nav
          className={`flex pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 ${
            tabs.length > 5 ? 'gap-x-1 overflow-x-auto px-1' : ''
          }`}
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to.split('/').length <= 2}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold ${
                  tabs.length > 5 ? 'w-[74px] flex-shrink-0' : 'flex-1'
                } ${isActive ? 'text-blue' : 'text-faint'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -top-1.5 h-[2.5px] w-4 rounded-full bg-blue" />}
                  <span className="relative">
                    <tab.icon className="h-5 w-5" />
                    {!!tab.badge && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red text-[9px] font-bold text-white">
                        {tab.badge}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate px-0.5 leading-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {tabs.length > 5 && (
          <div className="pointer-events-none absolute right-0 top-0 h-full w-7 bg-gradient-to-l from-paper-raised to-transparent" />
        )}
      </div>
    </div>
  )
}
