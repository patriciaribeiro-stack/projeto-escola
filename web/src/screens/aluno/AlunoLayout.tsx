import { Outlet } from 'react-router-dom'
import { useSession } from '../../session'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconBook, IconEdit } from '../../components/Icons'

const tabs: TabItem[] = [
  { to: '/aluno', label: 'Lições', icon: IconBook },
  { to: '/aluno/conteudo', label: 'Conteúdo do dia', icon: IconEdit },
]

export default function AlunoLayout() {
  const { alunoLogado } = useSession()
  if (!alunoLogado) return null

  return (
    <AppShell title={alunoLogado.nome} tabs={tabs}>
      <Outlet />
    </AppShell>
  )
}
