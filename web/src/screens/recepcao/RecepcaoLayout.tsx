import { Outlet } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconUsers, IconUtensils, IconCross, IconBell, IconDownload } from '../../components/Icons'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { AtividadeAvaliativa, MedicacaoAgendada, Reuniao } from '../../types'
import { AtivarPush } from '../../components/AtivarPush'

const baseTabs: TabItem[] = [
  { to: '/recepcao', label: 'Visitas', icon: IconUsers },
  { to: '/recepcao/cardapio', label: 'Cardápio', icon: IconUtensils },
  { to: '/recepcao/medicacao', label: 'Saúde', icon: IconCross },
  { to: '/recepcao/reunioes', label: 'Reuniões', icon: IconBell },
  { to: '/recepcao/impressao', label: 'Impressão', icon: IconDownload },
]

export default function RecepcaoLayout() {
  const { data: reunioes } = usePolling<Reuniao[]>(async () => api.get('/reunioes'), 6000, [])
  const reunioesPendentes = reunioes?.filter(
    (r) => (r.estado === 'pendente' || r.estado === 'aceita_pelo_pai') && !r.vistoPelaCoordenacaoEm,
  ).length ?? 0
  const { data: medicacoes } = usePolling<MedicacaoAgendada[]>(async () => api.get('/medicacoes'), 8000, [])
  const medicacoesNaoVistas = medicacoes?.filter((m) => !m.vistoPelaCoordenacaoEm).length ?? 0
  const { data: atividades } = usePolling<AtividadeAvaliativa[]>(async () => api.get('/atividades-avaliativas'), 8000, [])
  const paraImprimir = atividades?.filter((a) => a.provaLiberadaParaImpressao && !a.provaImpressaEm).length ?? 0

  const tabs = baseTabs.map((t) => {
    if (t.to === '/recepcao/reunioes' && reunioesPendentes) return { ...t, badge: reunioesPendentes }
    if (t.to === '/recepcao/medicacao' && medicacoesNaoVistas) return { ...t, badge: medicacoesNaoVistas }
    if (t.to === '/recepcao/impressao' && paraImprimir) return { ...t, badge: paraImprimir }
    return t
  })

  return (
    <AppShell
      title="Recepção"
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
