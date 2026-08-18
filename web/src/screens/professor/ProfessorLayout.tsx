import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Licao, LicaoStatus, Turma as TurmaType } from '../../types'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconHome, IconCheck, IconPlus, IconChart, IconUsers, IconBook, IconUtensils } from '../../components/Icons'
import { licaoVencidaPendente } from '../shared/LicoesLista'

const SEGMENTOS_SEMANARIO = ['infantil', 'fundamental_1']

const baseTabs: TabItem[] = [
  { to: '/professor', label: 'Hoje', icon: IconHome },
  { to: '/professor/presenca', label: 'Presença', icon: IconCheck },
  { to: '/professor/postar', label: 'Publicar', icon: IconPlus },
  { to: '/professor/acompanhar', label: 'Acompanhar', icon: IconChart },
  { to: '/professor/turma', label: 'Turma', icon: IconUsers },
]

export interface ProfessorContext {
  turmaId: string
}

export default function ProfessorLayout() {
  const { professor } = useSession()
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])
  const minhasTurmas = turmas?.filter((t) => professor?.turmaIds.includes(t.id)) ?? []
  const [turmaId, setTurmaId] = useState(professor?.turmaIds[0] ?? '')

  const turmaAtiva = professor?.turmaIds.includes(turmaId) ? turmaId : professor?.turmaIds[0] ?? ''

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

  const temTurmaElegivelSemanario = minhasTurmas.some((t) => SEGMENTOS_SEMANARIO.includes(t.segmento))
  const tabs = baseTabs
    .map((t) => (t.to === '/professor/acompanhar' && licoesVencidas ? { ...t, badge: licoesVencidas } : t))
    .concat(temTurmaElegivelSemanario ? [{ to: '/professor/semanario', label: 'Semanário', icon: IconBook }] : [])
    .concat(
      professor?.atuaNoIntegral
        ? [
            { to: '/professor/integral', label: 'Almoço', icon: IconUtensils },
            { to: '/professor/integral/licoes', label: 'Lições (Integral)', icon: IconBook },
          ]
        : [],
    )

  return (
    <AppShell
      title="Área do professor"
      tabs={tabs}
      headerRight={
        (professor?.turmaIds.length ?? 0) > 1 ? (
          <select
            value={turmaAtiva}
            onChange={(e) => setTurmaId(e.target.value)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-[12px] font-semibold"
          >
            {minhasTurmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        ) : undefined
      }
    >
      <Outlet context={{ turmaId: turmaAtiva } satisfies ProfessorContext} />
    </AppShell>
  )
}
