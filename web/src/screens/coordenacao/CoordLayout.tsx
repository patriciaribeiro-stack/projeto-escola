import { Outlet, useNavigate } from 'react-router-dom'
import { AppShell, type TabItem } from '../../components/AppShell'
import { IconGrid, IconBook, IconBell, IconCalendar, IconPlus, IconFolder, IconMic } from '../../components/Icons'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, AtividadeAvaliativa, MedicacaoAgendada, Ocorrencia, OcorrenciaGeral, ProvaTrimestral } from '../../types'
import { AtivarPush } from '../../components/AtivarPush'

const baseTabs: TabItem[] = [
  { to: '/coordenacao', label: 'Painel', icon: IconGrid },
  { to: '/coordenacao/postar', label: 'Publicar', icon: IconPlus },
  { to: '/coordenacao/turma', label: 'Turma', icon: IconBook },
  { to: '/coordenacao/notificacoes', label: 'Notificações', icon: IconBell },
  { to: '/coordenacao/registros', label: 'Registros', icon: IconFolder },
  { to: '/coordenacao/eventos', label: 'Eventos', icon: IconCalendar },
  { to: '/coordenacao/atendimentos', label: 'Atendimentos', icon: IconMic },
]

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export default function CoordLayout() {
  const navigate = useNavigate()
  const { data: gerais } = usePolling<OcorrenciaGeral[]>(
    async () => api.get('/ocorrencias-gerais'),
    6000,
    [],
  )
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 10000, [])
  const { data: ocorrenciasSaude } = usePolling<Ocorrencia[]>(
    async () => api.get(`/ocorrencias${qs({ ativas: 'true' })}`),
    6000,
    [],
  )
  const pendentes = gerais?.filter((o) => o.estado === 'pendente_aprovacao').length ?? 0
  const respondidas = gerais?.filter((o) => o.estado === 'aprovada' && o.cientePor && !o.vistoPelaCoordenacaoEm).length ?? 0
  const aguardandoLiberacaoSaude = ocorrenciasSaude?.filter((o) => o.estado === 'aguardando_liberacao').length ?? 0
  const respondidasSaude = ocorrenciasSaude?.filter((o) =>
    (o.estado === 'ciente' || o.estado === 'medicacao_autorizada' || o.estado === 'indo_buscar') && !o.vistoPelaCoordenacaoEm,
  ).length ?? 0
  const matriculasNovas = alunos?.filter((a) => !a.vistoPelaCoordenacaoEm).length ?? 0
  const { data: atividadesAvaliativas } = usePolling<AtividadeAvaliativa[]>(async () => api.get('/atividades-avaliativas'), 8000, [])
  const avaliativasNaoVistas = atividadesAvaliativas?.filter((a) => !a.vistoPelaCoordenacaoEm).length ?? 0
  const { data: medicacoes } = usePolling<MedicacaoAgendada[]>(async () => api.get('/medicacoes'), 8000, [])
  const medicacoesNaoVistas = medicacoes?.filter((m) => !m.vistoPelaCoordenacaoEm).length ?? 0
  const { data: provasTrimestraisHoje } = usePolling<ProvaTrimestral[]>(
    async () => api.get(`/provas-trimestrais${qs({ data: hoje() })}`),
    8000,
    [],
  )
  const provasTrimestraisPendentes = provasTrimestraisHoje?.filter((p) => p.estado === 'aguardando_aprovacao').length ?? 0
  const totalBadge = pendentes + respondidas + aguardandoLiberacaoSaude + respondidasSaude + matriculasNovas + avaliativasNaoVistas + medicacoesNaoVistas

  const tabs = baseTabs.map((t) => {
    if (t.to === '/coordenacao/notificacoes' && totalBadge) return { ...t, badge: totalBadge }
    if (t.to === '/coordenacao/turma' && provasTrimestraisPendentes) return { ...t, badge: provasTrimestraisPendentes }
    return t
  })

  return (
    <AppShell
      title="Coordenação"
      tabs={tabs}
      banner={
        <>
          <div className="mx-4 mt-3">
            <AtivarPush />
          </div>
          {(!!pendentes || !!respondidas || !!aguardandoLiberacaoSaude || !!respondidasSaude || !!matriculasNovas || !!avaliativasNaoVistas || !!medicacoesNaoVistas) && (
          <div className="mx-4 mt-3 flex flex-col gap-2">
            {!!aguardandoLiberacaoSaude && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=saude')}
                className="flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-left text-[13px] font-semibold text-red"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {aguardandoLiberacaoSaude === 1
                    ? 'Há 1 ocorrência de saúde aguardando sua liberação.'
                    : `Há ${aguardandoLiberacaoSaude} ocorrências de saúde aguardando sua liberação.`} Toque para ver.
                </span>
              </button>
            )}
            {!!respondidasSaude && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=saude')}
                className="flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-left text-[13px] font-semibold text-red"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {respondidasSaude === 1
                    ? 'Um responsável respondeu a uma ocorrência de saúde.'
                    : `${respondidasSaude} responsáveis responderam a ocorrências de saúde.`} Toque para ver.
                </span>
              </button>
            )}
            {!!pendentes && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=gerais')}
                className="flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-left text-[13px] font-semibold text-red"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {pendentes === 1 ? 'Há 1 ocorrência aguardando aprovação.' : `Há ${pendentes} ocorrências aguardando aprovação.`} Toque para ver.
                </span>
              </button>
            )}
            {!!respondidas && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=gerais')}
                className="flex items-start gap-2 rounded-xl bg-blue-light px-3 py-2.5 text-left text-[13px] font-semibold text-blue"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {respondidas === 1
                    ? 'Um responsável confirmou ciência em uma ocorrência.'
                    : `${respondidas} responsáveis confirmaram ciência em ocorrências.`} Toque para ver.
                </span>
              </button>
            )}
            {!!matriculasNovas && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=matriculas')}
                className="flex items-start gap-2 rounded-xl bg-green-light px-3 py-2.5 text-left text-[13px] font-semibold text-green-dark"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {matriculasNovas === 1 ? 'Há 1 aluno novo matriculado.' : `Há ${matriculasNovas} alunos novos matriculados.`} Toque para ver.
                </span>
              </button>
            )}
            {!!avaliativasNaoVistas && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=avaliativas')}
                className="flex items-start gap-2 rounded-xl bg-amber-light px-3 py-2.5 text-left text-[13px] font-semibold text-amber"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {avaliativasNaoVistas === 1
                    ? 'Uma nova atividade avaliativa foi agendada.'
                    : `${avaliativasNaoVistas} novas atividades avaliativas foram agendadas.`} Toque para ver.
                </span>
              </button>
            )}
            {!!medicacoesNaoVistas && (
              <button
                onClick={() => navigate('/coordenacao/notificacoes?sub=medicacao')}
                className="flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-left text-[13px] font-semibold text-red"
              >
                <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {medicacoesNaoVistas === 1
                    ? 'Um novo medicamento foi enviado pra escola.'
                    : `${medicacoesNaoVistas} novos medicamentos foram enviados pra escola.`} Toque para ver.
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
