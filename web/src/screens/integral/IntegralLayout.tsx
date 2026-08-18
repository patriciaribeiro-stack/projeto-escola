import { Outlet } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconUtensils, IconBook } from '../../components/Icons'

const tabs: TabItem[] = [
  { to: '/integral', label: 'Almoço', icon: IconUtensils },
  { to: '/integral/licoes', label: 'Lições', icon: IconBook },
]

export default function IntegralLayout() {
  return (
    <AppShell title="Monitor do Integral" tabs={tabs}>
      <Outlet />
    </AppShell>
  )
}
