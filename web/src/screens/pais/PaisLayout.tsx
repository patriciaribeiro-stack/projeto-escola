import { Outlet, useNavigate } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconHome, IconPerson, IconBuilding, IconBell, IconSettings } from '../../components/Icons'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Ocorrencia, OcorrenciaGeral, Reuniao } from '../../types'
import { AtivarPush } from '../../components/AtivarPush'

const tabs: TabItem[] = [
  { to: '/pais', label: 'Início', icon: IconHome },
  { to: '/pais/filho', label: 'Aluno(a)', icon: IconPerson },
  { to: '/pais/escola', label: 'Escola', icon: IconBuilding },
  { to: '/pais/perfil', label: 'Perfil', icon: IconSettings },
]

export default function PaisLayout() {
  const { aluno, filhos, selecionarFilho } = useSession()
  const navigate = useNavigate()
  const alunoId = aluno?.id

  const { data: ocorrencias } = usePolling<Ocorrencia[]>(
    async () => (alunoId ? api.get(`/ocorrencias${qs({ alunoId, ativas: 'true' })}`) : []),
    3000,
    [alunoId],
  )
  const { data: todasOcorrencias } = usePolling<Ocorrencia[]>(
    async () => (alunoId ? api.get(`/ocorrencias${qs({ alunoId })}`) : []),
    5000,
    [alunoId],
  )
  const { data: gerais } = usePolling<OcorrenciaGeral[]>(
    async () => (alunoId ? api.get(`/ocorrencias-gerais${qs({ alunoId, estado: 'aprovada' })}`) : []),
    5000,
    [alunoId],
  )
  const { data: reunioes } = usePolling<Reuniao[]>(
    async () => (alunoId ? api.get(`/reunioes${qs({ alunoId })}`) : []),
    5000,
    [alunoId],
  )

  const pendentesResposta = ocorrencias?.filter((o) => o.estado === 'aguardando_resposta' || o.estado === 'escalonada') ?? []
  const ocorrenciaAtiva = pendentesResposta[0]
  const geraisPendentes = gerais?.filter((o) => !o.cientePor).length ?? 0
  const respostasEvolucaoNaoVistas = todasOcorrencias?.filter((o) => o.respostaEvolucaoTexto && !o.respostaEvolucaoVistaPeloPaiEm).length ?? 0
  const reunioesAguardandoPai = reunioes?.filter((r) => r.estado === 'contraproposta').length ?? 0
  const badgeTotal = pendentesResposta.length + geraisPendentes + respostasEvolucaoNaoVistas

  const tabsComBadge = tabs.map((t) => {
    if (t.to === '/pais/filho' && badgeTotal) return { ...t, icon: IconBell, badge: badgeTotal }
    if (t.to === '/pais/escola' && reunioesAguardandoPai) return { ...t, badge: reunioesAguardandoPai }
    return t
  })

  const hora = ocorrenciaAtiva
    ? new Date(ocorrenciaAtiva.registradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <AppShell
      title="Colégio Vital Brazil"
      tabs={tabsComBadge}
      headerRight={
        filhos.length > 1 ? (
          <select
            value={alunoId ?? ''}
            onChange={(e) => selecionarFilho(e.target.value)}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-[12px] font-semibold"
          >
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome.split(' ')[0]}</option>)}
          </select>
        ) : undefined
      }
      banner={
        <>
          <div className="mx-4 mt-3">
            <AtivarPush />
          </div>
          {(!!ocorrenciaAtiva || !!respostasEvolucaoNaoVistas || !!reunioesAguardandoPai) && (
          <div className="mx-4 mt-3 flex flex-col gap-2">
            {!!ocorrenciaAtiva && (
              <button
                onClick={() => navigate('/pais/filho')}
                className="flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-left text-[13px] font-semibold text-red"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {pendentesResposta.length > 1
                    ? `${pendentesResposta.length} ocorrências de saúde aguardando sua resposta. Toque para ver.`
                    : ocorrenciaAtiva.estado === 'aguardando_resposta'
                      ? `Ocorrência de saúde registrada às ${hora}. Toque para responder.`
                      : `Você não respondeu a tempo — a coordenação foi avisada. Toque para ver.`}
                </span>
              </button>
            )}
            {!!respostasEvolucaoNaoVistas && (
              <button
                onClick={() => navigate('/pais/filho')}
                className="flex items-start gap-2 rounded-xl bg-blue-light px-3 py-2.5 text-left text-[13px] font-semibold text-blue"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {respostasEvolucaoNaoVistas === 1
                    ? 'A coordenação respondeu sobre a evolução do caso. Toque para ver.'
                    : `A coordenação respondeu ${respostasEvolucaoNaoVistas} perguntas sobre evolução. Toque para ver.`}
                </span>
              </button>
            )}
            {!!reunioesAguardandoPai && (
              <button
                onClick={() => navigate('/pais/escola?tab=reuniao')}
                className="flex items-start gap-2 rounded-xl bg-blue-light px-3 py-2.5 text-left text-[13px] font-semibold text-blue"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {reunioesAguardandoPai === 1
                    ? 'A coordenação sugeriu outro horário pra sua reunião. Toque para ver.'
                    : `A coordenação sugeriu outro horário em ${reunioesAguardandoPai} reuniões. Toque para ver.`}
                </span>
              </button>
            )}
          </div>
          )}
        </>
      }
    >
      <Outlet />
    </AppShell>
  )
}
