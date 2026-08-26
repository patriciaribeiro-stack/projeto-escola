import { Outlet } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconUsers, IconUtensils, IconCross, IconDownload, IconChart, IconBook } from '../../components/Icons'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { AtividadeAvaliativa, MedicacaoAgendada, ProvaTrimestral } from '../../types'
import { AtivarPush } from '../../components/AtivarPush'

const baseTabs: TabItem[] = [
  { to: '/recepcao', label: 'Visitas', icon: IconUsers },
  { to: '/recepcao/cardapio', label: 'Cardápio', icon: IconUtensils },
  { to: '/recepcao/medicacao', label: 'Saúde', icon: IconCross },
  { to: '/recepcao/impressao', label: 'Impressão', icon: IconDownload },
  { to: '/recepcao/provas-trimestrais', label: 'Provas Trimestrais', icon: IconChart },
  { to: '/recepcao/livro-didatico', label: 'Livro Didático', icon: IconBook },
]

export default function RecepcaoLayout() {
  const { data: medicacoes } = usePolling<MedicacaoAgendada[]>(async () => api.get('/medicacoes'), 8000, [])
  const medicacoesNaoVistas = medicacoes?.filter((m) => !m.vistoPelaCoordenacaoEm).length ?? 0
  const { data: atividades } = usePolling<AtividadeAvaliativa[]>(async () => api.get('/atividades-avaliativas'), 8000, [])
  const paraImprimir = atividades?.filter((a) => a.provaLiberadaParaImpressao && !a.provaImpressaEm).length ?? 0
  const { data: provasTrimestrais } = usePolling<ProvaTrimestral[]>(async () => api.get('/provas-trimestrais'), 8000, [])
  const provasTrimestraisParaImprimir = provasTrimestrais?.filter((p) => p.estado === 'liberada_impressao').length ?? 0

  const tabs = baseTabs.map((t) => {
    if (t.to === '/recepcao/medicacao' && medicacoesNaoVistas) return { ...t, badge: medicacoesNaoVistas }
    if (t.to === '/recepcao/impressao' && paraImprimir) return { ...t, badge: paraImprimir }
    if (t.to === '/recepcao/provas-trimestrais' && provasTrimestraisParaImprimir) return { ...t, badge: provasTrimestraisParaImprimir }
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
