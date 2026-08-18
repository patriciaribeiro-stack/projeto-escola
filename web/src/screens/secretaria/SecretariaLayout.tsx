import { Outlet } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconEdit, IconCalendar, IconGrid } from '../../components/Icons'
import { AtivarPush } from '../../components/AtivarPush'

const tabs: TabItem[] = [
  { to: '/secretaria', label: 'Cadastros', icon: IconEdit },
  { to: '/secretaria/eventos', label: 'Eventos', icon: IconCalendar },
  { to: '/secretaria/relatorios', label: 'Relatórios', icon: IconGrid },
]

export default function SecretariaLayout() {
  return (
    <AppShell
      title="Secretaria"
      tabs={tabs}
      banner={
        <div className="mx-4 mt-3">
          <AtivarPush />
        </div>
      }
    >
      <Outlet />
    </AppShell>
  )
}
