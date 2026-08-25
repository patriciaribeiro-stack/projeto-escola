import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Licao, LicaoStatus, ProvaTrimestral, Turma as TurmaType } from '../../types'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconHome, IconCheck, IconPlus, IconChart, IconUsers, IconBook, IconUtensils, IconFolder } from '../../components/Icons'
import { licaoVencidaPendente } from '../shared/LicoesLista'

const SEGMENTOS_SEMANARIO = ['infantil', 'fundamental_1']

const baseTabs: TabItem[] = [
  { to: '/professor', label: 'Hoje', icon: IconHome },
  { to: '/professor/presenca', label: 'Presença', icon: IconCheck },
  { to: '/professor/postar', label: 'Publicar', icon: IconPlus },
  { to: '/professor/acompanhar', label: 'Acompanhar', icon: IconChart },
  { to: '/professor/turma', label: 'Turma', icon: IconUsers },
  { to: '/professor/provas-trimestrais', label: 'Provas Trimestrais', icon: IconFolder },
]

export interface ProfessorContext {
  turmaId: string
}

// Três "modos" possíveis pra área do professor — turma normal (acesso completo),
// Integral agregado do Fund. I/II (existente), ou uma turma de cobertura do Integral
// (acesso restrito a rotina/fotos/lições, ver IntegralTurma.tsx). Cada um mostra um
// conjunto diferente de abas — evita empilhar tudo junto na mesma barra.
type Modo =
  | { tipo: 'turma'; turmaId: string }
  | { tipo: 'integral-fund' }
  | { tipo: 'integral-turma'; turmaId: string }

const VALOR_INTEGRAL_FUND = '__integral-fund__'
const PREFIXO_INTEGRAL_TURMA = '__integral-turma__:'

function modoParaValor(modo: Modo): string {
  if (modo.tipo === 'turma') return modo.turmaId
  if (modo.tipo === 'integral-fund') return VALOR_INTEGRAL_FUND
  return PREFIXO_INTEGRAL_TURMA + modo.turmaId
}

function valorParaModo(valor: string): Modo {
  if (valor === VALOR_INTEGRAL_FUND) return { tipo: 'integral-fund' }
  if (valor.startsWith(PREFIXO_INTEGRAL_TURMA)) return { tipo: 'integral-turma', turmaId: valor.slice(PREFIXO_INTEGRAL_TURMA.length) }
  return { tipo: 'turma', turmaId: valor }
}

export default function ProfessorLayout() {
  const navigate = useNavigate()
  const { professor } = useSession()
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])
  const minhasTurmas = turmas?.filter((t) => professor?.turmaIds.includes(t.id)) ?? []
  const turmasCobertura = turmas?.filter((t) => (professor?.turmasIntegral ?? []).includes(t.id)) ?? []

  const [modo, setModo] = useState<Modo>(
    professor?.turmaIds[0] ? { tipo: 'turma', turmaId: professor.turmaIds[0] } : { tipo: 'turma', turmaId: '' },
  )

  const turmaAtiva = modo.tipo === 'turma'
    ? (professor?.turmaIds.includes(modo.turmaId) ? modo.turmaId : professor?.turmaIds[0] ?? '')
    : modo.tipo === 'integral-turma'
      ? modo.turmaId
      : ''

  const { data: licoes } = usePolling<Licao[]>(
    async () => (turmaAtiva && modo.tipo === 'turma' ? api.get(`/licoes${qs({ turmaId: turmaAtiva })}`) : []),
    30000,
    [modo.tipo, turmaAtiva],
  )
  const { data: licaoStatus } = usePolling<LicaoStatus[]>(
    async () => (turmaAtiva && modo.tipo === 'turma' ? api.get(`/licao-status${qs({ turmaId: turmaAtiva })}`) : []),
    30000,
    [modo.tipo, turmaAtiva],
  )
  const licoesVencidas = (licoes ?? []).filter((l) =>
    licaoVencidaPendente(l, (licaoStatus ?? []).filter((s) => s.licaoId === l.id)),
  ).length

  const { data: provasTrimestrais } = usePolling<ProvaTrimestral[]>(async () => api.get('/provas-trimestrais'), 15000, [])
  const vinculos = professor?.vinculos ?? []
  const provasTrimestraisPendentes = (provasTrimestrais ?? []).filter(
    (p) =>
      vinculos.some((v) => v.turmaId === p.turmaId && v.materiaId === p.materiaId) &&
      (p.estado === 'aguardando_envio' || p.estado === 'alteracao_necessaria'),
  ).length

  const temTurmaElegivelSemanario = minhasTurmas.some((t) => SEGMENTOS_SEMANARIO.includes(t.segmento))

  let tabs: TabItem[]
  if (modo.tipo === 'integral-fund') {
    tabs = [
      { to: '/professor/integral', label: 'Almoço', icon: IconUtensils },
      { to: '/professor/integral/licoes', label: 'Lições (Integral)', icon: IconBook },
    ]
  } else if (modo.tipo === 'integral-turma') {
    tabs = [{ to: '/professor/integral-turma', label: 'Integral', icon: IconUtensils }]
  } else {
    tabs = baseTabs
      .map((t) => (t.to === '/professor/acompanhar' && licoesVencidas ? { ...t, badge: licoesVencidas } : t))
      .map((t) => (t.to === '/professor/provas-trimestrais' && provasTrimestraisPendentes ? { ...t, badge: provasTrimestraisPendentes } : t))
      .concat(temTurmaElegivelSemanario ? [{ to: '/professor/semanario', label: 'Semanário', icon: IconBook }] : [])
  }

  const totalOpcoes = minhasTurmas.length + (professor?.atuaNoIntegral ? 1 : 0) + turmasCobertura.length

  function mudarModo(valor: string) {
    const novoModo = valorParaModo(valor)
    setModo(novoModo)
    if (novoModo.tipo === 'integral-fund') navigate('/professor/integral')
    else if (novoModo.tipo === 'integral-turma') navigate('/professor/integral-turma')
    else navigate('/professor')
  }

  return (
    <AppShell
      title="Área do professor"
      tabs={tabs}
      headerRight={
        totalOpcoes > 1 ? (
          <select
            value={modoParaValor(modo)}
            onChange={(e) => mudarModo(e.target.value)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-[12px] font-semibold"
          >
            {minhasTurmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            {professor?.atuaNoIntegral && <option value={VALOR_INTEGRAL_FUND}>Integral</option>}
            {turmasCobertura.map((t) => <option key={t.id} value={PREFIXO_INTEGRAL_TURMA + t.id}>{t.nome} · Integral</option>)}
          </select>
        ) : undefined
      }
    >
      <Outlet context={{ turmaId: turmaAtiva } satisfies ProfessorContext} />
    </AppShell>
  )
}
