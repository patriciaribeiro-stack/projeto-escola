import { Link, useOutletContext } from 'react-router-dom'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Atestado, Aviso, Ocorrencia, Presenca, SaidaAntecipada, Turma } from '../../types'
import { Card, EmptyState, Pill, SectionLabel, formatDateBR, timeAgo } from '../../components/ui'
import { IconChevron } from '../../components/Icons'
import type { ProfessorContext } from './ProfessorLayout'

export default function Hoje() {
  const { turmaId } = useOutletContext<ProfessorContext>()
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const turma = turmas?.find((t) => t.id === turmaId)

  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 30000, [turmaId])
  const { data: presencas } = usePolling<Presenca[]>(
    async () => (turmaId ? api.get(`/presencas${qs({ turmaId, data: hoje })}`) : []),
    5000,
    [turmaId],
  )
  const { data: avisos } = usePolling<Aviso[]>(async () => (turmaId ? api.get(`/avisos${qs({ turmaId })}`) : []), 8000, [turmaId])
  const { data: ocorrencias } = usePolling<Ocorrencia[]>(
    async () => (turmaId && alunos ? flattenOcorrencias(alunos) : []),
    5000,
    [turmaId, alunos?.length],
  )
  const { data: atestados } = usePolling<Atestado[]>(async () => api.get('/atestados'), 10000, [])
  const { data: saidas } = usePolling<SaidaAntecipada[]>(
    async () => (turmaId ? api.get(`/saidas-antecipadas${qs({ turmaId, data: hoje })}`) : []),
    8000,
    [turmaId],
  )

  const ativas = ocorrencias?.filter((o) => o.estado !== 'resolvida') ?? []
  const atestadosDaTurma = (atestados ?? []).filter((a) => alunos?.some((al) => al.id === a.alunoId)).slice(0, 3)
  const alunosComPresencaHoje = new Set((presencas ?? []).map((p) => p.alunoId)).size

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="font-display text-lg font-bold">{turma?.nome ?? '...'}</div>
          <div className="mt-1 text-[12.5px] text-muted">
            <span className="font-mono">{alunos?.length ?? 0}</span> alunos · presença lançada para <span className="font-mono">{alunosComPresencaHoje}</span> hoje
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/professor/presenca">
            <Card className="flex items-center justify-between">
              <span className="text-[13px] font-bold">Lançar presença</span>
              <IconChevron className="h-4 w-4 text-faint" />
            </Card>
          </Link>
          <Link to="/professor/postar">
            <Card className="flex items-center justify-between">
              <span className="text-[13px] font-bold">Publicar</span>
              <IconChevron className="h-4 w-4 text-faint" />
            </Card>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
      {!!ativas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Ocorrências de saúde ativas</SectionLabel>
          {ativas.map((o) => (
            <Card key={o.id} accent="saude">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{alunos?.find((a) => a.id === o.alunoId)?.nome}</span>
                {o.estado === 'aguardando_liberacao' && <Pill tone="amber" dot>Aguardando liberação da coordenação</Pill>}
                {o.estado === 'aguardando_resposta' && <Pill tone="red" dot>Aguardando pai</Pill>}
                {o.estado === 'escalonada' && <Pill tone="red" dot>Com a coordenação</Pill>}
                {o.estado === 'indo_buscar' && <Pill tone="red" dot>Responsável vai buscar</Pill>}
                {(o.estado === 'ciente' || o.estado === 'medicacao_autorizada') && <Pill tone="red" dot>Respondida</Pill>}
              </div>
              <p className="mt-1 text-[12px] text-muted">{o.tipo}</p>
              {o.estado === 'indo_buscar' && (
                <p className="mt-1 text-[11.5px] font-semibold text-red">
                  Chega às {o.previsaoChegada}{o.medicarAteChegada ? ' · medicar até chegar' : ''}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {!!saidas?.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Saídas antecipadas hoje</SectionLabel>
          {saidas.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{alunos?.find((a) => a.id === s.alunoId)?.nome}</span>
                <span className="text-[13px] font-bold text-blue">{s.horario}</span>
              </div>
              {s.motivo && <p className="mt-1 text-[12px] text-muted">{s.motivo}</p>}
              <p className="mt-1 text-[11px] text-faint">Avisado por {s.criadoPor}</p>
            </Card>
          ))}
        </div>
      )}

      {!!atestadosDaTurma.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Atestados recentes</SectionLabel>
          {atestadosDaTurma.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{alunos?.find((al) => al.id === a.alunoId)?.nome}</span>
                <span className="text-[11px] text-faint">{timeAgo(a.criadoEm)}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">{a.motivo} · {formatDateBR(a.dataInicio)} a {formatDateBR(a.dataFim)}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel>Últimos avisos publicados</SectionLabel>
        {!avisos?.length && <EmptyState>Nenhum aviso publicado ainda.</EmptyState>}
        {avisos?.slice(0, 3).map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold">{a.autor}</span>
              <span className="text-[11px] text-faint">{timeAgo(a.criadoEm)}</span>
            </div>
            <p className="mt-1 text-[13px]">{a.texto}</p>
          </Card>
        ))}
      </div>
      </div>
    </div>
  )
}

async function flattenOcorrencias(alunos: Aluno[]) {
  const lists = await Promise.all(alunos.map((a) => api.get<Ocorrencia[]>(`/ocorrencias${qs({ alunoId: a.id, ativas: 'true' })}`)))
  return lists.flat()
}
