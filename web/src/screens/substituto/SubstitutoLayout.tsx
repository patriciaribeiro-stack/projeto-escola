import { Outlet } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Licao, LicaoStatus, Substituto, Turma as TurmaType } from '../../types'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconHome, IconCheck, IconPlus, IconChart, IconUsers } from '../../components/Icons'
import { licaoVencidaPendente } from '../shared/LicoesLista'
import { EmptyState } from '../../components/ui'
import type { ProfessorContext } from '../professor/ProfessorLayout'

const baseTabs: TabItem[] = [
  { to: '/substituto', label: 'Hoje', icon: IconHome },
  { to: '/substituto/presenca', label: 'Presença', icon: IconCheck },
  { to: '/substituto/postar', label: 'Publicar', icon: IconPlus },
  { to: '/substituto/acompanhar', label: 'Acompanhar', icon: IconChart },
  { to: '/substituto/turma', label: 'Turma', icon: IconUsers },
]

export default function SubstitutoLayout() {
  const { session } = useSession()
  const { data: substituto } = usePolling<Substituto>(
    async () => api.get(`/substitutos/${session?.personaId}`),
    5000,
    [session?.personaId],
  )
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])

  const turmaAtiva = substituto?.turmaAtualId ?? ''
  const turmaNome = turmas?.find((t) => t.id === turmaAtiva)?.nome ?? ''

  const { data: licoes } = usePolling<Licao[]>(
    async () => (turmaAtiva ? api.get(`/licoes${qs({ turmaId: turmaAtiva })}`) : []),
    30000,
    [turmaAtiva],
  )
  const { data: licaoStatus } = usePolling<LicaoStatus[]>(
    async () => (turmaAtiva ? api.get(`/licao-status${qs({ turmaId: turmaAtiva })}`) : []),
    30000,
    [turmaAtiva],
  )
  const licoesVencidas = (licoes ?? []).filter((l) =>
    licaoVencidaPendente(l, (licaoStatus ?? []).filter((s) => s.licaoId === l.id)),
  ).length

  const tabs = baseTabs.map((t) => (t.to === '/substituto/acompanhar' && licoesVencidas ? { ...t, badge: licoesVencidas } : t))

  if (!substituto) return null

  if (!turmaAtiva) {
    return (
      <AppShell title="Professor(a) eventual" tabs={[]}>
        <EmptyState>Nenhuma turma atribuída no momento — fale com a coordenação.</EmptyState>
      </AppShell>
    )
  }

  return (
    <AppShell title={`${substituto.nomeAtual ?? 'Professor(a) eventual'} · ${turmaNome}`} tabs={tabs}>
      <Outlet context={{ turmaId: turmaAtiva } satisfies ProfessorContext} />
    </AppShell>
  )
}
